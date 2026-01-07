# Script to update all dashboard pages to use RBAC permissions
# This script adds the usePermissions hook import and replaces old permission checks

$files = @(
    "app\dashboard\properties\page.tsx",
    "app\dashboard\leads\page.tsx",
    "app\dashboard\direct-leads\page.tsx",
    "app\dashboard\governorates\page.tsx",
    "app\dashboard\streets\page.tsx",
    "app\dashboard\sections\page.tsx",
    "app\dashboard\property-types\page.tsx",
    "app\dashboard\property-services\page.tsx",
    "app\dashboard\property-facilities\page.tsx",
    "app\dashboard\property-finishing-types\page.tsx",
    "app\dashboard\property-view-types\page.tsx",
    "app\dashboard\property-owners\page.tsx",
    "app\dashboard\property-images\page.tsx",
    "app\dashboard\property-comments\page.tsx",
    "app\dashboard\projects\page.tsx",
    "app\dashboard\project-categories\page.tsx",
    "app\dashboard\newsletter\page.tsx",
    "app\dashboard\sliders\page.tsx",
    "app\dashboard\team-users\page.tsx",
    "app\dashboard\post-gallery\page.tsx",
    "app\dashboard\featured-areas\page.tsx",
    "app\dashboard\bookings\page.tsx",
    "app\dashboard\payment-methods\page.tsx",
    "app\dashboard\settings\page.tsx",
    "app\dashboard\activity-logs\page.tsx"
)

$resourceMap = @{
    "properties" = "properties"
    "leads" = "leads"
    "direct-leads" = "direct_leads"
    "governorates" = "governorates"
    "streets" = "streets"
    "sections" = "sections"
    "property-types" = "property_types"
    "property-services" = "property_services"
    "property-facilities" = "property_facilities"
    "property-finishing-types" = "property_finishing_types"
    "property-view-types" = "property_view_types"
    "property-owners" = "property_owners"
    "property-images" = "property_images"
    "property-comments" = "property_comments"
    "projects" = "projects"
    "project-categories" = "project_categories"
    "newsletter" = "newsletter"
    "sliders" = "sliders"
    "team-users" = "team_users"
    "post-gallery" = "post_gallery"
    "featured-areas" = "featured_areas"
    "bookings" = "bookings"
    "payment-methods" = "payment_methods"
    "settings" = "settings"
    "activity-logs" = "activity_logs"
}

Write-Host "This script will help identify files that need updating. Please review and update manually for safety." -ForegroundColor Yellow


