/**
 * Activity Logger Utility
 * 
 * This utility provides functions to log user activities for audit purposes.
 * Activities are logged to the activity_logs table in the database.
 */

import { createClient } from '@/lib/supabase/client'

export interface ActivityLogParams {
  action: string // e.g., 'create', 'update', 'delete', 'login', 'logout'
  entityType: string // e.g., 'post', 'user', 'property', 'category'
  entityId?: string // ID of the affected entity
  entityName?: string // Name/title of the affected entity
  description?: string // Human-readable description
  metadata?: Record<string, any> // Additional data (old values, new values, etc.)
}

/**
 * Logs a user activity to the database
 * 
 * @param params - Activity log parameters
 * @returns Promise that resolves to the log ID or null if failed
 */
export async function logActivity(params: ActivityLogParams): Promise<string | null> {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('Cannot log activity: No authenticated user')
      return null
    }

    // Get client info (if available in browser)
    const ipAddress = typeof window !== 'undefined' ? undefined : undefined // Server-side only
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined

    // Call the database function to log the activity
    const { data, error } = await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId || null,
      p_entity_name: params.entityName || null,
      p_description: params.description || null,
      p_metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      p_ip_address: ipAddress || null,
      p_user_agent: userAgent || null,
    })

    if (error) {
      console.error('Error logging activity:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error logging activity:', error)
    return null
  }
}

/**
 * Helper function to log CRUD operations
 */
export const ActivityLogger = {
  /**
   * Log a create action
   */
  async create(entityType: string, entityId: string, entityName: string, metadata?: Record<string, any>) {
    return logActivity({
      action: 'create',
      entityType,
      entityId,
      entityName,
      description: `Created ${entityType}: ${entityName}`,
      metadata,
    })
  },

  /**
   * Log an update action
   */
  async update(entityType: string, entityId: string, entityName: string, oldValues?: Record<string, any>, newValues?: Record<string, any>) {
    return logActivity({
      action: 'update',
      entityType,
      entityId,
      entityName,
      description: `Updated ${entityType}: ${entityName}`,
      metadata: {
        old_values: oldValues,
        new_values: newValues,
      },
    })
  },

  /**
   * Log a delete action
   */
  async delete(entityType: string, entityId: string, entityName: string, metadata?: Record<string, any>) {
    return logActivity({
      action: 'delete',
      entityType,
      entityId,
      entityName,
      description: `Deleted ${entityType}: ${entityName}`,
      metadata,
    })
  },

  /**
   * Log a login action
   */
  async login(userId: string, userEmail: string) {
    return logActivity({
      action: 'login',
      entityType: 'user',
      entityId: userId,
      entityName: userEmail,
      description: `User logged in: ${userEmail}`,
    })
  },

  /**
   * Log a logout action
   */
  async logout(userId: string, userEmail: string) {
    return logActivity({
      action: 'logout',
      entityType: 'user',
      entityId: userId,
      entityName: userEmail,
      description: `User logged out: ${userEmail}`,
    })
  },

  /**
   * Log a bulk action
   */
  async bulkAction(action: string, entityType: string, count: number, metadata?: Record<string, any>) {
    return logActivity({
      action: `bulk_${action}`,
      entityType,
      description: `Bulk ${action}: ${count} ${entityType}(s)`,
      metadata: {
        count,
        ...metadata,
      },
    })
  },
}

