'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { usePermissionsStore } from '@/store/permissions-store'

interface PermissionCheckResult {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  isLoading: boolean
  isAdmin: boolean
}

/**
 * Hook to check user permissions for a specific resource
 * Uses centralized permissions store with caching for maximum performance
 * @param resource - The resource name (e.g., 'categories', 'posts', 'properties')
 */
export function usePermissions(resource: string): PermissionCheckResult {
  const { profile } = useAuthStore()
  const { 
    fetchPermissions, 
    hasResourcePermission, 
    isLoading, 
    isAdmin,
    userId,
    lastFetched,
    permissions
  } = usePermissionsStore()

  // Fetch permissions when profile changes (but don't block rendering)
  useEffect(() => {
    if (profile?.id && profile.id !== userId) {
      fetchPermissions(profile.id)
    }
  }, [profile?.id, fetchPermissions, userId])

  // If we have cached permissions, return them immediately (even if still "loading" a refresh)
  const hasCachedData = lastFetched !== null && permissions.size > 0

  // If no profile, return early with no permissions
  if (!profile?.id) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      isLoading: true,
      isAdmin: false,
    }
  }

  // If loading but we have cached data, use cached data immediately
  if (hasCachedData) {
    return {
      canView: hasResourcePermission(resource, 'view'),
      canCreate: hasResourcePermission(resource, 'create'),
      canEdit: hasResourcePermission(resource, 'edit'),
      canDelete: hasResourcePermission(resource, 'delete'),
      isLoading: false,
      isAdmin,
    }
  }

  // If still loading and no cache, return loading state
  if (isLoading) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      isLoading: true,
      isAdmin: false,
    }
  }

  // Check permissions using the store
  return {
    canView: hasResourcePermission(resource, 'view'),
    canCreate: hasResourcePermission(resource, 'create'),
    canEdit: hasResourcePermission(resource, 'edit'),
    canDelete: hasResourcePermission(resource, 'delete'),
    isLoading: false,
    isAdmin,
  }
}
