'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { Upload, Camera, X, AlertCircle, Check, RotateCw } from 'lucide-react'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onAvatarChange?: (newUrl: string | null) => void
  userId: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
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
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 })
  const [imageRotation, setImageRotation] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
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
      setError('')
      
      // Create preview URL for cropping
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setOriginalImage(result)
        setShowCropModal(true)
      }
      reader.readAsDataURL(file)

    } catch (error: any) {
      console.error('File read error:', error)
      setError('Failed to process image: ' + error.message)
    }
  }

  const cropImage = useCallback(async () => {
    if (!originalImage || !canvasRef.current || !imageRef.current) return

    try {
      setUploading(true)
      setError('')

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = imageRef.current
      
      // Set canvas size to final avatar size (square)
      const avatarSize = 300 // Fixed size for avatars
      canvas.width = avatarSize
      canvas.height = avatarSize

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate image dimensions and position
      const containerWidth = 400 // Fixed container width
      const containerHeight = 320 // Fixed container height
      
      // Calculate image scale to fit container
      const imageAspect = img.naturalWidth / img.naturalHeight
      const containerAspect = containerWidth / containerHeight
      
      let drawWidth, drawHeight, drawX, drawY
      
      if (imageAspect > containerAspect) {
        // Image is wider than container
        drawHeight = containerHeight
        drawWidth = drawHeight * imageAspect
        drawX = (containerWidth - drawWidth) / 2
        drawY = 0
      } else {
        // Image is taller than container
        drawWidth = containerWidth
        drawHeight = drawWidth / imageAspect
        drawX = 0
        drawY = (containerHeight - drawHeight) / 2
      }

      // Convert crop area from container coordinates to image coordinates
      const cropX = (cropArea.x - drawX) * (img.naturalWidth / drawWidth)
      const cropY = (cropArea.y - drawY) * (img.naturalHeight / drawHeight)
      const cropWidth = cropArea.width * (img.naturalWidth / drawWidth)
      const cropHeight = cropArea.height * (img.naturalHeight / drawHeight)

      // Draw the cropped portion of the image to the canvas
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight, // Source rectangle
        0, 0, avatarSize, avatarSize // Destination rectangle
      )

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/jpeg', 0.9)
      })

      // Upload cropped image
      const fileExt = 'jpg'
      const fileName = `${userId}-${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
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
      setShowCropModal(false)
      setOriginalImage(null)

    } catch (error: any) {
      console.error('Crop/upload error:', error)
      setError('Failed to upload image: ' + error.message)
    } finally {
      setUploading(false)
    }
  }, [originalImage, cropArea, userId, supabase, onAvatarChange])

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

  const rotateImage = () => {
    setImageRotation(prev => (prev + 90) % 360)
  }

  const handleCropAreaChange = (newCropArea: CropArea) => {
    setCropArea(newCropArea)
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

      {/* Crop Modal */}
      {showCropModal && originalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Crop Your Photo</h3>
              <p className="text-sm text-gray-600">Drag to reposition and resize the crop area</p>
            </div>
            
            <div className="p-4">
              <FixedImageCropper
                src={originalImage}
                cropArea={cropArea}
                onCropAreaChange={handleCropAreaChange}
                rotation={imageRotation}
                imageRef={imageRef}
              />
              
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={rotateImage}
                  size="sm"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotate
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCropModal(false)
                      setOriginalImage(null)
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={cropImage}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Use This Photo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

// Fixed Image Cropper Component
interface FixedImageCropperProps {
  src: string
  cropArea: CropArea
  onCropAreaChange: (cropArea: CropArea) => void
  rotation: number
  imageRef: React.RefObject<HTMLImageElement>
}

function FixedImageCropper({ src, cropArea, onCropAreaChange, rotation, imageRef }: FixedImageCropperProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - cropArea.x, y: e.clientY - cropArea.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min(e.clientX - dragStart.x, containerRect.width - cropArea.width))
    const newY = Math.max(0, Math.min(e.clientY - dragStart.y, containerRect.height - cropArea.height))

    onCropAreaChange({ ...cropArea, x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      setImageLoaded(true)
      
      // Center the crop area initially
      const containerWidth = 400 // Fixed width
      const containerHeight = 320 // Fixed height
      const cropSize = 200 // Fixed crop size
      
      onCropAreaChange({
        x: (containerWidth - cropSize) / 2,
        y: (containerHeight - cropSize) / 2,
        width: cropSize,
        height: cropSize
      })
    }
  }

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden"
        style={{ width: '400px', height: '320px' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Image */}
        <img
          ref={imageRef}
          src={src}
          alt="Crop preview"
          className={`w-full h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'opacity 0.3s ease'
          }}
          onLoad={handleImageLoad}
        />
        
        {/* Crop overlay */}
        <div
          className="absolute border-2 border-blue-500 cursor-move"
          style={{
            left: cropArea.x,
            top: cropArea.y,
            width: cropArea.width,
            height: cropArea.height,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Corner handles */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize" />
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-600">
        <p>Drag to move • Use corners to resize • Click rotate to adjust orientation</p>
      </div>
    </div>
  )
}

export default AvatarUpload
