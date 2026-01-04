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

const facilitySchema = z.object({
  name_ar: z.string().min(1, 'Arabic name is required'),
  name_en: z.string().min(1, 'English name is required'),
  status: z.enum(['active', 'inactive']),
})

type FacilityForm = z.infer<typeof facilitySchema>

interface PropertyFacility {
  id: string
  name_ar: string
  name_en: string
  status: string
  created_at: string
  updated_at: string
}

async function getFacilities() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_facilities')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PropertyFacility[]
}

async function createFacility(facilityData: FacilityForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_facilities')
    .insert(facilityData)
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateFacility(id: string, facilityData: Partial<FacilityForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_facilities')
    .update(facilityData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function checkFacilityHasProperties(facilityId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_property_facilities')
    .select('property_id')
    .eq('facility_id', facilityId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
}

async function deleteFacility(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_facilities')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function PropertyFacilitiesPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFacility, setEditingFacility] = useState<PropertyFacility | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [facilityToDelete, setFacilityToDelete] = useState<PropertyFacility | null>(null)

  const { data: facilities, isLoading } = useQuery({
    queryKey: ['property-facilities'],
    queryFn: getFacilities,
  })

  const createMutation = useMutation({
    mutationFn: createFacility,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-facilities'] })
      setIsDialogOpen(false)
      setEditingFacility(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      await ActivityLogger.create('property_facility', data.id, data.name_en || data.name_ar)
      const facilityName = data?.name_en || data?.name_ar || 'Facility'
      const message = t('propertyFacilities.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', facilityName) : `Property facility "${facilityName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFacilities.createError') || 'Failed to create property facility',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FacilityForm> }) =>
      updateFacility(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-facilities'] })
      setIsDialogOpen(false)
      const previousFacility = editingFacility
      setEditingFacility(null)
      reset({
        name_ar: '',
        name_en: '',
        status: 'active',
      })
      // Log activity
      if (previousFacility) {
        await ActivityLogger.update(
          'property_facility',
          data.id,
          data.name_en || data.name_ar,
          previousFacility,
          data
        )
      }
      const facilityName = data?.name_en || data?.name_ar || previousFacility?.name_en || previousFacility?.name_ar || 'Facility'
      const message = t('propertyFacilities.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', facilityName) : `Property facility "${facilityName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFacilities.updateError') || 'Failed to update property facility',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFacility,
    onSuccess: async (_, deletedId) => {
      const deletedFacility = facilityToDelete || facilities?.find(f => f.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['property-facilities'] })
      setDeleteDialogOpen(false)
      setFacilityToDelete(null)
      // Log activity
      if (deletedFacility) {
        await ActivityLogger.delete('property_facility', deletedFacility.id, deletedFacility.name_en || deletedFacility.name_ar)
      }
      const deletedName = deletedFacility?.name_en || deletedFacility?.name_ar || 'Facility'
      const message = t('propertyFacilities.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Property facility "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFacilities.deleteError') || 'Failed to delete property facility',
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
  } = useForm<FacilityForm>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name_ar: '',
      name_en: '',
      status: 'active',
    },
  })

  const selectedStatus = watch('status')

  const onSubmit = (data: FacilityForm) => {
    if (editingFacility) {
      updateMutation.mutate({ id: editingFacility.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (facility: PropertyFacility) => {
    setEditingFacility(facility)
    reset({
      name_ar: facility.name_ar,
      name_en: facility.name_en,
      status: facility.status as 'active' | 'inactive',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (facility: PropertyFacility) => {
    setFacilityToDelete(facility)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!facilityToDelete) return

    try {
      const hasProperties = await checkFacilityHasProperties(facilityToDelete.id)
      
      if (hasProperties) {
        toast({
          title: t('common.error') || 'Error',
          description: t('propertyFacilities.cannotDeleteHasProperties') || `This property facility cannot be deleted because it is used in one or more properties. Please remove it from all properties before deleting.`,
          variant: 'destructive',
          duration: 5000,
        })
        setDeleteDialogOpen(false)
        setFacilityToDelete(null)
        return
      }

      deleteMutation.mutate(facilityToDelete.id)
    } catch (error: any) {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyFacilities.checkError') || 'Failed to verify if property facility is used in properties. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingFacility(null)
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
      header: t('propertyFacilities.nameAr') || 'Name (AR)',
      render: (value: string, row: PropertyFacility) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.name_en}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('propertyFacilities.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('propertyFacilities.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propertyFacilities.title') || 'Property Facilities'}</h1>
          <p className="text-muted-foreground">Manage property facilities and amenities</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingFacility(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('propertyFacilities.createFacility') || 'Create Facility'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('propertyFacilities.title') || 'Property Facilities'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={facilities}
            columns={columns}
            isLoading={isLoading}
            searchKey="name_ar"
            searchPlaceholder={t('common.search')}
            actions={(facility) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(facility)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyFacilities.editFacility') || 'Edit property facility'}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(facility)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    title={t('propertyFacilities.deleteFacility') || 'Delete property facility'}
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
              {editingFacility ? t('propertyFacilities.editFacility') : t('propertyFacilities.createFacility')}
            </DialogTitle>
            <DialogDescription>
              {editingFacility ? 'Update facility information' : 'Create a new facility'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('propertyFacilities.nameAr') || 'Name (Arabic)'}</Label>
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
                <Label htmlFor="name_en">{t('propertyFacilities.nameEn') || 'Name (English)'}</Label>
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
              <Label htmlFor="status">{t('propertyFacilities.status') || 'Status'}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive', { shouldValidate: true })}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('propertyFacilities.selectStatus') || 'Select status'} />
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
                  : editingFacility
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
              {t('propertyFacilities.deleteFacility') || `Are you sure you want to delete property facility "${facilityToDelete?.name_en || facilityToDelete?.name_ar}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFacilityToDelete(null)}>
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

