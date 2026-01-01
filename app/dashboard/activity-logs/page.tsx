'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/data-table'
import { useAuthStore } from '@/store/auth-store'
import { Badge } from '@/components/ui/badge'
import { User, FileText, Home, Users, Folder, MessageSquare, Settings, Trash2, Edit, Plus, LogIn, LogOut } from 'lucide-react'

interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  description: string | null
  metadata: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    name: string
    email: string
    role: string
  }
}

async function getActivityLogs() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      user:users (
        name,
        email,
        role
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1000) // Limit to last 1000 logs for performance

  if (error) throw error
  return data as ActivityLog[]
}

const getActionIcon = (action: string, entityType: string) => {
  if (action === 'login' || action === 'logout') {
    return action === 'login' ? LogIn : LogOut
  }
  
  if (action === 'create') return Plus
  if (action === 'update') return Edit
  if (action === 'delete') return Trash2
  
  return FileText
}

const getActionColor = (action: string) => {
  if (action === 'login') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (action === 'logout') return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  if (action === 'create') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (action === 'update') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  if (action === 'delete') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  if (action.startsWith('bulk_')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

const getEntityIcon = (entityType: string) => {
  const icons: Record<string, any> = {
    user: Users,
    post: FileText,
    property: Home,
    category: Folder,
    lead: MessageSquare,
    direct_lead: MessageSquare,
    leads_assignment: MessageSquare,
    property_owner: Users,
    slider: FileText,
    team_user: Users,
    newsletter_subscriber: Users,
    project: Home,
    project_category: Folder,
    booking: FileText,
    property_comment: MessageSquare,
    property_type: Home,
    governorate: Home,
    area: Home,
    street: Home,
    property_facility: Home,
    property_service: Home,
    payment_method: Settings,
    property_view_type: Home,
    property_finishing_type: Home,
    section: Home,
    featured_area: Home,
    property_image: FileText,
    post_gallery: FileText,
    settings: Settings,
  }
  return icons[entityType] || FileText
}

export default function ActivityLogsPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()

  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: getActivityLogs,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  })

  // Only admins can view activity logs
  if (profile?.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('common.error') || 'Access Denied'}</h1>
          <p className="text-muted-foreground">
            {t('activityLogs.accessDenied') || 'You do not have permission to view activity logs.'}
          </p>
        </div>
      </div>
    )
  }

  const columns = [
    {
      key: 'created_at',
      header: t('activityLogs.timestamp') || 'Timestamp',
      sortable: true,
      render: (value: string) => {
        const date = new Date(value)
        return (
          <div>
            <div className="font-medium">{date.toLocaleDateString()}</div>
            <div className="text-sm text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        )
      },
    },
    {
      key: 'user',
      header: t('activityLogs.user') || 'User',
      sortable: true,
      render: (_: any, row: ActivityLog) => {
        if (row.user) {
          return (
            <div>
              <div className="font-medium">{row.user.name}</div>
              <div className="text-sm text-muted-foreground">{row.user.email}</div>
              <div className="text-xs text-muted-foreground">({row.user.role})</div>
            </div>
          )
        }
        return <span className="text-muted-foreground">{t('activityLogs.system') || 'System'}</span>
      },
    },
    {
      key: 'action',
      header: t('activityLogs.action') || 'Action',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'create', label: 'Create' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'bulk_create', label: 'Bulk Create' },
        { value: 'bulk_update', label: 'Bulk Update' },
        { value: 'bulk_delete', label: 'Bulk Delete' },
      ],
      render: (value: string, row: ActivityLog) => {
        const Icon = getActionIcon(value, row.entity_type)
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <Badge className={getActionColor(value)}>
              {value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')}
            </Badge>
          </div>
        )
      },
    },
    {
      key: 'entity_type',
      header: t('activityLogs.entityType') || 'Entity Type',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'post', label: 'Post' },
        { value: 'user', label: 'User' },
        { value: 'property', label: 'Property' },
        { value: 'category', label: 'Category' },
        { value: 'lead', label: 'Lead' },
        { value: 'direct_lead', label: 'Direct Lead' },
        { value: 'property_owner', label: 'Property Owner' },
        { value: 'booking', label: 'Booking' },
        { value: 'property_comment', label: 'Property Comment' },
      ],
      render: (value: string) => {
        const Icon = getEntityIcon(value)
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="capitalize">{value.replace(/_/g, ' ')}</span>
          </div>
        )
      },
    },
    {
      key: 'entity_name',
      header: t('activityLogs.entityName') || 'Entity',
      render: (value: string | null, row: ActivityLog) => {
        if (value) {
          return (
            <div className="max-w-xs truncate" title={value}>
              {value}
            </div>
          )
        }
        if (row.entity_id) {
          return <span className="text-muted-foreground text-sm">ID: {row.entity_id.substring(0, 8)}...</span>
        }
        return <span className="text-muted-foreground">-</span>
      },
    },
    {
      key: 'description',
      header: t('activityLogs.description') || 'Description',
      render: (value: string | null) => {
        if (value) {
          return (
            <div className="max-w-md truncate" title={value}>
              {value}
            </div>
          )
        }
        return <span className="text-muted-foreground">-</span>
      },
    },
  ]

  const filters = [
    {
      key: 'action',
      label: t('activityLogs.action') || 'Action',
      type: 'select' as const,
      options: [
        { value: 'create', label: 'Create' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
      ],
    },
    {
      key: 'entity_type',
      label: t('activityLogs.entityType') || 'Entity Type',
      type: 'select' as const,
      options: [
        { value: 'post', label: 'Post' },
        { value: 'user', label: 'User' },
        { value: 'property', label: 'Property' },
        { value: 'category', label: 'Category' },
        { value: 'lead', label: 'Lead' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('activityLogs.title') || 'Activity Logs'}</h1>
        <p className="text-muted-foreground">
          {t('activityLogs.description') || 'View all user activities and system events'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('activityLogs.title') || 'Activity Logs'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={logs}
            columns={columns}
            isLoading={isLoading}
            searchKey={['description', 'entity_name']}
            searchPlaceholder={t('common.search')}
            filters={filters}
            enableExport={true}
            exportFilename="activity-logs"
          />
        </CardContent>
      </Card>
    </div>
  )
}

