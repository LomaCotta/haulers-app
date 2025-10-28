'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { 
  CheckCircle, 
  AlertCircle, 
  User, 
  Upload, 
  Camera, 
  ArrowRight, 
  ArrowLeft,
  X
} from 'lucide-react'
import { AvatarUpload } from '@/components/ui/avatar-upload-resizable'

interface ProfileData {
  full_name: string
  phone: string
  avatar_url?: string
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    phone: '',
    avatar_url: ''
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkProfile()
  }, [])

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        // Redirect based on role
        if (profileData.role === 'provider') {
          router.push('/dashboard/businesses')
        } else if (profileData.role === 'consumer') {
          router.push('/dashboard/bookings')
        } else if (profileData.role === 'admin') {
          router.push('/admin')
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      setError('Error loading your profile')
    } finally {
      setLoading(false)
    }
  }


  const nextStep = () => {
    if (currentStep === 1 && !profileData.full_name.trim()) {
      setError('Please enter your full name')
      return
    }
    setError('')
    setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => {
    setError('')
    setCurrentStep(prev => prev - 1)
  }

  const createProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create profile with all data
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          role: 'consumer',
          full_name: profileData.full_name.trim(),
          phone: profileData.phone.trim() || null,
          avatar_url: profileData.avatar_url || null,
        })

      if (error) {
        setError('Failed to create profile: ' + error.message)
        return
      }

      // Redirect to consumer dashboard
      router.push('/dashboard/bookings')
    } catch (error) {
      setError('An unexpected error occurred')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {currentStep === 1 ? 'Welcome!' : currentStep === 2 ? 'Add Your Photo' : 'Complete Setup'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {currentStep === 1 ? 'Let\'s set up your profile' : 
             currentStep === 2 ? 'Upload a profile picture (optional)' : 
             'Review your information'}
          </CardDescription>
          
          {/* Progress indicator */}
          <div className="flex justify-center space-x-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  step <= currentStep ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <Button onClick={nextStep} className="w-full">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Avatar Upload */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Add a profile picture to help others recognize you
                </p>
                
                <AvatarUpload
                  currentAvatarUrl={profileData.avatar_url}
                  onAvatarChange={(newUrl) => {
                    setProfileData(prev => ({ ...prev, avatar_url: newUrl || '' }))
                  }}
                  userId={profileData.full_name || 'temp'}
                  size="xl"
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={nextStep} className="flex-1">
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {profileData.avatar_url ? (
                      <img
                        src={profileData.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{profileData.full_name}</h3>
                    {profileData.phone && (
                      <p className="text-sm text-gray-600">{profileData.phone}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={createProfile} className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}