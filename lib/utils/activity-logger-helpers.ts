/**
 * Activity Logger Helper Functions
 * 
 * Utility functions to simplify activity logging in CRUD operations.
 */

import { ActivityLogger } from './activity-logger'

/**
 * Helper to get entity name from common patterns
 */
export function getEntityName(entity: any, fallback: string = 'Untitled'): string {
  if (!entity) return fallback
  
  // Try common name fields
  return (
    entity.name ||
    entity.title ||
    entity.title_en ||
    entity.title_ar ||
    entity.code ||
    entity.email ||
    fallback
  )
}

/**
 * Wraps a create mutation to automatically log activity
 */
export function withActivityLogging<TData, TVariables>(
  entityType: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  getName?: (data: TData) => string
) {
  return async (variables: TVariables): Promise<TData> => {
    const result = await mutationFn(variables)
    
    // Log activity if result has an id
    if (result && typeof result === 'object' && 'id' in result) {
      const entityName = getName 
        ? getName(result as TData)
        : getEntityName(result as any)
      
      await ActivityLogger.create(
        entityType,
        (result as any).id,
        entityName
      )
    }
    
    return result
  }
}

/**
 * Creates a mutation handler that logs create activities
 */
export function createActivityHandler(
  entityType: string,
  getName?: (data: any) => string
) {
  return async (data: any) => {
    if (data?.id) {
      const entityName = getName 
        ? getName(data)
        : getEntityName(data)
      
      await ActivityLogger.create(entityType, data.id, entityName)
    }
  }
}

/**
 * Creates a mutation handler that logs update activities
 */
export function updateActivityHandler(
  entityType: string,
  getPreviousEntity: () => any,
  getName?: (data: any) => string
) {
  return async (data: any) => {
    const previousEntity = getPreviousEntity()
    
    if (previousEntity && data?.id) {
      const entityName = getName 
        ? getName(data)
        : getEntityName(data)
      
      await ActivityLogger.update(
        entityType,
        data.id,
        entityName,
        previousEntity,
        data
      )
    }
  }
}

/**
 * Creates a mutation handler that logs delete activities
 */
export function deleteActivityHandler(
  entityType: string,
  getEntityById: (id: string) => any | undefined,
  getName?: (entity: any) => string
) {
  return async (_: any, deletedId: string) => {
    const entityToDelete = getEntityById(deletedId)
    
    if (entityToDelete) {
      const entityName = getName 
        ? getName(entityToDelete)
        : getEntityName(entityToDelete)
      
      await ActivityLogger.delete(
        entityType,
        entityToDelete.id,
        entityName
      )
    }
  }
}

/**
 * Common entity type constants
 */
export const EntityTypes = {
  POST: 'post',
  USER: 'user',
  PROPERTY: 'property',
  CATEGORY: 'category',
  LEAD: 'lead',
  DIRECT_LEAD: 'direct_lead',
  LEADS_ASSIGNMENT: 'leads_assignment',
  PROPERTY_OWNER: 'property_owner',
  SLIDER: 'slider',
  TEAM_USER: 'team_user',
  NEWSLETTER_SUBSCRIBER: 'newsletter_subscriber',
  PROJECT: 'project',
  PROJECT_CATEGORY: 'project_category',
  BOOKING: 'booking',
  PROPERTY_COMMENT: 'property_comment',
  PROPERTY_TYPE: 'property_type',
  GOVERNORATE: 'governorate',
  AREA: 'area',
  STREET: 'street',
  PROPERTY_FACILITY: 'property_facility',
  PROPERTY_SERVICE: 'property_service',
  PAYMENT_METHOD: 'payment_method',
  PROPERTY_VIEW_TYPE: 'property_view_type',
  PROPERTY_FINISHING_TYPE: 'property_finishing_type',
  SECTION: 'section',
  FEATURED_AREA: 'featured_area',
  PROPERTY_IMAGE: 'property_image',
  POST_GALLERY: 'post_gallery',
  SETTINGS: 'settings',
} as const

