-- =====================================================
-- Insert All Permissions for All Pages in the System
-- =====================================================
-- This script inserts comprehensive permissions for all dashboard pages
-- Run this after the main migration script

-- =====================================================
-- Dashboard Permissions
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('dashboard:view', 'View dashboard', 'عرض لوحة التحكم', 'dashboard', 'view')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Users Permissions
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('users:view', 'View users', 'عرض المستخدمين', 'users', 'view'),
  ('users:create', 'Create users', 'إنشاء مستخدمين', 'users', 'create'),
  ('users:update', 'Update users', 'تحديث المستخدمين', 'users', 'update'),
  ('users:delete', 'Delete users', 'حذف المستخدمين', 'users', 'delete')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Roles & Permissions Management
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('roles:view', 'View roles', 'عرض الأدوار', 'roles', 'view'),
  ('roles:create', 'Create roles', 'إنشاء أدوار', 'roles', 'create'),
  ('roles:update', 'Update roles', 'تحديث الأدوار', 'roles', 'update'),
  ('roles:delete', 'Delete roles', 'حذف الأدوار', 'roles', 'delete'),
  ('roles:assign', 'Assign roles to users', 'تعيين الأدوار للمستخدمين', 'roles', 'assign'),
  ('permissions:view', 'View permissions', 'عرض الصلاحيات', 'permissions', 'view'),
  ('permissions:create', 'Create permissions', 'إنشاء صلاحيات', 'permissions', 'create'),
  ('permissions:update', 'Update permissions', 'تحديث الصلاحيات', 'permissions', 'update'),
  ('permissions:delete', 'Delete permissions', 'حذف الصلاحيات', 'permissions', 'delete')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- News & Posts Permissions
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('posts:view', 'View posts', 'عرض المقالات', 'posts', 'view'),
  ('posts:create', 'Create posts', 'إنشاء مقالات', 'posts', 'create'),
  ('posts:update', 'Update posts', 'تحديث المقالات', 'posts', 'update'),
  ('posts:delete', 'Delete posts', 'حذف المقالات', 'posts', 'delete'),
  ('posts:publish', 'Publish posts', 'نشر المقالات', 'posts', 'publish'),
  ('post_gallery:view', 'View post gallery', 'عرض معرض المقالات', 'post_gallery', 'view'),
  ('post_gallery:create', 'Create post gallery items', 'إنشاء عناصر معرض المقالات', 'post_gallery', 'create'),
  ('post_gallery:update', 'Update post gallery items', 'تحديث عناصر معرض المقالات', 'post_gallery', 'update'),
  ('post_gallery:delete', 'Delete post gallery items', 'حذف عناصر معرض المقالات', 'post_gallery', 'delete'),
  ('categories:view', 'View categories', 'عرض الفئات', 'categories', 'view'),
  ('categories:create', 'Create categories', 'إنشاء فئات', 'categories', 'create'),
  ('categories:update', 'Update categories', 'تحديث الفئات', 'categories', 'update'),
  ('categories:delete', 'Delete categories', 'حذف الفئات', 'categories', 'delete')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Properties Permissions
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('properties:view', 'View properties', 'عرض العقارات', 'properties', 'view'),
  ('properties:create', 'Create properties', 'إنشاء عقارات', 'properties', 'create'),
  ('properties:update', 'Update properties', 'تحديث العقارات', 'properties', 'update'),
  ('properties:delete', 'Delete properties', 'حذف العقارات', 'properties', 'delete'),
  ('property_owners:view', 'View property owners', 'عرض أصحاب العقارات', 'property_owners', 'view'),
  ('property_owners:create', 'Create property owners', 'إنشاء أصحاب عقارات', 'property_owners', 'create'),
  ('property_owners:update', 'Update property owners', 'تحديث أصحاب العقارات', 'property_owners', 'update'),
  ('property_owners:delete', 'Delete property owners', 'حذف أصحاب العقارات', 'property_owners', 'delete'),
  ('property_images:view', 'View property images', 'عرض صور العقارات', 'property_images', 'view'),
  ('property_images:create', 'Create property images', 'إنشاء صور عقارات', 'property_images', 'create'),
  ('property_images:update', 'Update property images', 'تحديث صور العقارات', 'property_images', 'update'),
  ('property_images:delete', 'Delete property images', 'حذف صور العقارات', 'property_images', 'delete'),
  ('property_comments:view', 'View property comments', 'عرض تعليقات العقارات', 'property_comments', 'view'),
  ('property_comments:create', 'Create property comments', 'إنشاء تعليقات عقارات', 'property_comments', 'create'),
  ('property_comments:update', 'Update property comments', 'تحديث تعليقات العقارات', 'property_comments', 'update'),
  ('property_comments:delete', 'Delete property comments', 'حذف تعليقات العقارات', 'property_comments', 'delete'),
  ('bookings:view', 'View bookings', 'عرض الحجوزات', 'bookings', 'view'),
  ('bookings:create', 'Create bookings', 'إنشاء حجوزات', 'bookings', 'create'),
  ('bookings:update', 'Update bookings', 'تحديث الحجوزات', 'bookings', 'update'),
  ('bookings:delete', 'Delete bookings', 'حذف الحجوزات', 'bookings', 'delete')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Master Data Permissions
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('property_types:view', 'View property types', 'عرض أنواع العقارات', 'property_types', 'view'),
  ('property_types:create', 'Create property types', 'إنشاء أنواع عقارات', 'property_types', 'create'),
  ('property_types:update', 'Update property types', 'تحديث أنواع العقارات', 'property_types', 'update'),
  ('property_types:delete', 'Delete property types', 'حذف أنواع العقارات', 'property_types', 'delete'),
  ('property_facilities:view', 'View property facilities', 'عرض مرافق العقارات', 'property_facilities', 'view'),
  ('property_facilities:create', 'Create property facilities', 'إنشاء مرافق عقارات', 'property_facilities', 'create'),
  ('property_facilities:update', 'Update property facilities', 'تحديث مرافق العقارات', 'property_facilities', 'update'),
  ('property_facilities:delete', 'Delete property facilities', 'حذف مرافق العقارات', 'property_facilities', 'delete'),
  ('property_services:view', 'View property services', 'عرض خدمات العقارات', 'property_services', 'view'),
  ('property_services:create', 'Create property services', 'إنشاء خدمات عقارات', 'property_services', 'create'),
  ('property_services:update', 'Update property services', 'تحديث خدمات العقارات', 'property_services', 'update'),
  ('property_services:delete', 'Delete property services', 'حذف خدمات العقارات', 'property_services', 'delete'),
  ('property_view_types:view', 'View property view types', 'عرض أنواع الإطلالات', 'property_view_types', 'view'),
  ('property_view_types:create', 'Create property view types', 'إنشاء أنواع إطلالات', 'property_view_types', 'create'),
  ('property_view_types:update', 'Update property view types', 'تحديث أنواع الإطلالات', 'property_view_types', 'update'),
  ('property_view_types:delete', 'Delete property view types', 'حذف أنواع الإطلالات', 'property_view_types', 'delete'),
  ('property_finishing_types:view', 'View property finishing types', 'عرض أنواع التشطيبات', 'property_finishing_types', 'view'),
  ('property_finishing_types:create', 'Create property finishing types', 'إنشاء أنواع تشطيبات', 'property_finishing_types', 'create'),
  ('property_finishing_types:update', 'Update property finishing types', 'تحديث أنواع التشطيبات', 'property_finishing_types', 'update'),
  ('property_finishing_types:delete', 'Delete property finishing types', 'حذف أنواع التشطيبات', 'property_finishing_types', 'delete'),
  ('payment_methods:view', 'View payment methods', 'عرض طرق الدفع', 'payment_methods', 'view'),
  ('payment_methods:create', 'Create payment methods', 'إنشاء طرق دفع', 'payment_methods', 'create'),
  ('payment_methods:update', 'Update payment methods', 'تحديث طرق الدفع', 'payment_methods', 'update'),
  ('payment_methods:delete', 'Delete payment methods', 'حذف طرق الدفع', 'payment_methods', 'delete'),
  ('governorates:view', 'View governorates', 'عرض المحافظات', 'governorates', 'view'),
  ('governorates:create', 'Create governorates', 'إنشاء محافظات', 'governorates', 'create'),
  ('governorates:update', 'Update governorates', 'تحديث المحافظات', 'governorates', 'update'),
  ('governorates:delete', 'Delete governorates', 'حذف المحافظات', 'governorates', 'delete'),
  ('areas:view', 'View areas', 'عرض المناطق', 'areas', 'view'),
  ('areas:create', 'Create areas', 'إنشاء مناطق', 'areas', 'create'),
  ('areas:update', 'Update areas', 'تحديث المناطق', 'areas', 'update'),
  ('areas:delete', 'Delete areas', 'حذف المناطق', 'areas', 'delete'),
  ('streets:view', 'View streets', 'عرض الشوارع', 'streets', 'view'),
  ('streets:create', 'Create streets', 'إنشاء شوارع', 'streets', 'create'),
  ('streets:update', 'Update streets', 'تحديث الشوارع', 'streets', 'update'),
  ('streets:delete', 'Delete streets', 'حذف الشوارع', 'streets', 'delete'),
  ('sections:view', 'View sections', 'عرض الأقسام', 'sections', 'view'),
  ('sections:create', 'Create sections', 'إنشاء أقسام', 'sections', 'create'),
  ('sections:update', 'Update sections', 'تحديث الأقسام', 'sections', 'update'),
  ('sections:delete', 'Delete sections', 'حذف الأقسام', 'sections', 'delete')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Projects Permissions
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('projects:view', 'View projects', 'عرض المشاريع', 'projects', 'view'),
  ('projects:create', 'Create projects', 'إنشاء مشاريع', 'projects', 'create'),
  ('projects:update', 'Update projects', 'تحديث المشاريع', 'projects', 'update'),
  ('projects:delete', 'Delete projects', 'حذف المشاريع', 'projects', 'delete'),
  ('project_categories:view', 'View project categories', 'عرض فئات المشاريع', 'project_categories', 'view'),
  ('project_categories:create', 'Create project categories', 'إنشاء فئات مشاريع', 'project_categories', 'create'),
  ('project_categories:update', 'Update project categories', 'تحديث فئات المشاريع', 'project_categories', 'update'),
  ('project_categories:delete', 'Delete project categories', 'حذف فئات المشاريع', 'project_categories', 'delete'),
  ('featured_areas:view', 'View featured areas', 'عرض المناطق المميزة', 'featured_areas', 'view'),
  ('featured_areas:create', 'Create featured areas', 'إنشاء مناطق مميزة', 'featured_areas', 'create'),
  ('featured_areas:update', 'Update featured areas', 'تحديث المناطق المميزة', 'featured_areas', 'update'),
  ('featured_areas:delete', 'Delete featured areas', 'حذف المناطق المميزة', 'featured_areas', 'delete')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Leads Permissions
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('leads:view', 'View leads', 'عرض العملاء المحتملين', 'leads', 'view'),
  ('leads:create', 'Create leads', 'إنشاء عملاء محتملين', 'leads', 'create'),
  ('leads:update', 'Update leads', 'تحديث العملاء المحتملين', 'leads', 'update'),
  ('leads:delete', 'Delete leads', 'حذف العملاء المحتملين', 'leads', 'delete'),
  ('leads:assign', 'Assign leads', 'تعيين العملاء المحتملين', 'leads', 'assign'),
  ('direct_leads:view', 'View direct leads', 'عرض العملاء المحتملين المباشرين', 'direct_leads', 'view'),
  ('direct_leads:create', 'Create direct leads', 'إنشاء عملاء محتملين مباشرين', 'direct_leads', 'create'),
  ('direct_leads:update', 'Update direct leads', 'تحديث العملاء المحتملين المباشرين', 'direct_leads', 'update'),
  ('direct_leads:delete', 'Delete direct leads', 'حذف العملاء المحتملين المباشرين', 'direct_leads', 'delete'),
  ('direct_leads:assign', 'Assign direct leads', 'تعيين العملاء المحتملين المباشرين', 'direct_leads', 'assign')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Other Features Permissions
-- =====================================================
INSERT INTO permissions (name, description, description_ar, resource, action) VALUES
  ('sliders:view', 'View sliders', 'عرض الشرائح', 'sliders', 'view'),
  ('sliders:create', 'Create sliders', 'إنشاء شرائح', 'sliders', 'create'),
  ('sliders:update', 'Update sliders', 'تحديث الشرائح', 'sliders', 'update'),
  ('sliders:delete', 'Delete sliders', 'حذف الشرائح', 'sliders', 'delete'),
  ('team_users:view', 'View team users', 'عرض أعضاء الفريق', 'team_users', 'view'),
  ('team_users:create', 'Create team users', 'إنشاء أعضاء فريق', 'team_users', 'create'),
  ('team_users:update', 'Update team users', 'تحديث أعضاء الفريق', 'team_users', 'update'),
  ('team_users:delete', 'Delete team users', 'حذف أعضاء الفريق', 'team_users', 'delete'),
  ('newsletter:view', 'View newsletter subscribers', 'عرض مشتركي النشرة الإخبارية', 'newsletter', 'view'),
  ('newsletter:create', 'Create newsletter subscribers', 'إنشاء مشتركي نشرة إخبارية', 'newsletter', 'create'),
  ('newsletter:update', 'Update newsletter subscribers', 'تحديث مشتركي النشرة الإخبارية', 'newsletter', 'update'),
  ('newsletter:delete', 'Delete newsletter subscribers', 'حذف مشتركي النشرة الإخبارية', 'newsletter', 'delete'),
  ('newsletter:export', 'Export newsletter subscribers', 'تصدير مشتركي النشرة الإخبارية', 'newsletter', 'export'),
  ('settings:view', 'View settings', 'عرض الإعدادات', 'settings', 'view'),
  ('settings:update', 'Update settings', 'تحديث الإعدادات', 'settings', 'update'),
  ('activity_logs:view', 'View activity logs', 'عرض سجل الأنشطة', 'activity_logs', 'view'),
  ('activity_logs:export', 'Export activity logs', 'تصدير سجل الأنشطة', 'activity_logs', 'export')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Update Admin Role with All Permissions
-- =====================================================
-- Assign all permissions to admin role
DO $$
DECLARE
  admin_role_id UUID;
  perm RECORD;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  IF admin_role_id IS NOT NULL THEN
    -- Remove existing permissions (in case we're re-running)
    DELETE FROM role_permissions WHERE role_id = admin_role_id;
    
    -- Insert all permissions
    FOR perm IN SELECT id FROM permissions LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (admin_role_id, perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- Summary
-- =====================================================
-- This script has inserted permissions for:
-- ✅ Dashboard (1 permission)
-- ✅ Users (4 permissions)
-- ✅ Roles & Permissions (9 permissions)
-- ✅ News & Posts (12 permissions)
-- ✅ Properties (20 permissions)
-- ✅ Master Data (44 permissions)
-- ✅ Projects (12 permissions)
-- ✅ Leads (10 permissions)
-- ✅ Other Features (17 permissions)
-- 
-- Total: ~129 permissions
-- All permissions have been assigned to the admin role

