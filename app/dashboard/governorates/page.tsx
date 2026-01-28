'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Trash } from 'lucide-react'
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

const governorateSchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type GovernorateForm = z.infer<typeof governorateSchema>

interface Governorate {
  id: string
  name_ar: string
  name_en: string
  order_index: number
  status: string
  created_at: string
  updated_at: string
}

async function getGovernorates() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('governorates')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data as Governorate[]
}

async function checkNameExists(nameEn: string, nameAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let queryEn = supabase.from('governorates').select('id').eq('name_en', nameEn).limit(1)
  if (excludeId) queryEn = queryEn.neq('id', excludeId)
  const { data: dataEn, error: errorEn } = await queryEn
  let queryAr = supabase.from('governorates').select('id').eq('name_ar', nameAr).limit(1)
  if (excludeId) queryAr = queryAr.neq('id', excludeId)
  const { data: dataAr, error: errorAr } = await queryAr
  if (errorEn || errorAr) {
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createGovernorate(governorateData: GovernorateForm) {
  const nameExists = await checkNameExists(governorateData.name_en, governorateData.name_ar)
  if (nameExists) {
    throw new Error('A governorate with this name already exists. Please use a different name.')
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('governorates')
    .insert(governorateData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateGovernorate(id: string, governorateData: Partial<GovernorateForm>) {
  const supabase = createClient()
  if (governorateData.name_en || governorateData.name_ar) {
    const { data: currentGovernorate } = await supabase
      .from('governorates')
      .select('name_en, name_ar')
      .eq('id', id)
      .single()
    const nameEn = governorateData.name_en ?? currentGovernorate?.name_en ?? ''
    const nameAr = governorateData.name_ar ?? currentGovernorate?.name_ar ?? ''
    const nameExists = await checkNameExists(nameEn, nameAr, id)
    if (nameExists) {
      throw new Error('A governorate with this name already exists. Please use a different name.')
    }
  }
  const { data, error } = await supabase
    .from('governorates')
    .update(governorateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function checkGovernorateHasReferences(governorateId: string) {
  const supabase = createClient()
  
  // Check properties
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('id')
    .eq('governorate_id', governorateId)
    .limit(1)

  if (propertiesError) throw propertiesError
  if (properties && properties.length > 0) return true

  // Check areas
  const { data: areas, error: areasError } = await supabase
    .from('areas')
    .select('id')
    .eq('governorate_id', governorateId)
    .limit(1)

  if (areasError) throw areasError
  if (areas && areas.length > 0) return true

  // Check featured_areas
  const { data: featuredAreas, error: featuredAreasError } = await supabase
    .from('featured_areas')
    .select('id')
    .eq('governorate_id', governorateId)
    .limit(1)

  if (featuredAreasError) throw featuredAreasError
  if (featuredAreas && featuredAreas.length > 0) return true

  return false
}

async function deleteGovernorate(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('governorates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateGovernorateOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('governorates')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function GovernoratesPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGovernorate, setEditingGovernorate] = useState<Governorate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [governorateToDelete, setGovernorateToDelete] = useState<Governorate | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedIdsForBulkDelete, setSelectedIdsForBulkDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('governorates')

  const { data: governorates, isLoading } = useQuery({
    queryKey: ['governorates'],
    queryFn: getGovernorates,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createGovernorate,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['governorates'] })
      setIsDialogOpen(false)
      setEditingGovernorate(null)
      reset({
        name_ar: '',
        name_en: '',
        order_index: 0,
        status: 'active',
      })
      // Log activity
      await ActivityLogger.create('governorate', data.id, data.name_en || data.name_ar)
      const governorateName = data?.name_en || data?.name_ar || 'Governorate'
      const message = t('governorates.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', governorateName) : `Governorate "${governorateName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('governorates.createError') || 'Failed to create governorate',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GovernorateForm> }) =>
      updateGovernorate(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['governorates'] })
      setIsDialogOpen(false)
      const previousGovernorate = editingGovernorate
      setEditingGovernorate(null)
      reset({
        name_ar: '',
        name_en: '',
        order_index: 0,
        status: 'active',
      })
      // Log activity
      if (previousGovernorate) {
        await ActivityLogger.update(
          'governorate',
          data.id,
          data.name_en || data.name_ar,
          previousGovernorate,
          data
        )
      }
      const governorateName = data?.name_en || data?.name_ar || previousGovernorate?.name_en || previousGovernorate?.name_ar || 'Governorate'
      const message = t('governorates.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', governorateName) : `Governorate "${governorateName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('governorates.updateError') || 'Failed to update governorate',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGovernorate,
    onSuccess: async (_, deletedId) => {
      const deletedGovernorate = governorateToDelete || governorates?.find(g => g.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['governorates'] })
      setDeleteDialogOpen(false)
      setGovernorateToDelete(null)
      // Log activity
      if (deletedGovernorate) {
        await ActivityLogger.delete('governorate', deletedGovernorate.id, deletedGovernorate.name_en || deletedGovernorate.name_ar)
      }
      const deletedName = deletedGovernorate?.name_en || deletedGovernorate?.name_ar || 'Governorate'
      const message = t('governorates.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Governorate "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('governorates.deleteError') || 'Failed to delete governorate',
        variant: 'destructive',
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateGovernorateOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governorates'] })
      toast({
        title: t('common.success') || 'Success',
        description: t('governorates.orderUpdated') || 'Order updated successfully',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('governorates.orderUpdateError') || 'Failed to update order',
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
  } = useForm<GovernorateForm>({
    resolver: zodResolver(governorateSchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      order_index: 0,
      status: 'active',
    },
  })

  const selectedStatus = watch('status')

  const onSubmit = (data: GovernorateForm) => {
    if (editingGovernorate) {
      updateMutation.mutate({ id: editingGovernorate.id, data })
    } else {
      // Set order_index to max + 1 if not editing
      const maxOrder = governorates?.length ? Math.max(...governorates.map(g => g.order_index)) : -1
      createMutation.mutate({ ...data, order_index: maxOrder + 1 })
    }
  }

  const handleEdit = (governorate: Governorate) => {
    setEditingGovernorate(governorate)
    reset({
      name_ar: governorate.name_ar,
      name_en: governorate.name_en,
      order_index: governorate.order_index,
      status: governorate.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (governorate: Governorate) => {
    setGovernorateToDelete(governorate)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!governorateToDelete) return

    try {
      const hasReferences = await checkGovernorateHasReferences(governorateToDelete.id)
      
      if (hasReferences) {
        toast({
          title: t('common.error') || 'Error',
          description: t('governorates.cannotDeleteHasReferences') || `This governorate cannot be deleted because it has one or more properties, areas, or featured areas associated with it. Please remove or reassign all references before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setGovernorateToDelete(null)
        return
      }

      deleteMutation.mutate(governorateToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('governorates.checkError') || 'Failed to verify if governorate has references. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingGovernorate(null)
      reset({
        name_ar: '',
        name_en: '',
        order_index: 0,
        status: 'active',
      })
    }
  }

  const handleMoveUp = (governorate: Governorate) => {
    if (governorate.order_index > 0) {
      const prevGovernorate = governorates?.find(g => g.order_index === governorate.order_index - 1)
      if (prevGovernorate) {
        orderMutation.mutate({ id: governorate.id, newOrder: governorate.order_index - 1 })
        orderMutation.mutate({ id: prevGovernorate.id, newOrder: prevGovernorate.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (governorate: Governorate) => {
    const maxOrder = governorates?.length ? Math.max(...governorates.map(g => g.order_index)) : 0
    if (governorate.order_index < maxOrder) {
      const nextGovernorate = governorates?.find(g => g.order_index === governorate.order_index + 1)
      if (nextGovernorate) {
        orderMutation.mutate({ id: governorate.id, newOrder: governorate.order_index + 1 })
        orderMutation.mutate({ id: nextGovernorate.id, newOrder: nextGovernorate.order_index - 1 })
      }
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
          const hasReferences = await checkGovernorateHasReferences(id)
          if (hasReferences) {
            cannotDeleteIds.push(id)
            continue
          }
          await deleteGovernorate(id)
          deletedIds.push(id)
        } catch (error: any) {
          failedIds.push(id)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['governorates'] })
      
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
            ? (t('governorates.bulkDeletedSuccess') === 'governorates.bulkDeletedSuccess'
              ? language === 'ar'
                ? `تم حذف ${successCount} ${successCount === 1 ? 'محافظة بنجاح' : 'محافظات بنجاح'}`
                : `${successCount} ${successCount === 1 ? 'governorate has' : 'governorates have'} been deleted successfully.`
              : t('governorates.bulkDeletedSuccess'))
            : (t('governorates.bulkDeletedPartial') === 'governorates.bulkDeletedPartial'
              ? language === 'ar'
                ? `تم حذف ${successCount} من ${total} محافظة بنجاح`
                : `${successCount} of ${total} governorates deleted successfully.`
              : t('governorates.bulkDeletedPartial')),
          variant: 'success',
        })
      }
      
      if (cannotDeleteCount > 0) {
        toast({
          title: t('common.warning') === 'common.warning'
            ? (language === 'ar' ? 'تحذير' : 'Warning')
            : t('common.warning'),
          description: t('governorates.cannotDeleteSome') === 'governorates.cannotDeleteSome'
            ? language === 'ar'
              ? `لا يمكن حذف ${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'محافظة لأنها' : 'محافظات لأنها'} مستخدمة في عقارات أو مناطق أو مناطق مميزة`
              : `${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'governorate cannot' : 'governorates cannot'} be deleted because ${cannotDeleteCount === 1 ? 'it is' : 'they are'} used in properties, areas, or featured areas.`
            : t('governorates.cannotDeleteSome'),
          variant: 'destructive',
          duration: 6000,
        })
      }
      
      if (failedCount > 0) {
        toast({
          title: t('common.error') || 'Error',
          description: t('governorates.bulkDeleteFailed') || `Failed to delete ${failedCount} ${failedCount === 1 ? 'governorate' : 'governorates'}. Please try again. / فشل حذف ${failedCount} ${failedCount === 1 ? 'محافظة' : 'محافظات'}. يرجى المحاولة مرة أخرى`,
          variant: 'destructive',
        })
      }
      
      setBulkDeleteDialogOpen(false)
      setSelectedIdsForBulkDelete([])
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('governorates.bulkDeleteError') || 'An error occurred during bulk delete. Please try again. / حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مرة أخرى',
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
              {t('governorates.noPermission') || 'You do not have permission to view governorates.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'order_index',
      header: t('governorates.order') || 'Order',
      render: (_: any, row: Governorate) => (
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
              disabled={orderMutation.isPending || row.order_index === (governorates?.length ? Math.max(...governorates.map(g => g.order_index)) : 0)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'name_ar',
      header: t('governorates.nameAr') || 'Name (AR)',
      render: (value: string, row: Governorate) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('governorates.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('governorates.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('governorates.title') || 'Governorates'}</h1>
          <p className="text-muted-foreground">Manage governorates and regions</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingGovernorate(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('governorates.createGovernorate') || 'Create Governorate'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('governorates.title') || 'Governorates'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={governorates}
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
            actions={(governorate) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(governorate)}
                    disabled={updateMutation.isPending || deleteMutation.isPending || orderMutation.isPending}
                    title={t('governorates.editGovernorate') || 'Edit governorate'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(governorate)}
                    disabled={updateMutation.isPending || deleteMutation.isPending || orderMutation.isPending}
                    title={t('governorates.deleteGovernorate') || 'Delete governorate'}
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
              {editingGovernorate ? t('governorates.editGovernorate') : t('governorates.createGovernorate')}
            </DialogTitle>
            <DialogDescription>
              {editingGovernorate ? 'Update governorate information' : 'Create a new governorate'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('governorates.nameAr') || 'Name (Arabic)'}</Label>
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
                <Label htmlFor="name_en">{t('governorates.nameEn') || 'Name (English)'}</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_index">{t('governorates.order') || 'Order Index'}</Label>
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
                <Label htmlFor="status">{t('governorates.status') || 'Status'}</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('governorates.selectStatus') || 'Select status'} />
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
                  : editingGovernorate
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
              {t('governorates.deleteGovernorate') || `Are you sure you want to delete governorate "${governorateToDelete?.name_en || governorateToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGovernorateToDelete(null)}>
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
              {t('governorates.bulkDeleteConfirm') === 'governorates.bulkDeleteConfirm'
                ? language === 'ar'
                  ? `هل أنت متأكد من حذف ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'محافظة' : 'محافظات'}؟ لا يمكن التراجع عن هذا الإجراء`
                  : `Are you sure you want to delete ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'governorate' : 'governorates'}? This action cannot be undone.`
                : t('governorates.bulkDeleteConfirm')}
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

