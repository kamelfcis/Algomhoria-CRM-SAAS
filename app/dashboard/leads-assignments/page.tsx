'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'
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

const assignmentSchema = z.object({
  lead_id: z.string().uuid().optional().nullable(),
  direct_lead_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid('Please select a user'),
  assigned_by: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'completed', 'cancelled']),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => (data.lead_id && !data.direct_lead_id) || (!data.lead_id && data.direct_lead_id),
  {
    message: 'Please select either a Lead or Direct Lead (not both)',
    path: ['lead_id'],
  }
)

type AssignmentForm = z.infer<typeof assignmentSchema>

interface LeadAssignment {
  id: string
  lead_id: string | null
  direct_lead_id: string | null
  assigned_to: string
  assigned_by: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  leads?: {
    name: string
    phone_number: string
    email: string | null
  }
  direct_leads?: {
    name: string
    phone_number: string
    email: string | null
  }
  assigned_to_user?: {
    name: string
    email: string
  }
  assigned_by_user?: {
    name: string
    email: string
  }
}

async function getAssignments() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads_assignments')
    .select(`
      *,
      leads (
        name,
        phone_number,
        email
      ),
      direct_leads (
        name,
        phone_number,
        email
      ),
      assigned_to_user:users!leads_assignments_assigned_to_fkey (
        name,
        email
      ),
      assigned_by_user:users!leads_assignments_assigned_by_fkey (
        name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as LeadAssignment[]
}

async function getLeads() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, phone_number, email')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

async function getDirectLeads() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('direct_leads')
    .select('id, name, phone_number, email')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

async function getUsers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

async function createAssignment(assignmentData: AssignmentForm) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('leads_assignments')
    .insert({
      ...assignmentData,
      lead_id: assignmentData.lead_id || null,
      direct_lead_id: assignmentData.direct_lead_id || null,
      assigned_by: assignmentData.assigned_by || user?.id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateAssignment(id: string, assignmentData: Partial<AssignmentForm>) {
  const supabase = createClient()
  
  const updateData: any = {
    ...assignmentData,
    lead_id: assignmentData.lead_id || null,
    direct_lead_id: assignmentData.direct_lead_id || null,
  }

  // Set completed_at when status changes to completed
  if (assignmentData.status === 'completed' && !updateData.completed_at) {
    updateData.completed_at = new Date().toISOString()
  } else if (assignmentData.status !== 'completed') {
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from('leads_assignments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteAssignment(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('leads_assignments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export default function LeadsAssignmentsPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<LeadAssignment | null>(null)
  const [leadType, setLeadType] = useState<'lead' | 'direct_lead' | 'none'>('none')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<LeadAssignment | null>(null)

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['leads_assignments'],
    queryFn: getAssignments,
  })

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: getLeads,
  })

  const { data: directLeads } = useQuery({
    queryKey: ['direct_leads'],
    queryFn: getDirectLeads,
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads_assignments'] })
      setIsDialogOpen(false)
      reset()
      setLeadType('none')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssignmentForm> }) =>
      updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads_assignments'] })
      setIsDialogOpen(false)
      setEditingAssignment(null)
      reset()
      setLeadType('none')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads_assignments'] })
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      status: 'active',
    },
  })

  const onSubmit = (data: AssignmentForm) => {
    if (editingAssignment) {
      updateMutation.mutate({ id: editingAssignment.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (assignment: LeadAssignment) => {
    setEditingAssignment(assignment)
    const type = assignment.lead_id ? 'lead' : assignment.direct_lead_id ? 'direct_lead' : 'none'
    setLeadType(type)
    setValue('lead_id', assignment.lead_id || undefined)
    setValue('direct_lead_id', assignment.direct_lead_id || undefined)
    setValue('assigned_to', assignment.assigned_to)
    setValue('assigned_by', assignment.assigned_by || undefined)
    setValue('status', assignment.status as any)
    setValue('notes', assignment.notes || '')
    setIsDialogOpen(true)
  }

  const handleDelete = (assignment: LeadAssignment) => {
    setAssignmentToDelete(assignment)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (assignmentToDelete) {
      deleteMutation.mutate(assignmentToDelete.id)
    }
  }

  const handleLeadTypeChange = (type: 'lead' | 'direct_lead' | 'none') => {
    setLeadType(type)
    setValue('lead_id', undefined)
    setValue('direct_lead_id', undefined)
  }

  const canCreate = profile?.role === 'admin' || profile?.role === 'sales'
  const canEdit = profile?.role === 'admin' || profile?.role === 'sales'
  const canDelete = profile?.role === 'admin'

  const columns = [
    {
      key: 'lead_id',
      header: t('leadsAssignments.lead') || 'Lead',
      sortable: true,
      render: (_: any, row: LeadAssignment) => {
        if (row.lead_id && row.leads) {
          return (
            <div>
              <div className="font-medium">{row.leads.name}</div>
              <div className="text-sm text-muted-foreground">
                {row.leads.phone_number} {row.leads.email ? `• ${row.leads.email}` : ''}
              </div>
              <div className="text-xs text-muted-foreground">(Lead)</div>
            </div>
          )
        }
        if (row.direct_lead_id && row.direct_leads) {
          return (
            <div>
              <div className="font-medium">{row.direct_leads.name}</div>
              <div className="text-sm text-muted-foreground">
                {row.direct_leads.phone_number} {row.direct_leads.email ? `• ${row.direct_leads.email}` : ''}
              </div>
              <div className="text-xs text-muted-foreground">(Direct Lead)</div>
            </div>
          )
        }
        return '-'
      },
    },
    {
      key: 'assigned_to',
      header: t('leadsAssignments.assignedTo') || 'Assigned To',
      sortable: true,
      render: (_: any, row: LeadAssignment) => {
        const user = row.assigned_to_user
        return user ? (
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        ) : '-'
      },
    },
    {
      key: 'assigned_by',
      header: t('leadsAssignments.assignedBy') || 'Assigned By',
      render: (_: any, row: LeadAssignment) => {
        const user = row.assigned_by_user
        return user ? (
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        ) : '-'
      },
    },
    {
      key: 'status',
      header: t('leadsAssignments.status') || 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      render: (value: string) => {
        const statusConfig = {
          active: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
          completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
          cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
        }
        const config = statusConfig[value as keyof typeof statusConfig] || statusConfig.active
        const Icon = config.icon
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            <Icon className="h-3 w-3" />
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        )
      },
    },
    {
      key: 'notes',
      header: t('leadsAssignments.notes') || 'Notes',
      render: (value: string | null) => (
        <div className="max-w-xs truncate" title={value || ''}>
          {value || '-'}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: t('common.createdAt') || 'Created At',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'completed_at',
      header: t('leadsAssignments.completedAt') || 'Completed At',
      sortable: true,
      render: (value: string | null) => value ? new Date(value).toLocaleDateString() : '-',
    },
  ]

  const filters = [
    {
      key: 'status',
      label: t('leadsAssignments.status') || 'Status',
      type: 'select' as const,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('leadsAssignments.title') || 'Leads Assignments'}</h1>
          <p className="text-muted-foreground">Manage lead task assignments</p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            setEditingAssignment(null)
            reset()
            setLeadType('none')
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('leadsAssignments.createAssignment') || 'Create Assignment'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('leadsAssignments.title') || 'Leads Assignments'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={assignments}
            columns={columns}
            isLoading={isLoading}
            searchKey={['notes']}
            searchPlaceholder={t('common.search')}
            filters={filters}
            enableExport={true}
            exportFilename="leads-assignments"
            actions={(assignment) => (
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(assignment)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(assignment)}
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
              {editingAssignment ? t('leadsAssignments.editAssignment') || 'Edit Assignment' : t('leadsAssignments.createAssignment') || 'Create Assignment'}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment ? 'Update assignment information' : 'Assign a lead to a team member'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('leadsAssignments.leadType') || 'Lead Type'} *</Label>
              <Select
                value={leadType}
                onValueChange={(value: 'lead' | 'direct_lead' | 'none') => handleLeadTypeChange(value)}
                disabled={createMutation.isPending || updateMutation.isPending || !!editingAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                  <SelectItem value="lead">{t('leads.title') || 'Lead'}</SelectItem>
                  <SelectItem value="direct_lead">{t('directLeads.title') || 'Direct Lead'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {leadType === 'lead' && (
              <div className="space-y-2">
                <Label htmlFor="lead_id">{t('leads.title') || 'Lead'} *</Label>
                <Select
                  onValueChange={(value) => {
                    setValue('lead_id', value)
                    setValue('direct_lead_id', undefined)
                  }}
                  value={watch('lead_id') || ''}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads?.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} - {lead.phone_number} {lead.email ? `(${lead.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.lead_id && (
                  <p className="text-sm text-destructive">{errors.lead_id.message}</p>
                )}
              </div>
            )}

            {leadType === 'direct_lead' && (
              <div className="space-y-2">
                <Label htmlFor="direct_lead_id">{t('directLeads.title') || 'Direct Lead'} *</Label>
                <Select
                  onValueChange={(value) => {
                    setValue('direct_lead_id', value)
                    setValue('lead_id', undefined)
                  }}
                  value={watch('direct_lead_id') || ''}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select direct lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {directLeads?.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} - {lead.phone_number} {lead.email ? `(${lead.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.direct_lead_id && (
                  <p className="text-sm text-destructive">{errors.direct_lead_id.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="assigned_to">{t('leadsAssignments.assignedTo') || 'Assigned To'} *</Label>
              <Select
                onValueChange={(value) => setValue('assigned_to', value)}
                value={watch('assigned_to') || ''}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assigned_to && (
                <p className="text-sm text-destructive">{errors.assigned_to.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('leadsAssignments.status') || 'Status'}</Label>
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('leadsAssignments.notes') || 'Notes'}</Label>
              <textarea
                id="notes"
                {...register('notes')}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={createMutation.isPending || updateMutation.isPending}
                placeholder="Add notes about this assignment..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingAssignment(null)
                  reset()
                  setLeadType('none')
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
              {t('common.delete') || 'Are you sure you want to delete this assignment? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>
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

