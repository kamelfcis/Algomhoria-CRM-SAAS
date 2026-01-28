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

const finishingTypeSchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  status: z.enum(['active', 'inactive']),
})

type FinishingTypeForm = z.infer<typeof finishingTypeSchema>

interface PropertyFinishingType {
  id: string
  name_ar: string
  name_en: string
  status: string
  created_at: string
  updated_at: string
}

async function getFinishingTypes() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_finishing_types')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PropertyFinishingType[]
}

async function checkNameExists(nameEn: string, nameAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let queryEn = supabase.from('property_finishing_types').select('id').eq('name_en', nameEn).limit(1)
  if (excludeId) queryEn = queryEn.neq('id', excludeId)
  const { data: dataEn, error: errorEn } = await queryEn
  let queryAr = supabase.from('property_finishing_types').select('id').eq('name_ar', nameAr).limit(1)
  if (excludeId) queryAr = queryAr.neq('id', excludeId)
  const { data: dataAr, error: errorAr } = await queryAr
  if (errorEn || errorAr) {
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createFinishingType(finishingTypeData: FinishingTypeForm) {
  const nameExists = await checkNameExists(finishingTypeData.name_en, finishingTypeData.name_ar)
  if (nameExists) {
    throw new Error('A property finishing type with this name already exists. Please use a different name.')
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_finishing_types')
    .insert(finishingTypeData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateFinishingType(id: string, finishingTypeData: Partial<FinishingTypeForm>) {
  const supabase = createClient()
  if (finishingTypeData.name_en || finishingTypeData.name_ar) {
    const { data: currentFinishingType } = await supabase
      .from('property_finishing_types')
      .select('name_en, name_ar')
      .eq('id', id)
      .single()
    const nameEn = finishingTypeData.name_en ?? currentFinishingType?.name_en ?? ''
    const nameAr = finishingTypeData.name_ar ?? currentFinishingType?.name_ar ?? ''
    const nameExists = await checkNameExists(nameEn, nameAr, id)
    if (nameExists) {
      throw new Error('A property finishing type with this name already exists. Please use a different name.')
    }
  }
  const { data, error } = await supabase
    .from('property_finishing_types')
    .update(finishingTypeData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function checkFinishingTypeHasProperties(finishingTypeId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('finishing_type_id', finishingTypeId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deleteFinishingType(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_finishing_types')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function PropertyFinishingTypesPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFinishingType, setEditingFinishingType] = useState<PropertyFinishingType | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [finishingTypeToDelete, setFinishingTypeToDelete] = useState<PropertyFinishingType | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedIdsForBulkDelete, setSelectedIdsForBulkDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('property_finishing_types')

  const { data: finishingTypes, isLoading } = useQuery({
    queryKey: ['property-finishing-types'],
    queryFn: getFinishingTypes,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createFinishingType,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-finishing-types'] })
      setIsDialogOpen(false)
      setEditingFinishingType(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      await ActivityLogger.create('property_finishing_type', data.id, data.name_en || data.name_ar)
      const finishingTypeName = data?.name_en || data?.name_ar || 'Finishing Type'
      const message = t('propertyFinishingTypes.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', finishingTypeName) : `Property finishing type "${finishingTypeName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFinishingTypes.createError') || 'Failed to create property finishing type',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FinishingTypeForm> }) =>
      updateFinishingType(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-finishing-types'] })
      setIsDialogOpen(false)
      const previousFinishingType = editingFinishingType
      setEditingFinishingType(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      if (previousFinishingType) {
        await ActivityLogger.update(
          'property_finishing_type',
          data.id,
          data.name_en || data.name_ar,
          previousFinishingType,
          data
        )
      }
      const finishingTypeName = data?.name_en || data?.name_ar || previousFinishingType?.name_en || previousFinishingType?.name_ar || 'Finishing Type'
      const message = t('propertyFinishingTypes.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', finishingTypeName) : `Property finishing type "${finishingTypeName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFinishingTypes.updateError') || 'Failed to update property finishing type',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFinishingType,
    onSuccess: async (_, deletedId) => {
      const deletedFinishingType = finishingTypeToDelete || finishingTypes?.find(f => f.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['property-finishing-types'] })
      setDeleteDialogOpen(false)
      setFinishingTypeToDelete(null)
      // Log activity
      if (deletedFinishingType) {
        await ActivityLogger.delete('property_finishing_type', deletedFinishingType.id, deletedFinishingType.name_en || deletedFinishingType.name_ar)
      }
      const deletedName = deletedFinishingType?.name_en || deletedFinishingType?.name_ar || 'Finishing Type'
      const message = t('propertyFinishingTypes.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Property finishing type "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFinishingTypes.deleteError') || 'Failed to delete property finishing type',
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
  } = useForm<FinishingTypeForm>({
    resolver: zodResolver(finishingTypeSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      status: 'active',
    },
  })

  const selectedStatus = watch('status')

  const onSubmit = (data: FinishingTypeForm) => {
    if (editingFinishingType) {
      updateMutation.mutate({ id: editingFinishingType.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (finishingType: PropertyFinishingType) => {
    setEditingFinishingType(finishingType)
    reset({
      name_ar: finishingType.name_ar,
      name_en: finishingType.name_en,
      status: finishingType.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (finishingType: PropertyFinishingType) => {
    setFinishingTypeToDelete(finishingType)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!finishingTypeToDelete) return

    try {
      const hasProperties = await checkFinishingTypeHasProperties(finishingTypeToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyFinishingTypes.cannotDeleteHasProperties') || `This property finishing type cannot be deleted because it has one or more properties associated with it. Please remove or reassign all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setFinishingTypeToDelete(null)
        return
      }

      deleteMutation.mutate(finishingTypeToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFinishingTypes.checkError') || 'Failed to verify if property finishing type has properties. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingFinishingType(null)
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
          const hasProperties = await checkFinishingTypeHasProperties(id)
          if (hasProperties) {
            cannotDeleteIds.push(id)
            continue
          }
          await deleteFinishingType(id)
          deletedIds.push(id)
        } catch (error: any) {
          failedIds.push(id)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['property-finishing-types'] })
      
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
            ? (t('propertyFinishingTypes.bulkDeletedSuccess') === 'propertyFinishingTypes.bulkDeletedSuccess'
              ? language === 'ar'
                ? `تم حذف ${successCount} ${successCount === 1 ? 'نوع تشطيب بنجاح' : 'أنواع تشطيب بنجاح'}`
                : `${successCount} ${successCount === 1 ? 'property finishing type has' : 'property finishing types have'} been deleted successfully.`
              : t('propertyFinishingTypes.bulkDeletedSuccess'))
            : (t('propertyFinishingTypes.bulkDeletedPartial') === 'propertyFinishingTypes.bulkDeletedPartial'
              ? language === 'ar'
                ? `تم حذف ${successCount} من ${total} نوع تشطيب بنجاح`
                : `${successCount} of ${total} property finishing types deleted successfully.`
              : t('propertyFinishingTypes.bulkDeletedPartial')),
          variant: 'success',
        })
      }
      
      if (cannotDeleteCount > 0) {
        toast({
          title: t('common.warning') === 'common.warning'
            ? (language === 'ar' ? 'تحذير' : 'Warning')
            : t('common.warning'),
          description: t('propertyFinishingTypes.cannotDeleteSome') === 'propertyFinishingTypes.cannotDeleteSome'
            ? language === 'ar'
              ? `لا يمكن حذف ${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'نوع تشطيب لأنه' : 'أنواع تشطيب لأنها'} مستخدم ${cannotDeleteCount === 1 ? 'في' : 'في'} عقارات`
              : `${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'property finishing type cannot' : 'property finishing types cannot'} be deleted because ${cannotDeleteCount === 1 ? 'it is' : 'they are'} used in properties.`
            : t('propertyFinishingTypes.cannotDeleteSome'),
          variant: 'destructive',
          duration: 6000,
        })
      }
      
      if (failedCount > 0) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyFinishingTypes.bulkDeleteFailed') || `Failed to delete ${failedCount} ${failedCount === 1 ? 'property finishing type' : 'property finishing types'}. Please try again. / فشل حذف ${failedCount} ${failedCount === 1 ? 'نوع تشطيب' : 'أنواع تشطيب'}. يرجى المحاولة مرة أخرى`,
          variant: 'destructive',
        })
      }
      
      setBulkDeleteDialogOpen(false)
      setSelectedIdsForBulkDelete([])
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFinishingTypes.bulkDeleteError') || 'An error occurred during bulk delete. Please try again. / حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مرة أخرى',
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
              {t('propertyFinishingTypes.noPermission') || 'You do not have permission to view property finishing types.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'name_ar',
      header: t('propertyFinishingTypes.nameAr') || 'Name (AR)',
      render: (value: string, row: PropertyFinishingType) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('propertyFinishingTypes.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('propertyFinishingTypes.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propertyFinishingTypes.title') || 'Property Finishing Types'}</h1>
          <p className="text-muted-foreground">Manage property finishing types</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingFinishingType(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('propertyFinishingTypes.createFinishingType') || 'Create Finishing Type'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('propertyFinishingTypes.title') || 'Property Finishing Types'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={finishingTypes}
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
            actions={(finishingType) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(finishingType)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyFinishingTypes.editFinishingType') || 'Edit property finishing type'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(finishingType)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyFinishingTypes.deleteFinishingType') || 'Delete property finishing type'}
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
              {editingFinishingType ? t('propertyFinishingTypes.editFinishingType') : t('propertyFinishingTypes.createFinishingType')}
            </DialogTitle>
            <DialogDescription>
              {editingFinishingType ? 'Update finishing type information' : 'Create a new finishing type'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('propertyFinishingTypes.nameAr') || 'Name (Arabic)'}</Label>
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
                <Label htmlFor="name_en">{t('propertyFinishingTypes.nameEn') || 'Name (English)'}</Label>
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
              <Label htmlFor="status">{t('propertyFinishingTypes.status') || 'Status'}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('propertyFinishingTypes.selectStatus') || 'Select status'} />
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
                  : editingFinishingType
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
              {t('propertyFinishingTypes.deleteFinishingType') || `Are you sure you want to delete property finishing type "${finishingTypeToDelete?.name_en || finishingTypeToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFinishingTypeToDelete(null)}>
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
              {t('propertyFinishingTypes.bulkDeleteConfirm') === 'propertyFinishingTypes.bulkDeleteConfirm'
                ? language === 'ar'
                  ? `هل أنت متأكد من حذف ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'نوع تشطيب' : 'أنواع تشطيب'}؟ لا يمكن التراجع عن هذا الإجراء`
                  : `Are you sure you want to delete ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'property finishing type' : 'property finishing types'}? This action cannot be undone.`
                : t('propertyFinishingTypes.bulkDeleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setSelectedIdsForBulkDelete([])
              }}
              disabled={isBulkDeleting}
            >
              {t('common.cancel') || 'Cancel / إلغاء'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (t('common.deleting') || 'Deleting... / جاري الحذف...') : (t('common.delete') || 'Delete / حذف')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

