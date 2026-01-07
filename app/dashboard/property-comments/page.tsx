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
import { Check, X, Trash2, MessageSquare } from 'lucide-react'
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
import { PageSkeleton } from '@/components/ui/page-skeleton'
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

const commentUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
})

type CommentUpdateForm = z.infer<typeof commentUpdateSchema>

interface PropertyComment {
  id: string
  property_id: string
  user_id: string | null
  name: string
  email: string | null
  comment_text: string
  status: string
  created_at: string
  updated_at: string
  properties?: {
    title_ar: string
    title_en: string
    code: string
  }
  users?: {
    name: string
    email: string
  }
}

async function getComments() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_comments')
    .select('*, properties(title_ar, title_en, code), users(name, email)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as any[]
}

async function updateComment(id: string, commentData: Partial<CommentUpdateForm>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('property_comments')
    .update(commentData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteComment(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_comments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function bulkApprove(ids: string[]) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_comments')
    .update({ status: 'approved' })
    .in('id', ids)

  if (error) throw error
}

async function bulkReject(ids: string[]) {
  const supabase = createClient()
  const { error } = await supabase
    .from('property_comments')
    .update({ status: 'rejected' })
    .in('id', ids)

  if (error) throw error
}

export default function PropertyCommentsPage() {
  const t = useTranslations()
  const { toast } = useToast()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingComment, setEditingComment] = useState<PropertyComment | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false)
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false)

  // Check permissions
  const { canView, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('property_comments')

  const { data: comments, isLoading } = useQuery({
    queryKey: ['property-comments'],
    queryFn: getComments,
    enabled: canView, // Only fetch if user has view permission
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommentUpdateForm> }) =>
      updateComment(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['property-comments'] })
      setIsDialogOpen(false)
      const previousComment = editingComment
      setEditingComment(null)
      reset()
      toast({
        title: t('common.success') || 'Success',
        description: t('propertyComments.updatedSuccessfully') || 'Comment updated successfully',
        variant: 'success',
      })
      // Log activity
      if (previousComment && data?.id) {
        await ActivityLogger.update(
          'property_comment',
          data.id,
          previousComment.name || 'Untitled Comment',
          previousComment,
          data
        )
      }
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyComments.updateError') || 'Failed to update comment',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: async (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['property-comments'] })
      setDeleteDialogOpen(false)
      const commentId = commentToDelete
      setCommentToDelete(null)
      toast({
        title: t('common.success') || 'Success',
        description: t('propertyComments.deletedSuccessfully') || 'Comment deleted successfully',
        variant: 'success',
      })
      // Log activity
      const commentToLog = comments?.find(c => c.id === deletedId) || (commentId ? { id: commentId, name: 'Comment' } : null)
      if (commentToLog) {
        await ActivityLogger.delete(
          'property_comment',
          commentToLog.id,
          commentToLog.name || 'Untitled Comment'
        )
      }
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyComments.deleteError') || 'Failed to delete comment',
        variant: 'destructive',
      })
    },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: bulkApprove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-comments'] })
      setBulkApproveDialogOpen(false)
      toast({
        title: t('common.success') || 'Success',
        description: t('propertyComments.approvedSuccessfully') || 'Comments approved successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyComments.approveError') || 'Failed to approve comments',
        variant: 'destructive',
      })
    },
  })

  const bulkRejectMutation = useMutation({
    mutationFn: bulkReject,
    onSuccess: async (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['property-comments'] })
      setBulkRejectDialogOpen(false)
      toast({
        title: t('common.success') || 'Success',
        description: t('propertyComments.rejectedSuccessfully') || 'Comments rejected successfully',
        variant: 'success',
      })
      // Log bulk activity
      await ActivityLogger.bulkAction(
        'reject',
        'property_comment',
        ids.length,
        { ids, action: 'reject' }
      )
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('propertyComments.rejectError') || 'Failed to reject comments',
        variant: 'destructive',
      })
    },
  })

  const {
    handleSubmit,
    reset,
    setValue,
  } = useForm<CommentUpdateForm>({
    resolver: zodResolver(commentUpdateSchema),
    defaultValues: {
      status: 'pending',
    },
  })

  const onSubmit = (data: CommentUpdateForm) => {
    if (editingComment) {
      updateMutation.mutate({ id: editingComment.id, data })
    }
  }

  const handleEdit = (comment: any) => {
    setEditingComment(comment)
    setValue('status', comment.status as any)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setCommentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (commentToDelete) {
      deleteMutation.mutate(commentToDelete)
    }
  }

  const handleBulkApprove = () => {
    const pending = comments?.filter(c => c.status === 'pending') || []
    if (pending.length === 0) {
      toast({
        title: t('common.error') || 'Error',
        description: t('propertyComments.noPendingComments') || 'No pending comments to approve',
        variant: 'warning',
      })
      return
    }
    setBulkApproveDialogOpen(true)
  }

  const confirmBulkApprove = () => {
    const pending = comments?.filter(c => c.status === 'pending') || []
    bulkApproveMutation.mutate(pending.map(c => c.id))
  }

  const handleBulkReject = () => {
    const pending = comments?.filter(c => c.status === 'pending') || []
    if (pending.length === 0) {
      toast({
        title: t('common.error') || 'Error',
        description: t('propertyComments.noPendingComments') || 'No pending comments to reject',
        variant: 'warning',
      })
      return
    }
    setBulkRejectDialogOpen(true)
  }

  const confirmBulkReject = () => {
    const pending = comments?.filter(c => c.status === 'pending') || []
    bulkRejectMutation.mutate(pending.map(c => c.id))
  }

  if (isLoading || isCheckingPermissions) {
    return <PageSkeleton showHeader showActions={false} showTable tableRows={8} />
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
              {t('propertyComments.noPermission') || 'You do not have permission to view property comments.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter comments
  const filteredComments = comments?.filter((comment) => {
    if (statusFilter !== 'all' && comment.status !== statusFilter) return false
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'approved':
        return 'text-green-600 bg-green-50'
      case 'rejected':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const columns = [
    {
      key: 'property_id',
      header: t('propertyComments.property') || 'Property',
      render: (_: any, row: any) => {
        const property = row.properties
        return property ? (
          <div>
            <div className="font-medium">{property.title_ar || property.title_en}</div>
            <div className="text-sm text-muted-foreground">Code: {property.code}</div>
          </div>
        ) : '-'
      },
    },
    {
      key: 'name',
      header: t('propertyComments.author') || 'Author',
      render: (value: string, row: any) => {
        const user = row.users
        return (
          <div>
            <div className="font-medium">{value}</div>
            {row.email && (
              <div className="text-sm text-muted-foreground">{row.email}</div>
            )}
            {user && (
              <div className="text-xs text-muted-foreground">User: {user.name}</div>
            )}
          </div>
        )
      },
    },
    {
      key: 'comment_text',
      header: t('propertyComments.comment') || 'Comment',
      render: (value: string) => (
        <div className="max-w-md">
          <p className="text-sm line-clamp-2">{value}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('propertyComments.status') || 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: t('propertyComments.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  const pendingCount = comments?.filter(c => c.status === 'pending').length || 0
  const approvedCount = comments?.filter(c => c.status === 'approved').length || 0
  const rejectedCount = comments?.filter(c => c.status === 'rejected').length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propertyComments.title') || 'Property Comments'}</h1>
          <p className="text-muted-foreground">Manage and moderate property comments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propertyComments.totalComments') || 'Total Comments'}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propertyComments.pending') || 'Pending'}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propertyComments.approved') || 'Approved'}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propertyComments.rejected') || 'Rejected'}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBulkApprove}
                  disabled={bulkApproveMutation.isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve All Pending
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkReject}
                  disabled={bulkRejectMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject All Pending
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('propertyComments.title') || 'Property Comments'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredComments}
            columns={columns}
            isLoading={isLoading}
            searchKey="name"
            searchPlaceholder={t('common.search')}
            actions={(comment) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(comment)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(comment.id)}
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
            <DialogTitle>{t('propertyComments.editComment') || 'Edit Comment'}</DialogTitle>
            <DialogDescription>Moderate comment status</DialogDescription>
          </DialogHeader>
          
          {editingComment && (
            <div className="space-y-4">
              {/* Comment Info (Read-only) */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Property</Label>
                  <p className="font-medium">
                    {editingComment.properties?.title_ar || editingComment.properties?.title_en || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Author</Label>
                  <p className="text-sm">{editingComment.name}</p>
                  {editingComment.email && (
                    <p className="text-sm text-muted-foreground">{editingComment.email}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Comment</Label>
                  <p className="text-sm whitespace-pre-wrap">{editingComment.comment_text}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">{t('propertyComments.status') || 'Status'}</Label>
                  <Select
                    onValueChange={(value) => setValue('status', value as any)}
                    defaultValue={editingComment.status}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setEditingComment(null)
                      reset()
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? t('common.loading') : t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('propertyComments.deleteConfirm') || 'Are you sure you want to delete this comment? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkApproveDialogOpen} onOpenChange={setBulkApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Approve'}</AlertDialogTitle>
            <AlertDialogDescription>
              {`Are you sure you want to approve ${comments?.filter(c => c.status === 'pending').length || 0} comment(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkApprove}>
              {t('propertyComments.approve') || 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRejectDialogOpen} onOpenChange={setBulkRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Reject'}</AlertDialogTitle>
            <AlertDialogDescription>
              {`Are you sure you want to reject ${comments?.filter(c => c.status === 'pending').length || 0} comment(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('propertyComments.reject') || 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

