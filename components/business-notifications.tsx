"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  business_id: string
  owner_id: string
  type: 'verification_approved' | 'verification_rejected' | 'verification_resubmitted'
  title: string
  message: string
  is_read: boolean
  created_at: string
}

interface BusinessNotificationsProps {
  businessId?: string
  ownerId?: string
}

export default function BusinessNotifications({ businessId, ownerId }: BusinessNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
  }, [businessId, ownerId])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('business_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (businessId) {
        query = query.eq('business_id', businessId)
      } else if (ownerId) {
        query = query.eq('owner_id', ownerId)
      } else {
        // Get current user's notifications
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          query = query.eq('owner_id', user.id)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        return
      }

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.is_read).length)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('business_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('business_notifications')
        .update({ is_read: true })
        .in('id', unreadIds)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'verification_approved':
        return '🎉'
      case 'verification_rejected':
        return '📝'
      case 'verification_resubmitted':
        return '🔄'
      default:
        return '📢'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'verification_approved':
        return 'bg-green-50 border-green-200'
      case 'verification_rejected':
        return 'bg-red-50 border-red-200'
      case 'verification_resubmitted':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-gray-400 text-4xl mb-2">📭</div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
        <p className="text-gray-500">You'll see verification updates here</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Verification Updates
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                {unreadCount} new
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
              !notification.is_read ? 'bg-blue-50' : ''
            }`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {notification.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className={`text-sm mt-1 ${
                  !notification.is_read ? 'text-gray-800' : 'text-gray-600'
                }`}>
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length >= 10 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Showing latest 10 notifications
          </p>
        </div>
      )}
    </div>
  )
}
