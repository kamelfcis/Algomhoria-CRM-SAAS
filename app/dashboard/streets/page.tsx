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
  const { data, error } = await supabase
    .from('streets')
    .select('*, areas(name_ar, name_en, governorates(name_ar, name_en))')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data as any[]
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

async function createStreet(streetData: StreetForm) {
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
  const { data, error } = await supabase
    .from('streets')
    .update(streetData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
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
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStreet, setEditingStreet] = useState<Street | null>(null)
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [streetToDelete, setStreetToDelete] = useState<Street | null>(null)

  const { data: streets, isLoading } = useQuery({
    queryKey: ['streets'],
    queryFn: getStreets,
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
  } = useForm<StreetForm>({
    resolver: zodResolver(streetSchema),
    defaultValues: {
      order_index: 0,
      status: 'active',
    },
  })

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

  const confirmDelete = () => {
    if (streetToDelete) {
      deleteMutation.mutate(streetToDelete.id)
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

  const canCreate = profile?.role === 'admin' || profile?.role === 'moderator'
  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator'
  const canDelete = profile?.role === 'admin'

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
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas?.map((area: any) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name_ar} ({area.name_en})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            searchKey="name_ar"
            searchPlaceholder={t('common.search')}
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
              <Select
                onValueChange={(value) => setValue('area_id', value)}
                defaultValue={editingStreet?.area_id}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {areas?.map((area: any) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name_ar} ({area.name_en})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  )
}

