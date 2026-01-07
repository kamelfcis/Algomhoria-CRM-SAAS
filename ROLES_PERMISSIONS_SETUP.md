# Roles and Permissions System Setup Guide

## Overview

This document describes the new flexible Role-Based Access Control (RBAC) system that replaces the simple role column in the users table. The new system allows:

- **Multiple roles per user**: Users can have multiple roles assigned
- **Flexible permissions**: Permissions are stored in the database and can be dynamically assigned to roles
- **Easy management**: Full UI for managing roles, permissions, and user assignments

## Database Schema

### Tables Created

1. **`permissions`** - Stores all available permissions
   - `id` (UUID, Primary Key)
   - `name` (TEXT, Unique) - e.g., 'users:view', 'posts:create'
   - `description` (TEXT) - English description
   - `description_ar` (TEXT) - Arabic description
   - `resource` (TEXT) - e.g., 'users', 'posts', 'settings'
   - `action` (TEXT) - e.g., 'view', 'create', 'update', 'delete'
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. **`roles`** - Stores all roles
   - `id` (UUID, Primary Key)
   - `name` (TEXT, Unique) - e.g., 'admin', 'moderator', 'sales'
   - `name_ar` (TEXT) - Arabic name
   - `description` (TEXT) - English description
   - `description_ar` (TEXT) - Arabic description
   - `status` (TEXT) - 'active' or 'inactive'
   - `is_system_role` (BOOLEAN) - System roles cannot be deleted
   - `created_at`, `updated_at` (TIMESTAMPTZ)

3. **`role_permissions`** - Junction table linking roles to permissions
   - `id` (UUID, Primary Key)
   - `role_id` (UUID, Foreign Key → roles.id)
   - `permission_id` (UUID, Foreign Key → permissions.id)
   - `created_at` (TIMESTAMPTZ)
   - Unique constraint on (role_id, permission_id)

4. **`user_roles`** - Junction table linking users to roles
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key → users.id)
   - `role_id` (UUID, Foreign Key → roles.id)
   - `assigned_by` (UUID, Foreign Key → users.id) - Who assigned this role
   - `assigned_at` (TIMESTAMPTZ)
   - Unique constraint on (user_id, role_id)

## Setup Instructions

### Step 1: Run the Migration

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase_roles_permissions_migration.sql`
4. Run the script

This will:
- Create all necessary tables
- Insert default permissions (users, roles, permissions, dashboard, settings, posts, categories, properties, leads, activity_logs)
- Create default roles (admin, moderator, sales, user)
- Assign permissions to default roles
- Migrate existing users from the `role` column to `user_roles` table
- Set up Row Level Security (RLS) policies

### Step 2: Verify Migration

Run these queries to verify everything was created correctly:

```sql
-- Check roles
SELECT * FROM roles;

-- Check permissions
SELECT * FROM permissions ORDER BY resource, action;

-- Check role permissions
SELECT r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.name, p.name;

-- Check user roles
SELECT u.email, r.name as role_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id;
```

### Step 3: Remove Old Role Column (Optional - After Verification)

**IMPORTANT**: Only run this after verifying that:
1. All users have roles assigned in `user_roles` table
2. The new permission system is working correctly
3. You have a backup of your database

1. Run the verification query from `remove_role_column_from_users.sql`:
   ```sql
   SELECT u.id, u.email, u.role, COUNT(ur.role_id) as assigned_roles
   FROM users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id
   GROUP BY u.id, u.email, u.role
   HAVING COUNT(ur.role_id) = 0;
   ```

2. If the query returns no rows (all users have roles), you can safely run:
   ```sql
   ALTER TABLE users DROP COLUMN IF EXISTS role;
   DROP INDEX IF EXISTS idx_users_role;
   ```

## Default Permissions

The migration script creates the following default permissions:

### Users
- `users:view` - View users
- `users:create` - Create users
- `users:update` - Update users
- `users:delete` - Delete users

### Roles
- `roles:view` - View roles
- `roles:create` - Create roles
- `roles:update` - Update roles
- `roles:delete` - Delete roles
- `roles:assign` - Assign roles to users

### Permissions
- `permissions:view` - View permissions
- `permissions:create` - Create permissions
- `permissions:update` - Update permissions
- `permissions:delete` - Delete permissions

### Dashboard
- `dashboard:view` - View dashboard

### Settings
- `settings:view` - View settings
- `settings:update` - Update settings

### Posts
- `posts:view` - View posts
- `posts:create` - Create posts
- `posts:update` - Update posts
- `posts:delete` - Delete posts
- `posts:publish` - Publish posts

### Categories
- `categories:view` - View categories
- `categories:create` - Create categories
- `categories:update` - Update categories
- `categories:delete` - Delete categories

### Properties
- `properties:view` - View properties
- `properties:create` - Create properties
- `properties:update` - Update properties
- `properties:delete` - Delete properties

### Leads
- `leads:view` - View leads
- `leads:create` - Create leads
- `leads:update` - Update leads
- `leads:delete` - Delete leads
- `leads:assign` - Assign leads

### Activity Logs
- `activity_logs:view` - View activity logs

## Default Roles and Their Permissions

### Admin
- **All permissions** - Full system access

### Moderator
- `users:view`
- `dashboard:view`
- `settings:view`
- `posts:view`, `posts:create`, `posts:update`, `posts:publish`
- `categories:view`, `categories:create`, `categories:update`
- `properties:view`
- `activity_logs:view`

### Sales
- `users:view`
- `dashboard:view`
- `leads:view`, `leads:create`, `leads:update`, `leads:assign`
- `properties:view`, `properties:create`, `properties:update`

### User
- `dashboard:view` - Basic access only

## Using the Dashboard

### Accessing the Users & Permissions Page

1. Navigate to **المستخدمون و الصلاحيات** (Users & Permissions) in the sidebar
2. This page has 3 tabs:
   - **الأدوار** (Roles) - Manage roles
   - **المستخدمون** (Users) - Manage user role assignments
   - **الصلاحيات** (Permissions) - Manage permissions

### Managing Roles

1. Click on the **Roles** tab
2. Click **Create Role** to create a new role
3. Fill in:
   - Name (required)
   - Name (Arabic) - optional
   - Description - optional
   - Description (Arabic) - optional
   - Status - active or inactive
4. Click **Permissions** button on any role to assign permissions
5. Select/deselect permissions and click **Save**

### Managing Users

1. Click on the **Users** tab
2. Click **Manage Roles** on any user
3. Select/deselect roles for that user
4. Click **Save**

### Managing Permissions

1. Click on the **Permissions** tab
2. Click **Create Permission** to create a new permission
3. Fill in:
   - Name (required) - e.g., `users:view`
   - Resource (required) - e.g., `users`
   - Action (required) - e.g., `view`
   - Description - optional
   - Description (Arabic) - optional
4. Permissions are grouped by resource for easy viewing
5. Use the search box to filter permissions

## API Endpoints

### Roles
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create a role
- `GET /api/roles/[id]` - Get a specific role
- `PATCH /api/roles/[id]` - Update a role
- `DELETE /api/roles/[id]` - Delete a role

### Permissions
- `GET /api/permissions` - Get all permissions
- `POST /api/permissions` - Create a permission
- `PATCH /api/permissions/[id]` - Update a permission
- `DELETE /api/permissions/[id]` - Delete a permission

### Role Permissions
- `GET /api/role-permissions?role_id=[id]` - Get permissions for a role
- `POST /api/role-permissions` - Assign permissions to a role
  - Body: `{ role_id: string, permission_ids: string[] }` (bulk) or `{ role_id: string, permission_id: string }` (single)
- `DELETE /api/role-permissions?role_id=[id]&permission_id=[id]` - Remove a permission from a role

### User Roles
- `GET /api/user-roles?user_id=[id]` - Get roles for a user
- `POST /api/user-roles` - Assign roles to a user
  - Body: `{ user_id: string, role_ids: string[] }` (bulk) or `{ user_id: string, role_id: string }` (single)
- `DELETE /api/user-roles?user_id=[id]&role_id=[id]` - Remove a role from a user

## Database Functions

### Check if user has permission
```sql
SELECT user_has_permission('user-uuid-here', 'users:view');
```

### Get all permissions for a user
```sql
SELECT * FROM get_user_permissions('user-uuid-here');
```

### Get all roles for a user
```sql
SELECT * FROM get_user_roles('user-uuid-here');
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Permissions**: Anyone authenticated can view, only admins can modify
- **Roles**: Anyone authenticated can view, only admins can modify
- **Role Permissions**: Anyone authenticated can view, only admins can modify
- **User Roles**: Users can view their own roles, admins can view and manage all

### Admin Check

The system checks if a user has the 'admin' role in the `user_roles` table before allowing modifications.

## Migration Notes

- Existing users are automatically migrated to the `user_roles` table based on their current `role` column value
- The `role` column in the `users` table is kept for backward compatibility until you're ready to remove it
- System roles (admin, moderator, sales, user) cannot be deleted
- Roles that are assigned to users cannot be deleted until all assignments are removed

## Troubleshooting

### Users don't have roles after migration

Run this query to check:
```sql
SELECT u.id, u.email, u.role, COUNT(ur.role_id) as assigned_roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email, u.role;
```

If some users have 0 assigned roles, manually assign them:
```sql
-- Get the role ID
SELECT id FROM roles WHERE name = 'user';

-- Assign role to user (replace role_id and user_id)
INSERT INTO user_roles (user_id, role_id)
VALUES ('user-uuid-here', 'role-uuid-here');
```

### Permission checks not working

Make sure:
1. The user has active roles assigned in `user_roles` table
2. The roles have `status = 'active'`
3. The roles have the required permissions assigned in `role_permissions` table

## Next Steps

1. **Update your application code** to use the new permission system
2. **Update the users page** to work with `user_roles` instead of the `role` column
3. **Update permission checks** throughout your application to use the database functions
4. **Test thoroughly** before removing the old `role` column
5. **Add more permissions** as needed for your application

## Support

If you encounter any issues:
1. Check the Supabase logs for errors
2. Verify RLS policies are correctly set up
3. Ensure all users have at least one role assigned
4. Check that roles have the necessary permissions

