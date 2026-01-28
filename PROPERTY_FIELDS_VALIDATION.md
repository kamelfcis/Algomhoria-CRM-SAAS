# Property Fields Validation Guide

## Required Fields (NOT NULL in database)

Based on the database schema, the following fields are **MANDATORY**:

1. **title_ar** (Title Arabic) - `NOT NULL`
   - Must be filled
   - Shows red border if empty on submit
   - Label shows red asterisk (*)

2. **title_en** (Title English) - `NOT NULL`
   - Must be filled
   - Shows red border if empty on submit
   - Label shows red asterisk (*)

3. **status** - `NOT NULL` with default `'pending'`
   - Has default value, so always filled
   - No validation needed from user

4. **is_featured** - `NOT NULL` with default `false`
   - Has default value, so always filled
   - No validation needed from user

5. **is_rented** - `NOT NULL` with default `false`
   - Has default value, so always filled
   - No validation needed from user

6. **is_sold** - `NOT NULL` with default `false`
   - Has default value, so always filled
   - No validation needed from user

## Optional Fields (NULL in database)

All other fields are **OPTIONAL** and can be left empty:

- code (auto-generated)
- old_code
- description_ar
- description_en
- address_ar
- address_en
- governorate_id
- area_id
- street_id
- location_text
- latitude
- longitude
- owner_id
- section_id
- property_type_id
- price
- daily_rent_pricing
- sale_price
- rent_price
- payment_method_id
- size
- baths
- floor_no
- view_type_id
- finishing_type_id
- phone_number
- expired_at
- created_by (auto-set)
- created_at (auto-set)
- updated_at (auto-set)

## Validation Behavior

- When user clicks "Save", the form validates all required fields
- Empty required fields show:
  - Red border (border-2 border-destructive)
  - Error message below the field
  - Form scrolls to first error field
  - Form submission is prevented until all required fields are filled

## Visual Indicators

- Required fields show a red asterisk (*) next to the label
- Optional fields have no asterisk
- Error fields have red borders and error messages

