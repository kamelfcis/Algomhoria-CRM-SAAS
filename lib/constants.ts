// User Roles (matching database schema)
export const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SALES: 'sales',
  USER: 'user',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

// Permissions
export const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  
  // Roles
  ROLES_VIEW: 'roles:view',
  
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
  
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role to Permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  [ROLES.SALES]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  [ROLES.USER]: [
    PERMISSIONS.DASHBOARD_VIEW,
  ],
}

// Check if user has permission
export function hasPermission(userRole: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false
}

// Check if user has any of the permissions
export function hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

// Check if user has all permissions
export function hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

