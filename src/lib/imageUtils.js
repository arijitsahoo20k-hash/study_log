/**
 * Compresses an image blob/file in the browser before upload.
 * Keeps storage costs down, speeds up upload on slow connections,
 * and strips EXIF/location metadata in the process (re-encoded canvas
 * output carries no original EXIF block).
 */
export async function compressImage(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  const bitmap = await createImageBitmap(file)

  let { width, height } = bitmap
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )

  bitmap.close?.()
  return blob
}

export function blobToFile(blob, name) {
  return new File([blob], name, { type: blob.type })
}
