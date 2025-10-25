"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Send } from "lucide-react"
import { format } from "date-fns"

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
}

interface BookingMessagesProps {
  bookingId: string
  currentUserId: string
  businessName?: string
  customerName?: string
}

export function BookingMessages({ 
  bookingId, 
  currentUserId, 
  businessName, 
  customerName 
}: BookingMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadMessages()
  }, [bookingId])

  const loadMessages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      })

      if (response.ok) {
        setNewMessage("")
        loadMessages() // Reload messages
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSenderName = (senderId: string) => {
    if (senderId === currentUserId) {
      return "You"
    }
    return businessName || customerName || "Other party"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>Messages</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="text-muted-foreground text-center">Loading messages...</p>
          ) : messages.length > 0 ? (
            messages.map((message) => (
              <div key={message.id} className="flex space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">
                      {getSenderName(message.sender_id)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "PPp")}
                    </span>
                  </div>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {message.content}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center">No messages yet</p>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={!newMessage.trim() || isSubmitting}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
