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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your profile and preferences</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('profile')}
          className="flex-1"
        >
          <User className="w-4 h-4 mr-2" />
          Profile
        </Button>
        <Button
          variant={activeTab === 'preferences' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('preferences')}
          className="flex-1"
        >
          <Bell className="w-4 h-4 mr-2" />
          Preferences
        </Button>
        <Button
          variant={activeTab === 'security' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('security')}
          className="flex-1"
        >
          <Key className="w-4 h-4 mr-2" />
          Security
        </Button>
        <Button
          variant={activeTab === 'privacy' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('privacy')}
          className="flex-1"
        >
          <Shield className="w-4 h-4 mr-2" />
          Privacy
        </Button>
      </div>

      {/* Message Display */}
      {message && (
        <Card className={message.includes('successfully') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 ${
              message.includes('successfully') ? 'text-green-600' : 'text-red-600'
            }`}>
              {message.includes('successfully') ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload Section */}
                <div className="border-b pb-6">
                  <Label className="text-sm font-medium mb-4 block">Profile Picture</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>


                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Profile Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <Avatar 
                    src={profile?.avatar_url} 
                    alt="Profile Preview"
                    size="xl"
                    className="mx-auto"
                  />
                  <div>
                    <p className="font-medium">{formData.full_name || 'Your Name'}</p>
                    <p className="text-sm text-gray-500">{profile?.email}</p>
                    <p className="text-sm text-gray-500">{formData.phone || 'No phone'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Control how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications from the platform</p>
              </div>
              <Switch
                checked={preferences.notifications_enabled}
                onCheckedChange={(checked) => setPreferences({ ...preferences, notifications_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => setPreferences({ ...preferences, email_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications via SMS</p>
              </div>
              <Switch
                checked={preferences.sms_notifications}
                onCheckedChange={(checked) => setPreferences({ ...preferences, sms_notifications: checked })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={preferences.language} onValueChange={(value) => setPreferences({ ...preferences, language: value })}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={preferences.timezone} onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}>
                  <SelectTrigger>
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

            <Button onClick={savePreferences} disabled={saving}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Change Password</h3>
                <div className="space-y-2">
                  <Input type="password" placeholder="Current password" />
                  <Input type="password" placeholder="New password" />
                  <Input type="password" placeholder="Confirm new password" />
                </div>
                <Button className="mt-2" size="sm">
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2 text-red-600">Danger Zone</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Once you delete your account, there is no going back. Please be certain.</p>
                  <Button variant="destructive" size="sm" onClick={deleteAccount}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>Control your privacy and data sharing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Privacy Level</Label>
              <Select value={preferences.privacy_level} onValueChange={(value) => setPreferences({ ...preferences, privacy_level: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Everyone can see your profile</SelectItem>
                  <SelectItem value="friends">Friends - Only friends can see your profile</SelectItem>
                  <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Data Sharing</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Share profile with businesses</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Allow search engines to index profile</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Show online status</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            <Button onClick={savePreferences} disabled={saving}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
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
