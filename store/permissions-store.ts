'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

interface PermissionsState {
  permissions: Set<string>
  isAdmin: boolean
  isLoading: boolean
  userId: string | null
  lastFetched: number | null
  
  // Actions
  fetchPermissions: (userId: string) => Promise<void>
  hasPermission: (permissionName: string) => boolean
  hasResourcePermission: (resource: string, action: 'view' | 'create' | 'update' | 'edit' | 'delete') => boolean
  hasAnyResourcePermission: (resource: string) => boolean
  clearPermissions: () => void
}

// Cache duration: 2 minutes for better balance between performance and freshness
// Permissions changes should be reflected quickly
const CACHE_DURATION = 2 * 60 * 1000

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  permissions: new Set<string>(),
  isAdmin: false,
  isLoading: false, // Start as false to avoid loading flicker on cached data
  userId: null,
  lastFetched: null,

  fetchPermissions: async (userId: string) => {
    const state = get()
    
    // Return cached data if still valid
    if (
      state.userId === userId && 
      state.lastFetched && 
      Date.now() - state.lastFetched < CACHE_DURATION &&
      state.permissions.size > 0
    ) {
      return
    }

    // If already loading for the same user, skip
    if (state.isLoading && state.userId === userId) {
      return
    }

    set({ isLoading: true, userId })

    try {
      const supabase = createClient()
      
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles!inner(
            id,
            name,
            status,
            role_permissions(
              permission_id,
              permissions!inner(name)
            )
          )
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user permissions:', error)
        set({ 
          permissions: new Set(), 
          isAdmin: false, 
          isLoading: false,
          lastFetched: Date.now()
        })
        return
      }

      // Extract all permission names and check for admin
      const permissionNames = new Set<string>()
      let userIsAdmin = false

      userRoles?.forEach((ur: any) => {
        if (ur.roles?.status === 'active') {
          // Check if user has admin role
          if (ur.roles?.name === 'admin') {
            userIsAdmin = true
          }

          ur.roles?.role_permissions?.forEach((rp: any) => {
            if (rp.permissions?.name) {
              permissionNames.add(rp.permissions.name)
            }
          })
        }
      })

      set({ 
        permissions: permissionNames, 
        isAdmin: userIsAdmin, 
        isLoading: false,
        lastFetched: Date.now()
      })
    } catch (error) {
      console.error('Error fetching permissions:', error)
      set({ 
        permissions: new Set(), 
        isAdmin: false, 
        isLoading: false,
        lastFetched: Date.now()
      })
    }
  },

  hasPermission: (permissionName: string) => {
    const { permissions, isAdmin } = get()
    if (isAdmin) return true
    return permissions.has(permissionName)
  },

  hasResourcePermission: (resource: string, action: 'view' | 'create' | 'update' | 'edit' | 'delete') => {
    const { permissions, isAdmin } = get()
    if (isAdmin) return true
    
    const hasWildcard = permissions.has(`${resource}:*`)
    if (hasWildcard) return true
    
    // Handle both 'update' and 'edit' for backwards compatibility
    if (action === 'edit') {
      return permissions.has(`${resource}:edit`) || permissions.has(`${resource}:update`)
    }
    if (action === 'update') {
      return permissions.has(`${resource}:update`) || permissions.has(`${resource}:edit`)
    }
    
    return permissions.has(`${resource}:${action}`)
  },

  hasAnyResourcePermission: (resource: string) => {
    const { permissions, isAdmin } = get()
    if (isAdmin) return true
    
    const perms = Array.from(permissions)
    return perms.includes(`${resource}:*`) || perms.some(p => p.startsWith(`${resource}:`))
  },

  clearPermissions: () => {
    set({ 
      permissions: new Set(), 
      isAdmin: false, 
      isLoading: true, 
      userId: null,
      lastFetched: null
    })
  },
}))

