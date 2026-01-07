'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { useToast } from '@/hooks/use-toast'
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
import { PageSkeleton } from '@/components/ui/page-skeleton'

const categorySchema = z.object({
  title_ar: z.string().min(1, 'Title (Arabic) is required'),
  title_en: z.string().min(1, 'Title (English) is required'),
  order_index: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']),
})

type CategoryForm = z.infer<typeof categorySchema>

interface Category {
  id: string
  title_ar: string
  title_en: string
  order_index: number
  status: string
  created_at: string
}

async function getCategories() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data as Category[]
}

async function createCategory(categoryData: CategoryForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .insert(categoryData)
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateCategory(id: string, categoryData: Partial<CategoryForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function checkCategoryHasPosts(categoryId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deleteCategory(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function CategoriesPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  
  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('categories')

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsDialogOpen(false)
      setEditingCategory(null)
      reset({
        title_ar: '',
        title_en: '',
        order_index: 0,
        status: 'active',
      })
      // Log activity
      if (data?.id) {
        await ActivityLogger.create(
          'category',
          data.id,
          data.title_en || data.title_ar || 'Untitled Category'
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('categories.categoryCreated') || 'Category has been created successfully',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('categories.createError') || 'Failed to create category. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryForm> }) =>
      updateCategory(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsDialogOpen(false)
      const previousCategory = editingCategory
      setEditingCategory(null)
      reset({
        title_ar: '',
        title_en: '',
        order_index: 0,
        status: 'active',
      })
      // Log activity
      if (previousCategory && data?.id) {
        await ActivityLogger.update(
          'category',
          data.id,
          data.title_en || data.title_ar || 'Untitled Category',
          previousCategory,
          data
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('categories.categoryUpdated') || 'Category has been updated successfully',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('categories.updateError') || 'Failed to update category. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async (_, deletedId) => {
      const deletedCategory = categoryToDelete || categories?.find(c => c.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      // Log activity
      if (deletedCategory) {
        await ActivityLogger.delete(
          'category',
          deletedCategory.id,
          deletedCategory.title_en || deletedCategory.title_ar || 'Untitled Category'
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('categories.categoryDeleted') || `Category "${deletedCategory?.title_en || deletedCategory?.title_ar || 'Untitled Category'}" has been deleted successfully.`,
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('categories.deleteError') || 'Failed to delete category. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      title_ar: '',
      title_en: '',
      order_index: 0,
      status: 'active',
    },
  })

  const selectedStatus = watch('status')

  const onSubmit = (data: CategoryForm) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    reset({
      title_ar: category.title_ar,
      title_en: category.title_en,
      order_index: category.order_index,
      status: category.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      // Check if category has related posts
      const hasPosts = await checkCategoryHasPosts(categoryToDelete.id)
      
      if (hasPosts) {
        toast({
          title: t('common.error') || 'Error',
          description: t('categories.cannotDeleteHasPosts') || 'This category cannot be deleted because it contains one or more posts. Please remove all posts from this category or reassign them to another category before deleting.',
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setCategoryToDelete(null)
        return
      }

      // If no posts, proceed with deletion
      deleteMutation.mutate(categoryToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('categories.checkError') || 'Failed to check category usage. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingCategory(null)
      reset({
        title_ar: '',
        title_en: '',
        order_index: 0,
        status: 'active',
      })
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
              {t('categories.noPermission') || 'You do not have permission to view categories.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'title_en',
      header: t('categories.title_en'),
      render: (value: string, row: Category) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.title_ar}</div>
        </div>
      ),
    },
    {
      key: 'order_index',
      header: t('categories.orderIndex'),
    },
    {
      key: 'status',
      header: t('categories.status'),
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('categories.title')}</h1>
          <p className="text-muted-foreground">Manage post categories</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingCategory(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('categories.createCategory')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('categories.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={categories}
            columns={columns}
            isLoading={isLoading}
            searchKey="title_en"
            searchPlaceholder={t('common.search')}
            actions={(category) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('categories.editCategory') || 'Edit category'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('categories.deleteCategory') || 'Delete category'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('categories.editCategory') : t('categories.createCategory')}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category information' : 'Create a new category'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_ar">{t('categories.title_ar')}</Label>
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
                <Label htmlFor="title_en">{t('categories.title_en')}</Label>
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
                <Label htmlFor="order_index">{t('categories.orderIndex')}</Label>
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
                <Label htmlFor="status">{t('categories.status')}</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('categories.selectStatus') || 'Select status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.loading') || 'Loading...'
                  : editingCategory
                  ? t('common.update') || 'Update'
                  : t('common.create') || 'Create'}
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
              {t('categories.deleteCategory') || `Are you sure you want to delete category "${categoryToDelete?.title_en || categoryToDelete?.title_ar || 'Untitled Category'}"? This action cannot be undone.`}
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

