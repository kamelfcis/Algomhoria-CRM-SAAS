import { createClient } from '@/lib/supabase/client'
import { userHasPermission, getUserPermissions } from '@/lib/utils/permission-helpers'

/**
 * Database-driven permission checker
 * This replaces the hardcoded permission system with database-driven checks
 */
export class DatabasePermissionChecker {
  constructor(private userId: string) {}

  /**
   * Check if user has a specific permission
   */
  async can(permissionName: string): Promise<boolean> {
    return await userHasPermission(this.userId, permissionName)
  }

  /**
   * Check if user has any of the specified permissions
   */
  async canAny(permissionNames: string[]): Promise<boolean> {
    const checks = await Promise.all(
      permissionNames.map(name => this.can(name))
    )
    return checks.some(result => result === true)
  }

  /**
   * Check if user has all of the specified permissions
   */
  async canAll(permissionNames: string[]): Promise<boolean> {
    const checks = await Promise.all(
      permissionNames.map(name => this.can(name))
    )
    return checks.every(result => result === true)
  }

  /**
   * Get all permissions for this user
   */
  async getAllPermissions(): Promise<string[]> {
    return await getUserPermissions(this.userId)
  }

  // Convenience methods for common permissions
  async canViewUsers(): Promise<boolean> {
    return await this.can('users:view')
  }

  async canCreateUsers(): Promise<boolean> {
    return await this.can('users:create')
  }

  async canUpdateUsers(): Promise<boolean> {
    return await this.can('users:update')
  }

  async canDeleteUsers(): Promise<boolean> {
    return await this.can('users:delete')
  }

  async canViewRoles(): Promise<boolean> {
    return await this.can('roles:view')
  }

  async canCreateRoles(): Promise<boolean> {
    return await this.can('roles:create')
  }

  async canUpdateRoles(): Promise<boolean> {
    return await this.can('roles:update')
  }

  async canDeleteRoles(): Promise<boolean> {
    return await this.can('roles:delete')
  }

  async canAssignRoles(): Promise<boolean> {
    return await this.can('roles:assign')
  }

  async canViewPermissions(): Promise<boolean> {
    return await this.can('permissions:view')
  }

  async canCreatePermissions(): Promise<boolean> {
    return await this.can('permissions:create')
  }

  async canUpdatePermissions(): Promise<boolean> {
    return await this.can('permissions:update')
  }

  async canDeletePermissions(): Promise<boolean> {
    return await this.can('permissions:delete')
  }

  async canViewDashboard(): Promise<boolean> {
    return await this.can('dashboard:view')
  }

  async canViewSettings(): Promise<boolean> {
    return await this.can('settings:view')
  }

  async canUpdateSettings(): Promise<boolean> {
    return await this.can('settings:update')
  }

  async canViewPosts(): Promise<boolean> {
    return await this.can('posts:view')
  }

  async canCreatePosts(): Promise<boolean> {
    return await this.can('posts:create')
  }

  async canUpdatePosts(): Promise<boolean> {
    return await this.can('posts:update')
  }

  async canDeletePosts(): Promise<boolean> {
    return await this.can('posts:delete')
  }

  async canPublishPosts(): Promise<boolean> {
    return await this.can('posts:publish')
  }

  async canViewProperties(): Promise<boolean> {
    return await this.can('properties:view')
  }

  async canCreateProperties(): Promise<boolean> {
    return await this.can('properties:create')
  }

  async canUpdateProperties(): Promise<boolean> {
    return await this.can('properties:update')
  }

  async canDeleteProperties(): Promise<boolean> {
    return await this.can('properties:delete')
  }

  async canViewLeads(): Promise<boolean> {
    return await this.can('leads:view')
  }

  async canCreateLeads(): Promise<boolean> {
    return await this.can('leads:create')
  }

  async canUpdateLeads(): Promise<boolean> {
    return await this.can('leads:update')
  }

  async canDeleteLeads(): Promise<boolean> {
    return await this.can('leads:delete')
  }

  async canAssignLeads(): Promise<boolean> {
    return await this.can('leads:assign')
  }

  async canViewActivityLogs(): Promise<boolean> {
    return await this.can('activity_logs:view')
  }

  /**
   * Check if user is admin (has admin role)
   */
  async isAdmin(): Promise<boolean> {
    const supabase = createClient()
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles!inner(name, status)
      `)
      .eq('user_id', this.userId)

    return userRoles?.some((ur: any) => 
      ur.roles?.name === 'admin' && ur.roles?.status === 'active'
    ) ?? false
  }
}

/**
 * Create a permission checker for a user
 */
export function createPermissionChecker(userId: string): DatabasePermissionChecker {
  return new DatabasePermissionChecker(userId)
}

