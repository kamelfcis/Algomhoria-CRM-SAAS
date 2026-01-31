'use client'

import * as React from 'react'
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface PropertyImage {
  id?: string
  url: string
  is_primary?: boolean
  order_index?: number
  file?: File
  preview?: string
}

interface PropertyImageUploadProps {
  propertyId: string | null
  images: PropertyImage[]
  onImagesChange: (images: PropertyImage[]) => void
  disabled?: boolean
  bucketName?: string
}

export function PropertyImageUpload({
  propertyId,
  images,
  onImagesChange,
  disabled = false,
  bucketName = 'property-images',
}: PropertyImageUploadProps) {
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState<{ [key: string]: number }>({})
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // If no propertyId, create preview images with blob URLs (for creation mode)
    if (!propertyId) {
      const newImages: PropertyImage[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const preview = URL.createObjectURL(file)
        newImages.push({
          url: preview,
          preview: preview,
          file: file,
          is_primary: images.length === 0 && i === 0,
          order_index: images.length + i,
        })
      }
      onImagesChange([...images, ...newImages])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // If propertyId exists, upload immediately (for edit mode)
    const supabase = createClient()
    const newImages: PropertyImage[] = []

    setUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = fileName

        // Upload to Supabase Storage
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)

        // Insert into database
        const { data: imageData, error: dbError } = await supabase
          .from('property_images')
          .insert({
            property_id: propertyId,
            image_url: publicUrl,
            order_index: images.length + newImages.length,
          })
          .select()
          .single()

        if (dbError) {
          console.error('Database error:', dbError)
          // Delete uploaded file if database insert fails
          await supabase.storage.from(bucketName).remove([filePath])
          continue
        }

        newImages.push({
          id: imageData.id,
          url: publicUrl,
          is_primary: imageData.is_primary || false,
          order_index: imageData.order_index || images.length + newImages.length,
        })

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
      }

      onImagesChange([...images, ...newImages])
    } catch (error) {
      console.error('Error uploading images:', error)
    } finally {
      setUploading(false)
      setUploadProgress({})
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async (imageId: string | undefined, imageUrl: string) => {
    // If no propertyId, just remove from local state (for creation mode)
    if (!propertyId) {
      const imageToRemove = images.find(img => img.url === imageUrl)
      if (imageToRemove?.preview) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      onImagesChange(images.filter((img) => img.url !== imageUrl))
      return
    }

    // If propertyId exists, delete from storage and database (for edit mode)
    if (!imageId) return

    const supabase = createClient()

    try {
      // Extract file path from URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/property-id/filename
      let filePath: string | null = null
      
      try {
        const urlObj = new URL(imageUrl)
        const pathParts = urlObj.pathname.split('/').filter(p => p) // Remove empty strings
        const bucketIndex = pathParts.indexOf(bucketName)
        
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          // Extract path after bucket name
          filePath = pathParts.slice(bucketIndex + 1).join('/')
        } else {
          // Fallback: try to extract using string split
          const bucketPath = `${bucketName}/`
          const pathIndex = imageUrl.indexOf(bucketPath)
          if (pathIndex !== -1) {
            filePath = imageUrl.substring(pathIndex + bucketPath.length)
            // Remove query parameters if any
            const queryIndex = filePath.indexOf('?')
            if (queryIndex !== -1) {
              filePath = filePath.substring(0, queryIndex)
            }
          }
        }
      } catch (urlError) {
        console.error('Error parsing URL:', urlError)
        // Try simple string extraction as last resort
        const bucketPath = `${bucketName}/`
        const pathIndex = imageUrl.indexOf(bucketPath)
        if (pathIndex !== -1) {
          filePath = imageUrl.substring(pathIndex + bucketPath.length)
          const queryIndex = filePath.indexOf('?')
          if (queryIndex !== -1) {
            filePath = filePath.substring(0, queryIndex)
          }
        }
      }

      // Delete from storage if we have a valid file path
      if (filePath) {
        const { error: storageError } = await supabase.storage.from(bucketName).remove([filePath])
        
        if (storageError) {
          console.error('Error deleting from storage:', storageError)
          // Continue with database deletion even if storage deletion fails
        }
      } else {
        console.warn('Could not extract file path from URL:', imageUrl)
      }

      // Delete from database
      const { error: dbError } = await supabase.from('property_images').delete().eq('id', imageId)
      
      if (dbError) {
        console.error('Error deleting from database:', dbError)
        throw dbError
      }

      // Update local state
      onImagesChange(images.filter((img) => img.id !== imageId))
    } catch (error) {
      console.error('Error removing image:', error)
      throw error
    }
  }

  const handleSetPrimary = async (imageId: string | undefined, imageUrl: string) => {
    // If no propertyId, just update local state (for creation mode)
    if (!propertyId) {
      onImagesChange(
        images.map((img) => ({
          ...img,
          is_primary: img.url === imageUrl,
        }))
      )
      return
    }

    // If propertyId exists, update in database (for edit mode)
    if (!imageId) return

    const supabase = createClient()

    try {
      // Remove primary from all images
      await supabase
        .from('property_images')
        .update({ is_primary: false })
        .eq('property_id', propertyId)

      // Set new primary
      await supabase
        .from('property_images')
        .update({ is_primary: true })
        .eq('id', imageId)

      // Update local state
      onImagesChange(
        images.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }))
      )
    } catch (error) {
      console.error('Error setting primary image:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Property Images</label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          id="property-image-upload"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Images
            </>
          )}
        </Button>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map((image) => (
              <div
                key={image.id || image.url}
                className={cn(
                  'relative group aspect-video rounded-lg overflow-hidden border-2',
                  image.is_primary ? 'border-gold ring-2 ring-gold/20' : 'border-border'
                )}
              >
                <Image
                  src={image.preview || image.url}
                  alt="Property"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  loading="lazy"
                  unoptimized={!!image.preview}
                />
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-gold text-white text-xs font-bold px-2 py-1 rounded">
                    Primary
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.is_primary && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetPrimary(image.id, image.url)}
                      disabled={disabled || uploading}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveImage(image.id, image.url)}
                    disabled={disabled || uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

    </div>
  )
}

