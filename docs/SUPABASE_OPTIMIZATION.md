# Supabase Egress Optimization Guide

## 🚨 Current Issue
You've exceeded the Supabase Free Plan egress limit (6.81 GB / 5 GB).

## 🔧 Immediate Solutions

### 1. Upgrade Supabase Plan (Recommended)
- **Pro Plan**: $25/month
- **Benefits**: 100 GB egress, 8 GB database, 500k MAU
- **ROI**: Essential for production deployment

### 2. Optimize Database Queries

#### A. Add Database Indexes
```sql
-- Add indexes for common queries
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_location ON businesses(city, state);
CREATE INDEX idx_businesses_rating ON businesses(rating_avg);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_business ON bookings(business_id);
```

#### B. Implement Query Optimization
```typescript
// Use select() to limit returned fields
const { data } = await supabase
  .from('businesses')
  .select('id, name, rating_avg, city') // Only needed fields
  .eq('status', 'verified')
  .limit(20)
```

#### C. Add Caching
```typescript
// Implement Redis caching for expensive queries
const cacheKey = `businesses:${category}:${location}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const result = await supabase.from('businesses').select('*')
await redis.setex(cacheKey, 3600, JSON.stringify(result))
```

### 3. Optimize Static Assets

#### A. Use CDN for Images
```typescript
// Use Supabase Storage with CDN
const { data } = await supabase.storage
  .from('business-images')
  .getPublicUrl('image.jpg')
```

#### B. Compress Images
```bash
# Install image optimization
npm install next/image
```

### 4. Implement Rate Limiting

#### A. API Rate Limiting
```typescript
// Add rate limiting to API routes
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
```

#### B. Database Connection Pooling
```typescript
// Use connection pooling
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
    },
    global: {
      headers: {
        'x-application-name': 'haulers-app',
      },
    },
  }
)
```

### 5. Monitor Usage

#### A. Add Usage Tracking
```typescript
// Track API usage
const trackUsage = (endpoint: string, size: number) => {
  console.log(`API Usage: ${endpoint} - ${size} bytes`)
}
```

#### B. Set Up Alerts
```typescript
// Alert when approaching limits
if (usage > 0.8 * limit) {
  console.warn('Approaching egress limit!')
}
```

## 📊 Expected Results

### Before Optimization:
- **Egress**: 6.81 GB/month
- **Cost**: $0 (Free Plan)

### After Optimization:
- **Egress**: ~2-3 GB/month
- **Cost**: $0 (Free Plan) or $25 (Pro Plan)

## 🚀 Next Steps

1. **Immediate**: Upgrade to Pro Plan for production
2. **Short-term**: Implement caching and query optimization
3. **Long-term**: Monitor usage and optimize further

## 💡 Pro Tips

- Use `select()` to limit returned fields
- Implement Redis caching for expensive queries
- Use CDN for static assets
- Monitor usage with Supabase dashboard
- Set up alerts for usage thresholds

