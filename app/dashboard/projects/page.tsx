'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, FolderKanban, Image as ImageIcon, Settings, Youtube } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { useToast } from '@/hooks/use-toast'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { normalizeImages, normalizeYoutube } from '@/lib/project-normalizer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectImageUpload } from '@/components/ui/project-image-upload'
import { YouTubeVideosInput } from '@/components/ui/youtube-videos-input'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { ProjectWizard } from '@/components/projects/project-wizard'

const projectImageSchema = z.object({
  url: z.string().url(),
  is_primary: z.boolean().default(false),
  order_index: z.number().int().default(0),
})

// Note: Schema validation messages will be translated in the component using t()
const projectSchema = z.object({
  title_ar: z.string().min(1),
  title_en: z.string().min(1),
  description_ar: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  images: z.array(projectImageSchema).optional().default([]),
  youtube_videos: z.array(z.string().url()).optional().default([]),
  category_id: z.string().uuid(),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type ProjectForm = z.infer<typeof projectSchema>

interface ProjectImage {
  url: string
  is_primary?: boolean
  order_index?: number
}

interface Project {
  id: string
  title_ar: string
  title_en: string
  description_ar: string | null
  description_en: string | null
  image_url: string | null // Keep for backward compatibility
  images: ProjectImage[] | null
  youtube_videos: string[] | null
  category_id: string | null
  order_index: number
  status: string
  project_type?: 'administrative' | 'commercial' | 'residential' | null
  governorate_id?: string | null
  area_id?: string | null
  address?: string | null
  location_text?: string | null
  latitude?: number | null
  longitude?: number | null
  metadata?: any | null
  created_at: string
  updated_at: string
}

async function getProjects() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_categories(title_ar, title_en), governorates(id, name_ar, name_en), areas(id, name_ar, name_en)')
    .order('order_index', { ascending: true })

  if (error) throw error
  
  // Parse JSON columns
  return (data || []).map((project: any) => {
    let images = null
    let youtube_videos = null
    let metadata = null

    if (project.images) {
      images = typeof project.images === 'string' ? JSON.parse(project.images) : project.images
    }
    if (project.youtube_videos) {
      youtube_videos = typeof project.youtube_videos === 'string' ? JSON.parse(project.youtube_videos) : project.youtube_videos
    }
    if (project.metadata) {
      metadata = typeof project.metadata === 'string' ? JSON.parse(project.metadata) : project.metadata
    }

    return {
      ...project,
      images,
      youtube_videos,
      metadata,
    }
  }) as any[]
}

async function getProjectCategories() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_categories')
    .select('id, title_ar, title_en')
    .eq('status', 'active')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

async function checkTitleExists(titleEn: string, titleAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  
  // Check if title_en already exists
  let queryEn = supabase
    .from('projects')
    .select('id')
    .eq('title_en', titleEn)
    .limit(1)
  
  if (excludeId) {
    queryEn = queryEn.neq('id', excludeId)
  }
  
  const { data: dataEn, error: errorEn } = await queryEn
  
  // Check if title_ar already exists
  let queryAr = supabase
    .from('projects')
    .select('id')
    .eq('title_ar', titleAr)
    .limit(1)
  
  if (excludeId) {
    queryAr = queryAr.neq('id', excludeId)
  }
  
  const { data: dataAr, error: errorAr } = await queryAr
  
  if (errorEn || errorAr) {
    // If there's an error, still check the results
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  
  // Return true if either title exists
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

interface CreateProjectData extends ProjectForm {
  project_type?: 'administrative' | 'commercial' | 'residential'
  facilities?: string[]
  services?: string[]
  units?: string[]
  governorate_id?: string | null
  area_id?: string | null
  address?: string | null
  location_text?: string | null
  latitude?: number | null
  longitude?: number | null
}

async function createProject(projectData: CreateProjectData) {
  // Check for duplicate titles
  const titleExists = await checkTitleExists(projectData.title_en, projectData.title_ar)
  if (titleExists) {
    // Translation will be handled in the error handler using t('projects.titleAlreadyExists')
    throw new Error('PROJECT_TITLE_EXISTS')
  }

  const supabase = createClient()
  
  // Debug: Log the data being saved
  console.log('createProject - projectData:', projectData)
  console.log('createProject - images:', projectData.images, 'type:', typeof projectData.images, 'isArray:', Array.isArray(projectData.images))
  console.log('createProject - youtube_videos:', projectData.youtube_videos, 'type:', typeof projectData.youtube_videos, 'isArray:', Array.isArray(projectData.youtube_videos))
  
  // Prepare the data object with all fields
  const insertData: any = {
    title_ar: projectData.title_ar,
    title_en: projectData.title_en,
    description_ar: projectData.description_ar || null,
    description_en: projectData.description_en || null,
  }
  
  // Normalize images and youtube_videos using single source of truth
  insertData.images = normalizeImages(projectData.images)
  insertData.youtube_videos = normalizeYoutube(projectData.youtube_videos)
  
  console.log('createProject - normalized images:', insertData.images)
  console.log('createProject - normalized youtube_videos:', insertData.youtube_videos)
  
  // Add other required fields
  insertData.category_id = projectData.category_id
  // Always include order_index and status with defaults if not provided
  insertData.order_index = projectData.order_index !== undefined ? projectData.order_index : 0
  insertData.status = projectData.status || 'active'

  // Add project_type if provided
  if (projectData.project_type) {
    insertData.project_type = projectData.project_type
  }

  // Add location fields if provided
  if (projectData.governorate_id) {
    insertData.governorate_id = projectData.governorate_id
  }
  if (projectData.area_id) {
    insertData.area_id = projectData.area_id
  }
  if (projectData.address) {
    insertData.address = projectData.address
  }
  if (projectData.location_text) {
    insertData.location_text = projectData.location_text
  }
  if (projectData.latitude !== undefined && projectData.latitude !== null) {
    insertData.latitude = projectData.latitude
  }
  if (projectData.longitude !== undefined && projectData.longitude !== null) {
    insertData.longitude = projectData.longitude
  }

  // Store facilities, services, and units as JSONB in metadata field
  const metadata: any = {}
  if (projectData.facilities && projectData.facilities.length > 0) {
    metadata.facilities = projectData.facilities
  }
  if (projectData.services && projectData.services.length > 0) {
    metadata.services = projectData.services
  }
  if (projectData.units && projectData.units.length > 0) {
    metadata.units = projectData.units
  }
  
  if (Object.keys(metadata).length > 0) {
    // Store as JSONB directly (Supabase will handle the conversion)
    insertData.metadata = metadata
  }

  console.log('createProject - insertData before insert:', JSON.stringify(insertData, null, 2))
  
  const { data, error } = await supabase
    .from('projects')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('createProject - Supabase error:', error)
    throw error
  }
  
  console.log('createProject - inserted data:', data)
  return data
}

async function updateProject(id: string, projectData: Partial<CreateProjectData>) {
  const supabase = createClient()
  
  // Check for duplicate titles if title fields are being updated
  if (projectData.title_en || projectData.title_ar) {
    // Get current project to check both titles
    const { data: currentProject } = await supabase
      .from('projects')
      .select('title_en, title_ar')
      .eq('id', id)
      .single()
    
    const titleEn = projectData.title_en ?? currentProject?.title_en ?? ''
    const titleAr = projectData.title_ar ?? currentProject?.title_ar ?? ''
    
    const titleExists = await checkTitleExists(titleEn, titleAr, id)
    if (titleExists) {
      // Translation will be handled in the error handler using t('projects.titleAlreadyExists')
      throw new Error('PROJECT_TITLE_EXISTS')
    }
  }

  // Debug: Log the data being updated
  console.log('updateProject - images:', projectData.images)
  console.log('updateProject - youtube_videos:', projectData.youtube_videos)
  
  const updateData: any = {}
  
  if (projectData.title_ar !== undefined) updateData.title_ar = projectData.title_ar
  if (projectData.title_en !== undefined) updateData.title_en = projectData.title_en
  if (projectData.description_ar !== undefined) updateData.description_ar = projectData.description_ar || null
  if (projectData.description_en !== undefined) updateData.description_en = projectData.description_en || null
  // CRITICAL: In update mode, ALWAYS set images and youtube_videos (matching createProject behavior)
  // This ensures removed images/videos are properly deleted from the database
  // Empty array = delete all, undefined = normalize to empty array (same as create)
  // Always normalize and set both fields to ensure they're saved to database
  updateData.images = normalizeImages(projectData.images)
  updateData.youtube_videos = normalizeYoutube(projectData.youtube_videos)
  
  console.log('updateProject - images input:', projectData.images)
  console.log('updateProject - normalized images:', updateData.images)
  console.log('updateProject - images count:', updateData.images.length)
  console.log('updateProject - Will save images to database:', updateData.images)
  
  console.log('updateProject - youtube_videos input:', projectData.youtube_videos)
  console.log('updateProject - normalized youtube_videos:', updateData.youtube_videos)
  console.log('updateProject - youtube_videos count:', updateData.youtube_videos.length)
  console.log('updateProject - Will save youtube_videos to database:', updateData.youtube_videos)
  if (projectData.category_id !== undefined) updateData.category_id = projectData.category_id
  // Always include order_index and status if provided (for updates)
  if (projectData.order_index !== undefined) {
    updateData.order_index = projectData.order_index
  }
  if (projectData.status !== undefined) {
    updateData.status = projectData.status
  }

  // Add project_type if provided
  if (projectData.project_type !== undefined) {
    updateData.project_type = projectData.project_type
  }

  // Add location fields if provided
  if (projectData.governorate_id !== undefined) {
    updateData.governorate_id = projectData.governorate_id
  }
  if (projectData.area_id !== undefined) {
    updateData.area_id = projectData.area_id
  }
  if (projectData.address !== undefined) {
    updateData.address = projectData.address
  }
  if (projectData.location_text !== undefined) {
    updateData.location_text = projectData.location_text
  }
  if (projectData.latitude !== undefined) {
    updateData.latitude = projectData.latitude
  }
  if (projectData.longitude !== undefined) {
    updateData.longitude = projectData.longitude
  }

  // Store facilities, services, and units as JSONB in metadata field
  const metadata: any = {}
  if (projectData.facilities !== undefined) {
    if (projectData.facilities && projectData.facilities.length > 0) {
      metadata.facilities = projectData.facilities
    }
  }
  if (projectData.services !== undefined) {
    if (projectData.services && projectData.services.length > 0) {
      metadata.services = projectData.services
    }
  }
  if (projectData.units !== undefined) {
    if (projectData.units && projectData.units.length > 0) {
      metadata.units = projectData.units
    }
  }
  
  if (Object.keys(metadata).length > 0 || (projectData.facilities !== undefined || projectData.services !== undefined || projectData.units !== undefined)) {
    updateData.metadata = metadata
  }

  // CRITICAL: Ensure images and youtube_videos are always arrays (even if empty) for JSONB
  // Supabase JSONB columns expect arrays, not null or undefined
  if (!Array.isArray(updateData.images)) {
    console.warn('updateProject - images is not an array, converting:', updateData.images)
    updateData.images = []
  }
  if (!Array.isArray(updateData.youtube_videos)) {
    console.warn('updateProject - youtube_videos is not an array, converting:', updateData.youtube_videos)
    updateData.youtube_videos = []
  }
  
  // Log the final updateData before sending to Supabase
  console.log('updateProject - Final updateData before Supabase update:', JSON.stringify(updateData, null, 2))
  console.log('updateProject - updateData keys:', Object.keys(updateData))
  console.log('updateProject - images in updateData:', updateData.images)
  console.log('updateProject - images type:', typeof updateData.images, 'isArray:', Array.isArray(updateData.images))
  console.log('updateProject - images JSON:', JSON.stringify(updateData.images))
  console.log('updateProject - youtube_videos in updateData:', updateData.youtube_videos)
  console.log('updateProject - youtube_videos type:', typeof updateData.youtube_videos, 'isArray:', Array.isArray(updateData.youtube_videos))
  console.log('updateProject - youtube_videos JSON:', JSON.stringify(updateData.youtube_videos))
  
  // CRITICAL: Verify images and youtube_videos are in updateData
  if (!('images' in updateData)) {
    console.error('updateProject - ERROR: images is missing from updateData!')
    updateData.images = [] // Fallback to empty array
  }
  if (!('youtube_videos' in updateData)) {
    console.error('updateProject - ERROR: youtube_videos is missing from updateData!')
    updateData.youtube_videos = [] // Fallback to empty array
  }
  
  console.log('updateProject - About to update Supabase with:', {
    id,
    imagesCount: updateData.images.length,
    videosCount: updateData.youtube_videos.length,
    allKeys: Object.keys(updateData)
  })
  
  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateProject - Supabase error:', error)
    console.error('updateProject - Supabase error details:', JSON.stringify(error, null, 2))
    throw error
  }
  
  console.log('updateProject - Updated project data from Supabase:', data)
  console.log('updateProject - Updated images from database:', data?.images)
  console.log('updateProject - Updated youtube_videos from database:', data?.youtube_videos)
  
  // Verify the update was successful
  if (data) {
    const savedImages = Array.isArray(data.images) ? data.images : []
    const savedVideos = Array.isArray(data.youtube_videos) ? data.youtube_videos : []
    console.log('updateProject - Verification: Saved images count:', savedImages.length)
    console.log('updateProject - Verification: Saved videos count:', savedVideos.length)
    console.log('updateProject - Verification: Expected images count:', updateData.images.length)
    console.log('updateProject - Verification: Expected videos count:', updateData.youtube_videos.length)
    
    if (savedImages.length !== updateData.images.length) {
      console.warn('updateProject - WARNING: Image count mismatch! Expected:', updateData.images.length, 'Got:', savedImages.length)
    }
    if (savedVideos.length !== updateData.youtube_videos.length) {
      console.warn('updateProject - WARNING: Video count mismatch! Expected:', updateData.youtube_videos.length, 'Got:', savedVideos.length)
    }
  }
  
  return data
}

async function deleteProject(id: string) {
  const supabase = createClient()
  
  // First, get the project to check for images
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id, images')
    .eq('id', id)
    .single()
  
  if (fetchError) {
    console.error('deleteProject - Error fetching project:', fetchError)
    throw fetchError
  }
  
  // Delete all images from storage bucket
  // Images are stored in folder: {projectId}/
  if (project) {
    try {
      // List all files in the project's folder
      const { data: files, error: listError } = await supabase.storage
        .from('project-images')
        .list(id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        })
      
      if (listError) {
        console.warn('deleteProject - Error listing files in storage:', listError)
        // Continue with deletion even if listing fails (folder might not exist)
      } else if (files && files.length > 0) {
        // Delete all files in the folder
        const filePaths = files.map(file => `${id}/${file.name}`)
        console.log('deleteProject - Deleting files from storage:', filePaths)
        
        const { error: deleteStorageError } = await supabase.storage
          .from('project-images')
          .remove(filePaths)
        
        if (deleteStorageError) {
          console.error('deleteProject - Error deleting files from storage:', deleteStorageError)
          // Continue with project deletion even if storage deletion fails
          // (project might have been created without images, or storage might be empty)
        } else {
          console.log('deleteProject - Successfully deleted', filePaths.length, 'files from storage')
        }
      } else {
        console.log('deleteProject - No files found in storage folder for project:', id)
      }
    } catch (storageError) {
      console.error('deleteProject - Error during storage cleanup:', storageError)
      // Continue with project deletion even if storage cleanup fails
    }
  }
  
  // Delete the project from database
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteProject - Error deleting project from database:', error)
    throw error
  }
  
  console.log('deleteProject - Successfully deleted project:', id)
}

async function updateProjectOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('projects')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function ProjectsPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const expandedRowRef = useRef<HTMLDivElement>(null)
  const wizardRef = useRef<HTMLDivElement>(null)
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([])
  const [youtubeVideos, setYoutubeVideos] = useState<string[]>([])

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('projects')

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    enabled: canView, // Only fetch if user has view permission
    staleTime: 30000, // Cache for 30 seconds - balance between freshness and performance
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['project-categories-for-select'],
    queryFn: getProjectCategories,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes - categories don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (data) => {
      // Close the wizard/expander form
      setShowWizard(false)
      setExpandedRowId(null)
      setIsCreating(false)
      setEditingProject(null)
      
      // Clear the form
      reset()
      
      // Refresh the table
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      
      // Log activity
      if (data?.id) {
        const projectName = data.title_en || data.title_ar || t('projects.untitledProject')
        await ActivityLogger.create('project', data.id, `Project: ${projectName}`)
      }
      
      const projectName = data.title_en || data.title_ar || t('projects.untitledProject')
      const message = t('projects.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', projectName) : `Project "${projectName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      const errorMessage = error.message === 'PROJECT_TITLE_EXISTS' 
        ? t('projects.titleAlreadyExists') 
        : (error.message || t('projects.createError') || 'Failed to create project. Please try again.')
      toast({
        title: t('common.error') || 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProjectData> }) =>
      updateProject(id, data),
    onSuccess: async (data) => {
      const previousProject = editingProject || projects?.find(p => p.id === expandedRowId)
      
      // CRITICAL: Invalidate and refetch to ensure fresh data (no cache)
      // Remove from cache and refetch immediately to get latest data from database
      queryClient.removeQueries({ queryKey: ['projects'] })
      await queryClient.refetchQueries({ 
        queryKey: ['projects'],
        type: 'active' // Only refetch active queries
      })
      
      setExpandedRowId(null)
      setIsCreating(false)
      setShowWizard(false)
      setEditingProject(null)
      reset()
      
      // Log activity
      if (previousProject && data?.id) {
        const projectName = data.title_en || data.title_ar || t('projects.untitledProject')
        await ActivityLogger.update(
          'project',
          data.id,
          `Project: ${projectName}`,
          previousProject,
          data
        )
      }
      const projectName = data.title_en || data.title_ar || t('projects.untitledProject')
      const message = t('projects.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', projectName) : `Project "${projectName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      const errorMessage = error.message === 'PROJECT_TITLE_EXISTS' 
        ? t('projects.titleAlreadyExists') 
        : (error.message || t('projects.updateError') || 'Failed to update project. Please try again.')
      toast({
        title: t('common.error') || 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      const deletedProject = projectToDelete
      const deletedName = deletedProject?.title_en || deletedProject?.title_ar || t('projects.untitledProject')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      // Log activity
      if (deletedProject) {
        await ActivityLogger.delete('project', deletedProject.id, `Project: ${deletedName}`)
      }
      const message = t('projects.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Project "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('projects.deleteError') || 'Failed to delete project. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateProjectOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      order_index: 0,
      status: 'active',
      images: [],
      youtube_videos: [],
    },
  })

  // Watch category_id and status for controlled Select components
  const selectedCategoryId = watch('category_id')
  const selectedStatus = watch('status')

  const onSubmit = async (data: ProjectForm): Promise<any> => {
    // Normalize images to ensure all required fields are present
    const normalizedImages = projectImages.map((img, index) => ({
      url: img.url,
      is_primary: img.is_primary ?? (index === 0),
      order_index: img.order_index ?? index,
    }))
    
    const submitData = {
      ...data,
      images: normalizedImages,
      youtube_videos: youtubeVideos,
    }
    
    if (expandedRowId) {
      // For updates, use mutateAsync to return the result
      return await updateMutation.mutateAsync({ id: expandedRowId, data: submitData })
    } else {
      // For creates, use mutateAsync to return the created project
      // Set order_index to max + 1 if not editing
      const maxOrder = projects?.length ? Math.max(...projects.map(p => p.order_index)) : -1
      return await createMutation.mutateAsync({ ...submitData, order_index: maxOrder + 1 })
    }
  }

  const handleToggleExpand = useCallback(async (project: Project | null, scrollTo = false) => {
    // If project is null and form is expanded, collapse it
    if (project === null && (expandedRowId || isCreating)) {
      setExpandedRowId(null)
      setIsCreating(false)
      reset()
      setProjectImages([])
      setYoutubeVideos([])
      return
    }
    
    if (project && expandedRowId === project.id) {
      // Collapse if already expanded
      setExpandedRowId(null)
      setIsCreating(false)
      reset()
      setProjectImages([])
      setYoutubeVideos([])
    } else if (project) {
      // Expand for editing - reset form first to clear previous values
      reset({
        title_ar: '',
        title_en: '',
        description_ar: '',
        description_en: '',
        images: [],
        youtube_videos: [],
        category_id: undefined,
        order_index: 0,
        status: 'active',
      })
      
      // Load images from JSON
      let images: ProjectImage[] = []
      if (project.images) {
        try {
          const parsedImages = typeof project.images === 'string' ? JSON.parse(project.images) : project.images
          // Normalize images to ensure all required fields are present
          images = Array.isArray(parsedImages) ? parsedImages.map((img: any, index: number) => ({
            url: img.url,
            is_primary: img.is_primary ?? (index === 0),
            order_index: img.order_index ?? index,
          })) : []
        } catch (e) {
          console.error('Error parsing images:', e)
          images = []
        }
      }
      setProjectImages(images)
      
      // Load YouTube videos from JSON
      let videos: string[] = []
      if (project.youtube_videos) {
        try {
          videos = typeof project.youtube_videos === 'string' ? JSON.parse(project.youtube_videos) : project.youtube_videos
        } catch (e) {
          console.error('Error parsing youtube_videos:', e)
          videos = []
        }
      }
      setYoutubeVideos(videos)
      
      // Normalize images for form (ensure all required fields)
      const normalizedImages = images.map((img, index) => ({
        url: img.url,
        is_primary: Boolean(img.is_primary ?? (index === 0)),
        order_index: Number(img.order_index ?? index),
      }))
      
      // Set new values after reset
      setValue('title_ar', project.title_ar)
      setValue('title_en', project.title_en)
      setValue('description_ar', project.description_ar || '')
      setValue('description_en', project.description_en || '')
      setValue('images', normalizedImages)
      setValue('youtube_videos', videos)
      if (project.category_id) {
        setValue('category_id', project.category_id)
      }
      setValue('order_index', project.order_index)
      setValue('status', project.status as any)
      refetchCategories() // Refresh categories list
      setExpandedRowId(project.id)
      setIsCreating(false)
      
      if (scrollTo && expandedRowRef.current) {
        setTimeout(() => {
          expandedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    } else {
      // Expand for creating new project
      reset({
        order_index: 0,
        status: 'active',
        images: [],
        youtube_videos: [],
      })
      setProjectImages([])
      setYoutubeVideos([])
      setExpandedRowId(null)
      setIsCreating(true)
      refetchCategories() // Refresh categories list
      
      if (scrollTo && expandedRowRef.current) {
        setTimeout(() => {
          expandedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [expandedRowId, isCreating, reset, setValue, refetchCategories])

  const handleEdit = (project: any) => {
    setEditingProject(project)
    setShowWizard(true)
    // Scroll to top of page and then to wizard
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Also scroll to wizard after a short delay to ensure it's rendered
      setTimeout(() => {
        if (wizardRef.current) {
          wizardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 200)
    }, 100)
  }

  const handleDelete = (project: Project) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete.id)
    }
  }

  const handleMoveUp = (project: any) => {
    if (project.order_index > 0) {
      const prevProject = projects?.find(p => p.order_index === project.order_index - 1)
      if (prevProject) {
        orderMutation.mutate({ id: project.id, newOrder: project.order_index - 1 })
        orderMutation.mutate({ id: prevProject.id, newOrder: prevProject.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (project: any) => {
    const maxOrder = projects?.length ? Math.max(...projects.map(p => p.order_index)) : 0
    if (project.order_index < maxOrder) {
      const nextProject = projects?.find(p => p.order_index === project.order_index + 1)
      if (nextProject) {
        orderMutation.mutate({ id: project.id, newOrder: project.order_index + 1 })
        orderMutation.mutate({ id: nextProject.id, newOrder: nextProject.order_index - 1 })
      }
    }
  }

  if (isLoading || isCheckingPermissions) {
    return <PageSkeleton showHeader showActions={canCreate} showTable tableRows={8} />
  }
  
  // If user doesn't have view permission, show error message
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('common.error') || 'Access Denied'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('projects.noPermission') || 'You do not have permission to view projects.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'order_index',
      header: t('projects.order') || 'Order',
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.order_index}</span>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => handleMoveUp(row)}
              disabled={orderMutation.isPending || row.order_index === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => handleMoveDown(row)}
              disabled={orderMutation.isPending || row.order_index === (projects?.length ? Math.max(...projects.map(p => p.order_index)) : 0)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'images',
      header: t('projects.images') || 'Images',
      render: (value: any, row: any) => {
        const images = row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : []
        const imageCount = Array.isArray(images) ? images.length : 0
        if (imageCount === 0) return '-'
        
        const primaryImage = images.find((img: any) => img.is_primary) || images[0]
        return (
          <div className="flex items-center gap-2">
            {primaryImage?.url && (
              <img
                src={primaryImage.url}
                alt="Project"
                className="w-20 h-12 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100?text=No+Image'
                }}
              />
            )}
            {imageCount > 1 && (
              <span className="text-xs text-muted-foreground">+{imageCount - 1}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'title_ar',
      header: t('projects.titleAr') || 'Title (AR)',
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.title_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('projects.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('projects.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Expandable Wizard Form Section - At the Top */}
      {showWizard && (
        <div ref={wizardRef} className="mb-6">
          <ProjectWizard
            onClose={() => {
              setShowWizard(false)
              setEditingProject(null)
            }}
            onSubmit={async (data, providedProjectId?: string) => {
              // Pass raw form data to mutations - normalization happens in createProject/updateProject
              // CRITICAL: Always include images and youtube_videos explicitly, even if empty arrays
              // This ensures removed images/videos are properly deleted from the database
              const submitData = {
                ...data,
                // Always include images - use empty array if undefined to ensure removal works
                images: Array.isArray(data.images) ? data.images : (data.images !== undefined ? [data.images] : []),
                // Always include youtube_videos - use empty array if undefined to ensure removal works
                youtube_videos: Array.isArray(data.youtube_videos) ? data.youtube_videos : (data.youtube_videos !== undefined ? [data.youtube_videos] : []),
              }
              
              console.log('ProjectsPage onSubmit - raw form data:', submitData)
              console.log('ProjectsPage onSubmit - providedProjectId:', providedProjectId)
              console.log('ProjectsPage onSubmit - editingProject?.id:', editingProject?.id)
              console.log('ProjectsPage onSubmit - images:', submitData.images)
              console.log('ProjectsPage onSubmit - images count:', Array.isArray(submitData.images) ? submitData.images.length : 'not array')
              console.log('ProjectsPage onSubmit - youtube_videos:', submitData.youtube_videos)
              console.log('ProjectsPage onSubmit - youtube_videos count:', Array.isArray(submitData.youtube_videos) ? submitData.youtube_videos.length : 'not array')
              
              // Determine if we're updating or creating
              // Priority: providedProjectId (from wizard) > editingProject?.id > createMutation.data?.id
              const projectIdToUpdate = providedProjectId || editingProject?.id || createMutation.data?.id
              
              if (projectIdToUpdate) {
                // Update existing project - pass raw data, normalization happens in updateProject
                // CRITICAL: Explicitly include images and youtube_videos to ensure they're updated
                // Empty arrays mean "delete all", so we must always include them
                const projectToUpdate = editingProject || createMutation.data
                const updateData: any = {
                  ...submitData,
                  category_id: projectToUpdate?.category_id || categories?.[0]?.id || '',
                  // CRITICAL: Always include images (even if empty array = delete all)
                  images: submitData.images,
                  // CRITICAL: Always include youtube_videos (even if empty array = delete all)
                  youtube_videos: submitData.youtube_videos,
                  // Always include order_index and status if provided
                  order_index: submitData.order_index !== undefined ? submitData.order_index : projectToUpdate?.order_index,
                  status: submitData.status || projectToUpdate?.status || 'active',
                }
                
                // Remove internal fields
                delete updateData._projectId
                
                console.log('ProjectsPage onSubmit - UPDATE MODE - projectId:', projectIdToUpdate)
                console.log('ProjectsPage onSubmit - updateData (before normalization):', updateData)
                console.log('ProjectsPage onSubmit - updateData.images:', updateData.images, 'type:', typeof updateData.images, 'isArray:', Array.isArray(updateData.images))
                console.log('ProjectsPage onSubmit - updateData.youtube_videos:', updateData.youtube_videos, 'type:', typeof updateData.youtube_videos, 'isArray:', Array.isArray(updateData.youtube_videos))
                
                // Return the updated project data
                return await updateMutation.mutateAsync({ id: projectIdToUpdate, data: updateData })
              } else {
                // Create new project
                const maxOrder = projects?.length ? Math.max(...projects.map(p => p.order_index)) : -1
                const firstCategory = categories?.[0]?.id || ''
                
                const createData = {
                  ...submitData,
                  category_id: firstCategory,
                  // Always include order_index and status with defaults
                  order_index: submitData.order_index !== undefined ? submitData.order_index : maxOrder + 1,
                  status: submitData.status || 'active',
                }
                
                // Remove internal fields
                delete (createData as any)._projectId
                
                console.log('ProjectsPage onSubmit - CREATE MODE')
                
                // Return the created project data (so wizard can get the ID for image uploads)
                return await createMutation.mutateAsync(createData as any)
              }
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
            projectId={editingProject?.id || null}
            mode={editingProject ? 'edit' : 'create'}
            initialData={editingProject ? {
              title_ar: editingProject.title_ar,
              title_en: editingProject.title_en,
              description_ar: editingProject.description_ar || null,
              description_en: editingProject.description_en || null,
              project_type: editingProject.project_type || undefined,
              facilities: editingProject.metadata?.facilities || [],
              services: editingProject.metadata?.services || [],
              units: editingProject.metadata?.units || [],
              governorate_id: editingProject.governorate_id || null,
              area_id: editingProject.area_id || null,
              address: editingProject.address || null,
              location_text: editingProject.location_text || null,
              latitude: editingProject.latitude || null,
              longitude: editingProject.longitude || null,
              images: (editingProject.images || []).map((img, idx) => ({
                url: img.url,
                is_primary: img.is_primary ?? (idx === 0),
                order_index: img.order_index ?? idx,
              })),
              youtube_videos: Array.isArray(editingProject.youtube_videos) 
                ? editingProject.youtube_videos 
                : (editingProject.youtube_videos ? [editingProject.youtube_videos] : []),
              // Always include order_index and status
              order_index: editingProject.order_index ?? 0,
              status: (editingProject.status as 'active' | 'inactive') || 'active',
            } : undefined}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('projects.title') || 'Projects'}</h1>
          <p className="text-muted-foreground">{t('projects.manageProjects')}</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setShowWizard(true)
            // Scroll to top of page
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }, 100)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('projects.createProject') || 'Create Project'}
          </Button>
        )}
      </div>

      {/* Expandable Form Section - At the Top */}
      {(expandedRowId || isCreating) && (
        <div 
          ref={expandedRowRef}
          className="animate-in slide-in-from-top-4 fade-in-0 duration-300 ease-out"
        >
          <Card className="border border-border/50 shadow-lg mb-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardHeader className="border-b border-border/50 bg-muted/30 px-8 py-6   z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground tracking-tight">
                      {expandedRowId ? t('projects.editProject') : t('projects.createProject')}
                    </CardTitle>
                    <p className="text-sm mt-1 text-muted-foreground font-normal">
                      {expandedRowId ? t('projects.updateProjectInfo') : t('projects.createNewProject')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleExpand(null)}
                  className="h-8 w-8 rounded-md transition-all duration-200 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 overflow-x-hidden" style={{
              scrollBehavior: 'smooth',
            }}>
              <form
                onSubmit={handleSubmit(
                  (data) => onSubmit(data),
                  (errors) => {
                    // Scroll to first error field
                    const firstErrorField = Object.keys(errors)[0]
                    if (firstErrorField) {
                      setTimeout(() => {
                        const element = document.getElementById(firstErrorField)
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          element.focus()
                        }
                      }, 100)
                    }
                  }
                )}
                className="space-y-6"
              >
                {/* Basic Information */}
                <Card className="border border-border/50 bg-card shadow-sm">
                  <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      {t('projects.basicInformation')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <Label htmlFor="title_ar" className="text-sm font-medium text-foreground">
                          {t('projects.titleAr') || 'Title (Arabic)'} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="title_ar"
                          {...register('title_ar')}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="transition-all duration-200"
                        />
                        {errors.title_ar && (
                          <p className="text-sm text-destructive font-normal">{t('projects.arabicTitleRequired')}</p>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="title_en" className="text-sm font-medium text-foreground">
                          {t('projects.titleEn') || 'Title (English)'} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="title_en"
                          {...register('title_en')}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="transition-all duration-200"
                        />
                        {errors.title_en && (
                          <p className="text-sm text-destructive font-normal">{t('projects.englishTitleRequired')}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <Label htmlFor="description_ar" className="text-sm font-medium text-foreground">{t('projects.descriptionAr') || 'Description (Arabic)'}</Label>
                        <textarea
                          id="description_ar"
                          {...register('description_ar')}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                          disabled={createMutation.isPending || updateMutation.isPending}
                        />
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="description_en" className="text-sm font-medium text-foreground">{t('projects.descriptionEn') || 'Description (English)'}</Label>
                        <textarea
                          id="description_en"
                          {...register('description_en')}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                          disabled={createMutation.isPending || updateMutation.isPending}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Images Upload */}
                <Card className="border border-border/50 bg-card shadow-sm">
                  <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      {t('projects.projectImages')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ProjectImageUpload
                      projectId={expandedRowId}
                      images={projectImages}
                      onImagesChange={setProjectImages}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      bucketName="project-images"
                    />
                  </CardContent>
                </Card>

                {/* YouTube Videos */}
                <Card className="border border-border/50 bg-card shadow-sm">
                  <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                      <Youtube className="h-4 w-4 text-muted-foreground" />
                      {t('projects.youtubeVideos')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <YouTubeVideosInput
                      videos={youtubeVideos}
                      onChange={setYoutubeVideos}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </CardContent>
                </Card>

                {/* Category & Settings */}
                <Card className="border border-border/50 bg-card shadow-sm">
                  <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      {t('projects.categorySettings')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <Label htmlFor="category_id" className="text-sm font-medium text-foreground">{t('projects.category') || 'Category'} *</Label>
                        <Select
                          onValueChange={(value) => setValue('category_id', value, { shouldValidate: true })}
                          value={selectedCategoryId || ''}
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('projects.selectCategory')} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.title_ar} ({category.title_en})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.category_id && (
                          <p className="text-sm text-destructive font-normal">{t('projects.categoryRequired')}</p>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="order_index" className="text-sm font-medium text-foreground">{t('projects.orderIndex')}</Label>
                        <Input
                          id="order_index"
                          type="number"
                          {...register('order_index', { valueAsNumber: true })}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="transition-all duration-200"
                        />
                        {errors.order_index && (
                          <p className="text-sm text-destructive font-normal">{errors.order_index.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="status" className="text-sm font-medium text-foreground">{t('projects.status') || 'Status'}</Label>
                      <Select
                        onValueChange={(value) => setValue('status', value as any)}
                        value={selectedStatus || 'active'}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t('common.active') || 'Active'}</SelectItem>
                          <SelectItem value="inactive">{t('common.inactive') || 'Inactive'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-6 border-t border-border/50 mt-8 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-2 -mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleToggleExpand(null)}
                    className="min-w-[100px] transition-all duration-200 hover:bg-muted"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="min-w-[100px] transition-all duration-200 hover:opacity-90"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          {t('common.loading')}
                        </span>
                      )
                      : t('common.save')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('projects.title') || 'Projects'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={projects}
            columns={columns}
            isLoading={isLoading}
            searchKey={['title_ar', 'title_en', 'description_ar', 'description_en', 'status', 'project_categories.title_ar', 'project_categories.title_en']}
            searchPlaceholder={t('common.search')}
            actions={(project) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(project)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(project)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projects.confirmDeleteMessage').replace('{name}', projectToDelete?.title_en || projectToDelete?.title_ar || t('projects.untitledProject'))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.loading') || 'Deleting...' : t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

