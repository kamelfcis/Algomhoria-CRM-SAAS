-- Performance Optimization: Add Composite Indexes
-- This migration adds composite indexes for frequently used query patterns
-- These indexes significantly improve query performance for filtered and sorted queries

-- Properties: Status + Created At (most common filter/sort combination)
CREATE INDEX IF NOT EXISTS idx_properties_status_created_at 
ON properties(status, created_at DESC);

-- Properties: Status + Updated At (for recently updated properties)
CREATE INDEX IF NOT EXISTS idx_properties_status_updated_at 
ON properties(status, updated_at DESC);

-- Properties: Is Featured + Status + Created At (for featured properties listing)
CREATE INDEX IF NOT EXISTS idx_properties_featured_status_created 
ON properties(is_featured, status, created_at DESC) 
WHERE is_featured = true;

-- Properties: Is Rented + Rental End Date (for rental expiry queries)
CREATE INDEX IF NOT EXISTS idx_properties_rented_end_date 
ON properties(is_rented, rental_end_date) 
WHERE is_rented = true AND rental_end_date IS NOT NULL;

-- Leads: Status + Created At (most common filter/sort combination)
CREATE INDEX IF NOT EXISTS idx_leads_status_created_at 
ON leads(status, created_at DESC);

-- Leads: Assigned To + Status + Created At (for assigned leads queries)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status_created 
ON leads(assigned_to, status, created_at DESC) 
WHERE assigned_to IS NOT NULL;

-- Direct Leads: Status + Created At (most common filter/sort combination)
CREATE INDEX IF NOT EXISTS idx_direct_leads_status_created_at 
ON direct_leads(status, created_at DESC);

-- Direct Leads: Assigned To + Status + Created At (for assigned leads queries)
CREATE INDEX IF NOT EXISTS idx_direct_leads_assigned_status_created 
ON direct_leads(assigned_to, status, created_at DESC) 
WHERE assigned_to IS NOT NULL;

-- Lead Activities: Follow Up Date + Lead ID (for follow-up queries)
CREATE INDEX IF NOT EXISTS idx_lead_activities_followup_lead 
ON lead_activities(follow_up_date, lead_id) 
WHERE follow_up_date IS NOT NULL AND lead_id IS NOT NULL;

-- Lead Activities: Follow Up Date + Direct Lead ID (for follow-up queries)
CREATE INDEX IF NOT EXISTS idx_lead_activities_followup_direct_lead 
ON lead_activities(follow_up_date, direct_lead_id) 
WHERE follow_up_date IS NOT NULL AND direct_lead_id IS NOT NULL;

-- Lead Activities: Lead ID + Created At (for activity listing)
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created 
ON lead_activities(lead_id, created_at DESC) 
WHERE lead_id IS NOT NULL;

-- Lead Activities: Direct Lead ID + Created At (for activity listing)
CREATE INDEX IF NOT EXISTS idx_lead_activities_direct_lead_created 
ON lead_activities(direct_lead_id, created_at DESC) 
WHERE direct_lead_id IS NOT NULL;

-- Posts: Status + Created At (most common filter/sort combination)
CREATE INDEX IF NOT EXISTS idx_posts_status_created_at 
ON posts(status, created_at DESC);

-- Posts: Status + Published At (for published posts)
CREATE INDEX IF NOT EXISTS idx_posts_status_published_at 
ON posts(status, published_at DESC) 
WHERE published_at IS NOT NULL;

-- Property Owners: Status + Created At
CREATE INDEX IF NOT EXISTS idx_property_owners_status_created_at 
ON property_owners(status, created_at DESC);

-- Users: Status + Created At
CREATE INDEX IF NOT EXISTS idx_users_status_created_at 
ON users(status, created_at DESC);

-- Users: Role + Status (for role-based queries)
CREATE INDEX IF NOT EXISTS idx_users_role_status 
ON users(role, status);

-- Property Bookings: Status + Created At
CREATE INDEX IF NOT EXISTS idx_property_bookings_status_created_at 
ON property_bookings(status, created_at DESC);

-- Property Bookings: Property ID + Status + Booking Dates (for property booking queries)
CREATE INDEX IF NOT EXISTS idx_property_bookings_property_status_dates 
ON property_bookings(property_id, status, booking_from_date, booking_to_date);

-- Activity Logs: Created At (already has limit, but index helps with sorting)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc 
ON activity_logs(created_at DESC);

-- Categories: Status + Order Index (for ordered category listings)
CREATE INDEX IF NOT EXISTS idx_categories_status_order 
ON categories(status, order_index) 
WHERE status = 'active';

-- Property Types: Status (for active property types)
CREATE INDEX IF NOT EXISTS idx_property_types_status 
ON property_types(status);

-- Sections: Status + Name (for ordered section listings)
CREATE INDEX IF NOT EXISTS idx_sections_status_name 
ON sections(status, name_en) 
WHERE status = 'active';

-- Governorates: Status + Order (for ordered listings)
CREATE INDEX IF NOT EXISTS idx_governorates_status_order 
ON governorates(status, order_index) 
WHERE status = 'active';

-- Areas: Governorate + Status + Order (for filtered ordered listings)
CREATE INDEX IF NOT EXISTS idx_areas_governorate_status_order 
ON areas(governorate_id, status, order_index) 
WHERE status = 'active';

-- Streets: Area + Status + Order (for filtered ordered listings)
CREATE INDEX IF NOT EXISTS idx_streets_area_status_order 
ON streets(area_id, status, order_index) 
WHERE status = 'active';

-- User Roles: User ID + Role ID (for permission queries)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON user_roles(user_id, role_id);

-- Role Permissions: Role ID + Permission ID (for permission queries)
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_permission 
ON role_permissions(role_id, permission_id);

-- Property Images: Property ID + Order Index + Is Primary (for ordered image queries)
CREATE INDEX IF NOT EXISTS idx_property_images_property_order_primary 
ON property_images(property_id, order_index, is_primary);

-- Newsletter Subscribers: Status + Created At
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status_created_at 
ON newsletter_subscribers(status, created_at DESC);

-- Projects: Status + Order + Created At
CREATE INDEX IF NOT EXISTS idx_projects_status_order_created 
ON projects(status, order_index, created_at DESC) 
WHERE status = 'active';

-- Project Categories: Status + Order
CREATE INDEX IF NOT EXISTS idx_project_categories_status_order 
ON project_categories(status, order_index) 
WHERE status = 'active';

-- Comments: Property ID + Status + Created At
CREATE INDEX IF NOT EXISTS idx_property_comments_property_status_created 
ON property_comments(property_id, status, created_at DESC);

-- Analyze tables after creating indexes for query planner optimization
ANALYZE properties;
ANALYZE leads;
ANALYZE direct_leads;
ANALYZE lead_activities;
ANALYZE posts;
ANALYZE property_owners;
ANALYZE users;
ANALYZE property_bookings;
ANALYZE activity_logs;

