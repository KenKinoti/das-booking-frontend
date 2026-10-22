/**
 * Shrink a photo on the device before it is uploaded: at most `maxSide` px
 * on the long edge, JPEG, quality lowered step by step until it fits in
 * `maxBytes` (the API takes 600 KB; a 1280 px phone photo is ~150–300 KB).
 *
 *   const blob = await compressPhoto(videoOrImageOrBlob, { maxSide: 1280, maxBytes: 400 * 1024 })
 */
export function fitSize(w, h, maxSide) {
  const s = Math.min(1, maxSide / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) }
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    else resolve(null)
  })
}

async function sourceOf(src) {
  if (typeof Blob !== 'undefined' && src instanceof Blob) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(src, { imageOrientation: 'from-image' })
      } catch {
        /* fall back to <img> */
      }
    }
    const url = URL.createObjectURL(src)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      return img
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }
  return src
}

export async function compressPhoto(src, { maxSide = 1280, maxBytes = 400 * 1024, quality = 0.78 } = {}) {
  const el = await sourceOf(src)
  const w = el.videoWidth || el.naturalWidth || el.width
  const h = el.videoHeight || el.naturalHeight || el.height
  if (!w || !h) throw new Error('The picture is empty — try again.')
  let { width, height } = fitSize(w, h, maxSide)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let blob = null
  for (let attempt = 0; attempt < 6; attempt++) {
    canvas.width = width
    canvas.height = height
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(el, 0, 0, width, height)
    for (let q = quality; q >= 0.42; q -= 0.12) {
      blob = await toBlob(canvas, q)
      if (blob && blob.size <= maxBytes) return { blob, width, height }
    }
    width = Math.round(width * 0.8)
    height = Math.round(height * 0.8)
  }
  if (blob && blob.size <= maxBytes) return { blob, width, height }
  throw new Error('That photo is too large to send.')
}
