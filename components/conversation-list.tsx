"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Search, 
  Filter, 
  MoreVertical,
  User,
  Clock,
  CheckCheck,
  Check,
  Star,
  Pin,
  Archive,
  Trash2,
  Settings,
  X,
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface Conversation {
  id: string
  other_user: {
    id: string
    full_name: string
    avatar_url?: string
    role: string
  }
  last_message?: {
    body: string
    created_at: string
    sender_id: string
    is_read: boolean
  }
  unread_count: number
  is_pinned: boolean
  is_archived: boolean
}

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void
  selectedConversationId?: string
}

export default function ConversationList({ 
  onSelectConversation, 
  selectedConversationId 
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    variant: 'destructive' | 'warning' | 'info'
    confirmText: string
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    message: '',
    variant: 'destructive',
    confirmText: 'Confirm',
    onConfirm: () => {}
  })
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  })
  const supabase = createClient()

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
    }, 3000)
  }

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('sender_id', conversationId)
        .eq('is_read', false)

      if (error) throw error
      fetchConversations()
      showToast('Conversation marked as read', 'success')
    } catch (error: any) {
      console.error('Error marking as read:', error)
      showToast('Failed to mark as read', 'error')
    }
  }

  const pinConversation = async (conversationId: string, pin: boolean) => {
    try {
      setActionLoading(conversationId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('conversation_preferences')
        .upsert({
          user_id: user.id,
          other_user_id: conversationId,
          is_pinned: pin,
          pinned_at: pin ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,other_user_id'
        })

      if (error) throw error
      fetchConversations()
      showToast(pin ? 'Conversation pinned' : 'Conversation unpinned', 'success')
    } catch (error: any) {
      console.error('Error pinning conversation:', error)
      showToast('Failed to update conversation', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const archiveConversation = async (conversationId: string, archive: boolean) => {
    try {
      setActionLoading(conversationId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('conversation_preferences')
        .upsert({
          user_id: user.id,
          other_user_id: conversationId,
          is_archived: archive,
          archived_at: archive ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,other_user_id'
        })

      if (error) throw error
      fetchConversations()
      showToast(archive ? 'Conversation archived' : 'Conversation unarchived', 'success')
    } catch (error: any) {
      console.error('Error archiving conversation:', error)
      showToast('Failed to update conversation', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete all messages in this conversation? This action cannot be undone.',
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          setActionLoading(conversationId)
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          // Delete all messages in the conversation
          const { error: deleteError } = await supabase.rpc('delete_conversation_messages', {
            p_user_id: user.id,
            p_other_user_id: conversationId
          })

          if (deleteError) {
            // Fallback: manual delete
            const { error: msgError } = await supabase
              .from('messages')
              .delete()
              .or(`and(sender_id.eq.${user.id},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${user.id})`)

            if (msgError) throw msgError

            // Delete preferences
            await supabase
              .from('conversation_preferences')
              .delete()
              .eq('user_id', user.id)
              .eq('other_user_id', conversationId)
          }

          fetchConversations()
          showToast('Conversation deleted', 'success')
        } catch (error: any) {
          console.error('Error deleting conversation:', error)
          showToast('Failed to delete conversation', 'error')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  const markAllAsRead = async () => {
    try {
      setActionLoading('mark-all')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('mark_all_messages_read', {
        p_user_id: user.id
      })

      if (error) {
        // Fallback: manual update
        const { error: updateError } = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false)

        if (updateError) throw updateError
      }

      fetchConversations()
      showToast('All messages marked as read', 'success')
    } catch (error: any) {
      console.error('Error marking all as read:', error)
      showToast('Failed to mark all as read', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const archiveAllConversations = async () => {
    setConfirmDialog({
      open: true,
      title: 'Archive All Conversations',
      message: 'Are you sure you want to archive all conversations? You can unarchive them later from the Archived tab.',
      variant: 'info',
      confirmText: 'Archive All',
      onConfirm: async () => {
        try {
          setActionLoading('archive-all')
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          // Get all conversation partners
          const { data: messages } = await supabase
            .from('messages')
            .select('sender_id, recipient_id')
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)

          if (messages) {
            const otherUserIds = new Set<string>()
            messages.forEach(msg => {
              const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
              if (otherId) otherUserIds.add(otherId)
            })

            // Archive all conversations
            const updates = Array.from(otherUserIds).map(otherUserId => ({
              user_id: user.id,
              other_user_id: otherUserId,
              is_archived: true,
              archived_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))

            for (const update of updates) {
              await supabase
                .from('conversation_preferences')
                .upsert(update, { onConflict: 'user_id,other_user_id' })
            }
          }

          fetchConversations()
          showToast('All conversations archived', 'success')
        } catch (error: any) {
          console.error('Error archiving all:', error)
          showToast('Failed to archive all conversations', 'error')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  const deleteAllConversations = async () => {
    setConfirmDialog({
      open: true,
      title: 'Delete All Conversations',
      message: 'Are you sure you want to delete ALL conversations? This will permanently remove all your messages and cannot be undone!',
      variant: 'destructive',
      confirmText: 'Delete All',
      onConfirm: async () => {
        try {
          setActionLoading('delete-all')
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          // Delete all messages where user is sender or recipient
          const { error } = await supabase
            .from('messages')
            .delete()
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)

          if (error) throw error

          // Delete all preferences
          await supabase
            .from('conversation_preferences')
            .delete()
            .eq('user_id', user.id)

          fetchConversations()
          showToast('All conversations deleted', 'success')
        } catch (error: any) {
          console.error('Error deleting all:', error)
          showToast('Failed to delete all conversations', 'error')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  const exportMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(full_name, email),
          recipient:profiles!messages_recipient_id_fkey(full_name, email)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Create CSV content
      const csvContent = [
        ['Date', 'Sender', 'Recipient', 'Message', 'Read'].join(','),
        ...(messages || []).map(msg => [
          new Date(msg.created_at).toLocaleString(),
          `"${msg.sender?.full_name || 'Unknown'}"`,
          `"${msg.recipient?.full_name || 'Unknown'}"`,
          `"${(msg.body || '').replace(/"/g, '""')}"`,
          msg.is_read ? 'Yes' : 'No'
        ].join(','))
      ].join('\n')

      // Download as CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `messages_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast('Messages exported successfully', 'success')
    } catch (error: any) {
      console.error('Error exporting messages:', error)
      showToast('Failed to export messages', 'error')
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch messages where current user is either sender or recipient
      const { data: conversationsData, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url, role),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, avatar_url, role),
          created_at,
          body,
          is_read,
          message_type
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching conversations:', error)
        return
      }

      // Fetch conversation preferences
      const { data: preferences } = await supabase
        .from('conversation_preferences')
        .select('other_user_id, is_pinned, is_archived')
        .eq('user_id', user.id)

      const prefsMap = new Map<string, { is_pinned: boolean; is_archived: boolean }>()
      preferences?.forEach(pref => {
        prefsMap.set(pref.other_user_id, {
          is_pinned: pref.is_pinned || false,
          is_archived: pref.is_archived || false
        })
      })

      // Group messages by conversation partner to create conversations
      const conversationMap = new Map<string, Conversation>()
      
      conversationsData?.forEach((msg: any) => {
        // Determine the other user in the conversation
        const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
        const otherUser = msg.sender_id === user.id ? msg.recipient : msg.sender
        
        // Skip if we don't have proper user data
        if (!otherUserId || !otherUser || !otherUser.id) {
          console.warn('Skipping message with missing user data:', msg)
          return
        }
        
        if (!conversationMap.has(otherUserId)) {
          const prefs = prefsMap.get(otherUserId) || { is_pinned: false, is_archived: false }
          conversationMap.set(otherUserId, {
            id: otherUserId,
            other_user: {
              id: otherUser.id,
              full_name: otherUser.full_name || 'Unknown User',
              avatar_url: otherUser.avatar_url,
              role: otherUser.role || 'user'
            },
            unread_count: 0,
            is_pinned: prefs.is_pinned,
            is_archived: prefs.is_archived
          })
        }
        
        const conversation = conversationMap.get(otherUserId)!
        if (!conversation.last_message || new Date(msg.created_at) > new Date(conversation.last_message.created_at)) {
          conversation.last_message = {
            body: msg.body,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
            is_read: msg.is_read
          }
        }
        
        // Count unread messages (messages sent TO the current user)
        if (!msg.is_read && msg.recipient_id === user.id) {
          conversation.unread_count++
        }
      })

      // Sort conversations: pinned first, then by last message time
      const conversationsList = Array.from(conversationMap.values()).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        const aTime = a.last_message ? new Date(a.last_message.created_at).getTime() : 0
        const bTime = b.last_message ? new Date(b.last_message.created_at).getTime() : 0
        return bTime - aTime
      })

      setConversations(conversationsList)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getMessageStatus = (conversation: Conversation) => {
    if (!conversation.last_message) return null
    
    if (conversation.last_message.is_read) {
      return <CheckCheck className="w-3 h-3 text-blue-500" />
    } else {
      return <Check className="w-3 h-3 text-gray-400" />
    }
  }

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.other_user.full_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    
    const matchesFilter = (() => {
      switch (filter) {
        case 'unread':
          return conversation.unread_count > 0
        case 'pinned':
          return conversation.is_pinned
        case 'archived':
          return conversation.is_archived
        default:
          return !conversation.is_archived
      }
    })()
    
    return matchesSearch && matchesFilter
  })

  return (
    <Card className="h-full flex flex-col border border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="pb-4 sm:pb-6 border-b border-gray-200 px-3 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
          <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 min-w-0 flex-1">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">Conversations</span>
          </CardTitle>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-gray-100 min-h-[44px] min-w-[44px] p-2"
                  title="Conversation settings"
                >
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={markAllAsRead}
                  disabled={actionLoading === 'mark-all'}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all as read
                  {actionLoading === 'mark-all' && ' (loading...)'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={archiveAllConversations}
                  disabled={actionLoading === 'archive-all'}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive all
                  {actionLoading === 'archive-all' && ' (loading...)'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  // Clear search
                  setSearchQuery('')
                  setFilter('all')
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Clear filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-gray-100 min-h-[44px] min-w-[44px] p-2"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => fetchConversations()}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Refresh conversations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportMessages}>
                  <Download className="w-4 h-4 mr-2" />
                  Export messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={deleteAllConversations}
                  disabled={actionLoading === 'delete-all'}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete all
                  {actionLoading === 'delete-all' && ' (loading...)'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search and Filter - Enhanced Design */}
        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All', count: conversations.filter(c => !c.is_archived).length },
              { key: 'unread', label: 'Unread', count: conversations.filter(c => c.unread_count > 0).length },
              { key: 'pinned', label: 'Pinned', count: conversations.filter(c => c.is_pinned).length },
              { key: 'archived', label: 'Archived', count: conversations.filter(c => c.is_archived).length }
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(key as any)}
                className={`text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 transition-all duration-200 min-h-[44px] ${
                  filter === key 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md' 
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:border-orange-400'
                }`}
              >
                {label}
                {count > 0 && (
                  <Badge variant="secondary" className={`ml-1.5 sm:ml-2 text-xs ${
                    filter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 sm:py-12 lg:py-16 px-4 sm:px-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 break-words">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-gray-600 text-sm sm:text-base break-words">
              {searchQuery ? 'Try a different search term' : 'Start messaging your friends'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 sm:p-4 lg:p-5 rounded-lg cursor-pointer border-2 transition-all duration-200 min-h-[60px] ${
                  selectedConversationId === conversation.id
                    ? 'bg-gradient-to-r from-orange-50 to-orange-100/50 border-orange-500 shadow-md'
                    : 'border-transparent hover:border-orange-300 hover:bg-gray-50 hover:shadow-sm'
                } ${conversation.unread_count > 0 ? 'bg-orange-50/50' : 'bg-white'}`}
              >
                <div 
                  onClick={() => onSelectConversation(conversation)}
                  className="flex items-start gap-3 sm:gap-4"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                      {conversation.other_user.avatar_url ? (
                        <img 
                          src={conversation.other_user.avatar_url} 
                          alt={conversation.other_user.full_name} 
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover" 
                        />
                      ) : (
                        <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      )}
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                        <span className="text-[10px] sm:text-xs text-white font-bold">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                      <h3 className={`font-bold text-base sm:text-lg truncate flex-1 ${
                        conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-800'
                      }`}>
                        {conversation.other_user.full_name}
                      </h3>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        {conversation.is_pinned && (
                          <Pin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                        )}
                        {conversation.last_message && getMessageStatus(conversation)}
                        <span className="text-[10px] sm:text-xs text-gray-600 font-medium whitespace-nowrap">
                          {conversation.last_message ? formatTime(conversation.last_message.created_at) : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs sm:text-sm truncate flex-1 min-w-0 ${
                        conversation.unread_count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'
                      }`}>
                        {conversation.last_message?.body || 'No messages yet'}
                      </p>
                      <Badge className={`text-[10px] sm:text-xs capitalize font-medium flex-shrink-0 ${
                        conversation.other_user.role === 'provider' 
                          ? 'bg-orange-100 text-orange-700 border-orange-200' 
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      } border`}>
                        {conversation.other_user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Per-conversation actions menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                      {conversation.unread_count > 0 && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          markConversationAsRead(conversation.id)
                        }}>
                          <CheckCheck className="w-4 h-4 mr-2" />
                          Mark as read
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        pinConversation(conversation.id, !conversation.is_pinned)
                      }}>
                        <Pin className="w-4 h-4 mr-2" />
                        {conversation.is_pinned ? 'Unpin' : 'Pin'} conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        archiveConversation(conversation.id, !conversation.is_archived)
                      }}>
                        <Archive className="w-4 h-4 mr-2" />
                        {conversation.is_archived ? 'Unarchive' : 'Archive'} conversation
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conversation.id)
                        }}
                        className="text-red-600 focus:text-red-600"
                        disabled={actionLoading === conversation.id}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete conversation
                        {actionLoading === conversation.id && ' (loading...)'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border backdrop-blur-sm max-w-md ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors ${
                toast.type === 'success' ? 'hover:bg-green-100 text-green-600' : 'hover:bg-red-100 text-red-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
