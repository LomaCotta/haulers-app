'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Settings,
  DollarSign,
  Shield,
  Bell,
  Globe,
  Database,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Building,
  Calendar,
  MessageSquare,
  Star,
  BarChart3,
  Save,
  RefreshCw,
  Download,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Activity,
  Zap,
  Target,
  PieChart,
  LineChart
} from 'lucide-react'
import { AvatarUpload } from '@/components/ui/avatar-upload-resizable'
import { Avatar } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

interface PlatformConfig {
  id: string
  key: string
  value: any
  description: string
  category: string
  is_public: boolean
  updated_at: string
}

interface PlatformMetric {
  id: string
  metric_name: string
  metric_value: number
  metric_type: string
  tags: any
  recorded_at: string
}

interface PlatformAlert {
  id: string
  alert_type: string
  title: string
  message: string
  severity: string
  status: string
  created_at: string
}

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<PlatformConfig[]>([])
  const [metrics, setMetrics] = useState<PlatformMetric[]>([])
  const [alerts, setAlerts] = useState<PlatformAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingConfig, setEditingConfig] = useState<PlatformConfig | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [configForm, setConfigForm] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general',
    is_public: false
  })
  const supabase = createClient()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        window.location.href = '/dashboard'
        return
      }

      setProfile(profile)

      // Fetch all data in parallel
      const [configsResult, metricsResult, alertsResult] = await Promise.all([
        supabase.from('platform_config').select('*').order('category', { ascending: true }),
        supabase.from('platform_analytics').select('*').order('recorded_at', { ascending: false }).limit(50),
        supabase.from('platform_alerts').select('*').order('created_at', { ascending: false }).limit(20)
      ])

      setConfigs(configsResult.data || [])
      setMetrics(metricsResult.data || [])
      setAlerts(alertsResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (config: PlatformConfig, newValue: any) => {
    setSaving(true)
    try {
      const { error } = await supabase.rpc('set_platform_config', {
        config_key: config.key,
        config_value: newValue,
        config_description: config.description,
        config_category: config.category,
        is_public_config: config.is_public
      })

      if (error) {
        console.error('Error updating config:', error)
        alert(`Error updating ${config.key}: ${error.message}`)
        return
      }

      // Update local state
      setConfigs(configs.map(c => 
        c.id === config.id ? { ...c, value: newValue, updated_at: new Date().toISOString() } : c
      ))
      
      alert(`${config.key} updated successfully`)
    } catch (error) {
      console.error('Error updating config:', error)
      alert('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const createConfig = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.rpc('set_platform_config', {
        config_key: configForm.key,
        config_value: configForm.value,
        config_description: configForm.description,
        config_category: configForm.category,
        is_public_config: configForm.is_public
      })

      if (error) {
        console.error('Error creating config:', error)
        alert(`Error creating config: ${error.message}`)
        return
      }

      alert('Configuration created successfully')
      setConfigForm({ key: '', value: '', description: '', category: 'general', is_public: false })
      fetchAllData()
    } catch (error) {
      console.error('Error creating config:', error)
      alert('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const createAlert = async () => {
    try {
      const { error } = await supabase.rpc('create_platform_alert', {
        alert_type: 'info',
        alert_title: 'Manual Alert',
        alert_message: 'This is a manually created alert for testing',
        alert_severity: 'medium'
      })

      if (error) {
        console.error('Error creating alert:', error)
        alert(`Error creating alert: ${error.message}`)
        return
      }

      alert('Alert created successfully')
      fetchAllData()
    } catch (error) {
      console.error('Error creating alert:', error)
      alert('An unexpected error occurred')
    }
  }

  const recordMetric = async () => {
    try {
      const { error } = await supabase.rpc('record_platform_metric', {
        metric_name: 'manual_test_metric',
        metric_value: Math.floor(Math.random() * 1000),
        metric_type: 'gauge',
        metric_tags: { source: 'admin_test' }
      })

      if (error) {
        console.error('Error recording metric:', error)
        alert(`Error recording metric: ${error.message}`)
        return
      }

      alert('Metric recorded successfully')
      fetchAllData()
    } catch (error) {
      console.error('Error recording metric:', error)
      alert('An unexpected error occurred')
    }
  }

  const getConfigByKey = (key: string) => {
    return configs.find(c => c.key === key)
  }

  const getMetricByName = (name: string) => {
    return metrics.find(m => m.metric_name === name)
  }

  const formatValue = (value: any) => {
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled'
    if (typeof value === 'number') return value.toString()
    return value
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'economics': return <DollarSign className="w-4 h-4" />
      case 'features': return <Settings className="w-4 h-4" />
      case 'security': return <Shield className="w-4 h-4" />
      case 'monitoring': return <Activity className="w-4 h-4" />
      case 'communication': return <Bell className="w-4 h-4" />
      case 'integration': return <Globe className="w-4 h-4" />
      case 'appearance': return <Eye className="w-4 h-4" />
      case 'performance': return <Zap className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading platform settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-gray-600">Manage platform configuration, monitoring, and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getMetricByName('total_users')?.metric_value || 0}
                </div>
                <p className="text-xs text-gray-500">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Total Businesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getMetricByName('total_businesses')?.metric_value || 0}
                </div>
                <p className="text-xs text-gray-500">Verified businesses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Total Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getMetricByName('total_bookings')?.metric_value || 0}
                </div>
                <p className="text-xs text-gray-500">Completed bookings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Platform Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${((getMetricByName('platform_revenue_cents')?.metric_value || 0) / 100).toFixed(2)}
                </div>
                <p className="text-xs text-gray-500">Total revenue</p>
              </CardContent>
            </Card>
          </div>

          {/* Platform Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Registration</span>
                  <Badge className={getConfigByKey('registration_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('registration_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Maintenance Mode</span>
                  <Badge className={getConfigByKey('maintenance_mode')?.value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                    {getConfigByKey('maintenance_mode')?.value ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Error Reporting</span>
                  <Badge className={getConfigByKey('error_reporting_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('error_reporting_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Analytics</span>
                  <Badge className={getConfigByKey('analytics_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('analytics_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-gray-500">{alert.message}</p>
                    </div>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-sm text-gray-500">No recent alerts</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Profile</CardTitle>
                  <p className="text-sm text-gray-600">Manage your admin profile and avatar</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Upload Section */}
                  <div className="border-b pb-6">
                    <h3 className="text-sm font-medium mb-4">Profile Picture</h3>
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
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Role</label>
                      <p className="text-sm text-gray-600 mt-1">Administrator</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">User ID</label>
                      <p className="text-sm text-gray-600 mt-1 font-mono">{profile?.id}</p>
                    </div>
                  </div>
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
                      alt="Admin Profile Preview"
                      size="xl"
                      className="mx-auto"
                    />
                    <div>
                      <p className="font-medium">Administrator</p>
                      <p className="text-sm text-gray-500">Platform Admin</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Platform Configuration</h2>
            <Button onClick={() => setEditingConfig({} as PlatformConfig)}>
              <Settings className="w-4 h-4 mr-2" />
              Add Config
            </Button>
          </div>

          {/* Configuration Categories */}
          {['economics', 'features', 'security', 'monitoring', 'communication', 'integration', 'appearance', 'performance'].map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 capitalize">
                  {getCategoryIcon(category)}
                  {category} Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {configs.filter(c => c.category === category).map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{config.key}</h3>
                          {config.is_public && (
                            <Badge variant="outline" className="text-xs">Public</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{config.description}</p>
                        <p className="text-sm font-mono text-gray-600">Current: {formatValue(config.value)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {typeof config.value === 'boolean' ? (
                          <Switch
                            checked={config.value}
                            onCheckedChange={(checked) => updateConfig(config, checked)}
                            disabled={saving}
                          />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newValue = prompt(`Enter new value for ${config.key}:`, config.value.toString())
                              if (newValue !== null) {
                                updateConfig(config, newValue)
                              }
                            }}
                            disabled={saving}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Platform Analytics</h2>
            <Button onClick={recordMetric}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Record Test Metric
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.slice(0, 10).map((metric) => (
              <Card key={metric.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {metric.metric_name.replace(/_/g, ' ').toUpperCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.metric_value}</div>
                  <p className="text-xs text-gray-500">
                    {metric.metric_type} • {new Date(metric.recorded_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Platform Alerts</h2>
            <Button onClick={createAlert}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Create Test Alert
            </Button>
          </div>

          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{alert.title}</h3>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <h2 className="text-xl font-semibold">Security Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Password Min Length</span>
                  <span className="text-sm">{getConfigByKey('password_min_length')?.value || 8}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Session Timeout</span>
                  <span className="text-sm">{getConfigByKey('session_timeout_hours')?.value || 24}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Login Attempts</span>
                  <span className="text-sm">{getConfigByKey('max_login_attempts')?.value || 5}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Two-Factor Auth</span>
                  <Badge className={getConfigByKey('two_factor_required')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('two_factor_required')?.value ? 'Required' : 'Optional'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Businesses per User</span>
                  <span className="text-sm">{getConfigByKey('max_businesses_per_user')?.value || 5}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Bookings per Day</span>
                  <span className="text-sm">{getConfigByKey('max_bookings_per_day')?.value || 100}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Messages per Hour</span>
                  <span className="text-sm">{getConfigByKey('max_messages_per_hour')?.value || 50}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Reviews per User</span>
                  <span className="text-sm">{getConfigByKey('max_reviews_per_user')?.value || 100}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <h2 className="text-xl font-semibold">System Monitoring</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Caching</span>
                  <Badge className={getConfigByKey('cache_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('cache_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">CDN</span>
                  <Badge className={getConfigByKey('cdn_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('cdn_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Image Optimization</span>
                  <Badge className={getConfigByKey('image_optimization')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('image_optimization')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Error Reporting</span>
                  <Badge className={getConfigByKey('error_reporting_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('error_reporting_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Analytics</span>
                  <Badge className={getConfigByKey('analytics_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('analytics_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Performance Monitoring</span>
                  <Badge className={getConfigByKey('performance_monitoring')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('performance_monitoring')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Stripe</span>
                  <Badge className={getConfigByKey('stripe_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('stripe_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Mapbox</span>
                  <Badge className={getConfigByKey('mapbox_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('mapbox_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resend</span>
                  <Badge className={getConfigByKey('resend_enabled')?.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {getConfigByKey('resend_enabled')?.value ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Config Modal */}
      {editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Add Configuration</h2>
                <Button variant="ghost" onClick={() => setEditingConfig(null)}>×</Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Key</label>
                  <Input
                    value={configForm.key}
                    onChange={(e) => setConfigForm({ ...configForm, key: e.target.value })}
                    placeholder="config_key"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Value</label>
                  <Input
                    value={configForm.value}
                    onChange={(e) => setConfigForm({ ...configForm, value: e.target.value })}
                    placeholder="config_value"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <Textarea
                    value={configForm.description}
                    onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                    placeholder="Configuration description..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <Select value={configForm.category} onValueChange={(value) => setConfigForm({ ...configForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="economics">Economics</SelectItem>
                      <SelectItem value="features">Features</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="appearance">Appearance</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={configForm.is_public}
                    onCheckedChange={(checked) => setConfigForm({ ...configForm, is_public: checked })}
                  />
                  <label className="text-sm font-medium text-gray-600">Public Configuration</label>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={createConfig} className="flex-1" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Config'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingConfig(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
