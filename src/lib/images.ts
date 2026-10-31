export async function imageFileToDataUrl(
  file: File,
  maxBytes = 2_000_000,
): Promise<string> {
  if (!file.size) return "";
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > maxBytes)
    throw new Error("The image must be smaller than 2 MB.");
  const url = URL.createObjectURL(file);
  try {
    return await rasterizeImageUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function isLocalImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 4_000_000 &&
    /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/.test(
      value,
    )
  );
}

export async function rasterizeImageUrl(url: string): Promise<string> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const scale = Math.min(
    1,
    800 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Image processing is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
