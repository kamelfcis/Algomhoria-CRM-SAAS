#!/bin/bash
# Script to update all dashboard pages to use RBAC permissions
# This is a helper script - manual review recommended

echo "Updating all dashboard pages to use RBAC permissions..."
echo "Please review changes before committing."

# Resource mapping for each page
declare -A resource_map=(
    ["streets"]="streets"
    ["sections"]="sections"
    ["property-view-types"]="property_view_types"
    ["property-types"]="property_types"
    ["property-services"]="property_services"
    ["property-owners"]="property_owners"
    ["property-finishing-types"]="property_finishing_types"
    ["property-facilities"]="property_facilities"
    ["projects"]="projects"
    ["payment-methods"]="payment_methods"
    ["team-users"]="team_users"
    ["sliders"]="sliders"
    ["property-images"]="property_images"
    ["property-comments"]="property_comments"
    ["project-categories"]="project_categories"
    ["post-gallery"]="post_gallery"
    ["newsletter"]="newsletter"
    ["featured-areas"]="featured_areas"
    ["bookings"]="bookings"
    ["settings"]="settings"
    ["activity-logs"]="activity_logs"
)

echo "Resource mapping created. Update files manually for safety."


