// Admin dashboard user management functions
// Add these to your admin users page

import { createClient } from '@/lib/supabase/client'

interface AdminActionResult {
  success: boolean;
  error?: string;
  message?: string;
  user?: any;
  deleted_user?: string;
}

// Suspend a user
export async function suspendUser(userId: string, reason: string = 'Suspended by administrator'): Promise<AdminActionResult> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('admin_suspend_user', {
    target_user_id: userId,
    suspension_reason: reason
  })
  
  if (error) {
    console.error('Error suspending user:', error)
    return { success: false, error: error.message }
  }
  
  return data
}

// Unsuspend a user
export async function unsuspendUser(userId: string): Promise<AdminActionResult> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('admin_unsuspend_user', {
    target_user_id: userId
  })
  
  if (error) {
    console.error('Error unsuspending user:', error)
    return { success: false, error: error.message }
  }
  
  return data
}

// Permanently delete a user
export async function deleteUser(userId: string): Promise<AdminActionResult> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('admin_delete_user', {
    target_user_id: userId
  })
  
  if (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: error.message }
  }
  
  return data
}

// Change user role
export async function changeUserRole(userId: string, newRole: 'consumer' | 'provider' | 'admin'): Promise<AdminActionResult> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('admin_change_user_role', {
    target_user_id: userId,
    new_role: newRole
  })
  
  if (error) {
    console.error('Error changing user role:', error)
    return { success: false, error: error.message }
  }
  
  return data
}

// Get detailed user information
export async function getUserDetails(userId: string): Promise<AdminActionResult> {
  const supabase = createClient()
  
  const { data, error } = await supabase.rpc('admin_get_user_details', {
    target_user_id: userId
  })
  
  if (error) {
    console.error('Error getting user details:', error)
    return { success: false, error: error.message }
  }
  
  return data
}

// Example usage in your admin users page component:

/*
const handleSuspendUser = async (userId: string) => {
  const reason = prompt('Enter suspension reason:') || 'Suspended by administrator'
  const result = await suspendUser(userId, reason)
  
  if (result.success) {
    alert('User suspended successfully')
    fetchUsers() // Refresh the user list
  } else {
    alert(`Error: ${result.error}`)
  }
}

const handleUnsuspendUser = async (userId: string) => {
  const result = await unsuspendUser(userId)
  
  if (result.success) {
    alert('User unsuspended successfully')
    fetchUsers() // Refresh the user list
  } else {
    alert(`Error: ${result.error}`)
  }
}

const handleDeleteUser = async (userId: string) => {
  if (confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
    const result = await deleteUser(userId)
    
    if (result.success) {
      alert(`User ${result.deleted_user} deleted permanently`)
      fetchUsers() // Refresh the user list
    } else {
      alert(`Error: ${result.error}`)
    }
  }
}

const handleChangeRole = async (userId: string, newRole: 'consumer' | 'provider' | 'admin') => {
  const result = await changeUserRole(userId, newRole)
  
  if (result.success) {
    alert('User role updated successfully')
    fetchUsers() // Refresh the user list
  } else {
    alert(`Error: ${result.error}`)
  }
}
*/
