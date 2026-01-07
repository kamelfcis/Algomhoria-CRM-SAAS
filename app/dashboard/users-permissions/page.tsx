'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Pencil, Trash2, Shield, Users, Key } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useToast } from '@/hooks/use-toast'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguageStore } from '@/store/language-store'

// ============================================
// Types
// ============================================
interface Role {
  id: string
  name: string
  name_ar: string | null
  description: string | null
  description_ar: string | null
  status: 'active' | 'inactive'
  is_system_role: boolean
  created_at: string
  updated_at: string
}

interface Permission {
  id: string
  name: string
  description: string | null
  description_ar: string | null
  resource: string
  action: string
  created_at: string
  updated_at: string
}

interface User {
  id: string
  email: string
  name: string
  phone_number: string | null
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
}

interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by: string | null
  assigned_at: string
  roles: Role
}

interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  permissions: Permission
}

// ============================================
// Schemas
// ============================================
const roleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
})

const permissionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
})

type RoleForm = z.infer<typeof roleSchema>
type PermissionForm = z.infer<typeof permissionSchema>

// ============================================
// API Functions
// ============================================
async function getRoles() {
  const response = await fetch('/api/roles')
  if (!response.ok) throw new Error('Failed to fetch roles')
  const { data } = await response.json()
  return data as Role[]
}

async function getPermissions() {
  const response = await fetch('/api/permissions')
  if (!response.ok) throw new Error('Failed to fetch permissions')
  const { data } = await response.json()
  return data as Permission[]
}

async function getUsers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, phone_number, status, created_at, updated_at, author_image_url')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as User[]
}

async function getUserRoles(userId: string) {
  const response = await fetch(`/api/user-roles?user_id=${userId}`)
  if (!response.ok) throw new Error('Failed to fetch user roles')
  const { data } = await response.json()
  return data as UserRole[]
}

async function getRolePermissions(roleId: string) {
  const response = await fetch(`/api/role-permissions?role_id=${roleId}`)
  if (!response.ok) throw new Error('Failed to fetch role permissions')
  const { data } = await response.json()
  return data as RolePermission[]
}

async function createRole(data: RoleForm) {
  const response = await fetch('/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create role')
  }
  return await response.json()
}

async function updateRole(id: string, data: Partial<RoleForm>) {
  const response = await fetch(`/api/roles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update role')
  }
  return await response.json()
}

async function deleteRole(id: string) {
  const response = await fetch(`/api/roles/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete role')
  }
}

async function createPermission(data: PermissionForm) {
  const response = await fetch('/api/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create permission')
  }
  return await response.json()
}

async function updatePermission(id: string, data: Partial<PermissionForm>) {
  const response = await fetch(`/api/permissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update permission')
  }
  return await response.json()
}

async function deletePermission(id: string) {
  const response = await fetch(`/api/permissions/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete permission')
  }
}

async function assignRoleToUser(userId: string, roleId: string) {
  const response = await fetch('/api/user-roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, role_id: roleId }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to assign role')
  }
  return await response.json()
}

async function removeRoleFromUser(userId: string, roleId: string) {
  const response = await fetch(`/api/user-roles?user_id=${userId}&role_id=${roleId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to remove role')
  }
}

async function assignPermissionsToRole(roleId: string, permissionIds: string[]) {
  const response = await fetch('/api/role-permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId, permission_ids: permissionIds }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to assign permissions')
  }
  return await response.json()
}

async function removePermissionFromRole(roleId: string, permissionId: string) {
  const response = await fetch(`/api/role-permissions?role_id=${roleId}&permission_id=${permissionId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to remove permission')
  }
}

// ============================================
// Main Component
// ============================================
export default function UsersPermissionsPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('roles')

  // Check if user is admin
  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('usersPermissions.noPermission')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t('usersPermissions.title') || 'المستخدمون و الصلاحيات'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {t('usersPermissions.subtitle') || 'إدارة المستخدمين والأدوار والصلاحيات'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">
            <Shield className="mr-2 h-4 w-4" />
            {t('usersPermissions.roles') || 'الأدوار'}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            {t('usersPermissions.users') || 'المستخدمون'}
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Key className="mr-2 h-4 w-4" />
            {t('usersPermissions.permissions') || 'الصلاحيات'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <RolesTab />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// Roles Tab Component
// ============================================
function RolesTab() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  const { data: allPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
  })

  const { data: rolePermissions } = useQuery({
    queryKey: ['role-permissions', selectedRole?.id],
    queryFn: () => selectedRole ? getRolePermissions(selectedRole.id) : Promise.resolve([]),
    enabled: !!selectedRole,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      status: 'active',
    },
  })

  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsDialogOpen(false)
      reset()
      await ActivityLogger.create('role', data.data.id, data.data.name)
      toast({
        title: t('common.success'),
        description: t('usersPermissions.messages.roleCreated'),
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RoleForm> }) => updateRole(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsDialogOpen(false)
      setEditingRole(null)
      reset()
      await ActivityLogger.update('role', data.data.id, data.data.name)
      toast({
        title: t('common.success'),
        description: t('usersPermissions.messages.roleUpdated'),
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: async (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setDeleteDialogOpen(false)
      if (roleToDelete) {
        await ActivityLogger.delete('role', roleToDelete.id, roleToDelete.name)
      }
      toast({
        title: t('common.success'),
        description: t('usersPermissions.messages.roleDeleted'),
        variant: 'success',
      })
      setRoleToDelete(null)
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const permissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      assignPermissionsToRole(roleId, permissionIds),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] })
      setPermissionsDialogOpen(false)
      toast({
        title: t('common.success'),
        description: t('usersPermissions.messages.permissionsUpdated'),
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: RoleForm) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    reset({
      name: role.name,
      name_ar: role.name_ar || '',
      description: role.description || '',
      description_ar: role.description_ar || '',
      status: role.status,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (role: Role) => {
    setRoleToDelete(role)
    setDeleteDialogOpen(true)
  }

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role)
    setPermissionsDialogOpen(true)
  }

  const handlePermissionsSubmit = (permissionIds: string[]) => {
    if (selectedRole) {
      permissionsMutation.mutate({ roleId: selectedRole.id, permissionIds })
    }
  }

  // Get assigned permission IDs from rolePermissions
  // rolePermissions is an array of { role_id, permission_id, permissions: {...} }
  const assignedPermissionIds = rolePermissions?.map((rp: any) => {
    // Handle both formats: rp.permission_id or rp.permissions?.id
    return rp.permission_id || rp.permissions?.id
  }).filter(Boolean) || []
  
  // Debug log
  console.log('Role permissions data:', rolePermissions)
  console.log('Assigned permission IDs:', assignedPermissionIds)

  if (isLoading) {
    return <PageSkeleton showHeader showActions showTable tableRows={8} />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => {
          setEditingRole(null)
          reset()
          setIsDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          {t('usersPermissions.createRoleButton')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('usersPermissions.roles') || 'Roles'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles?.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{role.name}</h3>
                    {role.name_ar && (
                      <span className="text-sm text-muted-foreground">({role.name_ar})</span>
                    )}
                    {role.is_system_role && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        {t('usersPermissions.system')}
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      role.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {role.status === 'active' ? t('usersPermissions.active') : t('usersPermissions.inactive')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManagePermissions(role)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    {t('usersPermissions.permissionsButton')}
                  </Button>
                  {!role.is_system_role && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? t('usersPermissions.editRoleTitle') : t('usersPermissions.createRoleTitle')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('usersPermissions.nameLabel')}</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('usersPermissions.nameArLabel')}</Label>
              <Input {...register('name_ar')} />
            </div>
            <div className="space-y-2">
              <Label>{t('usersPermissions.descriptionLabel')}</Label>
              <Input {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label>{t('usersPermissions.descriptionArLabel')}</Label>
              <Input {...register('description_ar')} />
            </div>
            <div className="space-y-2">
              <Label>{t('usersPermissions.statusLabel')}</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as 'active' | 'inactive')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('usersPermissions.active')}</SelectItem>
                  <SelectItem value="inactive">{t('usersPermissions.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRole ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {t('usersPermissions.managePermissionsTitle')} {selectedRole?.name_ar || selectedRole?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <PermissionsSelector
              permissions={allPermissions || []}
              selectedIds={assignedPermissionIds}
              onSubmit={handlePermissionsSubmit}
              onCancel={() => setPermissionsDialogOpen(false)}
              isLoading={permissionsMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('usersPermissions.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('usersPermissions.confirmDeleteRole')?.replace('{name}', roleToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && deleteMutation.mutate(roleToDelete.id)}
              className="bg-destructive"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================
// Users Tab Component
// ============================================
function UsersTab() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  // Fetch all user roles for all users
  const { data: allUserRoles } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      if (!users || users.length === 0) return []
      
      // Fetch roles for all users in parallel
      const userRolesPromises = users.map(user => getUserRoles(user.id))
      const userRolesArrays = await Promise.all(userRolesPromises)
      
      // Flatten the array of arrays into a single array
      return userRolesArrays.flat()
    },
    enabled: !!users && users.length > 0,
  })

  // Fetch roles for selected user (for the dialog)
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', selectedUser?.id],
    queryFn: () => selectedUser ? getUserRoles(selectedUser.id) : Promise.resolve([]),
    enabled: !!selectedUser,
  })

  const rolesMutation = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      fetch('/api/user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role_ids: roleIds }),
      }).then(res => res.json()),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] })
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] })
      setRolesDialogOpen(false)
      toast({
        title: t('common.success'),
        description: t('usersPermissions.messages.rolesUpdated'),
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleManageRoles = (user: User) => {
    setSelectedUser(user)
    setRolesDialogOpen(true)
  }

  const handleRolesSubmit = (roleIds: string[]) => {
    if (selectedUser) {
      rolesMutation.mutate({ userId: selectedUser.id, roleIds })
    }
  }

  const assignedRoleIds = userRoles?.map(ur => ur.role_id) || []

  if (isLoading) {
    return <PageSkeleton showHeader showTable tableRows={8} />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('usersPermissions.users') || 'Users'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user) => {
              // Use allUserRoles for displaying in the list, userRoles for the dialog
              const userRolesForUser = allUserRoles?.filter(ur => ur.user_id === user.id) || []
              return (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {userRolesForUser.map((ur) => (
                        <span key={ur.id} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                          {ur.roles?.name || ur.roles?.name_ar || 'Unknown Role'}
                        </span>
                      ))}
                      {userRolesForUser.length === 0 && (
                        <span className="text-xs text-muted-foreground">{t('usersPermissions.noRolesAssigned')}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageRoles(user)}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {t('usersPermissions.manageRolesButton')}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Roles Dialog */}
      <Dialog open={rolesDialogOpen} onOpenChange={setRolesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('usersPermissions.manageRolesTitle')} {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          <RolesSelector
            roles={roles || []}
            selectedIds={assignedRoleIds}
            onSubmit={handleRolesSubmit}
            onCancel={() => setRolesDialogOpen(false)}
            isLoading={rolesMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// Permissions Tab Component
// ============================================
function PermissionsTab() {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Helper function to get the appropriate description based on language
  const getDescription = (perm: Permission): string | null => {
    if (language === 'ar' && perm.description_ar) {
      return perm.description_ar
    }
    return perm.description || perm.description_ar || null
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PermissionForm>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      name: '',
      description: '',
      description_ar: '',
      resource: '',
      action: '',
    },
  })

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
  })

  const createMutation = useMutation({
    mutationFn: createPermission,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      setIsDialogOpen(false)
      reset()
      await ActivityLogger.create('permission', data.data.id, data.data.name)
      toast({
        title: t('common.success'),
        description: t('usersPermissions.messages.permissionCreated'),
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PermissionForm> }) =>
      updatePermission(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      setIsDialogOpen(false)
      setEditingPermission(null)
      reset()
      await ActivityLogger.update('permission', data.data.id, data.data.name)
      toast({
        title: t('common.success'),
        description: t('usersPermissions.messages.permissionUpdated'),
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePermission,
    onSuccess: async (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      setDeleteDialogOpen(false)
      if (permissionToDelete) {
        await ActivityLogger.delete('permission', permissionToDelete.id, permissionToDelete.name)
      }
      toast({
        title: t('common.success'),
        description: t('usersPermissions.messages.permissionDeleted'),
        variant: 'success',
      })
      setPermissionToDelete(null)
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: PermissionForm) => {
    if (editingPermission) {
      updateMutation.mutate({ id: editingPermission.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission)
    reset({
      name: permission.name,
      description: permission.description || '',
      description_ar: permission.description_ar || '',
      resource: permission.resource,
      action: permission.action,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (permission: Permission) => {
    setPermissionToDelete(permission)
    setDeleteDialogOpen(true)
  }

  const filteredPermissions = permissions?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.action.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return <PageSkeleton showHeader showActions showTable tableRows={8} />
  }

  // Group permissions by resource
  const groupedPermissions = filteredPermissions?.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>) || {}

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder={t('usersPermissions.searchPermissions')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => {
          setEditingPermission(null)
          reset()
          setIsDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          {t('usersPermissions.createPermissionButton')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('usersPermissions.permissions') || 'Permissions'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource}>
                <h3 className="font-semibold mb-2 capitalize">{resource}</h3>
                <div className="space-y-2">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{perm.name}</span>
                          <span className="text-xs text-muted-foreground">({perm.action})</span>
                        </div>
                        {getDescription(perm) && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {getDescription(perm)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(perm)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(perm)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Permission Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPermission ? t('usersPermissions.editPermissionTitle') : t('usersPermissions.createPermissionTitle')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('usersPermissions.nameExample')}</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('usersPermissions.resourceLabel')}</Label>
              <Input {...register('resource')} />
              {errors.resource && <p className="text-sm text-destructive">{errors.resource.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('usersPermissions.actionLabel')}</Label>
              <Input {...register('action')} />
              {errors.action && <p className="text-sm text-destructive">{errors.action.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('usersPermissions.descriptionLabel')}</Label>
              <Input {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label>{t('usersPermissions.descriptionArLabel')}</Label>
              <Input {...register('description_ar')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPermission ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('usersPermissions.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('usersPermissions.confirmDeletePermission')?.replace('{name}', permissionToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => permissionToDelete && deleteMutation.mutate(permissionToDelete.id)}
              className="bg-destructive"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================
// Helper Components
// ============================================

// Resource Checkbox with indeterminate support
function ResourceCheckbox({
  id,
  checked,
  indeterminate,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  indeterminate: boolean
  onCheckedChange: () => void
}) {
  const checkboxRef = React.useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (checkboxRef.current) {
      (checkboxRef.current as any).indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <Checkbox
      ref={checkboxRef as any}
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  )
}

function PermissionsSelector({
  permissions,
  selectedIds,
  onSubmit,
  onCancel,
  isLoading,
}: {
  permissions: Permission[]
  selectedIds: string[]
  onSubmit: (ids: string[]) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const t = useTranslations()
  const { language } = useLanguageStore()
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds))
  const [searchQuery, setSearchQuery] = useState('')
  
  // Resource translations map
  const resourceTranslations: Record<string, string> = {
    'activity_logs': 'سجل الأنشطة',
    'areas': 'المناطق',
    'bookings': 'الحجوزات',
    'categories': 'الفئات',
    'dashboard': 'لوحة التحكم',
    'direct_leads': 'العملاء المحتملين المباشرين',
    'featured_areas': 'المناطق المميزة',
    'governorates': 'المحافظات',
    'leads': 'العملاء المحتملين',
    'newsletter': 'النشرة الإخبارية',
    'payment_methods': 'طرق الدفع',
    'permissions': 'الصلاحيات',
    'post_gallery': 'معرض المقالات',
    'posts': 'المقالات',
    'project_categories': 'فئات المشاريع',
    'projects': 'المشاريع',
    'properties': 'العقارات',
    'property_comments': 'تعليقات العقارات',
    'property_facilities': 'مرافق العقارات',
    'property_finishing_types': 'أنواع التشطيبات',
    'property_images': 'صور العقارات',
    'property_owners': 'أصحاب العقارات',
    'property_services': 'خدمات العقارات',
    'property_types': 'أنواع العقارات',
    'property_view_types': 'أنواع الإطلالات',
    'roles': 'الأدوار',
    'sections': 'الأقسام',
    'settings': 'الإعدادات',
    'sliders': 'الشرائح',
    'streets': 'الشوارع',
    'team_users': 'أعضاء الفريق',
    'users': 'المستخدمون'
  }
  
  // Helper function to translate resource name
  const translateResource = (resource: string): string => {
    return resourceTranslations[resource.toLowerCase()] || resource
  }
  
  // Helper function to get the appropriate description based on language
  const getDescription = (perm: Permission) => {
    if (language === 'ar' && perm.description_ar) {
      return perm.description_ar
    }
    return perm.description || perm.description_ar
  }
  
  // Update selected when selectedIds changes (when opening dialog for different role)
  useEffect(() => {
    setSelected(new Set(selectedIds))
  }, [selectedIds])

  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Filter permissions based on search query
  const filteredGrouped = Object.entries(grouped).reduce((acc, [resource, perms]) => {
    const filteredPerms = perms.filter((perm) => {
      const nameMatch = perm.name.toLowerCase().includes(searchQuery.toLowerCase())
      const descMatch = getDescription(perm)?.toLowerCase().includes(searchQuery.toLowerCase())
      const resourceMatch = translateResource(resource).toLowerCase().includes(searchQuery.toLowerCase())
      return nameMatch || descMatch || resourceMatch
    })
    if (filteredPerms.length > 0) {
      acc[resource] = filteredPerms
    }
    return acc
  }, {} as Record<string, Permission[]>)

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleResource = (resource: string) => {
    const resourcePerms = filteredGrouped[resource] || []
    const allSelected = resourcePerms.every((perm) => selected.has(perm.id))
    
    setSelected((prev) => {
      const next = new Set(prev)
      resourcePerms.forEach((perm) => {
        if (allSelected) {
          next.delete(perm.id)
        } else {
          next.add(perm.id)
        }
      })
      return next
    })
  }

  const selectedCount = selected.size
  const totalCount = permissions.length

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search and Stats Bar */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b flex-shrink-0">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('usersPermissions.searchPermissions')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {selectedCount} / {totalCount} {t('usersPermissions.selected')}
        </div>
      </div>

      {/* Permissions List */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 min-h-0">
        {Object.entries(filteredGrouped).map(([resource, perms]) => {
          const resourceSelected = perms.filter((perm) => selected.has(perm.id)).length
          const allSelected = perms.length > 0 && resourceSelected === perms.length
          const someSelected = resourceSelected > 0 && resourceSelected < perms.length
          
          return (
            <div key={resource} className="border rounded-lg p-4 bg-card">
              {/* Resource Header with Select All */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <div className="flex items-center gap-3">
                  <ResourceCheckbox
                    id={`resource-${resource}`}
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={() => handleToggleResource(resource)}
                  />
                  <Label 
                    htmlFor={`resource-${resource}`} 
                    className="text-lg font-bold cursor-pointer flex items-center gap-2"
                  >
                    {translateResource(resource)}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({resourceSelected} / {perms.length})
                    </span>
                  </Label>
                </div>
              </div>
              
              {/* Permissions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {perms.map((perm) => (
                  <div 
                    key={perm.id} 
                    className={`flex items-start gap-2 p-3 rounded-md border transition-colors ${
                      selected.has(perm.id) 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      id={perm.id}
                      checked={selected.has(perm.id)}
                      onCheckedChange={() => handleToggle(perm.id)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={perm.id} className="flex-1 cursor-pointer space-y-1">
                      <div className="font-medium text-sm leading-tight">
                        {getDescription(perm) || perm.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {perm.name}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        
        {Object.keys(filteredGrouped).length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {t('usersPermissions.noPermissionsFound') || 'لا توجد صلاحيات'}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={() => onSubmit(Array.from(selected))}
          disabled={isLoading}
        >
          {isLoading ? t('usersPermissions.saving') : t('usersPermissions.save')}
        </Button>
      </DialogFooter>
    </div>
  )
}

function RolesSelector({
  roles,
  selectedIds,
  onSubmit,
  onCancel,
  isLoading,
}: {
  roles: Role[]
  selectedIds: string[]
  onSubmit: (ids: string[]) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const t = useTranslations()
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds))

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {roles
          .filter((r) => r.status === 'active')
          .map((role) => (
            <div key={role.id} className="flex items-center space-x-2">
              <Checkbox
                id={role.id}
                checked={selected.has(role.id)}
                onCheckedChange={() => handleToggle(role.id)}
              />
              <Label htmlFor={role.id} className="flex-1 cursor-pointer">
                <div>
                  <span className="font-medium">{role.name}</span>
                  {role.name_ar && (
                    <span className="text-sm text-muted-foreground ml-2">({role.name_ar})</span>
                  )}
                  {role.description && (
                    <span className="text-sm text-muted-foreground ml-2">- {role.description}</span>
                  )}
                </div>
              </Label>
            </div>
          ))}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={() => onSubmit(Array.from(selected))}
          disabled={isLoading}
        >
          {isLoading ? t('usersPermissions.saving') : t('usersPermissions.save')}
        </Button>
      </DialogFooter>
    </div>
  )
}

