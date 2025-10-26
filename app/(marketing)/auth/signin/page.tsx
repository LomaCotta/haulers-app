'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

// Declare Turnstile for TypeScript
declare global {
  interface Window {
    turnstile: {
      render: (element: string | HTMLElement, options: any) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string
    }
  }
}

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  // Load Turnstile script and render widget
  useEffect(() => {
    let mounted = true

    // For development, we'll skip Turnstile to avoid domain issues
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Skipping Turnstile to avoid domain issues')
      setTurnstileLoaded(true)
      // Set a mock token for development
      setTurnstileToken('dev-mock-token')
      return () => {
        mounted = false
      }
    }

    const loadTurnstileScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if already loaded
        if (window.turnstile) {
          resolve()
          return
        }

        // Check if script already exists
        const existingScript = document.querySelector('script[src*="turnstile"]')
        if (existingScript) {
          // Wait for it to load
          existingScript.addEventListener('load', () => resolve())
          existingScript.addEventListener('error', () => reject())
          return
        }

        // Create new script
        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
        script.async = true
        script.defer = true
        script.onload = () => {
          console.log('Turnstile script loaded successfully')
          resolve()
        }
        script.onerror = (error) => {
          console.error('Failed to load Turnstile script:', error)
          reject(error)
        }
        document.head.appendChild(script)
      })
    }

    const renderTurnstileWidget = () => {
      if (!mounted || !window.turnstile || !turnstileRef.current || widgetIdRef.current) {
        return
      }

      try {
        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAABkMYinukE8nzY_' // Cloudflare test key
        console.log('Rendering Turnstile widget with site key:', siteKey)
        
        const widgetId = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            console.log('Turnstile token received:', token)
            if (mounted) {
              setTurnstileToken(token)
            }
          },
          'error-callback': (error: any) => {
            console.error('Turnstile error:', error)
            if (mounted) {
              setTurnstileToken(null)
            }
          },
          'expired-callback': () => {
            console.log('Turnstile token expired')
            if (mounted) {
              setTurnstileToken(null)
            }
          }
        })
        
        widgetIdRef.current = widgetId
        console.log('Turnstile widget rendered successfully with ID:', widgetId)
        
        if (mounted) {
          setTurnstileLoaded(true)
        }
      } catch (error) {
        console.error('Turnstile render error:', error)
      }
    }

    const initializeTurnstile = async () => {
      try {
        await loadTurnstileScript()
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          if (mounted) {
            renderTurnstileWidget()
          }
        }, 100)
      } catch (error) {
        console.error('Failed to initialize Turnstile:', error)
      }
    }

    initializeTurnstile()

    return () => {
      mounted = false
    }
  }, [])

  const resetTurnstile = () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
      setTurnstileToken(null)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: turnstileToken || undefined
        }
      })

      if (authError) {
        // Handle specific captcha errors with better messaging
        if (authError.message.includes('captcha') || authError.message.includes('verification')) {
          if (process.env.NODE_ENV === 'development') {
            setError('Development mode: Captcha verification bypassed. Please check your credentials.')
          } else {
            setError('Please complete the verification challenge above and try again.')
            resetTurnstile()
          }
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.user) {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred. Please try again.')
      resetTurnstile()
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken: turnstileToken || undefined
        }
      })

          if (authError) {
            if (authError.message.includes('captcha') || authError.message.includes('verification')) {
              if (process.env.NODE_ENV === 'development') {
                setError('Development mode: Captcha verification bypassed. Please check your credentials.')
              } else {
                setError('Please complete the verification challenge above and try again.')
                resetTurnstile()
              }
            } else {
              setError(authError.message)
            }
            return
          }

      setError('Check your email for the magic link!')
    } catch (err) {
      console.error('Magic link error:', err)
      setError('An unexpected error occurred. Please try again.')
      resetTurnstile()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-orange-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-xl">H</span>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Welcome back</CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Sign in to your Haulers.app account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold text-gray-900">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-semibold text-gray-900">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              {/* Turnstile Widget */}
              <div className="flex justify-center">
                <div ref={turnstileRef} className="turnstile-widget">
                  {!turnstileLoaded && (
                    <div className="text-sm text-gray-500 p-2">
                      Loading verification...
                    </div>
                  )}
                  {process.env.NODE_ENV === 'development' && turnstileLoaded && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
                      ✅ Development mode: Verification bypassed
                    </div>
                  )}
                </div>
              </div>

              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded">
                  <div>Turnstile loaded: {turnstileLoaded ? 'Yes' : 'No'}</div>
                  <div>Token: {turnstileToken ? 'Present' : 'None'}</div>
                  <div>Site key: {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? 'Set' : 'Missing'}</div>
                  <div className="mt-1 text-green-600">✅ Development mode active</div>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 text-base font-semibold border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all duration-200" 
                onClick={handleMagicLink}
                disabled={loading || !email}
              >
                Send magic link
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-base text-gray-600">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-orange-600 hover:text-orange-500 font-semibold transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
