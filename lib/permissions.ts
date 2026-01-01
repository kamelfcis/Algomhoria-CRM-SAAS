import { Role, Permission, hasPermission, PERMISSIONS } from './constants'

export class PermissionChecker {
  constructor(private role: Role) {}

  can(permission: Permission): boolean {
    return hasPermission(this.role, permission)
  }

  canViewUsers(): boolean {
    return this.can(PERMISSIONS.USERS_VIEW)
  }

  canCreateUsers(): boolean {
    return this.can(PERMISSIONS.USERS_CREATE)
  }

  canUpdateUsers(): boolean {
    return this.can(PERMISSIONS.USERS_UPDATE)
  }

  canDeleteUsers(): boolean {
    return this.can(PERMISSIONS.USERS_DELETE)
  }

  canViewRoles(): boolean {
    return this.can(PERMISSIONS.ROLES_VIEW)
  }

  canViewDashboard(): boolean {
    return this.can(PERMISSIONS.DASHBOARD_VIEW)
  }

  canViewSettings(): boolean {
    return this.can(PERMISSIONS.SETTINGS_VIEW)
  }

  canUpdateSettings(): boolean {
    return this.can(PERMISSIONS.SETTINGS_UPDATE)
  }

  isAdmin(): boolean {
    return this.role === 'admin'
  }

  isModerator(): boolean {
    return this.role === 'moderator'
  }

  isSales(): boolean {
    return this.role === 'sales'
  }

  isUser(): boolean {
    return this.role === 'user'
  }
}

