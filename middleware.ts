import { NextRequest, NextResponse } from 'next/server'
import { getCategoryBySubdomain } from '@/config/service-categories'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 100 // requests per window
const WINDOW_MS = 60 * 1000 // 1 minute

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const key = ip
  const record = rateLimitMap.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + WINDOW_MS })
    return true
  }
  
  if (record.count >= RATE_LIMIT) {
    return false
  }
  
  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  // Rate limiting
  if (!rateLimit(ip)) {
    console.log(`Rate limit exceeded for IP: ${ip}, URL: ${request.url}`)
    return new NextResponse('Too Many Requests', { status: 429 })
  }
  
  // Block suspicious CSV/JSON requests
  if (url.pathname.includes('.csv') || url.pathname.includes('.json')) {
    console.log(`Blocked suspicious request: ${request.url} from IP: ${ip}`)
    return new NextResponse('Not Found', { status: 404 })
  }
  
  // Extract subdomain from hostname
  const subdomain = hostname.split('.')[0]
  
  // Check if this is a service category subdomain
  const category = getCategoryBySubdomain(subdomain)
  
  if (category && subdomain !== 'www' && subdomain !== 'api') {
    // Add category information to headers for use in pages
    const response = NextResponse.next()
    response.headers.set('x-service-category', category.id)
    response.headers.set('x-service-category-name', category.name)
    response.headers.set('x-service-category-subdomain', category.subdomain)
    
    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    
    // Redirect to add the category query param in development only once
    // Avoid redirect loops by checking if it's already set
    if (process.env.NODE_ENV === 'development') {
      const currentCategoryParam = url.searchParams.get('category')
      if (currentCategoryParam !== category.id) {
        url.searchParams.set('category', category.id)
        return NextResponse.redirect(url)
      }
      // If already present, just continue without redirect
      return response
    }
    
    return response
  }
  
  // For main domain, pass through normally with security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
