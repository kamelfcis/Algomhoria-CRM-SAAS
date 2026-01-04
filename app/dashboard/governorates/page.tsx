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

async function createGovernorate(governorateData: GovernorateForm) {
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
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGovernorate, setEditingGovernorate] = useState<Governorate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [governorateToDelete, setGovernorateToDelete] = useState<Governorate | null>(null)

  const { data: governorates, isLoading } = useQuery({
    queryKey: ['governorates'],
    queryFn: getGovernorates,
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

  const canCreate = profile?.role === 'admin' || profile?.role === 'moderator'
  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator'
  const canDelete = profile?.role === 'admin'

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
            searchKey="name_ar"
            searchPlaceholder={t('common.search')}
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
    </div>
  )
}

