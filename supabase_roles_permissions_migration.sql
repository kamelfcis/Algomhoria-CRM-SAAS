-- =====================================================
-- Roles and Permissions System Migration
-- =====================================================
-- This migration creates a flexible role-based access control (RBAC) system
-- Run this script in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Create Permissions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'users:view', 'posts:create'
  description TEXT,
  description_ar TEXT, -- Arabic description
  resource TEXT NOT NULL, -- e.g., 'users', 'posts', 'settings'
  action TEXT NOT NULL, -- e.g., 'view', 'create', 'update', 'delete'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- =====================================================
-- 2. Create Roles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'admin', 'moderator', 'sales'
  name_ar TEXT, -- Arabic name
  description TEXT,
  description_ar TEXT, -- Arabic description
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_system_role BOOLEAN NOT NULL DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);

-- =====================================================
-- 3. Create Role Permissions Junction Table
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id) -- Prevent duplicate assignments
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- =====================================================
-- 4. Create User Roles Table (Many-to-Many: Users can have multiple roles)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id), -- Who assigned this role
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id) -- Prevent duplicate role assignments
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- =====================================================
-- 5. Add updated_at trigger function (if not exists)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Create triggers for updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. Insert Default Permissions
-- =====================================================
-- Users Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('users:view', 'View users', 'عرض المستخدمين', 'users', 'view'),
  ('users:create', 'Create users', 'إنشاء مستخدمين', 'users', 'create'),
  ('users:update', 'Update users', 'تحديث المستخدمين', 'users', 'update'),
  ('users:delete', 'Delete users', 'حذف المستخدمين', 'users', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Roles Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('roles:view', 'View roles', 'عرض الأدوار', 'roles', 'view'),
  ('roles:create', 'Create roles', 'إنشاء أدوار', 'roles', 'create'),
  ('roles:update', 'Update roles', 'تحديث الأدوار', 'roles', 'update'),
  ('roles:delete', 'Delete roles', 'حذف الأدوار', 'roles', 'delete'),
  ('roles:assign', 'Assign roles to users', 'تعيين الأدوار للمستخدمين', 'roles', 'assign')
ON CONFLICT (name) DO NOTHING;

-- Permissions Management
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('permissions:view', 'View permissions', 'عرض الصلاحيات', 'permissions', 'view'),
  ('permissions:create', 'Create permissions', 'إنشاء صلاحيات', 'permissions', 'create'),
  ('permissions:update', 'Update permissions', 'تحديث الصلاحيات', 'permissions', 'update'),
  ('permissions:delete', 'Delete permissions', 'حذف الصلاحيات', 'permissions', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Dashboard Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('dashboard:view', 'View dashboard', 'عرض لوحة التحكم', 'dashboard', 'view')
ON CONFLICT (name) DO NOTHING;

-- Settings Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('settings:view', 'View settings', 'عرض الإعدادات', 'settings', 'view'),
  ('settings:update', 'Update settings', 'تحديث الإعدادات', 'settings', 'update')
ON CONFLICT (name) DO NOTHING;

-- Posts Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('posts:view', 'View posts', 'عرض المقالات', 'posts', 'view'),
  ('posts:create', 'Create posts', 'إنشاء مقالات', 'posts', 'create'),
  ('posts:update', 'Update posts', 'تحديث المقالات', 'posts', 'update'),
  ('posts:delete', 'Delete posts', 'حذف المقالات', 'posts', 'delete'),
  ('posts:publish', 'Publish posts', 'نشر المقالات', 'posts', 'publish')
ON CONFLICT (name) DO NOTHING;

-- Categories Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('categories:view', 'View categories', 'عرض الفئات', 'categories', 'view'),
  ('categories:create', 'Create categories', 'إنشاء فئات', 'categories', 'create'),
  ('categories:update', 'Update categories', 'تحديث الفئات', 'categories', 'update'),
  ('categories:delete', 'Delete categories', 'حذف الفئات', 'categories', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Properties Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('properties:view', 'View properties', 'عرض العقارات', 'properties', 'view'),
  ('properties:create', 'Create properties', 'إنشاء عقارات', 'properties', 'create'),
  ('properties:update', 'Update properties', 'تحديث العقارات', 'properties', 'update'),
  ('properties:delete', 'Delete properties', 'حذف العقارات', 'properties', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Leads Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('leads:view', 'View leads', 'عرض العملاء المحتملين', 'leads', 'view'),
  ('leads:create', 'Create leads', 'إنشاء عملاء محتملين', 'leads', 'create'),
  ('leads:update', 'Update leads', 'تحديث العملاء المحتملين', 'leads', 'update'),
  ('leads:delete', 'Delete leads', 'حذف العملاء المحتملين', 'leads', 'delete'),
  ('leads:assign', 'Assign leads', 'تعيين العملاء المحتملين', 'leads', 'assign')
ON CONFLICT (name) DO NOTHING;

-- Activity Logs Permissions
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('activity_logs:view', 'View activity logs', 'عرض سجل الأنشطة', 'activity_logs', 'view')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. Insert Default Roles
-- =====================================================
INSERT INTO roles (name, name_ar, description, description_ar, status, is_system_role) VALUES
  ('admin', 'مدير', 'Full access to all features and settings', 'وصول كامل لجميع الميزات والإعدادات', 'active', true),
  ('moderator', 'مشرف', 'Can manage content and view users', 'يمكنه إدارة المحتوى وعرض المستخدمين', 'active', true),
  ('sales', 'مبيعات', 'Can manage leads and view properties', 'يمكنه إدارة العملاء المحتملين وعرض العقارات', 'active', true),
  ('user', 'مستخدم', 'Basic access with limited permissions', 'وصول أساسي بصلاحيات محدودة', 'active', true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 9. Assign Permissions to Default Roles
-- =====================================================
-- Admin: All permissions
DO $$
DECLARE
  admin_role_id UUID;
  perm RECORD;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  FOR perm IN SELECT id FROM permissions LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (admin_role_id, perm.id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;

-- Moderator: View users, dashboard, settings, posts, categories
DO $$
DECLARE
  moderator_role_id UUID;
BEGIN
  SELECT id INTO moderator_role_id FROM roles WHERE name = 'moderator';
  
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT moderator_role_id, id FROM permissions
  WHERE name IN (
    'users:view',
    'dashboard:view',
    'settings:view',
    'posts:view',
    'posts:create',
    'posts:update',
    'posts:publish',
    'categories:view',
    'categories:create',
    'categories:update',
    'properties:view',
    'activity_logs:view'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- Sales: View users, dashboard, leads, properties
DO $$
DECLARE
  sales_role_id UUID;
BEGIN
  SELECT id INTO sales_role_id FROM roles WHERE name = 'sales';
  
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sales_role_id, id FROM permissions
  WHERE name IN (
    'users:view',
    'dashboard:view',
    'leads:view',
    'leads:create',
    'leads:update',
    'leads:assign',
    'properties:view',
    'properties:create',
    'properties:update'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- User: View dashboard only
DO $$
DECLARE
  user_role_id UUID;
BEGIN
  SELECT id INTO user_role_id FROM roles WHERE name = 'user';
  
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT user_role_id, id FROM permissions
  WHERE name IN (
    'dashboard:view'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- =====================================================
-- 10. Migrate Existing Users to User Roles
-- =====================================================
-- Assign roles to existing users based on their current role column
-- This will work whether the role column exists or not
DO $$
DECLARE
  user_record RECORD;
  role_id UUID;
  user_role_count INTEGER;
  role_column_exists BOOLEAN;
BEGIN
  -- Check if role column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'role'
  ) INTO role_column_exists;

  IF role_column_exists THEN
    -- Role column exists - migrate from role column
    FOR user_record IN SELECT id, role FROM users WHERE role IS NOT NULL LOOP
      SELECT id INTO role_id FROM roles WHERE name = user_record.role;
      
      IF role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (user_record.id, role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      END IF;
    END LOOP;
  ELSE
    -- Role column doesn't exist - assign default 'user' role to users without roles
    SELECT id INTO role_id FROM roles WHERE name = 'user';
    
    IF role_id IS NOT NULL THEN
      FOR user_record IN SELECT id FROM users LOOP
        -- Check if user has any roles
        SELECT COUNT(*) INTO user_role_count
        FROM user_roles
        WHERE user_id = user_record.id;
        
        -- If user has no roles, assign default 'user' role
        IF user_role_count = 0 THEN
          INSERT INTO user_roles (user_id, role_id)
          VALUES (user_record.id, role_id)
          ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 11. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Permissions: Authenticated users can view, only admins can modify
CREATE POLICY "Anyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can update permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can delete permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Roles: Authenticated users can view, only admins can modify
CREATE POLICY "Anyone can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can delete non-system roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    is_system_role = false AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Role Permissions: Authenticated users can view, only admins can modify
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- User Roles: Users can view their own roles, admins can manage all
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can assign roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can remove roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- =====================================================
-- 12. Helper Functions
-- =====================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid
      AND p.name = permission_name
      AND EXISTS (
        SELECT 1 FROM roles r
        WHERE r.id = ur.role_id AND r.status = 'active'
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
    AND r.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, r.id
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
    AND r.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. Remove role column from users table (OPTIONAL - Run separately after verification)
-- =====================================================
-- IMPORTANT: Only run this after verifying that all users have been migrated to user_roles table
-- Uncomment the following lines when ready:

-- ALTER TABLE users DROP COLUMN IF EXISTS role;
-- DROP INDEX IF EXISTS idx_users_role;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Next steps:
-- 1. Verify all users have roles assigned in user_roles table
-- 2. Test the permission system
-- 3. Once verified, uncomment and run the ALTER TABLE command above to remove the role column
-- 4. Update your application code to use the new permission system

