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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl font-bold text-gray-900">
            Conversations
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All', count: conversations.filter(c => !c.is_archived).length },
              { key: 'unread', label: 'Unread', count: conversations.filter(c => c.unread_count > 0).length },
              { key: 'pinned', label: 'Pinned', count: conversations.filter(c => c.is_pinned).length },
              { key: 'archived', label: 'Archived', count: conversations.filter(c => c.is_archived).length }
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(key as any)}
                className={`text-xs ${
                  filter === key 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-6">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-sm text-gray-400">
              {searchQuery ? 'Try a different search term' : 'Start messaging your friends'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 transition-all duration-200 ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'border-transparent hover:border-gray-300'
                } ${conversation.unread_count > 0 ? 'bg-gray-50' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      {conversation.other_user.avatar_url ? (
                        <img 
                          src={conversation.other_user.avatar_url} 
                          alt={conversation.other_user.full_name} 
                          className="w-12 h-12 rounded-full object-cover" 
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold truncate ${
                        conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {conversation.other_user.full_name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {conversation.is_pinned && (
                          <Pin className="w-3 h-3 text-yellow-500" />
                        )}
                        {conversation.last_message && getMessageStatus(conversation)}
                        <span className="text-xs text-gray-500">
                          {conversation.last_message ? formatTime(conversation.last_message.created_at) : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${
                        conversation.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                      }`}>
                        {conversation.last_message?.body || 'No messages yet'}
                      </p>
                      <Badge variant="outline" className="text-xs capitalize">
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
