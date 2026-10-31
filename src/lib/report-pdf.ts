import { jsPDF } from "jspdf";
import { rasterizeImageUrl } from "./images";
import { autoTable } from "jspdf-autotable";
import regularUrl from "../assets/fonts/NotoSans-Regular.ttf?url";
import boldUrl from "../assets/fonts/NotoSans-Bold.ttf?url";
import type { AthleteReport, BrandSettings } from "./types";
import { comparisonRows } from "./report";

// Explicit measured pagination keeps text selectable and avoids DOM screenshots.
// TF's report-export readiness/page separation informed the interface; scoring
// and all content are provided by the AMS. No TF norms or tier logic are used.
type Fonts = { regular: string; bold: string };
let fontsPromise: Promise<Fonts> | undefined;
async function fontData(url: string) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      "The PDF fonts could not be loaded. Retry when the app is fully loaded.",
    );
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
async function loadFonts(): Promise<Fonts> {
  fontsPromise ??= Promise.all([fontData(regularUrl), fontData(boldUrl)])
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((error) => {
      fontsPromise = undefined;
      throw error;
    });
  return fontsPromise;
}
function applyFonts(pdf: jsPDF, fonts: Fonts) {
  pdf.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  pdf.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  pdf.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  pdf.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  pdf.setFont("NotoSans", "normal");
}
function assertCharacters(pdf: jsPDF, content: string) {
  const font = pdf.getFont() as unknown as {
    metadata: { cmap: { unicode: { codeMap: Record<number, number> } } };
  };
  if (
    [...content].some(
      (char) =>
        char.codePointAt(0)! > 32 &&
        !font.metadata.cmap.unicode.codeMap[char.codePointAt(0)!],
    )
  )
    throw new Error(
      "This report contains characters outside the downloadable PDF font. Use Print report for this report, which uses your browser’s font fallback.",
    );
}
export async function buildReportPdf(
  title: string,
  subtitle: string,
  blocks: Array<{ heading: string; lines: string[] }>,
  brand: BrandSettings,
) {
  const logo = brand.logoDataUrl?.startsWith("data:image/svg+xml")
    ? await rasterizeImageUrl(brand.logoDataUrl)
    : brand.logoDataUrl;
  const pdf = new jsPDF({ unit: "pt", format: "letter", compress: true });
  applyFonts(pdf, await loadFonts());
  assertCharacters(
    pdf,
    [
      title,
      subtitle,
      brand.organizationName,
      brand.productName,
      ...blocks.flatMap((block) => [block.heading, ...block.lines]),
    ].join(" "),
  );
  const width = 612;
  const margin = 42;
  const bottom = 742;
  const clean = (text: string) =>
    text
      .replaceAll("—", "N/A")
      .replaceAll("–", "-")
      .replaceAll("…", "...")
      .replaceAll("·", "|");
  let y = 0;
  const wrapped = (text: string, size: number) => {
    pdf.setFontSize(size);
    return pdf.splitTextToSize(clean(text), width - margin * 2) as string[];
  };
  function line(text: string, size = 10, bold = false) {
    pdf.setFont("NotoSans", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = wrapped(text, size);
    for (const row of lines) {
      if (y + size * 1.35 > bottom) page();
      pdf.setTextColor(29, 43, 50);
      pdf.setFont("NotoSans", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.text(row, margin, y);
      y += size * 1.35;
    }
  }
  function page() {
    if (y) pdf.addPage();
    pdf.setDrawColor(brand.primaryColor);
    pdf.setLineWidth(1.5);
    pdf.line(margin, 57, width - margin, 57);
    pdf.setFont("NotoSans", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(29, 43, 50);
    if (logo) {
      const image = pdf.getImageProperties(logo);
      const scale = Math.min(28 / image.width, 28 / image.height);
      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;
      pdf.addImage(
        logo,
        margin,
        20 + (28 - imageHeight) / 2,
        imageWidth,
        imageHeight,
        undefined,
        "FAST",
      );
    }
    pdf.text(clean(brand.organizationName), margin + (logo ? 34 : 0), 38);
    pdf.setFont("NotoSans", "normal");
    pdf.setFontSize(8);
    pdf.text(clean(brand.productName), width - margin, 38, { align: "right" });
    y = 80;
  }
  page();
  line(title, 22, true);
  line(subtitle, 10);
  y += 14;
  for (const block of blocks) {
    const blockHeight =
      wrapped(block.heading, 12).length * 16.2 +
      5 +
      block.lines
        .filter(Boolean)
        .reduce(
          (height, text) => height + wrapped(text, 10).length * 13.5 + 1,
          0,
        ) +
      8;
    if (
      y + Math.min(blockHeight, 70) > bottom ||
      (blockHeight < bottom - 80 && y + blockHeight > bottom)
    )
      page();
    line(block.heading, 12, true);
    y += 5;
    for (const text of block.lines.filter(Boolean)) {
      line(text);
      y += 1;
    }
    y += 8;
  }
  const count = pdf.getNumberOfPages();
  for (let index = 1; index <= count; index++) {
    pdf.setPage(index);
    pdf.setDrawColor(210, 220, 224);
    pdf.line(margin, 752, width - margin, 752);
    pdf.setFont("NotoSans", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(70, 85, 94);
    pdf.text(
      "Generated on this device. Grades retain their published standards.",
      margin,
      770,
    );
    pdf.text(`${index} / ${count}`, width - margin, 770, { align: "right" });
  }
  pdf.setProperties({
    title: clean(title),
    subject: clean(subtitle),
    creator: "Assessment System",
  });
  return pdf;
}
export async function individualPdf(
  report: AthleteReport,
  brand: BrandSettings,
) {
  const blocks = [
    {
      heading: report.complete
        ? `${report.overall} of ${report.maxPoints} points`
        : "Incomplete assessment",
      lines: [
        report.complete
          ? "Direct sum of required published test grades. Each test awards 0 through 4 points."
          : `A point total is unavailable. Missing required tests: ${report.missing.join(", ")}.`,
        `Scoring profile: ${report.profile.name}. Comparison group: ${report.archetype?.name ?? "Not matched"}.`,
      ],
    },
    ...report.version.metrics.map((metric) => {
      const score = report.scores.find((item) => item.metric.id === metric.id);
      return {
        heading: metric.name,
        lines: score
          ? [
              `Result: ${score.value} ${metric.unit}. Grade: ${score.points}/4 (${score.band.label}).`,
              `Percentile: ${score.percentile === undefined ? "Unavailable" : `${score.percentile}th`}. Comparison sample: ${score.cohortSize ?? 0} athletes.`,
              score.band.meaning,
            ]
          : [
              `No valid published result. ${metric.required ? "Required for a complete total." : "Optional test."}`,
            ],
      };
    }),
    {
      heading: "Interpretation and comparison context",
      lines: [
        "Grade groups describe observed assessment results, not an automatic training prescription.",
        report.strengths.length
          ? `Higher grades: ${report.strengths.map((score) => score.metric.name).join(", ")}.`
          : "No distinct higher/lower grade group is identified. Tied grades are not arbitrarily split.",
        report.priorities.length
          ? `Lower grades: ${report.priorities.map((score) => score.metric.name).join(", ")}.`
          : "",
        "Percentiles use current roster tags and published results from the exact standards version through this assessment date. The database sample is not a population norm.",
      ],
    },
  ];
  return buildReportPdf(
    `${report.athlete.firstName} ${report.athlete.lastName}`,
    `${report.latestSession?.date ?? "No published assessment"} | ${report.version.name} v${report.version.version}`,
    blocks,
    brand,
  );
}
export async function beforeAfterPdf(
  before: AthleteReport,
  after: AthleteReport,
  brand: BrandSettings,
) {
  return buildReportPdf(
    `${after.athlete.firstName} ${after.athlete.lastName}: before and after`,
    `${before.latestSession?.date} to ${after.latestSession?.date}`,
    comparisonRows(before, after).map((row) => ({
      heading: row.metric.name,
      lines: [
        `Before: ${row.before ? `${row.before.value} ${row.before.metric.unit} | ${row.before.points}/4` : "No valid result"}`,
        `After: ${row.after ? `${row.after.value} ${row.after.metric.unit} | ${row.after.points}/4` : "Not retested"}`,
        row.delta === null
          ? row.reason
          : `Observed change: ${row.delta > 0 ? "+" : ""}${row.delta} ${row.metric.unit}. ${row.metric.direction === "lower" ? "Lower" : "Higher"} is better.`,
        "Each date retains its original grade. An observed change does not establish meaningful improvement.",
      ],
    })),
    brand,
  );
}
export async function rosterPdf(
  reports: AthleteReport[],
  brand: BrandSettings,
  scope: string,
  unassessed: string[] = [],
) {
  const pdf = new jsPDF({
    unit: "pt",
    format: "letter",
    orientation: "landscape",
    compress: true,
  });
  applyFonts(pdf, await loadFonts());
  const metrics = reports[0]?.version.metrics ?? [];
  assertCharacters(
    pdf,
    [
      scope,
      brand.organizationName,
      ...reports.map(
        (report) =>
          `${report.athlete.firstName} ${report.athlete.lastName} ${report.profile.name}`,
      ),
      ...metrics.map((metric) => `${metric.name} ${metric.unit}`),
      ...unassessed,
    ].join(" "),
  );
  const chunks = Array.from(
    { length: Math.max(1, Math.ceil(metrics.length / 5)) },
    (_, index) => metrics.slice(index * 5, index * 5 + 5),
  );
  for (const [chunkIndex, chunk] of chunks.entries()) {
    if (chunkIndex) pdf.addPage();
    autoTable(pdf, {
      startY: 116,
      margin: { top: 116, right: 36, bottom: 45, left: 36 },
      head: [
        [
          "Athlete / assessment",
          "Points",
          ...chunk.map((metric) => `${metric.shortName} (${metric.unit})`),
        ],
      ],
      body: reports.map((report) => [
        `${report.athlete.firstName} ${report.athlete.lastName}\n${report.latestSession?.date} | ${report.profile.name}`,
        report.overall === null
          ? "Incomplete"
          : `${report.overall}/${report.maxPoints}`,
        ...chunk.map(
          (metric) =>
            report.scores.find((score) => score.metric.id === metric.id)
              ?.value ?? "No result",
        ),
      ]),
      styles: {
        font: "NotoSans",
        fontSize: 9,
        cellPadding: 8,
        overflow: "linebreak",
        textColor: [29, 43, 50],
      },
      headStyles: {
        fillColor: [232, 241, 245],
        textColor: [29, 43, 50],
        fontStyle: "bold",
      },
      columnStyles: { 0: { cellWidth: 185 }, 1: { cellWidth: 55 } },
      showHead: "everyPage",
      rowPageBreak: "avoid",
    });
  }
  if (unassessed.length) {
    let position =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 116;
    if (position + 85 > 560) {
      pdf.addPage();
      position = 96;
    }
    autoTable(pdf, {
      startY: position + 20,
      margin: { top: 116, left: 36, right: 36, bottom: 45 },
      head: [["Athletes without a published result in this scope"]],
      body: unassessed.map((name) => [name]),
      styles: { font: "NotoSans", fontSize: 10, cellPadding: 9 },
      headStyles: { fillColor: [232, 241, 245], textColor: [29, 43, 50] },
    });
  }
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page);
    pdf.setFont("NotoSans", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(29, 43, 50);
    pdf.text(brand.organizationName, 36, 30);
    pdf.setFontSize(20);
    pdf.text("Roster assessment report", 36, 58);
    pdf.setFont("NotoSans", "normal");
    pdf.setFontSize(9);
    pdf.text(pdf.splitTextToSize(scope, 710), 36, 79);
    pdf.setFontSize(8);
    pdf.text(
      `${reports.length} with results | ${unassessed.length} without results | Values retain their units and published standards.`,
      36,
      590,
    );
    pdf.text(`${page} / ${count}`, 756, 590, { align: "right" });
  }
  return pdf;
}
