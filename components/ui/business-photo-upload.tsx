'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BusinessPhotoUploadProps {
  businessId: string
  currentPhotos?: {
    logo_url?: string
    cover_photo_url?: string
    gallery_photos?: string[]
  }
  onPhotosChange?: (photos: { logo_url?: string; cover_photo_url?: string; gallery_photos?: string[] }) => void
}

export function BusinessPhotoUpload({ businessId, currentPhotos, onPhotosChange }: BusinessPhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({})
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const supabase = createClient()

  const uploadPhoto = async (file: File, type: 'logo' | 'cover' | 'gallery') => {
    if (!file) return null

    setUploading(true)
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${businessId}/${type}_${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('business-photos')
        .upload(fileName, file)

      if (error) {
        console.error('Upload error:', error)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-photos')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Upload error:', error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (file: File, type: 'logo' | 'cover' | 'gallery') => {
    if (!file) return

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setPreviewUrls(prev => ({ ...prev, [type]: previewUrl }))

    // Upload the file
    const uploadedUrl = await uploadPhoto(file, type)
    
    if (uploadedUrl) {
      // Update the photos state
      const updatedPhotos = { ...currentPhotos }
      
      if (type === 'logo') {
        updatedPhotos.logo_url = uploadedUrl
      } else if (type === 'cover') {
        updatedPhotos.cover_photo_url = uploadedUrl
      } else if (type === 'gallery') {
        updatedPhotos.gallery_photos = [...(updatedPhotos.gallery_photos || []), uploadedUrl]
      }

      // Save to database immediately
      try {
        const { error } = await supabase.rpc('update_business_photos', {
          business_id: businessId,
          logo_url: type === 'logo' ? uploadedUrl : updatedPhotos.logo_url,
          cover_photo_url: type === 'cover' ? uploadedUrl : updatedPhotos.cover_photo_url,
          gallery_photos: type === 'gallery' ? updatedPhotos.gallery_photos : updatedPhotos.gallery_photos
        })

        if (error) {
          console.error('Error saving photos to database:', error)
        } else {
          console.log('Photos saved to database successfully')
        }
      } catch (error) {
        console.error('Error calling update_business_photos:', error)
      }

      onPhotosChange?.(updatedPhotos)
    }
  }

  const removePhoto = async (type: 'logo' | 'cover' | 'gallery', index?: number) => {
    const updatedPhotos = { ...currentPhotos }
    
    if (type === 'logo') {
      updatedPhotos.logo_url = undefined
    } else if (type === 'cover') {
      updatedPhotos.cover_photo_url = undefined
    } else if (type === 'gallery' && index !== undefined) {
      updatedPhotos.gallery_photos = updatedPhotos.gallery_photos?.filter((_, i) => i !== index)
    }

    // Save to database immediately
    try {
      const { error } = await supabase.rpc('update_business_photos', {
        business_id: businessId,
        logo_url: updatedPhotos.logo_url,
        cover_photo_url: updatedPhotos.cover_photo_url,
        gallery_photos: updatedPhotos.gallery_photos
      })

      if (error) {
        console.error('Error removing photos from database:', error)
      } else {
        console.log('Photos removed from database successfully')
      }
    } catch (error) {
      console.error('Error calling update_business_photos:', error)
    }

    onPhotosChange?.(updatedPhotos)
    
    // Clear preview (set to empty string to satisfy string index signature)
    setPreviewUrls(prev => ({ ...prev, [type]: '' }))
  }

  const getPhotoUrl = (type: 'logo' | 'cover' | 'gallery', index?: number) => {
    if (previewUrls[type]) return previewUrls[type]
    
    if (type === 'logo') return currentPhotos?.logo_url
    if (type === 'cover') return currentPhotos?.cover_photo_url
    if (type === 'gallery' && index !== undefined) return currentPhotos?.gallery_photos?.[index]
    
    return undefined
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold">Business Logo</h3>
            </div>
            
            {getPhotoUrl('logo') ? (
              <div className="relative inline-block">
                <img
                  src={getPhotoUrl('logo')}
                  alt="Business Logo"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                  onClick={() => removePhoto('logo')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
                <div>
                  <Button
                    onClick={() => fileInputRefs.current.logo?.click()}
                    disabled={uploading}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                  <input
                    ref={(el) => { fileInputRefs.current.logo = el }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'logo')}
                  />
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-500 mt-2">
              Square image recommended (300x300px)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cover Photo Upload */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold">Cover Photo</h3>
            </div>
            
            {getPhotoUrl('cover') ? (
              <div className="relative inline-block">
                <img
                  src={getPhotoUrl('cover')}
                  alt="Business Cover Photo"
                  className="w-64 h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                  onClick={() => removePhoto('cover')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-64 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
                <div>
                  <Button
                    onClick={() => fileInputRefs.current.cover?.click()}
                    disabled={uploading}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Cover Photo
                  </Button>
                  <input
                    ref={(el) => { fileInputRefs.current.cover = el }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'cover')}
                  />
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-500 mt-2">
              Wide image recommended (800x400px)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Photos Upload */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold">Gallery Photos</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {(currentPhotos?.gallery_photos || []).map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Gallery photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                    onClick={() => removePhoto('gallery', index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div>
              <Button
                onClick={() => fileInputRefs.current.gallery?.click()}
                disabled={uploading}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Gallery Photo
              </Button>
              <input
                ref={(el) => { fileInputRefs.current.gallery = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'gallery')}
              />
            </div>
            
            <p className="text-sm text-gray-500 mt-2">
              Add multiple photos to showcase your business
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
