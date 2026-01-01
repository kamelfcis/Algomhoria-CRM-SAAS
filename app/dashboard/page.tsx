'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, UserCheck, FileText, Home, TrendingUp, Clock, CheckCircle } from 'lucide-react'
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

async function getDashboardStats() {
  const supabase = createClient()
  
  const [
    usersResult,
    activeUsersResult,
    postsResult,
    activePostsResult,
    propertiesResult,
    activePropertiesResult,
    pendingPropertiesResult,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  // Get monthly activity data
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [recentUsers, recentPosts, recentProperties] = await Promise.all([
    supabase
      .from('users')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString()),
    supabase
      .from('posts')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString()),
    supabase
      .from('properties')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString()),
  ])

  // Process monthly data
  const monthlyData: Record<string, { users: number; posts: number; properties: number }> = {}
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  months.forEach(month => {
    monthlyData[month] = { users: 0, posts: 0, properties: 0 }
  })

  recentUsers.data?.forEach((user: any) => {
    const month = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short' })
    if (monthlyData[month]) monthlyData[month].users++
  })

  recentPosts.data?.forEach((post: any) => {
    const month = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short' })
    if (monthlyData[month]) monthlyData[month].posts++
  })

  recentProperties.data?.forEach((property: any) => {
    const month = new Date(property.created_at).toLocaleDateString('en-US', { month: 'short' })
    if (monthlyData[month]) monthlyData[month].properties++
  })

  const chartData = Object.entries(monthlyData).map(([name, data]) => ({
    name,
    ...data,
  }))

  // Status breakdown for properties
  const propertiesStatusResult = await supabase
    .from('properties')
    .select('status')

  const statusCounts: Record<string, number> = {}
  propertiesStatusResult.data?.forEach((p: any) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
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
    chartData,
    statusData,
  }
}

export default function DashboardPage() {
  const t = useTranslations()
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

  const statCards = [
    {
      title: t('dashboard.stats.totalUsers'),
      value: stats?.totalUsers ?? 0,
      icon: Users,
      isLoading,
      description: `${stats?.activeUsers ?? 0} active`,
    },
    {
      title: t('dashboard.stats.totalPosts'),
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      isLoading,
      description: `${stats?.activePosts ?? 0} published`,
    },
    {
      title: t('dashboard.stats.totalProperties'),
      value: stats?.totalProperties ?? 0,
      icon: Home,
      isLoading,
      description: `${stats?.activeProperties ?? 0} active`,
    },
    {
      title: t('dashboard.stats.pendingProperties') || 'Pending Properties',
      value: stats?.pendingProperties ?? 0,
      icon: Clock,
      isLoading,
      description: 'Awaiting approval',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.overview')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stat.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.activityOverview') || 'Activity Overview'}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.last6Months') || 'Last 6 months'}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="users" fill="#8884d8" name="Users" />
                  <Bar dataKey="posts" fill="#82ca9d" name="Posts" />
                  <Bar dataKey="properties" fill="#FF8042" name="Properties" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.propertiesStatus') || 'Properties Status'}</CardTitle>
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
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(stats?.statusData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.growth') || 'Growth Rate'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">+12.5%</div>
                <p className="text-xs text-muted-foreground">vs last month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.activeContent') || 'Active Content'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {(stats?.activePosts || 0) + (stats?.activeProperties || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Active items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.pendingReview') || 'Pending Review'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.pendingProperties || 0}</div>
                <p className="text-xs text-muted-foreground">Properties pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

