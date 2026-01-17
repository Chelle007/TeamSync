import { createServiceClient } from '@/utils/supabase/service'
import fs from 'fs'
import path from 'path'

// Bucket names
export const BUCKETS = {
  VIDEOS: 'videos',
  AUDIO: 'audio',
  DOCS: 'docs',
  SCREENSHOTS: 'screenshots',
} as const

type BucketName = typeof BUCKETS[keyof typeof BUCKETS]

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: BucketName,
  filePath: string,
  storagePath: string
): Promise<{ url: string; path: string } | null> {
  try {
    const supabase = createServiceClient()
    
    // Read file from local filesystem
    const fileBuffer = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)
    const contentType = getContentType(fileName)
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      })

    if (error) {
      console.error(`❌ Upload failed to ${bucket}/${storagePath}:`, error.message)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    console.log(`✅ Uploaded to ${bucket}/${storagePath}`)
    
    return {
      url: urlData.publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error(`❌ Upload error:`, error)
    return null
  }
}

/**
 * Upload video file to Supabase Storage
 */
export async function uploadVideo(
  localPath: string,
  reportKey: string
): Promise<string | null> {
  const storagePath = `${reportKey}_final.mp4`
  const result = await uploadFile(BUCKETS.VIDEOS, localPath, storagePath)
  return result?.url || null
}

/**
 * Upload audio file to Supabase Storage
 */
export async function uploadAudio(
  localPath: string,
  reportKey: string
): Promise<string | null> {
  const storagePath = `${reportKey}.mp3`
  const result = await uploadFile(BUCKETS.AUDIO, localPath, storagePath)
  return result?.url || null
}

/**
 * Upload PDF document to Supabase Storage
 */
export async function uploadPdf(
  localPath: string,
  reportKey: string
): Promise<string | null> {
  const storagePath = `${reportKey}.pdf`
  const result = await uploadFile(BUCKETS.DOCS, localPath, storagePath)
  return result?.url || null
}

/**
 * Upload screenshot to Supabase Storage
 */
export async function uploadScreenshot(
  localPath: string,
  reportKey: string,
  screenshotName: string
): Promise<string | null> {
  const storagePath = `${reportKey}/${screenshotName}`
  const result = await uploadFile(BUCKETS.SCREENSHOTS, localPath, storagePath)
  return result?.url || null
}

/**
 * Upload multiple screenshots to Supabase Storage
 */
export async function uploadScreenshots(
  screenshots: Array<{ filepath: string; filename: string }>,
  reportKey: string
): Promise<Array<{ filename: string; url: string }>> {
  const results: Array<{ filename: string; url: string }> = []
  
  for (const screenshot of screenshots) {
    const url = await uploadScreenshot(
      screenshot.filepath,
      reportKey,
      screenshot.filename
    )
    if (url) {
      results.push({ filename: screenshot.filename, url })
    }
  }
  
  return results
}

/**
 * Get public URL for a file in Supabase Storage
 */
export function getPublicUrl(bucket: BucketName, storagePath: string): string {
  const supabase = createServiceClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  return data.publicUrl
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: BucketName,
  storagePath: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.storage.from(bucket).remove([storagePath])
    
    if (error) {
      console.error(`❌ Delete failed:`, error.message)
      return false
    }
    
    console.log(`🗑️ Deleted ${bucket}/${storagePath}`)
    return true
  } catch (error) {
    console.error(`❌ Delete error:`, error)
    return false
  }
}

/**
 * Delete local file after upload
 */
export function deleteLocalFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`🗑️ Deleted local file: ${filePath}`)
      return true
    }
    return false
  } catch (error) {
    console.error(`❌ Failed to delete local file:`, error)
    return false
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.srt': 'text/plain',
    '.ass': 'text/plain',
  }
  return contentTypes[ext] || 'application/octet-stream'
}

