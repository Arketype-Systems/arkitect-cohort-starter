import { isLocalImage } from "./images";
import { isRecord, isText } from "./validation";
import type { BrandSettings } from "./types";
const color = (value: unknown) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
export function validBrand(value: unknown): value is BrandSettings {
  return (
    isRecord(value) &&
    isText(value.organizationName, true) &&
    isText(value.productName, true) &&
    ["primaryColor", "accentColor", "inkColor"].every((key) =>
      color(value[key]),
    ) &&
    ["DM Sans", "Arial", "Verdana", "system-ui"].includes(
      String(value.bodyFont),
    ) &&
    ["Manrope", "Arial", "Arial Black", "Georgia"].includes(
      String(value.displayFont),
    ) &&
    ["technical", "classic", "bold"].includes(String(value.direction)) &&
    (value.logoDataUrl === undefined || isLocalImage(value.logoDataUrl))
  );
}
export function contrastText(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    ?.map((value) => parseInt(value, 16) / 255) ?? [0, 0, 0];
  const luminance = rgb
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#ffffff";
}

export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) =>
    (hex.slice(1).match(/../g) ?? [])
      .map((value) => parseInt(value, 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      )
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
