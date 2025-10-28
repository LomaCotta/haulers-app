'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  User, 
  Mail, 
  Calendar,
  Shield,
  UserCheck,
  UserX,
  MoreHorizontal,
  Filter,
  Ban,
  Unlock,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UserProfile {
  id: string
  full_name: string
  role: 'consumer' | 'provider' | 'admin'
  avatar_url?: string
  created_at: string
  phone?: string
  suspended?: boolean
  suspended_at?: string
  suspended_reason?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const fetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No authenticated user')
        return
      }

      console.log('Current user:', user.id)

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching current user profile:', profileError)
        return
      }

      console.log('Current user profile:', profile)

      if (profile?.role !== 'admin') {
        console.log('User is not admin, redirecting')
        window.location.href = '/dashboard'
        return
      }

      // Fetch all users
      console.log('Fetching all users...')
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      console.log('Fetched users:', usersData)
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleRoleChange = async (userId: string, newRole: 'consumer' | 'provider' | 'admin') => {
    try {
      const { data, error } = await supabase.rpc('admin_change_user_role', {
        target_user_id: userId,
        new_role: newRole
      })

      if (error) {
        console.error('Error updating user role:', error)
        alert(`Error: ${error.message}`)
        return
      }

      if (data.success) {
        alert('User role updated successfully')
        fetchUsers() // Refresh the list
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('An unexpected error occurred')
    }
  }

  const handleSuspendUser = async (userId: string) => {
    const reason = prompt('Enter suspension reason:') || 'Suspended by administrator'
    if (!reason) return

    try {
      const { data, error } = await supabase.rpc('admin_suspend_user', {
        target_user_id: userId,
        suspension_reason: reason
      })

      if (error) {
        console.error('Error suspending user:', error)
        alert(`Error: ${error.message}`)
        return
      }

      if (data.success) {
        alert('User suspended successfully')
        fetchUsers() // Refresh the list
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error suspending user:', error)
      alert('An unexpected error occurred')
    }
  }

  const handleUnsuspendUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_unsuspend_user', {
        target_user_id: userId
      })

      if (error) {
        console.error('Error unsuspending user:', error)
        alert(`Error: ${error.message}`)
        return
      }

      if (data.success) {
        alert('User unsuspended successfully')
        fetchUsers() // Refresh the list
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error unsuspending user:', error)
      alert('An unexpected error occurred')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone and will remove all their data.`)) {
      return
    }

    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId
      })

      if (error) {
        console.error('Error deleting user:', error)
        alert(`Error: ${error.message}`)
        return
      }

      if (data.success) {
        alert(`User ${data.deleted_user} deleted permanently`)
        fetchUsers() // Refresh the list
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('An unexpected error occurred')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'provider':
        return 'bg-blue-100 text-blue-800'
      case 'consumer':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-600">View and manage all platform users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Consumers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'consumer').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'provider').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={roleFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setRoleFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={roleFilter === 'consumer' ? 'default' : 'outline'}
                onClick={() => setRoleFilter('consumer')}
                size="sm"
              >
                Consumers
              </Button>
              <Button
                variant={roleFilter === 'provider' ? 'default' : 'outline'}
                onClick={() => setRoleFilter('provider')}
                size="sm"
              >
                Providers
              </Button>
              <Button
                variant={roleFilter === 'admin' ? 'default' : 'outline'}
                onClick={() => setRoleFilter('admin')}
                size="sm"
              >
                Admins
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{user.full_name || 'No name'}</h3>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                      {user.suspended && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Ban className="w-3 h-3 mr-1" />
                          Suspended
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {formatDate(user.created_at)}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1">
                          <span>📞</span>
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Role Changes */}
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'consumer')}>
                        <User className="w-4 h-4 mr-2" />
                        Make Consumer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'provider')}>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Make Provider
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>
                        <Shield className="w-4 h-4 mr-2" />
                        Make Admin
                      </DropdownMenuItem>
                      
                      {/* Suspension Actions */}
                      {!user.suspended ? (
                        <DropdownMenuItem 
                          onClick={() => handleSuspendUser(user.id)}
                          className="text-yellow-600"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Suspend User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => handleUnsuspendUser(user.id)}
                          className="text-green-600"
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Unsuspend User
                        </DropdownMenuItem>
                      )}
                      
                      {/* Delete Action */}
                      {user.role !== 'admin' && (
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user.id, user.full_name || 'User')}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
