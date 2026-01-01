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

const propertySchema = z.object({
  code: z.string().optional(),
  title_ar: z.string().min(1, 'Title (Arabic) is required'),
  title_en: z.string().min(1, 'Title (English) is required'),
  description_ar: z.string().optional(),
  description_en: z.string().optional(),
  address_ar: z.string().optional(),
  address_en: z.string().optional(),
  governorate_id: z.string().uuid().optional().nullable(),
  area_id: z.string().uuid().optional().nullable(),
  street_id: z.string().uuid().optional().nullable(),
  property_type_id: z.string().uuid().optional().nullable(),
  price: z.number().optional().nullable(),
  size: z.number().optional().nullable(),
  baths: z.number().int().optional().nullable(),
  floor_no: z.number().int().optional().nullable(),
  status: z.enum(['pending', 'active', 'inactive', 'rejected', 'deleted', 'expired', 'rented', 'sold']),
  is_featured: z.boolean().default(false),
  phone_number: z.string().optional(),
})

type PropertyForm = z.infer<typeof propertySchema>

interface Property {
  id: string
  code: string | null
  title_ar: string
  title_en: string
  description_ar: string | null
  description_en: string | null
  price: number | null
  size: number | null
  status: string
  is_featured: boolean
  property_type_id: string | null
  governorate_id: string | null
  area_id: string | null
  created_at: string
}

async function getProperties() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Property[]
}

async function getMasterData() {
  const supabase = createClient()
  
  const [governorates, propertyTypes] = await Promise.all([
    supabase.from('governorates').select('id, name_ar, name_en').eq('status', 'active').order('order_index'),
    supabase.from('property_types').select('id, name_ar, name_en').eq('status', 'active'),
  ])

  return {
    governorates: governorates.data || [],
    propertyTypes: propertyTypes.data || [],
  }
}

async function getAreas(governorateId: string) {
  if (!governorateId) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('areas')
    .select('id, name_ar, name_en')
    .eq('governorate_id', governorateId)
    .eq('status', 'active')
    .order('order_index')
  return data || []
}

async function getStreets(areaId: string) {
  if (!areaId) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('streets')
    .select('id, name_ar, name_en')
    .eq('area_id', areaId)
    .eq('status', 'active')
    .order('order_index')
  return data || []
}

async function createProperty(propertyData: PropertyForm) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('properties')
    .insert({
      ...propertyData,
      governorate_id: propertyData.governorate_id || null,
      area_id: propertyData.area_id || null,
      street_id: propertyData.street_id || null,
      property_type_id: propertyData.property_type_id || null,
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateProperty(id: string, propertyData: Partial<PropertyForm>) {
  const supabase = createClient()
  const updateData = {
    ...propertyData,
    governorate_id: propertyData.governorate_id || null,
    area_id: propertyData.area_id || null,
    street_id: propertyData.street_id || null,
    property_type_id: propertyData.property_type_id || null,
  }
  const { data, error } = await supabase
    .from('properties')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteProperty(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function PropertiesPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('none')
  const [selectedArea, setSelectedArea] = useState<string>('none')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null)

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
  })

  const { data: masterData } = useQuery({
    queryKey: ['properties-master-data'],
    queryFn: getMasterData,
  })

  const { data: areas } = useQuery({
    queryKey: ['areas', selectedGovernorate],
    queryFn: () => getAreas(selectedGovernorate === 'none' ? '' : selectedGovernorate),
    enabled: selectedGovernorate !== 'none',
  })

  const { data: streets } = useQuery({
    queryKey: ['streets', selectedArea],
    queryFn: () => getStreets(selectedArea === 'none' ? '' : selectedArea),
    enabled: selectedArea !== 'none',
  })

  const createMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setIsDialogOpen(false)
      reset()
      setSelectedGovernorate('none')
      setSelectedArea('none')
      // Log activity
      if (data?.id) {
        await ActivityLogger.create('property', data.id, data.title_en || data.title_ar || data.code || 'Untitled Property')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyForm> }) =>
      updateProperty(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setIsDialogOpen(false)
      const previousProperty = editingProperty
      setEditingProperty(null)
      reset()
      setSelectedGovernorate('none')
      setSelectedArea('none')
      // Log activity
      if (previousProperty && data?.id) {
        await ActivityLogger.update(
          'property',
          data.id,
          data.title_en || data.title_ar || data.code || 'Untitled Property',
          previousProperty,
          data
        )
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: async (_, deletedId) => {
      const deletedProperty = propertyToDelete || properties?.find(p => p.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setDeleteDialogOpen(false)
      setPropertyToDelete(null)
      // Log activity
      if (deletedProperty) {
        await ActivityLogger.delete(
          'property',
          deletedProperty.id,
          deletedProperty.title_en || deletedProperty.title_ar || deletedProperty.code || 'Untitled Property'
        )
      }
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PropertyForm>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      status: 'pending',
      is_featured: false,
    },
  })

  const isFeatured = watch('is_featured')

  const onSubmit = (data: PropertyForm) => {
    const submitData = {
      ...data,
      governorate_id: selectedGovernorate === 'none' ? undefined : selectedGovernorate,
      area_id: selectedArea === 'none' ? undefined : selectedArea,
    }
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleEdit = (property: Property) => {
    setEditingProperty(property)
    setValue('code', property.code || '')
    setValue('title_ar', property.title_ar)
    setValue('title_en', property.title_en)
    setValue('description_ar', property.description_ar || '')
    setValue('description_en', property.description_en || '')
    setValue('price', property.price || undefined)
    setValue('size', property.size || undefined)
    setValue('status', property.status as any)
    setValue('is_featured', property.is_featured)
    setValue('property_type_id', property.property_type_id || undefined)
    setValue('governorate_id', property.governorate_id || undefined)
    setSelectedGovernorate(property.governorate_id || 'none')
    setSelectedArea(property.area_id || 'none')
    setIsDialogOpen(true)
  }

  const handleDelete = (property: Property) => {
    setPropertyToDelete(property)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (propertyToDelete) {
      deleteMutation.mutate(propertyToDelete.id)
    }
  }

  const canCreate = profile?.role === 'admin' || profile?.role === 'sales'
  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator'
  const canDelete = profile?.role === 'admin'

  const columns = [
    {
      key: 'code',
      header: t('properties.code'),
      render: (value: string | null) => value || '-',
    },
    {
      key: 'title_en',
      header: t('properties.title_en'),
      render: (value: string, row: Property) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.title_ar}</div>
        </div>
      ),
    },
    {
      key: 'price',
      header: t('properties.price'),
      render: (value: number | null) => value ? `$${value.toLocaleString()}` : '-',
    },
    {
      key: 'status',
      header: t('properties.status'),
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'is_featured',
      header: t('properties.isFeatured'),
      render: (value: boolean) => (value ? '⭐' : '-'),
    },
    {
      key: 'created_at',
      header: 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('properties.title')}</h1>
          <p className="text-muted-foreground">Manage real estate properties</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingProperty(null)
            reset()
            setSelectedGovernorate('none')
            setSelectedArea('none')
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('properties.createProperty')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('properties.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={properties}
            columns={columns}
            isLoading={isLoading}
            searchKey="title_en"
            searchPlaceholder={t('common.search')}
            actions={(property) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(property)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(property)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProperty ? t('properties.editProperty') : t('properties.createProperty')}
            </DialogTitle>
            <DialogDescription>
              {editingProperty ? 'Update property information' : 'Create a new property'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t('properties.code')}</Label>
                <Input
                  id="code"
                  {...register('code')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('properties.status')}</Label>
                <Select
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingProperty?.status || 'pending'}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_ar">{t('properties.title_ar')}</Label>
                <Input
                  id="title_ar"
                  {...register('title_ar')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.title_ar && (
                  <p className="text-sm text-destructive">{errors.title_ar.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title_en">{t('properties.title_en')}</Label>
                <Input
                  id="title_en"
                  {...register('title_en')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.title_en && (
                  <p className="text-sm text-destructive">{errors.title_en.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description_ar">{t('properties.description_ar') || 'Description (Arabic)'}</Label>
                <textarea
                  id="description_ar"
                  {...register('description_ar')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_en">{t('properties.description_en') || 'Description (English)'}</Label>
                <textarea
                  id="description_en"
                  {...register('description_en')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="governorate_id">{t('properties.governorate')}</Label>
                <Select
                  value={selectedGovernorate}
                  onValueChange={(value) => {
                    setSelectedGovernorate(value)
                    setSelectedArea('none')
                    setValue('governorate_id', value === 'none' ? undefined : value)
                    setValue('area_id', undefined)
                    setValue('street_id', undefined)
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select governorate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Governorate</SelectItem>
                    {masterData?.governorates.map((gov: any) => (
                      <SelectItem key={gov.id} value={gov.id}>
                        {gov.name_en} / {gov.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_id">{t('properties.area')}</Label>
                <Select
                  value={selectedArea}
                  onValueChange={(value) => {
                    setSelectedArea(value)
                    setValue('area_id', value === 'none' ? undefined : value)
                    setValue('street_id', undefined)
                  }}
                  disabled={selectedGovernorate === 'none' || createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Area</SelectItem>
                    {areas?.map((area: any) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name_en} / {area.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_type_id">{t('properties.propertyType')}</Label>
                <Select
                  onValueChange={(value) => setValue('property_type_id', value === 'none' ? undefined : value)}
                  defaultValue={editingProperty?.property_type_id || 'none'}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Type</SelectItem>
                    {masterData?.propertyTypes.map((type: any) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name_en} / {type.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">{t('properties.price')}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">{t('properties.size') || 'Size (m²)'}</Label>
                <Input
                  id="size"
                  type="number"
                  step="0.01"
                  {...register('size', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baths">{t('properties.baths') || 'Baths'}</Label>
                <Input
                  id="baths"
                  type="number"
                  {...register('baths', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor_no">{t('properties.floorNo') || 'Floor No'}</Label>
                <Input
                  id="floor_no"
                  type="number"
                  {...register('floor_no', { valueAsNumber: true })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_featured"
                checked={isFeatured}
                onChange={(e) => setValue('is_featured', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_featured">{t('properties.isFeatured')}</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingProperty(null)
                  reset()
                  setSelectedGovernorate('none')
                  setSelectedArea('none')
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
              {t('properties.deleteProperty') || `Are you sure you want to delete property "${propertyToDelete?.title_en || propertyToDelete?.title_ar || propertyToDelete?.code || 'Untitled Property'}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>
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

