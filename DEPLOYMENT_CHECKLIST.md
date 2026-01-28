# Performance Optimization Deployment Checklist

## Pre-Deployment

### 1. Database Indexes
- [ ] Run `add_performance_indexes.sql` in Supabase SQL Editor
- [ ] Verify indexes were created successfully
- [ ] Monitor query performance after index creation

**Command**:
```sql
-- Copy and paste contents of add_performance_indexes.sql
-- Run in Supabase Dashboard → SQL Editor
```

### 2. Verify Code Changes
- [ ] All files have been updated with caching
- [ ] Rate limiting is applied to API routes
- [ ] Image optimization is configured
- [ ] Query limits are in place

### 3. Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (for admin operations)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (if using maps)

### 4. Build and Test
- [ ] Run `npm run build` successfully
- [ ] Test all major features
- [ ] Verify rate limiting works
- [ ] Check image loading performance

## Deployment Steps

### Step 1: Apply Database Indexes
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `add_performance_indexes.sql`
4. Paste and run
5. Verify no errors

### Step 2: Build Application
```bash
npm run build
```

### Step 3: Deploy
Follow your deployment method (IIS, Vercel, etc.)

### Step 4: Verify
- [ ] Dashboard loads quickly
- [ ] API routes respond within rate limits
- [ ] Images load with optimization
- [ ] No console errors

## Post-Deployment Monitoring

### 1. Monitor Database Performance
- Check Supabase Dashboard → Database → Query Performance
- Look for slow queries (>1000ms)
- Verify indexes are being used

### 2. Monitor API Performance
- Check response times
- Monitor 429 (rate limit) responses
- Track error rates

### 3. Monitor User Experience
- Page load times
- Image loading performance
- Overall system responsiveness

## Performance Benchmarks

### Expected Metrics After Deployment

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Page Load Time | < 1.5s | Browser DevTools |
| API Response Time | < 200ms | Network tab |
| Database Query Time | < 100ms | Supabase Dashboard |
| Image Load Time | < 500ms | Network tab |
| Concurrent Users | 75-100 | Load testing |

## Troubleshooting

### Issue: Slow Queries
- **Check**: Are indexes applied?
- **Solution**: Run `add_performance_indexes.sql` again
- **Verify**: Check Supabase query performance dashboard

### Issue: Rate Limiting Too Strict
- **Check**: `lib/utils/rate-limit.ts` presets
- **Solution**: Adjust limits in `rateLimitPresets`
- **Note**: For production, consider Redis-based rate limiting

### Issue: Images Not Loading
- **Check**: `next.config.js` image configuration
- **Verify**: Supabase storage URLs are in `remotePatterns`
- **Solution**: Add domain to `remotePatterns` if needed

### Issue: Caching Not Working
- **Check**: Browser DevTools → Network tab
- **Verify**: `staleTime` and `gcTime` are set correctly
- **Solution**: Clear browser cache and test again

## Rollback Plan

If issues occur after deployment:

1. **Database Indexes**: Can be dropped individually if causing issues
   ```sql
   DROP INDEX IF EXISTS idx_properties_status_created_at;
   -- etc.
   ```

2. **Code Changes**: Revert to previous git commit
   ```bash
   git revert <commit-hash>
   ```

3. **Rate Limiting**: Can be disabled by removing rate limit checks from API routes

## Success Criteria

✅ Dashboard loads in < 1.5 seconds  
✅ API responses in < 200ms  
✅ No 429 errors under normal usage  
✅ Images load with optimization  
✅ System handles 50+ concurrent users  
✅ Database queries use indexes  

## Next Steps (Optional)

After successful deployment:
1. Monitor performance for 1 week
2. Collect metrics and identify bottlenecks
3. Consider server-side pagination if datasets grow
4. Upgrade to Redis-based rate limiting for multi-instance
5. Implement CDN for global distribution

