'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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

async function createFinishingType(finishingTypeData: FinishingTypeForm) {
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
  const { data, error } = await supabase
    .from('property_finishing_types')
    .update(finishingTypeData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
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
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFinishingType, setEditingFinishingType] = useState<PropertyFinishingType | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [finishingTypeToDelete, setFinishingTypeToDelete] = useState<PropertyFinishingType | null>(null)

  const { data: finishingTypes, isLoading } = useQuery({
    queryKey: ['property-finishing-types'],
    queryFn: getFinishingTypes,
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

  const confirmDelete = () => {
    if (finishingTypeToDelete) {
      deleteMutation.mutate(finishingTypeToDelete.id)
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

  const canCreate = profile?.role === 'admin' || profile?.role === 'moderator'
  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator'
  const canDelete = profile?.role === 'admin'

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
            searchKey="name_ar"
            searchPlaceholder={t('common.search')}
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
    </div>
  )
}

