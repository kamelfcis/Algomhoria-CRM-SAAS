import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Check if a user has the admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const adminClient = createAdminClient()
  
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select(`
      role_id,
      roles!inner(name, status)
    `)
    .eq('user_id', userId)

  return userRoles?.some((ur: any) => 
    ur.roles?.name === 'admin' && ur.roles?.status === 'active'
  ) ?? false
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string) {
  const adminClient = createAdminClient()
  
  const { data: userRoles, error } = await adminClient
    .from('user_roles')
    .select(`
      role_id,
      roles!inner(id, name, name_ar, status)
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user roles:', error)
    return []
  }

  return userRoles?.map((ur: any) => ({
    id: ur.roles.id,
    name: ur.roles.name,
    name_ar: ur.roles.name_ar,
    status: ur.roles.status,
  })) || []
}

/**
 * Check if user has a specific permission
 */
export async function userHasPermission(userId: string, permissionName: string): Promise<boolean> {
  const adminClient = createAdminClient()
  
  // Use the database function
  const { data, error } = await adminClient.rpc('user_has_permission', {
    user_uuid: userId,
    permission_name: permissionName,
  })

  if (error) {
    console.error('Error checking permission:', error)
    return false
  }

  return data === true
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient.rpc('get_user_permissions', {
    user_uuid: userId,
  })

  if (error) {
    console.error('Error fetching user permissions:', error)
    return []
  }

  return data?.map((p: any) => p.permission_name) || []
}

