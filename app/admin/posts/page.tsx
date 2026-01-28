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
import { Plus, Pencil, Trash2, Eye, Trash } from 'lucide-react'
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

const postSchema = z.object({
  title_ar: z.string().min(1, 'Title (Arabic) is required'),
  title_en: z.string().min(1, 'Title (English) is required'),
  content_ar: z.string().min(1, 'Content (Arabic) is required'),
  content_en: z.string().min(1, 'Content (English) is required'),
  category_id: z.string().uuid().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  status: z.enum(['draft', 'pending', 'active', 'inactive']),
  is_featured: z.boolean().default(false),
  is_breaking_news: z.boolean().default(false),
})

type PostForm = z.infer<typeof postSchema>

interface Post {
  id: string
  title_ar: string
  title_en: string
  content_ar: string
  content_en: string
  category_id: string | null
  author_id: string | null
  thumbnail_url: string | null
  cover_url: string | null
  status: string
  is_featured: boolean
  is_breaking_news: boolean
  published_at: string | null
  created_at: string
}

async function getPosts() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000) // Limit to prevent memory issues with large datasets

  if (error) throw error
  return data as Post[]
}

async function getCategories() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, title_ar, title_en')
    .eq('status', 'active')
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

async function checkTitleExists(titleEn: string, titleAr: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()
  
  // Check if title_en already exists
  let queryEn = supabase
    .from('posts')
    .select('id')
    .eq('title_en', titleEn)
    .limit(1)
  
  if (excludeId) {
    queryEn = queryEn.neq('id', excludeId)
  }
  
  const { data: dataEn, error: errorEn } = await queryEn
  
  // Check if title_ar already exists
  let queryAr = supabase
    .from('posts')
    .select('id')
    .eq('title_ar', titleAr)
    .limit(1)
  
  if (excludeId) {
    queryAr = queryAr.neq('id', excludeId)
  }
  
  const { data: dataAr, error: errorAr } = await queryAr
  
  if (errorEn || errorAr) {
    // If there's an error, still check the results
    const foundEn = Boolean(dataEn && dataEn.length > 0)
    const foundAr = Boolean(dataAr && dataAr.length > 0)
    return foundEn || foundAr
  }
  
  // Return true if either title exists
  return Boolean((dataEn && dataEn.length > 0) || (dataAr && dataAr.length > 0))
}

async function createPost(postData: PostForm) {
  // Check for duplicate titles
  const titleExists = await checkTitleExists(postData.title_en, postData.title_ar)
  if (titleExists) {
    throw new Error('A post with this title already exists. Please use a different title.')
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...postData,
      category_id: postData.category_id || null,
      thumbnail_url: postData.thumbnail_url || null,
      cover_url: postData.cover_url || null,
      author_id: user?.id || null,
    } as any)
    .select()
    .single()

  if (error) {
    // Handle database constraint errors
    const errorMessage = error.message || ''
    const errorCode = error.code || ''
    const errorDetails = error.details || ''
    
    // Check for unique constraint violations (PostgreSQL error code 23505)
    if (errorCode === '23505' || 
        errorMessage.includes('duplicate key') || 
        errorMessage.includes('unique constraint') ||
        errorMessage.includes('posts_title_en_key') ||
        errorMessage.includes('posts_title_ar_key') ||
        errorDetails.includes('title')) {
      throw new Error('A post with this title already exists. Please use a different title.')
    }
    throw error
  }
  return data
}

async function updatePost(id: string, postData: Partial<PostForm>) {
  // Check for duplicate titles if titles are being updated
  if (postData.title_en !== undefined || postData.title_ar !== undefined) {
    // Get current post to compare
    const supabase = createClient()
    const { data: currentPost } = await supabase
      .from('posts')
      .select('title_en, title_ar')
      .eq('id', id)
      .single()
    
    const titleEn = postData.title_en !== undefined ? postData.title_en : currentPost?.title_en
    const titleAr = postData.title_ar !== undefined ? postData.title_ar : currentPost?.title_ar
    
    if (titleEn && titleAr) {
      const titleExists = await checkTitleExists(titleEn, titleAr, id)
      if (titleExists) {
        throw new Error('A post with this title already exists. Please use a different title.')
      }
    }
  }

  const supabase = createClient()
  const updateData: any = {
    ...postData,
    category_id: postData.category_id || null,
  }
  const { data, error } = await supabase
    .from('posts')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // Handle database constraint errors
    const errorMessage = error.message || ''
    const errorCode = error.code || ''
    const errorDetails = error.details || ''
    
    // Check for unique constraint violations (PostgreSQL error code 23505)
    if (errorCode === '23505' || 
        errorMessage.includes('duplicate key') || 
        errorMessage.includes('unique constraint') ||
        errorMessage.includes('posts_title_en_key') ||
        errorMessage.includes('posts_title_ar_key') ||
        errorDetails.includes('title')) {
      throw new Error('A post with this title already exists. Please use a different title.')
    }
    throw error
  }
  return data
}

async function deletePost(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function PostsPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  
  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('posts')

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: getPosts,
    enabled: canView, // Only fetch if user has view permission
    staleTime: 30000, // Cache for 30 seconds - balance between freshness and performance
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes - categories don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  })

  const { toast } = useToast()

  const createMutation = useMutation({
    mutationFn: createPost,
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setIsDialogOpen(false)
      reset()
      // Log activity
      if (data?.id) {
        await ActivityLogger.create('post', data.id, data.title_en || data.title_ar || 'Untitled Post')
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('posts.createdSuccessfully') || 'Post has been created successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      const errorMsg = String(error?.message || '')
      const errorCode = String(error?.code || '')
      
      // Check if it's a duplicate title error
      const isDuplicateTitle = errorMsg.includes('title already exists') || 
                                errorMsg.includes('posts_title_en_key') ||
                                errorMsg.includes('posts_title_ar_key') ||
                                (errorMsg.includes('duplicate key') && errorMsg.includes('title')) ||
                                (errorCode === '23505' && errorMsg.includes('title'))
      
      let errorMessage = errorMsg || t('posts.createError') || 'Failed to create post. Please try again.'
      
      if (isDuplicateTitle) {
        errorMessage = t('posts.titleDuplicateError') || 'A post with this title already exists. Please use a different title.'
      }
      
      toast({
        title: t('common.error') || 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PostForm> }) =>
      updatePost(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setIsDialogOpen(false)
      const previousPost = editingPost
      setEditingPost(null)
      reset()
      // Log activity
      if (previousPost && data?.id) {
        await ActivityLogger.update(
          'post',
          data.id,
          data.title_en || data.title_ar || 'Untitled Post',
          previousPost,
          data
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('posts.updatedSuccessfully') || 'Post has been updated successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      const errorMsg = String(error?.message || '')
      const errorCode = String(error?.code || '')
      
      // Check if it's a duplicate title error
      const isDuplicateTitle = errorMsg.includes('title already exists') || 
                                errorMsg.includes('posts_title_en_key') ||
                                errorMsg.includes('posts_title_ar_key') ||
                                (errorMsg.includes('duplicate key') && errorMsg.includes('title')) ||
                                (errorCode === '23505' && errorMsg.includes('title'))
      
      let errorMessage = errorMsg || t('posts.updateError') || 'Failed to update post. Please try again.'
      
      if (isDuplicateTitle) {
        errorMessage = t('posts.titleDuplicateError') || 'A post with this title already exists. Please use a different title.'
      }
      
      toast({
        title: t('common.error') || 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: async (_, deletedId) => {
      const deletedPost = postToDelete || posts?.find(p => p.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setDeleteDialogOpen(false)
      setPostToDelete(null)
      // Log activity
      if (deletedPost) {
        await ActivityLogger.delete('post', deletedPost.id, deletedPost.title_en || deletedPost.title_ar || 'Untitled Post')
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('posts.deletedSuccessfully') || `Post "${deletedPost?.title_en || deletedPost?.title_ar || 'Untitled Post'}" has been deleted successfully.`,
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('posts.deleteError') || 'Failed to delete post. Please try again.',
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
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      status: 'draft',
      is_featured: false,
      is_breaking_news: false,
    },
  })

  const isFeatured = watch('is_featured')
  const isBreakingNews = watch('is_breaking_news')

  const onSubmit = (data: PostForm) => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (post: Post) => {
    setEditingPost(post)
    setValue('title_ar', post.title_ar)
    setValue('title_en', post.title_en)
    setValue('content_ar', post.content_ar)
    setValue('content_en', post.content_en)
    setValue('category_id', post.category_id || undefined)
    setValue('thumbnail_url', post.thumbnail_url || '')
    setValue('cover_url', post.cover_url || '')
    setValue('status', post.status as any)
    setValue('is_featured', post.is_featured)
    setValue('is_breaking_news', post.is_breaking_news)
    setIsDialogOpen(true)
  }

  const handleDelete = (post: Post) => {
    setPostToDelete(post)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (postToDelete) {
      deleteMutation.mutate(postToDelete.id)
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
              {t('posts.noPermission') || 'You do not have permission to view posts.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const columns = [
    {
      key: 'title_en',
      header: t('posts.title_en'),
      sortable: true,
      render: (value: string, row: Post) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.title_ar}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('posts.status'),
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'is_featured',
      header: t('posts.isFeatured'),
      sortable: true,
      render: (value: boolean) => (value ? '⭐' : '-'),
    },
    {
      key: 'is_breaking_news',
      header: t('posts.isBreakingNews'),
      sortable: true,
      render: (value: boolean) => (value ? '🔥' : '-'),
    },
    {
      key: 'created_at',
      header: t('posts.createdAt'),
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  const filters = [
    {
      key: 'status',
      label: t('posts.status'),
      type: 'select' as const,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('posts.title')}</h1>
          <p className="text-muted-foreground">Manage news posts and articles</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingPost(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('posts.createPost')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('posts.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={posts}
            columns={columns}
            isLoading={isLoading}
            searchKey={['title_en', 'title_ar']}
            searchPlaceholder={t('common.search')}
            filters={filters}
            enableSelection={canDelete}
            enableExport={true}
            exportFilename="posts"
            bulkActions={canDelete ? [
              {
                label: t('common.delete') || 'Delete Selected',
                action: async (selectedIds: string[]) => {
                  if (confirm(t('posts.deleteMultiple') || `Delete ${selectedIds.length} posts?`)) {
                    await Promise.all(selectedIds.map(id => deletePost(id)))
                    queryClient.invalidateQueries({ queryKey: ['posts'] })
                  }
                },
                variant: 'destructive',
                icon: <Trash className="h-4 w-4" />,
              },
            ] : []}
            actions={(post) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(post)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(post)}
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
              {editingPost ? t('posts.editPost') : t('posts.createPost')}
            </DialogTitle>
            <DialogDescription>
              {editingPost ? 'Update post information' : 'Create a new post'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title_ar">{t('posts.title_ar')}</Label>
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
                <Label htmlFor="title_en">{t('posts.title_en')}</Label>
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
                <Label htmlFor="content_ar">{t('posts.content_ar')}</Label>
                <textarea
                  id="content_ar"
                  {...register('content_ar')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.content_ar && (
                  <p className="text-sm text-destructive">{errors.content_ar.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_en">{t('posts.content_en')}</Label>
                <textarea
                  id="content_en"
                  {...register('content_en')}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                {errors.content_en && (
                  <p className="text-sm text-destructive">{errors.content_en.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ImageUpload
                value={watch('thumbnail_url') || undefined}
                onChange={(url) => setValue('thumbnail_url', url || '')}
                bucket="post-thumbnails"
                maxSize={5}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              <ImageUpload
                value={watch('cover_url') || undefined}
                onChange={(url) => setValue('cover_url', url || '')}
                bucket="post-covers"
                maxSize={10}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_id">{t('posts.category')}</Label>
                <Select
                  onValueChange={(value) => setValue('category_id', value === 'none' ? undefined : value)}
                  value={editingPost?.category_id || 'none'}
                  defaultValue={editingPost?.category_id || 'none'}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.title_en} / {cat.title_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('posts.status')}</Label>
                <Select
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingPost?.status || 'draft'}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    {profile?.role === 'admin' && (
                      <SelectItem value="active">Active</SelectItem>
                    )}
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={isFeatured}
                  onChange={(e) => setValue('is_featured', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_featured">{t('posts.isFeatured')}</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_breaking_news"
                  checked={isBreakingNews}
                  onChange={(e) => setValue('is_breaking_news', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_breaking_news">{t('posts.isBreakingNews')}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingPost(null)
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
              {t('posts.deletePost') || `Are you sure you want to delete post "${postToDelete?.title_en || postToDelete?.title_ar || 'Untitled Post'}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPostToDelete(null)}>
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

