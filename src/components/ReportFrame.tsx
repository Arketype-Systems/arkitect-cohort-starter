import { useState, type ReactNode } from "react";
import { Download, Printer } from "lucide-react";
import { Notice } from "./ui";

// Report toolbar/export state follows TF ReportCanvas ac2f244. The AMS keeps
// its own CSS, brand tokens and report model, and exports searchable PDF text.
export function ReportFrame({
  children,
  onPdf,
  csv,
  title = "Assessment report",
}: {
  children: ReactNode;
  onPdf: () => Promise<void>;
  csv?: () => void;
  title?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      await onPdf();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The PDF could not be generated. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="report-toolbar">
        <span>{title}</span>
        <div>
          {csv && (
            <button className="button secondary" onClick={csv}>
              CSV
            </button>
          )}
          <button className="button secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Print report
          </button>
          <button className="button primary" disabled={busy} onClick={download}>
            <Download size={16} />
            {busy ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>
      </div>
      {error && <Notice tone="warning">{error}</Notice>}
      <article className="report-document">{children}</article>
    </>
  );
}
