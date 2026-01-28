'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from '@/hooks/use-translations'
import { useLanguageStore } from '@/store/language-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Shield, 
  Users,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Permission {
  id: string
  name: string
  description: string | null
  description_ar: string | null
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  name_ar: string | null
  description: string | null
  description_ar: string | null
  status: 'active' | 'inactive'
  is_system_role: boolean
  created_at: string
}

interface RolePermission {
  role_id: string
  permission_id: string
  permissions: Permission
}

export default function RolesPage() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set())

  // Fetch all roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles')
      if (!res.ok) throw new Error('Failed to fetch roles')
      const json = await res.json()
      return json.data as Role[]
    },
  })

  // Fetch all role permissions (for all roles)
  const { data: allRolePermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['all-role-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/role-permissions')
      if (!res.ok) {
        // If forbidden (non-admin), return empty array
        if (res.status === 403) return []
        throw new Error('Failed to fetch role permissions')
      }
      const json = await res.json()
      return json.data as RolePermission[]
    },
  })

  const isLoading = rolesLoading || permissionsLoading

  // Get permissions for a specific role
  const getPermissionsForRole = (roleId: string): Permission[] => {
    if (!allRolePermissions) return []
    return allRolePermissions
      .filter(rp => rp.role_id === roleId && rp.permissions)
      .map(rp => rp.permissions)
  }

  // Group permissions by resource
  const groupPermissionsByResource = (permissions: Permission[]): Record<string, Permission[]> => {
    return permissions.reduce((acc, perm) => {
      const resource = perm.resource || 'other'
      if (!acc[resource]) {
        acc[resource] = []
      }
      acc[resource].push(perm)
      return acc
    }, {} as Record<string, Permission[]>)
  }

  // Toggle role expansion
  const toggleRole = (roleId: string) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(roleId)) {
        newSet.delete(roleId)
      } else {
        newSet.add(roleId)
      }
      return newSet
    })
  }

  // Filter roles by search
  const filteredRoles = roles?.filter(role => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      role.name.toLowerCase().includes(query) ||
      role.name_ar?.toLowerCase().includes(query) ||
      role.description?.toLowerCase().includes(query) ||
      role.description_ar?.toLowerCase().includes(query)
    )
  })

  // Get localized name
  const getLocalizedName = (role: Role) => {
    if (language === 'ar' && role.name_ar) {
      return role.name_ar
    }
    return role.name
  }

  // Get localized description
  const getLocalizedDescription = (role: Role) => {
    if (language === 'ar' && role.description_ar) {
      return role.description_ar
    }
    return role.description
  }

  // Get permission description
  const getPermissionDescription = (perm: Permission) => {
    if (language === 'ar' && perm.description_ar) {
      return perm.description_ar
    }
    return perm.description || perm.name
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-gold" />
            {t('roles.title')}
          </h1>
          <p className="text-muted-foreground">{t('roles.description')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('roles.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('usersPermissions.active')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {roles?.filter(r => r.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('usersPermissions.permissions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {allRolePermissions?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Grid */}
      <div className="grid gap-4">
        {filteredRoles?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredRoles?.map((role) => {
            const permissions = getPermissionsForRole(role.id)
            const groupedPermissions = groupPermissionsByResource(permissions)
            const isExpanded = expandedRoles.has(role.id)
            
            return (
              <Card key={role.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRole(role.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        role.status === 'active' 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-gray-100 dark:bg-gray-800"
                      )}>
                        <Shield className={cn(
                          "h-5 w-5",
                          role.status === 'active' 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-gray-400"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {getLocalizedName(role)}
                          </CardTitle>
                          {role.is_system_role && (
                            <Badge variant="secondary" className="text-xs">
                              {t('usersPermissions.systemRole')}
                            </Badge>
                          )}
                          <Badge 
                            variant={role.status === 'active' ? 'default' : 'secondary'}
                            className={cn(
                              role.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : ''
                            )}
                          >
                            {role.status === 'active' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {t(`usersPermissions.${role.status}`)}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          {getLocalizedDescription(role) || t('common.noData')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {permissions.length} {t('usersPermissions.permissions')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Object.keys(groupedPermissions).length} {language === 'ar' ? 'موارد' : 'resources'}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="border-t bg-muted/30">
                    {permissions.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        {t('usersPermissions.noRolesAssigned')}
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">
                        {Object.entries(groupedPermissions).map(([resource, perms]) => (
                          <div 
                            key={resource} 
                            className="rounded-lg border bg-background p-4"
                          >
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gold-dark dark:text-gold-light capitalize">
                              <Users className="h-4 w-4" />
                              {resource.replace(/_/g, ' ')}
                            </h4>
                            <ul className="space-y-2">
                              {perms.map((perm) => (
                                <li 
                                  key={perm.id} 
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium capitalize">
                                      {perm.action?.replace(/_/g, ' ') || perm.name}
                                    </span>
                                    {perm.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {getPermissionDescription(perm)}
                                      </p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
