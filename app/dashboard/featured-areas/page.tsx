'use client'

import { useState, useEffect } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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

const featuredAreaSchema = z.object({
  governorate_id: z.string().uuid('Governorate is required'),
  area_id: z.string().uuid('Area is required'),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type FeaturedAreaForm = z.infer<typeof featuredAreaSchema>

interface FeaturedArea {
  id: string
  governorate_id: string
  area_id: string
  projects_order: any
  order_index: number
  status: string
  created_at: string
  updated_at: string
  governorates?: {
    name_ar: string
    name_en: string
  }
  areas?: {
    name_ar: string
    name_en: string
  }
}

async function getFeaturedAreas() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('featured_areas')
    .select('*, governorates(name_ar, name_en), areas(name_ar, name_en)')
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

async function getAreasByGovernorate(governorateId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('areas')
    .select('id, name_ar, name_en')
    .eq('governorate_id', governorateId)
    .eq('status', 'active')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

async function checkAreaExists(areaId: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  let query = supabase
    .from('featured_areas')
    .select('id')
    .eq('area_id', areaId)
    .limit(1)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return Boolean(data && data.length > 0)
}

async function createFeaturedArea(areaData: FeaturedAreaForm) {
  // Check if area already exists
  const areaExists = await checkAreaExists(areaData.area_id)
  if (areaExists) {
    throw new Error('This area is already in the featured areas list. Please select a different area.')
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('featured_areas')
    .insert({
      ...areaData,
      projects_order: null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateFeaturedArea(id: string, areaData: Partial<FeaturedAreaForm>) {
  // Check if area_id is being updated and if it already exists
  if (areaData.area_id) {
    const areaExists = await checkAreaExists(areaData.area_id, id)
    if (areaExists) {
      throw new Error('This area is already in the featured areas list. Please select a different area.')
    }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('featured_areas')
    .update(areaData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteFeaturedArea(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('featured_areas')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateFeaturedAreaOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('featured_areas')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function FeaturedAreasPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<FeaturedArea | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<FeaturedArea | null>(null)
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('')

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('featured_areas')

  const { data: featuredAreas, isLoading } = useQuery({
    queryKey: ['featured-areas'],
    queryFn: getFeaturedAreas,
    enabled: canView, // Only fetch if user has view permission
  })

  const { data: governorates } = useQuery({
    queryKey: ['governorates-for-featured'],
    queryFn: getGovernorates,
  })

  const { data: areas } = useQuery({
    queryKey: ['areas-for-featured', selectedGovernorate],
    queryFn: () => getAreasByGovernorate(selectedGovernorate),
    enabled: !!selectedGovernorate,
  })

  const createMutation = useMutation({
    mutationFn: createFeaturedArea,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['featured-areas'] })
      setIsDialogOpen(false)
      reset()
      setSelectedGovernorate('')
      // Get area name from the created data or fetch it
      const areaName = data?.areas?.name_en || data?.areas?.name_ar || 'Featured Area'
      await ActivityLogger.create('featured_area', data.id, areaName)
      const message = t('featuredAreas.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', areaName) : `Featured area "${areaName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('featuredAreas.createError') || 'Failed to create featured area. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeaturedAreaForm> }) =>
      updateFeaturedArea(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['featured-areas'] })
      setIsDialogOpen(false)
      const previousArea = editingArea
      setEditingArea(null)
      reset()
      setSelectedGovernorate('')
      // Log activity
      if (previousArea) {
        const areaName = data?.areas?.name_en || data?.areas?.name_ar || previousArea?.areas?.name_en || previousArea?.areas?.name_ar || 'Featured Area'
        await ActivityLogger.update(
          'featured_area',
          data.id,
          areaName,
          previousArea,
          data
        )
        const message = t('featuredAreas.updatedSuccessfully')
        toast({
          title: t('common.success') || 'Success',
          description: message ? message.replace('{name}', areaName) : `Featured area "${areaName}" has been updated successfully.`,
          variant: 'success',
          duration: 5000,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('featuredAreas.updateError') || 'Failed to update featured area. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFeaturedArea,
    onSuccess: async (_, deletedId) => {
      const deletedArea = areaToDelete || featuredAreas?.find(a => a.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['featured-areas'] })
      setDeleteDialogOpen(false)
      setAreaToDelete(null)
      // Log activity
      if (deletedArea) {
        const areaName = deletedArea?.areas?.name_en || deletedArea?.areas?.name_ar || 'Featured Area'
        await ActivityLogger.delete('featured_area', deletedArea.id, areaName)
        const message = t('featuredAreas.deletedSuccessfully')
        toast({
          title: t('common.success') || 'Success',
          description: message ? message.replace('{name}', areaName) : `Featured area "${areaName}" has been deleted successfully.`,
          variant: 'success',
          duration: 5000,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('featuredAreas.deleteError') || 'Failed to delete featured area. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateFeaturedAreaOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-areas'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FeaturedAreaForm>({
    resolver: zodResolver(featuredAreaSchema),
    defaultValues: {
      order_index: 0,
      status: 'active',
    },
  })

  const watchedGovernorate = watch('governorate_id')
  const watchedArea = watch('area_id')

  // Update areas when governorate changes
  useEffect(() => {
    if (watchedGovernorate) {
      setSelectedGovernorate(watchedGovernorate)
    }
  }, [watchedGovernorate])

  const onSubmit = (data: FeaturedAreaForm) => {
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, data })
    } else {
      // Set order_index to max + 1 if not editing
      const maxOrder = featuredAreas?.length ? Math.max(...featuredAreas.map(a => a.order_index)) : -1
      createMutation.mutate({ ...data, order_index: maxOrder + 1 })
    }
  }

  const handleEdit = (area: any) => {
    setEditingArea(area)
    setValue('governorate_id', area.governorate_id)
    setValue('area_id', area.area_id)
    setValue('order_index', area.order_index)
    setValue('status', area.status as any)
    setSelectedGovernorate(area.governorate_id)
    setIsDialogOpen(true)
  }

  const handleDelete = (area: FeaturedArea) => {
    setAreaToDelete(area)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (areaToDelete) {
      deleteMutation.mutate(areaToDelete.id)
    }
  }

  const handleMoveUp = (area: any) => {
    if (area.order_index > 0) {
      const prevArea = featuredAreas?.find(a => a.order_index === area.order_index - 1)
      if (prevArea) {
        orderMutation.mutate({ id: area.id, newOrder: area.order_index - 1 })
        orderMutation.mutate({ id: prevArea.id, newOrder: prevArea.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (area: any) => {
    const maxOrder = featuredAreas?.length ? Math.max(...featuredAreas.map(a => a.order_index)) : 0
    if (area.order_index < maxOrder) {
      const nextArea = featuredAreas?.find(a => a.order_index === area.order_index + 1)
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
              {t('featuredAreas.noPermission') || 'You do not have permission to view featured areas.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'order_index',
      header: t('featuredAreas.order') || 'Order',
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
              disabled={orderMutation.isPending || row.order_index === (featuredAreas?.length ? Math.max(...featuredAreas.map(a => a.order_index)) : 0)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'governorate_id',
      header: t('featuredAreas.location') || 'Location',
      render: (_: any, row: any) => {
        const governorate = row.governorates
        const area = row.areas
        return (
          <div>
            {governorate && (
              <div className="font-medium">{governorate.name_ar || governorate.name_en}</div>
            )}
            {area && (
              <div className="text-sm text-muted-foreground">{area.name_ar || area.name_en}</div>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: t('featuredAreas.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('featuredAreas.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('featuredAreas.title') || 'Featured Areas'}</h1>
          <p className="text-muted-foreground">Manage featured areas displayed on homepage</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingArea(null)
            reset()
            setSelectedGovernorate('')
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('featuredAreas.createArea') || 'Create Featured Area'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('featuredAreas.title') || 'Featured Areas'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={featuredAreas}
            columns={columns}
            isLoading={isLoading}
            searchKey={['governorates.name_ar', 'governorates.name_en', 'areas.name_ar', 'areas.name_en', 'status']}
            searchPlaceholder={t('common.search')}
            actions={(area) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(area)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(area.id)}
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
              {editingArea ? t('featuredAreas.editArea') : t('featuredAreas.createArea')}
            </DialogTitle>
            <DialogDescription>
              {editingArea ? 'Update featured area information' : 'Create a new featured area'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="governorate_id">{t('featuredAreas.governorate') || 'Governorate'}</Label>
              <SearchableSelect
                value={watchedGovernorate || ''}
                onValueChange={(value) => {
                  setValue('governorate_id', value, { shouldValidate: true })
                  setSelectedGovernorate(value)
                  setValue('area_id', '', { shouldValidate: true })
                }}
                placeholder={t('featuredAreas.governorate') || 'Select governorate'}
                searchPlaceholder={t('common.search') || 'Search governorates...'}
                disabled={createMutation.isPending || updateMutation.isPending}
                options={governorates?.map((gov: any) => ({
                  value: gov.id,
                  label: `${gov.name_ar} (${gov.name_en})`,
                })) || []}
              />
              {errors.governorate_id && (
                <p className="text-sm text-destructive">{errors.governorate_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_id">{t('featuredAreas.area') || 'Area'}</Label>
              <SearchableSelect
                value={watchedArea || ''}
                onValueChange={(value) => setValue('area_id', value, { shouldValidate: true })}
                placeholder={t('featuredAreas.area') || 'Select area'}
                searchPlaceholder={t('common.search') || 'Search areas...'}
                disabled={createMutation.isPending || updateMutation.isPending || !selectedGovernorate}
                options={areas?.map((area: any) => ({
                  value: area.id,
                  label: `${area.name_ar} (${area.name_en})`,
                })) || []}
              />
              {errors.area_id && (
                <p className="text-sm text-destructive">{errors.area_id.message}</p>
              )}
              {!selectedGovernorate && (
                <p className="text-sm text-muted-foreground">Please select a governorate first</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_index">{t('featuredAreas.order') || 'Order Index'}</Label>
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
                <Label htmlFor="status">{t('featuredAreas.status') || 'Status'}</Label>
                <Select
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingArea?.status || 'active'}
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
                  setEditingArea(null)
                  reset()
                  setSelectedGovernorate('')
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
              {t('featuredAreas.deleteArea') || 'Are you sure you want to delete this featured area? This action cannot be undone.'}
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

