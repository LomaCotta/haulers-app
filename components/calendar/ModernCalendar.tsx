'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Clock, DollarSign, Users, Calendar, CalendarDays } from 'lucide-react'

const formatPrice = (cents?: number) => {
  if (!cents) return '$0.00'
  return `$${(cents / 100).toFixed(2)}`
}

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  title: string
  time?: string
  type?: 'booking' | 'reservation' | 'blocked' | 'custom'
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  metadata?: {
    customer?: string
    address?: string
    price?: number
    crewSize?: number
    timeSlot?: 'morning' | 'afternoon' | 'full_day'
    business?: string
    city?: string
    state?: string
    serviceType?: string
    isCustomerBooking?: boolean
    bookingId?: string // Booking ID for navigation
    jobId?: string // Job ID for navigation
    scheduledJobId?: string // Scheduled job ID for navigation
    serviceDetails?: any // Full service details
    booking?: any // Full booking object
  }
}

interface ModernCalendarProps {
  events?: CalendarEvent[]
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: Date, timeSlot: 'morning' | 'afternoon') => void
  minDate?: Date
  maxDate?: Date
  className?: string
  availabilitySlots?: Array<{
    date: string
    timeSlot: 'morning' | 'afternoon'
    available: boolean
    maxJobs: number
    currentBookings: number
  }>
  showAvailability?: boolean
  providerId?: string | null
  businessId?: string | null
}

export function ModernCalendar({
  events = [],
  onDateClick,
  onEventClick,
  onSlotClick,
  minDate,
  maxDate,
  className = '',
  availabilitySlots = [],
  showAvailability = false,
  providerId = null,
  businessId = null,
}: ModernCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [isMobile, setIsMobile] = useState(false)
  
  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Auto-switch to week view on mobile
  useEffect(() => {
    if (isMobile && viewMode === 'month') {
      setViewMode('week')
    }
  }, [isMobile, viewMode])
  
  const monthNames = ["January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getDaysInWeek = (date: Date) => {
    const weekStart = new Date(date)
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day
    weekStart.setDate(diff)
    
    const weekDays: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      weekDays.push(d)
    }
    return weekDays
  }

  const days = viewMode === 'week' ? getDaysInWeek(currentMonth) : getDaysInMonth(currentMonth)

  const navigateMonth = (direction: number) => {
    if (viewMode === 'week') {
      const newDate = new Date(currentMonth)
      newDate.setDate(currentMonth.getDate() + (direction * 7))
      setCurrentMonth(newDate)
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1))
    }
  }

  const navigateToToday = () => {
    setCurrentMonth(new Date())
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const isDateDisabled = (date: Date) => {
    if (minDate) {
      const minDateOnly = new Date(minDate)
      minDateOnly.setHours(0, 0, 0, 0)
      const dateOnly = new Date(date)
      dateOnly.setHours(0, 0, 0, 0)
      if (dateOnly < minDateOnly) return true
    }
    if (maxDate) {
      const maxDateOnly = new Date(maxDate)
      maxDateOnly.setHours(0, 0, 0, 0)
      const dateOnly = new Date(date)
      dateOnly.setHours(0, 0, 0, 0)
      if (dateOnly > maxDateOnly) return true
    }
    return false
  }

  const getEventsForDate = (date: Date) => {
    // Normalize date to YYYY-MM-DD format (local timezone, not UTC)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    if (!events || events.length === 0) {
      return []
    }
    
    // Also normalize event dates to handle timezone issues
    const matchingEvents = events.filter(e => {
      if (!e || !e.date) {
        return false
      }
      
      let eventDateStr = e.date
      // If event date is a Date object or needs parsing
      if (eventDateStr) {
        // Try to parse if it's not already YYYY-MM-DD
        try {
          // Handle different date formats
          if (typeof eventDateStr === 'string' && eventDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Already in YYYY-MM-DD format - use it directly
          } else {
            // Parse as date
            const eventDate = new Date(eventDateStr + (eventDateStr.includes('T') ? '' : 'T00:00:00'))
            if (!isNaN(eventDate.getTime())) {
              const eventYear = eventDate.getFullYear()
              const eventMonth = String(eventDate.getMonth() + 1).padStart(2, '0')
              const eventDay = String(eventDate.getDate()).padStart(2, '0')
              eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`
            } else {
              return false
            }
          }
        } catch (err) {
          return false
        }
      }
      
      return eventDateStr === dateStr
    })
    
    return matchingEvents
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-indigo-600 border border-indigo-700 text-white shadow-sm'
      case 'in_progress':
        return 'bg-blue-500 border border-blue-600 text-white shadow-sm'
      case 'completed':
        return 'bg-emerald-600 border border-emerald-700 text-white shadow-sm'
      case 'cancelled':
        return 'bg-gray-400 border border-gray-500 text-white'
      default:
        return 'bg-indigo-500 border border-indigo-600 text-white shadow-sm'
    }
  }

  return (
    <div className={`bg-white rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden ${className}`}>
      {/* Elegant Calendar Header */}
      <div className="border-b-2 border-gray-200 bg-gradient-to-r from-white to-orange-50/30">
        <div className="flex items-center justify-between px-3 sm:px-6 md:px-8 py-2.5 sm:py-4 md:py-5">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-white border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 text-gray-600 hover:text-orange-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
            aria-label={`Previous ${viewMode}`}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0">
            <div className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 tracking-tight truncate text-center">
              {viewMode === 'week' && isMobile
                ? `${monthNames[days[0]?.getMonth() || 0]} ${days[0]?.getDate() || ''} - ${days[6]?.getDate() || ''}`
                : viewMode === 'week'
                  ? `${monthNames[days[0]?.getMonth() || 0]} ${days[0]?.getDate() || ''} - ${monthNames[days[6]?.getMonth() || 0]} ${days[6]?.getDate() || ''}, ${currentMonth.getFullYear()}`
                  : `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`
              }
            </div>
            <button
              onClick={navigateToToday}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-orange-700 hover:bg-orange-50 rounded-md transition-colors hidden sm:inline-block"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {!isMobile && (
              <div className="flex items-center gap-1 bg-white border-2 border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                    viewMode === 'month'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Month
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                    viewMode === 'week'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 inline mr-1" />
                  Week
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-white border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 text-gray-600 hover:text-orange-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
              aria-label={`Next ${viewMode}`}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2 sm:p-4 md:p-6 bg-white">
        {/* Day names header */}
        {viewMode === 'week' && isMobile ? null : (
          <div className={`grid gap-0.5 sm:gap-1 md:gap-2 mb-2 sm:mb-3 md:mb-4 ${
            viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'
          }`}>
            {dayNames.map((day) => (
              <div key={day} className="text-center text-[11px] sm:text-sm md:text-base font-bold text-gray-700 py-2 sm:py-2.5 md:py-3 uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>
        )}

        {/* Calendar days */}
        <div className={`grid gap-0.5 sm:gap-1 md:gap-2 ${
          viewMode === 'week' 
            ? 'grid-cols-1 sm:grid-cols-7' 
            : 'grid-cols-7'
        }`}>
          {days.map((date, idx) => {
            if (!date && viewMode === 'month') {
              return <div key={`empty-${idx}`} className="min-h-[60px] sm:min-h-[100px] md:min-h-[120px] lg:min-h-[140px]" />
            }
            if (!date) return null

            const disabled = isDateDisabled(date)
            const todayDate = isToday(date)
            const dayEvents = getEventsForDate(date)
            const dateStr = date.toISOString().split('T')[0]

            // Get availability for this date - always show defaults if showAvailability is true
            const morningSlot = showAvailability 
              ? (availabilitySlots.find(s => s.date === dateStr && s.timeSlot === 'morning') || {
                  date: dateStr,
                  timeSlot: 'morning' as const,
                  available: true,
                  maxJobs: 0,
                  currentBookings: 0
                })
              : null
            const afternoonSlot = showAvailability 
              ? (availabilitySlots.find(s => s.date === dateStr && s.timeSlot === 'afternoon') || {
                  date: dateStr,
                  timeSlot: 'afternoon' as const,
                  available: true,
                  maxJobs: 0,
                  currentBookings: 0
                })
              : null

            // Determine if slots are blocked (not available but maxJobs > 0 means it was configured)
            const morningBlocked = morningSlot && !morningSlot.available && morningSlot.maxJobs > 0
            const afternoonBlocked = afternoonSlot && !afternoonSlot.available && afternoonSlot.maxJobs > 0
            const dayFullyBlocked = morningBlocked && afternoonBlocked
            const dayPartiallyBlocked = (morningBlocked || afternoonBlocked) && !dayFullyBlocked

            // Make date clickable - only disable if date is actually in the past or beyond maxDate
            const handleDateClick = (e: React.MouseEvent) => {
              e.preventDefault()
              e.stopPropagation()
              // Only disable if date is actually disabled (past date, etc), not based on availability
              if (!disabled) {
                if (dayEvents.length > 0 && onEventClick) {
                  // Show first event
                  onEventClick(dayEvents[0])
                } else if (onDateClick) {
                  onDateClick(date)
                }
              }
            }

            // Debug: Log if events exist but aren't showing
            if (dayEvents.length > 0 && process.env.NODE_ENV === 'development') {
              console.log(`Date ${dateStr} has ${dayEvents.length} events:`, dayEvents.map(e => e.title))
            }

            // Always show availability badges if showAvailability is true, even if maxJobs is 0
            // This ensures all dates in the month show availability indicators
            const shouldShowAvailability = showAvailability && morningSlot && afternoonSlot

            return (
              <div
                key={date.toISOString()}
                onClick={handleDateClick}
                className={`
                  relative
                  ${viewMode === 'week' 
                    ? 'min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]' 
                    : 'min-h-[60px] sm:min-h-[100px] md:min-h-[120px] lg:min-h-[140px]'
                  }
                  p-2 sm:p-3 md:p-4 rounded-lg border transition-all duration-200
                  group hover:scale-[1.01] hover:z-10 overflow-hidden
                  ${disabled
                    ? 'bg-gray-50/50 border-gray-100 cursor-not-allowed'
                    : dayFullyBlocked
                      ? 'bg-red-50/50 border-red-300 hover:border-red-400 hover:shadow-sm cursor-pointer'
                      : dayPartiallyBlocked
                        ? 'bg-orange-50/30 border-orange-300 hover:border-orange-400 hover:shadow-sm cursor-pointer'
                        : todayDate
                          ? 'bg-white border-orange-400 hover:border-orange-500 hover:shadow-sm cursor-pointer'
                          : dayEvents.length > 0
                            ? 'bg-white border-indigo-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-0.5 sm:mb-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!disabled) onDateClick?.(date)
                    }}
                    disabled={disabled}
                    className={`
                      text-xs sm:text-sm md:text-base lg:text-lg font-bold transition-colors bg-transparent border-0 p-0 cursor-pointer min-w-[20px] min-h-[20px] sm:min-w-[24px] sm:min-h-[24px]
                      ${disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : todayDate
                          ? 'text-orange-900'
                          : 'text-gray-800 hover:text-orange-700'
                      }
                    `}
                  >
                    {date.getDate()}
                  </button>
                </div>
                
                {/* Availability Display - Compact numbers only, always show both slots */}
                {shouldShowAvailability && (
                  <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex gap-1.5 sm:gap-1.5 z-10">
                    <div
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // Always allow interaction - clients need to see availability
                        if (onSlotClick) {
                          onSlotClick(date, 'morning')
                        }
                      }}
                      className={`
                        w-10 h-10 sm:w-8 sm:h-8 rounded flex items-center justify-center text-base sm:text-sm font-bold leading-none
                        transition-all duration-150 cursor-pointer
                        hover:scale-110 active:scale-95 hover:shadow-md
                        ${morningSlot && morningSlot.maxJobs === 0
                          ? 'bg-gray-200 text-gray-500'
                          : morningBlocked
                            ? 'bg-red-600 text-white shadow-md ring-2 ring-red-300' // Blocked - more prominent red
                            : morningSlot && morningSlot.currentBookings >= morningSlot.maxJobs
                              ? 'bg-red-500 text-white shadow-sm' // Fully booked
                              : morningSlot && morningSlot.available && morningSlot.currentBookings < morningSlot.maxJobs
                                ? 'bg-emerald-500 text-white shadow-sm' // Available
                                : 'bg-emerald-500 text-white shadow-sm'
                        }
                      `}
                      title={`Morning: ${morningSlot?.currentBookings || 0}/${morningSlot?.maxJobs || 0} slots${morningBlocked ? ' (BLOCKED)' : morningSlot && morningSlot.currentBookings >= morningSlot.maxJobs ? ' (FULL)' : ''}`}
                    >
                      {morningSlot?.currentBookings || 0}
                    </div>
                    <div
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // Always allow interaction - clients need to see availability
                        if (onSlotClick) {
                          onSlotClick(date, 'afternoon')
                        }
                      }}
                      className={`
                        w-10 h-10 sm:w-8 sm:h-8 rounded flex items-center justify-center text-base sm:text-sm font-bold leading-none
                        transition-all duration-150 cursor-pointer
                        hover:scale-110 active:scale-95 hover:shadow-md
                        ${afternoonSlot && afternoonSlot.maxJobs === 0
                          ? 'bg-gray-200 text-gray-500'
                          : afternoonBlocked
                            ? 'bg-red-600 text-white shadow-md ring-2 ring-red-300' // Blocked - more prominent red
                            : afternoonSlot && afternoonSlot.currentBookings >= afternoonSlot.maxJobs
                              ? 'bg-red-500 text-white shadow-sm' // Fully booked
                              : afternoonSlot && afternoonSlot.available && afternoonSlot.currentBookings < afternoonSlot.maxJobs
                                ? 'bg-emerald-500 text-white shadow-sm' // Available
                                : 'bg-emerald-500 text-white shadow-sm'
                        }
                      `}
                      title={`Afternoon: ${afternoonSlot?.currentBookings || 0}/${afternoonSlot?.maxJobs || 0} slots${afternoonBlocked ? ' (BLOCKED)' : afternoonSlot && afternoonSlot.currentBookings >= afternoonSlot.maxJobs ? ' (FULL)' : ''}`}
                    >
                      {afternoonSlot?.currentBookings || 0}
                    </div>
                  </div>
                )}
                
                {/* Events */}
                {dayEvents.length > 0 && (
                  <div className="space-y-1.5 sm:space-y-2 mt-1.5 sm:mt-2">
                    {dayEvents.slice(0, viewMode === 'week' ? 5 : 2).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (onEventClick) {
                            onEventClick(event)
                          }
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                        }}
                        className={`
                          w-full text-left px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-3 md:py-2.5 rounded-lg border-2
                          text-xs sm:text-sm md:text-base font-bold
                          transition-all duration-200 hover:scale-[1.03] hover:shadow-xl active:scale-[0.97]
                          cursor-pointer relative z-10 min-h-[36px] sm:min-h-[40px] md:min-h-[44px]
                          flex flex-col justify-center
                          ${getStatusColor(event.status)}
                        `}
                        title={`${event.title}${event.time ? ' - ' + event.time : ''}${((event.metadata?.booking?.total_price_cents ?? event.metadata?.price) ? ' - ' + formatPrice((event.metadata?.booking?.total_price_cents ?? event.metadata?.price)) : '')}${event.metadata?.address ? ' - ' + event.metadata.address : ''}`}
                      >
                        {viewMode === 'week' && isMobile && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-300">{dayNames[date.getDay()]}</span>
                            <span className="text-xs font-semibold text-gray-300">{date.getDate()}</span>
                          </div>
                        )}
                        <div className="truncate font-bold text-white text-xs sm:text-sm md:text-base leading-tight mb-0.5">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {event.time && (
                            <div className="text-[10px] sm:text-[11px] md:text-xs text-white/95 truncate font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.time.split(' - ')[0]}
                            </div>
                          )}
                          {(event.metadata?.booking?.total_price_cents ?? event.metadata?.price) > 0 && (
                            <div className="text-[10px] sm:text-[11px] md:text-xs text-white/95 truncate font-bold flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatPrice((event.metadata?.booking?.total_price_cents ?? event.metadata?.price) as number)}
                            </div>
                          )}
                          {event.metadata?.crewSize && (
                            <div className="text-[10px] sm:text-[11px] md:text-xs text-white/90 truncate font-semibold flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {event.metadata.crewSize}
                            </div>
                          )}
                        </div>
                        {event.metadata?.address && (
                          <div className="mt-0.5 text-[10px] sm:text-[11px] md:text-xs text-white/85 truncate font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{event.metadata.address}</span>
                          </div>
                        )}
                      </button>
                    ))}
                    {dayEvents.length > (viewMode === 'week' ? 5 : 2) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (onEventClick && dayEvents.length > (viewMode === 'week' ? 5 : 2)) {
                            onEventClick(dayEvents[viewMode === 'week' ? 5 : 2])
                          }
                        }}
                        className="text-[11px] sm:text-xs md:text-sm text-indigo-700 font-semibold px-2 py-1 sm:px-2.5 sm:py-1.5 bg-indigo-100 rounded-lg border-2 border-indigo-300 hover:bg-indigo-200 hover:border-indigo-400 min-h-[28px] flex items-center justify-center transition-all duration-200 cursor-pointer w-full"
                      >
                        +{dayEvents.length - (viewMode === 'week' ? 5 : 2)} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Elegant Legend - Only show for providers */}
      {showAvailability && (
        <div className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 border-t-2 border-gray-200 bg-gradient-to-br from-gray-50 to-orange-50/20">
          <div className="flex flex-wrap gap-3 sm:gap-5 md:gap-7 text-xs sm:text-sm md:text-base justify-center sm:justify-start">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg border-2 border-indigo-600 bg-indigo-600 shadow-sm"></div>
              <span className="text-gray-700 font-semibold">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg border-2 border-blue-500 bg-blue-500 shadow-sm"></div>
              <span className="text-gray-700 font-semibold">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg border-2 border-emerald-600 bg-emerald-600 shadow-sm"></div>
              <span className="text-gray-700 font-semibold">Completed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


