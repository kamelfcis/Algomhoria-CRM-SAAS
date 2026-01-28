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
  
  // Also refetch if cache is expired (to ensure permissions are fresh)
  useEffect(() => {
    if (profile?.id && lastFetched) {
      const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
      const cacheAge = Date.now() - lastFetched
      if (cacheAge > CACHE_DURATION) {
        fetchPermissions(profile.id)
      }
    }
  }, [profile?.id, lastFetched, fetchPermissions])

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
