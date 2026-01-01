'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Pencil, Trash2 } from 'lucide-react'
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

const directLeadUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost', 'archived']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
})

type DirectLeadUpdateForm = z.infer<typeof directLeadUpdateSchema>

interface DirectLead {
  id: string
  name: string
  phone_number: string
  email: string | null
  message: string | null
  source: string | null
  status: string
  priority: string
  assigned_to: string | null
  notes: string | null
  created_at: string
  contacted_at: string | null
  converted_at: string | null
}

async function getDirectLeads() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('direct_leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as DirectLead[]
}

async function getUsers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('status', 'active')
    .in('role', ['admin', 'sales', 'moderator'])

  if (error) throw error
  return data
}

async function updateDirectLead(id: string, leadData: Partial<DirectLeadUpdateForm>) {
  const supabase = createClient()
  
  // First, get the current lead to check existing timestamps
  const { data: currentLead } = await supabase
    .from('direct_leads')
    .select('contacted_at, converted_at')
    .eq('id', id)
    .single() as { data: { contacted_at?: string; converted_at?: string } | null }

  const updateData: any = {
    ...leadData,
    assigned_to: leadData.assigned_to || null,
  }

  // Update contacted_at if status changes to contacted
  if (leadData.status === 'contacted' && !(currentLead as any)?.contacted_at) {
    updateData.contacted_at = new Date().toISOString()
  }

  // Update converted_at if status changes to converted
  if (leadData.status === 'converted' && !(currentLead as any)?.converted_at) {
    updateData.converted_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('direct_leads')
    // @ts-ignore - Supabase type inference limitation with dynamic updates
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteDirectLead(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('direct_leads')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function DirectLeadsPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<DirectLead | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<DirectLead | null>(null)

  const { data: directLeads, isLoading } = useQuery({
    queryKey: ['direct-leads'],
    queryFn: getDirectLeads,
  })

  const { data: users } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: getUsers,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DirectLeadUpdateForm> }) =>
      updateDirectLead(id, data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['direct-leads'] })
      setIsDialogOpen(false)
      const previousLead = editingLead
      setEditingLead(null)
      reset()
      // Log activity
      if (previousLead && data?.id) {
        await ActivityLogger.update(
          'direct_lead',
          data.id,
          data.name || data.email || 'Untitled Direct Lead',
          previousLead,
          data
        )
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDirectLead,
    onSuccess: async (_, deletedId) => {
      const deletedLead = leadToDelete || directLeads?.find(l => l.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['direct-leads'] })
      setDeleteDialogOpen(false)
      setLeadToDelete(null)
      // Log activity
      if (deletedLead) {
        await ActivityLogger.delete(
          'direct_lead',
          deletedLead.id,
          deletedLead.name || deletedLead.email || 'Untitled Direct Lead'
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
  } = useForm<DirectLeadUpdateForm>({
    resolver: zodResolver(directLeadUpdateSchema),
    defaultValues: {
      status: 'new',
      priority: 'normal',
    },
  })

  const onSubmit = (data: DirectLeadUpdateForm) => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data })
    }
  }

  const handleEdit = (lead: DirectLead) => {
    setEditingLead(lead)
    setValue('status', lead.status as any)
    setValue('priority', lead.priority as any)
    setValue('assigned_to', lead.assigned_to || undefined)
    setValue('notes', lead.notes || '')
    setIsDialogOpen(true)
  }

  const handleDelete = (lead: DirectLead) => {
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete.id)
    }
  }

  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator'
  const canDelete = profile?.role === 'admin'

  // Filter leads
  const filteredLeads = directLeads?.filter((lead) => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false
    if (priorityFilter !== 'all' && lead.priority !== priorityFilter) return false
    return true
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'normal':
        return 'text-blue-600 bg-blue-50'
      case 'low':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'text-blue-600 bg-blue-50'
      case 'contacted':
        return 'text-yellow-600 bg-yellow-50'
      case 'qualified':
        return 'text-purple-600 bg-purple-50'
      case 'converted':
        return 'text-green-600 bg-green-50'
      case 'lost':
        return 'text-red-600 bg-red-50'
      case 'archived':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const columns = [
    {
      key: 'name',
      header: t('directLeads.name') || 'Name',
      render: (value: string, row: DirectLead) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.phone_number}</div>
        </div>
      ),
    },
    {
      key: 'source',
      header: t('directLeads.source') || 'Source',
      render: (value: string | null) => value || '-',
    },
    {
      key: 'message',
      header: t('directLeads.message') || 'Message',
      render: (value: string | null) => (
        <div className="max-w-xs truncate">{value || '-'}</div>
      ),
    },
    {
      key: 'priority',
      header: t('directLeads.priority') || 'Priority',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('directLeads.status') || 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: t('directLeads.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('directLeads.title') || 'Direct Leads'}</h1>
          <p className="text-muted-foreground">Manage direct customer leads and inquiries</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('directLeads.title') || 'Direct Leads'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredLeads}
            columns={columns}
            isLoading={isLoading}
            searchKey="name"
            searchPlaceholder={t('common.search')}
            actions={(lead) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(lead)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(lead)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('directLeads.editLead') || 'Edit Direct Lead'}</DialogTitle>
            <DialogDescription>Update lead status, priority, and assignment</DialogDescription>
          </DialogHeader>
          
          {editingLead && (
            <div className="space-y-4">
              {/* Lead Info (Read-only) */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{editingLead.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="text-sm">{editingLead.phone_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm">{editingLead.email || '-'}</p>
                  </div>
                </div>
                {editingLead.message && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <p className="text-sm">{editingLead.message}</p>
                  </div>
                )}
                {editingLead.source && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Source</Label>
                    <p className="text-sm">{editingLead.source}</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">{t('directLeads.status') || 'Status'}</Label>
                    <Select
                      onValueChange={(value) => setValue('status', value as any)}
                      defaultValue={editingLead.status}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">{t('directLeads.priority') || 'Priority'}</Label>
                    <Select
                      onValueChange={(value) => setValue('priority', value as any)}
                      defaultValue={editingLead.priority}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">{t('directLeads.assignedTo') || 'Assigned To'}</Label>
                  <Select
                    onValueChange={(value) => setValue('assigned_to', value === 'none' ? undefined : value)}
                    defaultValue={editingLead.assigned_to || 'none'}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t('directLeads.notes') || 'Notes'}</Label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={updateMutation.isPending}
                    placeholder="Add notes about this lead..."
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setEditingLead(null)
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
              {t('directLeads.deleteLead') || `Are you sure you want to delete direct lead "${leadToDelete?.name || leadToDelete?.email || 'Untitled Lead'}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeadToDelete(null)}>
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

