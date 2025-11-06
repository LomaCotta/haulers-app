'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Avatar from '@/components/ui/avatar'
import { 
  Star, 
  MessageSquare, 
  Calendar,
  MapPin,
  CheckCircle,
  Building
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Profile {
  id: string
  full_name: string
  avatar_url?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  created_at: string
}

interface Review {
  id: string
  rating: number
  body: string | null
  created_at: string
  business: {
    id: string
    name: string
    city?: string
    state?: string
  }
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUserProfile()
  }, [userId])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      
      // Check if current user is signed in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError || !profileData) {
        console.error('Error fetching profile:', profileError)
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Fetch user's reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          *,
          business:businesses(id, name, city, state)
        `)
        .eq('consumer_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      setReviews(reviewsData || [])
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900 mb-2">User Not Found</p>
          <p className="text-gray-600 mb-6">This user profile could not be found.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="border-0 shadow-xl mb-6">
          <CardContent className="p-8">
            <div className="flex items-start space-x-6">
              <Avatar
                src={profile.avatar_url}
                alt={profile.full_name}
                size="xl"
                className="shadow-lg"
                fallbackIcon={
                  <span className="text-white font-bold text-2xl bg-gradient-to-br from-blue-500 to-purple-500 w-full h-full flex items-center justify-center">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </span>
                }
              />
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.full_name}</h1>
                
                {/* Member Since */}
                <div className="flex items-center text-gray-600 mb-2">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Member since {new Date(profile.created_at).getFullYear()}</span>
                </div>
                
                {profile.city && profile.state && (
                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{profile.city}, {profile.state}</span>
                  </div>
                )}

                {reviews.length > 0 && (
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-lg font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                      <span className="text-sm text-gray-600">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                    </div>
                  </div>
                )}

                {currentUserId && currentUserId !== userId && (
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    onClick={() => router.push(`/dashboard/messages?userId=${userId}`)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Section */}
        {reviews.length > 0 ? (
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-4 border-b border-gray-200">
              <CardTitle className="text-xl font-bold text-gray-900">
                Reviews ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="pb-5 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/b/${review.business.id}`}
                        className="font-bold text-gray-900 hover:text-orange-600 transition-colors"
                      >
                        {review.business.name}
                      </Link>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {review.body && (
                      <p className="text-gray-800 leading-relaxed text-sm">{review.body}</p>
                    )}
                    
                    {review.business.city && review.business.state && (
                      <div className="flex items-center text-xs text-gray-500 mt-2">
                        <Building className="w-3 h-3 mr-1" />
                        <span>{review.business.city}, {review.business.state}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-xl">
            <CardContent className="py-16 text-center">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No reviews yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

