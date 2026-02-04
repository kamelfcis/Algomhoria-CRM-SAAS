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

const propertyTypeSchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  status: z.enum(['active', 'inactive']),
})

type PropertyTypeForm = z.infer<typeof propertyTypeSchema>

interface PropertyType {
  id: string
  name_ar: string
  name_en: string
  status: string
  created_at: string
  updated_at: string
}

async function getPropertyTypes() {
  const supabase = createClient()
  const allPropertyTypes: PropertyType[] = []
  const batchSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('property_types')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (error) throw error

    if (data && data.length > 0) {
      allPropertyTypes.push(...data)
      offset += batchSize
      // If we got fewer records than batchSize, we've reached the end
      hasMore = data.length === batchSize
    } else {
      hasMore = false
    }
  }

  return allPropertyTypes
}

async function checkNameExists(nameEn: string, nameAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let queryEn = supabase.from('property_types').select('id').eq('name_en', nameEn).limit(1)
  if (excludeId) queryEn = queryEn.neq('id', excludeId)
  const { data: dataEn, error: errorEn } = await queryEn
  let queryAr = supabase.from('property_types').select('id').eq('name_ar', nameAr).limit(1)
  if (excludeId) queryAr = queryAr.neq('id', excludeId)
  const { data: dataAr, error: errorAr } = await queryAr
  if (errorEn || errorAr) {
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createPropertyType(typeData: PropertyTypeForm) {
  const nameExists = await checkNameExists(typeData.name_en, typeData.name_ar)
  if (nameExists) {
    throw new Error('A property type with this name already exists. Please use a different name.')
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_types')
    .insert(typeData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updatePropertyType(id: string, typeData: Partial<PropertyTypeForm>) {
  const supabase = createClient()
  if (typeData.name_en || typeData.name_ar) {
    const { data: currentType } = await supabase
      .from('property_types')
      .select('name_en, name_ar')
      .eq('id', id)
      .single()
    const nameEn = typeData.name_en ?? currentType?.name_en ?? ''
    const nameAr = typeData.name_ar ?? currentType?.name_ar ?? ''
    const nameExists = await checkNameExists(nameEn, nameAr, id)
    if (nameExists) {
      throw new Error('A property type with this name already exists. Please use a different name.')
    }
  }
  const { data, error } = await supabase
    .from('property_types')
    .update(typeData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function checkPropertyTypeHasProperties(propertyTypeId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('property_type_id', propertyTypeId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deletePropertyType(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_types')
    .delete()
    .eq('id', id)

  if (error) throw error
}


export default function PropertyTypesPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<PropertyType | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [typeToDelete, setTypeToDelete] = useState<PropertyType | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedIdsForBulkDelete, setSelectedIdsForBulkDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('property_types')

  const { data: types, isLoading } = useQuery({
    queryKey: ['property-types'],
    queryFn: getPropertyTypes,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createPropertyType,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-types'] })
      setIsDialogOpen(false)
      setEditingType(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      await ActivityLogger.create('property_type', data.id, data.name_en || data.name_ar)
      const typeName = data?.name_en || data?.name_ar || 'Property Type'
      const message = t('propertyTypes.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', typeName) : `Property type "${typeName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyTypes.createError') || 'Failed to create property type',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyTypeForm> }) =>
      updatePropertyType(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-types'] })
      setIsDialogOpen(false)
      const previousType = editingType
      setEditingType(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      if (previousType) {
        await ActivityLogger.update(
          'property_type',
          data.id,
          data.name_en || data.name_ar,
          previousType,
          data
        )
      }
      const typeName = data?.name_en || data?.name_ar || previousType?.name_en || previousType?.name_ar || 'Property Type'
      const message = t('propertyTypes.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', typeName) : `Property type "${typeName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyTypes.updateError') || 'Failed to update property type',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePropertyType,
    onSuccess: async (_, deletedId) => {
      const deletedType = typeToDelete || types?.find(t => t.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['property-types'] })
      setDeleteDialogOpen(false)
      setTypeToDelete(null)
      // Log activity
      if (deletedType) {
        await ActivityLogger.delete('property_type', deletedType.id, deletedType.name_en || deletedType.name_ar)
      }
      const deletedName = deletedType?.name_en || deletedType?.name_ar || 'Property Type'
      const message = t('propertyTypes.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Property type "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyTypes.deleteError') || 'Failed to delete property type',
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
  } = useForm<PropertyTypeForm>({
    resolver: zodResolver(propertyTypeSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      status: 'active',
    },
  })

  const selectedStatus = watch('status')

  const onSubmit = (data: PropertyTypeForm) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (type: PropertyType) => {
    setEditingType(type)
    reset({
      name_ar: type.name_ar,
      name_en: type.name_en,
      status: type.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (type: PropertyType) => {
    setTypeToDelete(type)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!typeToDelete) return

    try {
      const hasProperties = await checkPropertyTypeHasProperties(typeToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyTypes.cannotDeleteHasProperties') || `This property type cannot be deleted because it has one or more properties associated with it. Please remove or reassign all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setTypeToDelete(null)
        return
      }

      deleteMutation.mutate(typeToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyTypes.checkError') || 'Failed to verify if property type has properties. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingType(null)
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
          const hasProperties = await checkPropertyTypeHasProperties(id)
          if (hasProperties) {
            cannotDeleteIds.push(id)
            continue
          }
          await deletePropertyType(id)
          deletedIds.push(id)
        } catch (error: any) {
          failedIds.push(id)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['property-types'] })
      
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
            ? (t('propertyTypes.bulkDeletedSuccess') === 'propertyTypes.bulkDeletedSuccess'
              ? language === 'ar'
                ? `تم حذف ${successCount} ${successCount === 1 ? 'نوع عقار بنجاح' : 'أنواع عقارات بنجاح'}`
                : `${successCount} ${successCount === 1 ? 'property type has' : 'property types have'} been deleted successfully.`
              : t('propertyTypes.bulkDeletedSuccess'))
            : (t('propertyTypes.bulkDeletedPartial') === 'propertyTypes.bulkDeletedPartial'
              ? language === 'ar'
                ? `تم حذف ${successCount} من ${total} نوع عقار بنجاح`
                : `${successCount} of ${total} property types deleted successfully.`
              : t('propertyTypes.bulkDeletedPartial')),
          variant: 'success',
        })
      }
      
      if (cannotDeleteCount > 0) {
        toast({
          title: t('common.warning') === 'common.warning' 
            ? (language === 'ar' ? 'تحذير' : 'Warning')
            : t('common.warning'),
          description: t('propertyTypes.cannotDeleteSome') === 'propertyTypes.cannotDeleteSome'
            ? language === 'ar'
              ? `لا يمكن حذف ${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'نوع عقار لأنه' : 'أنواع عقارات لأنها'} مستخدم ${cannotDeleteCount === 1 ? 'في' : 'في'} عقارات`
              : `${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'property type cannot' : 'property types cannot'} be deleted because ${cannotDeleteCount === 1 ? 'it is' : 'they are'} used in properties.`
            : t('propertyTypes.cannotDeleteSome'),
          variant: 'destructive',
          duration: 6000,
        })
      }
      
      if (failedCount > 0) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyTypes.bulkDeleteFailed') || `Failed to delete ${failedCount} ${failedCount === 1 ? 'property type' : 'property types'}. Please try again. / فشل حذف ${failedCount} ${failedCount === 1 ? 'نوع عقار' : 'أنواع عقارات'}. يرجى المحاولة مرة أخرى`,
          variant: 'destructive',
        })
      }
      
      setBulkDeleteDialogOpen(false)
      setSelectedIdsForBulkDelete([])
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyTypes.bulkDeleteError') || 'An error occurred during bulk delete. Please try again. / حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مرة أخرى',
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
              {t('propertyTypes.noPermission') || 'You do not have permission to view property types.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'name_ar',
      header: t('propertyTypes.nameAr') || 'Name (AR)',
      render: (value: string, row: PropertyType) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('propertyTypes.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('propertyTypes.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propertyTypes.title') || 'Property Types'}</h1>
          <p className="text-muted-foreground">Manage property types and categories</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingType(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('propertyTypes.createType') || 'Create Type'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('propertyTypes.title') || 'Property Types'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={types}
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
            actions={(type) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(type)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyTypes.editType') || 'Edit property type'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(type)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyTypes.deleteType') || 'Delete property type'}
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
              {editingType ? t('propertyTypes.editType') : t('propertyTypes.createType')}
            </DialogTitle>
            <DialogDescription>
              {editingType ? 'Update property type information' : 'Create a new property type'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('propertyTypes.nameAr') || 'Name (Arabic)'}</Label>
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
                <Label htmlFor="name_en">{t('propertyTypes.nameEn') || 'Name (English)'}</Label>
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
              <Label htmlFor="status">{t('propertyTypes.status') || 'Status'}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('propertyTypes.selectStatus') || 'Select status'} />
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
                  : editingType
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
              {t('propertyTypes.deleteType') || `Are you sure you want to delete property type "${typeToDelete?.name_en || typeToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTypeToDelete(null)}>
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
              {t('propertyTypes.bulkDeleteConfirm') === 'propertyTypes.bulkDeleteConfirm'
                ? language === 'ar'
                  ? `هل أنت متأكد من حذف ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'نوع عقار' : 'أنواع عقارات'}؟ لا يمكن التراجع عن هذا الإجراء`
                  : `Are you sure you want to delete ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'property type' : 'property types'}? This action cannot be undone.`
                : t('propertyTypes.bulkDeleteConfirm')}
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

