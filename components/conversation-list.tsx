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
  Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()

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

      console.log('Fetched conversations data:', conversationsData)
      console.log('Current user:', user.id)

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
          conversationMap.set(otherUserId, {
            id: otherUserId,
            other_user: {
              id: otherUser.id,
              full_name: otherUser.full_name || 'Unknown User',
              avatar_url: otherUser.avatar_url,
              role: otherUser.role || 'user'
            },
            unread_count: 0,
            is_pinned: false,
            is_archived: false
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

      setConversations(Array.from(conversationMap.values()))
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
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate min-w-0">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
            <span className="truncate">Conversations</span>
          </CardTitle>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100 min-h-[44px] min-w-[44px] p-2">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-gray-100 min-h-[44px] min-w-[44px] p-2">
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </Button>
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
                onClick={() => onSelectConversation(conversation)}
                className={`p-3 sm:p-4 lg:p-5 rounded-lg cursor-pointer border-2 transition-all duration-200 min-h-[60px] ${
                  selectedConversationId === conversation.id
                    ? 'bg-gradient-to-r from-orange-50 to-orange-100/50 border-orange-500 shadow-md'
                    : 'border-transparent hover:border-orange-300 hover:bg-gray-50 hover:shadow-sm'
                } ${conversation.unread_count > 0 ? 'bg-orange-50/50' : 'bg-white'}`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
