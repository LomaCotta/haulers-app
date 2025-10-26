# Cloudflare Turnstile Integration Guide

## Overview

This guide will help you set up Cloudflare Turnstile captcha protection for your Haulers.app authentication system. Turnstile is Cloudflare's privacy-preserving alternative to traditional captcha systems.

## Step 1: Get Turnstile Keys from Cloudflare

### 1.1 Access Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Log in to your Cloudflare account
3. Navigate to **"Turnstile"** in the left sidebar

### 1.2 Create a New Site
1. Click **"Add Site"**
2. Fill in the site details:
   - **Site name**: `Haulers.app`
   - **Domain**: 
     - For development: `localhost`
     - For production: `haulers.app` and `www.haulers.app`
   - **Widget mode**: Choose **"Managed"** (recommended)

### 1.3 Get Your Keys
After creating the site, you'll get:
- **Site Key**: Starts with `0x4AAAAAAABkMYinukE8nzY_` (public, safe to expose)
- **Secret Key**: Starts with `0x4AAAAAAABkMYinukE8nzY_` (private, keep secure)

## Step 2: Configure Supabase

### 2.1 Enable Turnstile in Supabase
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication > Settings**
3. Find **"Bot and Abuse Protection"** section
4. **Enable Captcha protection**
5. **Choose Captcha Provider**: Select **"Turnstile by Cloudflare"**
6. **Captcha secret**: Paste your Turnstile Secret Key
7. **Save changes**

## Step 3: Update Environment Variables

### 3.1 Add to .env.local
```bash
# Cloudflare Turnstile (Captcha)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here
```

### 3.2 Replace Placeholder Keys
In the signin page code, replace the placeholder site key:
```typescript
sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAABkMYinukE8nzY_'
```

## Step 4: Test the Integration

### 4.1 Development Testing
1. Start your development server: `npm run dev`
2. Visit `http://localhost:3000/auth/signin`
3. You should see the Turnstile widget below the password field
4. Complete the verification challenge
5. Try signing in - it should work without captcha errors

### 4.2 Production Testing
1. Deploy to your production domain
2. Test authentication flows
3. Monitor Supabase logs for reduced captcha errors

## Step 5: Troubleshooting

### 5.1 Common Issues

#### Widget Not Loading
- Check that the Turnstile script is loading
- Verify your site key is correct
- Ensure your domain is added to Cloudflare Turnstile

#### Captcha Still Failing
- Verify the secret key is correctly set in Supabase
- Check that the token is being sent with authentication requests
- Monitor browser console for JavaScript errors

#### Domain Mismatch
- Ensure your domain is exactly as configured in Cloudflare
- For development, use `localhost` (not `127.0.0.1`)
- For production, include both `haulers.app` and `www.haulers.app`

### 5.2 Debug Mode
Enable debug mode in Cloudflare Turnstile for testing:
1. Go to your Turnstile site settings
2. Enable **"Debug mode"**
3. This will show detailed logs in browser console

## Step 6: Production Considerations

### 6.1 Security Best Practices
- Never expose your secret key in client-side code
- Use environment variables for all keys
- Regularly rotate your keys
- Monitor authentication success rates

### 6.2 Performance Optimization
- Turnstile widgets load asynchronously
- Consider lazy loading for better performance
- Monitor Core Web Vitals impact

### 6.3 User Experience
- Turnstile is designed to be invisible to most users
- Failed challenges automatically retry
- Provide clear error messages for users

## Step 7: Monitoring and Analytics

### 7.1 Cloudflare Analytics
- Monitor Turnstile analytics in Cloudflare dashboard
- Track challenge success rates
- Identify potential abuse patterns

### 7.2 Supabase Logs
- Monitor authentication logs for captcha-related errors
- Track user authentication success rates
- Set up alerts for unusual patterns

## Step 8: Advanced Configuration

### 8.1 Custom Styling
You can customize the Turnstile widget appearance:
```typescript
const widgetId = window.turnstile.render(turnstileRef.current, {
  sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  theme: 'light', // or 'dark' or 'auto'
  size: 'normal', // or 'compact'
  // ... other options
})
```

### 8.2 Multiple Widgets
If you need captcha on multiple pages:
- Each widget needs a unique container
- Manage widget lifecycle properly
- Reset widgets on form errors

## Support and Resources

- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Turnstile API Reference](https://developers.cloudflare.com/turnstile/get-started/)

## Next Steps

1. **Complete the setup** following this guide
2. **Test thoroughly** in both development and production
3. **Monitor performance** and user experience
4. **Set up alerts** for authentication failures
5. **Consider implementing** additional security measures

Your authentication system should now work seamlessly with Cloudflare Turnstile protection!
