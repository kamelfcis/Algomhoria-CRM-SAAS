'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Pencil, Trash2, Key } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { USER_STATUS, UserStatus } from '@/lib/constants'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
// Note: We can't use isAdmin from permission-helpers in client-side
// because it uses createAdminClient which needs Service Role Key
// So we'll check admin status directly using Supabase client

// Unified schema - password is optional but validated in onSubmit
const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().optional(),
  role_ids: z.array(z.string().uuid()).optional(), // Make roles optional
  password: z.string().optional(),
})

type UserForm = z.infer<typeof userSchema>

interface Role {
  id: string
  name: string
  name_ar: string | null
  status: 'active' | 'inactive'
}

interface User {
  id: string
  email: string
  name: string
  phone_number: string | null
  roles: Role[]
  status: UserStatus
  created_at: string
}

async function getRoles() {
  const response = await fetch('/api/roles')
  if (!response.ok) throw new Error('Failed to fetch roles')
  const { data } = await response.json()
  return data as Role[]
}

async function getUsers() {
  const supabase = createClient()
  
  // Try with minimal columns first to avoid RLS issues
  let query = supabase
    .from('users')
    .select('id, email, name, phone_number, status, created_at, updated_at, author_image_url')
  
  const { data: users, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    // If it's a permission error, show helpful message
    if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
      console.error('RLS Policy Error: Make sure you have admin role and RLS policies are set up correctly')
    }
    // Try with even fewer columns if the above fails
    if (error.code === '42703' || error.message?.includes('column')) {
      const { data: simpleUsers, error: simpleError } = await supabase
        .from('users')
        .select('id, email, name, status, created_at')
        .order('created_at', { ascending: false })
      
      if (simpleError) {
        throw simpleError
      }
      
      // Map to full structure with defaults
      return (simpleUsers || []).map((u: any) => ({
        ...u,
        phone_number: null,
        updated_at: u.created_at,
        author_image_url: null,
        roles: [],
      })) as User[]
    }
    throw error
  }

  if (!users || users.length === 0) {
    return []
  }

  // Fetch roles for each user
  const usersWithRoles = await Promise.all(
    users.map(async (user: any) => {
      try {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select(`
            role_id,
            roles!inner(id, name, name_ar, status)
          `)
          .eq('user_id', user.id)

        const roles = userRoles?.map((ur: any) => ({
          id: ur.roles.id,
          name: ur.roles.name,
          name_ar: ur.roles.name_ar,
          status: ur.roles.status,
        })) || []

        return {
          ...user,
          roles,
        } as User
      } catch (roleError) {
        console.error(`Error fetching roles for user ${user.id}:`, roleError)
        return {
          ...user,
          roles: [],
        } as User
      }
    })
  )

  return usersWithRoles
}

async function createUser(userData: { name: string; email: string; phone_number?: string; role_ids?: string[]; password: string }) {
  if (!userData.password || userData.password.length < 6) {
    throw new Error('Password is required and must be at least 6 characters')
  }

  // Validate name is not empty
  if (!userData.name || userData.name.trim().length === 0) {
    throw new Error('Name is required')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(userData.email)) {
    throw new Error('Invalid email address')
  }

  // role_ids is optional - can be assigned later

  // Prepare request body - ensure phone_number is null if empty, not undefined
  const requestBody: any = {
    name: userData.name.trim(),
    email: userData.email.trim().toLowerCase(),
    password: userData.password,
  }
  
  // Only include phone_number if it has a value
  if (userData.phone_number && userData.phone_number.trim()) {
    requestBody.phone_number = userData.phone_number.trim()
  } else {
    requestBody.phone_number = null
  }
  
  // Only include role_ids if provided (optional - can be assigned later)
  if (userData.role_ids && userData.role_ids.length > 0) {
    requestBody.role_ids = userData.role_ids
  }

  console.log('Creating user with data:', {
    ...requestBody,
    password: '***' // Don't log password
  })

  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Error creating user - Full error data:', JSON.stringify(errorData, null, 2))
    let errorMessage = 'Failed to create user'
    
    // Handle Zod validation errors
    if (errorData.details && Array.isArray(errorData.details)) {
      errorMessage = errorData.details.map((e: any) => {
        if (typeof e === 'string') return e
        const path = e.path?.join('.') || 'field'
        return `${path}: ${e.message || 'Invalid value'}`
      }).join(', ')
    } else if (errorData.message) {
      // Check for message field (from API)
      errorMessage = errorData.message
      if (errorData.code) {
        errorMessage += ` (Code: ${errorData.code})`
      }
      if (errorData.hint) {
        errorMessage += ` - ${errorData.hint}`
      }
      if (errorData.details) {
        errorMessage += ` - Details: ${JSON.stringify(errorData.details)}`
      }
    } else if (typeof errorData.error === 'string') {
      errorMessage = errorData.error
      // Try to get additional info
      if (errorData.code) {
        errorMessage += ` (Code: ${errorData.code})`
      }
      if (errorData.hint) {
        errorMessage += ` - ${errorData.hint}`
      }
      if (errorData.details) {
        errorMessage += ` - Details: ${JSON.stringify(errorData.details)}`
      }
    } else if (Array.isArray(errorData.error)) {
      errorMessage = errorData.error.map((e: any) => e.message || e).join(', ')
    } else if (errorData.error?.message) {
      errorMessage = errorData.error.message
    }
    
    console.error('Final error message:', errorMessage)
    throw new Error(errorMessage)
  }

  const { data } = await response.json()
  return data
}

async function updateUser(id: string, userData: { name: string; phone_number?: string | null; role_ids: string[] }) {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: userData.name,
      phone_number: userData.phone_number || null,
      role_ids: userData.role_ids,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user')
  }

  const { data } = await response.json()
  return data
}

async function deleteUser(id: string) {
  const response = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete user')
  }
}

async function updateUserStatus(id: string, status: UserStatus) {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user status')
  }

  const { data } = await response.json()
  return data
}

export default function UsersPage() {
  const t = useTranslations()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'v2'], // Added v2 to bust cache
    queryFn: getUsers,
  })

  // Only fetch roles when editing (not needed for create)
  const { data: roles, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    retry: 2,
    enabled: !!editingUser, // Only fetch when editing
  })

  // Show error if roles can't be loaded (only when editing)
  if (rolesError && editingUser) {
    console.error('Error loading roles:', rolesError)
  }

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsDialogOpen(false)
      setEditingUser(null)
      reset({
        name: '',
        email: '',
        phone_number: '',
        role_ids: [],
        password: '',
      })
      // Log activity
      await ActivityLogger.create('user', data.id, data.name || data.email)
      toast({
        title: t('common.success') || 'Success',
        description: t('users.messages.createSuccess') || `${data.name || data.email} has been created successfully`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      // Don't close dialog on error - let user fix the issue
      // But reset form state to allow retry
      const errorMessage = error.message || t('users.messages.createError') || 'Failed to create user'
      
      // Check if it's a duplicate email error
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('duplicate')) {
        toast({
          title: t('common.error') || 'Error',
          description: t('users.messages.duplicateEmail') || errorMessage,
          variant: 'destructive',
          duration: 6000,
        })
      } else {
        toast({
          title: t('common.error') || 'Error',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000,
        })
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; phone_number?: string | null; role_ids: string[] } }) =>
      updateUser(id, data),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsDialogOpen(false)
      setEditingUser(null)
      reset({
        name: '',
        email: '',
        phone_number: '',
        role_ids: [],
        password: '',
      })
      // Log activity
      await ActivityLogger.update('user', data.id, data.name || data.email)
      toast({
        title: t('common.success') || 'Success',
        description: t('users.messages.updateSuccess') || `${data.name || data.email}'s information has been updated successfully`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('users.messages.updateError') || 'Failed to update user',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async (_, deletedId) => {
      const deletedUser = userToDelete || users?.find(u => u.id === deletedId)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      // Log activity
      if (deletedUser) {
        await ActivityLogger.delete('user', deletedUser.id, deletedUser.name || deletedUser.email)
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('users.messages.deleteSuccess') || `User "${deletedUser?.name || deletedUser?.email}" has been deleted successfully.`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('users.messages.deleteError') || 'Failed to delete user',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      updateUserStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const statusLabels: Record<UserStatus, string> = {
        active: t('users.statusLabels.active') || 'Active',
        inactive: t('users.statusLabels.inactive') || 'Inactive',
        suspended: t('users.statusLabels.suspended') || 'Suspended',
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('users.messages.statusUpdateSuccess') || `User status has been updated to ${statusLabels[variables.status] || variables.status} successfully`,
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('users.messages.statusUpdateError') || 'Failed to update status',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const passwordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const response = await fetch(`/api/users/${id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change password')
      }

      return await response.json()
    },
    onSuccess: async () => {
      // Store reset user info before clearing state
      const resetUser = passwordUser
      
      // Close dialog and clear password dialog state
      setIsPasswordDialogOpen(false)
      setPasswordUser(null)
      setNewPassword('')
      
      // IMPORTANT: Do not modify searchQuery - keep it unchanged
      // The search filter should remain as the user set it
      
      // Log activity
      if (resetUser) {
        await ActivityLogger.update('user', resetUser.id, resetUser.name || resetUser.email, resetUser, { password: '***' })
      }
      toast({
        title: t('common.success') || 'Success',
        description: t('users.messages.passwordResetSuccess') || (resetUser ? `Password for ${resetUser.name || resetUser.email} has been reset successfully` : 'Password changed successfully'),
        variant: 'success',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error') || 'Error',
        description: error.message || t('users.messages.passwordResetError') || 'Failed to change password',
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const handlePasswordReset = (user: User) => {
    setPasswordUser(user)
    setNewPassword('')
    setIsPasswordDialogOpen(true)
  }

  const handlePasswordSubmit = () => {
    if (!passwordUser) return
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: t('common.error') || 'Error',
        description: t('users.form.passwordMinLength') || 'Password must be at least 6 characters',
        variant: 'destructive',
        duration: 4000,
      })
      return
    }
    // Submit password reset - this should not affect searchQuery
    passwordMutation.mutate({ id: passwordUser.id, password: newPassword })
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      role_ids: [],
      password: '',
    },
  })

  const selectedRoleIds = watch('role_ids') || []
  const passwordValue = watch('password')

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      // For update, exclude password and email (email cannot be changed)
      if (!data.role_ids || data.role_ids.length === 0) {
        toast({
          title: t('common.error') || 'Error',
          description: 'At least one role is required',
          variant: 'destructive',
          duration: 4000,
        })
        return
      }
      updateMutation.mutate({ 
        id: editingUser.id, 
        data: {
          name: data.name,
          phone_number: data.phone_number || null,
          role_ids: data.role_ids,
        }
      })
    } else {
      // For create, password is required
      if (!data.password || data.password.trim().length < 6) {
        toast({
          title: t('common.error') || 'Error',
          description: t('users.form.passwordMinLength') || 'Password is required and must be at least 6 characters',
          variant: 'destructive',
          duration: 4000,
        })
        setValue('password', '', { shouldValidate: true })
        return
      }
      // role_ids is optional - can be assigned later
      createMutation.mutate({
        name: data.name,
        email: data.email,
        phone_number: data.phone_number,
        role_ids: data.role_ids || [], // Optional - can be empty
        password: data.password,
      })
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    // Reset form with user data - password is not included in edit mode
    reset({
      name: user.name,
      email: user.email,
      phone_number: user.phone_number || '',
      role_ids: user.roles.map(r => r.id),
      password: '', // Clear password field for edit
    })
    setIsDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false)
      setEditingUser(null)
      reset({
        name: '',
        email: '',
        phone_number: '',
        role_ids: [],
        password: '',
      })
    }
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id)
    }
  }

  const handleStatusChange = (id: string, status: UserStatus) => {
    statusMutation.mutate({ id, status })
  }

  const filteredUsers = users?.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Check if user is admin using user_roles (client-side check)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (profile?.id) {
        setIsCheckingAdmin(true)
        try {
          const supabase = createClient()
          
          // Check if user has admin role using regular client
          const { data: userRoles, error } = await supabase
            .from('user_roles')
            .select(`
              role_id,
              roles!inner(name, status)
            `)
            .eq('user_id', profile.id)
          
          if (error) {
            console.error('Error fetching user roles:', error)
            setIsUserAdmin(false)
          } else {
            const hasAdminRole = userRoles?.some((ur: any) => 
              ur.roles?.name === 'admin' && ur.roles?.status === 'active'
            ) ?? false
            
            console.log('Admin status check:', { 
              userId: profile.id, 
              isAdmin: hasAdminRole,
              roles: userRoles 
            })
            setIsUserAdmin(hasAdminRole)
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
          setIsUserAdmin(false)
        } finally {
          setIsCheckingAdmin(false)
        }
      } else {
        console.log('No profile ID available')
        setIsUserAdmin(false)
        setIsCheckingAdmin(false)
      }
    }
    
    checkAdminStatus()
  }, [profile?.id])
  
  const canCreate = isUserAdmin
  const canEdit = isUserAdmin
  const canDelete = isUserAdmin
  
  // Debug log
  console.log('User permissions:', { 
    profileId: profile?.id, 
    isUserAdmin, 
    isCheckingAdmin,
    canCreate, 
    canEdit, 
    canDelete 
  })

  if (isLoading) {
    return <PageSkeleton showHeader showActions={canCreate} showTable tableRows={8} />
  }

  return (
    <div className="space-y-6">
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs">
          <strong>Debug Info:</strong> Profile ID: {profile?.id || 'None'}, 
          Is Admin: {isUserAdmin ? 'Yes' : 'No'}, 
          Checking: {isCheckingAdmin ? 'Yes' : 'No'}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('users.title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{t('users.subtitle') || 'Manage users and their roles'}</p>
        </div>
        {canCreate && !isCheckingAdmin && (
          <Button 
            onClick={() => {
              setEditingUser(null)
              reset({
                name: '',
                email: '',
                phone_number: '',
                role_ids: [],
                password: '',
              })
              setIsDialogOpen(true)
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('users.createUser')}
          </Button>
        )}
        {isCheckingAdmin && (
          <Button disabled className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {t('users.createUser')}
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl">{t('users.title')}</CardTitle>
            <Input
              id="users-search-input"
              type="text"
              placeholder={t('users.searchPlaceholder') || t('common.search') || 'Search users by name or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
              autoComplete="off"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-center p-3 sm:p-4 font-semibold text-sm">{t('users.name')}</th>
                      <th className="text-center p-3 sm:p-4 font-semibold text-sm">{t('users.email')}</th>
                      <th className="text-center p-3 sm:p-4 font-semibold text-sm hidden sm:table-cell">{t('users.phone')}</th>
                      <th className="text-center p-3 sm:p-4 font-semibold text-sm">{t('users.role')}</th>
                      <th className="text-center p-3 sm:p-4 font-semibold text-sm">{t('users.status')}</th>
                      <th className="text-center p-3 sm:p-4 font-semibold text-sm">{t('users.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers?.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="text-center p-3 sm:p-4 font-medium">{user.name || '-'}</td>
                        <td className="text-center p-3 sm:p-4 text-sm text-muted-foreground">{user.email}</td>
                        <td className="text-center p-3 sm:p-4 hidden sm:table-cell text-sm text-muted-foreground">{user.phone_number || '-'}</td>
                        <td className="text-center p-3 sm:p-4">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <span
                                  key={role.id}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                >
                                  {role.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No roles</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-3 sm:p-4">
                          <div className="flex justify-center">
                            <Select
                              value={user.status}
                              onValueChange={(value: UserStatus) =>
                                handleStatusChange(user.id, value)
                              }
                              disabled={!canEdit || statusMutation.isPending}
                            >
                              <SelectTrigger className="w-32 sm:w-36 h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">{t('users.statusLabels.active') || t('users.activate')}</SelectItem>
                                <SelectItem value="inactive">{t('users.statusLabels.inactive') || t('users.deactivate')}</SelectItem>
                                <SelectItem value="suspended">{t('users.statusLabels.suspended') || t('users.suspend')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="text-center p-3 sm:p-4">
                          <div className="flex gap-1 sm:gap-2 justify-center">
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(user)}
                                  disabled={updateMutation.isPending || deleteMutation.isPending || passwordMutation.isPending}
                                  title={t('users.editUser') || 'Edit user'}
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePasswordReset(user)}
                                  disabled={updateMutation.isPending || deleteMutation.isPending || passwordMutation.isPending}
                                  title={t('users.resetPassword') || 'Reset password'}
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(user)}
                                disabled={updateMutation.isPending || deleteMutation.isPending || passwordMutation.isPending}
                                title={t('users.deleteUser') || 'Delete user'}
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers?.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm sm:text-base">
                      {searchQuery 
                        ? (t('users.messages.noUsersMatchSearch') || 'No users match your search criteria')
                        : (t('users.messages.noUsersFound') || t('common.noData') || 'No users found')
                      }
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="mt-4"
                      >
                        {t('common.clearFilters') || 'Clear search'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingUser ? t('users.editDialogTitle') || t('users.editUser') : t('users.createDialogTitle') || t('users.createUser')}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingUser
                ? (t('users.editDialogDescription') || 'Update the user\'s information below')
                : (t('users.createDialogDescription') || 'Fill in the details below to create a new user account')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('users.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('users.namePlaceholder') || 'Enter full name (e.g., John Doe)'}
                {...register('name', {
                  required: t('users.form.nameRequired') || 'Name is required',
                  minLength: {
                    value: 1,
                    message: t('users.form.nameRequired') || 'Name must be at least 1 character'
                  }
                })}
                disabled={createMutation.isPending || updateMutation.isPending}
                className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                aria-invalid={errors.name ? 'true' : 'false'}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                {t('users.email')} {!editingUser && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('users.emailPlaceholder') || 'Enter email address (e.g., user@example.com)'}
                {...register('email', {
                  required: !editingUser ? (t('users.form.emailRequired') || 'Email is required') : false,
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t('users.form.emailInvalid') || 'Please enter a valid email address'
                  }
                })}
                disabled={editingUser !== null || createMutation.isPending || updateMutation.isPending}
                readOnly={editingUser !== null}
                className={editingUser ? 'bg-muted cursor-not-allowed' : errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                aria-invalid={errors.email ? 'true' : 'false'}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1" role="alert">{errors.email.message}</p>
              )}
              {editingUser && (
                <p className="text-xs text-muted-foreground mt-1">{t('users.emailCannotChange') || 'Email cannot be changed'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">{t('users.phone')}</Label>
              <Input
                id="phone_number"
                type="tel"
                placeholder={t('users.phonePlaceholder') || 'Enter phone number (optional, e.g., +1234567890)'}
                {...register('phone_number')}
                disabled={createMutation.isPending || updateMutation.isPending}
                className={errors.phone_number ? 'border-destructive focus-visible:ring-destructive' : ''}
                aria-invalid={errors.phone_number ? 'true' : 'false'}
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Roles section removed for create - can be assigned later from users page */}
            {editingUser && (
              <div className="space-y-2">
                <Label>
                  {t('users.role')} <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2 border rounded-md p-4 max-h-48 overflow-y-auto">
                  {rolesError && (
                    <p className="text-sm text-destructive mb-2">
                      Error loading roles: {rolesError.message}. Please refresh the page.
                    </p>
                  )}
                  {!rolesError && (!roles || roles.length === 0) && (
                    <p className="text-sm text-muted-foreground mb-2">
                      No roles available. Please create roles first.
                    </p>
                  )}
                  {roles?.filter(r => r.status === 'active').map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={selectedRoleIds.includes(role.id)}
                        onCheckedChange={(checked) => {
                          const currentIds = selectedRoleIds || []
                          if (checked) {
                            setValue('role_ids', [...currentIds, role.id], { shouldValidate: true })
                          } else {
                            setValue('role_ids', currentIds.filter(id => id !== role.id), { shouldValidate: true })
                          }
                        }}
                      />
                      <Label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                        <div>
                          <span className="font-medium">{role.name}</span>
                          {role.name_ar && (
                            <span className="text-sm text-muted-foreground ml-2">({role.name_ar})</span>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.role_ids && (
                  <p className="text-sm text-destructive mt-1" role="alert">{errors.role_ids.message}</p>
                )}
              </div>
            )}

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('auth.password')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('users.passwordPlaceholder') || t('auth.passwordPlaceholder') || 'Enter password (minimum 6 characters)'}
                  {...register('password', { 
                    required: t('users.form.passwordRequired') || 'Password is required',
                    minLength: {
                      value: 6,
                      message: t('users.form.passwordMinLength') || 'Password must be at least 6 characters'
                    }
                  })}
                  disabled={createMutation.isPending}
                  className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1" role="alert">{errors.password.message}</p>
                )}
                {!errors.password && passwordValue && passwordValue.length > 0 && passwordValue.length < 6 && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">{t('users.form.passwordMinLength') || 'Password must be at least 6 characters'}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.loading') || 'Loading...'
                  : editingUser
                  ? t('common.update') || 'Update'
                  : t('common.create') || 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog 
        open={isPasswordDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsPasswordDialogOpen(false)
            setPasswordUser(null)
            setNewPassword('')
            // Ensure search query is not affected when dialog closes
            // Do not modify searchQuery here
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t('users.resetPasswordDialogTitle') || t('users.resetPassword') || 'Reset Password'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {passwordUser 
                ? (t('users.resetPasswordDialogDescription') || `Enter a new password for ${passwordUser.name || passwordUser.email}`)
                : (t('users.resetPasswordDialogDescription') || 'Enter a new password for this user')
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('auth.newPassword') || 'New Password'}</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t('users.newPasswordPlaceholder') || t('auth.passwordPlaceholder') || 'Enter new password (min 6 characters)'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordMutation.isPending}
                className={newPassword && newPassword.length > 0 && newPassword.length < 6 ? 'border-yellow-500 focus-visible:ring-yellow-500' : ''}
                onKeyDown={(e) => {
                  // Prevent Enter key from submitting if password is invalid
                  if (e.key === 'Enter' && (!newPassword || newPassword.length < 6)) {
                    e.preventDefault()
                  }
                }}
              />
              {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  {t('users.form.passwordMinLength') || 'Password must be at least 6 characters'}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsPasswordDialogOpen(false)
                setPasswordUser(null)
                setNewPassword('')
                // Ensure search query is not affected
              }}
              disabled={passwordMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handlePasswordSubmit()
              }}
              disabled={passwordMutation.isPending || !newPassword || newPassword.length < 6}
            >
              {passwordMutation.isPending
                ? t('common.loading') || 'Loading...'
                : t('common.update') || 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.messages.deleteConfirm') || `Are you sure you want to delete user "${userToDelete?.name || userToDelete?.email}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
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

