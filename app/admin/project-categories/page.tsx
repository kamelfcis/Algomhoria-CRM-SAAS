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

const projectCategorySchema = z.object({
  title_ar: z.string().min(1, 'Arabic title is required'),
  title_en: z.string().min(1, 'English title is required'),
  image_url: z.string().optional().nullable(),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type ProjectCategoryForm = z.infer<typeof projectCategorySchema>

interface ProjectCategory {
  id: string
  title_ar: string
  title_en: string
  image_url: string | null
  order_index: number
  status: string
  created_at: string
  updated_at: string
}

async function getProjectCategories() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_categories')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data as ProjectCategory[]
}

async function createProjectCategory(categoryData: ProjectCategoryForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_categories')
    .insert({
      ...categoryData,
      image_url: categoryData.image_url || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateProjectCategory(id: string, categoryData: Partial<ProjectCategoryForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_categories')
    .update({
      ...categoryData,
      image_url: categoryData.image_url || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function checkCategoryHasProjects(categoryId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deleteProjectCategory(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateCategoryOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_categories')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function ProjectCategoriesPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProjectCategory | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<ProjectCategory | null>(null)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('project_categories')

  const { data: categories, isLoading } = useQuery({
    queryKey: ['project-categories'],
    queryFn: getProjectCategories,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createProjectCategory,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-categories'] })
      setIsDialogOpen(false)
      reset()
      // Log activity
      if (data?.id) {
        const categoryName = data.title_en || data.title_ar || 'Untitled Category'
        await ActivityLogger.create('project_category', data.id, `Project category: ${categoryName}`)
      }
      const categoryName = data.title_en || data.title_ar || 'Untitled Category'
      const message = t('projectCategories.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', categoryName) : `Project category "${categoryName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('projectCategories.createError') || 'Failed to create project category. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectCategoryForm> }) =>
      updateProjectCategory(id, data),
    onSuccess: async (data) => {
      const previousCategory = editingCategory
      queryClient.invalidateQueries({ queryKey: ['project-categories'] })
      setIsDialogOpen(false)
      setEditingCategory(null)
      reset()
      // Log activity
      if (previousCategory && data?.id) {
        const categoryName = data.title_en || data.title_ar || 'Untitled Category'
        await ActivityLogger.update(
          'project_category',
          data.id,
          `Project category: ${categoryName}`,
          previousCategory,
          data
        )
      }
      const categoryName = data.title_en || data.title_ar || 'Untitled Category'
      const message = t('projectCategories.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', categoryName) : `Project category "${categoryName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('projectCategories.updateError') || 'Failed to update project category. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProjectCategory,
    onSuccess: async () => {
      const deletedCategory = categoryToDelete
      const deletedName = deletedCategory?.title_en || deletedCategory?.title_ar || 'Untitled Category'
      queryClient.invalidateQueries({ queryKey: ['project-categories'] })
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      // Log activity
      if (deletedCategory) {
        await ActivityLogger.delete('project_category', deletedCategory.id, `Project category: ${deletedName}`)
      }
      const message = t('projectCategories.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Project category "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('projectCategories.deleteError') || 'Failed to delete project category. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateCategoryOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-categories'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProjectCategoryForm>({
    resolver: zodResolver(projectCategorySchema),
    defaultValues: {
      order_index: 0,
      status: 'active',
    },
  })

  const onSubmit = (data: ProjectCategoryForm) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data })
    } else {
      // Set order_index to max + 1 if not editing
      const maxOrder = categories?.length ? Math.max(...categories.map(c => c.order_index)) : -1
      createMutation.mutate({ ...data, order_index: maxOrder + 1 })
    }
  }

  const handleEdit = (category: ProjectCategory) => {
    setEditingCategory(category)
    setValue('title_ar', category.title_ar)
    setValue('title_en', category.title_en)
    setValue('image_url', category.image_url || '')
    setValue('order_index', category.order_index)
    setValue('status', category.status as any)
    setIsDialogOpen(true)
  }

  const handleDelete = (category: ProjectCategory) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      // Check if category has related projects
      const hasProjects = await checkCategoryHasProjects(categoryToDelete.id)
      
      if (hasProjects) {
        toast({
          title: t('common.error') || 'Error',
          description: t('projectCategories.cannotDeleteHasProjects') || 'This project category cannot be deleted because it contains one or more projects. Please remove all projects from this category or reassign them to another category before deleting.',
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setCategoryToDelete(null)
        return
      }

      // If no projects, proceed with deletion
      deleteMutation.mutate(categoryToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('projectCategories.checkError') || 'Failed to check category usage. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleMoveUp = (category: ProjectCategory) => {
    if (category.order_index > 0) {
      const prevCategory = categories?.find(c => c.order_index === category.order_index - 1)
      if (prevCategory) {
        orderMutation.mutate({ id: category.id, newOrder: category.order_index - 1 })
        orderMutation.mutate({ id: prevCategory.id, newOrder: prevCategory.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (category: ProjectCategory) => {
    const maxOrder = categories?.length ? Math.max(...categories.map(c => c.order_index)) : 0
    if (category.order_index < maxOrder) {
      const nextCategory = categories?.find(c => c.order_index === category.order_index + 1)
      if (nextCategory) {
        orderMutation.mutate({ id: category.id, newOrder: category.order_index + 1 })
        orderMutation.mutate({ id: nextCategory.id, newOrder: nextCategory.order_index - 1 })
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
              {t('projectCategories.noPermission') || 'You do not have permission to view project categories.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'order_index',
      header: t('projectCategories.order') || 'Order',
      render: (_: any, row: ProjectCategory) => (
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
              disabled={orderMutation.isPending || row.order_index === (categories?.length ? Math.max(...categories.map(c => c.order_index)) : 0)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'image_url',
      header: t('projectCategories.image') || 'Image',
      render: (value: string | null) => (
        value ? (
          <img
            src={value}
            alt="Category"
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
      header: t('projectCategories.titleAr') || 'Title (AR)',
      render: (value: string, row: ProjectCategory) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.title_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('projectCategories.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('projectCategories.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('projectCategories.title') || 'Project Categories'}</h1>
          <p className="text-muted-foreground">Manage project categories</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingCategory(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('projectCategories.createCategory') || 'Create Category'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('projectCategories.title') || 'Project Categories'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={categories}
            columns={columns}
            isLoading={isLoading}
            searchKey="title_ar"
            searchPlaceholder={t('common.search')}
            actions={(category) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('projectCategories.editCategory') : t('projectCategories.createCategory')}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update project category information' : 'Create a new project category'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_ar">{t('projectCategories.titleAr') || 'Title (Arabic)'}</Label>
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
                <Label htmlFor="title_en">{t('projectCategories.titleEn') || 'Title (English)'}</Label>
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

            <ImageUpload
              value={watch('image_url') || undefined}
              onChange={(url) => setValue('image_url', url || '')}
              bucket="site-assets"
              maxSize={5}
              disabled={createMutation.isPending || updateMutation.isPending}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_index">{t('projectCategories.order') || 'Order Index'}</Label>
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

              <div className="space-y-2">
                <Label htmlFor="status">{t('projectCategories.status') || 'Status'}</Label>
                <Select
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingCategory?.status || 'active'}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingCategory(null)
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
              {t('projectCategories.deleteCategory') || `Are you sure you want to delete category "${categoryToDelete?.title_en || categoryToDelete?.title_ar || 'Untitled Category'}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
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

