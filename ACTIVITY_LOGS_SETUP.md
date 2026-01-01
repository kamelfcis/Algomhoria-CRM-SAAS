# Activity Logs Setup Guide

This guide will help you set up and use the Activity Log system in your admin dashboard.

## Overview

The Activity Log system tracks all user actions across the dashboard for audit and security purposes. It automatically logs:
- Create, Update, Delete operations
- Login/Logout events
- Bulk operations
- User information and timestamps

## Database Setup

### Step 1: Run the SQL Migration

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase_activity_logs.sql`
4. Click **Run** to execute the migration

This will create:
- `activity_logs` table
- Required indexes for performance
- RLS (Row Level Security) policies
- `log_activity()` function for secure logging

### Step 2: Verify Setup

Run this query to verify the table was created:

```sql
SELECT * FROM activity_logs LIMIT 5;
```

You should see an empty table (or existing logs if any).

## Usage

### Automatic Logging

Activity logging is already integrated into:
- ✅ Posts (create, update, delete)
- ✅ Users (create, update, delete)
- ✅ Properties (create, update, delete)
- ✅ Authentication (login, logout)

### Manual Logging

To add activity logging to other pages, follow this pattern:

#### 1. Import the Activity Logger

```typescript
import { ActivityLogger } from '@/lib/utils/activity-logger'
```

#### 2. Log Create Actions

```typescript
const createMutation = useMutation({
  mutationFn: createEntity,
  onSuccess: async (data: any) => {
    // ... your existing code ...
    
    // Log activity
    if (data?.id) {
      await ActivityLogger.create(
        'entity_type',  // e.g., 'category', 'lead', 'booking'
        data.id,
        data.name || data.title || 'Untitled'
      )
    }
  },
})
```

#### 3. Log Update Actions

```typescript
const updateMutation = useMutation({
  mutationFn: ({ id, data }) => updateEntity(id, data),
  onSuccess: async (data: any) => {
    // ... your existing code ...
    const previousEntity = editingEntity
    
    // Log activity
    if (previousEntity && data?.id) {
      await ActivityLogger.update(
        'entity_type',
        data.id,
        data.name || data.title || 'Untitled',
        previousEntity,  // Old values
        data            // New values
      )
    }
  },
})
```

#### 4. Log Delete Actions

```typescript
const deleteMutation = useMutation({
  mutationFn: deleteEntity,
  onSuccess: async (_, deletedId) => {
    // ... your existing code ...
    
    // Get entity info before deletion
    const entityToDelete = entities?.find(e => e.id === deletedId)
    
    // Log activity
    if (entityToDelete) {
      await ActivityLogger.delete(
        'entity_type',
        entityToDelete.id,
        entityToDelete.name || entityToDelete.title || 'Untitled'
      )
    }
  },
})
```

#### 5. Log Bulk Actions

```typescript
const bulkActionMutation = useMutation({
  mutationFn: bulkAction,
  onSuccess: async (_, { ids, action }) => {
    // ... your existing code ...
    
    // Log bulk activity
    await ActivityLogger.bulkAction(
      action,           // 'delete', 'update', etc.
      'entity_type',
      ids.length,
      { ids, action }   // Additional metadata
    )
  },
})
```

## Viewing Activity Logs

### Access

1. Navigate to **Activity Logs** in the sidebar (Admin only)
2. Or go directly to `/dashboard/activity-logs`

### Features

- **Real-time Updates**: Refreshes every 30 seconds
- **Filtering**: Filter by action type or entity type
- **Search**: Search by description or entity name
- **Sorting**: Sort by timestamp, user, action, or entity type
- **Export**: Export logs to CSV
- **User Information**: See who performed each action

### Activity Log Columns

- **Timestamp**: When the action occurred
- **User**: Who performed the action (with role)
- **Action**: Type of action (create, update, delete, login, logout)
- **Entity Type**: What was affected (post, user, property, etc.)
- **Entity**: Name/title of the affected entity
- **Description**: Human-readable description

## Security

### Row Level Security (RLS)

- **Users**: Can only view their own activity logs
- **Admins**: Can view all activity logs
- **Insert**: Only via the `log_activity()` function (prevents tampering)

### Best Practices

1. **Don't log sensitive data**: Avoid logging passwords, tokens, or PII in metadata
2. **Use entity names**: Always provide meaningful entity names for easy identification
3. **Handle errors gracefully**: Activity logging failures shouldn't break your app
4. **Regular cleanup**: Consider archiving old logs periodically

## Troubleshooting

### No logs appearing?

1. **Check RLS policies**: Ensure you're logged in as an admin
2. **Verify function exists**: Run `SELECT * FROM pg_proc WHERE proname = 'log_activity';`
3. **Check browser console**: Look for any errors in the Activity Logger

### Performance issues?

1. **Check indexes**: Ensure indexes are created on `user_id`, `action`, `entity_type`, `created_at`
2. **Limit queries**: The Activity Logs page limits to 1000 most recent logs
3. **Archive old logs**: Consider moving old logs to an archive table

## Example: Adding Logging to Categories Page

```typescript
// 1. Import
import { ActivityLogger } from '@/lib/utils/activity-logger'

// 2. Update create mutation
const createMutation = useMutation({
  mutationFn: createCategory,
  onSuccess: async (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    setIsDialogOpen(false)
    reset()
    
    // Log activity
    if (data?.id) {
      await ActivityLogger.create(
        'category',
        data.id,
        data.title_en || data.title_ar || 'Untitled Category'
      )
    }
  },
})

// 3. Update update mutation
const updateMutation = useMutation({
  mutationFn: ({ id, data }) => updateCategory(id, data),
  onSuccess: async (data: any) => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    setIsDialogOpen(false)
    const previousCategory = editingCategory
    setEditingCategory(null)
    reset()
    
    // Log activity
    if (previousCategory && data?.id) {
      await ActivityLogger.update(
        'category',
        data.id,
        data.title_en || data.title_ar || 'Untitled Category',
        previousCategory,
        data
      )
    }
  },
})

// 4. Update delete mutation
const deleteMutation = useMutation({
  mutationFn: deleteCategory,
  onSuccess: async (_, deletedId) => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    
    // Log activity
    const categoryToDelete = categories?.find(c => c.id === deletedId)
    if (categoryToDelete) {
      await ActivityLogger.delete(
        'category',
        categoryToDelete.id,
        categoryToDelete.title_en || categoryToDelete.title_ar || 'Untitled Category'
      )
    }
  },
})
```

## API Reference

### ActivityLogger.create()

Logs a create action.

```typescript
await ActivityLogger.create(
  entityType: string,
  entityId: string,
  entityName: string,
  metadata?: Record<string, any>
)
```

### ActivityLogger.update()

Logs an update action with old and new values.

```typescript
await ActivityLogger.update(
  entityType: string,
  entityId: string,
  entityName: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
)
```

### ActivityLogger.delete()

Logs a delete action.

```typescript
await ActivityLogger.delete(
  entityType: string,
  entityId: string,
  entityName: string,
  metadata?: Record<string, any>
)
```

### ActivityLogger.login()

Logs a login event.

```typescript
await ActivityLogger.login(
  userId: string,
  userEmail: string
)
```

### ActivityLogger.logout()

Logs a logout event.

```typescript
await ActivityLogger.logout(
  userId: string,
  userEmail: string
)
```

### ActivityLogger.bulkAction()

Logs a bulk operation.

```typescript
await ActivityLogger.bulkAction(
  action: string,
  entityType: string,
  count: number,
  metadata?: Record<string, any>
)
```

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify the database migration was successful
3. Ensure you have admin permissions to view logs
4. Review the RLS policies in Supabase

---

**Last Updated**: Activity Log system integrated into Posts, Users, Properties, and Authentication.

