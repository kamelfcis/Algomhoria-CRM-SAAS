'use client'

import React, { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Stepper, type Step } from '@/components/ui/stepper'
import { useStepper } from '@/hooks/use-stepper'
import { StepBasicInfo } from '@/components/projects/step-basic-info'
import { StepLocation } from '@/components/projects/step-location'
import { StepImages } from '@/components/projects/step-images'
import { ChevronLeft, ChevronRight, X, FolderKanban, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'

// Schema for images - allow empty string for pending uploads
const projectImageSchema = z.object({
  url: z.string(), // Allow empty string for pending uploads
  is_primary: z.boolean().default(false),
  order_index: z.number().int().default(0),
})

// Note: Schema validation messages will be translated in the component using t()
const wizardSchema = z.object({
  // Step 1: Basic Info
  title_ar: z.string().min(1),
  title_en: z.string().min(1),
  description_ar: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  project_type: z.enum(['administrative', 'commercial', 'residential'], {
    required_error: 'PROJECT_TYPE_REQUIRED',
  }),
  facilities: z.array(z.string()).optional().default([]),
  services: z.array(z.string()).optional().default([]),
  units: z.array(z.string()).optional().default([]),
  // Step 2: Location
  governorate_id: z.string().uuid().optional().nullable(),
  area_id: z.string().uuid().optional().nullable(),
  address: z.string().optional().nullable(),
  location_text: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  // Step 3: Images
  images: z.array(projectImageSchema).optional().default([]),
  youtube_videos: z.array(z.string().url()).optional().default([]),
  // Other fields
  order_index: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
})

type WizardForm = z.infer<typeof wizardSchema>

interface ProjectWizardProps {
  onClose: () => void
  onSubmit: (data: WizardForm, projectId?: string) => Promise<any> // Returns project data, accepts optional projectId for updates
  isLoading?: boolean
  projectId?: string | null
  initialData?: Partial<WizardForm>
  mode?: 'create' | 'edit'
}

async function getFacilities() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_facilities')
    .select('id, name_ar, name_en')
    .eq('status', 'active')
    .order('name_en')

  if (error) throw error
  return data || []
}

async function getServices() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_services')
    .select('id, name_ar, name_en')
    .eq('status', 'active')
    .order('name_en')

  if (error) throw error
  return data || []
}

// Mock units - in a real app, this would come from a database table
const MOCK_UNITS = [
  { id: 'chalets', name_en: 'Chalets', name_ar: 'شاليهات' },
  { id: 'lands', name_en: 'Lands', name_ar: 'أراضي' },
  { id: 'business-building', name_en: 'Business Building', name_ar: 'مبنى تجاري' },
  { id: '2-level', name_en: '2 Level', name_ar: 'دورين' },
  { id: 'garage', name_en: 'Garage', name_ar: 'جراج' },
  { id: 'pharmacy', name_en: 'Pharmacy', name_ar: 'صيدلية' },
  { id: 'twin-house', name_en: 'Twin House', name_ar: 'بيت توأم' },
  { id: 'cabin', name_en: 'Cabin', name_ar: 'كابينة' },
  { id: 'furnished-apartments', name_en: 'Furnished Apartments', name_ar: 'شقق مفروشة' },
  { id: 'warehouse-stores', name_en: 'Warehouse / Stores', name_ar: 'مستودع / محلات' },
  { id: 'apartments', name_en: 'Apartments', name_ar: 'شقق' },
  { id: 'ground-floor', name_en: 'Ground Floor', name_ar: 'دور أرضي' },
  { id: 'project', name_en: 'Project', name_ar: 'مشروع' },
  { id: 'commercial-space', name_en: 'Commercial Space', name_ar: 'مساحة تجارية' },
  { id: 'penthouse', name_en: 'Penthouse', name_ar: 'بنتهاوس' },
  { id: 'hotels', name_en: 'Hotels', name_ar: 'فنادق' },
  { id: 'offices-companies', name_en: 'Offices / Companies', name_ar: 'مكاتب / شركات' },
  { id: 'town-houses', name_en: 'Town Houses', name_ar: 'بيوت مدينة' },
  { id: 'land', name_en: 'Land', name_ar: 'أرض' },
  { id: 'basement', name_en: 'Basement', name_ar: 'قبو' },
  { id: 'factory', name_en: 'Factory', name_ar: 'مصنع' },
  { id: 'roof', name_en: 'Roof', name_ar: 'سطح' },
  { id: 'shops', name_en: 'Shops', name_ar: 'محلات' },
  { id: 'residential-building', name_en: 'Residential Building', name_ar: 'مبنى سكني' },
  { id: 'building', name_en: 'Building', name_ar: 'مبنى' },
  { id: 'studio', name_en: 'Studio', name_ar: 'استوديو' },
  { id: 'shopping-mall', name_en: 'Shopping Mall', name_ar: 'مول تجاري' },
  { id: 'villa', name_en: 'Villa', name_ar: 'فيلا' },
  { id: 'kabana', name_en: 'Kabana', name_ar: 'كابينة' },
]

const steps: Step[] = [
  { id: 'basic', label: 'Basic Info', description: 'Project details and type' },
  { id: 'location', label: 'Location', description: 'Address and map location' },
  { id: 'images', label: 'Images & Videos', description: 'Upload media content' },
]

export function ProjectWizard({ onClose, onSubmit, isLoading = false, projectId, initialData, mode = 'create' }: ProjectWizardProps) {
  const t = useTranslations()
  const wizardRef = React.useRef<HTMLDivElement>(null)
  
  const methods = useForm<WizardForm>({
    resolver: zodResolver(wizardSchema),
    mode: 'onChange',
    defaultValues: {
      project_type: undefined,
      facilities: [],
      services: [],
      units: [],
      images: [],
      youtube_videos: [],
      order_index: 0,
      status: 'active',
      ...initialData, // Merge initialData into defaultValues
    },
  })

  const { handleSubmit, trigger, formState, reset } = methods

  // Update form when initialData changes (for edit mode)
  // Use a ref to track the last projectId to detect when switching projects
  const lastProjectIdRef = React.useRef<string | null | undefined>(projectId)
  
  React.useEffect(() => {
    // Reset initialization flag when projectId changes (switching between projects)
    if (lastProjectIdRef.current !== projectId) {
      lastProjectIdRef.current = projectId
    }
    
    if (initialData) {
      console.log('ProjectWizard - Initializing with initialData:', initialData)
      
      // Get current form values and merge with initialData
      const currentValues = methods.getValues()
      const mergedValues = {
        ...currentValues,
        ...initialData,
        // Ensure arrays are properly set - use initialData if it has values
        images: (initialData.images && Array.isArray(initialData.images) && initialData.images.length > 0) 
          ? initialData.images 
          : [],
        youtube_videos: (initialData.youtube_videos && Array.isArray(initialData.youtube_videos) && initialData.youtube_videos.length > 0)
          ? initialData.youtube_videos
          : [],
        facilities: initialData.facilities || [],
        services: initialData.services || [],
        units: initialData.units || [],
      } as WizardForm
      
      console.log('ProjectWizard - Merged values:', mergedValues)
      
      // Reset form with merged values
      reset(mergedValues)
      
      // Also explicitly set images and videos to ensure they're in the form state
      if (initialData.images !== undefined && Array.isArray(initialData.images)) {
        methods.setValue('images', initialData.images, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
        console.log('ProjectWizard - Set images:', initialData.images.length)
      }
      
      if (initialData.youtube_videos !== undefined && Array.isArray(initialData.youtube_videos)) {
        console.log('ProjectWizard - Setting youtube_videos from initialData:', initialData.youtube_videos)
        methods.setValue('youtube_videos', initialData.youtube_videos, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
      }
    } else if (mode === 'create') {
      // Reset form for create mode
      reset({
        project_type: undefined,
        facilities: [],
        services: [],
        units: [],
        images: [],
        youtube_videos: [],
        order_index: 0,
        status: 'active',
      })
    }
  }, [initialData, projectId, mode, reset, methods])

  const { data: facilities } = useQuery({
    queryKey: ['property-facilities'],
    queryFn: getFacilities,
    staleTime: 10 * 60 * 1000,
  })

  const { data: services } = useQuery({
    queryKey: ['property-services'],
    queryFn: getServices,
    staleTime: 10 * 60 * 1000,
  })

  const stepper = useStepper({
    initialStep: 0,
    totalSteps: steps.length,
    onComplete: async () => {
      // This should only be called when actually submitting the form
      // Not when navigating between steps
      const isValid = await trigger()
      if (isValid) {
        const data = methods.getValues()
        await onSubmit(data)
      }
    },
  })

  const validateCurrentStep = async () => {
    let fieldsToValidate: (keyof WizardForm)[] = []

    switch (stepper.currentStep) {
      case 0:
        fieldsToValidate = ['title_ar', 'title_en', 'project_type']
        break
      case 1:
        fieldsToValidate = [] // Location is optional
        break
      case 2:
        fieldsToValidate = [] // Images are optional
        break
    }

    const isValid = await trigger(fieldsToValidate)
    return isValid
  }

  const handleNext = async (e?: React.MouseEvent) => {
    // Prevent form submission
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const isValid = await validateCurrentStep()
    if (isValid) {
      // Only move to next step if not on last step
      if (!stepper.isLastStep) {
        // Pass skipCompletion=true to prevent triggering onComplete
        stepper.nextStep(true)
        // Scroll to top when moving to next step
        setTimeout(() => {
          if (wizardRef.current) {
            wizardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }, 100)
      }
    }
  }

  const handleBack = () => {
    stepper.previousStep()
    // Scroll to top when going back
    setTimeout(() => {
      if (wizardRef.current) {
        wizardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 100)
  }

  const onFormSubmit = async (data: WizardForm) => {
    try {
      // Get the latest form values to ensure we have images and videos
      const latestData = methods.getValues()
      
      // Get pending files from form data - they should be stored in _pendingImageFiles
      const pendingFiles = (latestData as any)._pendingImageFiles as File[] || []
      let currentImages = Array.isArray(latestData.images) ? [...latestData.images] : []
      
      console.log('ProjectWizard onFormSubmit - mode:', mode, 'projectId:', projectId)
      console.log('ProjectWizard onFormSubmit - pendingFiles:', pendingFiles.length)
      console.log('ProjectWizard onFormSubmit - currentImages before upload:', currentImages.length)
      
      // Also check images that have file property but no URL (pending uploads)
      const imagesWithFiles = currentImages.filter((img: any) => (img as any).file && (!img.url || img.url === '' || img.url.startsWith('blob:')))
      
      // Combine pending files from both sources
      const allPendingFiles = [
        ...pendingFiles,
        ...imagesWithFiles.map((img: any) => (img as any).file).filter((f: any) => f instanceof File)
      ]
      
      console.log('ProjectWizard onFormSubmit - allPendingFiles:', allPendingFiles.length)
      
      let actualProjectId = projectId
      
      // CRITICAL: For new projects, create the project first to get its ID
      // Then upload images to the project's folder instead of "temp"
      if (mode === 'create' && allPendingFiles.length > 0 && !projectId) {
        console.log('ProjectWizard onFormSubmit - Creating project first to get ID for image uploads')
        
        // Create project without images first (images will be added after upload)
        const projectDataWithoutImages = {
          ...data,
          ...latestData,
          images: [], // Create without images first
          youtube_videos: latestData.youtube_videos !== undefined ? latestData.youtube_videos : (data.youtube_videos !== undefined ? data.youtube_videos : []),
          // Always include order_index and status
          order_index: latestData.order_index !== undefined ? latestData.order_index : (data.order_index !== undefined ? data.order_index : 0),
          status: latestData.status || data.status || 'active',
        }
        
        // Call onSubmit to create the project and get the ID
        const createdProject = await onSubmit(projectDataWithoutImages)
        actualProjectId = createdProject?.id || createdProject?.data?.id
        
        if (!actualProjectId) {
          throw new Error('Failed to create project. Cannot upload images without project ID.')
        }
        
        console.log('ProjectWizard onFormSubmit - Project created with ID:', actualProjectId)
      }
      
      // Upload pending images to the project's folder (using actualProjectId)
      if (allPendingFiles.length > 0 && actualProjectId) {
        const supabase = createClient()
        
        console.log('ProjectWizard onFormSubmit - Uploading', allPendingFiles.length, 'files to folder:', actualProjectId)
        
        // Upload each pending file to the project's folder
        for (let i = 0; i < allPendingFiles.length; i++) {
          const file = allPendingFiles[i]
          
          if (!file || !(file instanceof File)) {
            console.warn('Invalid file object at index', i, file)
            continue
          }
          
          const fileExt = file.name.split('.').pop()
          // Use actualProjectId folder (never use "temp")
          const fileName = `${actualProjectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          
          console.log('ProjectWizard onFormSubmit - Uploading file to project folder:', fileName)
          
          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('project-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            })
          
          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw new Error(`Failed to upload image: ${uploadError.message}`)
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('project-images')
            .getPublicUrl(fileName)
          
          console.log('ProjectWizard onFormSubmit - Uploaded image URL:', publicUrl)
          
          // Find images without URLs (pending uploads) and update them
          const pendingImageIndex = currentImages.findIndex(img => !img.url || img.url === '' || img.url.startsWith('blob:'))
          if (pendingImageIndex >= 0) {
            // Update existing image with URL, remove preview/file properties
            const updatedImage = { ...currentImages[pendingImageIndex] }
            updatedImage.url = publicUrl
            // Remove preview and file properties if they exist
            delete (updatedImage as any).preview
            delete (updatedImage as any).file
            currentImages[pendingImageIndex] = updatedImage
          } else {
            // If no pending image found, add as new
            const orderIndex = currentImages.length
            currentImages.push({
              url: publicUrl,
              is_primary: currentImages.length === 0,
              order_index: orderIndex,
            })
          }
        }
        
        // Update form with uploaded URLs
        methods.setValue('images', currentImages)
        latestData.images = currentImages
        
        // Clear pending files after upload
        methods.setValue('_pendingImageFiles' as any, [], { shouldValidate: false, shouldDirty: false, shouldTouch: false })
        
        console.log('ProjectWizard onFormSubmit - currentImages after upload:', currentImages.length)
        
        // If we created the project first, now update it with the image URLs
        if (mode === 'create' && actualProjectId && !projectId) {
          console.log('ProjectWizard onFormSubmit - Updating project with image URLs, projectId:', actualProjectId)
          const formDataWithImages: WizardForm = {
            ...data,
            ...latestData,
            images: currentImages,
            youtube_videos: latestData.youtube_videos !== undefined ? latestData.youtube_videos : (data.youtube_videos !== undefined ? data.youtube_videos : []),
            // Always include order_index and status
            order_index: latestData.order_index !== undefined ? latestData.order_index : (data.order_index !== undefined ? data.order_index : 0),
            status: latestData.status || data.status || 'active',
          }
          
          // Update the project with images - pass the projectId so parent knows to update, not create
          await onSubmit(formDataWithImages, actualProjectId)
          return // Don't call onSubmit again
        }
      }
      
      // For update mode or if no pending files, pass raw form data to parent
      const formData: WizardForm = {
        ...data,
        ...latestData,
        images: latestData.images !== undefined ? latestData.images : (data.images !== undefined ? data.images : []),
        youtube_videos: latestData.youtube_videos !== undefined ? latestData.youtube_videos : (data.youtube_videos !== undefined ? data.youtube_videos : []),
        // Always include order_index and status from form data
        order_index: latestData.order_index !== undefined ? latestData.order_index : (data.order_index !== undefined ? data.order_index : 0),
        status: latestData.status || data.status || 'active',
      }
      
      console.log('ProjectWizard onSubmit - raw form data (before normalization):', formData)
      console.log('ProjectWizard onSubmit - images count:', Array.isArray(formData.images) ? formData.images.length : 'not array', formData.images)
      console.log('ProjectWizard onSubmit - youtube_videos count:', Array.isArray(formData.youtube_videos) ? formData.youtube_videos.length : 'not array', formData.youtube_videos)
      
      // Submit the form - this will trigger the mutation which sets isLoading
      // Pass projectId if we're in edit mode, or if we just created a project
      await onSubmit(formData, actualProjectId || projectId || undefined)
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      console.error('Error in onFormSubmit:', error)
      throw error
    }
  }

  const renderStepContent = () => {
    switch (stepper.currentStep) {
      case 0:
        return (
          <StepBasicInfo
            facilities={facilities}
            services={services}
            units={MOCK_UNITS}
            disabled={isLoading}
          />
        )
      case 1:
        return <StepLocation disabled={isLoading} />
      case 2:
        return <StepImages projectId={projectId || undefined} disabled={isLoading} />
      default:
        return null
    }
  }

  return (
    <FormProvider {...methods}>
      {/* Loading Overlay Modal */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 bg-background border border-border rounded-lg shadow-lg">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-semibold">
                {mode === 'edit' ? t('projects.updatingProject') : t('projects.creatingProject')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('projects.pleaseWait')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div ref={wizardRef} className="animate-in slide-in-from-top-4 fade-in-0 duration-300 ease-out">
        <Card className="border border-border/50 shadow-lg mb-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardHeader className="border-b border-border/50 bg-muted/30 px-8 py-6 z-10 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-foreground tracking-tight">
                    {mode === 'edit' ? t('projects.editProjectStep') : t('projects.createProjectStep')} - {t('projects.step')} {stepper.currentStep + 1} {t('projects.of')} {steps.length}
                  </CardTitle>
                  <p className="text-sm mt-1 text-muted-foreground font-normal">
                    {steps[stepper.currentStep]?.description}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-md transition-all duration-200 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-8 overflow-x-hidden" style={{
            scrollBehavior: 'smooth',
          }}>
            <Stepper steps={steps} currentStep={stepper.currentStep} completedSteps={stepper.completedSteps} />

            <form onSubmit={(e) => {
              e.preventDefault()
              // Only submit if we're on the last step
              if (stepper.isLastStep) {
                handleSubmit(onFormSubmit)(e)
              }
            }} className="mt-8">
              {/* Disable form content during loading */}
              <div className={isLoading ? 'pointer-events-none opacity-60 transition-opacity duration-200' : 'transition-opacity duration-200'}>
                {renderStepContent()}
              </div>

              <div className="flex justify-between gap-3 pt-6 mt-8 border-t border-border/50 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-2 -mb-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={stepper.isFirstStep ? onClose : handleBack}
                  disabled={isLoading}
                  className="min-w-[100px] transition-all duration-200 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {stepper.isFirstStep ? t('common.cancel') : t('common.back') || 'Back'}
                </Button>

                {stepper.isLastStep ? (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="min-w-[160px] transition-all duration-200 hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {mode === 'edit' ? t('projects.updatingProject') : t('projects.creatingProject')}
                      </span>
                    ) : (
                      mode === 'edit' ? t('projects.updateProject') : t('projects.createProjectButton')
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleNext(e)
                    }}
                    disabled={isLoading}
                    className="min-w-[100px] transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('projects.next')}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </FormProvider>
  )
}

