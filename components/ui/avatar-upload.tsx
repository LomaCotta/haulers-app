'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { Upload, Camera, X, AlertCircle } from 'lucide-react'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onAvatarChange?: (newUrl: string | null) => void
  userId: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarChange, 
  userId,
  size = 'lg',
  className 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      setError('')

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      setPreviewUrl(publicUrl)
      onAvatarChange?.(publicUrl)

    } catch (error: any) {
      console.error('Upload error:', error)
      setError('Failed to upload image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    try {
      setUploading(true)
      setError('')

      // Update profile to remove avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      setPreviewUrl(null)
      onAvatarChange?.(null)

    } catch (error: any) {
      console.error('Remove error:', error)
      setError('Failed to remove avatar: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="relative">
        <Avatar 
          src={previewUrl} 
          size={size}
          className="border-2 border-gray-200"
        />
        {previewUrl && (
          <button
            onClick={removeAvatar}
            disabled={uploading}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-md text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          size="sm"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          size="sm"
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <p className="text-xs text-gray-500 text-center max-w-xs">
        Upload a profile picture. Max size: 5MB. Supported formats: JPG, PNG, GIF, WebP
      </p>
    </div>
  )
}

export default AvatarUpload
