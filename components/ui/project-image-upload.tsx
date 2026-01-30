'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Loader2, Image as ImageIcon, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

interface ProjectImage {
  url: string
  is_primary?: boolean
  order_index?: number
}

interface ProjectImageUploadProps {
  projectId: string | null
  images: ProjectImage[]
  onImagesChange: (images: ProjectImage[]) => void
  disabled?: boolean
  bucketName?: string
}

export function ProjectImageUpload({
  projectId,
  images,
  onImagesChange,
  disabled = false,
  bucketName = 'project-images',
}: ProjectImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const supabase = createClient()
    const newImages: ProjectImage[] = []

    setUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: `${file.name} is larger than 5MB`,
            variant: 'destructive',
          })
          continue
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not an image file`,
            variant: 'destructive',
          })
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = projectId 
          ? `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          : `temp/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
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
          toast({
            title: 'Upload failed',
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
            variant: 'destructive',
          })
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)

        newImages.push({
          url: publicUrl,
          is_primary: images.length === 0 && newImages.length === 0, // First image is primary
          order_index: images.length + newImages.length,
        })

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
      }

      onImagesChange([...images, ...newImages])
      
      if (newImages.length > 0) {
        toast({
          title: 'Success',
          description: `Uploaded ${newImages.length} image(s) successfully`,
          variant: 'success',
        })
      }
    } catch (error: any) {
      console.error('Error uploading images:', error)
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload images',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      setUploadProgress({})
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = images[index]
    const newImages = images.filter((_, i) => i !== index)
    
    // If removed image was primary, make first image primary
    if (imageToRemove.is_primary && newImages.length > 0) {
      newImages[0].is_primary = true
    }
    
    // Reorder indices
    newImages.forEach((img, i) => {
      img.order_index = i
    })

    // Try to delete from storage if we have the project ID
    if (projectId && imageToRemove.url) {
      try {
        const supabase = createClient()
        // Extract file path from URL
        const urlParts = imageToRemove.url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const filePath = projectId ? `${projectId}/${fileName}` : fileName
        
        await supabase.storage.from(bucketName).remove([filePath])
      } catch (error) {
        console.error('Error deleting image from storage:', error)
        // Continue even if storage deletion fails
      }
    }

    onImagesChange(newImages)
  }

  const handleSetPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }))
    onImagesChange(newImages)
  }

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= newImages.length) return

    // Swap images
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]]
    
    // Update order indices
    newImages.forEach((img, i) => {
      img.order_index = i
    })

    onImagesChange(newImages)
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {images.length} image(s) uploaded
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max size: 5MB per image. Supported formats: JPEG, PNG, WebP
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="relative group">
              <div className="relative aspect-video overflow-hidden rounded-t-lg">
                <Image
                  src={image.url}
                  alt={`Project image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Primary
                  </div>
                )}
                {!disabled && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() => handleSetPrimary(index)}
                      disabled={image.is_primary}
                      className="h-8 w-8"
                      title="Set as primary"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveImage(index)}
                      className="h-8 w-8"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {!disabled && (
                <CardContent className="p-2 flex items-center justify-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveImage(index, 'up')}
                    disabled={index === 0}
                    className="h-6 w-6"
                    title="Move up"
                  >
                    ↑
                  </Button>
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveImage(index, 'down')}
                    disabled={index === images.length - 1}
                    className="h-6 w-6"
                    title="Move down"
                  >
                    ↓
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{fileName}</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


