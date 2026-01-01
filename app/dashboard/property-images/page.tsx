'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Star } from 'lucide-react'
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
import { ImageUpload } from '@/components/ui/image-upload'

const propertyImageSchema = z.object({
  property_id: z.string().uuid('Please select a property'),
  image_url: z.string().min(1, 'Image is required'),
  alt_text_ar: z.string().optional().nullable(),
  alt_text_en: z.string().optional().nullable(),
  order_index: z.number().int().min(0),
  is_primary: z.boolean().default(false),
})

type PropertyImageForm = z.infer<typeof propertyImageSchema>

interface PropertyImage {
  id: string
  property_id: string
  image_url: string
  alt_text_ar: string | null
  alt_text_en: string | null
  order_index: number
  is_primary: boolean
  created_at: string
  properties?: {
    title_ar: string
    title_en: string
    code: string | null
  }
}

async function getPropertyImages(propertyId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('property_images')
    .select(`
      *,
      properties (
        title_ar,
        title_en,
        code
      )
    `)
    .order('order_index', { ascending: true })

  if (propertyId && propertyId !== 'all') {
    query = query.eq('property_id', propertyId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as PropertyImage[]
}

async function getProperties() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('id, title_ar, title_en, code')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

async function createPropertyImage(imageData: PropertyImageForm) {
  const supabase = createClient()
  
  // If setting as primary, unset other primary images for this property
  if (imageData.is_primary) {
    await supabase
      .from('property_images')
      .update({ is_primary: false })
      .eq('property_id', imageData.property_id)
  }

  const { data, error } = await supabase
    .from('property_images')
    .insert(imageData)
    .select()
    .single()

  if (error) throw error
  return data
}

async function updatePropertyImage(id: string, imageData: Partial<PropertyImageForm>) {
  const supabase = createClient()
  
  // If setting as primary, unset other primary images for this property
  if (imageData.is_primary && imageData.property_id) {
    await supabase
      .from('property_images')
      .update({ is_primary: false })
      .eq('property_id', imageData.property_id)
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('property_images')
    .update(imageData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deletePropertyImage(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_images')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateImageOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_images')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function PropertyImagesPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<PropertyImage | null>(null)
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<PropertyImage | null>(null)

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
  })

  const { data: images, isLoading } = useQuery({
    queryKey: ['property_images', propertyFilter],
    queryFn: () => getPropertyImages(propertyFilter),
  })

  const createMutation = useMutation({
    mutationFn: createPropertyImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_images'] })
      setIsDialogOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PropertyImageForm> }) =>
      updatePropertyImage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_images'] })
      setIsDialogOpen(false)
      setEditingImage(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePropertyImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_images'] })
      setDeleteDialogOpen(false)
      setImageToDelete(null)
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateImageOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_images'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PropertyImageForm>({
    resolver: zodResolver(propertyImageSchema),
    defaultValues: {
      order_index: 0,
      is_primary: false,
    },
  })

  const isPrimary = watch('is_primary')

  const onSubmit = (data: PropertyImageForm) => {
    if (editingImage) {
      updateMutation.mutate({ id: editingImage.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (image: PropertyImage) => {
    setEditingImage(image)
    setValue('property_id', image.property_id)
    setValue('image_url', image.image_url)
    setValue('alt_text_ar', image.alt_text_ar || '')
    setValue('alt_text_en', image.alt_text_en || '')
    setValue('order_index', image.order_index)
    setValue('is_primary', image.is_primary)
    setIsDialogOpen(true)
  }

  const handleDelete = (image: PropertyImage) => {
    setImageToDelete(image)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (imageToDelete) {
      deleteMutation.mutate(imageToDelete.id)
    }
  }

  const handleMoveUp = (image: PropertyImage) => {
    if (image.order_index > 0) {
      const prevImage = images?.find((img) => 
        img.property_id === image.property_id && 
        img.order_index === image.order_index - 1
      )
      if (prevImage) {
        orderMutation.mutate({ id: image.id, newOrder: image.order_index - 1 })
        orderMutation.mutate({ id: prevImage.id, newOrder: prevImage.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (image: PropertyImage) => {
    const maxOrder = images?.filter(img => img.property_id === image.property_id)
      .length ? Math.max(...images!.filter(img => img.property_id === image.property_id).map(img => img.order_index)) : 0
    if (image.order_index < maxOrder) {
      const nextImage = images?.find((img) => 
        img.property_id === image.property_id && 
        img.order_index === image.order_index + 1
      )
      if (nextImage) {
        orderMutation.mutate({ id: image.id, newOrder: image.order_index + 1 })
        orderMutation.mutate({ id: nextImage.id, newOrder: nextImage.order_index - 1 })
      }
    }
  }

  const canCreate = profile?.role === 'admin' || profile?.role === 'sales'
  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator'
  const canDelete = profile?.role === 'admin'

  const columns = [
    {
      key: 'order_index',
      header: t('common.order') || 'Order',
      sortable: true,
      render: (_: any, row: PropertyImage) => (
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
      key: 'image_url',
      header: t('common.image') || 'Image',
      render: (value: string) => (
        <img
          src={value}
          alt="Property"
          className="w-20 h-16 object-cover rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100?text=No+Image'
          }}
        />
      ),
    },
    {
      key: 'property_id',
      header: t('properties.title') || 'Property',
      sortable: true,
      render: (_: any, row: PropertyImage) => {
        const property = row.properties
        return property ? (
          <div>
            <div className="font-medium">{property.title_en || property.title_ar}</div>
            {property.code && (
              <div className="text-sm text-muted-foreground">Code: {property.code}</div>
            )}
          </div>
        ) : '-'
      },
    },
    {
      key: 'alt_text_en',
      header: t('common.altText') || 'Alt Text',
      render: (value: string | null, row: PropertyImage) => (
        <div>
          <div className="font-medium">{value || row.alt_text_ar || '-'}</div>
          {row.alt_text_ar && value && (
            <div className="text-sm text-muted-foreground">{row.alt_text_ar}</div>
          )}
        </div>
      ),
    },
    {
      key: 'is_primary',
      header: t('propertyImages.isPrimary') || 'Primary',
      sortable: true,
      render: (value: boolean) => (
        value ? <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /> : '-'
      ),
    },
    {
      key: 'created_at',
      header: t('common.createdAt') || 'Created At',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  const filters = [
    {
      key: 'property_id',
      label: t('properties.title') || 'Property',
      type: 'select' as const,
      options: [
        { value: 'all', label: t('common.all') || 'All' },
        ...(properties?.map((prop: any) => ({
          value: prop.id,
          label: `${prop.title_en || prop.title_ar}${prop.code ? ` (${prop.code})` : ''}`,
        })) || []),
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propertyImages.title') || 'Property Images'}</h1>
          <p className="text-muted-foreground">Manage property images and galleries</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingImage(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('propertyImages.createImage') || 'Add Image'}
          </Button>
        )}
      </div>

      {/* Property Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="property-filter">{t('properties.title') || 'Filter by Property'}</Label>
            <Select
              value={propertyFilter}
              onValueChange={setPropertyFilter}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Properties'}</SelectItem>
                {properties?.map((prop: any) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.title_en || prop.title_ar} {prop.code ? `(${prop.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('propertyImages.title') || 'Property Images'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={images}
            columns={columns}
            isLoading={isLoading}
            searchKey={['alt_text_en', 'alt_text_ar']}
            searchPlaceholder={t('common.search')}
            filters={filters}
            actions={(image) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(image)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(image)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingImage ? t('propertyImages.editImage') || 'Edit Image' : t('propertyImages.createImage') || 'Add Image'}
            </DialogTitle>
            <DialogDescription>
              {editingImage ? 'Update image information' : 'Add a new image to a property'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property_id">{t('properties.title') || 'Property'} *</Label>
              <Select
                onValueChange={(value) => setValue('property_id', value)}
                value={watch('property_id') || ''}
                disabled={createMutation.isPending || updateMutation.isPending || !!editingImage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((prop: any) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.title_en || prop.title_ar} {prop.code ? `(${prop.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.property_id && (
                <p className="text-sm text-destructive">{errors.property_id.message}</p>
              )}
            </div>

            <ImageUpload
              value={watch('image_url') || undefined}
              onChange={(url) => setValue('image_url', url || '')}
              bucket="property-images"
              maxSize={10}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            {errors.image_url && (
              <p className="text-sm text-destructive">{errors.image_url.message}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="alt_text_ar">{t('common.altTextAr') || 'Alt Text (Arabic)'}</Label>
                <Input
                  id="alt_text_ar"
                  {...register('alt_text_ar')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alt_text_en">{t('common.altTextEn') || 'Alt Text (English)'}</Label>
                <Input
                  id="alt_text_en"
                  {...register('alt_text_en')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_index">{t('common.order') || 'Order'}</Label>
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

              <div className="flex items-center space-x-2 pt-8">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={isPrimary}
                  onChange={(e) => setValue('is_primary', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                <Label htmlFor="is_primary">{t('propertyImages.isPrimary') || 'Set as Primary Image'}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingImage(null)
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
              {t('common.delete') || 'Are you sure you want to delete this image? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setImageToDelete(null)}>
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

