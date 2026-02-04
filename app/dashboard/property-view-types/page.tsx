'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, Trash } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useLanguageStore } from '@/store/language-store'
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

const viewTypeSchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  status: z.enum(['active', 'inactive']),
})

type ViewTypeForm = z.infer<typeof viewTypeSchema>

interface PropertyViewType {
  id: string
  name_ar: string
  name_en: string
  status: string
  created_at: string
  updated_at: string
}

async function getViewTypes() {
  const supabase = createClient()
  const allViewTypes: PropertyViewType[] = []
  const batchSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('property_view_types')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (error) throw error

    if (data && data.length > 0) {
      allViewTypes.push(...data)
      offset += batchSize
      // If we got fewer records than batchSize, we've reached the end
      hasMore = data.length === batchSize
    } else {
      hasMore = false
    }
  }

  return allViewTypes
}

async function checkNameExists(nameEn: string, nameAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let queryEn = supabase.from('property_view_types').select('id').eq('name_en', nameEn).limit(1)
  if (excludeId) queryEn = queryEn.neq('id', excludeId)
  const { data: dataEn, error: errorEn } = await queryEn
  let queryAr = supabase.from('property_view_types').select('id').eq('name_ar', nameAr).limit(1)
  if (excludeId) queryAr = queryAr.neq('id', excludeId)
  const { data: dataAr, error: errorAr } = await queryAr
  if (errorEn || errorAr) {
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createViewType(viewTypeData: ViewTypeForm) {
  const nameExists = await checkNameExists(viewTypeData.name_en, viewTypeData.name_ar)
  if (nameExists) {
    throw new Error('A property view type with this name already exists. Please use a different name.')
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_view_types')
    .insert(viewTypeData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateViewType(id: string, viewTypeData: Partial<ViewTypeForm>) {
  const supabase = createClient()
  if (viewTypeData.name_en || viewTypeData.name_ar) {
    const { data: currentViewType } = await supabase
      .from('property_view_types')
      .select('name_en, name_ar')
      .eq('id', id)
      .single()
    const nameEn = viewTypeData.name_en ?? currentViewType?.name_en ?? ''
    const nameAr = viewTypeData.name_ar ?? currentViewType?.name_ar ?? ''
    const nameExists = await checkNameExists(nameEn, nameAr, id)
    if (nameExists) {
      throw new Error('A property view type with this name already exists. Please use a different name.')
    }
  }
  const { data, error } = await supabase
    .from('property_view_types')
    .update(viewTypeData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function checkViewTypeHasProperties(viewTypeId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('view_type_id', viewTypeId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deleteViewType(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_view_types')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function PropertyViewTypesPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingViewType, setEditingViewType] = useState<PropertyViewType | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewTypeToDelete, setViewTypeToDelete] = useState<PropertyViewType | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedIdsForBulkDelete, setSelectedIdsForBulkDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('property_view_types')

  const { data: viewTypes, isLoading } = useQuery({
    queryKey: ['property-view-types'],
    queryFn: getViewTypes,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createViewType,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-view-types'] })
      setIsDialogOpen(false)
      setEditingViewType(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      await ActivityLogger.create('property_view_type', data.id, data.name_en || data.name_ar)
      const viewTypeName = data?.name_en || data?.name_ar || 'View Type'
      const message = t('propertyViewTypes.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', viewTypeName) : `Property view type "${viewTypeName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyViewTypes.createError') || 'Failed to create property view type',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ViewTypeForm> }) =>
      updateViewType(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-view-types'] })
      setIsDialogOpen(false)
      const previousViewType = editingViewType
      setEditingViewType(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      if (previousViewType) {
        await ActivityLogger.update(
          'property_view_type',
          data.id,
          data.name_en || data.name_ar,
          previousViewType,
          data
        )
      }
      const viewTypeName = data?.name_en || data?.name_ar || previousViewType?.name_en || previousViewType?.name_ar || 'View Type'
      const message = t('propertyViewTypes.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', viewTypeName) : `Property view type "${viewTypeName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyViewTypes.updateError') || 'Failed to update property view type',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteViewType,
    onSuccess: async (_, deletedId) => {
      const deletedViewType = viewTypeToDelete || viewTypes?.find(v => v.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['property-view-types'] })
      setDeleteDialogOpen(false)
      setViewTypeToDelete(null)
      // Log activity
      if (deletedViewType) {
        await ActivityLogger.delete('property_view_type', deletedViewType.id, deletedViewType.name_en || deletedViewType.name_ar)
      }
      const deletedName = deletedViewType?.name_en || deletedViewType?.name_ar || 'View Type'
      const message = t('propertyViewTypes.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Property view type "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyViewTypes.deleteError') || 'Failed to delete property view type',
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
  } = useForm<ViewTypeForm>({
    resolver: zodResolver(viewTypeSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      status: 'active',
    },
  })

  const selectedStatus = watch('status')

  const onSubmit = (data: ViewTypeForm) => {
    if (editingViewType) {
      updateMutation.mutate({ id: editingViewType.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (viewType: PropertyViewType) => {
    setEditingViewType(viewType)
    reset({
      name_ar: viewType.name_ar,
      name_en: viewType.name_en,
      status: viewType.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (viewType: PropertyViewType) => {
    setViewTypeToDelete(viewType)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!viewTypeToDelete) return

    try {
      const hasProperties = await checkViewTypeHasProperties(viewTypeToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyViewTypes.cannotDeleteHasProperties') || `This property view type cannot be deleted because it has one or more properties associated with it. Please remove or reassign all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setViewTypeToDelete(null)
        return
      }

      deleteMutation.mutate(viewTypeToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyViewTypes.checkError') || 'Failed to verify if property view type has properties. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingViewType(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIdsForBulkDelete.length === 0) return
    
    setIsBulkDeleting(true)
    const deletedIds: string[] = []
    const failedIds: string[] = []
    const cannotDeleteIds: string[] = []
    
    try {
      for (const id of selectedIdsForBulkDelete) {
        try {
          const hasProperties = await checkViewTypeHasProperties(id)
          if (hasProperties) {
            cannotDeleteIds.push(id)
            continue
          }
          await deleteViewType(id)
          deletedIds.push(id)
        } catch (error: any) {
          failedIds.push(id)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['property-view-types'] })
      
      const total = selectedIdsForBulkDelete.length
      const successCount = deletedIds.length
      const failedCount = failedIds.length
      const cannotDeleteCount = cannotDeleteIds.length
      
      if (successCount > 0) {
        toast({
          title: t('common.success') === 'common.success'
            ? (language === 'ar' ? 'نجاح' : 'Success')
            : t('common.success'),
          description: successCount === total
            ? (t('propertyViewTypes.bulkDeletedSuccess') === 'propertyViewTypes.bulkDeletedSuccess'
              ? language === 'ar'
                ? `تم حذف ${successCount} ${successCount === 1 ? 'نوع إطلالة بنجاح' : 'أنواع إطلالات بنجاح'}`
                : `${successCount} ${successCount === 1 ? 'property view type has' : 'property view types have'} been deleted successfully.`
              : t('propertyViewTypes.bulkDeletedSuccess'))
            : (t('propertyViewTypes.bulkDeletedPartial') === 'propertyViewTypes.bulkDeletedPartial'
              ? language === 'ar'
                ? `تم حذف ${successCount} من ${total} نوع إطلالة بنجاح`
                : `${successCount} of ${total} property view types deleted successfully.`
              : t('propertyViewTypes.bulkDeletedPartial')),
          variant: 'success',
        })
      }
      
      if (cannotDeleteCount > 0) {
        toast({
          title: t('common.warning') === 'common.warning'
            ? (language === 'ar' ? 'تحذير' : 'Warning')
            : t('common.warning'),
          description: t('propertyViewTypes.cannotDeleteSome') === 'propertyViewTypes.cannotDeleteSome'
            ? language === 'ar'
              ? `لا يمكن حذف ${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'نوع إطلالة لأنه' : 'أنواع إطلالات لأنها'} مستخدم ${cannotDeleteCount === 1 ? 'في' : 'في'} عقارات`
              : `${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'property view type cannot' : 'property view types cannot'} be deleted because ${cannotDeleteCount === 1 ? 'it is' : 'they are'} used in properties.`
            : t('propertyViewTypes.cannotDeleteSome'),
          variant: 'destructive',
          duration: 6000,
        })
      }
      
      if (failedCount > 0) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyViewTypes.bulkDeleteFailed') || `Failed to delete ${failedCount} ${failedCount === 1 ? 'property view type' : 'property view types'}. Please try again. / فشل حذف ${failedCount} ${failedCount === 1 ? 'نوع إطلالة' : 'أنواع إطلالات'}. يرجى المحاولة مرة أخرى`,
          variant: 'destructive',
        })
      }
      
      setBulkDeleteDialogOpen(false)
      setSelectedIdsForBulkDelete([])
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyViewTypes.bulkDeleteError') || 'An error occurred during bulk delete. Please try again. / حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      })
    } finally {
      setIsBulkDeleting(false)
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
              {t('propertyViewTypes.noPermission') || 'You do not have permission to view property view types.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'name_ar',
      header: t('propertyViewTypes.nameAr') || 'Name (AR)',
      render: (value: string, row: PropertyViewType) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('propertyViewTypes.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('propertyViewTypes.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propertyViewTypes.title') || 'Property View Types'}</h1>
          <p className="text-muted-foreground">Manage property view types</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingViewType(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('propertyViewTypes.createViewType') || 'Create View Type'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('propertyViewTypes.title') || 'Property View Types'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={viewTypes}
            columns={columns}
            isLoading={isLoading}
            searchKey={['name_ar', 'name_en', 'status']}
            searchPlaceholder={t('common.search')}
            enableSelection={canDelete}
            bulkActions={canDelete ? [
              {
                label: t('common.delete') || 'Delete Selected',
                action: (selectedIds: string[]) => {
                  setSelectedIdsForBulkDelete(selectedIds)
                  setBulkDeleteDialogOpen(true)
                },
                variant: 'destructive',
                icon: <Trash className="h-4 w-4" />,
              },
            ] : []}
            actions={(viewType) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(viewType)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyViewTypes.editViewType') || 'Edit property view type'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(viewType)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyViewTypes.deleteViewType') || 'Delete property view type'}
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
              {editingViewType ? t('propertyViewTypes.editViewType') : t('propertyViewTypes.createViewType')}
            </DialogTitle>
            <DialogDescription>
              {editingViewType ? 'Update view type information' : 'Create a new view type'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('propertyViewTypes.nameAr') || 'Name (Arabic)'}</Label>
                <Input
                  id="name_ar"
                  {...register('name_ar')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.name_ar && (
                  <p className="text-sm text-destructive">{errors.name_ar.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_en">{t('propertyViewTypes.nameEn') || 'Name (English)'}</Label>
                <Input
                  id="name_en"
                  {...register('name_en')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.name_en && (
                  <p className="text-sm text-destructive">{errors.name_en.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('propertyViewTypes.status') || 'Status'}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('propertyViewTypes.selectStatus') || 'Select status'} />
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
                  : editingViewType
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
              {t('propertyViewTypes.deleteViewType') || `Are you sure you want to delete property view type "${viewTypeToDelete?.name_en || viewTypeToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setViewTypeToDelete(null)}>
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('common.confirmBulkDelete') === 'common.confirmBulkDelete'
                ? (language === 'ar' ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Delete')
                : t('common.confirmBulkDelete')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('propertyViewTypes.bulkDeleteConfirm') === 'propertyViewTypes.bulkDeleteConfirm'
                ? language === 'ar'
                  ? `هل أنت متأكد من حذف ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'نوع إطلالة' : 'أنواع إطلالات'}؟ لا يمكن التراجع عن هذا الإجراء`
                  : `Are you sure you want to delete ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'property view type' : 'property view types'}? This action cannot be undone.`
                : t('propertyViewTypes.bulkDeleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setSelectedIdsForBulkDelete([])
              }}
              disabled={isBulkDeleting}
            >
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (t('common.deleting') || 'Deleting... / جاري الحذف...') : (t('common.delete') || 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

