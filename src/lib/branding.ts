import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { validBrand } from "./branding-validation";
import { db } from "./db";
import type { BrandSettings } from "./types";

export const DEFAULT_BRAND: BrandSettings = {
  organizationName: "Fieldhouse",
  productName: "Assessment System",
  primaryColor: "#087f8d",
  accentColor: "#21c7d9",
  inkColor: "#17242b",
  bodyFont: "DM Sans",
  displayFont: "Manrope",
  direction: "technical",
};
export const BRAND_PRESETS: Array<{
  name: string;
  description: string;
  settings: Partial<BrandSettings>;
}> = [
  {
    name: "Technical field",
    description: "Quiet operational surfaces with focused instrument color.",
    settings: {
      primaryColor: "#087f8d",
      accentColor: "#21c7d9",
      inkColor: "#17242b",
      bodyFont: "DM Sans",
      displayFont: "Manrope",
      direction: "technical",
    },
  },
  {
    name: "Classic program",
    description: "Editorial typography with a collegiate navy and warm accent.",
    settings: {
      primaryColor: "#23456b",
      accentColor: "#c88935",
      inkColor: "#17283b",
      bodyFont: "Arial",
      displayFont: "Georgia",
      direction: "classic",
    },
  },
  {
    name: "Bold performance",
    description: "Stronger contrast and athletic display hierarchy.",
    settings: {
      primaryColor: "#b33a32",
      accentColor: "#f0b24b",
      inkColor: "#1d2329",
      bodyFont: "Arial",
      displayFont: "Arial Black",
      direction: "bold",
    },
  },
];
export function parseBrand(value?: string): BrandSettings {
  try {
    const parsed = { ...DEFAULT_BRAND, ...(value ? JSON.parse(value) : {}) };
    return validBrand(parsed) ? parsed : DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}
export function useBrandSettings() {
  const record = useLiveQuery(() => db.settings.get("brand"), []);
  return useMemo(() => parseBrand(record?.value), [record?.value]);
}
export async function saveBrandSettings(settings: BrandSettings) {
  if (!validBrand(settings))
    throw new Error(
      "Review the organization name, colors, fonts and logo before saving.",
    );
  await db.settings.put({ key: "brand", value: JSON.stringify(settings) });
}
