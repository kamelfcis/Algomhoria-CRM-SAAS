'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { useToast } from '@/hooks/use-toast'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { ImageUpload } from '@/components/ui/image-upload'
import { PageSkeleton } from '@/components/ui/page-skeleton'

const projectSchema = z.object({
  title_ar: z.string().min(1, 'Arabic title is required'),
  title_en: z.string().min(1, 'English title is required'),
  description_ar: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type ProjectForm = z.infer<typeof projectSchema>

interface Project {
  id: string
  title_ar: string
  title_en: string
  description_ar: string | null
  description_en: string | null
  image_url: string | null
  category_id: string | null
  order_index: number
  status: string
  created_at: string
  updated_at: string
}

async function getProjects() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_categories(title_ar, title_en)')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data as any[]
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

async function createProject(projectData: ProjectForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...projectData,
      description_ar: projectData.description_ar || null,
      description_en: projectData.description_en || null,
      image_url: projectData.image_url || null,
      category_id: projectData.category_id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateProject(id: string, projectData: Partial<ProjectForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...projectData,
      description_ar: projectData.description_ar || null,
      description_en: projectData.description_en || null,
      image_url: projectData.image_url || null,
      category_id: projectData.category_id || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteProject(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('projects')

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    enabled: canView, // Only fetch if user has view permission
  })

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['project-categories-for-select'],
    queryFn: getProjectCategories,
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsDialogOpen(false)
      reset()
      // Log activity
      if (data?.id) {
        const projectName = data.title_en || data.title_ar || 'Untitled Project'
        await ActivityLogger.create('project', data.id, `Project: ${projectName}`)
      }
      const projectName = data.title_en || data.title_ar || 'Untitled Project'
      const message = t('projects.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', projectName) : `Project "${projectName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('projects.createError') || 'Failed to create project. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectForm> }) =>
      updateProject(id, data),
    onSuccess: async (data) => {
      const previousProject = editingProject
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsDialogOpen(false)
      setEditingProject(null)
      reset()
      // Log activity
      if (previousProject && data?.id) {
        const projectName = data.title_en || data.title_ar || 'Untitled Project'
        await ActivityLogger.update(
          'project',
          data.id,
          `Project: ${projectName}`,
          previousProject,
          data
        )
      }
      const projectName = data.title_en || data.title_ar || 'Untitled Project'
      const message = t('projects.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', projectName) : `Project "${projectName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('projects.updateError') || 'Failed to update project. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      const deletedProject = projectToDelete
      const deletedName = deletedProject?.title_en || deletedProject?.title_ar || 'Untitled Project'
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
    },
  })

  // Watch category_id and status for controlled Select components
  const selectedCategoryId = watch('category_id')
  const selectedStatus = watch('status')

  const onSubmit = (data: ProjectForm) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data })
    } else {
      // Set order_index to max + 1 if not editing
      const maxOrder = projects?.length ? Math.max(...projects.map(p => p.order_index)) : -1
      createMutation.mutate({ ...data, order_index: maxOrder + 1 })
    }
  }

  const handleEdit = (project: any) => {
    setEditingProject(project)
    setValue('title_ar', project.title_ar)
    setValue('title_en', project.title_en)
    setValue('description_ar', project.description_ar || '')
    setValue('description_en', project.description_en || '')
    setValue('image_url', project.image_url || '')
    setValue('category_id', project.category_id || undefined)
    setValue('order_index', project.order_index)
    setValue('status', project.status as any)
    refetchCategories() // Refresh categories list
    setIsDialogOpen(true)
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
      key: 'image_url',
      header: t('projects.image') || 'Image',
      render: (value: string | null) => (
        value ? (
          <img
            src={value}
            alt="Project"
            className="w-20 h-12 object-cover rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100?text=No+Image'
            }}
          />
        ) : '-'
      ),
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
      key: 'category_id',
      header: t('projects.category') || 'Category',
      render: (_: any, row: any) => {
        const category = row.project_categories
        return category ? (
          <div>
            <div className="font-medium">{category.title_ar}</div>
            <div className="text-sm text-muted-foreground">{category.title_en}</div>
          </div>
        ) : '-'
      },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('projects.title') || 'Projects'}</h1>
          <p className="text-muted-foreground">Manage projects and portfolios</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingProject(null)
            reset()
            refetchCategories() // Refresh categories list
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('projects.createProject') || 'Create Project'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('projects.title') || 'Projects'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={projects}
            columns={columns}
            isLoading={isLoading}
            searchKey="title_ar"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? t('projects.editProject') : t('projects.createProject')}
            </DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update project information' : 'Create a new project'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_ar">{t('projects.titleAr') || 'Title (Arabic)'}</Label>
                <Input
                  id="title_ar"
                  {...register('title_ar')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.title_ar && (
                  <p className="text-sm text-destructive">{errors.title_ar.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title_en">{t('projects.titleEn') || 'Title (English)'}</Label>
                <Input
                  id="title_en"
                  {...register('title_en')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.title_en && (
                  <p className="text-sm text-destructive">{errors.title_en.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description_ar">{t('projects.descriptionAr') || 'Description (Arabic)'}</Label>
                <textarea
                  id="description_ar"
                  {...register('description_ar')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_en">{t('projects.descriptionEn') || 'Description (English)'}</Label>
                <textarea
                  id="description_en"
                  {...register('description_en')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <ImageUpload
              value={watch('image_url') || undefined}
              onChange={(url) => setValue('image_url', url || '')}
              bucket="site-assets"
              maxSize={5}
              disabled={createMutation.isPending || updateMutation.isPending}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_id">{t('projects.category') || 'Category'}</Label>
                <Select
                  onValueChange={(value) => setValue('category_id', value === 'none' ? undefined : value)}
                  value={selectedCategoryId || 'none'}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('projects.noCategory') || 'No Category'}</SelectItem>
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.title_ar} ({category.title_en})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">{t('projects.order') || 'Order Index'}</Label>
                <Input
                  id="order_index"
                  type="number"
                  {...register('order_index', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.order_index && (
                  <p className="text-sm text-destructive">{errors.order_index.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('projects.status') || 'Status'}</Label>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingProject(null)
                  reset()
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.loading')
                  : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projects.deleteProject') || `Are you sure you want to delete project "${projectToDelete?.title_en || projectToDelete?.title_ar || 'Untitled Project'}"? This action cannot be undone.`}
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

