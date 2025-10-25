# DNS Configuration for Multi-Tenant Subdomains

This guide explains how to set up DNS for the multi-tenant subdomain architecture.

## Overview

The platform supports subdomains for each service category:
- `movers.haulers.app`
- `plumbers.haulers.app`
- `electricians.haulers.app`
- etc.

## DNS Configuration

### 1. Wildcard DNS Record

Set up a wildcard DNS record to catch all subdomains:

```
Type: CNAME
Name: *.haulers.app
Value: your-deployment-domain.com
TTL: 300
```

### 2. Main Domain

```
Type: A or CNAME
Name: haulers.app
Value: your-deployment-domain.com
TTL: 300
```

### 3. WWW Redirect (Optional)

```
Type: CNAME
Name: www.haulers.app
Value: haulers.app
TTL: 300
```

## Deployment Platforms

### Vercel

1. Add custom domain: `haulers.app`
2. Add wildcard domain: `*.haulers.app`
3. Configure DNS as shown above

### Netlify

1. Add custom domain: `haulers.app`
2. Add wildcard domain: `*.haulers.app`
3. Configure DNS as shown above

### AWS CloudFront

1. Create CloudFront distribution
2. Add both `haulers.app` and `*.haulers.app` as alternate domain names
3. Configure DNS to point to CloudFront distribution

## SSL Certificates

Most platforms (Vercel, Netlify, AWS) will automatically provision SSL certificates for:
- `haulers.app`
- `*.haulers.app` (wildcard certificate)

## Testing

### Local Development

For local development, you can test subdomains by:

1. Adding entries to your `/etc/hosts` file:
```
127.0.0.1 movers.localhost
127.0.0.1 plumbers.localhost
127.0.0.1 electricians.localhost
```

2. Access via:
- `http://movers.localhost:3000`
- `http://plumbers.localhost:3000`
- `http://electricians.localhost:3000`

### Production Testing

Test each subdomain:
- `https://movers.haulers.app`
- `https://plumbers.haulers.app`
- `https://electricians.haulers.app`

## Environment Variables

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SITE_URL=https://haulers.app
NEXT_PUBLIC_WILDCARD_DOMAIN=*.haulers.app
```

## Middleware Configuration

The middleware automatically detects subdomains and routes accordingly. No additional configuration needed.

## SEO Considerations

Each subdomain will have:
- Unique meta titles and descriptions
- Category-specific content
- Optimized for local SEO
- Structured data for service categories

## Monitoring

Set up monitoring for:
- SSL certificate expiration
- DNS propagation
- Subdomain availability
- Performance metrics per subdomain

## Troubleshooting

### Common Issues

1. **Subdomain not resolving**: Check DNS propagation (can take up to 48 hours)
2. **SSL errors**: Ensure wildcard certificate is properly configured
3. **Redirect loops**: Check middleware configuration
4. **Performance issues**: Monitor CloudFront/CDN configuration

### DNS Propagation Check

Use tools like:
- `dig *.haulers.app`
- `nslookup movers.haulers.app`
- Online DNS propagation checkers

## Security

- Enable HTTPS redirect
- Configure security headers
- Set up rate limiting per subdomain
- Monitor for abuse

## Analytics

Track subdomain performance:
- Google Analytics with subdomain tracking
- Separate conversion goals per category
- A/B testing across subdomains
