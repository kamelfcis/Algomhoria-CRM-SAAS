'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Users, UserCheck, FileText, Home, TrendingUp, Clock, CheckCircle, 
  MessageSquare, Calendar, Mail, Building2, FolderKanban, Briefcase,
  MapPin, Star, CreditCard, Settings, Shield, History, Image, Phone, User, AlertCircle
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

async function getFollowUpLeads(startDate?: string, endDate?: string) {
  const supabase = createClient()
  
  try {
    // Build query for activities with follow_up_date
    let query = supabase
      .from('lead_activities')
      .select('id, lead_id, direct_lead_id, follow_up_date, action, notes, created_at')
      .not('follow_up_date', 'is', null)
      .order('follow_up_date', { ascending: true })

    // Apply date filters if provided
    // Convert date strings (YYYY-MM-DD) to ISO timestamps
    if (startDate) {
      // Parse date components and create date in local timezone
      const [year, month, day] = startDate.split('-').map(Number)
      const startDateObj = new Date(year, month - 1, day, 0, 0, 0, 0)
      const startDateTime = startDateObj.toISOString()
      query = query.gte('follow_up_date', startDateTime)
    }
    if (endDate) {
      // Parse date components and create date in local timezone at end of day
      const [year, month, day] = endDate.split('-').map(Number)
      const endDateObj = new Date(year, month - 1, day, 23, 59, 59, 999)
      const endDateTime = endDateObj.toISOString()
      query = query.lte('follow_up_date', endDateTime)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Error fetching follow-up leads:', error)
      return []
    }

    if (!activities || activities.length === 0) {
      return []
    }

    // Get all unique lead IDs and direct lead IDs
    const leadIds = activities.filter(a => a.lead_id).map(a => a.lead_id)
    const directLeadIds = activities.filter(a => a.direct_lead_id).map(a => a.direct_lead_id)

    // Fetch leads data
    let leadsMap: Record<string, any> = {}
    if (leadIds.length > 0) {
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, name, phone_number, email, assigned_to')
        .in('id', leadIds)
      
      if (leadsData) {
        leadsMap = leadsData.reduce((acc: any, lead: any) => {
          acc[lead.id] = lead
          return acc
        }, {})
      }
    }

    // Fetch direct leads data
    let directLeadsMap: Record<string, any> = {}
    if (directLeadIds.length > 0) {
      const { data: directLeadsData } = await supabase
        .from('direct_leads')
        .select('id, name, phone_number, email, assigned_to')
        .in('id', directLeadIds)
      
      if (directLeadsData) {
        directLeadsMap = directLeadsData.reduce((acc: any, lead: any) => {
          acc[lead.id] = lead
          return acc
        }, {})
      }
    }

    // Get all unique assigned user IDs
    const allAssignedUserIds = [
      ...Object.values(leadsMap).map((l: any) => l.assigned_to).filter(Boolean),
      ...Object.values(directLeadsMap).map((l: any) => l.assigned_to).filter(Boolean),
    ]
    const uniqueUserIds = [...new Set(allAssignedUserIds)]

    // Fetch assigned users
    let usersMap: Record<string, { id: string; name: string; email: string }> = {}
    if (uniqueUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', uniqueUserIds)
      
      if (usersData) {
        usersMap = usersData.reduce((acc: any, user: any) => {
          acc[user.id] = user
          return acc
        }, {})
      }
    }

    // Transform data to include lead info and calculate days until follow-up
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return activities.map((activity: any) => {
      const followUpDate = new Date(activity.follow_up_date)
      followUpDate.setHours(0, 0, 0, 0)
      
      const daysUntil = Math.ceil((followUpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine if it's a lead or direct lead
      const leadData = activity.lead_id ? leadsMap[activity.lead_id] : directLeadsMap[activity.direct_lead_id]
      const leadType = activity.lead_id ? 'lead' : 'direct_lead'
      const leadId = activity.lead_id || activity.direct_lead_id
      const assignedTo = leadData?.assigned_to
      const assignedUser = assignedTo ? usersMap[assignedTo] || null : null

      return {
        id: activity.id,
        activityId: activity.id,
        leadId,
        leadType,
        name: leadData?.name || 'Unknown',
        phone_number: leadData?.phone_number || '-',
        email: leadData?.email || null,
        follow_up_date: activity.follow_up_date,
        daysUntil,
        action: activity.action,
        notes: activity.notes,
        created_at: activity.created_at,
        assigned_user: assignedUser,
        assigned_to: assignedTo,
      }
    })
  } catch (error) {
    console.error('Error in getFollowUpLeads:', error)
    return []
  }
}

async function getDashboardStats() {
  const supabase = createClient()
  
  // Helper function to safely get count from a table
  const safeCount = async (table: string) => {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        // Check if it's a 404 or table doesn't exist error
        if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('404')) {
          // Silently return 0 for missing tables
          return { count: 0, error: null }
        }
        console.warn(`Table ${table} error:`, error.message)
        return { count: 0, error: null }
      }
      return { count: count || 0, error: null }
    } catch (error: any) {
      // Silently handle errors for missing tables
      if (error?.code === 'PGRST116' || error?.message?.includes('does not exist') || error?.message?.includes('404')) {
        return { count: 0, error: null }
      }
      console.warn(`Error querying table ${table}:`, error)
      return { count: 0, error: null }
    }
  }

  const [
    usersResult,
    activeUsersResult,
    postsResult,
    activePostsResult,
    propertiesResult,
    activePropertiesResult,
    pendingPropertiesResult,
    categoriesResult,
    leadsResult,
    bookingsResult,
    newsletterResult,
    commentsResult,
    projectsResult,
    areasResult,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    safeCount('property_bookings'),
    supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
    supabase.from('property_comments').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('areas').select('*', { count: 'exact', head: true }),
  ])

  // Get monthly activity data - optimized: only fetch counts per month instead of all records
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoISO = sixMonthsAgo.toISOString()

  // Get last 6 months data - fetch only what we need for aggregation
  // This is more efficient than fetching all records and counting in JavaScript
  const [recentUsers, recentPosts, recentProperties] = await Promise.all([
    supabase
      .from('users')
      .select('created_at')
      .gte('created_at', sixMonthsAgoISO)
      .limit(10000), // Limit to prevent excessive data transfer
    supabase
      .from('posts')
      .select('created_at')
      .gte('created_at', sixMonthsAgoISO)
      .limit(10000),
    supabase
      .from('properties')
      .select('created_at')
      .gte('created_at', sixMonthsAgoISO)
      .limit(10000),
  ])

  // Process monthly data - optimized aggregation
  const monthlyData: Record<string, { users: number; posts: number; properties: number }> = {}
  
  // Get last 6 months in order
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    months.push(date.toLocaleDateString('en-US', { month: 'short' }))
  }
  
  // Initialize all months
  months.forEach(month => {
    monthlyData[month] = { users: 0, posts: 0, properties: 0 }
  })

  // Aggregate users by month
  recentUsers.data?.forEach((user: any) => {
    const month = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short' })
    if (monthlyData[month]) monthlyData[month].users++
  })

  // Aggregate posts by month
  recentPosts.data?.forEach((post: any) => {
    const month = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short' })
    if (monthlyData[month]) monthlyData[month].posts++
  })

  // Aggregate properties by month
  recentProperties.data?.forEach((property: any) => {
    const month = new Date(property.created_at).toLocaleDateString('en-US', { month: 'short' })
    if (monthlyData[month]) monthlyData[month].properties++
  })

  const chartData = Object.entries(monthlyData).map(([name, data]) => ({
    name,
    ...data,
  }))

  // Status breakdown for properties - optimized: use count aggregation
  // Instead of fetching all properties, we'll use individual count queries per status
  // This is more efficient for large datasets
  const statuses = ['pending', 'active', 'inactive', 'rejected', 'deleted', 'expired', 'rented', 'sold']
  const statusCounts: Record<string, number> = {}
  
  // Fetch counts for each status in parallel
  const statusCountPromises = statuses.map(async (status) => {
    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)
    return { status, count: count || 0 }
  })
  
  const statusResults = await Promise.all(statusCountPromises)
  statusResults.forEach(({ status, count }) => {
    if (count > 0) {
      statusCounts[status] = count
    }
  })

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  return {
    totalUsers: usersResult.count || 0,
    activeUsers: activeUsersResult.count || 0,
    totalPosts: postsResult.count || 0,
    activePosts: activePostsResult.count || 0,
    totalProperties: propertiesResult.count || 0,
    activeProperties: activePropertiesResult.count || 0,
    pendingProperties: pendingPropertiesResult.count || 0,
    totalCategories: categoriesResult.count || 0,
    totalLeads: leadsResult.count || 0,
    totalBookings: bookingsResult.count || 0,
    totalNewsletter: newsletterResult.count || 0,
    totalComments: commentsResult.count || 0,
    totalProjects: projectsResult.count || 0,
    totalAreas: areasResult.count || 0,
    chartData,
    statusData,
  }
}

export default function DashboardPage() {
  const t = useTranslations()
  const router = useRouter()
  const [followUpStartDate, setFollowUpStartDate] = useState<string>('')
  const [followUpEndDate, setFollowUpEndDate] = useState<string>('')
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - stats don't need to be real-time
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    // Refetch in background to keep data fresh without blocking UI
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in background
  })

  const { data: followUpLeads, isLoading: isLoadingFollowUps } = useQuery({
    queryKey: ['follow-up-leads', followUpStartDate, followUpEndDate],
    queryFn: () => getFollowUpLeads(
      followUpStartDate || undefined,
      followUpEndDate || undefined
    ),
    staleTime: 30000, // Cache for 30 seconds - balance between freshness and performance
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  const handleFollowUpLeadClick = (lead: any) => {
    const url = lead.leadType === 'lead' 
      ? `/admin/leads?expand=${lead.leadId}`
      : `/admin/direct-leads?expand=${lead.leadId}`
    router.push(url)
  }


  const statCards = [
    {
      title: t('dashboard.stats.totalUsers'),
      value: stats?.totalUsers ?? 0,
      icon: Users,
      isLoading,
      description: `${stats?.activeUsers ?? 0} ${t('dashboard.stats.active') || 'active'}`,
      color: '#3b82f6', // Blue
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    },
    {
      title: t('dashboard.stats.totalPosts'),
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      isLoading,
      description: `${stats?.activePosts ?? 0} ${t('dashboard.stats.published') || 'published'}`,
      color: '#10b981', // Green
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
    },
    {
      title: t('dashboard.stats.totalProperties'),
      value: stats?.totalProperties ?? 0,
      icon: Home,
      isLoading,
      description: `${stats?.activeProperties ?? 0} ${t('dashboard.stats.active') || 'active'}`,
      color: '#fac708', // Gold
      gradient: 'linear-gradient(135deg, #fac708, #d19c15)',
    },
    {
      title: t('dashboard.stats.pendingProperties') || 'Pending Properties',
      value: stats?.pendingProperties ?? 0,
      icon: Clock,
      isLoading,
      description: t('dashboard.stats.awaitingApproval') || 'Awaiting approval',
      color: '#f59e0b', // Orange
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    },
    {
      title: t('dashboard.stats.categories') || 'Categories',
      value: stats?.totalCategories ?? 0,
      icon: FolderKanban,
      isLoading,
      description: t('dashboard.stats.totalCategories') || 'Total categories',
      color: '#8b5cf6', // Purple
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    },
    {
      title: t('dashboard.stats.leads') || 'Leads',
      value: stats?.totalLeads ?? 0,
      icon: MessageSquare,
      isLoading,
      description: t('dashboard.stats.totalLeads') || 'Total leads',
      color: '#ec4899', // Pink
      gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    },
    {
      title: t('dashboard.stats.bookings') || 'Bookings',
      value: stats?.totalBookings ?? 0,
      icon: Calendar,
      isLoading,
      description: t('dashboard.stats.totalBookings') || 'Total bookings',
      color: '#06b6d4', // Cyan
      gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    },
    {
      title: t('dashboard.stats.newsletter') || 'Newsletter',
      value: stats?.totalNewsletter ?? 0,
      icon: Mail,
      isLoading,
      description: t('dashboard.stats.subscribers') || 'Subscribers',
      color: '#ef4444', // Red
      gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    },
  ]

  const shortcuts = [
    { nameKey: 'posts', href: '/admin/posts', icon: FileText, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
    { nameKey: 'properties', href: '/admin/properties', icon: Home, color: '#fac708', gradient: 'linear-gradient(135deg, #fac708, #d19c15)' },
    { nameKey: 'users', href: '/admin/users', icon: Users, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    { nameKey: 'leads', href: '/admin/leads', icon: MessageSquare, color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
    { nameKey: 'bookings', href: '/admin/bookings', icon: Calendar, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    { nameKey: 'projects', href: '/admin/projects', icon: Briefcase, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    { nameKey: 'settings', href: '/admin/settings', icon: Settings, color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)' },
    { nameKey: 'activityLogs', href: '/admin/activity-logs', icon: History, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  ]

  const COLORS_GOLD = ['#fac708', '#d19c15', '#af7818', '#fac708', '#d19c15']

  return (
    <div className="space-y-6">
      <div className="relative">
        <h1 
          className="text-4xl font-bold mb-2 bg-gradient-to-r from-gold-light via-gold to-gold-dark bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(135deg, #fac708, #d19c15, #af7818)',
          }}
        >
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground text-lg">{t('dashboard.overview')}</p>
      </div>

      {/* Shortcuts Section */}
      <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{t('dashboard.quickShortcuts')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('dashboard.shortcutsDescription')}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {shortcuts.map((shortcut, index) => (
              <Link
                key={index}
                href={shortcut.href}
                className="flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-300 hover:scale-110 hover:shadow-xl group cursor-pointer relative z-10"
                style={{
                  borderColor: `${shortcut.color}40`,
                  background: document.documentElement.classList.contains('dark')
                    ? 'rgba(0, 0, 0, 0.4)'
                    : 'rgba(255, 255, 255, 0.6)',
                }}
                onClick={(e) => {
                  // Ensure navigation works
                  e.stopPropagation()
                }}
              >
                <div
                  className="p-3 rounded-lg mb-2 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: shortcut.gradient || `linear-gradient(135deg, ${shortcut.color}, ${shortcut.color}dd)`,
                  }}
                >
                  <shortcut.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-center">{t(`navigation.${shortcut.nameKey}`) || shortcut.nameKey}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const rgb = stat.color.match(/\d+/g) || ['250', '199', '8']
          return (
            <Card 
              key={index}
              className="relative overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl backdrop-blur-sm"
              style={{
                borderColor: `${stat.color}50`,
                background: document.documentElement.classList.contains('dark') 
                  ? `linear-gradient(135deg, ${stat.color}15, ${stat.color}05, rgba(0, 0, 0, 0.6))`
                  : `linear-gradient(135deg, ${stat.color}10, ${stat.color}05, rgba(255, 255, 255, 0.9))`,
                boxShadow: `0 4px 20px ${stat.color}30, 0 0 0 1px ${stat.color}20 inset`,
              }}
            >
              <div 
                className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30 animate-pulse"
                style={{
                  background: stat.gradient,
                }}
              />
              <div 
                className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-2xl opacity-20"
                style={{
                  background: stat.gradient,
                }}
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: stat.gradient,
                  }}
                >
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                {stat.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div 
                      className="text-3xl font-bold"
                      style={{
                        background: stat.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {stat.value}
                    </div>
                    {stat.description && (
                      <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40">
          <CardHeader>
            <CardTitle className="text-xl font-bold">{t('dashboard.activityOverview') || 'Activity Overview'}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.last6Months') || 'Last 6 months'}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(250, 199, 8, 0.1)" />
                  <XAxis dataKey="name" stroke="rgba(250, 199, 8, 0.6)" />
                  <YAxis stroke="rgba(250, 199, 8, 0.6)" />
                  <Tooltip 
                    contentStyle={{
                      background: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(250, 199, 8, 0.3)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="users" fill="#fac708" name={t('navigation.users') || 'Users'} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="posts" fill="#d19c15" name={t('navigation.posts') || 'Posts'} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="properties" fill="#af7818" name={t('navigation.properties') || 'Properties'} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40">
          <CardHeader>
            <CardTitle className="text-xl font-bold">{t('dashboard.propertiesStatus') || 'Properties Status'}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.statusBreakdown') || 'Status breakdown'}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats?.statusData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#fac708"
                    dataKey="value"
                  >
                    {(stats?.statusData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS_GOLD[index % COLORS_GOLD.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      background: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(250, 199, 8, 0.3)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="relative overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{
            borderColor: 'rgba(139, 92, 246, 0.3)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 opacity-50" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <FolderKanban className="h-4 w-4 text-white" />
              </div>
              {t('dashboard.stats.categories') || 'Categories'}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div 
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {stats?.totalCategories ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.totalCategories') || 'Total categories'}</p>
          </CardContent>
        </Card>

        <Card 
          className="relative overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{
            borderColor: 'rgba(236, 72, 153, 0.3)',
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
            boxShadow: '0 4px 20px rgba(236, 72, 153, 0.2)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-pink-600/5 opacity-50" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              {t('dashboard.stats.comments') || 'Comments'}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div 
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #db2777)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {stats?.totalComments ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.propertyComments') || 'Property comments'}</p>
          </CardContent>
        </Card>

        <Card 
          className="relative overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{
            borderColor: 'rgba(6, 182, 212, 0.3)',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)',
            boxShadow: '0 4px 20px rgba(6, 182, 212, 0.2)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 opacity-50" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              {t('dashboard.stats.projects') || 'Projects'}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div 
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {stats?.totalProjects ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.totalProjects') || 'Total projects'}</p>
          </CardContent>
        </Card>

        <Card 
          className="relative overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{
            borderColor: 'rgba(239, 68, 68, 0.3)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.2)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5 opacity-50" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                <MapPin className="h-4 w-4 text-white" />
              </div>
              {t('dashboard.stats.areas') || 'Areas'}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div 
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {stats?.totalAreas ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.stats.geographicAreas') || 'Geographic areas'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="relative overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{
            borderColor: 'rgba(250, 199, 8, 0.3)',
            background: 'linear-gradient(135deg, rgba(250, 199, 8, 0.15) 0%, rgba(209, 156, 21, 0.1) 50%, rgba(175, 120, 24, 0.05) 100%)',
            boxShadow: '0 4px 20px rgba(250, 199, 8, 0.3)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 opacity-50" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-base font-bold">{t('dashboard.growth') || 'Growth Rate'}</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, #fac708, #d19c15)',
                }}
              >
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <div 
                  className="text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #fac708, #d19c15)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  +12.5%
                </div>
                <p className="text-xs text-muted-foreground">{t('dashboard.stats.vsLastMonth') || 'vs last month'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="relative overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{
            borderColor: 'rgba(209, 156, 21, 0.3)',
            background: 'linear-gradient(135deg, rgba(209, 156, 21, 0.15) 0%, rgba(175, 120, 24, 0.1) 50%, rgba(250, 199, 8, 0.05) 100%)',
            boxShadow: '0 4px 20px rgba(209, 156, 21, 0.3)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 opacity-50" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-base font-bold">{t('dashboard.activeContent') || 'Active Content'}</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, #d19c15, #af7818)',
                }}
              >
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <div 
                  className="text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #d19c15, #af7818)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {(stats?.activePosts || 0) + (stats?.activeProperties || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{t('dashboard.stats.activeItems') || 'Active items'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="relative overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          style={{
            borderColor: 'rgba(175, 120, 24, 0.3)',
            background: 'linear-gradient(135deg, rgba(175, 120, 24, 0.15) 0%, rgba(250, 199, 8, 0.1) 50%, rgba(209, 156, 21, 0.05) 100%)',
            boxShadow: '0 4px 20px rgba(175, 120, 24, 0.3)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/5 opacity-50" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-base font-bold">{t('dashboard.pendingReview') || 'Pending Review'}</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, #af7818, #fac708)',
                }}
              >
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <div 
                  className="text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #af7818, #fac708)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stats?.pendingProperties || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t('dashboard.stats.propertiesPending') || 'Properties pending'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-Up Leads Section */}
      <Card className="backdrop-blur-sm border-2 border-gold-dark/20 dark:border-gold-light/20 bg-white/80 dark:bg-black/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5" style={{ color: '#fac708' }} />
                {t('dashboard.followUpLeads') || 'Follow-Up Leads'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('dashboard.followUpLeadsDescription') || 'Leads and direct leads with scheduled follow-up dates'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Label htmlFor="follow-up-start-date" className="text-sm whitespace-nowrap">
                  {t('dashboard.startDate') || 'From Date'}:
                </Label>
                <Input
                  id="follow-up-start-date"
                  type="date"
                  value={followUpStartDate}
                  onChange={(e) => setFollowUpStartDate(e.target.value)}
                  className="w-40"
                  style={{
                    borderColor: 'rgba(250, 199, 8, 0.3)',
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="follow-up-end-date" className="text-sm whitespace-nowrap">
                  {t('dashboard.endDate') || 'To Date'}:
                </Label>
                <Input
                  id="follow-up-end-date"
                  type="date"
                  value={followUpEndDate}
                  onChange={(e) => setFollowUpEndDate(e.target.value)}
                  className="w-40"
                  style={{
                    borderColor: 'rgba(250, 199, 8, 0.3)',
                  }}
                  min={followUpStartDate || undefined}
                />
              </div>
              {(followUpStartDate || followUpEndDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFollowUpStartDate('')
                    setFollowUpEndDate('')
                  }}
                  className="text-xs"
                >
                  {t('common.clearFilters') || 'Clear'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingFollowUps ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
            </div>
          ) : !followUpLeads || followUpLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('dashboard.noFollowUpLeads') || 'No follow-up leads found'}
            </div>
          ) : (
            <div className="space-y-3">
              {followUpLeads.map((lead: any) => {
                const isOverdue = lead.daysUntil < 0
                const isToday = lead.daysUntil === 0
                const isUpcoming = lead.daysUntil > 0 && lead.daysUntil <= 7
                
                return (
                  <Card
                    key={lead.id}
                    onClick={() => handleFollowUpLeadClick(lead)}
                    className={`border-2 transition-all hover:shadow-lg cursor-pointer hover:scale-[1.01] ${
                      isOverdue
                        ? 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500'
                        : isToday
                        ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 hover:border-yellow-500'
                        : isUpcoming
                        ? 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20 hover:border-orange-500'
                        : 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-500'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{lead.name}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              lead.leadType === 'lead'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            }`}>
                              {lead.leadType === 'lead' ? (t('dashboard.lead') || 'Lead') : (t('dashboard.directLead') || 'Direct Lead')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{lead.phone_number}</span>
                            </div>
                            {lead.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{lead.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{new Date(lead.follow_up_date).toLocaleDateString()}</span>
                            </div>
                            {lead.assigned_user && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{lead.assigned_user.name}</span>
                              </div>
                            )}
                          </div>

                          {lead.notes && (
                            <div className="text-sm text-muted-foreground mt-2">
                              <span className="font-medium">{t('dashboard.notes') || 'Notes'}:</span> {lead.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
                            isOverdue
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : isToday
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : isUpcoming
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {isOverdue ? (
                              <>
                                <AlertCircle className="h-4 w-4" />
                                {Math.abs(lead.daysUntil)} {t('dashboard.daysOverdue') || 'days overdue'}
                              </>
                            ) : isToday ? (
                              <>
                                <Clock className="h-4 w-4" />
                                {t('dashboard.today') || 'Today'}
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4" />
                                {lead.daysUntil} {t('dashboard.daysUntil') || 'days'}
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('dashboard.action') || 'Action'}: <span className="capitalize">{lead.action}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

