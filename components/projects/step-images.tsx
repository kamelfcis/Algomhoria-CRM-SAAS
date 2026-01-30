'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { YouTubeVideosInput } from '@/components/ui/youtube-videos-input'
import { Image as ImageIcon, Youtube, Upload, X, Loader2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ProjectImage {
  url: string
  is_primary?: boolean
  order_index?: number
  file?: File // Store file for later upload
  preview?: string // Preview URL from FileReader
}

interface StepImagesProps {
  projectId?: string
  disabled?: boolean
  onPendingImagesChange?: (hasPending: boolean) => void
}

export function StepImages({ projectId, disabled = false, onPendingImagesChange }: StepImagesProps) {
  const { setValue, watch, getValues } = useFormContext()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUpdatingLocalRef = useRef(false) // Track if we're updating local state
  const isSyncingRef = useRef(false) // Track if we're syncing to form
  const hasUserRemovedImagesRef = useRef(false) // Track if user has manually removed images
  const initializedRef = useRef(false) // Track if we've initialized from form
  
  // Use local state as source of truth for immediate UI updates
  const [localImages, setLocalImages] = useState<ProjectImage[]>([])
  const [localVideos, setLocalVideos] = useState<string[]>([])

  // Reset removal flag when projectId changes (switching between projects)
  const lastProjectIdRef = useRef<string | undefined>(projectId)
  useEffect(() => {
    if (lastProjectIdRef.current !== projectId) {
      console.log('StepImages - ProjectId changed, resetting removal flag')
      lastProjectIdRef.current = projectId
      hasUserRemovedImagesRef.current = false
      initializedRef.current = false
    }
  }, [projectId])

  // Initialize from form values on mount and when form values change (for edit mode)
  useEffect(() => {
    const formImages = getValues('images')
    const formVideos = getValues('youtube_videos')
    
    console.log('StepImages - Form values check:', { 
      formImages: formImages?.length || 0,
      formVideos, 
      isArray: Array.isArray(formVideos),
      length: Array.isArray(formVideos) ? formVideos.length : 'N/A',
      localImagesLength: localImages.length,
      localVideosLength: localVideos.length,
      hasUserRemovedImages: hasUserRemovedImagesRef.current,
      initialized: initializedRef.current
    })
    
    // Initialize images from form if:
    // 1. We haven't initialized yet AND local images is empty, OR
    // 2. Form has images and local doesn't (initial load in edit mode) AND user hasn't removed images
    if (Array.isArray(formImages) && formImages.length > 0) {
      // Check if localImages is empty or doesn't match form images (excluding previews)
      const localHasPreviews = localImages.some(img => img.preview)
      const formImageUrls = formImages.map((img: any) => img.url || '').filter((url: string) => url && !url.startsWith('blob:'))
      const localImageUrls = localImages.map(img => img.url || '').filter(url => url && !url.startsWith('blob:'))
      
      // Only initialize if:
      // - We haven't initialized yet AND local is empty, OR
      // - User hasn't removed images AND form has more images than local (initial load)
      const shouldInitialize = 
        (!initializedRef.current && localImages.length === 0) ||
        (!hasUserRemovedImagesRef.current && !localHasPreviews && formImageUrls.length > 0 && formImageUrls.length > localImageUrls.length)
      
      if (shouldInitialize) {
        console.log('StepImages - Initializing images from form:', formImages.length)
        setLocalImages(formImages as ProjectImage[])
        initializedRef.current = true
        // Reset removal flag when initializing (new project loaded)
        hasUserRemovedImagesRef.current = false
      }
    } else if (Array.isArray(formImages) && formImages.length === 0 && !initializedRef.current) {
      // Initialize empty array if form is empty and we haven't initialized
      setLocalImages([])
      initializedRef.current = true
      // Reset removal flag when initializing (new project loaded)
      hasUserRemovedImagesRef.current = false
    }
    
    // Initialize videos from form on mount or when form changes
    if (Array.isArray(formVideos) && formVideos.length > 0) {
      // Only update if local is empty or different
      if (localVideos.length === 0 || JSON.stringify([...localVideos].sort()) !== JSON.stringify([...formVideos].sort())) {
        console.log('StepImages - Initializing videos from form:', formVideos)
        setLocalVideos(formVideos)
      }
    } else if (Array.isArray(formVideos) && formVideos.length === 0 && localVideos.length > 0) {
      // Don't clear local videos if form is empty but local has videos (user might be adding)
      // Only clear if we're sure form was explicitly set to empty
      console.log('StepImages - Form videos empty, keeping local videos')
    }
  }, [getValues]) // Re-run when form values might change (e.g., when initialData is set)

  // Sync local state to form whenever it changes
  // Use a ref to prevent infinite loops (already declared above)
  useEffect(() => {
    // Prevent infinite loop - don't sync if we're already syncing
    if (isSyncingRef.current) return
    
    // Get current form values to compare
    const currentFormImages = getValues('images') || []
    
    // Map localImages to form format, preserving existing images with URLs
    // Only include images that have URLs (existing) or files (pending uploads)
    const imageUrls = localImages
      .filter(img => img.url || img.file) // Only sync images that have URL or file
      .map(img => ({
        url: img.url || '', // Empty URL for pending uploads
        is_primary: img.is_primary || false,
        order_index: img.order_index || 0,
      }))
    
    // Only sync if values are actually different
    // Normalize and sort for comparison (exclude blob URLs from comparison)
    const currentNormalized = currentFormImages
      .filter((img: any) => img && img.url && !img.url.startsWith('blob:')) // Exclude blob URLs from comparison
      .map((img: any) => ({ 
        url: img.url || '', 
        is_primary: img.is_primary || false, 
        order_index: img.order_index || 0 
      }))
      .sort((a: any, b: any) => a.order_index - b.order_index)
    
    const newNormalized = imageUrls
      .filter(img => img.url && !img.url.startsWith('blob:')) // Exclude blob URLs from comparison
      .sort((a, b) => a.order_index - b.order_index)
    
    const currentStr = JSON.stringify(currentNormalized)
    const newStr = JSON.stringify(newNormalized)
    
    // Also check if we're adding new images (pending uploads)
    const hasPendingUploads = localImages.some(img => img.file && (!img.url || img.url.startsWith('blob:')))
    
    if (currentStr !== newStr || hasPendingUploads) {
      isSyncingRef.current = true
      console.log('StepImages - Syncing images to form:', imageUrls.length, 'images (including pending:', hasPendingUploads, ')')
      console.log('StepImages - localImages count:', localImages.length, 'imageUrls count:', imageUrls.length)
      
      // Use localImages as the source of truth - this ensures removals are reflected
      // Only include images that are in localImages (either with URL or file)
      // This way, when an image is removed from localImages, it's also removed from the form
      const imagesToSync = imageUrls
      
      setValue('images', imagesToSync, { shouldValidate: false, shouldDirty: true, shouldTouch: false })
      
      // Store file objects separately in a hidden field for later upload (only files without URLs)
      const pendingFiles = localImages.filter(img => img.file && (!img.url || img.url.startsWith('blob:'))).map(img => img.file!)
      setValue('_pendingImageFiles', pendingFiles, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
      
      // Notify parent if there are pending images
      if (onPendingImagesChange) {
        onPendingImagesChange(pendingFiles.length > 0)
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        isSyncingRef.current = false
      }, 100)
    }
  }, [localImages, setValue, getValues, onPendingImagesChange])

  useEffect(() => {
    console.log('StepImages - Syncing videos to form:', localVideos)
    setValue('youtube_videos', localVideos, { shouldValidate: false, shouldDirty: true, shouldTouch: false })
  }, [localVideos, setValue])

  // Watch for external form changes (e.g., when editing and form is reset with initial data)
  // Only sync if local images don't have preview URLs (to avoid overwriting previews)
  const watchedImages = watch('images', [])
  const watchedVideos = watch('youtube_videos', [])
  
  // Also watch form values directly as a fallback
  const formVideosDirect = getValues('youtube_videos')

  useEffect(() => {
    // Don't update if we're in the middle of a local update or syncing
    if (isUpdatingLocalRef.current || isSyncingRef.current) return
    
    // CRITICAL: Don't restore images if user has manually removed them
    if (hasUserRemovedImagesRef.current) {
      console.log('StepImages - Skipping watch update because user has removed images')
      return
    }
    
    // Use functional update to avoid dependency on localImages
    setLocalImages(currentLocal => {
      // Only update from watched images if:
      // 1. They are different from current local images (excluding preview URLs)
      // 2. Local images don't have any preview URLs (to avoid overwriting previews)
      // 3. Local images don't have any pending files (to avoid overwriting user selections)
      const hasLocalPreviews = currentLocal.some(img => img.preview)
      const hasLocalFiles = currentLocal.some(img => img.file)
      
      // Don't overwrite local state if user has pending uploads or previews
      if (hasLocalPreviews || hasLocalFiles) {
        return currentLocal // Keep current state
      }
      
      if (Array.isArray(watchedImages) && watchedImages.length > 0) {
        const localUrlsOnly = currentLocal
          .filter(img => img.url && !img.url.startsWith('blob:'))
          .map(img => ({ 
            url: img.url || '', 
            is_primary: img.is_primary || false, 
            order_index: img.order_index || 0 
          }))
        const watchedUrlsOnly = watchedImages
          .filter((img: any) => img && img.url && !img.url.startsWith('blob:'))
          .map((img: any) => ({ 
            url: img.url || '', 
            is_primary: img.is_primary || false, 
            order_index: img.order_index || 0 
          }))
        
        // Sort by order_index for comparison
        const localStr = JSON.stringify(localUrlsOnly.sort((a, b) => a.order_index - b.order_index))
        const watchedStr = JSON.stringify(watchedUrlsOnly.sort((a, b) => a.order_index - b.order_index))
        
        // Only update if watched images are different AND we're not in the middle of a user action
        // AND user hasn't removed images
        // Only update if watched has MORE images (initialization), not fewer (which would be a removal)
        if (watchedStr !== localStr && !isSyncingRef.current && !hasUserRemovedImagesRef.current) {
          if (watchedUrlsOnly.length > localUrlsOnly.length) {
            isUpdatingLocalRef.current = true
            setTimeout(() => {
              isUpdatingLocalRef.current = false
            }, 100)
            return watchedImages as ProjectImage[]
          }
        }
      } else if (Array.isArray(watchedImages) && watchedImages.length === 0 && currentLocal.length > 0) {
        // If form is empty but local has images, only clear if we're sure it's intentional
        // (e.g., form was reset, not just a sync issue)
        // For now, keep local images to avoid losing user data
        return currentLocal
      }
      return currentLocal // No change needed
    })
  }, [watchedImages]) // Only depend on watchedImages to prevent loop

  useEffect(() => {
    // Sync videos from form when they change (e.g., when editing and form is reset)
    // BUT: Don't overwrite local videos if they have content and form is empty (user is adding videos)
    console.log('StepImages - Watch effect triggered:', { 
      watchedVideos, 
      formVideosDirect,
      isArray: Array.isArray(watchedVideos),
      length: Array.isArray(watchedVideos) ? watchedVideos.length : 'N/A',
      localVideosLength: localVideos.length 
    })
    
    // Use watchedVideos or fallback to direct form value
    const videosToCheck = Array.isArray(watchedVideos) ? watchedVideos : 
                         (Array.isArray(formVideosDirect) ? formVideosDirect : [])
    
    // Only update from form if:
    // 1. Form has videos and they're different from local, OR
    // 2. Form has videos and local is empty (initial load)
    // DON'T clear local videos if form is empty but local has videos (user is adding)
    if (Array.isArray(videosToCheck) && videosToCheck.length > 0) {
      const videosStr = JSON.stringify([...videosToCheck].sort())
      const localVideosStr = JSON.stringify([...localVideos].sort())
      if (videosStr !== localVideosStr) {
        console.log('StepImages - Syncing videos from form (form has videos):', videosToCheck)
        setLocalVideos(videosToCheck)
      }
    }
    // Don't clear local videos if form is empty - user might be adding videos
    // Only clear if we're explicitly resetting (both are empty)
  }, [watchedVideos, formVideosDirect])

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      localImages.forEach(img => {
        if (img.preview && img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview)
        }
      })
    }
  }, [])

  const handleVideosChange = useCallback((videos: string[]) => {
    console.log('StepImages - Videos changed:', videos)
    setLocalVideos(videos)
  }, [])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      const newImages: ProjectImage[] = []
      const currentImages = [...localImages]

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not an image file`,
            variant: 'destructive',
          })
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: `${file.name} is larger than 10MB`,
            variant: 'destructive',
          })
          continue
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file)

        const orderIndex = currentImages.length + newImages.length
        const isFirstImage = currentImages.length === 0 && newImages.length === 0
        
        newImages.push({
          url: '', // Will be set after upload
          preview: previewUrl, // Use preview for display
          file: file, // Store file for later upload
          is_primary: isFirstImage,
          order_index: orderIndex,
        })
      }

      if (newImages.length > 0) {
        // Update local state immediately - this will trigger UI update
        const updatedImages = [...currentImages, ...newImages]
        console.log('✅ Setting localImages to:', updatedImages.length, 'images')
        console.log('✅ Preview URLs:', updatedImages.map(img => ({ preview: img.preview, url: img.url, hasFile: !!img.file })))
        
        // Set flag to prevent watch from overwriting
        isUpdatingLocalRef.current = true
        setLocalImages(updatedImages)
        
        // Clear flag after state update
        setTimeout(() => {
          isUpdatingLocalRef.current = false
        }, 100)
        
        toast({
          title: 'Images added',
          description: `${newImages.length} image(s) added. They will be uploaded when you save the project.`,
          variant: 'success',
        })
      }
    } catch (error: any) {
      console.error('Error processing images:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to process images',
        variant: 'destructive',
      })
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = useCallback(async (index: number) => {
    const imageToRemove = localImages[index]
    
    if (!imageToRemove) {
      console.warn('Cannot remove image: image not found at index', index)
      return
    }
    
    console.log('StepImages - Removing image at index', index, 'Image:', imageToRemove)
    
    // Mark that user has manually removed an image - this prevents watch/init effects from restoring it
    hasUserRemovedImagesRef.current = true
    
    // First, remove from local state immediately for UI update
    const updatedImages = localImages.filter((_, i) => i !== index)
    // Reassign order_index and ensure first image is primary
    const normalizedImages = updatedImages.map((img, i) => ({
      ...img,
      is_primary: i === 0,
      order_index: i,
    }))
    
    console.log('StepImages - Updated images after removal:', normalizedImages.length, 'images')
    setLocalImages(normalizedImages)
    
    // Immediately sync to form to ensure the image is removed from form state
    // This is critical - we need to remove it from the form before submission
    const imagesToSync = normalizedImages
      .filter(img => img.url || img.file)
      .map(img => ({
        url: img.url || '',
        is_primary: img.is_primary || false,
        order_index: img.order_index || 0,
      }))
    
    console.log('StepImages - Syncing removed image to form. New images count:', imagesToSync.length)
    isSyncingRef.current = true
    setValue('images', imagesToSync, { shouldValidate: false, shouldDirty: true, shouldTouch: false })
    setTimeout(() => {
      isSyncingRef.current = false
    }, 100)
    
    // If image has a URL (already uploaded), delete from storage
    if (imageToRemove.url && imageToRemove.url.trim() !== '' && !imageToRemove.url.startsWith('blob:')) {
      try {
        const supabase = createClient()
        
        // Extract file path from URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/project-images/[path]
        // Or: https://[project].supabase.co/storage/v1/object/sign/project-images/[path]
        let filePath = ''
        
        // Try different URL patterns
        const urlParts1 = imageToRemove.url.split('/project-images/')
        if (urlParts1.length > 1) {
          filePath = urlParts1[1].split('?')[0] // Remove query parameters if any
        } else {
          // Try alternative pattern
          const urlParts2 = imageToRemove.url.split('project-images/')
          if (urlParts2.length > 1) {
            filePath = urlParts2[1].split('?')[0]
          }
        }
        
        if (filePath) {
          console.log('StepImages - Deleting image from storage. File path:', filePath)
          console.log('StepImages - Full URL:', imageToRemove.url)
          
          // Delete from storage
          const { data, error: storageError } = await supabase.storage
            .from('project-images')
            .remove([filePath])
          
          if (storageError) {
            console.error('StepImages - Error deleting image from storage:', storageError)
            console.error('StepImages - Storage error details:', JSON.stringify(storageError, null, 2))
            toast({
              title: 'Warning',
              description: `Image removed from form but storage deletion failed: ${storageError.message}`,
              variant: 'destructive',
            })
          } else {
            console.log('✅ StepImages - Image successfully deleted from storage:', filePath)
            console.log('StepImages - Storage deletion response:', data)
            toast({
              title: 'Image removed',
              description: 'Image has been removed from the project and storage',
              variant: 'success',
            })
          }
        } else {
          console.warn('StepImages - Could not extract file path from URL:', imageToRemove.url)
          // Try to extract using regex as fallback
          const match = imageToRemove.url.match(/project-images\/(.+?)(\?|$)/)
          if (match && match[1]) {
            filePath = match[1]
            console.log('StepImages - Extracted file path using regex:', filePath)
            
            const { data, error: storageError } = await supabase.storage
              .from('project-images')
              .remove([filePath])
            
            if (storageError) {
              console.error('StepImages - Error deleting image from storage (regex path):', storageError)
              toast({
                title: 'Warning',
                description: `Image removed from form but storage deletion failed: ${storageError.message}`,
                variant: 'destructive',
              })
            } else {
              console.log('✅ StepImages - Image successfully deleted from storage (regex path):', filePath)
              toast({
                title: 'Image removed',
                description: 'Image has been removed from the project and storage',
                variant: 'success',
              })
            }
          } else {
            toast({
              title: 'Image removed',
              description: 'Image removed from form (could not extract file path from URL)',
              variant: 'default',
            })
          }
        }
      } catch (error: any) {
        console.error('StepImages - Error deleting image from storage:', error)
        console.error('StepImages - Error details:', JSON.stringify(error, null, 2))
        toast({
          title: 'Image removed',
          description: `Image removed from form (storage deletion failed: ${error?.message || 'Unknown error'})`,
          variant: 'destructive',
        })
      }
    } else {
      // Preview image (not yet uploaded) - just remove from form
      toast({
        title: 'Image removed',
        description: 'Image has been removed from the project',
        variant: 'success',
      })
    }
    
    // Clean up preview URL if it exists
    if (imageToRemove.preview && imageToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.preview)
    }
  }, [localImages, toast])

  const handleSetPrimary = useCallback((index: number) => {
    const updatedImages = localImages.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }))
    setLocalImages(updatedImages)
  }, [localImages])

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const updatedImages = [...localImages]
    const [moved] = updatedImages.splice(fromIndex, 1)
    updatedImages.splice(toIndex, 0, moved)
    // Reassign order_index
    const normalizedImages = updatedImages.map((img, i) => ({
      ...img,
      is_primary: i === 0,
      order_index: i,
    }))
    setLocalImages(normalizedImages)
  }, [localImages])

  // Get image URL for display (preview if available, otherwise use url)
  const getImageUrl = (image: ProjectImage) => {
    return image.preview || image.url
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
      {/* Project Images */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            Project Images
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Upload Button */}
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={disabled}
                className="hidden"
                id="project-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="transition-all duration-200"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
              <p className="text-sm text-muted-foreground">
                Select one or more images (max 10MB each). Images will be uploaded when you save the project.
              </p>
            </div>

            {/* Image Grid */}
            {localImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {localImages.map((image, index) => {
                  const imageUrl = getImageUrl(image)
                  const isPending = !!image.file && !image.url
                  const isBlobUrl = imageUrl?.startsWith('blob:')
                  
                  return (
                    <div
                      key={`img-${image.preview || image.url || `pending-${index}`}-${index}`}
                      className="relative group border border-border rounded-lg overflow-hidden bg-muted/30"
                    >
                      <div className="aspect-video relative">
                        {imageUrl ? (
                          isBlobUrl ? (
                            // Use regular img tag for blob URLs (preview images)
                            <img
                              src={imageUrl}
                              alt={`Project image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            // Use Next.js Image for regular URLs
                            <Image
                              src={imageUrl}
                              alt={`Project image ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                              unoptimized
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {isPending && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                            <div className="bg-background/90 px-2 py-1 rounded text-xs font-medium">
                              Pending Upload
                            </div>
                          </div>
                        )}
                        {image.is_primary && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium flex items-center gap-1 z-10">
                            <Star className="h-3 w-3 fill-current" />
                            Primary
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-30">
                          {!image.is_primary && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              onClick={() => handleSetPrimary(index)}
                              disabled={disabled}
                              className="h-8 w-8"
                              title="Set as primary"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveImage(index)}
                            disabled={disabled}
                            className="h-8 w-8"
                            title="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-2 text-xs text-center text-muted-foreground">
                        {isPending ? 'Pending Upload' : `Image ${index + 1}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {localImages.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed rounded-lg">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No images uploaded yet. Click "Upload Images" to add project images.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* YouTube Videos */}
      <Card className="border border-border/50 bg-card shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
            <Youtube className="h-4 w-4 text-muted-foreground" />
            YouTube Videos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <YouTubeVideosInput
            videos={localVideos}
            onChange={handleVideosChange}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </div>
  )
}
