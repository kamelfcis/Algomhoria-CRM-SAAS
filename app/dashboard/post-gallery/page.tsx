'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { useToast } from '@/hooks/use-toast'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
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

const postGallerySchema = z.object({
  post_id: z.string().uuid('Please select a post'),
  image_url: z.string().min(1, 'Image is required'),
  alt_text_ar: z.string().optional().nullable(),
  alt_text_en: z.string().optional().nullable(),
  order_index: z.number().int().min(0),
})

type PostGalleryForm = z.infer<typeof postGallerySchema>

interface PostGalleryImage {
  id: string
  post_id: string
  image_url: string
  alt_text_ar: string | null
  alt_text_en: string | null
  order_index: number
  created_at: string
  posts?: {
    title_ar: string
    title_en: string
  }
}

async function getPostGalleryImages(postId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('post_gallery')
    .select(`
      *,
      posts (
        title_ar,
        title_en
      )
    `)
    .order('order_index', { ascending: true })

  if (postId && postId !== 'all') {
    query = query.eq('post_id', postId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as PostGalleryImage[]
}

async function getPosts() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, title_ar, title_en')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

async function createPostGalleryImage(imageData: PostGalleryForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_gallery')
    .insert(imageData)
    .select()
    .single()

  if (error) throw error
  return data
}

async function updatePostGalleryImage(id: string, imageData: Partial<PostGalleryForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_gallery')
    .update(imageData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deletePostGalleryImage(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('post_gallery')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function updateImageOrder(id: string, newOrder: number) {
  const supabase = createClient()
  const { error } = await supabase
    .from('post_gallery')
    .update({ order_index: newOrder })
    .eq('id', id)

  if (error) throw error
}

export default function PostGalleryPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<PostGalleryImage | null>(null)
  const [postFilter, setPostFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<PostGalleryImage | null>(null)

  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
  })

  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('post_gallery')

  const { data: images, isLoading } = useQuery({
    queryKey: ['post_gallery', postFilter],
    queryFn: () => getPostGalleryImages(postFilter),
    enabled: canView, // Only fetch if user has view permission
  })

  const createMutation = useMutation({
    mutationFn: createPostGalleryImage,
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['post_gallery'] })
      setIsDialogOpen(false)
      reset()
      // Log activity
      if (data?.id) {
        const postTitle = posts?.find(p => p.id === data.post_id)?.title_en || posts?.find(p => p.id === data.post_id)?.title_ar || 'Unknown Post'
        await ActivityLogger.create('post_gallery_image', data.id, `Image for post: ${postTitle}`)
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('postGallery.createdSuccessfully') || 'Image has been added to the gallery successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('postGallery.createError') || 'Failed to add image. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PostGalleryForm> }) =>
      updatePostGalleryImage(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['post_gallery'] })
      setIsDialogOpen(false)
      const previousImage = editingImage
      setEditingImage(null)
      reset()
      // Log activity
      if (previousImage && data?.id) {
        const postTitle = posts?.find(p => p.id === data.post_id || previousImage.post_id)?.title_en || posts?.find(p => p.id === data.post_id || previousImage.post_id)?.title_ar || 'Unknown Post'
        await ActivityLogger.update(
          'post_gallery_image',
          data.id,
          `Image for post: ${postTitle}`,
          previousImage,
          data
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('postGallery.updatedSuccessfully') || 'Image has been updated successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('postGallery.updateError') || 'Failed to update image. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePostGalleryImage,
    onSuccess: async () => {
      const deletedImage = imageToDelete
      queryClient.invalidateQueries({ queryKey: ['post_gallery'] })
      setDeleteDialogOpen(false)
      setImageToDelete(null)
      // Log activity
      if (deletedImage) {
        const postTitle = posts?.find(p => p.id === deletedImage.post_id)?.title_en || posts?.find(p => p.id === deletedImage.post_id)?.title_ar || 'Unknown Post'
        await ActivityLogger.delete('post_gallery_image', deletedImage.id, `Image for post: ${postTitle}`)
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('postGallery.deletedSuccessfully') || 'Image has been removed from the gallery successfully.',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('postGallery.deleteError') || 'Failed to delete image. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const orderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) =>
      updateImageOrder(id, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post_gallery'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PostGalleryForm>({
    resolver: zodResolver(postGallerySchema),
    defaultValues: {
      order_index: 0,
    },
  })

  const onSubmit = (data: PostGalleryForm) => {
    if (editingImage) {
      updateMutation.mutate({ id: editingImage.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (image: PostGalleryImage) => {
    setEditingImage(image)
    setValue('post_id', image.post_id)
    setValue('image_url', image.image_url)
    setValue('alt_text_ar', image.alt_text_ar || '')
    setValue('alt_text_en', image.alt_text_en || '')
    setValue('order_index', image.order_index)
    setIsDialogOpen(true)
  }

  const handleDelete = (image: PostGalleryImage) => {
    setImageToDelete(image)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (imageToDelete) {
      deleteMutation.mutate(imageToDelete.id)
    }
  }

  const handleMoveUp = (image: PostGalleryImage) => {
    if (image.order_index > 0) {
      const prevImage = images?.find((img) => 
        img.post_id === image.post_id && 
        img.order_index === image.order_index - 1
      )
      if (prevImage) {
        orderMutation.mutate({ id: image.id, newOrder: image.order_index - 1 })
        orderMutation.mutate({ id: prevImage.id, newOrder: prevImage.order_index + 1 })
      }
    }
  }

  const handleMoveDown = (image: PostGalleryImage) => {
    const maxOrder = images?.filter(img => img.post_id === image.post_id)
      .length ? Math.max(...images!.filter(img => img.post_id === image.post_id).map(img => img.order_index)) : 0
    if (image.order_index < maxOrder) {
      const nextImage = images?.find((img) => 
        img.post_id === image.post_id && 
        img.order_index === image.order_index + 1
      )
      if (nextImage) {
        orderMutation.mutate({ id: image.id, newOrder: image.order_index + 1 })
        orderMutation.mutate({ id: nextImage.id, newOrder: nextImage.order_index - 1 })
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
              {t('postGallery.noPermission') || 'You do not have permission to view post gallery.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'order_index',
      header: t('common.order') || 'Order',
      sortable: true,
      render: (_: any, row: PostGalleryImage) => (
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
          alt="Post Gallery"
          className="w-20 h-16 object-cover rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100?text=No+Image'
          }}
        />
      ),
    },
    {
      key: 'post_id',
      header: t('posts.title') || 'Post',
      sortable: true,
      render: (_: any, row: PostGalleryImage) => {
        const post = row.posts
        return post ? (
          <div>
            <div className="font-medium">{post.title_en || post.title_ar}</div>
            {post.title_ar && post.title_en && (
              <div className="text-sm text-muted-foreground">{post.title_ar}</div>
            )}
          </div>
        ) : '-'
      },
    },
    {
      key: 'alt_text_en',
      header: t('common.altText') || 'Alt Text',
      render: (value: string | null, row: PostGalleryImage) => (
        <div>
          <div className="font-medium">{value || row.alt_text_ar || '-'}</div>
          {row.alt_text_ar && value && (
            <div className="text-sm text-muted-foreground">{row.alt_text_ar}</div>
          )}
        </div>
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
      key: 'post_id',
      label: t('posts.title') || 'Post',
      type: 'select' as const,
      options: [
        { value: 'all', label: t('common.all') || 'All' },
        ...(posts?.map((post: any) => ({
          value: post.id,
          label: `${post.title_en || post.title_ar}${post.title_ar && post.title_en ? ` / ${post.title_ar}` : ''}`,
        })) || []),
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('postGallery.title') || 'Post Gallery'}</h1>
          <p className="text-muted-foreground">Manage post gallery images</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingImage(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('postGallery.createImage') || 'Add Image'}
          </Button>
        )}
      </div>

      {/* Post Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="post-filter">{t('posts.title') || 'Filter by Post'}</Label>
            <Select
              value={postFilter}
              onValueChange={setPostFilter}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Posts'}</SelectItem>
                {posts?.map((post: any) => (
                  <SelectItem key={post.id} value={post.id}>
                    {post.title_en || post.title_ar} {post.title_ar && post.title_en ? ` / ${post.title_ar}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('postGallery.title') || 'Post Gallery'}</CardTitle>
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
              {editingImage ? t('postGallery.editImage') || 'Edit Image' : t('postGallery.createImage') || 'Add Image'}
            </DialogTitle>
            <DialogDescription>
              {editingImage ? 'Update image information' : 'Add a new image to a post gallery'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post_id">{t('posts.title') || 'Post'} *</Label>
              <Select
                onValueChange={(value) => setValue('post_id', value)}
                value={watch('post_id') || ''}
                disabled={createMutation.isPending || updateMutation.isPending || !!editingImage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select post" />
                </SelectTrigger>
                <SelectContent>
                  {posts?.map((post: any) => (
                    <SelectItem key={post.id} value={post.id}>
                      {post.title_en || post.title_ar} {post.title_ar && post.title_en ? ` / ${post.title_ar}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.post_id && (
                <p className="text-sm text-destructive">{errors.post_id.message}</p>
              )}
            </div>

            <ImageUpload
              value={watch('image_url') || undefined}
              onChange={(url) => setValue('image_url', url || '')}
              bucket="post-gallery"
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
              {t('postGallery.deleteImage') || `Are you sure you want to delete this image from the gallery? This action cannot be undone.`}
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

