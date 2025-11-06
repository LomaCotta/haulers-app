'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createClient } from '@/lib/supabase/client'
import { profileRoleSchema } from '@/lib/schema'
import { ArrowLeft, User, Building } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

// Declare Turnstile types
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

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'consumer' | 'provider'>('consumer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Agreements
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  
  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate agreements
      if (!agreeTerms || !agreePrivacy) {
        setError('Please agree to the Terms of Service and Privacy Policy to continue.')
        return
      }

      // Validate role
      const validatedRole = profileRoleSchema.parse(role)

      // Sign up user
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: validatedRole,
          },
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
        // Try to create profile, but don't fail if it already exists (trigger might have created it)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            role: validatedRole,
            full_name: fullName,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Don't fail the signup if profile creation fails - the trigger should handle it
          // Just log the error and continue
        }

        // Redirect to onboarding
        router.push('/onboarding')
      }
    } catch (err) {
      setError('An unexpected error occurred')
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
            <CardTitle className="text-3xl font-bold text-gray-900">Create your account</CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Join Haulers.app to find or offer local services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="role" className="text-base font-semibold text-gray-900">I want to:</Label>
                <RadioGroup value={role} onValueChange={(value) => setRole(value as 'consumer' | 'provider')} className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
                    <RadioGroupItem value="consumer" id="consumer" className="text-orange-500" />
                    <Label htmlFor="consumer" className="flex items-center text-base font-medium cursor-pointer">
                      <User className="w-5 h-5 mr-3 text-orange-500" />
                      Find local services
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
                    <RadioGroupItem value="provider" id="provider" className="text-orange-500" />
                    <Label htmlFor="provider" className="flex items-center text-base font-medium cursor-pointer">
                      <Building className="w-5 h-5 mr-3 text-orange-500" />
                      Offer my services
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base font-semibold text-gray-900">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

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
                  minLength={6}
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

              {/* Agreements */}
              <div className="space-y-2 text-sm text-gray-700">
                <label className="flex items-start gap-3">
                  <Checkbox id="agreeTerms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(Boolean(v))} />
                  <span>
                    I agree to the{' '}
                    <Link href="/terms" className="text-orange-600 hover:text-orange-500 underline">Terms of Service</Link>.
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <Checkbox id="agreePrivacy" checked={agreePrivacy} onCheckedChange={(v) => setAgreePrivacy(Boolean(v))} />
                  <span>
                    I have read the{' '}
                    <Link href="/terms#privacy" className="text-orange-600 hover:text-orange-500 underline">Privacy Policy</Link>.
                  </span>
                </label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={loading || !agreeTerms || !agreePrivacy}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-3">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-orange-600 hover:text-orange-500 underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/terms#privacy" className="text-orange-600 hover:text-orange-500 underline">Privacy Policy</Link>.
              </p>
            </form>

            <div className="mt-6 text-center">
              <p className="text-base text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-orange-600 hover:text-orange-500 font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
