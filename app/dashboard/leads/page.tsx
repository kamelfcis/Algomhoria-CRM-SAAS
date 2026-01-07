'use client'

import React, { useState, useMemo, useCallback, memo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, ChevronDown, ChevronUp, X, Plus, Calendar, Clock, Grid3x3, List, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
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

const leadUpdateSchema = z.object({
  type: z.enum(['message', 'inquiry', 'complaint']),
  name: z.string().min(1, 'Name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.union([
    z.string().email('Invalid email address'),
    z.literal(''),
  ]).optional(),
  message: z.string().min(1, 'Message is required'),
  entity_type: z.string().optional().or(z.literal('')),
  entity_title: z.string().optional().or(z.literal('')),
  status: z.enum(['new', 'handled', 'archived']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().optional().or(z.literal('')),
})

const leadCreateSchema = z.object({
  type: z.enum(['message', 'inquiry', 'complaint']),
  name: z.string().min(1, 'Name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.union([
    z.string().email('Invalid email address'),
    z.literal(''),
  ]).optional(),
  message: z.string().min(1, 'Message is required'),
  entity_type: z.string().optional().or(z.literal('')),
  entity_title: z.string().optional().or(z.literal('')),
  status: z.enum(['new', 'handled', 'archived']).default('new'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().optional().or(z.literal('')),
})

type LeadUpdateForm = z.infer<typeof leadUpdateSchema>
type LeadCreateForm = z.infer<typeof leadCreateSchema>

const activitySchema = z.object({
  action: z.enum(['call', 'meeting', 'site_show', 'managerial_action', 'end', 'message'], {
    required_error: 'Action is required',
  }),
  result: z.string().optional(),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
})

type ActivityForm = z.infer<typeof activitySchema>

interface Lead {
  id: string
  type: string
  name: string
  phone_number: string
  email: string | null
  message: string
  entity_type: string | null
  entity_title: string | null
  status: string
  priority: string
  assigned_to: string | null
  notes: string | null
  created_at: string
  handled_at: string | null
  contacted_at: string | null
  assigned_user?: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

interface LeadActivity {
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

async function getLeads() {
  const supabase = createClient()
  
  // First get all leads
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (leadsError) {
    console.error('Error fetching leads:', leadsError)
    throw leadsError
  }

  // Get all unique user IDs from assigned_to
  const assignedUserIds = [...new Set(leadsData?.map((lead: any) => lead.assigned_to).filter(Boolean) || [])]
  
  // Fetch user details for assigned users
  let usersMap: Record<string, { id: string; name: string; email: string; role: string }> = {}
  if (assignedUserIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', assignedUserIds)
    
    if (usersData) {
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        usersData.map(async (user: any) => {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select(`
              role_id,
              roles!inner(name, status)
            `)
            .eq('user_id', user.id)
          
          const activeRole = userRoles?.find((ur: any) => ur.roles?.status === 'active')
          const roleName = (activeRole as any)?.roles?.name || 'user'
          
          return {
            ...user,
            role: roleName,
          }
        })
      )
      
      usersMap = usersWithRoles.reduce((acc: any, user: any) => {
        acc[user.id] = user
        return acc
      }, {})
    }
  }

  // Combine leads with user data
  return (leadsData || []).map((lead: any) => ({
    ...lead,
    assigned_user: lead.assigned_to ? usersMap[lead.assigned_to] || null : null,
  })) as (Lead & { assigned_user?: { id: string; name: string; email: string; role: string } | null })[]
}

async function getUsers() {
  const supabase = createClient()
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('status', 'active')
  
  if (error || !users) return []
  
  // Fetch roles and filter by role names
  const usersWithRoles = await Promise.all(
    users.map(async (user: any) => {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles!inner(name, status)
        `)
        .eq('user_id', user.id)
      
      const activeRole = userRoles?.find((ur: any) => ur.roles?.status === 'active')
      const roleName = (activeRole as any)?.roles?.name || 'user'
      
      return {
        ...user,
        role: roleName,
      }
    })
  )
  
  // Filter by allowed roles
  return usersWithRoles.filter((u: any) => ['admin', 'sales', 'moderator'].includes(u.role))
}

async function updateLead(id: string, leadData: Partial<LeadUpdateForm>) {
  const supabase = createClient()
  
  // Get current lead to check status change (optional - don't fail if we can't fetch it)
  let currentLead: { status: string; handled_at: string | null } | null = null
  const { data: fetchedLead, error: fetchError } = await supabase
    .from('leads')
    .select('status, handled_at')
    .eq('id', id)
    .maybeSingle()

  if (!fetchError && fetchedLead) {
    currentLead = fetchedLead
  }

  const updateData: any = {
    type: leadData.type,
    name: leadData.name,
    phone_number: leadData.phone_number,
    message: leadData.message,
    status: leadData.status,
    priority: leadData.priority,
    email: (leadData.email && leadData.email.trim() !== '') ? leadData.email : null,
    entity_type: (leadData.entity_type && leadData.entity_type.trim() !== '') ? leadData.entity_type : null,
    entity_title: (leadData.entity_title && leadData.entity_title.trim() !== '') ? leadData.entity_title : null,
    assigned_to: leadData.assigned_to || null,
    notes: (leadData.notes && leadData.notes.trim() !== '') ? leadData.notes : null,
  }

  // Update handled_at if status changes to handled
  if (currentLead && leadData.status === 'handled' && currentLead.status !== 'handled' && !currentLead.handled_at) {
    updateData.handled_at = new Date().toISOString()
  }

  // Update the lead - use maybeSingle to avoid errors if no rows returned
  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .select('*')

  if (error) {
    console.error('Error updating lead:', error)
    // If it's a permission error, provide a more helpful message
    if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
      throw new Error('Lead not found or you do not have permission to update this lead. Please check if the lead is assigned to you.')
    }
    throw error
  }

  // Check if update was successful
  if (!data || data.length === 0) {
    throw new Error('Lead not found or you do not have permission to update this lead. Please check if the lead is assigned to you.')
  }

  return data[0]
}

async function createLead(leadData: LeadCreateForm) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const insertData: any = {
    type: leadData.type,
    name: leadData.name,
    phone_number: leadData.phone_number,
    message: leadData.message,
    status: leadData.status,
    priority: leadData.priority,
    email: (leadData.email && leadData.email.trim() !== '') ? leadData.email : null,
    entity_type: (leadData.entity_type && leadData.entity_type.trim() !== '') ? leadData.entity_type : null,
    entity_title: (leadData.entity_title && leadData.entity_title.trim() !== '') ? leadData.entity_title : null,
    assigned_to: leadData.assigned_to || null,
    notes: (leadData.notes && leadData.notes.trim() !== '') ? leadData.notes : null,
    created_by: user?.id || null,
  }

  const { data, error } = await supabase
    .from('leads')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteLead(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) throw error
}

async function getLeadActivities(leadId: string) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching activities:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Get unique user IDs
    const userIds = [...new Set(data.map((item: any) => item.created_by).filter(Boolean))]
    
    // Fetch user details
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
    
    // Transform the data to match our interface
    return (data || []).map((item: any) => ({
      ...item,
      created_by_user: item.created_by ? usersMap[item.created_by] || null : null,
    })) as LeadActivity[]
  } catch (err) {
    console.error('Error in getLeadActivities:', err)
    return []
  }
}

async function createLeadActivity(activityData: {
  lead_id?: string
  direct_lead_id?: string
  action: string
  result?: string
  notes?: string
  follow_up_date?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const insertData: any = {
    ...activityData,
    lead_id: activityData.lead_id || null,
    direct_lead_id: activityData.direct_lead_id || null,
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

  // Fetch user details if created_by exists
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
    } catch (userErr) {
      console.error('Error fetching user for activity:', userErr)
    }
  }

  return {
    ...data,
    created_by_user: createdByUser,
  } as LeadActivity
}

async function updateLeadActivity(
  activityId: string,
  activityData: {
    action?: string
    result?: string
    notes?: string
    follow_up_date?: string | null
  }
) {
  const supabase = createClient()

  const updateData: any = {
    action: activityData.action,
    result: activityData.result || null,
    notes: activityData.notes || null,
    follow_up_date: activityData.follow_up_date || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('lead_activities')
    .update(updateData)
    .eq('id', activityId)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating activity:', error)
    throw error
  }

  return data as LeadActivity
}

async function deleteLeadActivity(activityId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('lead_activities')
    .delete()
    .eq('id', activityId)

  if (error) {
    console.error('Error deleting activity:', error)
    throw error
  }
}

export default function LeadsPage() {
  const t = useTranslations()
  const { profile, user } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  // Check permissions
  const { canView, canCreate, canEdit, canDelete, isLoading: isCheckingPermissions } = usePermissions('leads')
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  
  // Activity editing state
  const [editingActivity, setEditingActivity] = useState<LeadActivity | null>(null)
  const [activityToDelete, setActivityToDelete] = useState<LeadActivity | null>(null)
  const [deleteActivityDialogOpen, setDeleteActivityDialogOpen] = useState(false)
  const [isFormHighlighted, setIsFormHighlighted] = useState(false)

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: getLeads,
    enabled: canView, // Only fetch if user has view permission
  })

  const { data: users } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: getUsers,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeadUpdateForm> }) =>
      updateLead(id, data),
    onMutate: async ({ id, data: newData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      
      // Snapshot previous value
      const previousLeads = queryClient.getQueryData<Lead[]>(['leads'])
      
      // Optimistically update
      queryClient.setQueryData<Lead[]>(['leads'], (old) => {
        if (!old) return old
        return old.map((lead) =>
          lead.id === id ? { ...lead, ...newData } : lead
        )
      })
      
      return { previousLeads }
    },
    onSuccess: async (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      const previousLead = leads?.find(l => l.id === variables.id)
      setExpandedRowId(null)
      reset()
      // Log activity
      if (previousLead && data?.id) {
        await ActivityLogger.update(
          'lead',
          data.id,
          data.name || data.email || 'Untitled Lead',
          previousLead,
          data
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('leads.updatedSuccessfully') || 'Lead has been updated successfully',
        variant: 'success',
      })
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('leads.updateError') || 'Failed to update lead. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: createLead,
    onMutate: async (newLead) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const previousLeads = queryClient.getQueryData<Lead[]>(['leads'])
      
      // Optimistically add new lead
      const optimisticLead: Lead = {
        id: `temp-${Date.now()}`,
        ...newLead,
        created_at: new Date().toISOString(),
        handled_at: null,
        contacted_at: null,
        assigned_user: null,
      } as Lead
      
      queryClient.setQueryData<Lead[]>(['leads'], (old) => {
        return old ? [optimisticLead, ...old] : [optimisticLead]
      })
      
      return { previousLeads }
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setIsCreating(false)
      createReset()
      // Log activity
      if (data?.id) {
        await ActivityLogger.create(
          'lead',
          data.id,
          data.name || data.email || 'Untitled Lead'
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('leads.createdSuccessfully') || 'Lead has been created successfully',
        variant: 'success',
      })
    },
    onError: (error: any, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('leads.createError') || 'Failed to create lead. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const previousLeads = queryClient.getQueryData<Lead[]>(['leads'])
      
      // Optimistically remove lead
      queryClient.setQueryData<Lead[]>(['leads'], (old) => {
        return old ? old.filter((lead) => lead.id !== deletedId) : []
      })
      
      return { previousLeads }
    },
    onSuccess: async (_, deletedId) => {
      const deletedLead = leadToDelete || leads?.find(l => l.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setDeleteDialogOpen(false)
      setLeadToDelete(null)
      // Log activity
      if (deletedLead) {
        await ActivityLogger.delete(
          'lead',
          deletedLead.id,
          deletedLead.name || deletedLead.email || 'Untitled Lead'
        )
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('leads.deletedSuccessfully') || 'Lead has been deleted successfully',
        variant: 'success',
      })
    },
    onError: (error: any, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('leads.deleteError') || 'Failed to delete lead. Please try again.',
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
  } = useForm<LeadUpdateForm>({
    resolver: zodResolver(leadUpdateSchema),
    defaultValues: {
      type: 'message',
      name: '',
      phone_number: '',
      email: '',
      message: '',
      entity_type: '',
      entity_title: '',
      status: 'new',
      priority: 'normal',
      assigned_to: undefined,
      notes: '',
    },
  })

  const {
    register: createRegister,
    handleSubmit: createHandleSubmit,
    formState: { errors: createErrors },
    reset: createReset,
    setValue: createSetValue,
  } = useForm<LeadCreateForm>({
    resolver: zodResolver(leadCreateSchema),
    defaultValues: {
      type: 'message',
      status: 'new',
      priority: 'normal',
      email: '',
      entity_type: '',
      entity_title: '',
      notes: '',
    },
  })

  const onSubmit = useCallback((data: LeadUpdateForm, leadId: string) => {
    updateMutation.mutate({ id: leadId, data })
  }, [updateMutation])

  const onCreateSubmit = useCallback((data: LeadCreateForm) => {
    createMutation.mutate(data)
  }, [createMutation])

  // Activity form
  const {
    register: activityRegister,
    handleSubmit: activityHandleSubmit,
    formState: { errors: activityErrors },
    reset: activityReset,
    setValue: activitySetValue,
    watch: activityWatch,
  } = useForm<ActivityForm>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      action: 'call',
      result: '',
      notes: '',
      follow_up_date: '',
    },
  })

  // Watch activity form values for controlled Select components
  const activityAction = activityWatch('action')
  const activityResult = activityWatch('result')

  // Get activities for expanded lead
  const { data: activities } = useQuery({
    queryKey: ['lead-activities', expandedRowId],
    queryFn: () => expandedRowId ? getLeadActivities(expandedRowId) : Promise.resolve([]),
    enabled: !!expandedRowId,
  })

  const activityMutation = useMutation({
    mutationFn: (data: ActivityForm & { leadId: string }) =>
      createLeadActivity({
        lead_id: data.leadId,
        action: data.action,
        result: data.result,
        notes: data.notes,
        follow_up_date: data.follow_up_date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', expandedRowId] })
      activityReset()
      toast({
        title: t('common.success') || 'Success',
        description: t('leads.activityCreated') || 'Activity created successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('leads.activityError') || 'Failed to create activity. Please try again.',
        variant: 'destructive',
      })
    },
  })

  // Update activity mutation
  const updateActivityMutation = useMutation({
    mutationFn: (data: ActivityForm & { activityId: string }) =>
      updateLeadActivity(data.activityId, {
        action: data.action,
        result: data.result,
        notes: data.notes,
        follow_up_date: data.follow_up_date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', expandedRowId] })
      setEditingActivity(null)
      activityReset()
      toast({
        title: t('common.success') || 'Success',
        description: t('leads.activityUpdated') || 'Activity updated successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('leads.activityUpdateError') || 'Failed to update activity. Please try again.',
        variant: 'destructive',
      })
    },
  })

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: string) => deleteLeadActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', expandedRowId] })
      setDeleteActivityDialogOpen(false)
      setActivityToDelete(null)
      toast({
        title: t('common.success') || 'Success',
        description: t('leads.activityDeleted') || 'Activity deleted successfully',
        variant: 'success',
      })
    },
    onError: (error: any) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('leads.activityDeleteError') || 'Failed to delete activity. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const onActivitySubmit = useCallback((data: ActivityForm) => {
    // Convert follow_up_date from datetime-local format to ISO string
    // datetime-local gives us "YYYY-MM-DDTHH:mm" in local time
    // We need to preserve the exact time the user selected
    let processedData = { ...data }
    if (data.follow_up_date) {
      // Parse the datetime-local string (format: "YYYY-MM-DDTHH:mm")
      // Create a Date object treating it as local time
      const dateStr = data.follow_up_date
      // new Date() with this format interprets it as local time
      // We'll use it directly and let the database handle timezone conversion
      // But we need to ensure it's in a proper format
      const localDate = new Date(dateStr)
      // Check if date is valid
      if (!isNaN(localDate.getTime())) {
        // Convert to ISO string - this will convert local time to UTC
        // The database should store it in UTC and convert back when reading
        processedData.follow_up_date = localDate.toISOString()
      } else {
        processedData.follow_up_date = null
      }
    }
    
    if (editingActivity) {
      // Update existing activity
      updateActivityMutation.mutate({ ...processedData, activityId: editingActivity.id })
    } else if (expandedRowId) {
      // Create new activity
      activityMutation.mutate({ ...processedData, leadId: expandedRowId })
    }
  }, [expandedRowId, editingActivity, activityMutation, updateActivityMutation])

  const handleEditActivity = useCallback((activity: LeadActivity) => {
    setEditingActivity(activity)
    activitySetValue('action', activity.action)
    activitySetValue('result', activity.result || '')
    activitySetValue('notes', activity.notes || '')
    // Format follow_up_date for datetime-local input (YYYY-MM-DDTHH:mm)
    // Use local time methods to preserve the time as displayed to the user
    if (activity.follow_up_date) {
      const date = new Date(activity.follow_up_date)
      // Format as YYYY-MM-DDTHH:mm using local time components
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`
      activitySetValue('follow_up_date', formattedDate)
    } else {
      activitySetValue('follow_up_date', '')
    }
    
    // Scroll to the activity form and add gold shine effect
    setTimeout(() => {
      const formElement = document.getElementById('activity-form')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Trigger gold shine animation
        setIsFormHighlighted(true)
        // Remove highlight after animation completes
        setTimeout(() => setIsFormHighlighted(false), 2000)
      }
    }, 100)
  }, [activitySetValue])

  const handleCancelEditActivity = useCallback(() => {
    setEditingActivity(null)
    activityReset()
  }, [activityReset])

  const handleDeleteActivity = useCallback((activity: LeadActivity) => {
    setActivityToDelete(activity)
    setDeleteActivityDialogOpen(true)
  }, [])

  const confirmDeleteActivity = useCallback(() => {
    if (activityToDelete) {
      deleteActivityMutation.mutate(activityToDelete.id)
    }
  }, [activityToDelete, deleteActivityMutation])

  const handleToggleExpand = useCallback((lead: Lead) => {
    if (expandedRowId === lead.id) {
      setExpandedRowId(null)
      reset()
    } else {
      setExpandedRowId(lead.id)
      setValue('type', lead.type as any)
      setValue('name', lead.name)
      setValue('phone_number', lead.phone_number)
      setValue('email', lead.email || '')
      setValue('message', lead.message)
      setValue('entity_type', lead.entity_type || '')
      setValue('entity_title', lead.entity_title || '')
      setValue('status', lead.status as any)
      setValue('priority', lead.priority as any)
      setValue('assigned_to', lead.assigned_to || undefined)
      setValue('notes', lead.notes || '')
    }
  }, [expandedRowId, reset, setValue])

  const handleDelete = useCallback((lead: Lead) => {
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = useCallback(() => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete.id)
    }
  }, [leadToDelete, deleteMutation])

  // Check if user has sales role (for filtering purposes)
  // Sales users have create/edit permissions but NOT delete permissions
  // Admins have all permissions including delete, so they should see all leads
  const isSales = useMemo(() => {
    // If user has delete permissions, they're an admin and should see all leads
    // Only apply sales filter if user has create/edit but NOT delete permissions
    return (canCreate || canEdit) && !canDelete
  }, [canCreate, canEdit, canDelete])

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
      case 'handled':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
      case 'archived':
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
    }
  }, [])

  // Filter and search leads - memoized for performance
  const filteredLeads = useMemo(() => {
    if (!leads) return []
    
    return leads.filter((lead: any) => {
      // Sales users can only see leads assigned to them
      if (isSales && lead.assigned_to !== profile?.id) {
        return false
      }
      
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false
      if (priorityFilter !== 'all' && lead.priority !== priorityFilter) return false
      
      // Filter by assigned user (admin only)
      if (canEdit && assignedToFilter !== 'all') {
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
          !lead.message.toLowerCase().includes(query)
        ) return false
      }
      return true
    })
  }, [leads, isSales, profile?.id, profile?.role, statusFilter, priorityFilter, assignedToFilter, searchQuery, canEdit])

  // Memoized columns definition
  const columns = useMemo(() => [
    {
      key: 'name',
      header: t('leads.name') || 'Name',
      render: (value: string, row: Lead) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.phone_number}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('leads.type') || 'Type',
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      ),
    },
    {
      key: 'message',
      header: t('leads.message') || 'Message',
      render: (value: string) => (
        <div className="max-w-xs truncate">{value}</div>
      ),
    },
    {
      key: 'priority',
      header: t('leads.priority') || 'Priority',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('leads.status') || 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'assigned_to',
      header: t('leads.assignedTo') || 'Assigned To',
      render: (value: string | null, row: any) => {
        if (!value) {
          return <span className="text-muted-foreground italic">Unassigned</span>
        }
        const assignedUser = row.assigned_user
        if (assignedUser) {
          return (
            <div>
              <div className="font-medium">{assignedUser.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{assignedUser.role}</div>
            </div>
          )
        }
        return <span className="text-muted-foreground">-</span>
      },
    },
    {
      key: 'created_at',
      header: t('leads.createdAt') || 'Created At',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ], [t, getPriorityColor, getStatusColor])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, priorityFilter, assignedToFilter, searchQuery])
  
  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredLeads.slice(startIndex, endIndex)
  }, [filteredLeads, currentPage])
  
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  
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
              {t('leads.noPermission') || 'You do not have permission to view leads.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gold-dark via-gold to-gold-light bg-clip-text text-transparent animate-in fade-in-50 duration-700">
            {t('leads.title') || 'Leads'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground animate-in fade-in-50 duration-700 delay-100">
            Manage customer inquiries and leads
          </p>
        </div>
        {(canCreate && !isSales) && (
          <Button 
            onClick={() => setIsCreating(!isCreating)}
            className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in fade-in-50 duration-700 delay-200 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('leads.createLead') || 'Create Lead'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40 transition-all duration-300 hover:shadow-lg animate-in slide-in-from-top-4 duration-500 delay-150">
        <CardHeader>
          <CardTitle className="animate-in fade-in-50 duration-500">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap animate-in fade-in-50 duration-500 delay-200">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="handled">Handled</SelectItem>
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

            {canEdit && (
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
          <CardTitle className="animate-in fade-in-50 duration-500 text-lg sm:text-xl">{t('leads.title') || 'Leads'}</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in-50 duration-500 delay-200">
              <div className="flex items-center gap-1 border rounded-md transition-all duration-300 hover:shadow-md self-center sm:self-auto">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3 transition-all duration-200 hover:scale-110"
                  title={t('leads.tableView') || 'Table View'}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="h-8 px-3 transition-all duration-200 hover:scale-110"
                  title={t('leads.cardView') || 'Card View'}
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
          <div className="rounded-md border">
            {/* Create Lead Form */}
            {isCreating && (
              <div className="p-6 border-b bg-muted/30 animate-in slide-in-from-top-4 duration-500 fade-in-50">
                <form onSubmit={createHandleSubmit(onCreateSubmit)} className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-sm">Create New Lead</h4>
                  <Button
                      type="button"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-type">{t('leads.type') || 'Type'} *</Label>
                      <Select
                        onValueChange={(value) => createSetValue('type', value as any)}
                        defaultValue="message"
                        disabled={createMutation.isPending}
                      >
                        <SelectTrigger id="create-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="message">Message</SelectItem>
                          <SelectItem value="inquiry">Inquiry</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                        </SelectContent>
                      </Select>
                      {createErrors.type && (
                        <p className="text-xs text-destructive">{createErrors.type.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-status">{t('leads.status') || 'Status'}</Label>
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
                          <SelectItem value="handled">Handled</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-name">{t('leads.name') || 'Name'} *</Label>
                      <Input
                        id="create-name"
                        {...createRegister('name')}
                        disabled={createMutation.isPending}
                        placeholder="Enter lead name"
                      />
                      {createErrors.name && (
                        <p className="text-xs text-destructive">{createErrors.name.message}</p>
                )}
              </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-phone">{t('leads.phone') || 'Phone'} *</Label>
                      <Input
                        id="create-phone"
                        {...createRegister('phone_number')}
                        disabled={createMutation.isPending}
                        placeholder="Enter phone number"
                      />
                      {createErrors.phone_number && (
                        <p className="text-xs text-destructive">{createErrors.phone_number.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-email">{t('leads.email') || 'Email'}</Label>
                      <Input
                        id="create-email"
                        type="email"
                        {...createRegister('email')}
                        disabled={createMutation.isPending}
                        placeholder="Enter email (optional)"
                      />
                      {createErrors.email && (
                        <p className="text-xs text-destructive">{createErrors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-priority">{t('leads.priority') || 'Priority'}</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="create-message">{t('leads.message') || 'Message'} *</Label>
                    <textarea
                      id="create-message"
                      {...createRegister('message')}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={createMutation.isPending}
                      placeholder="Enter message"
                    />
                    {createErrors.message && (
                      <p className="text-xs text-destructive">{createErrors.message.message}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-entity-type">Entity Type (Optional)</Label>
                      <Input
                        id="create-entity-type"
                        {...createRegister('entity_type')}
                        disabled={createMutation.isPending}
                        placeholder="e.g., property, post"
                      />
                  </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-entity-title">Entity Title (Optional)</Label>
                      <Input
                        id="create-entity-title"
                        {...createRegister('entity_title')}
                        disabled={createMutation.isPending}
                        placeholder="Entity title"
                      />
                  </div>
                </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-assigned-to">{t('leads.assignedTo') || 'Assigned To'}</Label>
                      <Select
                        onValueChange={(value) => createSetValue('assigned_to', value === 'none' ? undefined : value)}
                        defaultValue="none"
                        disabled={createMutation.isPending}
                      >
                        <SelectTrigger id="create-assigned-to">
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
                      <Label htmlFor="create-notes">{t('leads.notes') || 'Notes'}</Label>
                      <Input
                        id="create-notes"
                        {...createRegister('notes')}
                        disabled={createMutation.isPending}
                        placeholder="Add notes (optional)"
                      />
                </div>
              </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false)
                        createReset()
                      }}
                      disabled={createMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('common.cancel') || 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    >
                      {createMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          {t('common.loading') || 'Creating...'}
                        </>
                      ) : (
                        t('common.create') || 'Create Lead'
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
                          <TableCell>
                            {(canEdit || isSales) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleExpand(lead)}
                                className="h-8 w-8"
                                title={isSales ? (t('leads.viewDetails') || 'View Details') : undefined}
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
                            const value = lead[column.key as keyof Lead]
                            return (
                              <TableCell key={String(column.key)} className="whitespace-nowrap">
                                {column.render ? column.render(value as any, lead) : String(value ?? '')}
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
                                  title={t('leads.editLead') || 'Edit Lead'}
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
                                  title={t('leads.deleteLead') || 'Delete Lead'}
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
                                  onSubmit={handleSubmit((data) => onSubmit(data, lead.id))}
                                  className="bg-background p-3 sm:p-4 rounded-lg border space-y-4"
                                >
                                  <h4 className="font-semibold text-sm mb-3">{t('leads.editLead') || 'Edit Lead'}</h4>
                                  
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                                      <Label htmlFor={`type-${lead.id}`}>{t('leads.type') || 'Type'} *</Label>
                                      <Select
                                        onValueChange={(value) => setValue('type', value as any)}
                                        defaultValue={lead.type}
                                        disabled={updateMutation.isPending}
                                      >
                                        <SelectTrigger id={`type-${lead.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="message">Message</SelectItem>
                                          <SelectItem value="inquiry">Inquiry</SelectItem>
                                          <SelectItem value="complaint">Complaint</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {errors.type && (
                                        <p className="text-xs text-destructive">{errors.type.message}</p>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor={`status-${lead.id}`}>{t('leads.status') || 'Status'}</Label>
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
                        <SelectItem value="handled">Handled</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                                      {errors.status && (
                                        <p className="text-xs text-destructive">{errors.status.message}</p>
                                      )}
                                    </div>
                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                                      <Label htmlFor={`name-${lead.id}`}>{t('leads.name') || 'Name'} *</Label>
                                      <Input
                                        id={`name-${lead.id}`}
                                        {...register('name')}
                                        disabled={updateMutation.isPending}
                                        placeholder="Enter lead name"
                                      />
                                      {errors.name && (
                                        <p className="text-xs text-destructive">{errors.name.message}</p>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor={`phone-${lead.id}`}>{t('leads.phone') || 'Phone'} *</Label>
                                      <Input
                                        id={`phone-${lead.id}`}
                                        {...register('phone_number')}
                                        disabled={updateMutation.isPending}
                                        placeholder="Enter phone number"
                                      />
                                      {errors.phone_number && (
                                        <p className="text-xs text-destructive">{errors.phone_number.message}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor={`email-${lead.id}`}>{t('leads.email') || 'Email'}</Label>
                                      <Input
                                        id={`email-${lead.id}`}
                                        type="email"
                                        {...register('email')}
                                        disabled={updateMutation.isPending}
                                        placeholder="Enter email (optional)"
                                      />
                                      {errors.email && (
                                        <p className="text-xs text-destructive">{errors.email.message}</p>
                                      )}
                </div>

                                    <div className="space-y-2">
                                      <Label htmlFor={`priority-${lead.id}`}>{t('leads.priority') || 'Priority'}</Label>
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

                <div className="space-y-2">
                                    <Label htmlFor={`message-${lead.id}`}>{t('leads.message') || 'Message'} *</Label>
                                    <textarea
                                      id={`message-${lead.id}`}
                                      {...register('message')}
                                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={updateMutation.isPending}
                                      placeholder="Enter message"
                                    />
                                    {errors.message && (
                                      <p className="text-xs text-destructive">{errors.message.message}</p>
                                    )}
                                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor={`entity_type-${lead.id}`}>Entity Type (Optional)</Label>
                                      <Input
                                        id={`entity_type-${lead.id}`}
                                        {...register('entity_type')}
                                        disabled={updateMutation.isPending}
                                        placeholder="e.g., property, post"
                                      />
                  </div>

                                    <div className="space-y-2">
                                      <Label htmlFor={`entity_title-${lead.id}`}>Entity Title (Optional)</Label>
                                      <Input
                                        id={`entity_title-${lead.id}`}
                                        {...register('entity_title')}
                                        disabled={updateMutation.isPending}
                                        placeholder="Entity title"
                                      />
                  </div>
                </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor={`assigned_to-${lead.id}`}>{t('leads.assignedTo') || 'Assigned To'}</Label>
                  <Select
                    onValueChange={(value) => setValue('assigned_to', value === 'none' ? undefined : value)}
                                        defaultValue={lead.assigned_to || 'none'}
                                        disabled={updateMutation.isPending || isSales}
                  >
                                        <SelectTrigger id={`assigned_to-${lead.id}`}>
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
                                      {isSales && (
                                        <p className="text-xs text-muted-foreground">You cannot reassign leads</p>
                                      )}
                </div>

                <div className="space-y-2">
                                      <Label htmlFor={`notes-${lead.id}`}>{t('leads.notes') || 'Notes'}</Label>
                  <textarea
                                        id={`notes-${lead.id}`}
                    {...register('notes')}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={updateMutation.isPending}
                                        placeholder="Add notes (optional)"
                  />
                                      {errors.notes && (
                                        <p className="text-xs text-destructive">{errors.notes.message}</p>
                                      )}
                </div>
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

                                {/* Activities Section */}
                                <div className="space-y-4">
                                  {/* New Activity Form */}
                                  <Card 
                                    id="activity-form"
                                    className={cn(
                                      "transition-all duration-500",
                                      isFormHighlighted && "ring-2 ring-gold shadow-[0_0_30px_rgba(250,199,8,0.6)] animate-pulse"
                                    )}
                                    style={isFormHighlighted ? {
                                      boxShadow: '0 0 30px rgba(250, 199, 8, 0.6), 0 0 60px rgba(250, 199, 8, 0.3), inset 0 0 20px rgba(250, 199, 8, 0.1)',
                                      borderColor: 'rgba(250, 199, 8, 0.8)',
                                    } : {}}
                                  >
                                    <CardHeader>
                                      <CardTitle className="text-sm flex items-center gap-2">
                                        <Plus className="h-4 w-4" />
                                        {editingActivity ? (t('leads.editActivity') || 'Edit activity') : (t('leads.newActivity') || 'New activity')}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <form onSubmit={activityHandleSubmit(onActivitySubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                                            <Label htmlFor={`activity-action-${lead.id}`}>{t('leads.action') || 'Action'} *</Label>
                                            <Select
                                              onValueChange={(value) => activitySetValue('action', value as any)}
                                              value={activityAction}
                                              disabled={activityMutation.isPending}
                                            >
                                              <SelectTrigger id={`activity-action-${lead.id}`}>
                                                <SelectValue placeholder="Choose" />
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
                                              onValueChange={(value) => activitySetValue('result', value === 'none' ? '' : value)}
                                              value={activityResult || 'none'}
                                              disabled={activityMutation.isPending}
                                            >
                                              <SelectTrigger id={`activity-result-${lead.id}`}>
                                                <SelectValue placeholder={t('leads.result') || 'Result'} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="none">{t('leads.result') || 'Choose'}</SelectItem>
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
                                          <Label htmlFor={`activity-notes-${lead.id}`}>{t('leads.notes') || 'Notes'}</Label>
                                          <textarea
                                            id={`activity-notes-${lead.id}`}
                                            {...activityRegister('notes')}
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={activityMutation.isPending}
                                            placeholder="Add notes about this activity..."
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

                                        <div className="flex justify-end gap-2">
                                          {editingActivity && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              onClick={handleCancelEditActivity}
                                              disabled={updateActivityMutation.isPending}
                                            >
                                              {t('common.cancel') || 'Cancel'}
                                            </Button>
                                          )}
                                          <Button
                                            type="submit"
                                            disabled={activityMutation.isPending || updateActivityMutation.isPending}
                                          >
                                            {(activityMutation.isPending || updateActivityMutation.isPending) 
                                              ? t('common.loading') || 'Saving...' 
                                              : editingActivity 
                                                ? t('common.update') || 'Update'
                                                : t('common.save') || 'Save'}
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
                                              className={cn(
                                                "p-3 sm:p-4 rounded-lg border bg-muted/30 space-y-2 sm:space-y-3",
                                                editingActivity?.id === activity.id && "ring-2 ring-primary border-primary"
                                              )}
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
                                                  {/* Edit and Delete buttons */}
                                                  {canEdit && (
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6"
                                                      onClick={() => handleEditActivity(activity)}
                                                      title={t('common.edit') || 'Edit'}
                                                    >
                                                      <Pencil className="h-3 w-3" />
                                                    </Button>
                                                  )}
                                                  {canDelete && (
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                                      onClick={() => handleDeleteActivity(activity)}
                                                      title={t('common.delete') || 'Delete'}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
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
                        <p className="text-lg">{t('common.noData') || 'No leads found'}</p>
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
                  paginatedLeads.map((lead: any, index: number) => {
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
                                  className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:text-primary"
                                  title={t('leads.editLead') || 'Edit Lead'}
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
                                  title={t('leads.deleteLead') || 'Delete Lead'}
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
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(lead.priority)}`}>
                              {lead.priority}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-muted capitalize">
                              {lead.type}
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            <p className="text-muted-foreground line-clamp-2">{lead.message}</p>
                          </div>

                          {lead.assigned_user ? (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Assigned to: </span>
                              <span className="font-medium">{lead.assigned_user.name}</span>
                              <span className="text-xs text-muted-foreground ml-1 capitalize">({lead.assigned_user.role})</span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">Unassigned</div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(lead.created_at).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                      {isExpanded && viewMode === 'cards' && (
                        <div className="col-span-full mt-4 animate-in slide-in-from-top-4 fade-in-50 duration-500">
                          <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40 transition-all duration-300">
                            <CardContent className="p-6 space-y-4">
                              {/* Edit Form - Same as table view */}
                              <form
                                onSubmit={handleSubmit((data) => onSubmit(data, lead.id))}
                                className="bg-background p-4 rounded-lg border space-y-4"
                              >
                                <h4 className="font-semibold text-sm mb-3">{t('leads.editLead') || 'Edit Lead'}</h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`type-${lead.id}`}>{t('leads.type') || 'Type'} *</Label>
                                    <Select
                                      onValueChange={(value) => setValue('type', value as any)}
                                      defaultValue={lead.type}
                                      disabled={updateMutation.isPending}
                                    >
                                      <SelectTrigger id={`type-${lead.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="message">Message</SelectItem>
                                        <SelectItem value="inquiry">Inquiry</SelectItem>
                                        <SelectItem value="complaint">Complaint</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {errors.type && (
                                      <p className="text-xs text-destructive">{errors.type.message}</p>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`status-${lead.id}`}>{t('leads.status') || 'Status'}</Label>
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
                        <SelectItem value="handled">Handled</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                                    {errors.status && (
                                      <p className="text-xs text-destructive">{errors.status.message}</p>
                                    )}
                                  </div>
                  </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                                    <Label htmlFor={`name-${lead.id}`}>{t('leads.name') || 'Name'} *</Label>
                                    <Input
                                      id={`name-${lead.id}`}
                                      {...register('name')}
                                      disabled={updateMutation.isPending}
                                      placeholder="Enter lead name"
                                    />
                                    {errors.name && (
                                      <p className="text-xs text-destructive">{errors.name.message}</p>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`phone-${lead.id}`}>{t('leads.phone') || 'Phone'} *</Label>
                                    <Input
                                      id={`phone-${lead.id}`}
                                      {...register('phone_number')}
                                      disabled={updateMutation.isPending}
                                      placeholder="Enter phone number"
                                    />
                                    {errors.phone_number && (
                                      <p className="text-xs text-destructive">{errors.phone_number.message}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`email-${lead.id}`}>{t('leads.email') || 'Email'}</Label>
                                    <Input
                                      id={`email-${lead.id}`}
                                      type="email"
                                      {...register('email')}
                                      disabled={updateMutation.isPending}
                                      placeholder="Enter email (optional)"
                                    />
                                    {errors.email && (
                                      <p className="text-xs text-destructive">{errors.email.message}</p>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`priority-${lead.id}`}>{t('leads.priority') || 'Priority'}</Label>
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

                <div className="space-y-2">
                                  <Label htmlFor={`message-${lead.id}`}>{t('leads.message') || 'Message'} *</Label>
                                  <textarea
                                    id={`message-${lead.id}`}
                                    {...register('message')}
                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={updateMutation.isPending}
                                    placeholder="Enter message"
                                  />
                                  {errors.message && (
                                    <p className="text-xs text-destructive">{errors.message.message}</p>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`entity_type-${lead.id}`}>Entity Type (Optional)</Label>
                                    <Input
                                      id={`entity_type-${lead.id}`}
                                      {...register('entity_type')}
                                      disabled={updateMutation.isPending}
                                      placeholder="e.g., property, post"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`entity_title-${lead.id}`}>Entity Title (Optional)</Label>
                                    <Input
                                      id={`entity_title-${lead.id}`}
                                      {...register('entity_title')}
                                      disabled={updateMutation.isPending}
                                      placeholder="Entity title"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`assigned_to-${lead.id}`}>{t('leads.assignedTo') || 'Assigned To'}</Label>
                  <Select
                    onValueChange={(value) => setValue('assigned_to', value === 'none' ? undefined : value)}
                                      defaultValue={lead.assigned_to || 'none'}
                                      disabled={updateMutation.isPending || isSales}
                  >
                                      <SelectTrigger id={`assigned_to-${lead.id}`}>
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
                                    {isSales && (
                                      <p className="text-xs text-muted-foreground">You cannot reassign leads</p>
                                    )}
                </div>

                <div className="space-y-2">
                                    <Label htmlFor={`notes-${lead.id}`}>{t('leads.notes') || 'Notes'}</Label>
                  <textarea
                                      id={`notes-${lead.id}`}
                    {...register('notes')}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={updateMutation.isPending}
                                      placeholder="Add notes (optional)"
                  />
                                    {errors.notes && (
                                      <p className="text-xs text-destructive">{errors.notes.message}</p>
                                    )}
                                  </div>
                </div>

                                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                                      setExpandedRowId(null)
                      reset()
                    }}
                                    disabled={updateMutation.isPending}
                  >
                                    <X className="h-4 w-4 mr-2" />
                                    {t('common.cancel') || 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                  >
                                    {updateMutation.isPending ? t('common.loading') || 'Saving...' : t('common.save') || 'Save'}
                  </Button>
                                </div>
              </form>

                              {/* Activities Section */}
                              <div className="space-y-4">
                                {/* New Activity Form */}
                                <Card 
                                  id="activity-form"
                                  className={cn(
                                    "transition-all duration-500",
                                    isFormHighlighted && "ring-2 ring-gold shadow-[0_0_30px_rgba(250,199,8,0.6)] animate-pulse"
                                  )}
                                  style={isFormHighlighted ? {
                                    boxShadow: '0 0 30px rgba(250, 199, 8, 0.6), 0 0 60px rgba(250, 199, 8, 0.3), inset 0 0 20px rgba(250, 199, 8, 0.1)',
                                    borderColor: 'rgba(250, 199, 8, 0.8)',
                                  } : {}}
                                >
                                  <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Plus className="h-4 w-4" />
                                      {editingActivity ? (t('leads.editActivity') || 'Edit activity') : (t('leads.newActivity') || 'New activity')}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <form onSubmit={activityHandleSubmit(onActivitySubmit)} className="space-y-4">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor={`activity-action-${lead.id}`}>{t('leads.action') || 'Action'} *</Label>
                                          <Select
                                            onValueChange={(value) => activitySetValue('action', value as any)}
                                            value={activityAction}
                                            disabled={activityMutation.isPending}
                                          >
                                            <SelectTrigger id={`activity-action-${lead.id}`}>
                                              <SelectValue placeholder="Choose" />
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
                                            onValueChange={(value) => activitySetValue('result', value === 'none' ? '' : value)}
                                            value={activityResult || 'none'}
                                            disabled={activityMutation.isPending}
                                          >
                                            <SelectTrigger id={`activity-result-${lead.id}`}>
                                              <SelectValue placeholder="Choose" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none">{t('leads.result') || 'Choose'}</SelectItem>
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
                                        <Label htmlFor={`activity-notes-${lead.id}`}>{t('leads.notes') || 'Notes'}</Label>
                                        <textarea
                                          id={`activity-notes-${lead.id}`}
                                          {...activityRegister('notes')}
                                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                          disabled={activityMutation.isPending}
                                          placeholder="Add notes about this activity..."
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

                                      <div className="flex justify-end gap-2">
                                        {editingActivity && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCancelEditActivity}
                                            disabled={updateActivityMutation.isPending}
                                          >
                                            {t('common.cancel') || 'Cancel'}
                                          </Button>
                                        )}
                                        <Button
                                          type="submit"
                                          disabled={activityMutation.isPending || updateActivityMutation.isPending}
                                        >
                                          {(activityMutation.isPending || updateActivityMutation.isPending) 
                                            ? t('common.loading') || 'Saving...' 
                                            : editingActivity 
                                              ? t('common.update') || 'Update'
                                              : t('common.save') || 'Save'}
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
                                            className={cn(
                                              "p-3 sm:p-4 rounded-lg border bg-muted/30 space-y-2 sm:space-y-3",
                                              editingActivity?.id === activity.id && "ring-2 ring-primary border-primary"
                                            )}
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
                                                {/* Edit and Delete buttons */}
                                                {canEdit && (
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleEditActivity(activity)}
                                                    title={t('common.edit') || 'Edit'}
                                                  >
                                                    <Pencil className="h-3 w-3" />
                                                  </Button>
                                                )}
                                                {canDelete && (
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteActivity(activity)}
                                                    title={t('common.delete') || 'Delete'}
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
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
                      <p className="text-lg">{t('common.noData') || 'No leads found'}</p>
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
              {t('leads.deleteLead') || `Are you sure you want to delete lead "${leadToDelete?.name || leadToDelete?.email || 'Untitled Lead'}"? This action cannot be undone.`}
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

      {/* Delete Activity Dialog */}
      <AlertDialog open={deleteActivityDialogOpen} onOpenChange={setDeleteActivityDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('leads.deleteActivity') || `Are you sure you want to delete this activity? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActivityToDelete(null)}>
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteActivity}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteActivityMutation.isPending}
            >
              {deleteActivityMutation.isPending ? t('common.loading') || 'Deleting...' : t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination Controls */}
      {filteredLeads.length > itemsPerPage && (
        <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40 transition-all duration-300">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Showing <span className="font-medium text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredLeads.length)}</span> of{' '}
                <span className="font-medium text-foreground">{filteredLeads.length}</span> leads
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
                <div className="flex items-center gap-1">
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
                        className="min-w-[40px] transition-all duration-200 hover:scale-105"
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

