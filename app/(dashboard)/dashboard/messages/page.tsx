'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import MessageModal from '@/components/message-modal'
import ConversationList from '@/components/conversation-list'
import { 
  MessageSquare, 
  Send, 
  Users, 
  Plus,
  Search,
  Filter,
  MoreVertical,
  Reply,
  Star,
  Archive,
  Trash2,
  UserPlus,
  Settings,
  X,
  Building
} from 'lucide-react'

interface Message {
  id: string
  body: string
  created_at: string
  is_read: boolean
  message_type: string
  sender: {
    id: string
    full_name: string
    avatar_url?: string
  }
  booking?: {
    id: string
    status: string
    business?: {
      name: string
    }
  }
  group?: {
    id: string
    name: string
  }
  reply_to?: {
    id: string
    body: string
    sender: {
      full_name: string
    }
  }
}

interface Friend {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  updated_at?: string
  user: {
    id: string
    full_name: string
    avatar_url?: string | null
    role?: string
  }
  friend: {
    id: string
    full_name: string
    avatar_url?: string | null
    role?: string
  }
}

interface Group {
  id: string
  name: string
  description?: string
  member_count: number
  created_by: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'messages' | 'friends' | 'groups' | 'search'>('messages')
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [friendEmail, setFriendEmail] = useState('')
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [modalSearchResults, setModalSearchResults] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [sentRequests, setSentRequests] = useState<any[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean
    type: 'cancel' | 'decline' | 'accept'
    requestId: string
    userName: string
  }>({
    show: false,
    type: 'cancel',
    requestId: '',
    userName: ''
  })
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  })
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
    }, 3000)
  }

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation(conversation)
    setShowMessageModal(true)
  }

  const handleCloseMessageModal = () => {
    setShowMessageModal(false)
    setSelectedConversation(null)
  }

  const handleMessageSent = (message: any) => {
    // Refresh conversations or update UI as needed
    fetchData()
  }

  const debugFriendsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('=== DEBUG: Current User ===')
      console.log('User ID:', user.id)
      console.log('User Email:', user.email)

      console.log('=== DEBUG: All Friends Data ===')
      const { data: allFriends, error: allError } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      console.log('All friends data:', { allFriends, allError })

      console.log('=== DEBUG: Sent Requests ===')
      const { data: sentData, error: sentError } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')

      console.log('Sent requests:', { sentData, sentError })

      console.log('=== DEBUG: Pending Requests ===')
      const { data: pendingData, error: pendingError } = await supabase
        .from('friends')
        .select('*')
        .eq('friend_id', user.id)
        .eq('status', 'pending')

      console.log('Pending requests:', { pendingData, pendingError })

    } catch (error) {
      console.error('Debug error:', error)
    }
  }

  const showConfirmationModal = (type: 'cancel' | 'decline' | 'accept', requestId: string, userName: string) => {
    setShowConfirmModal({
      show: true,
      type,
      requestId,
      userName
    })
  }

  const handleConfirmAction = () => {
    const { type, requestId } = showConfirmModal
    
    switch (type) {
      case 'cancel':
        cancelFriendRequest(requestId)
        break
      case 'decline':
        declineFriendRequest(requestId)
        break
      case 'accept':
        acceptFriendRequest(requestId)
        break
    }
    
    setShowConfirmModal({ show: false, type: 'cancel', requestId: '', userName: '' })
  }

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUser(user)

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          booking:bookings(id, status, business:businesses(name)),
          group:groups(id, name),
          reply_to:messages!messages_reply_to_fkey(id, body, sender:profiles!messages_sender_id_fkey(full_name))
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      // Fetch accepted friends (both where user is sender and receiver)
      const { data: friendsData } = await supabase
        .from('friends')
        .select(`
          *,
          user:profiles!friends_user_id_fkey(id, full_name, avatar_url),
          friend:profiles!friends_friend_id_fkey(id, full_name, avatar_url)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')

      // Fetch pending friend requests (incoming)
      const { data: pendingRequestsData, error: pendingError } = await supabase
        .from('friends')
        .select(`
          *,
          user:profiles!friends_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending')

      console.log('Pending requests query result:', { pendingRequestsData, pendingError })

      // Fetch sent friend requests (outgoing)
      const { data: sentRequestsData, error: sentError } = await supabase
        .from('friends')
        .select(`
          *,
          friend:profiles!friends_friend_id_fkey(id, full_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')

      console.log('Sent requests query result:', { sentRequestsData, sentError })

      // Fetch groups
      const { data: groupsData } = await supabase
        .from('group_members')
        .select(`
          group:groups(id, name, description, created_by),
          group_id
        `)
        .eq('user_id', user.id)

      setMessages(messagesData || [])
      setFriends(friendsData || [])
      setPendingRequests(pendingRequestsData || [])
      setSentRequests(sentRequestsData || [])
      // Handle groups data
      const processedGroups = groupsData?.map(g => g.group).filter(Boolean).map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        member_count: 1, // Default member count
        created_by: group.created_by
      })) || []
      setGroups(processedGroups)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUsersInModal = async (query: string) => {
    if (!query.trim()) {
      setModalSearchResults([])
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Modal searching for:', query)

      const { data: searchData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          role,
          created_at
        `)
        .ilike('full_name', `%${query}%`)
        .neq('id', user.id)
        .limit(10)

      if (error) {
        console.error('Modal search error:', error)
        return
      }

      console.log('Modal search results:', searchData)
      setModalSearchResults(searchData || [])
    } catch (error) {
      console.error('Error searching users in modal:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          body: newMessage,
          message_type: 'general'
        })

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      setNewMessage('')
      fetchData() // Refresh messages
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const addFriend = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Adding friend:', userId, 'from user:', user.id)

      const { data: insertData, error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: userId,
          status: 'pending'
        })
        .select()

      console.log('Add friend result:', { insertData, error })

      if (error) {
        console.error('Error adding friend:', error)
        showToast('Error adding friend: ' + error.message, 'error')
        return
      }

      showToast('Friend request sent!')
      fetchData() // Refresh friends
      setShowAddFriend(false)
      setFriendEmail('')
    } catch (error) {
      console.error('Error:', error)
      showToast('Error adding friend', 'error')
    }
  }

  const acceptFriendRequest = async (requestId: string) => {
    try {
      console.log('=== ACCEPT FRIEND REQUEST ===')
      console.log('Request ID:', requestId)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id)

      // First, get the request details to understand the relationship
      const { data: requestData, error: fetchError } = await supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError) {
        console.error('Error fetching request:', fetchError)
        showToast('Error finding friend request', 'error')
        return
      }

      console.log('Request found:', requestData)

      // Update the friend request status to 'accepted'
      const { data: updateData, error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .select()

      console.log('Accept friend request result:', { updateData, error })

      if (error) {
        console.error('Error accepting friend request:', error)
        showToast('Error accepting friend request: ' + error.message, 'error')
        return
      }

      console.log('Successfully accepted friend request!')
      showToast('Friend request accepted!')
      
      // Immediately update the UI
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req.id !== requestId))
      
      // Add to friends list (create a friend object with the other user's info)
      const otherUserId = requestData.user_id === user?.id ? requestData.friend_id : requestData.user_id
      const friendInfo = {
        id: requestData.id,
        user_id: requestData.user_id,
        friend_id: requestData.friend_id,
        status: 'accepted',
        created_at: requestData.created_at,
        updated_at: new Date().toISOString(),
        user: requestData.user_id === user?.id ? 
          { id: requestData.user_id, full_name: 'You', avatar_url: null } : 
          { id: requestData.user_id, full_name: 'Unknown', avatar_url: null },
        friend: requestData.friend_id === user?.id ? 
          { id: requestData.friend_id, full_name: 'You', avatar_url: null } : 
          { id: requestData.friend_id, full_name: 'Unknown', avatar_url: null }
      }
      
      console.log('Adding friend to list:', friendInfo)
      setFriends(prev => [...prev, friendInfo])
      
      // Also refresh data to ensure consistency across all dashboards
      setTimeout(() => {
        console.log('Refreshing all data...')
        fetchData()
      }, 500)
    } catch (error) {
      console.error('Unexpected error:', error)
      showToast('Unexpected error accepting friend request', 'error')
    }
  }

  const declineFriendRequest = async (requestId: string) => {
    try {
      console.log('=== DECLINE FRIEND REQUEST ===')
      console.log('Request ID:', requestId)

      // First, get the request details
      const { data: requestData, error: fetchError } = await supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError) {
        console.error('Error fetching request:', fetchError)
        showToast('Error finding friend request', 'error')
        return
      }

      console.log('Request found:', requestData)

      // Delete the friend request from database
      console.log('Deleting from database...')
      const { error: deleteError } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId)

      console.log('Delete result:', { deleteError })

      if (deleteError) {
        console.error('Database delete error:', deleteError)
        showToast('Error deleting from database: ' + deleteError.message, 'error')
        return
      }

      console.log('Successfully deleted from database!')

      // Verify deletion by trying to fetch the request again
      const { data: verifyData, error: verifyError } = await supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single()

      console.log('Verification check:', { verifyData, verifyError })

      showToast('Friend request declined and deleted from database!')
      
      // Immediately update the UI
      setPendingRequests(prev => prev.filter(req => req.id !== requestId))
      
      // Refresh data to ensure consistency
      setTimeout(() => {
        console.log('Refreshing data...')
        fetchData()
      }, 500)
    } catch (error) {
      console.error('Unexpected error:', error)
      showToast('Unexpected error declining friend request', 'error')
    }
  }

  const cancelFriendRequest = async (requestId: string) => {
    try {
      console.log('=== CANCEL FRIEND REQUEST ===')
      console.log('Request ID:', requestId)

      // Get current user to check permissions
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id)

      // First, get the request details to understand what we're deleting
      const { data: requestData, error: fetchError } = await supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError) {
        console.error('Error fetching request:', fetchError)
        showToast('Error finding friend request', 'error')
        return
      }

      console.log('Request found:', requestData)
      console.log('User can delete?', requestData.user_id === user?.id || requestData.friend_id === user?.id)

      // Delete the friend request from database
      console.log('Deleting from database...')
      const { data: deleteData, error: deleteError } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId)
        .select() // Add select to see what was deleted

      console.log('Delete result:', { deleteData, deleteError })

      if (deleteError) {
        console.error('Database delete error:', deleteError)
        console.error('Error details:', {
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
          code: deleteError.code
        })
        showToast('Error deleting from database: ' + deleteError.message, 'error')
        return
      }

      console.log('Successfully deleted from database!')
      console.log('Deleted data:', deleteData)

      // Verify deletion by trying to fetch the request again
      const { data: verifyData, error: verifyError } = await supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single()

      console.log('Verification check:', { verifyData, verifyError })

      if (verifyData) {
        console.error('WARNING: Request still exists after deletion!')
        showToast('Warning: Request may not have been deleted properly', 'error')
      } else {
        console.log('SUCCESS: Request confirmed deleted from database')
        showToast('Friend request canceled and deleted from database!')
      }
      
      // Immediately update the UI
      setSentRequests(prev => prev.filter(req => req.id !== requestId))
      
      // Refresh data to ensure consistency
      setTimeout(() => {
        console.log('Refreshing data...')
        fetchData()
      }, 500)
    } catch (error) {
      console.error('Unexpected error:', error)
      showToast('Unexpected error canceling friend request', 'error')
    }
  }

  const createGroup = async (name: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Creating group:', name)

      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          created_by: user.id,
          is_public: true
        })
        .select()
        .single()

      if (groupError) {
        console.error('Error creating group:', groupError)
        showToast('Error creating group: ' + groupError.message, 'error')
        return
      }

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          role: 'admin'
        })

      if (memberError) {
        console.error('Error adding creator to group:', memberError)
        showToast('Group created but error adding you as member', 'error')
        return
      }

      showToast('Group created successfully!')
      fetchData() // Refresh groups
    } catch (error) {
      console.error('Error:', error)
      showToast('Error creating group', 'error')
    }
  }

  const sendDirectMessage = async (userId: string, message: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          body: message,
          message_type: 'general'
        })

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      fetchData() // Refresh messages
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Connect with friends and manage conversations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Search users by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
              }}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('search')}
              disabled={!searchQuery.trim()}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <Button 
                variant="outline" 
                onClick={debugFriendsData}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                Debug
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/60 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-gray-200/50">
        <Button
          variant={activeTab === 'messages' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('messages')}
          className={`flex-1 transition-all duration-200 ${
            activeTab === 'messages' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Messages ({messages.length})
        </Button>
        <Button
          variant={activeTab === 'friends' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('friends')}
          className={`flex-1 transition-all duration-200 ${
            activeTab === 'friends' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Friends ({friends.length})
        </Button>
        <Button
          variant={activeTab === 'groups' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('groups')}
          className={`flex-1 transition-all duration-200 ${
            activeTab === 'groups' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Groups ({groups.length})
        </Button>
        <Button
          variant={activeTab === 'search' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('search')}
          className={`flex-1 transition-all duration-200 ${
            activeTab === 'search' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Search className="w-4 h-4 mr-2" />
          Search Users
        </Button>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <ConversationList 
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?.id}
            />
          </div>

          {/* Message Detail Placeholder */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
                  <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          {/* Pending Friend Requests */}
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5" />
                  <span>Friend Requests ({pendingRequests.length})</span>
                </CardTitle>
                <CardDescription>People who want to be your friend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {request.user?.avatar_url ? (
                          <img src={request.user.avatar_url} alt={request.user.full_name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-sm font-medium">
                            {request.user?.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{request.user?.full_name}</p>
                        <p className="text-sm text-gray-500">Wants to be friends</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => showConfirmationModal('accept', request.id, request.user?.full_name || '')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showConfirmationModal('decline', request.id, request.user?.full_name || '')}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sent Friend Requests */}
          {sentRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="w-5 h-5" />
                  <span>Sent Requests ({sentRequests.length})</span>
                </CardTitle>
                <CardDescription>Friend requests you've sent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentRequests.map((request) => (
                    <div key={request.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {request.friend?.avatar_url ? (
                          <img src={request.friend.avatar_url} alt={request.friend.full_name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-sm font-medium">
                            {request.friend?.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{request.friend?.full_name}</p>
                        <p className="text-sm text-gray-500">Request pending</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => showConfirmationModal('cancel', request.id, request.friend?.full_name || '')}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accepted Friends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Friends ({friends.length})</span>
              </CardTitle>
              <CardDescription>Your accepted friends</CardDescription>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">You don't have any friends yet</p>
                  <Button 
                    variant="outline"
                    onClick={() => setShowAddFriendModal(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Your First Friend
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map((friend) => {
                    // Determine which user is the "other" user (not the current user)
                    const otherUser = friend.user_id === currentUser?.id ? friend.friend : friend.user
                    const otherUserId = friend.user_id === currentUser?.id ? friend.friend_id : friend.user_id
                    
                    return (
                      <div key={friend.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {otherUser?.avatar_url ? (
                            <img src={otherUser.avatar_url} alt={otherUser.full_name} className="w-10 h-10 rounded-full" />
                          ) : (
                            <span className="text-sm font-medium">
                              {otherUser?.full_name?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{otherUser?.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-gray-500 capitalize">{otherUser?.role || 'user'}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedConversation({
                              id: otherUserId,
                              other_user: {
                                id: otherUserId,
                                full_name: otherUser?.full_name || 'Unknown User',
                                avatar_url: otherUser?.avatar_url,
                                role: otherUser?.role || 'user'
                              }
                            })
                            setShowMessageModal(true)
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    )
                  })}
                  
                  {/* Add Friend Card */}
                  <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400">
                    <Button 
                      variant="ghost"
                      onClick={() => setShowAddFriendModal(true)}
                      className="flex flex-col items-center space-y-2"
                    >
                      <UserPlus className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Add Friend</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{group.name}</h3>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-600">{group.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{group.member_count} members</span>
                    <Badge variant="outline">Member</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Create Group Card */}
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-2">Create a group</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  const name = prompt('Group name:')
                  const description = prompt('Group description:')
                  if (name && description) {
                    createGroup(name, description)
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Group
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Find and connect with users who have left reviews or are contactable
                {searchQuery && ` - Searching for: "${searchQuery}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchQuery ? `No users found matching "${searchQuery}"` : 'Enter a name to search for users'}
                  </p>
                  {searchQuery && (
                    <p className="text-sm text-gray-400 mt-2">
                      Try searching for: "Alexander", "Nikki", or any user name
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.full_name} className="w-12 h-12 rounded-full" />
                            ) : (
                              <span className="text-lg font-medium">
                                {user.full_name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => addFriend(user.id)}
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Add Friend
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const message = prompt('Send a message:')
                                  if (message) {
                                    sendDirectMessage(user.id, message)
                                  }
                                }}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Message
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contactable Users Info */}
          <Card>
            <CardHeader>
              <CardTitle>Who Can You Contact?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Reviewers</p>
                    <p className="text-sm text-gray-500">Users who have left reviews on businesses</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Building className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Business Owners</p>
                    <p className="text-sm text-gray-500">Users who own businesses on the platform</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">All Users</p>
                    <p className="text-sm text-gray-500">Search by name to find any user</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <UserPlus className="w-6 h-6" />
                  <h2 className="text-xl font-semibold">Add Friend</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddFriendModal(false)
                    setModalSearchQuery('')
                    setModalSearchResults([])
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-blue-100 mt-2">Search for users to add as friends</p>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Search Input */}
              <div className="mb-4">
                <Input
                  placeholder="Search by name..."
                  value={modalSearchQuery}
                  onChange={(e) => {
                    setModalSearchQuery(e.target.value)
                    searchUsersInModal(e.target.value)
                  }}
                  className="w-full"
                />
              </div>

              {/* Search Results */}
              <div className="max-h-64 overflow-y-auto">
                {modalSearchQuery && modalSearchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No users found</p>
                    <p className="text-sm text-gray-400">Try searching for "Alexander" or "Nikki"</p>
                  </div>
                ) : modalSearchResults.length > 0 ? (
                  <div className="space-y-3">
                    {modalSearchResults.map((user) => (
                      <div key={user.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full" />
                          ) : (
                            <span className="text-sm font-medium">
                              {user.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            addFriend(user.id)
                            setShowAddFriendModal(false)
                            setModalSearchQuery('')
                            setModalSearchResults([])
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Start typing to search for users</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddFriendModal(false)
                  setModalSearchQuery('')
                  setModalSearchResults([])
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Confirmation Modal */}
      {showConfirmModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  {showConfirmModal.type === 'cancel' && <X className="w-5 h-5" />}
                  {showConfirmModal.type === 'decline' && <X className="w-5 h-5" />}
                  {showConfirmModal.type === 'accept' && <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {showConfirmModal.type === 'cancel' && 'Cancel Friend Request'}
                    {showConfirmModal.type === 'decline' && 'Decline Friend Request'}
                    {showConfirmModal.type === 'accept' && 'Accept Friend Request'}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {showConfirmModal.type === 'cancel' && 'Are you sure you want to cancel this request?'}
                    {showConfirmModal.type === 'decline' && 'Are you sure you want to decline this request?'}
                    {showConfirmModal.type === 'accept' && 'Are you sure you want to accept this request?'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {showConfirmModal.userName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{showConfirmModal.userName}</p>
                  <p className="text-sm text-gray-500">
                    {showConfirmModal.type === 'cancel' && 'Friend request will be canceled'}
                    {showConfirmModal.type === 'decline' && 'Friend request will be declined'}
                    {showConfirmModal.type === 'accept' && 'Will become your friend'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal({ show: false, type: 'cancel', requestId: '', userName: '' })}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                className={`px-6 ${
                  showConfirmModal.type === 'accept' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
              >
                {showConfirmModal.type === 'cancel' && 'Cancel Request'}
                {showConfirmModal.type === 'decline' && 'Decline'}
                {showConfirmModal.type === 'accept' && 'Accept'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`flex items-center space-x-3 p-4 rounded-lg shadow-lg max-w-sm ${
            toast.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className="flex-shrink-0 ml-2 text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedConversation && (
        <MessageModal
          isOpen={showMessageModal}
          onClose={handleCloseMessageModal}
          recipientId={selectedConversation.id}
          recipientName={selectedConversation.other_user.full_name}
          recipientAvatar={selectedConversation.other_user.avatar_url}
          onMessageSent={handleMessageSent}
        />
      )}
    </div>
  )
}
