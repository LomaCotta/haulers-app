"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
import { 
  MessageSquare, 
  Send, 
  X, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MessageModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  onMessageSent?: (message: any) => void
}

interface Message {
  id: string
  sender_id: string
  body: string
  created_at: string
  is_read: boolean
  sender: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

export default function MessageModal({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName, 
  recipientAvatar,
  onMessageSent 
}: MessageModalProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯', '😊', '😢', '😮', '😡', '🤗', '👏']

  useEffect(() => {
    if (isOpen) {
      fetchMessages()
    }
  }, [isOpen, recipientId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as HTMLElement
        if (!target.closest('.emoji-picker-container')) {
          setShowEmojiPicker(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch messages between current user and recipient
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return
      }

      setMessages(messagesData || [])
      
      // Mark all unread messages from this sender as read
      if (messagesData && messagesData.length > 0) {
        const unreadMessageIds = messagesData
          .filter(msg => msg.recipient_id === user.id && !msg.is_read)
          .map(msg => msg.id)
        
        if (unreadMessageIds.length > 0) {
          // Mark messages as read
          const { error: updateError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessageIds)
          
          if (updateError) {
            console.error('Error marking messages as read:', updateError)
          } else {
            // Update local state
            setMessages(prev => prev.map(msg => 
              unreadMessageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
            ))
            
            // Cancel/dismiss pending notifications for these messages
            try {
              const { error: notifError } = await supabase
                .from('notification_queue')
                .update({ status: 'cancelled' })
                .eq('notification_type', 'message_received')
                .eq('user_id', user.id)
                .in('message_id', unreadMessageIds)
                .eq('status', 'pending')
              
              if (notifError) {
                console.warn('Error cancelling notifications:', notifError)
              }
            } catch (notifErr) {
              console.warn('Error cancelling notifications:', notifErr)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    try {
      setSending(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('Error sending message: User not authenticated')
        return
      }

      // Send message to the recipient
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          body: message.trim(),
          message_type: 'general',
          is_read: false
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, avatar_url)
        `)
        .single()

      if (error) {
        console.error('Error sending message:', error)
        // Try fallback: check if recipient_id column exists, if not use booking_id approach
        if (error.code === '42703' || error.message?.includes('recipient_id')) {
          // Fallback: try without recipient_id (might be using booking-based messaging)
          const { data: fallbackMessage, error: fallbackError } = await supabase
            .from('messages')
            .insert({
              sender_id: user.id,
              body: message.trim(),
              message_type: 'general',
              is_read: false
            })
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
            `)
            .single()
          
          if (fallbackError) {
            console.error('Fallback error sending message:', fallbackError)
            alert('Failed to send message. Please check your database schema.')
            return
          }
          
          // Add recipient info manually
          const messageWithRecipient = {
            ...fallbackMessage,
            recipient_id: recipientId,
            sender: fallbackMessage.sender || { id: user.id, full_name: 'You', avatar_url: null }
          }
          
          setMessages(prev => [...prev, messageWithRecipient])
          setMessage('')
          if (onMessageSent) {
            onMessageSent(messageWithRecipient)
          }
          return
        }
        alert('Failed to send message: ' + (error.message || 'Unknown error'))
        return
      }

      setMessages(prev => [...prev, newMessage])
      setMessage('')
      
      // Send notification to recipient
      if (recipientId && newMessage) {
        try {
          const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient_id: recipientId,
              body: newMessage.body,
              message_type: newMessage.message_type || 'general',
              message_id: newMessage.id
            })
          })
          // Notification is handled by the API route
        } catch (notifError) {
          console.warn('Error sending message notification:', notifError)
          // Don't fail message sending if notification fails
        }
      }
      
      if (onMessageSent) {
        onMessageSent(newMessage)
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert('Failed to send message: ' + (error.message || 'Unknown error'))
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString()
    }
  }

  const getMessageStatus = (message: Message) => {
    if (message.is_read) {
      return <CheckCheck className="w-3 h-3 text-blue-500" />
    } else {
      return <Check className="w-3 h-3 text-gray-400" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                {recipientAvatar ? (
                  <img 
                    src={recipientAvatar} 
                    alt={recipientName} 
                    className="w-10 h-10 rounded-full object-cover" 
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {recipientName}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Direct message conversation
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                {messages.length} messages
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No messages yet</p>
              <p className="text-sm text-gray-400">Start the conversation with {recipientName}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_id === recipientId ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  msg.sender_id === recipientId 
                    ? 'bg-white border border-gray-200' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                }`}>
                  <div className="flex items-start space-x-2">
                    {msg.sender_id === recipientId && (
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        {msg.sender.avatar_url ? (
                          <img 
                            src={msg.sender.avatar_url} 
                            alt={msg.sender.full_name} 
                            className="w-6 h-6 rounded-full object-cover" 
                          />
                        ) : (
                          <span className="text-xs font-medium text-gray-600">
                            {msg.sender.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={`text-sm ${msg.sender_id === recipientId ? 'text-gray-900' : 'text-white'}`}>
                        {msg.body}
                      </p>
                      <div className={`flex items-center justify-between mt-1 ${
                        msg.sender_id === recipientId ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        <span className="text-xs">{formatTime(msg.created_at)}</span>
                        {msg.sender_id !== recipientId && (
                          <div className="flex items-center">
                            {getMessageStatus(msg)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t bg-white p-6">
          <form onSubmit={sendMessage} className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Message ${recipientName}...`}
                className="min-h-[60px] max-h-32 resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(e)
                  }
                }}
              />
            </div>
            <div className="flex items-center space-x-2 relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="w-4 h-4" />
              </Button>
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 emoji-picker-container">
                  <div className="grid grid-cols-4 gap-2">
                    {commonEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg"
                        onClick={() => addEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <Button
                type="submit"
                disabled={!message.trim() || sending}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
