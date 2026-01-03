'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, ChevronDown, ChevronUp, X, Plus, Calendar, Clock, Grid3x3, List, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
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
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { LeadCardSkeleton } from '@/components/ui/lead-card-skeleton'
import { LeadRowSkeleton } from '@/components/ui/lead-row-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const directLeadUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.union([
    z.string().email('Invalid email address'),
    z.literal(''),
  ]).optional(),
  message: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost', 'archived']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().optional().or(z.literal('')),
})

const directLeadCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.union([
    z.string().email('Invalid email address'),
    z.literal(''),
  ]).optional(),
  message: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost', 'archived']).default('new'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().optional().or(z.literal('')),
})

type DirectLeadUpdateForm = z.infer<typeof directLeadUpdateSchema>
type DirectLeadCreateForm = z.infer<typeof directLeadCreateSchema>

const activitySchema = z.object({
  action: z.enum(['call', 'meeting', 'site_show', 'managerial_action', 'end', 'message'], {
    required_error: 'Action is required',
  }),
  result: z.string().optional(),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
})

type ActivityForm = z.infer<typeof activitySchema>

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
  assigned_user?: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

interface DirectLeadActivity {
  id: string
  lead_id: string | null
  direct_lead_id: string | null
  action: 'call' | 'meeting' | 'site_show' | 'managerial_action' | 'end' | 'message'
  result: string | null
  notes: string | null
  follow_up_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  created_by_user?: {
    name: string
    email: string
  }
}

async function getDirectLeads() {
  const supabase = createClient()
  
  const { data: leadsData, error: leadsError } = await supabase
    .from('direct_leads')
    .select('*, assigned_user:users!direct_leads_assigned_to_fkey(id, name, email, role)')
    .order('created_at', { ascending: false })

  if (leadsError) {
    console.error('Error fetching direct leads:', leadsError)
    throw leadsError
  }

  return (leadsData || []) as DirectLead[]
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
  
  let currentLead: { status: string; contacted_at: string | null; converted_at: string | null } | null = null
  const { data: fetchedLead, error: fetchError } = await supabase
    .from('direct_leads')
    .select('status, contacted_at, converted_at')
    .eq('id', id)
    .maybeSingle()

  if (!fetchError && fetchedLead) {
    currentLead = fetchedLead
  }

  const updateData: any = {
    name: leadData.name,
    phone_number: leadData.phone_number,
    message: (leadData.message && leadData.message.trim() !== '') ? leadData.message : null,
    source: (leadData.source && leadData.source.trim() !== '') ? leadData.source : null,
    status: leadData.status,
    priority: leadData.priority,
    email: (leadData.email && leadData.email.trim() !== '') ? leadData.email : null,
    assigned_to: leadData.assigned_to || null,
    notes: (leadData.notes && leadData.notes.trim() !== '') ? leadData.notes : null,
  }

  // Update contacted_at if status changes to contacted
  if (currentLead && leadData.status === 'contacted' && currentLead.status !== 'contacted' && !currentLead.contacted_at) {
    updateData.contacted_at = new Date().toISOString()
  }

  // Update converted_at if status changes to converted
  if (currentLead && leadData.status === 'converted' && currentLead.status !== 'converted' && !currentLead.converted_at) {
    updateData.converted_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('direct_leads')
    .update(updateData)
    .eq('id', id)
    .select('*')

  if (error) {
    console.error('Error updating direct lead:', error)
    if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
      throw new Error('Direct lead not found or you do not have permission to update this lead.')
    }
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('Direct lead not found or you do not have permission to update this lead.')
  }

  return data[0]
}

async function createDirectLead(leadData: DirectLeadCreateForm) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const insertData: any = {
    name: leadData.name,
    phone_number: leadData.phone_number,
    message: (leadData.message && leadData.message.trim() !== '') ? leadData.message : null,
    source: (leadData.source && leadData.source.trim() !== '') ? leadData.source : null,
    status: leadData.status,
    priority: leadData.priority,
    email: (leadData.email && leadData.email.trim() !== '') ? leadData.email : null,
    assigned_to: leadData.assigned_to || null,
    notes: (leadData.notes && leadData.notes.trim() !== '') ? leadData.notes : null,
    created_by: user?.id || null,
  }

  const { data, error } = await supabase
    .from('direct_leads')
    .insert(insertData)
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

async function getDirectLeadActivities(directLeadId: string) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('direct_lead_id', directLeadId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching activities:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    const userIds = [...new Set(data.map((item: any) => item.created_by).filter(Boolean))]
    
    let usersMap: Record<string, { name: string; email: string }> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds)
      
      if (usersData) {
        usersMap = usersData.reduce((acc: any, user: any) => {
          acc[user.id] = { name: user.name, email: user.email }
          return acc
        }, {})
      }
    }
    
    return (data || []).map((item: any) => ({
      ...item,
      created_by_user: item.created_by ? usersMap[item.created_by] || null : null,
    })) as DirectLeadActivity[]
  } catch (err) {
    console.error('Error in getDirectLeadActivities:', err)
    return []
  }
}

async function createDirectLeadActivity(activityData: {
  direct_lead_id: string
  action: string
  result?: string
  notes?: string
  follow_up_date?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const insertData: any = {
    direct_lead_id: activityData.direct_lead_id,
    lead_id: null,
    action: activityData.action,
    result: activityData.result || null,
    notes: activityData.notes || null,
    follow_up_date: activityData.follow_up_date || null,
    created_by: user?.id || null,
  }

  const { data, error } = await supabase
    .from('lead_activities')
    .insert(insertData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating activity:', error)
    throw error
  }
  
  if (!data) {
    throw new Error('No data returned from insert')
  }

  let createdByUser = null
  if (data.created_by) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', data.created_by)
        .single()
      
      if (userData) {
        createdByUser = { name: userData.name, email: userData.email }
      }
    } catch (err) {
      console.error('Error fetching user:', err)
    }
  }

  return {
    ...data,
    created_by_user: createdByUser,
  } as DirectLeadActivity
}

export default function DirectLeadsPage() {
  const t = useTranslations()
  const { profile, user } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<DirectLead | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

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
      setExpandedRowId(null)
      reset()
      toast({
        title: t('directLeads.updatedSuccessfully') || 'Success',
        description: t('directLeads.updateSuccess') || 'Direct lead updated successfully',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('directLeads.updateError') || 'Error',
        description: error.message || t('directLeads.updateError') || 'Failed to update direct lead',
        variant: 'destructive',
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: createDirectLead,
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['direct-leads'] })
      setIsCreating(false)
      createReset()
      toast({
        title: t('directLeads.createdSuccessfully') || 'Success',
        description: t('directLeads.createSuccess') || 'Direct lead created successfully',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('directLeads.createError') || 'Error',
        description: error.message || t('directLeads.createError') || 'Failed to create direct lead',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDirectLead,
    onSuccess: async (_, deletedId) => {
      const deletedLead = leadToDelete || directLeads?.find(l => l.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['direct-leads'] })
      setDeleteDialogOpen(false)
      setLeadToDelete(null)
      toast({
        title: t('directLeads.deletedSuccessfully') || 'Success',
        description: t('directLeads.deleteSuccess') || 'Direct lead deleted successfully',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('directLeads.deleteError') || 'Error',
        description: error.message || t('directLeads.deleteError') || 'Failed to delete direct lead',
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
  } = useForm<DirectLeadUpdateForm>({
    resolver: zodResolver(directLeadUpdateSchema),
  })

  const {
    register: createRegister,
    handleSubmit: createHandleSubmit,
    formState: { errors: createErrors },
    reset: createReset,
    setValue: createSetValue,
  } = useForm<DirectLeadCreateForm>({
    resolver: zodResolver(directLeadCreateSchema),
    defaultValues: {
      status: 'new',
      priority: 'normal',
    },
  })

  const {
    register: activityRegister,
    handleSubmit: activityHandleSubmit,
    formState: { errors: activityErrors },
    reset: activityReset,
    setValue: activitySetValue,
  } = useForm<ActivityForm>({
    resolver: zodResolver(activitySchema),
  })

  const onSubmit = (data: DirectLeadUpdateForm) => {
    if (expandedRowId) {
      updateMutation.mutate({ id: expandedRowId, data })
    }
  }

  const onCreate = (data: DirectLeadCreateForm) => {
    createMutation.mutate(data)
  }

  const handleToggleExpand = useCallback((lead: DirectLead) => {
    if (expandedRowId === lead.id) {
      setExpandedRowId(null)
      reset()
    } else {
      setExpandedRowId(lead.id)
      setValue('name', lead.name)
      setValue('phone_number', lead.phone_number)
      setValue('email', lead.email || '')
      setValue('message', lead.message || '')
      setValue('source', lead.source || '')
    setValue('status', lead.status as any)
    setValue('priority', lead.priority as any)
    setValue('assigned_to', lead.assigned_to || undefined)
    setValue('notes', lead.notes || '')
  }
  }, [expandedRowId, reset, setValue])

  const handleDelete = (lead: DirectLead) => {
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete.id)
    }
  }

  const canCreate = profile?.role === 'admin'
  const canEdit = profile?.role === 'admin' || profile?.role === 'moderator' || profile?.role === 'sales'
  const canDelete = profile?.role === 'admin'
  const isSales = useMemo(() => profile?.role === 'sales', [profile?.role])

  // Filter and search leads - memoized for performance
  const filteredLeads = useMemo(() => {
    if (!directLeads) return []
    
    return directLeads.filter((lead: DirectLead) => {
      // Sales users can only see leads assigned to them
      if (isSales && lead.assigned_to !== profile?.id) {
        return false
      }
      
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false
    if (priorityFilter !== 'all' && lead.priority !== priorityFilter) return false
      
      // Filter by assigned user (admin only)
      if (profile?.role === 'admin' && assignedToFilter !== 'all') {
        if (assignedToFilter === 'unassigned') {
          if (lead.assigned_to !== null) return false
        } else {
          if (lead.assigned_to !== assignedToFilter) return false
        }
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !lead.name.toLowerCase().includes(query) &&
          !lead.phone_number.toLowerCase().includes(query) &&
          !(lead.email?.toLowerCase().includes(query)) &&
          !(lead.message?.toLowerCase().includes(query)) &&
          !(lead.source?.toLowerCase().includes(query))
        ) return false
      }
    return true
  })
  }, [directLeads, isSales, profile?.id, profile?.role, statusFilter, priorityFilter, assignedToFilter, searchQuery])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, priorityFilter, assignedToFilter, searchQuery])

  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredLeads.slice(startIndex, endIndex)
  }, [filteredLeads, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)

  // Memoized color functions
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
      case 'high':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950'
      case 'normal':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
      case 'low':
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'new':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
      case 'contacted':
        return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950'
      case 'qualified':
        return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950'
      case 'converted':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
      case 'lost':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
      case 'archived':
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
    }
  }, [])

  const columns = useMemo(() => [
    {
      key: 'name',
      header: t('directLeads.name') || 'Name',
    },
    {
      key: 'phone_number',
      header: t('directLeads.phone') || 'Phone',
    },
    {
      key: 'email',
      header: t('directLeads.email') || 'Email',
      render: (value: string | null) => value || '-',
    },
    {
      key: 'source',
      header: t('directLeads.source') || 'Source',
      render: (value: string | null) => value || '-',
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
      key: 'priority',
      header: t('directLeads.priority') || 'Priority',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'assigned_to',
      header: t('directLeads.assignedTo') || 'Assigned To',
      render: (value: string | null, row: DirectLead) => {
        if (row.assigned_user) {
          return (
            <div>
              <div className="font-medium">{row.assigned_user.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{row.assigned_user.role}</div>
            </div>
          )
        }
        return <span className="text-muted-foreground italic">Unassigned</span>
      },
    },
    {
      key: 'created_at',
      header: t('directLeads.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ], [t, getPriorityColor, getStatusColor])

  // Activity handling
  const { data: activities, refetch: refetchActivities } = useQuery({
    queryKey: ['direct-lead-activities', expandedRowId],
    queryFn: () => expandedRowId ? getDirectLeadActivities(expandedRowId) : [],
    enabled: !!expandedRowId,
  })

  const activityMutation = useMutation({
    mutationFn: (data: { direct_lead_id: string; action: string; result?: string; notes?: string; follow_up_date?: string }) =>
      createDirectLeadActivity(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['direct-lead-activities', expandedRowId] })
      activityReset()
      toast({
        title: t('leads.activityCreated') || 'Success',
        description: t('leads.activityCreatedSuccess') || 'Activity logged successfully',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('leads.activityError') || 'Error',
        description: error.message || t('leads.activityError') || 'Failed to log activity',
        variant: 'destructive',
      })
    },
  })

  const onActivitySubmit = (data: ActivityForm) => {
    if (expandedRowId) {
      activityMutation.mutate({
        direct_lead_id: expandedRowId,
        action: data.action,
        result: data.result || undefined,
        notes: data.notes || undefined,
        follow_up_date: data.follow_up_date || undefined,
      })
    }
  }

  if (isLoading) {
    return <PageSkeleton showHeader showActions={false} showTable tableRows={8} />
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gold-dark via-gold to-gold-light bg-clip-text text-transparent animate-in fade-in-50 duration-700">
            {t('directLeads.title') || 'Direct Leads'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground animate-in fade-in-50 duration-700 delay-100">
            Manage direct customer leads and inquiries
          </p>
        </div>
        {canCreate && (
          <Button 
            onClick={() => setIsCreating(!isCreating)}
            className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in fade-in-50 duration-700 delay-200 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('directLeads.createLead') || 'Create Direct Lead'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40 transition-all duration-300 hover:shadow-lg animate-in slide-in-from-top-4 duration-500 delay-150">
        <CardHeader>
          <CardTitle className="animate-in fade-in-50 duration-500">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap animate-in fade-in-50 duration-500 delay-200">
            <div className="space-y-2 w-full sm:w-auto min-w-[140px]">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 transition-all duration-200 hover:scale-105 hover:shadow-md">
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

            <div className="space-y-2 w-full sm:w-auto min-w-[140px]">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40 transition-all duration-200 hover:scale-105 hover:shadow-md">
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

            {profile?.role === 'admin' && (
              <div className="space-y-2 w-full sm:w-auto min-w-[180px]">
                <Label>Assigned To</Label>
                <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                  <SelectTrigger className="w-full sm:w-48 transition-all duration-200 hover:scale-105 hover:shadow-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users?.filter((u: any) => u.role === 'sales' || u.role === 'moderator').map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40 transition-all duration-300 hover:shadow-lg animate-in slide-in-from-top-4 duration-500 delay-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="animate-in fade-in-50 duration-500 text-lg sm:text-xl">{t('directLeads.title') || 'Direct Leads'}</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in-50 duration-500 delay-200">
              <div className="flex items-center gap-1 border rounded-md transition-all duration-300 hover:shadow-md self-center sm:self-auto">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3 transition-all duration-200 hover:scale-110"
                  title={t('common.tableView') || 'Table View'}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="h-8 px-3 transition-all duration-200 hover:scale-110"
                  title={t('common.cardView') || 'Card View'}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder={t('common.search') || 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 transition-all duration-300 focus:scale-105 focus:shadow-md"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Create Form */}
            {isCreating && (
              <div className="p-3 sm:p-6 border-b bg-muted/30 animate-in slide-in-from-top-4 duration-500 fade-in-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm sm:text-base">{t('directLeads.createLead') || 'Create Direct Lead'}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsCreating(false)
                      createReset()
                    }}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form onSubmit={createHandleSubmit(onCreate)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-name">{t('directLeads.name') || 'Name'} *</Label>
                      <Input
                        id="create-name"
                        {...createRegister('name')}
                        disabled={createMutation.isPending}
                      />
                      {createErrors.name && (
                        <p className="text-xs text-destructive">{createErrors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-phone">{t('directLeads.phone') || 'Phone'} *</Label>
                      <Input
                        id="create-phone"
                        {...createRegister('phone_number')}
                        disabled={createMutation.isPending}
                      />
                      {createErrors.phone_number && (
                        <p className="text-xs text-destructive">{createErrors.phone_number.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-email">{t('directLeads.email') || 'Email'}</Label>
                      <Input
                        id="create-email"
                        type="email"
                        {...createRegister('email')}
                        disabled={createMutation.isPending}
                      />
                      {createErrors.email && (
                        <p className="text-xs text-destructive">{createErrors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-source">{t('directLeads.source') || 'Source'}</Label>
                      <Input
                        id="create-source"
                        {...createRegister('source')}
                        disabled={createMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-message">{t('directLeads.message') || 'Message'}</Label>
                    <textarea
                      id="create-message"
                      {...createRegister('message')}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={createMutation.isPending}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-status">{t('directLeads.status') || 'Status'}</Label>
                      <Select
                        onValueChange={(value) => createSetValue('status', value as any)}
                        defaultValue="new"
                        disabled={createMutation.isPending}
                      >
                        <SelectTrigger id="create-status">
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
                      <Label htmlFor="create-priority">{t('directLeads.priority') || 'Priority'}</Label>
                      <Select
                        onValueChange={(value) => createSetValue('priority', value as any)}
                        defaultValue="normal"
                        disabled={createMutation.isPending}
                      >
                        <SelectTrigger id="create-priority">
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

                  {profile?.role === 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="create-assigned">{t('directLeads.assignedTo') || 'Assigned To'}</Label>
                      <Select
                        onValueChange={(value) => createSetValue('assigned_to', value === 'none' ? undefined : value)}
                        defaultValue="none"
                        disabled={createMutation.isPending}
                      >
                        <SelectTrigger id="create-assigned">
                          <SelectValue placeholder="Assign to user" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {users?.filter((u: any) => u.role === 'sales' || u.role === 'moderator').map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="create-notes">{t('directLeads.notes') || 'Notes'}</Label>
                    <textarea
                      id="create-notes"
                      {...createRegister('notes')}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={createMutation.isPending}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false)
                        createReset()
                      }}
                      disabled={createMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('common.cancel') || 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="transition-all duration-200 hover:scale-105 disabled:opacity-50 w-full sm:w-auto"
                    >
                      {createMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          {t('common.loading') || 'Creating...'}
                        </>
                      ) : (
                        t('common.create') || 'Create Direct Lead'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {viewMode === 'table' ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        {columns.map((column) => (
                          <TableHead key={String(column.key)} className="whitespace-nowrap">{column.header}</TableHead>
                        ))}
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <LeadRowSkeleton key={i} />
                          ))}
                        </>
                      ) : paginatedLeads && paginatedLeads.length > 0 ? (
                        paginatedLeads.map((lead, index) => {
                          const isExpanded = expandedRowId === lead.id
                          return (
                            <React.Fragment key={lead.id}>
                              <TableRow className={cn(
                                "transition-all duration-300 hover:bg-muted/50 animate-in fade-in-50 slide-in-from-left-4 hover:shadow-sm",
                                isExpanded && 'bg-muted/50'
                              )}
                              style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <TableCell className="sticky left-0 bg-background z-10">
                                  {(canEdit || isSales) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleToggleExpand(lead)}
                                      className="h-8 w-8"
                                      title={isSales ? (t('directLeads.viewDetails') || 'View Details') : undefined}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </TableCell>
                                {columns.map((column) => {
                                  const value = lead[column.key as keyof DirectLead]
                                  return (
                                    <TableCell key={String(column.key)} className="whitespace-nowrap">
                                      {column.render ? column.render(value, lead) : String(value ?? '')}
                                    </TableCell>
                                  )
                                })}
                                <TableCell className="sticky right-0 bg-background z-10">
                                  <div className="flex gap-1 sm:gap-2">
                                    {(canEdit || isSales) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleExpand(lead)}
                                        className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:text-primary"
                                        title={t('directLeads.editLead') || 'Edit Direct Lead'}
                                        disabled={updateMutation.isPending}
                                      >
                                        {updateMutation.isPending && expandedRowId === lead.id ? (
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        ) : (
                    <Pencil className="h-4 w-4" />
                                        )}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(lead)}
                                        className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-destructive/10 hover:text-destructive"
                                        title={t('directLeads.deleteLead') || 'Delete Direct Lead'}
                                        disabled={deleteMutation.isPending}
                  >
                                        {deleteMutation.isPending && leadToDelete?.id === lead.id ? (
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                                        ) : (
                    <Trash2 className="h-4 w-4" />
                                        )}
                  </Button>
                )}
              </div>
                                </TableCell>
                              </TableRow>
                              {isExpanded && viewMode === 'table' && (
                                <TableRow>
                                  <TableCell colSpan={columns.length + 2} className="bg-muted/30 p-0">
                                    <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 animate-in slide-in-from-top-4 fade-in-50 duration-500 overflow-x-auto">
                                      {/* Edit Form */}
                                      <form
                                        onSubmit={handleSubmit(onSubmit)}
                                        className="bg-background p-3 sm:p-4 rounded-lg border space-y-4"
                                      >
                                        <h4 className="font-semibold text-sm mb-3">{t('directLeads.editLead') || 'Edit Direct Lead'}</h4>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label htmlFor={`name-${lead.id}`}>{t('directLeads.name') || 'Name'} *</Label>
                                            <Input
                                              id={`name-${lead.id}`}
                                              {...register('name')}
                                              disabled={updateMutation.isPending}
                                            />
                                            {errors.name && (
                                              <p className="text-xs text-destructive">{errors.name.message}</p>
                                            )}
                                          </div>

                                          <div className="space-y-2">
                                            <Label htmlFor={`phone-${lead.id}`}>{t('directLeads.phone') || 'Phone'} *</Label>
                                            <Input
                                              id={`phone-${lead.id}`}
                                              {...register('phone_number')}
                                              disabled={updateMutation.isPending}
                                            />
                                            {errors.phone_number && (
                                              <p className="text-xs text-destructive">{errors.phone_number.message}</p>
                                            )}
                </div>
                  </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label htmlFor={`email-${lead.id}`}>{t('directLeads.email') || 'Email'}</Label>
                                            <Input
                                              id={`email-${lead.id}`}
                                              type="email"
                                              {...register('email')}
                                              disabled={updateMutation.isPending}
                                            />
                                            {errors.email && (
                                              <p className="text-xs text-destructive">{errors.email.message}</p>
                                            )}
                  </div>

                                          <div className="space-y-2">
                                            <Label htmlFor={`source-${lead.id}`}>{t('directLeads.source') || 'Source'}</Label>
                                            <Input
                                              id={`source-${lead.id}`}
                                              {...register('source')}
                                              disabled={updateMutation.isPending}
                                            />
                </div>
                  </div>

                                        <div className="space-y-2">
                                          <Label htmlFor={`message-${lead.id}`}>{t('directLeads.message') || 'Message'}</Label>
                                          <textarea
                                            id={`message-${lead.id}`}
                                            {...register('message')}
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={updateMutation.isPending}
                                          />
              </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                                            <Label htmlFor={`status-${lead.id}`}>{t('directLeads.status') || 'Status'}</Label>
                    <Select
                      onValueChange={(value) => setValue('status', value as any)}
                                              defaultValue={lead.status}
                      disabled={updateMutation.isPending}
                    >
                                              <SelectTrigger id={`status-${lead.id}`}>
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
                                            {errors.status && (
                                              <p className="text-xs text-destructive">{errors.status.message}</p>
                                            )}
                  </div>

                  <div className="space-y-2">
                                            <Label htmlFor={`priority-${lead.id}`}>{t('directLeads.priority') || 'Priority'}</Label>
                    <Select
                      onValueChange={(value) => setValue('priority', value as any)}
                                              defaultValue={lead.priority}
                      disabled={updateMutation.isPending}
                    >
                                              <SelectTrigger id={`priority-${lead.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                                            {errors.priority && (
                                              <p className="text-xs text-destructive">{errors.priority.message}</p>
                                            )}
                  </div>
                </div>

                                        {profile?.role === 'admin' && (
                <div className="space-y-2">
                                            <Label htmlFor={`assigned-${lead.id}`}>{t('directLeads.assignedTo') || 'Assigned To'}</Label>
                  <Select
                    onValueChange={(value) => setValue('assigned_to', value === 'none' ? undefined : value)}
                                              defaultValue={lead.assigned_to || 'none'}
                    disabled={updateMutation.isPending}
                  >
                                              <SelectTrigger id={`assigned-${lead.id}`}>
                      <SelectValue placeholder="Assign to user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                                                {users?.filter((u: any) => u.role === 'sales' || u.role === 'moderator').map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                                        )}

                                        {isSales && (
                <div className="space-y-2">
                                            <Label htmlFor={`assigned-${lead.id}`}>{t('directLeads.assignedTo') || 'Assigned To'}</Label>
                                            <Input
                                              id={`assigned-${lead.id}`}
                                              value={lead.assigned_user?.name || 'Unassigned'}
                                              disabled
                                              className="bg-muted"
                                            />
                                            <p className="text-xs text-muted-foreground">You cannot reassign direct leads</p>
                                          </div>
                                        )}

                                        <div className="space-y-2">
                                          <Label htmlFor={`notes-${lead.id}`}>{t('directLeads.notes') || 'Notes'}</Label>
                  <textarea
                                            id={`notes-${lead.id}`}
                    {...register('notes')}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={updateMutation.isPending}
                  />
                </div>

                                        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                                              setExpandedRowId(null)
                      reset()
                    }}
                                            disabled={updateMutation.isPending}
                                            className="w-full sm:w-auto"
                  >
                                            <X className="h-4 w-4 mr-2" />
                                            {t('common.cancel') || 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                                            className="transition-all duration-200 hover:scale-105 disabled:opacity-50 w-full sm:w-auto"
                                          >
                                            {updateMutation.isPending ? (
                                              <>
                                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                {t('common.loading') || 'Saving...'}
                                              </>
                                            ) : (
                                              t('common.save') || 'Save'
                                            )}
                  </Button>
                                        </div>
              </form>

                                      {/* Activity Section */}
                                      <div className="space-y-4 mt-4">
                                        {/* New Activity Form */}
                                        <Card>
                                          <CardHeader className="p-3 sm:p-6">
                                            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                                              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                              {t('leads.newActivity') || 'New activity'}
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="p-3 sm:p-6">
                                            <form onSubmit={activityHandleSubmit(onActivitySubmit)} className="space-y-4">
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                  <Label htmlFor={`activity-action-${lead.id}`}>{t('leads.action') || 'Action'} *</Label>
                                                  <Select
                                                    onValueChange={(value) => activitySetValue('action', value as any)}
                                                    disabled={activityMutation.isPending}
                                                  >
                                                    <SelectTrigger id={`activity-action-${lead.id}`}>
                                                      <SelectValue placeholder={t('leads.action') || 'Select action'} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="call">{t('leads.actionTypes.call') || 'Call'}</SelectItem>
                                                      <SelectItem value="meeting">{t('leads.actionTypes.meeting') || 'Meeting'}</SelectItem>
                                                      <SelectItem value="site_show">{t('leads.actionTypes.site_show') || 'Site Show'}</SelectItem>
                                                      <SelectItem value="managerial_action">{t('leads.actionTypes.managerial_action') || 'Managerial Action'}</SelectItem>
                                                      <SelectItem value="end">{t('leads.actionTypes.end') || 'End'}</SelectItem>
                                                      <SelectItem value="message">{t('leads.actionTypes.message') || 'Message'}</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                  {activityErrors.action && (
                                                    <p className="text-xs text-destructive">{activityErrors.action.message}</p>
                                                  )}
            </div>

                                                <div className="space-y-2">
                                                  <Label htmlFor={`activity-result-${lead.id}`}>{t('leads.result') || 'Result'}</Label>
                                                  <Select
                                                    onValueChange={(value) => activitySetValue('result', value)}
                                                    disabled={activityMutation.isPending}
                                                  >
                                                    <SelectTrigger id={`activity-result-${lead.id}`}>
                                                      <SelectValue placeholder={t('leads.result') || 'Select result'} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="successful">{t('leads.resultTypes.successful') || 'Successful'}</SelectItem>
                                                      <SelectItem value="no_answer">{t('leads.resultTypes.no_answer') || 'No Answer'}</SelectItem>
                                                      <SelectItem value="busy">{t('leads.resultTypes.busy') || 'Busy'}</SelectItem>
                                                      <SelectItem value="follow_up">{t('leads.resultTypes.follow_up') || 'Follow Up'}</SelectItem>
                                                      <SelectItem value="cancelled">{t('leads.resultTypes.cancelled') || 'Cancelled'}</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>

                                              <div className="space-y-2">
                                                <Label htmlFor={`activity-notes-${lead.id}`}>{t('leads.notesOptional') || 'Notes (Optional)'}</Label>
                                                <textarea
                                                  id={`activity-notes-${lead.id}`}
                                                  {...activityRegister('notes')}
                                                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                  disabled={activityMutation.isPending}
                                                />
                                              </div>

                                              <div className="space-y-2">
                                                <Label htmlFor={`activity-follow-up-${lead.id}`}>{t('leads.followUpDate') || 'Follow-up Date'}</Label>
                                                <Input
                                                  id={`activity-follow-up-${lead.id}`}
                                                  type="datetime-local"
                                                  {...activityRegister('follow_up_date')}
                                                  disabled={activityMutation.isPending}
                                                />
                                              </div>

                                              <div className="flex justify-end">
                                                <Button
                                                  type="submit"
                                                  disabled={activityMutation.isPending}
                                                  className="transition-all duration-200 hover:scale-105 disabled:opacity-50 w-full sm:w-auto"
                                                >
                                                  {activityMutation.isPending ? (
                                                    <>
                                                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                      {t('common.loading') || 'Saving...'}
                                                    </>
                                                  ) : (
                                                    t('common.save') || 'SAVE'
                                                  )}
                                                </Button>
                                              </div>
                                            </form>
                                          </CardContent>
                                        </Card>

                                        {/* Recent Activities */}
                                        <Card>
                                          <CardHeader className="p-3 sm:p-6">
                                            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                              {t('leads.recentActivities') || 'Recent activities'}
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="p-3 sm:p-6">
                                            {activities && activities.length > 0 ? (
                                              <div className="space-y-2 sm:space-y-3">
                                                {activities.map((activity) => (
                                                  <div
                                                    key={activity.id}
                                                    className="p-3 sm:p-4 rounded-lg border bg-muted/30 space-y-2 sm:space-y-3"
                                                  >
                                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                                                      <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm sm:text-base truncate">{lead.name}</div>
                                                        {activity.notes && (
                                                          <div className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">{activity.notes}</div>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                                        <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary capitalize whitespace-nowrap">
                                                          {t(`leads.actionTypes.${activity.action}` as any) || activity.action.replace('_', ' ')}
                                                        </span>
                                                        {activity.result && (
                                                          <span className="px-2 py-1 rounded text-xs font-medium bg-secondary text-secondary-foreground capitalize whitespace-nowrap">
                                                            {t(`leads.resultTypes.${activity.result}` as any) || activity.result.replace('_', ' ')}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:gap-4 text-xs text-muted-foreground">
                                                      <div className="flex items-center gap-1 flex-wrap">
                                                        <Calendar className="h-3 w-3 flex-shrink-0" />
                                                        <span className="whitespace-nowrap">{new Date(activity.created_at).toLocaleDateString()}</span>
                                                      </div>
                                                      {activity.follow_up_date && (
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                          <Clock className="h-3 w-3 flex-shrink-0" />
                                                          <span className="whitespace-nowrap">{new Date(activity.follow_up_date).toLocaleString()}</span>
                                                        </div>
                                                      )}
                                                      {activity.created_by_user && (
                                                        <div className="text-xs truncate min-w-0">
                                                          <span className="hidden sm:inline">by </span>
                                                          <span className="font-medium">{activity.created_by_user.name}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                                                {t('leads.noActivities') || 'No activities yet'}
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length + 2} className="h-24 text-center animate-in fade-in-50 duration-500">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <p className="text-lg">{t('common.noData') || 'No direct leads found'}</p>
                              <p className="text-sm">Try adjusting your filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2 sm:p-4">
                {isLoading ? (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <LeadCardSkeleton key={i} />
                    ))}
                  </>
                ) : paginatedLeads && paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead: DirectLead, index: number) => {
                    const isExpanded = expandedRowId === lead.id
                    return (
                      <React.Fragment key={lead.id}>
                        <Card className={cn(
                          "relative backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40",
                          "transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/50",
                          isExpanded && "ring-2 ring-primary shadow-xl scale-[1.02]",
                          "animate-in fade-in-50 slide-in-from-bottom-4"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <CardHeader className="p-3 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base sm:text-lg truncate">{lead.name}</CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">{lead.phone_number}</p>
                                {lead.email && (
                                  <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                                )}
                              </div>
                              <div className="flex gap-1 self-end sm:self-auto">
                                {(canEdit || isSales) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleExpand(lead)}
                                    className="h-8 w-8 text-primary hover:text-primary transition-all duration-200 hover:scale-110 hover:bg-primary/10"
                                    title={t('directLeads.editLead') || 'Edit Direct Lead'}
                                    disabled={updateMutation.isPending}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 transition-transform duration-300" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 transition-transform duration-300" />
                                    )}
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(lead)}
                                    className="h-8 w-8 text-destructive hover:text-destructive transition-all duration-200 hover:scale-110 hover:bg-destructive/10"
                                    title={t('directLeads.deleteLead') || 'Delete Direct Lead'}
                                    disabled={deleteMutation.isPending}
                                  >
                                    {deleteMutation.isPending && leadToDelete?.id === lead.id ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-6 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(lead.status)}`}>
                                {lead.status}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(lead.priority)}`}>
                                {lead.priority}
                              </span>
                              {lead.source && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-muted capitalize">
                                  {lead.source}
                                </span>
                              )}
                            </div>
                            
                            {lead.message && (
                              <div className="text-xs sm:text-sm">
                                <p className="text-muted-foreground line-clamp-2 break-words">{lead.message}</p>
                              </div>
                            )}

                            {lead.assigned_user ? (
                              <div className="text-xs sm:text-sm">
                                <span className="text-muted-foreground">Assigned to: </span>
                                <span className="font-medium break-words">{lead.assigned_user.name}</span>
                                <span className="text-xs text-muted-foreground ml-1 capitalize">({lead.assigned_user.role})</span>
                              </div>
                            ) : (
                              <div className="text-xs sm:text-sm text-muted-foreground italic">Unassigned</div>
                            )}

                            <div className="text-xs text-muted-foreground">
                              Created: {new Date(lead.created_at).toLocaleDateString()}
                            </div>
                          </CardContent>
                        </Card>
                        {isExpanded && viewMode === 'cards' && (
                          <div className="col-span-full mt-4 animate-in slide-in-from-top-4 fade-in-50 duration-500">
                            <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40 transition-all duration-300">
                              <CardContent className="p-3 sm:p-6 space-y-4">
                                {/* Edit form and activities - same as table view */}
                                <p className="text-sm text-muted-foreground">Edit form and activities available in table view</p>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground animate-in fade-in-50 duration-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-lg">{t('common.noData') || 'No direct leads found'}</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Pagination Controls */}
      {filteredLeads.length > itemsPerPage && (
        <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40 transition-all duration-300 hover:shadow-lg animate-in slide-in-from-bottom-4 fade-in-50 duration-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Showing <span className="font-medium text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredLeads.length)}</span> of{' '}
                <span className="font-medium text-foreground">{filteredLeads.length}</span> direct leads
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[36px] sm:min-w-[40px] h-8 sm:h-9 text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
