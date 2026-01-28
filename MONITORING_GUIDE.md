# Performance Monitoring Guide

## Overview
This guide helps you monitor and maintain optimal performance after deploying the optimizations.

## Key Metrics to Monitor

### 1. Database Performance

#### Supabase Dashboard
1. Go to **Supabase Dashboard → Database → Query Performance**
2. Monitor:
   - Slow queries (>1000ms)
   - Most frequent queries
   - Index usage

#### Key Queries to Monitor
```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries (if query logging enabled)
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 2. API Performance

#### Rate Limiting Metrics
- Monitor 429 (Too Many Requests) responses
- Track rate limit headers in responses
- Identify IPs hitting rate limits frequently

#### Response Times
- Track average response time per endpoint
- Identify slow endpoints (>500ms)
- Monitor error rates

### 3. Frontend Performance

#### Browser DevTools
1. **Network Tab**:
   - Check image loading times
   - Verify compression (Content-Encoding: gzip)
   - Monitor API response times

2. **Performance Tab**:
   - Record page load
   - Check for long tasks
   - Identify render blocking

3. **Lighthouse**:
   - Run performance audit
   - Target: 90+ performance score
   - Check image optimization

### 4. Caching Effectiveness

#### TanStack Query Cache
- Monitor cache hit rates
- Check `staleTime` effectiveness
- Verify data freshness

#### Browser Cache
- Check cache headers
- Verify static assets are cached
- Monitor cache hit rates

## Monitoring Tools

### 1. Supabase Dashboard
- **Database → Query Performance**: Slow queries
- **Database → Indexes**: Index usage
- **API → Logs**: API request logs
- **Storage → Usage**: Storage metrics

### 2. Browser DevTools
- **Network Tab**: Request/response times
- **Performance Tab**: Page load performance
- **Application Tab**: Cache storage

### 3. Next.js Analytics (Optional)
```bash
npm install @vercel/analytics
```

### 4. Custom Monitoring (Optional)
- Set up error tracking (Sentry, LogRocket)
- Implement APM (Application Performance Monitoring)
- Use real user monitoring (RUM)

## Performance Alerts

### Set Up Alerts For:
1. **Slow Queries**: > 1000ms
2. **High Error Rate**: > 5% errors
3. **Rate Limit Hits**: > 10% of requests
4. **Slow Page Loads**: > 3 seconds
5. **High Database Load**: > 80% CPU

## Regular Maintenance

### Weekly
- [ ] Review slow queries
- [ ] Check index usage
- [ ] Monitor error rates
- [ ] Review rate limit violations

### Monthly
- [ ] Analyze query performance trends
- [ ] Review and optimize slow queries
- [ ] Check database growth
- [ ] Review caching effectiveness

### Quarterly
- [ ] Full performance audit
- [ ] Review and update indexes
- [ ] Optimize based on usage patterns
- [ ] Plan for scaling if needed

## Performance Optimization Checklist

### Database
- [ ] All indexes are being used
- [ ] No slow queries (>1000ms)
- [ ] Query limits are appropriate
- [ ] Connection pooling is configured

### API
- [ ] Rate limiting is effective
- [ ] Response times are < 200ms
- [ ] Error rates are < 1%
- [ ] Compression is working

### Frontend
- [ ] Images are optimized
- [ ] Caching is effective
- [ ] Page loads are < 1.5s
- [ ] No render blocking

## Troubleshooting Common Issues

### Issue: Slow Dashboard Load
**Check**:
1. Dashboard stats query performance
2. Follow-up leads query
3. Network tab for slow requests

**Solution**:
- Increase cache time for stats
- Optimize follow-up leads query
- Check database indexes

### Issue: High Database Load
**Check**:
1. Query performance dashboard
2. Active connections
3. Slow queries

**Solution**:
- Add missing indexes
- Optimize slow queries
- Increase query limits if needed
- Consider connection pooling

### Issue: Rate Limiting Too Aggressive
**Check**:
1. Rate limit preset values
2. 429 error frequency
3. User feedback

**Solution**:
- Adjust rate limit presets
- Use different limits per endpoint
- Consider per-user rate limiting

### Issue: Images Not Optimizing
**Check**:
1. `next.config.js` image config
2. Network tab for image requests
3. Image format (should be WebP/AVIF)

**Solution**:
- Verify remote patterns
- Check Next.js image optimization
- Ensure images are from allowed domains

## Performance Benchmarks

### Target Metrics

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Page Load | < 1s | 1-2s | > 2s |
| API Response | < 100ms | 100-300ms | > 300ms |
| Database Query | < 50ms | 50-200ms | > 200ms |
| Image Load | < 300ms | 300-600ms | > 600ms |
| Cache Hit Rate | > 80% | 60-80% | < 60% |

## Scaling Indicators

### When to Scale

1. **Database**:
   - Query times consistently > 500ms
   - Connection pool exhausted
   - High CPU usage (>80%)

2. **API**:
   - Response times > 500ms
   - High error rates (>5%)
   - Rate limits hit frequently

3. **Frontend**:
   - Page loads > 3s
   - High memory usage
   - Render blocking issues

### Scaling Options

1. **Database**: Upgrade Supabase plan
2. **API**: Add more server instances
3. **Frontend**: Implement CDN
4. **Caching**: Add Redis for distributed caching

## Best Practices

1. **Monitor Regularly**: Check metrics weekly
2. **Set Alerts**: Get notified of issues
3. **Optimize Proactively**: Don't wait for problems
4. **Document Changes**: Keep track of optimizations
5. **Test Load**: Regularly test with expected user count

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Performance**: https://nextjs.org/docs/app/building-your-application/optimizing
- **TanStack Query**: https://tanstack.com/query/latest
- **Web Vitals**: https://web.dev/vitals/

