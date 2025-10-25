import { NextRequest, NextResponse } from 'next/server'
import { getCategoryBySubdomain } from '@/config/service-categories'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
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
    
    // Redirect to the main domain with category parameter for now
    // In production, you'd want to handle this differently
    if (process.env.NODE_ENV === 'development') {
      // For development, we'll use query parameters
      url.searchParams.set('category', category.id)
      return NextResponse.redirect(url)
    }
    
    return response
  }
  
  // For main domain, pass through normally
  return NextResponse.next()
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
