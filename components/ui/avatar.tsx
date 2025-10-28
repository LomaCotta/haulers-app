'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallbackIcon?: React.ReactNode
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10', 
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}

export function Avatar({ 
  src, 
  alt = 'User avatar', 
  size = 'md', 
  className,
  fallbackIcon
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  
  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div className={cn(
      'rounded-full bg-gray-200 flex items-center justify-center overflow-hidden',
      sizeClasses[size],
      className
    )}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : (
        fallbackIcon || <User className={cn(
          'text-gray-400',
          size === 'sm' ? 'w-4 h-4' : 
          size === 'md' ? 'w-5 h-5' :
          size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'
        )} />
      )}
    </div>
  )
}

export default Avatar
