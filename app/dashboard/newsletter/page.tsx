'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, Mail, MailCheck, MailX } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
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

const subscriberSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional().nullable(),
  status: z.enum(['active', 'unsubscribed']),
})

type SubscriberForm = z.infer<typeof subscriberSchema>

interface NewsletterSubscriber {
  id: string
  email: string
  name: string | null
  status: string
  subscribed_at: string
  unsubscribed_at: string | null
  created_at: string
  updated_at: string
}

async function getSubscribers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as NewsletterSubscriber[]
}

async function createSubscriber(subscriberData: SubscriberForm) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .insert({
      ...subscriberData,
      name: subscriberData.name || null,
      subscribed_at: new Date().toISOString(),
      unsubscribed_at: subscriberData.status === 'unsubscribed' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateSubscriber(id: string, subscriberData: Partial<SubscriberForm>) {
  const supabase = createClient()
  
  // First, get the current subscriber data to check subscribed_at
  const { data: existing, error: fetchError } = await supabase
    .from('newsletter_subscribers')
    .select('subscribed_at, status')
    .eq('id', id)
    .single()

  if (fetchError) {
    throw fetchError
  }

  const updateData: any = {}
  
  // Only include fields that are actually provided
  if (subscriberData.email !== undefined) {
    updateData.email = subscriberData.email
  }
  
  if (subscriberData.name !== undefined) {
    updateData.name = subscriberData.name || null
  }

  // Update status and related timestamps
  if (subscriberData.status !== undefined) {
    updateData.status = subscriberData.status
    
    if (subscriberData.status === 'unsubscribed') {
      updateData.unsubscribed_at = new Date().toISOString()
    } else if (subscriberData.status === 'active') {
      updateData.unsubscribed_at = null
      // If reactivating and subscribed_at doesn't exist, set it
      if (!existing?.subscribed_at) {
        updateData.subscribed_at = new Date().toISOString()
      }
    }
  }

  // Ensure we have at least one field to update
  if (Object.keys(updateData).length === 0) {
    throw new Error('No fields to update')
  }

  // Perform the update
  const { error: updateError } = await supabase
    .from('newsletter_subscribers')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    console.error('Update error:', updateError)
    throw updateError
  }

  // Fetch the updated record
  const { data, error: selectError } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('id', id)
    .single()

  if (selectError) {
    console.error('Fetch error after update:', selectError)
    throw selectError
  }
  
  if (!data) {
    throw new Error('Update succeeded but subscriber not found')
  }
  
  return data
}

async function deleteSubscriber(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function bulkUnsubscribe(ids: string[]) {
  const supabase = createClient()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) throw error
}

async function bulkSubscribe(ids: string[]) {
  const supabase = createClient()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      status: 'active',
      unsubscribed_at: null,
    })
    .in('id', ids)

  if (error) throw error
}

export default function NewsletterPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubscriber, setEditingSubscriber] = useState<NewsletterSubscriber | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subscriberToDelete, setSubscriberToDelete] = useState<NewsletterSubscriber | null>(null)

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ['newsletter-subscribers'],
    queryFn: getSubscribers,
  })

  const createMutation = useMutation({
    mutationFn: createSubscriber,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-subscribers'] })
      setIsDialogOpen(false)
      reset()
      const subscriberName = data?.email || data?.name || 'Subscriber'
      const message = t('newsletter.createdSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', subscriberName) : `Subscriber "${subscriberName}" has been created successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('newsletter.createError') || 'Failed to create subscriber. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubscriberForm> }) =>
      updateSubscriber(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-subscribers'] })
      setIsDialogOpen(false)
      const subscriberName = editingSubscriber?.email || editingSubscriber?.name || data?.email || data?.name || 'Subscriber'
      setEditingSubscriber(null)
      reset()
      const message = t('newsletter.updatedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', subscriberName) : `Subscriber "${subscriberName}" has been updated successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('newsletter.updateError') || 'Failed to update subscriber. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriber,
    onSuccess: () => {
      const deletedSubscriber = subscriberToDelete
      const deletedName = deletedSubscriber?.email || deletedSubscriber?.name || 'Subscriber'
      queryClient.invalidateQueries({ queryKey: ['newsletter-subscribers'] })
      setDeleteDialogOpen(false)
      setSubscriberToDelete(null)
      const message = t('newsletter.deletedSuccessfully')
      toast({
        title: t('common.success') || 'Success',
        description: message ? message.replace('{name}', deletedName) : `Subscriber "${deletedName}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('newsletter.deleteError') || 'Failed to delete subscriber. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const bulkUnsubscribeMutation = useMutation({
    mutationFn: bulkUnsubscribe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-subscribers'] })
    },
  })

  const bulkSubscribeMutation = useMutation({
    mutationFn: bulkSubscribe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-subscribers'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SubscriberForm>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      status: 'active',
    },
  })

  const onSubmit = (data: SubscriberForm) => {
    if (editingSubscriber) {
      // Ensure all fields are included when updating
      const updateData: Partial<SubscriberForm> = {
        email: data.email,
        name: data.name || null,
        status: data.status,
      }
      updateMutation.mutate({ id: editingSubscriber.id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (subscriber: NewsletterSubscriber) => {
    setEditingSubscriber(subscriber)
    setValue('email', subscriber.email)
    setValue('name', subscriber.name || '')
    setValue('status', subscriber.status as any)
    setIsDialogOpen(true)
  }

  const handleDelete = (subscriber: NewsletterSubscriber) => {
    setSubscriberToDelete(subscriber)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (subscriberToDelete) {
      deleteMutation.mutate(subscriberToDelete.id)
    }
  }

  const handleBulkUnsubscribe = () => {
    const selected = subscribers?.filter(s => s.status === 'active') || []
    if (selected.length === 0) {
      alert('No active subscribers selected')
      return
    }
    if (confirm(`Unsubscribe ${selected.length} subscriber(s)?`)) {
      bulkUnsubscribeMutation.mutate(selected.map(s => s.id))
    }
  }

  const handleBulkSubscribe = () => {
    const selected = subscribers?.filter(s => s.status === 'unsubscribed') || []
    if (selected.length === 0) {
      alert('No unsubscribed users selected')
      return
    }
    if (confirm(`Resubscribe ${selected.length} subscriber(s)?`)) {
      bulkSubscribeMutation.mutate(selected.map(s => s.id))
    }
  }

  const canCreate = profile?.role === 'admin' || profile?.role === 'moderator'
  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator'
  const canDelete = profile?.role === 'admin'

  // Filter subscribers
  const filteredSubscribers = subscribers?.filter((subscriber) => {
    if (statusFilter !== 'all' && subscriber.status !== statusFilter) return false
    return true
  })

  const activeCount = subscribers?.filter(s => s.status === 'active').length || 0
  const unsubscribedCount = subscribers?.filter(s => s.status === 'unsubscribed').length || 0

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <MailCheck className="h-4 w-4 text-green-600" />
      case 'unsubscribed':
        return <MailX className="h-4 w-4 text-gray-600" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const columns = [
    {
      key: 'email',
      header: t('newsletter.email') || 'Email',
      render: (value: string, row: NewsletterSubscriber) => (
        <div>
          <div className="font-medium">{value}</div>
          {row.name && (
            <div className="text-sm text-muted-foreground">{row.name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('newsletter.status') || 'Status',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(value)}
          <span className="capitalize">{value}</span>
        </div>
      ),
    },
    {
      key: 'subscribed_at',
      header: t('newsletter.subscribedAt') || 'Subscribed At',
      render: (value: string) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      key: 'unsubscribed_at',
      header: t('newsletter.unsubscribedAt') || 'Unsubscribed At',
      render: (value: string | null) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      key: 'created_at',
      header: t('newsletter.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('newsletter.title') || 'Newsletter Subscribers'}</h1>
          <p className="text-muted-foreground">Manage newsletter subscribers and subscriptions</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingSubscriber(null)
            reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newsletter.createSubscriber') || 'Add Subscriber'}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('newsletter.totalSubscribers') || 'Total Subscribers'}
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscribers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('newsletter.activeSubscribers') || 'Active Subscribers'}
            </CardTitle>
            <MailCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('newsletter.unsubscribed') || 'Unsubscribed'}
            </CardTitle>
            <MailX className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{unsubscribedCount}</div>
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBulkSubscribe}
                  disabled={bulkSubscribeMutation.isPending}
                >
                  <MailCheck className="mr-2 h-4 w-4" />
                  Resubscribe All
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkUnsubscribe}
                  disabled={bulkUnsubscribeMutation.isPending}
                >
                  <MailX className="mr-2 h-4 w-4" />
                  Unsubscribe All Active
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('newsletter.title') || 'Newsletter Subscribers'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredSubscribers}
            columns={columns}
            isLoading={isLoading}
            searchKey="email"
            searchPlaceholder={t('common.search')}
            actions={(subscriber) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(subscriber)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(subscriber)}
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
              {editingSubscriber ? t('newsletter.editSubscriber') : t('newsletter.createSubscriber')}
            </DialogTitle>
            <DialogDescription>
              {editingSubscriber ? 'Update subscriber information' : 'Add a new newsletter subscriber'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('newsletter.email') || 'Email'}</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('newsletter.name') || 'Name (Optional)'}</Label>
              <Input
                id="name"
                {...register('name')}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('newsletter.status') || 'Status'}</Label>
              <Select
                onValueChange={(value) => setValue('status', value as any)}
                value={watch('status') || 'active'}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
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
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingSubscriber(null)
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
              {t('newsletter.deleteSubscriber') || `Are you sure you want to delete subscriber "${subscriberToDelete?.email || subscriberToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSubscriberToDelete(null)}>
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

