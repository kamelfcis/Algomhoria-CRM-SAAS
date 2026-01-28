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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { PageSkeleton } from '@/components/ui/page-skeleton'

const areaSchema = z.object({
  governorate_id: z.string().uuid('Governorate is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type AreaForm = z.infer<typeof areaSchema>

interface Area {
  id: string
  governorate_id: string
  name_ar: string
  name_en: string
  order_index: number
  status: string
  created_at: string
  updated_at: string
  governorates?: {
    name_ar: string
    name_en: string
  }
}

async function getAreas() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('areas')
    .select('*, governorates(name_ar, name_en)')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data as any[]
}

async function getGovernorates() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('governorates')
    .select('id, name_ar, name_en')
    .eq('status', 'active')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

async function createArea(areaData: AreaForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('areas')
    .insert(areaData)
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateArea(id: string, areaData: Partial<AreaForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('areas')
    .update(areaData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function checkAreaHasReferences(areaId: string) {
  const supabase = createClient()
  
  // Check properties
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('id')
    .eq('area_id', areaId)
    .limit(1)

  if (propertiesError) throw propertiesError
  if (properties && properties.length > 0) return true

  // Check streets
  const { data: streets, error: streetsError } = await supabase
    .from('streets')
    .select('id')
    .eq('area_id', areaId)
    .limit(1)

  if (streetsError) throw streetsError
  if (streets && streets.length > 0) return true

  // Check featured_areas
  const { data: featuredAreas, error: featuredAreasError } = await supabase
    .from('featured_areas')
    .select('id')
    .eq('area_id', areaId)
    .limit(1)

  if (featuredAreasError) throw featuredAreasError
  if (featuredAreas && featuredAreas.length > 0) return true

  return false
}

async function deleteArea(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('areas')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateAreaOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('areas')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function AreasPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null)
  const [governorateFilter, setGovernorateFilter] = useState<string>('all')
  
  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('areas')

  const { data: areas, isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: getAreas,
    enabled: canView, // Only fetch if user has view permission
  })

  const { data: governorates } = useQuery({
    queryKey: ['governorates-for-select'],
    queryFn: getGovernorates,
  })

  const createMutation = useMutation({
    mutationFn: createArea,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      setIsDialogOpen(false)
      setEditingArea(null)
      reset({
        governorate_id: '',
        name_ar: '',
        name_en: '',
        order_index: 0,
        status: 'active',
      })
      // Log activity
      await ActivityLogger.create('area', data.id, data.name_en || data.name_ar)
      const areaName = data?.name_en || data?.name_ar || 'Area'
      const message = t('areas.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', areaName) : `Area "${areaName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('areas.createError') || 'Failed to create area',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AreaForm> }) =>
      updateArea(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      setIsDialogOpen(false)
      const previousArea = editingArea
      setEditingArea(null)
      reset({
        governorate_id: '',
        name_ar: '',
        name_en: '',
        order_index: 0,
        status: 'active',
      })
      // Log activity
      if (previousArea) {
        await ActivityLogger.update(
          'area',
          data.id,
          data.name_en || data.name_ar,
          previousArea,
          data
        )
      }
      const areaName = data?.name_en || data?.name_ar || previousArea?.name_en || previousArea?.name_ar || 'Area'
      const message = t('areas.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', areaName) : `Area "${areaName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('areas.updateError') || 'Failed to update area',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteArea,
    onSuccess: async (_, deletedId) => {
      const deletedArea = areaToDelete || areas?.find(a => a.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      setDeleteDialogOpen(false)
      setAreaToDelete(null)
      // Log activity
      if (deletedArea) {
        await ActivityLogger.delete('area', deletedArea.id, deletedArea.name_en || deletedArea.name_ar)
      }
      const deletedName = deletedArea?.name_en || deletedArea?.name_ar || 'Area'
      const message = t('areas.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Area "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('areas.deleteError') || 'Failed to delete area',
        variant: 'destructive',
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateAreaOrder(id, newOrder),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      const updatedArea = areas?.find(a => a.id === variables.id)
      const areaName = updatedArea?.name_en || updatedArea?.name_ar || 'Area'
      const message = t('areas.orderUpdated')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', areaName) : `Order updated successfully for area "${areaName}".`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('areas.orderUpdateError') || 'Failed to update order',
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
  } = useForm<AreaForm>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      governorate_id: '',
      name_ar: '',
      name_en: '',
      order_index: 0,
      status: 'active',
    },
  })

  const selectedStatus = watch('status')
  const selectedGovernorate = watch('governorate_id')

  const onSubmit = (data: AreaForm) => {
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, data })
    } else {
      // Set order_index to max + 1 if not editing
      const maxOrder = areas?.length ? Math.max(...areas.map(a => a.order_index)) : -1
      createMutation.mutate({ ...data, order_index: maxOrder + 1 })
    }
  }

  const handleEdit = (area: any) => {
    setEditingArea(area)
    reset({
      governorate_id: area.governorate_id,
      name_ar: area.name_ar,
      name_en: area.name_en,
      order_index: area.order_index,
      status: area.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (area: Area) => {
    setAreaToDelete(area)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!areaToDelete) return

    try {
      const hasReferences = await checkAreaHasReferences(areaToDelete.id)
      
      if (hasReferences) {
        toast({
          title: t('common.error') || 'Error',
          description: t('areas.cannotDeleteHasReferences') || `This area cannot be deleted because it has one or more properties, streets, or featured areas associated with it. Please remove or reassign all references before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setAreaToDelete(null)
        return
      }

      deleteMutation.mutate(areaToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('areas.checkError') || 'Failed to verify if area has references. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingArea(null)
      reset({
        governorate_id: '',
        name_ar: '',
        name_en: '',
        order_index: 0,
        status: 'active',
      })
    }
  }

  const handleMoveUp = (area: any) => {
    if (area.order_index > 0) {
      const prevArea = areas?.find(a => a.order_index === area.order_index - 1 && a.governorate_id === area.governorate_id)
      if (prevArea) {
        orderMutation.mutate({ id: area.id, newOrder: area.order_index - 1 })
        orderMutation.mutate({ id: prevArea.id, newOrder: prevArea.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (area: any) => {
    const maxOrder = areas?.filter(a => a.governorate_id === editingArea?.governorate_id).length 
      ? Math.max(...areas.filter(a => a.governorate_id === editingArea?.governorate_id).map(a => a.order_index)) 
      : 0
    if (area.order_index < maxOrder) {
      const nextArea = areas?.find(a => a.order_index === area.order_index + 1 && a.governorate_id === area.governorate_id)
      if (nextArea) {
        orderMutation.mutate({ id: area.id, newOrder: area.order_index + 1 })
        orderMutation.mutate({ id: nextArea.id, newOrder: nextArea.order_index - 1 })
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
              {t('areas.noPermission') || 'You do not have permission to view areas.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter areas
  const filteredAreas = areas?.filter((area) => {
    if (governorateFilter !== 'all' && area.governorate_id !== governorateFilter) return false
    return true
  })

  const columns = [
    {
      key: 'order_index',
      header: t('areas.order') || 'Order',
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
      key: 'governorate_id',
      header: t('areas.governorate') || 'Governorate',
      render: (_: any, row: any) => {
        const governorate = row.governorates
        return governorate ? (
          <div>
            <div className="font-medium">{governorate.name_ar || governorate.name_en}</div>
          </div>
        ) : '-'
      },
    },
    {
      key: 'name_ar',
      header: t('areas.nameAr') || 'Name (AR)',
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('areas.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('areas.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('areas.title') || 'Areas'}</h1>
          <p className="text-muted-foreground">Manage areas and districts</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingArea(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('areas.createArea') || 'Create Area'}
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
              <Label>Governorate</Label>
              <SearchableSelect
                value={governorateFilter}
                onValueChange={setGovernorateFilter}
                placeholder={t('areas.governorate') || 'Select Governorate'}
                searchPlaceholder={t('common.search') || 'Search governorates...'}
                className="w-48"
                options={[
                  { value: 'all', label: t('common.all') || 'All Governorates' },
                  ...(governorates?.map((gov: any) => ({
                    value: gov.id,
                    label: `${gov.name_ar} (${gov.name_en})`
                  })) || [])
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('areas.title') || 'Areas'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredAreas}
            columns={columns}
            isLoading={isLoading}
            searchKey="name_ar"
            searchPlaceholder={t('common.search')}
            actions={(area) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(area)}
                    disabled={updateMutation.isPending || deleteMutation.isPending || orderMutation.isPending}
                    title={t('areas.editArea') || 'Edit area'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(area)}
                    disabled={updateMutation.isPending || deleteMutation.isPending || orderMutation.isPending}
                    title={t('areas.deleteArea') || 'Delete area'}
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
              {editingArea ? t('areas.editArea') : t('areas.createArea')}
            </DialogTitle>
            <DialogDescription>
              {editingArea ? 'Update area information' : 'Create a new area'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="governorate_id">{t('areas.governorate') || 'Governorate'}</Label>
              <SearchableSelect
                value={selectedGovernorate}
                onValueChange={(value) => setValue('governorate_id', value, { shouldValidate: true })}
                placeholder={t('areas.selectGovernorate') || 'Select governorate'}
                searchPlaceholder={t('common.search') || 'Search governorates...'}
                disabled={createMutation.isPending || updateMutation.isPending}
                options={governorates?.map((gov: any) => ({
                  value: gov.id,
                  label: `${gov.name_ar} (${gov.name_en})`
                })) || []}
              />
              {errors.governorate_id && (
                <p className="text-sm text-destructive">{errors.governorate_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('areas.nameAr') || 'Name (Arabic)'}</Label>
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
                <Label htmlFor="name_en">{t('areas.nameEn') || 'Name (English)'}</Label>
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
                <Label htmlFor="order_index">{t('areas.order') || 'Order Index'}</Label>
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
                <Label htmlFor="status">{t('areas.status') || 'Status'}</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('areas.selectStatus') || 'Select status'} />
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
                  : editingArea
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
              {t('areas.deleteArea') || `Are you sure you want to delete area "${areaToDelete?.name_en || areaToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAreaToDelete(null)}>
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

