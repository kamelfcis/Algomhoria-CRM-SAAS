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

const serviceSchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  status: z.enum(['active', 'inactive']),
})

type ServiceForm = z.infer<typeof serviceSchema>

interface PropertyService {
  id: string
  name_ar: string
  name_en: string
  status: string
  created_at: string
  updated_at: string
}

async function getServices() {
  const supabase = createClient()
  const allServices: PropertyService[] = []
  const batchSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('property_services')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (error) throw error

    if (data && data.length > 0) {
      allServices.push(...data)
      offset += batchSize
      // If we got fewer records than batchSize, we've reached the end
      hasMore = data.length === batchSize
    } else {
      hasMore = false
    }
  }

  return allServices
}

async function checkNameExists(nameEn: string, nameAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let queryEn = supabase.from('property_services').select('id').eq('name_en', nameEn).limit(1)
  if (excludeId) queryEn = queryEn.neq('id', excludeId)
  const { data: dataEn, error: errorEn } = await queryEn
  let queryAr = supabase.from('property_services').select('id').eq('name_ar', nameAr).limit(1)
  if (excludeId) queryAr = queryAr.neq('id', excludeId)
  const { data: dataAr, error: errorAr } = await queryAr
  if (errorEn || errorAr) {
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createService(serviceData: ServiceForm) {
  const nameExists = await checkNameExists(serviceData.name_en, serviceData.name_ar)
  if (nameExists) {
    throw new Error('A property service with this name already exists. Please use a different name.')
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_services')
    .insert(serviceData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateService(id: string, serviceData: Partial<ServiceForm>) {
  const supabase = createClient()
  if (serviceData.name_en || serviceData.name_ar) {
    const { data: currentService } = await supabase
      .from('property_services')
      .select('name_en, name_ar')
      .eq('id', id)
      .single()
    const nameEn = serviceData.name_en ?? currentService?.name_en ?? ''
    const nameAr = serviceData.name_ar ?? currentService?.name_ar ?? ''
    const nameExists = await checkNameExists(nameEn, nameAr, id)
    if (nameExists) {
      throw new Error('A property service with this name already exists. Please use a different name.')
    }
  }
  const { data, error } = await supabase
    .from('property_services')
    .update(serviceData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function checkServiceHasProperties(serviceId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_property_services')
    .select('property_id')
    .eq('service_id', serviceId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deleteService(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_services')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function PropertyServicesPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<PropertyService | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<PropertyService | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedIdsForBulkDelete, setSelectedIdsForBulkDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('property_services')

  const { data: services, isLoading } = useQuery({
    queryKey: ['property-services'],
    queryFn: getServices,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-services'] })
      setIsDialogOpen(false)
      setEditingService(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      await ActivityLogger.create('property_service', data.id, data.name_en || data.name_ar)
      const serviceName = data?.name_en || data?.name_ar || 'Service'
      const message = t('propertyServices.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', serviceName) : `Property service "${serviceName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyServices.createError') || 'Failed to create property service',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceForm> }) =>
      updateService(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-services'] })
      setIsDialogOpen(false)
      const previousService = editingService
      setEditingService(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      if (previousService) {
        await ActivityLogger.update(
          'property_service',
          data.id,
          data.name_en || data.name_ar,
          previousService,
          data
        )
      }
      const serviceName = data?.name_en || data?.name_ar || previousService?.name_en || previousService?.name_ar || 'Service'
      const message = t('propertyServices.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', serviceName) : `Property service "${serviceName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyServices.updateError') || 'Failed to update property service',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: async (_, deletedId) => {
      const deletedService = serviceToDelete || services?.find(s => s.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['property-services'] })
      setDeleteDialogOpen(false)
      setServiceToDelete(null)
      // Log activity
      if (deletedService) {
        await ActivityLogger.delete('property_service', deletedService.id, deletedService.name_en || deletedService.name_ar)
      }
      const deletedName = deletedService?.name_en || deletedService?.name_ar || 'Service'
      const message = t('propertyServices.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Property service "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyServices.deleteError') || 'Failed to delete property service',
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
  } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      status: 'active',
    },
  })

  const selectedStatus = watch('status')

  const onSubmit = (data: ServiceForm) => {
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (service: PropertyService) => {
    setEditingService(service)
    reset({
      name_ar: service.name_ar,
      name_en: service.name_en,
      status: service.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (service: PropertyService) => {
    setServiceToDelete(service)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!serviceToDelete) return

    try {
      const hasProperties = await checkServiceHasProperties(serviceToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyServices.cannotDeleteHasProperties') || `This property service cannot be deleted because it is used in one or more properties. Please remove it from all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setServiceToDelete(null)
        return
      }

      deleteMutation.mutate(serviceToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyServices.checkError') || 'Failed to verify if property service is used in properties. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingService(null)
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
          const hasProperties = await checkServiceHasProperties(id)
          if (hasProperties) {
            cannotDeleteIds.push(id)
            continue
          }
          await deleteService(id)
          deletedIds.push(id)
        } catch (error: any) {
          failedIds.push(id)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['property-services'] })
      
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
            ? (t('propertyServices.bulkDeletedSuccess') === 'propertyServices.bulkDeletedSuccess'
              ? language === 'ar'
                ? `تم حذف ${successCount} ${successCount === 1 ? 'خدمة عقارية بنجاح' : 'خدمات عقارية بنجاح'}`
                : `${successCount} ${successCount === 1 ? 'property service has' : 'property services have'} been deleted successfully.`
              : t('propertyServices.bulkDeletedSuccess'))
            : (t('propertyServices.bulkDeletedPartial') === 'propertyServices.bulkDeletedPartial'
              ? language === 'ar'
                ? `تم حذف ${successCount} من ${total} خدمة عقارية بنجاح`
                : `${successCount} of ${total} property services deleted successfully.`
              : t('propertyServices.bulkDeletedPartial')),
          variant: 'success',
        })
      }
      
      if (cannotDeleteCount > 0) {
        toast({
          title: t('common.warning') === 'common.warning'
            ? (language === 'ar' ? 'تحذير' : 'Warning')
            : t('common.warning'),
          description: t('propertyServices.cannotDeleteSome') === 'propertyServices.cannotDeleteSome'
            ? language === 'ar'
              ? `لا يمكن حذف ${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'خدمة عقارية لأنها' : 'خدمات عقارية لأنها'} مستخدمة في عقارات`
              : `${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'property service cannot' : 'property services cannot'} be deleted because ${cannotDeleteCount === 1 ? 'it is' : 'they are'} used in properties.`
            : t('propertyServices.cannotDeleteSome'),
          variant: 'destructive',
          duration: 6000,
        })
      }
      
      if (failedCount > 0) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyServices.bulkDeleteFailed') || `Failed to delete ${failedCount} ${failedCount === 1 ? 'property service' : 'property services'}. Please try again. / فشل حذف ${failedCount} ${failedCount === 1 ? 'خدمة عقارية' : 'خدمات عقارية'}. يرجى المحاولة مرة أخرى`,
          variant: 'destructive',
        })
      }
      
      setBulkDeleteDialogOpen(false)
      setSelectedIdsForBulkDelete([])
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyServices.bulkDeleteError') || 'An error occurred during bulk delete. Please try again. / حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مرة أخرى',
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
              {t('propertyServices.noPermission') || 'You do not have permission to view property services.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'name_ar',
      header: t('propertyServices.nameAr') || 'Name (AR)',
      render: (value: string, row: PropertyService) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('propertyServices.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('propertyServices.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propertyServices.title') || 'Property Services'}</h1>
          <p className="text-muted-foreground">Manage property services</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingService(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('propertyServices.createService') || 'Create Service'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('propertyServices.title') || 'Property Services'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={services}
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
            actions={(service) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(service)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyServices.editService') || 'Edit property service'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(service)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyServices.deleteService') || 'Delete property service'}
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
              {editingService ? t('propertyServices.editService') : t('propertyServices.createService')}
            </DialogTitle>
            <DialogDescription>
              {editingService ? 'Update service information' : 'Create a new service'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('propertyServices.nameAr') || 'Name (Arabic)'}</Label>
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
                <Label htmlFor="name_en">{t('propertyServices.nameEn') || 'Name (English)'}</Label>
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
              <Label htmlFor="status">{t('propertyServices.status') || 'Status'}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('propertyServices.selectStatus') || 'Select status'} />
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
                  : editingService
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
              {t('propertyServices.deleteService') || `Are you sure you want to delete property service "${serviceToDelete?.name_en || serviceToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServiceToDelete(null)}>
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
              {t('propertyServices.bulkDeleteConfirm') === 'propertyServices.bulkDeleteConfirm'
                ? language === 'ar'
                  ? `هل أنت متأكد من حذف ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'خدمة عقارية' : 'خدمات عقارية'}؟ لا يمكن التراجع عن هذا الإجراء`
                  : `Are you sure you want to delete ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'property service' : 'property services'}? This action cannot be undone.`
                : t('propertyServices.bulkDeleteConfirm')}
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

