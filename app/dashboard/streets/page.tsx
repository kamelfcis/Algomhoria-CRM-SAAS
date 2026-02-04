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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { PageSkeleton } from '@/components/ui/page-skeleton'

const streetSchema = z.object({
  area_id: z.string().uuid('Area is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type StreetForm = z.infer<typeof streetSchema>

interface Street {
  id: string
  area_id: string
  name_ar: string
  name_en: string
  order_index: number
  status: string
  created_at: string
  updated_at: string
  areas?: {
    name_ar: string
    name_en: string
    governorates?: {
      name_ar: string
      name_en: string
    }
  }
}

async function getStreets() {
  const supabase = createClient()
  const allStreets: any[] = []
  const batchSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('streets')
      .select('*, areas(name_ar, name_en, governorates(name_ar, name_en))')
      .order('order_index', { ascending: true })
      .range(offset, offset + batchSize - 1)

    if (error) throw error

    if (data && data.length > 0) {
      allStreets.push(...data)
      offset += batchSize
      // If we got fewer records than batchSize, we've reached the end
      hasMore = data.length === batchSize
    } else {
      hasMore = false
    }
  }

  return allStreets
}

async function getAreas() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('areas')
    .select('id, name_ar, name_en, governorates(name_ar, name_en)')
    .eq('status', 'active')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

async function checkNameExists(nameEn: string, nameAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let queryEn = supabase.from('streets').select('id').eq('name_en', nameEn).limit(1)
  if (excludeId) queryEn = queryEn.neq('id', excludeId)
  const { data: dataEn, error: errorEn } = await queryEn
  let queryAr = supabase.from('streets').select('id').eq('name_ar', nameAr).limit(1)
  if (excludeId) queryAr = queryAr.neq('id', excludeId)
  const { data: dataAr, error: errorAr } = await queryAr
  if (errorEn || errorAr) {
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createStreet(streetData: StreetForm) {
  const nameExists = await checkNameExists(streetData.name_en, streetData.name_ar)
  if (nameExists) {
    throw new Error('A street with this name already exists. Please use a different name.')
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('streets')
    .insert(streetData)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateStreet(id: string, streetData: Partial<StreetForm>) {
  const supabase = createClient()
  if (streetData.name_en || streetData.name_ar) {
    const { data: currentStreet } = await supabase
      .from('streets')
      .select('name_en, name_ar')
      .eq('id', id)
      .single()
    const nameEn = streetData.name_en ?? currentStreet?.name_en ?? ''
    const nameAr = streetData.name_ar ?? currentStreet?.name_ar ?? ''
    const nameExists = await checkNameExists(nameEn, nameAr, id)
    if (nameExists) {
      throw new Error('A street with this name already exists. Please use a different name.')
    }
  }
  const { data, error } = await supabase
    .from('streets')
    .update(streetData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function checkStreetHasProperties(streetId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('street_id', streetId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deleteStreet(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('streets')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateStreetOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('streets')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function StreetsPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStreet, setEditingStreet] = useState<Street | null>(null)
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [streetToDelete, setStreetToDelete] = useState<Street | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectedIdsForBulkDelete, setSelectedIdsForBulkDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('streets')

  const { data: streets, isLoading } = useQuery({
    queryKey: ['streets'],
    queryFn: getStreets,
    enabled: canView, // Only fetch if user has view permission
  })

  const { data: areas } = useQuery({
    queryKey: ['areas-for-streets'],
    queryFn: getAreas,
  })

  const createMutation = useMutation({
    mutationFn: createStreet,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['streets'] })
      setIsDialogOpen(false)
      reset()
      // Log activity
      await ActivityLogger.create('street', data.id, data.name_en || data.name_ar)
      const streetName = data?.name_en || data?.name_ar || 'Street'
      const message = t('streets.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', streetName) : `Street "${streetName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('streets.createError') || 'Failed to create street. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StreetForm> }) =>
      updateStreet(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['streets'] })
      setIsDialogOpen(false)
      const previousStreet = editingStreet
      setEditingStreet(null)
      reset()
      // Log activity
      if (previousStreet) {
        await ActivityLogger.update(
          'street',
          data.id,
          data.name_en || data.name_ar,
          previousStreet,
          data
        )
      }
      const streetName = data?.name_en || data?.name_ar || previousStreet?.name_en || previousStreet?.name_ar || 'Street'
      const message = t('streets.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', streetName) : `Street "${streetName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('streets.updateError') || 'Failed to update street. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStreet,
    onSuccess: async (_, deletedId) => {
      const deletedStreet = streetToDelete || streets?.find(s => s.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['streets'] })
      setDeleteDialogOpen(false)
      setStreetToDelete(null)
      // Log activity
      if (deletedStreet) {
        await ActivityLogger.delete('street', deletedStreet.id, deletedStreet.name_en || deletedStreet.name_ar)
      }
      const deletedName = deletedStreet?.name_en || deletedStreet?.name_ar || 'Street'
      const message = t('streets.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Street "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('streets.deleteError') || 'Failed to delete street. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateStreetOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streets'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<StreetForm>({
    resolver: zodResolver(streetSchema),
    defaultValues: {
      order_index: 0,
      status: 'active',
    },
  })

  const selectedArea = watch('area_id')

  const onSubmit = (data: StreetForm) => {
    if (editingStreet) {
      updateMutation.mutate({ id: editingStreet.id, data })
    } else {
      // Set order_index to max + 1 if not editing
      const maxOrder = streets?.length ? Math.max(...streets.map(s => s.order_index)) : -1
      createMutation.mutate({ ...data, order_index: maxOrder + 1 })
    }
  }

  const handleEdit = (street: any) => {
    setEditingStreet(street)
    setValue('area_id', street.area_id)
    setValue('name_ar', street.name_ar)
    setValue('name_en', street.name_en)
    setValue('order_index', street.order_index)
    setValue('status', street.status as any)
    setIsDialogOpen(true)
  }

  const handleDelete = (street: Street) => {
    setStreetToDelete(street)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!streetToDelete) return

    try {
      const hasProperties = await checkStreetHasProperties(streetToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('streets.cannotDeleteHasProperties') || `This street cannot be deleted because it has one or more properties associated with it. Please remove or reassign all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setStreetToDelete(null)
        return
      }

      deleteMutation.mutate(streetToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('streets.checkError') || 'Failed to verify if street has properties. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleMoveUp = (street: any) => {
    if (street.order_index > 0) {
      const prevStreet = streets?.find(s => s.order_index === street.order_index - 1 && s.area_id === street.area_id)
      if (prevStreet) {
        orderMutation.mutate({ id: street.id, newOrder: street.order_index - 1 })
        orderMutation.mutate({ id: prevStreet.id, newOrder: prevStreet.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (street: any) => {
    const streetsInSameArea = streets?.filter(s => s.area_id === street.area_id) || []
    const maxOrder = streetsInSameArea.length > 0
      ? Math.max(...streetsInSameArea.map(s => s.order_index)) 
      : 0
    if (street.order_index < maxOrder) {
      const nextStreet = streets?.find(s => s.order_index === street.order_index + 1 && s.area_id === street.area_id)
      if (nextStreet) {
        orderMutation.mutate({ id: street.id, newOrder: street.order_index + 1 })
        orderMutation.mutate({ id: nextStreet.id, newOrder: nextStreet.order_index - 1 })
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
          const hasProperties = await checkStreetHasProperties(id)
          if (hasProperties) {
            cannotDeleteIds.push(id)
            continue
          }
          await deleteStreet(id)
          deletedIds.push(id)
        } catch (error: any) {
          failedIds.push(id)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['streets'] })
      
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
            ? (t('streets.bulkDeletedSuccess') === 'streets.bulkDeletedSuccess'
              ? language === 'ar'
                ? `تم حذف ${successCount} ${successCount === 1 ? 'شارع بنجاح' : 'شوارع بنجاح'}`
                : `${successCount} ${successCount === 1 ? 'street has' : 'streets have'} been deleted successfully.`
              : t('streets.bulkDeletedSuccess'))
            : (t('streets.bulkDeletedPartial') === 'streets.bulkDeletedPartial'
              ? language === 'ar'
                ? `تم حذف ${successCount} من ${total} شارع بنجاح`
                : `${successCount} of ${total} streets deleted successfully.`
              : t('streets.bulkDeletedPartial')),
          variant: 'success',
        })
      }
      
      if (cannotDeleteCount > 0) {
        toast({
          title: t('common.warning') === 'common.warning'
            ? (language === 'ar' ? 'تحذير' : 'Warning')
            : t('common.warning'),
          description: t('streets.cannotDeleteSome') === 'streets.cannotDeleteSome'
            ? language === 'ar'
              ? `لا يمكن حذف ${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'شارع لأنه' : 'شوارع لأنها'} مستخدم ${cannotDeleteCount === 1 ? 'في' : 'في'} عقارات`
              : `${cannotDeleteCount} ${cannotDeleteCount === 1 ? 'street cannot' : 'streets cannot'} be deleted because ${cannotDeleteCount === 1 ? 'it is' : 'they are'} used in properties.`
            : t('streets.cannotDeleteSome'),
          variant: 'destructive',
          duration: 6000,
        })
      }
      
      if (failedCount > 0) {
        toast({
          title: t('common.error') || 'Error',
          description: t('streets.bulkDeleteFailed') || `Failed to delete ${failedCount} ${failedCount === 1 ? 'street' : 'streets'}. Please try again. / فشل حذف ${failedCount} ${failedCount === 1 ? 'شارع' : 'شوارع'}. يرجى المحاولة مرة أخرى`,
          variant: 'destructive',
        })
      }
      
      setBulkDeleteDialogOpen(false)
      setSelectedIdsForBulkDelete([])
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('streets.bulkDeleteError') || 'An error occurred during bulk delete. Please try again. / حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مرة أخرى',
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
              {t('streets.noPermission') || 'You do not have permission to view streets.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter streets
  const filteredStreets = streets?.filter((street) => {
    if (areaFilter !== 'all' && street.area_id !== areaFilter) return false
    return true
  })

  const columns = [
    {
      key: 'order_index',
      header: t('streets.order') || 'Order',
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
              disabled={orderMutation.isPending}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'area_id',
      header: t('streets.area') || 'Area',
      render: (_: any, row: any) => {
        const area = row.areas
        const governorate = area?.governorates
        return area ? (
          <div>
            <div className="font-medium">{area.name_ar || area.name_en}</div>
            {governorate && (
              <div className="text-sm text-muted-foreground">
                {governorate.name_ar || governorate.name_en}
              </div>
            )}
          </div>
        ) : '-'
      },
    },
    {
      key: 'name_ar',
      header: t('streets.nameAr') || 'Name (AR)',
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('streets.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('streets.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('streets.title') || 'Streets'}</h1>
          <p className="text-muted-foreground">Manage streets and locations</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingStreet(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('streets.createStreet') || 'Create Street'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Area</Label>
              <SearchableSelect
                value={areaFilter}
                onValueChange={setAreaFilter}
                placeholder={t('streets.area') || 'Select Area'}
                searchPlaceholder={t('common.search') || 'Search areas...'}
                className="w-48"
                options={[
                  { value: 'all', label: t('common.all') || 'All Areas' },
                  ...(areas?.map((area: any) => ({
                    value: area.id,
                    label: `${area.name_ar} (${area.name_en})`
                  })) || [])
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('streets.title') || 'Streets'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredStreets}
            columns={columns}
            isLoading={isLoading}
            searchKey={['name_ar', 'name_en', 'status', 'areas.name_ar', 'areas.name_en', 'areas.governorates.name_ar', 'areas.governorates.name_en']}
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
            actions={(street) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(street)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(street)}
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
              {editingStreet ? t('streets.editStreet') : t('streets.createStreet')}
            </DialogTitle>
            <DialogDescription>
              {editingStreet ? 'Update street information' : 'Create a new street'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area_id">{t('streets.area') || 'Area'}</Label>
              <SearchableSelect
                value={selectedArea}
                onValueChange={(value) => setValue('area_id', value, { shouldValidate: true })}
                placeholder={t('streets.area') || 'Select area'}
                searchPlaceholder={t('common.search') || 'Search areas...'}
                disabled={createMutation.isPending || updateMutation.isPending}
                options={areas?.map((area: any) => ({
                  value: area.id,
                  label: `${area.name_ar} (${area.name_en})`
                })) || []}
              />
              {errors.area_id && (
                <p className="text-sm text-destructive">{errors.area_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('streets.nameAr') || 'Name (Arabic)'}</Label>
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
                <Label htmlFor="name_en">{t('streets.nameEn') || 'Name (English)'}</Label>
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
                <Label htmlFor="order_index">{t('streets.order') || 'Order Index'}</Label>
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
                <Label htmlFor="status">{t('streets.status') || 'Status'}</Label>
                <Select
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingStreet?.status || 'active'}
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
                  setEditingStreet(null)
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
              {t('streets.deleteStreet') || `Are you sure you want to delete street "${streetToDelete?.name_en || streetToDelete?.name_ar || 'Untitled Street'}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStreetToDelete(null)}>
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
              {t('streets.bulkDeleteConfirm') === 'streets.bulkDeleteConfirm'
                ? language === 'ar'
                  ? `هل أنت متأكد من حذف ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'شارع' : 'شوارع'}؟ لا يمكن التراجع عن هذا الإجراء`
                  : `Are you sure you want to delete ${selectedIdsForBulkDelete.length} ${selectedIdsForBulkDelete.length === 1 ? 'street' : 'streets'}? This action cannot be undone.`
                : t('streets.bulkDeleteConfirm')}
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

