'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { useToast } from '@/hooks/use-toast'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, Trash } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useLanguageStore } from '@/store/language-store'
import { usePermissions } from '@/hooks/use-permissions'
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

const paymentMethodSchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  status: z.enum(['active', 'inactive']),
})

type PaymentMethodForm = z.infer<typeof paymentMethodSchema>

interface PaymentMethod {
  id: string
  name_ar: string
  name_en: string
  status: string
  created_at: string
  updated_at: string
}

async function getPaymentMethods() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PaymentMethod[]
}

async function checkNameExists(nameEn: string, nameAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let queryEn = supabase.from('payment_methods').select('id').eq('name_en', nameEn).limit(1)
  if (excludeId) queryEn = queryEn.neq('id', excludeId)
  const { data: dataEn, error: errorEn } = await queryEn
  let queryAr = supabase.from('payment_methods').select('id').eq('name_ar', nameAr).limit(1)
  if (excludeId) queryAr = queryAr.neq('id', excludeId)
  const { data: dataAr, error: errorAr } = await queryAr
  if (errorEn || errorAr) {
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createPaymentMethod(methodData: PaymentMethodForm) {
  const nameExists = await checkNameExists(methodData.name_en, methodData.name_ar)
  if (nameExists) {
    throw new Error('A payment method with this name already exists. Please use a different name.')
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payment_methods')
    .insert(methodData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updatePaymentMethod(id: string, methodData: Partial<PaymentMethodForm>) {
  const supabase = createClient()
  if (methodData.name_en || methodData.name_ar) {
    const { data: currentMethod } = await supabase
      .from('payment_methods')
      .select('name_en, name_ar')
      .eq('id', id)
      .single()
    const nameEn = methodData.name_en ?? currentMethod?.name_en ?? ''
    const nameAr = methodData.name_ar ?? currentMethod?.name_ar ?? ''
    const nameExists = await checkNameExists(nameEn, nameAr, id)
    if (nameExists) {
      throw new Error('A payment method with this name already exists. Please use a different name.')
    }
  }
  const { data, error } = await supabase
    .from('payment_methods')
    .update(methodData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function checkPaymentMethodHasProperties(paymentMethodId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('payment_method_id', paymentMethodId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deletePaymentMethod(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function PaymentMethodsPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedIdsForBulkDelete, setSelectedIdsForBulkDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('payment_methods')

  const { data: methods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: getPaymentMethods,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createPaymentMethod,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      setIsDialogOpen(false)
      reset()
      // Log activity
      await ActivityLogger.create('payment_method', data.id, data.name_en || data.name_ar)
      const methodName = data?.name_en || data?.name_ar || 'Payment Method'
      const message = t('paymentMethods.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', methodName) : `Payment method "${methodName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('paymentMethods.createError') || 'Failed to create payment method',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PaymentMethodForm> }) =>
      updatePaymentMethod(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      setIsDialogOpen(false)
      const previousMethod = editingMethod
      setEditingMethod(null)
      reset()
      // Log activity
      if (previousMethod) {
        await ActivityLogger.update(
          'payment_method',
          data.id,
          data.name_en || data.name_ar,
          previousMethod,
          data
        )
      }
      const methodName = data?.name_en || data?.name_ar || previousMethod?.name_en || previousMethod?.name_ar || 'Payment Method'
      const message = t('paymentMethods.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', methodName) : `Payment method "${methodName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('paymentMethods.updateError') || 'Failed to update payment method',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: async (_, deletedId) => {
      const deletedMethod = methodToDelete || methods?.find(m => m.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      setDeleteDialogOpen(false)
      setMethodToDelete(null)
      // Log activity
      if (deletedMethod) {
        await ActivityLogger.delete('payment_method', deletedMethod.id, deletedMethod.name_en || deletedMethod.name_ar)
      }
      const deletedName = deletedMethod?.name_en || deletedMethod?.name_ar || 'Payment Method'
      const message = t('paymentMethods.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Payment method "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('paymentMethods.deleteError') || 'Failed to delete payment method',
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
  } = useForm<PaymentMethodForm>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      status: 'active',
    },
  })

  const onSubmit = (data: PaymentMethodForm) => {
    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method)
    setValue('name_ar', method.name_ar)
    setValue('name_en', method.name_en)
    setValue('status', method.status as any)
    setIsDialogOpen(true)
  }

  const handleDelete = (method: PaymentMethod) => {
    setMethodToDelete(method)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!methodToDelete) return

    try {
      const hasProperties = await checkPaymentMethodHasProperties(methodToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('paymentMethods.cannotDeleteHasProperties') || `This payment method cannot be deleted because it has one or more properties associated with it. Please remove or reassign all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setMethodToDelete(null)
        return
      }

      deleteMutation.mutate(methodToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('paymentMethods.checkError') || 'Failed to verify if payment method has properties. Please try again.',
        variant: 'destructive',
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
          const hasProperties = await checkPaymentMethodHasProperties(id)
          if (hasProperties) {
            cannotDeleteIds.push(id)
            continue
          }
          await deletePaymentMethod(id)
          deletedIds.push(id)
        } catch (error: any) {
          failedIds.push(id)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      
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
            ? (t('paymentMethods.bulkDeletedSuccess') === 'paymentMethods.bulkDeletedSuccess'
              ? language === 'ar'
                ? `تم حذف ${successCount} ${successCount === 1 ? 'طريقة دفع بنجاح' : 'طرق دفع بنجاح'}`
                : `${successCount} ${successCount === 1 ? 'payment method has' : 'payment methods have'} been deleted successfully.`
              : t('paymentMethods.bulkDeletedSuccess'))
            : (t('paymentMethods.bulkDeletedPartial') === 'paymentMethods.bulkDeletedPartial'
              ? language === 'ar'
                ? `تم حذف ${successCount} من ${total} طريقة دفع بنجاح`
                : `${successCount} of ${total} payment methods deleted successfully.`
              : t('paymentMethods.bulkDeletedPartial')),
          variant: 'success',
        })
      }
      
      if (cannotDeleteCount > 0) {
        toast({
          title: t('common.warning') === 'common.warning'
            ? (language === 'ar' ? 'تحذير' : 'Warning')
            : t('common.warning'),
          description: t('paymentMethods.cannotDeleteSome') === 'paymentMethods.cannotDeleteSome'
            ? language === 'ar'
              ? `لا يمكن حذف ${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'طريقة دفع لأنها' : 'طرق دفع لأنها'} مستخدمة في عقارات`
              : `${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'payment method cannot' : 'payment methods cannot'} be deleted because ${cannotDeleteCount === 1 ? 'it is' : 'they are'} used in properties.`
            : t('paymentMethods.cannotDeleteSome'),
          variant: 'destructive',
          duration: 6000,
        })
      }
      
      if (failedCount > 0) {
        toast({
          title: t('common.error') || 'Error',
          description: t('paymentMethods.bulkDeleteFailed') || `Failed to delete ${failedCount} ${failedCount === 1 ? 'payment method' : 'payment methods'}. Please try again. / فشل حذف ${failedCount} ${failedCount === 1 ? 'طريقة دفع' : 'طرق دفع'}. يرجى المحاولة مرة أخرى`,
          variant: 'destructive',
        })
      }
      
      setBulkDeleteDialogOpen(false)
      setSelectedIdsForBulkDelete([])
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('paymentMethods.bulkDeleteError') || 'An error occurred during bulk delete. Please try again. / حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مرة أخرى',
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
              {t('paymentMethods.noPermission') || 'You do not have permission to view payment methods.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'name_ar',
      header: t('paymentMethods.nameAr') || 'Name (AR)',
      render: (value: string, row: PaymentMethod) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('paymentMethods.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('paymentMethods.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('paymentMethods.title') || 'Payment Methods'}</h1>
          <p className="text-muted-foreground">Manage payment methods</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingMethod(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('paymentMethods.createMethod') || 'Create Payment Method'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('paymentMethods.title') || 'Payment Methods'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={methods}
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
            actions={(method) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(method)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(method)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? t('paymentMethods.editMethod') : t('paymentMethods.createMethod')}
            </DialogTitle>
            <DialogDescription>
              {editingMethod ? 'Update payment method information' : 'Create a new payment method'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('paymentMethods.nameAr') || 'Name (Arabic)'}</Label>
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
                <Label htmlFor="name_en">{t('paymentMethods.nameEn') || 'Name (English)'}</Label>
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
              <Label htmlFor="status">{t('paymentMethods.status') || 'Status'}</Label>
              <Select
                onValueChange={(value) => setValue('status', value as any)}
                defaultValue={editingMethod?.status || 'active'}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingMethod(null)
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
              {t('paymentMethods.deleteMethod') || `Are you sure you want to delete payment method "${methodToDelete?.name_en || methodToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMethodToDelete(null)}>
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
              {t('paymentMethods.bulkDeleteConfirm') === 'paymentMethods.bulkDeleteConfirm'
                ? language === 'ar'
                  ? `هل أنت متأكد من حذف ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'طريقة دفع' : 'طرق دفع'}؟ لا يمكن التراجع عن هذا الإجراء`
                  : `Are you sure you want to delete ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'payment method' : 'payment methods'}? This action cannot be undone.`
                : t('paymentMethods.bulkDeleteConfirm')}
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

