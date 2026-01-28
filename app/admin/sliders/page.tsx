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
import { ImageUpload } from '@/components/ui/image-upload'
import { PageSkeleton } from '@/components/ui/page-skeleton'

const sliderSchema = z.object({
  title_ar: z.string().optional().nullable(),
  title_en: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  link_url: z.string().url().optional().nullable(),
  order_index: z.number().int().min(0),
  status: z.enum(['active', 'inactive']),
})

type SliderForm = z.infer<typeof sliderSchema>

interface Slider {
  id: string
  title_ar: string | null
  title_en: string | null
  description_ar: string | null
  description_en: string | null
  image_url: string
  link_url: string | null
  order_index: number
  status: string
  created_at: string
  updated_at: string
}

async function getSliders() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sliders')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data as Slider[]
}

async function createSlider(sliderData: SliderForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sliders')
    .insert({
      ...sliderData,
      title_ar: sliderData.title_ar || null,
      title_en: sliderData.title_en || null,
      description_ar: sliderData.description_ar || null,
      description_en: sliderData.description_en || null,
      link_url: sliderData.link_url || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateSlider(id: string, sliderData: Partial<SliderForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sliders')
    .update({
      ...sliderData,
      title_ar: sliderData.title_ar || null,
      title_en: sliderData.title_en || null,
      description_ar: sliderData.description_ar || null,
      description_en: sliderData.description_en || null,
      link_url: sliderData.link_url || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteSlider(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('sliders')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateSliderOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('sliders')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function SlidersPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSlider, setEditingSlider] = useState<Slider | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sliderToDelete, setSliderToDelete] = useState<Slider | null>(null)

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('sliders')

  const { data: sliders, isLoading } = useQuery({
    queryKey: ['sliders'],
    queryFn: getSliders,
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createSlider,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] })
      setIsDialogOpen(false)
      reset()
      // Log activity
      if (data?.id) {
        const sliderTitle = data.title_en || data.title_ar || 'Untitled Slider'
        await ActivityLogger.create('slider', data.id, `Slider: ${sliderTitle}`)
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('sliders.createdSuccessfully') || `Slider "${data.title_en || data.title_ar || 'Untitled Slider'}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('sliders.createError') || 'Failed to create slider. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SliderForm> }) =>
      updateSlider(id, data),
    onSuccess: async (data) => {
      const previousSlider = editingSlider
      queryClient.invalidateQueries({ queryKey: ['sliders'] })
      setIsDialogOpen(false)
      setEditingSlider(null)
      reset()
      // Log activity
      if (previousSlider && data?.id) {
        const sliderTitle = data.title_en || data.title_ar || 'Untitled Slider'
        await ActivityLogger.update(
          'slider',
          data.id,
          `Slider: ${sliderTitle}`,
          previousSlider,
          data
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('sliders.updatedSuccessfully') || `Slider "${data.title_en || data.title_ar || 'Untitled Slider'}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('sliders.updateError') || 'Failed to update slider. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSlider,
    onSuccess: async () => {
      const deletedSlider = sliderToDelete
      const deletedName = deletedSlider?.title_en || deletedSlider?.title_ar || 'Untitled Slider'
      queryClient.invalidateQueries({ queryKey: ['sliders'] })
      setDeleteDialogOpen(false)
      setSliderToDelete(null)
      // Log activity
      if (deletedSlider) {
        await ActivityLogger.delete('slider', deletedSlider.id, `Slider: ${deletedName}`)
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('sliders.deletedSuccessfully') || `Slider "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('sliders.deleteError') || 'Failed to delete slider. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateSliderOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sliders'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SliderForm>({
    resolver: zodResolver(sliderSchema),
    defaultValues: {
      order_index: 0,
      status: 'active',
    },
  })

  const onSubmit = (data: SliderForm) => {
    if (editingSlider) {
      updateMutation.mutate({ id: editingSlider.id, data })
    } else {
      // Set order_index to max + 1 if not editing
      const maxOrder = sliders?.length ? Math.max(...sliders.map(s => s.order_index)) : -1
      createMutation.mutate({ ...data, order_index: maxOrder + 1 })
    }
  }

  const handleEdit = (slider: Slider) => {
    setEditingSlider(slider)
    setValue('title_ar', slider.title_ar || '')
    setValue('title_en', slider.title_en || '')
    setValue('description_ar', slider.description_ar || '')
    setValue('description_en', slider.description_en || '')
    setValue('image_url', slider.image_url)
    setValue('link_url', slider.link_url || '')
    setValue('order_index', slider.order_index)
    setValue('status', slider.status as any)
    setIsDialogOpen(true)
  }

  const handleDelete = (slider: Slider) => {
    setSliderToDelete(slider)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (sliderToDelete) {
      deleteMutation.mutate(sliderToDelete.id)
    }
  }

  const handleMoveUp = (slider: Slider) => {
    if (slider.order_index > 0) {
      const prevSlider = sliders?.find(s => s.order_index === slider.order_index - 1)
      if (prevSlider) {
        orderMutation.mutate({ id: slider.id, newOrder: slider.order_index - 1 })
        orderMutation.mutate({ id: prevSlider.id, newOrder: prevSlider.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (slider: Slider) => {
    const maxOrder = sliders?.length ? Math.max(...sliders.map(s => s.order_index)) : 0
    if (slider.order_index < maxOrder) {
      const nextSlider = sliders?.find(s => s.order_index === slider.order_index + 1)
      if (nextSlider) {
        orderMutation.mutate({ id: slider.id, newOrder: slider.order_index + 1 })
        orderMutation.mutate({ id: nextSlider.id, newOrder: nextSlider.order_index - 1 })
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
              {t('sliders.noPermission') || 'You do not have permission to view sliders.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'order_index',
      header: t('sliders.order') || 'Order',
      render: (_: any, row: Slider) => (
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
              disabled={orderMutation.isPending || row.order_index === (sliders?.length ? Math.max(...sliders.map(s => s.order_index)) : 0)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'image_url',
      header: t('sliders.image') || 'Image',
      render: (value: string) => (
        <img
          src={value}
          alt="Slider"
          className="w-20 h-12 object-cover rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100?text=No+Image'
          }}
        />
      ),
    },
    {
      key: 'title_ar',
      header: t('sliders.titleAr') || 'Title (AR)',
      render: (value: string | null, row: Slider) => (
        <div>
          <div className="font-medium">{value || row.title_en || '-'}</div>
          {row.title_en && value && (
            <div className="text-sm text-muted-foreground">{row.title_en}</div>
          )}
        </div>
      ),
    },
    {
      key: 'link_url',
      header: t('sliders.link') || 'Link',
      render: (value: string | null) => (
        value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {value.length > 30 ? value.substring(0, 30) + '...' : value}
          </a>
        ) : '-'
      ),
    },
    {
      key: 'status',
      header: t('sliders.status') || 'Status',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('sliders.title') || 'Sliders'}</h1>
          <p className="text-muted-foreground">Manage homepage sliders and carousel</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingSlider(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('sliders.createSlider') || 'Create Slider'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sliders.title') || 'Sliders'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={sliders}
            columns={columns}
            isLoading={isLoading}
            searchKey="title_ar"
            searchPlaceholder={t('common.search')}
            actions={(slider) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(slider)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(slider)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSlider ? t('sliders.editSlider') : t('sliders.createSlider')}
            </DialogTitle>
            <DialogDescription>
              {editingSlider ? 'Update slider information' : 'Create a new slider'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_ar">{t('sliders.titleAr') || 'Title (Arabic)'}</Label>
                <Input
                  id="title_ar"
                  {...register('title_ar')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title_en">{t('sliders.titleEn') || 'Title (English)'}</Label>
                <Input
                  id="title_en"
                  {...register('title_en')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description_ar">{t('sliders.descriptionAr') || 'Description (Arabic)'}</Label>
                <textarea
                  id="description_ar"
                  {...register('description_ar')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_en">{t('sliders.descriptionEn') || 'Description (English)'}</Label>
                <textarea
                  id="description_en"
                  {...register('description_en')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {t('sliders.image') || 'Image'} <span className="text-red-500">*</span>
              </Label>
              <ImageUpload
                value={watch('image_url') || undefined}
                onChange={(url) => setValue('image_url', url || '')}
                bucket="site-assets"
                maxSize={5}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_url">{t('sliders.linkUrl') || 'Link URL (Optional)'}</Label>
              <Input
                id="link_url"
                type="url"
                {...register('link_url')}
                disabled={createMutation.isPending || updateMutation.isPending}
                placeholder="https://example.com"
              />
              {errors.link_url && (
                <p className="text-sm text-destructive">{errors.link_url.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_index">{t('sliders.order') || 'Order Index'} <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="status">{t('sliders.status') || 'Status'} <span className="text-red-500">*</span></Label>
                <Select
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingSlider?.status || 'active'}
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
                  setEditingSlider(null)
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
              {t('sliders.deleteSlider') || `Are you sure you want to delete slider "${sliderToDelete?.title_en || sliderToDelete?.title_ar || 'Untitled Slider'}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSliderToDelete(null)}>
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

