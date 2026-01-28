# Check Expired Rentals Edge Function

This Supabase Edge Function automatically checks and updates properties where the rental period has expired.

## What It Does

- Calls the `update_expired_rentals()` database function
- Updates properties where `is_rented = true` and `rental_end_date < NOW()`
- Sets `is_rented = false` for expired rentals
- Returns count of updated properties and their IDs

## Deployment

### Using Supabase CLI

```bash
# Deploy the function
supabase functions deploy check-expired-rentals

# With environment variables (if needed)
supabase functions deploy check-expired-rentals --env-file .env.local
```

### Using Supabase Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create a new function"
3. Name: `check-expired-rentals`
4. Copy the code from `index.ts`
5. Click "Deploy"

## Setting Up Schedule

**Important**: Many Supabase projects don't have "Scheduled Functions" in the dashboard. Use the CLI method instead.

### Method 1: Using CLI (Guaranteed - Works for All Projects)

The schedule is configured in `supabase/config.toml`:

```toml
[functions.check-expired-rentals]
schedule = "0 22 * * *"  # Daily at 10 PM UTC (midnight Cairo time, UTC+2)
```

After deploying, the schedule is automatically active. Verify with:
```bash
supabase functions list
```

You should see: `check-expired-rentals    scheduled: 0 22 * * *`

### Method 2: Using Dashboard (If Available)

**Note**: This only works if your project has "Scheduled Functions" in the dashboard. Many projects don't have this feature.

1. Go to Supabase Dashboard → Database → Scheduled Functions
2. If available, click "Create a new scheduled function"
3. Select `check-expired-rentals`
4. Set schedule (e.g., `0 22 * * *` for daily at 10 PM UTC)
5. Enable and save

**If you don't see "Scheduled Functions" in your dashboard, use Method 1 (CLI) instead.**

## Testing

### Test via Supabase Dashboard

1. Go to Edge Functions → check-expired-rentals
2. Click "Invoke function"
3. Check the response for updated count

### Test via API

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-expired-rentals \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Environment Variables

The function automatically has access to:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for bypassing RLS)

These are automatically provided by Supabase and don't need to be set manually.

## Response Format

```json
{
  "success": true,
  "updatedCount": 5,
  "propertyIds": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"],
  "message": "Successfully updated 5 expired rental(s)",
  "timestamp": "2025-01-15T00:00:00.000Z"
}
```

## Error Handling

The function handles errors gracefully and returns:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

