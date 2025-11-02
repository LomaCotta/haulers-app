'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Bell, 
  Shield, 
  Globe, 
  Save,
  Camera,
  Key,
  Trash2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AvatarUpload } from '@/components/ui/avatar-upload-resizable'
import { Avatar } from '@/components/ui/avatar'

interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  avatar_url?: string
  role: string
  created_at: string
}

interface Preferences {
  notifications_enabled: boolean
  email_notifications: boolean
  sms_notifications: boolean
  language: string
  timezone: string
  privacy_level: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [preferences, setPreferences] = useState<Preferences>({
    notifications_enabled: true,
    email_notifications: true,
    sms_notifications: false,
    language: 'en',
    timezone: 'UTC',
    privacy_level: 'friends'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'privacy'>('profile')
  const supabase = createClient()

  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || ''
        })
      }

      // Fetch preferences
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (prefsData) {
        setPreferences({
          notifications_enabled: prefsData.notifications_enabled,
          email_notifications: prefsData.email_notifications,
          sms_notifications: prefsData.sms_notifications,
          language: prefsData.language,
          timezone: prefsData.timezone,
          privacy_level: prefsData.privacy_level
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone
        })
        .eq('id', user.id)

      if (error) {
        setMessage('Error updating profile: ' + error.message)
        return
      }

      setMessage('Profile updated successfully!')
      fetchData() // Refresh data
    } catch (error) {
      setMessage('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences
        })

      if (error) {
        setMessage('Error updating preferences: ' + error.message)
        return
      }

      setMessage('Preferences updated successfully!')
    } catch (error) {
      setMessage('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setMessage('Error changing password: ' + error.message)
        return
      }

      setMessage('Password changed successfully!')
    } catch (error) {
      setMessage('An unexpected error occurred')
    }
  }

  const deleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setMessage('Error signing out: ' + error.message)
        return
      }

      // Note: Account deletion would need to be handled server-side
      setMessage('Account deletion requested. Please contact support.')
    } catch (error) {
      setMessage('An unexpected error occurred')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header - Premium Design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 break-words">Settings</h1>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg break-words">Manage your profile and preferences</p>
        </div>
      </div>

      {/* Tab Navigation - Enhanced Design with Mobile Scroll */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="flex gap-2 sm:gap-3 border-b-2 border-gray-200 pb-1 bg-white rounded-t-lg p-2 min-w-fit">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm transition-all duration-200 relative whitespace-nowrap min-h-[44px] ${
              activeTab === 'profile'
                ? 'text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${activeTab === 'profile' ? 'text-orange-600' : 'text-gray-500'}`} />
            Profile
            {activeTab === 'profile' && (
              <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-orange-600 rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm transition-all duration-200 relative whitespace-nowrap min-h-[44px] ${
              activeTab === 'preferences'
                ? 'text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${activeTab === 'preferences' ? 'text-orange-600' : 'text-gray-500'}`} />
            Preferences
            {activeTab === 'preferences' && (
              <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-orange-600 rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm transition-all duration-200 relative whitespace-nowrap min-h-[44px] ${
              activeTab === 'security'
                ? 'text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${activeTab === 'security' ? 'text-orange-600' : 'text-gray-500'}`} />
            Security
            {activeTab === 'security' && (
              <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-orange-600 rounded-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm transition-all duration-200 relative whitespace-nowrap min-h-[44px] ${
              activeTab === 'privacy'
                ? 'text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${activeTab === 'privacy' ? 'text-orange-600' : 'text-gray-500'}`} />
            Privacy
            {activeTab === 'privacy' && (
              <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-orange-600 rounded-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* Message Display - Enhanced Design */}
      {message && (
        <Card className={`shadow-lg border-2 ${
          message.includes('successfully') 
            ? 'border-green-300 bg-gradient-to-r from-green-50 to-green-100/50' 
            : 'border-red-300 bg-gradient-to-r from-red-50 to-red-100/50'
        }`}>
          <CardContent className="p-6">
            <div className={`flex items-center gap-3 ${
              message.includes('successfully') ? 'text-green-700' : 'text-red-700'
            }`}>
              {message.includes('successfully') ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <span className="font-semibold text-base">{message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Tab - Premium Design */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <Card className="border border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50">
              <CardHeader className="pb-4 sm:pb-6 border-b border-gray-200 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 break-words">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600 mt-2 break-words">Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 pt-6 sm:pt-8 px-4 sm:px-6 pb-4 sm:pb-6">
                {/* Avatar Upload Section */}
                <div className="border-b border-gray-200 pb-6 sm:pb-8">
                  <Label className="text-sm sm:text-base font-semibold text-gray-900 mb-4 sm:mb-6 block">Profile Picture</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <AvatarUpload
                        currentAvatarUrl={profile?.avatar_url}
                        onAvatarChange={(newUrl) => {
                          if (profile) {
                            setProfile({ ...profile, avatar_url: newUrl || undefined })
                          }
                        }}
                        userId={profile?.id || ''}
                        size="xl"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed break-words">
                        Upload a profile picture. Max size: 5MB. Supported formats: JPG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="full_name" className="text-sm sm:text-base font-semibold text-gray-900">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                    className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="email" className="text-sm sm:text-base font-semibold text-gray-900">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-gray-100 h-11 sm:h-12 text-sm sm:text-base cursor-not-allowed"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 font-medium break-words">Email cannot be changed</p>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="phone" className="text-sm sm:text-base font-semibold text-gray-900">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <Button 
                  onClick={saveProfile} 
                  disabled={saving}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto min-h-[44px]"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      <span className="text-sm sm:text-base">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span className="text-sm sm:text-base">Save Profile</span>
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:block hidden">
            <Card className="border border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50 sticky top-8">
              <CardHeader className="pb-4 sm:pb-6 border-b border-gray-200 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 break-words">Profile Preview</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 sm:pt-8 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-center space-y-6">
                  <div className="relative inline-block">
                    <Avatar 
                      src={profile?.avatar_url} 
                      alt="Profile Preview"
                      size="xl"
                      className="mx-auto ring-4 ring-orange-100"
                    />
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-white"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-lg text-gray-900">{formData.full_name || 'Your Name'}</p>
                    <p className="text-sm text-gray-600 font-medium">{profile?.email}</p>
                    <p className="text-sm text-gray-600 font-medium">{formData.phone || 'No phone'}</p>
                    {profile?.role && (
                      <Badge className="mt-2 bg-orange-100 text-orange-700 border-orange-200 capitalize">
                        {profile.role}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Preferences Tab - Premium Design */}
      {activeTab === 'preferences' && (
        <Card className="border border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="pb-6 border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-orange-600" />
              Notification Preferences
            </CardTitle>
            <CardDescription className="text-base text-gray-600 mt-2">Control how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
              <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm sm:text-base font-semibold text-gray-900 mb-1 block break-words">Enable Notifications</Label>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">Receive notifications from the platform</p>
                </div>
                <Switch
                  checked={preferences.notifications_enabled}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, notifications_enabled: checked })}
                  className="flex-shrink-0"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm sm:text-base font-semibold text-gray-900 mb-1 block break-words">Email Notifications</Label>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">Receive notifications via email</p>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, email_notifications: checked })}
                  className="flex-shrink-0"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm sm:text-base font-semibold text-gray-900 mb-1 block break-words">SMS Notifications</Label>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">Receive notifications via SMS</p>
                </div>
                <Switch
                  checked={preferences.sms_notifications}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, sms_notifications: checked })}
                  className="flex-shrink-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-gray-200">
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-sm sm:text-base font-semibold text-gray-900">Language</Label>
                <Select value={preferences.language} onValueChange={(value) => setPreferences({ ...preferences, language: value })}>
                  <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <Label className="text-sm sm:text-base font-semibold text-gray-900">Timezone</Label>
                <Select value={preferences.timezone} onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}>
                  <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={savePreferences} 
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-8 py-6 text-base shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Security Tab - Premium Design */}
      {activeTab === 'security' && (
        <Card className="border border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="pb-6 border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-6 h-6 text-orange-600" />
              Security Settings
            </CardTitle>
            <CardDescription className="text-base text-gray-600 mt-2">Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-orange-600" />
                  Change Password
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Current Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter current password" 
                      className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">New Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter new password" 
                      className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Confirm New Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Confirm new password" 
                      className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <Button 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-3 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg border-2 border-red-200 p-6">
                <h3 className="font-bold text-lg text-red-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Danger Zone
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-red-700 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
                  <Button 
                    variant="destructive" 
                    size="lg"
                    onClick={deleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Tab - Premium Design */}
      {activeTab === 'privacy' && (
        <Card className="border border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="pb-6 border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-600" />
              Privacy Settings
            </CardTitle>
            <CardDescription className="text-base text-gray-600 mt-2">Control your privacy and data sharing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="space-y-3 bg-white rounded-lg border border-gray-200 p-6">
              <Label className="text-base font-semibold text-gray-900">Privacy Level</Label>
              <Select value={preferences.privacy_level} onValueChange={(value) => setPreferences({ ...preferences, privacy_level: value })}>
                <SelectTrigger className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Everyone can see your profile</SelectItem>
                  <SelectItem value="friends">Friends - Only friends can see your profile</SelectItem>
                  <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-600" />
                Data Sharing
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-900 block mb-1">Share profile with businesses</span>
                    <span className="text-xs text-gray-600">Allow businesses to see your basic profile information</span>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-900 block mb-1">Allow search engines to index profile</span>
                    <span className="text-xs text-gray-600">Make your profile discoverable through search engines</span>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-900 block mb-1">Show online status</span>
                    <span className="text-xs text-gray-600">Display when you're actively using the platform</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            <Button 
              onClick={savePreferences} 
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-8 py-6 text-base shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Privacy Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
