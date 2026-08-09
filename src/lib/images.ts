export async function imageFileToDataUrl(file: File, maxBytes = 2_000_000): Promise<string> {
  if (!file.size) return ''
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  if (file.size > maxBytes) throw new Error('The image must be smaller than 2 MB.')
  return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('The image could not be read.')); reader.readAsDataURL(file) })
}
