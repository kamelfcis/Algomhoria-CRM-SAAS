/**
 * Single source of truth for normalizing project images and YouTube videos
 * before saving to the database.
 */

export interface NormalizedImage {
  url: string
  is_primary: boolean
  order_index: number
}

/**
 * Normalizes an array of images, filtering out invalid entries and ensuring
 * proper structure for JSONB storage in Supabase.
 * 
 * @param images - Raw image data from form or API
 * @returns Array of normalized image objects, or empty array if invalid
 */
export function normalizeImages(images: any[] | undefined): NormalizedImage[] {
  if (!Array.isArray(images)) return []
  
  return images
    .filter(img =>
      img &&
      img.url &&
      typeof img.url === 'string' &&
      img.url.trim() !== '' &&
      !img.url.startsWith('blob:') &&
      (img.url.startsWith('http://') || img.url.startsWith('https://') || img.url.startsWith('/'))
    )
    .map((img, i) => ({
      url: img.url.trim(),
      is_primary: Boolean(img.is_primary ?? i === 0),
      order_index: Number(img.order_index ?? i),
    }))
}

/**
 * Normalizes YouTube video URLs, filtering out invalid entries and ensuring
 * proper array format for JSONB storage in Supabase.
 * 
 * @param videos - Raw video data from form or API (can be array, string, or undefined)
 * @returns Array of normalized video URLs, or empty array if invalid
 */
export function normalizeYoutube(videos: any): string[] {
  if (!videos) return []
  
  if (Array.isArray(videos)) {
    return videos
      .map(v => String(v).trim())
      .filter(v => v && (v.startsWith('http://') || v.startsWith('https://')))
  }
  
  const v = String(videos).trim()
  return v && (v.startsWith('http://') || v.startsWith('https://')) ? [v] : []
}

