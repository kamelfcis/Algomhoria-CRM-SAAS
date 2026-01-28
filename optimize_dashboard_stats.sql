-- Optional: Create a materialized view for dashboard stats
-- This can significantly improve performance for large datasets
-- Run this in Supabase SQL Editor if you want even better performance

-- Create materialized view for dashboard statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats_cache AS
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
  (SELECT COUNT(*) FROM posts) as total_posts,
  (SELECT COUNT(*) FROM posts WHERE status = 'active') as active_posts,
  (SELECT COUNT(*) FROM properties) as total_properties,
  (SELECT COUNT(*) FROM properties WHERE status = 'active') as active_properties,
  (SELECT COUNT(*) FROM properties WHERE status = 'pending') as pending_properties,
  (SELECT COUNT(*) FROM categories) as total_categories,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(*) FROM property_bookings) as total_bookings,
  (SELECT COUNT(*) FROM newsletter_subscribers) as total_newsletter,
  (SELECT COUNT(*) FROM property_comments) as total_comments,
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM areas) as total_areas,
  NOW() as last_updated;

-- Create index on the materialized view (if needed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_cache_unique ON dashboard_stats_cache(last_updated);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_stats_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats_cache;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON dashboard_stats_cache TO authenticated;
GRANT SELECT ON dashboard_stats_cache TO anon;

-- Note: You can set up a cron job or scheduled function to refresh this view periodically
-- For example, refresh every 5 minutes:
-- SELECT cron.schedule('refresh-dashboard-stats', '*/5 * * * *', 'SELECT refresh_dashboard_stats_cache()');

-- To use this view in your application, you would query it like:
-- SELECT * FROM dashboard_stats_cache;

