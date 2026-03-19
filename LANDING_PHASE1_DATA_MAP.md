# Landing Phase 1 - Database Map and Relationships

This document defines the live database contract for the customer landing pages, based on the linked Supabase project schema.

## Phase 1 Outcome

- Supabase CLI login is active.
- Local project is linked to remote project `cyqgssqvxxjnrqncxtea`.
- Live schema was introspected using:
  - `npx supabase gen types typescript --linked --schema public`
- Note: `supabase db pull` currently fails on this machine because Docker Desktop is not available; this does not block landing implementation.

## Core Landing Tables (Public Website)

### 1) `sliders`
- Purpose: hero carousel content.
- Key fields:
  - `title_ar`, `title_en`
  - `description_ar`, `description_en`
  - `image_url`, `link_url`
  - `order_index`, `status`
- Landing usage:
  - Home hero slides.
  - CTA link target from `link_url`.

### 2) `project_categories`
- Purpose: project category navigation (residential/commercial/etc).
- Key fields:
  - `title_ar`, `title_en`
  - `image_url`
  - `order_index`, `status`

### 3) `projects`
- Purpose: projects browsing and project cards/details.
- Key fields:
  - `title_ar`, `title_en`
  - `description_ar`, `description_en`
  - `category_id` -> `project_categories.id`
  - `governorate_id` -> `governorates.id`
  - `area_id` -> `areas.id`
  - `project_type`, `status`, `order_index`
  - `image_url`, `images` (json), `youtube_videos` (json)
  - `address`, `location_text`, `latitude`, `longitude`
  - `metadata` (json)

### 4) `governorates` and 5) `areas`
- Purpose: location filters and location display.
- Relationships:
  - `areas.governorate_id` -> `governorates.id`
- Key fields:
  - bilingual names: `name_ar`, `name_en`
  - `order_index`, `status`

### 6) `featured_areas`
- Purpose: homepage featured locations, optional ordered projects per location.
- Relationships:
  - `featured_areas.governorate_id` -> `governorates.id`
  - `featured_areas.area_id` -> `areas.id`
- Key fields:
  - `projects_order` (json array of project ids)
  - `order_index`, `status`

### 7) `properties`
- Purpose: property listing cards + detail pages.
- Relationships:
  - `properties.governorate_id` -> `governorates.id`
  - `properties.area_id` -> `areas.id`
  - `properties.street_id` -> `streets.id`
  - `properties.property_type_id` -> `property_types.id`
  - `properties.owner_id` -> `property_owners.id`
  - `properties.section_id` -> `sections.id`
  - `properties.payment_method_id` -> `payment_methods.id`
  - `properties.view_type_id` -> `property_view_types.id`
  - `properties.finishing_type_id` -> `property_finishing_types.id`
- Key business fields:
  - `title_ar`, `title_en`
  - `description_ar`, `description_en`
  - `address_ar`, `address_en`, `location_text`, `latitude`, `longitude`
  - pricing: `price`, `sale_price`, `rent_price`, `daily_rent_pricing`
  - flags: `is_featured`, `is_rented`, `is_sold`
  - rental: `rental_period`, `rental_end_date`
  - listing status: `status`

### 8) `property_images`
- Purpose: property card/detail galleries.
- Relationship:
  - `property_images.property_id` -> `properties.id`
- Key fields:
  - `image_url`, `is_primary`, `order_index`
  - `alt_text_ar`, `alt_text_en`

### 9) `property_bookings`
- Purpose: customer reservation flow.
- Relationship:
  - `property_bookings.property_id` -> `properties.id`
- Key fields:
  - customer: `customer_name`, `customer_email`, `customer_phone`
  - booking: `booking_from_date`, `booking_to_date`
  - `status`, `total_price`

### 10) `categories` and 11) `posts`
- Purpose: blog/news section on landing.
- Relationship:
  - `posts.category_id` -> `categories.id`
- Key fields in `posts`:
  - `title_ar`, `title_en`
  - `content_ar`, `content_en`
  - `thumbnail_url`, `cover_url`
  - `status`, `is_featured`, `is_breaking_news`, `published_at`

### 12) `team_users`
- Purpose: team page section.
- Key fields:
  - `name`, `name_ar`
  - `position`, `poition_ar` (schema uses `poition_ar`)
  - `image_url`, `order_index`, `status`

### 13) `settings`
- Purpose: dynamic site identity and footer/header contact/social details.
- Key fields:
  - `key`
  - `value`
  - `value_json`
  - `logo_url`

## Relationship Graph for Landing

- `project_categories` 1 -> many `projects`
- `governorates` 1 -> many `areas`
- `governorates` 1 -> many `projects` (optional relation)
- `areas` 1 -> many `projects` (optional relation)
- `governorates` + `areas` -> many `featured_areas`
- `properties` 1 -> many `property_images`
- `properties` 1 -> many `property_bookings`
- `categories` 1 -> many `posts`

## Landing Section -> Data Source Contract

1) Hero carousel
- Source: `sliders`
- Filter: `status = 'active'`
- Order: `order_index asc`

2) Search/filter bar
- Sources:
  - `governorates` (`status='active'`)
  - `areas` (`status='active'`)
  - `property_types` (`status='active'`)

3) Featured projects
- Sources:
  - `projects` (`status='active'`)
  - joined `project_categories`, `governorates`, `areas`
- Order: `order_index asc`

4) Featured properties
- Sources:
  - `properties` (`status='active'`)
  - `property_images` primary image
  - joined location/type tables
- Priority sort:
  - `is_featured desc`, then latest or `updated_at desc`

5) Featured areas
- Sources:
  - `featured_areas` (`status='active'`)
  - joined `governorates` and `areas`
  - optional project ids from `projects_order`

6) Reservation / booking
- Read source: selected `properties` record
- Write target: `property_bookings`
- Insert defaults:
  - `status = 'pending'`
  - `total_price` calculated or left default depending on business rule

7) Blog/news strip
- Sources:
  - `posts` (`status='active'`)
  - joined `categories`
- Sort:
  - `published_at desc` (fallback `created_at desc`)

8) Team section
- Source: `team_users`
- Filter: `status='active'`
- Order: `order_index asc`

9) Footer/header dynamic settings
- Source: `settings`
- Resolve by `key`.

## Locale and Translation Rules

- Text priority by locale:
  - Arabic: use `*_ar`
  - English: use `*_en`
- Fallback rule:
  - If requested locale value is null/empty, fallback to the other language.
- UI labels and static copy:
  - from `messages/ar.json` and `messages/en.json` under a new `landing` namespace.

## Business Rules to Enforce in Phase 2

- Public pages only show active content (`status='active'`) unless explicitly needed.
- Exclude sold/rented properties when browsing sale/rent inventory as configured by filter mode.
- Booking validation:
  - require property id, customer fields, valid date range.
- Use server-side fetching for landing page sections.
- Keep all section ordering from `order_index` for business control from dashboard.

## Gaps/Notes Identified

- `projects` currently uses both `image_url` and `images` json; frontend should normalize consistently.
- `team_users` Arabic position column is named `poition_ar` in schema (typo in DB); code must map safely.
- For precise live RLS policy verification, we can run SQL inspection from dashboard or via a direct DB client; CLI schema types do not include policy definitions.

## Next Step (Phase 2 Build)

- Create `lib/landing/queries.ts` with typed fetchers for all sections above.
- Convert `app/(landing)/page.tsx` from hardcoded to DB-backed server data.
- Add booking submit endpoint/action writing into `property_bookings`.
- Add full bilingual landing keys in `messages/en.json` and `messages/ar.json`.
