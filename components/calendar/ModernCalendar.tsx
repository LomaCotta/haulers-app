'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Clock, DollarSign, Users } from 'lucide-react'

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
  }
}

interface ModernCalendarProps {
  events?: CalendarEvent[]
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

export function ModernCalendar({
  events = [],
  onDateClick,
  onEventClick,
  minDate,
  maxDate,
  className = '',
}: ModernCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
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

  const days = getDaysInMonth(currentMonth)

  const navigateMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1))
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
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b-2 border-gray-200 bg-gradient-to-r from-white to-orange-50/30">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-white border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 text-gray-600 hover:text-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-white border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 text-gray-600 hover:text-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-2 sm:p-4 md:p-6 bg-white">
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-2 mb-2 sm:mb-3 md:mb-4">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-[11px] sm:text-sm md:text-base font-bold text-gray-700 py-2 sm:py-2.5 md:py-3 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-2">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="min-h-[80px] sm:min-h-20 md:min-h-24 lg:min-h-28" />
            }

            const disabled = isDateDisabled(date)
            const todayDate = isToday(date)
            const dayEvents = getEventsForDate(date)

            // Debug: Log if events exist but aren't showing
            if (dayEvents.length > 0 && process.env.NODE_ENV === 'development') {
              console.log(`Date ${date.toISOString().split('T')[0]} has ${dayEvents.length} events:`, dayEvents.map(e => e.title))
            }

            return (
              <div
                key={date.toISOString()}
                onClick={() => !disabled && onDateClick?.(date)}
                className={`
                  min-h-[80px] sm:min-h-20 md:min-h-24 lg:min-h-28 p-2 sm:p-2 md:p-2.5 rounded-lg border transition-all duration-200
                  ${disabled 
                    ? 'bg-gray-50/50 border-gray-100 cursor-not-allowed' 
                    : todayDate
                      ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-2 border-orange-600 hover:border-orange-500 hover:shadow-md cursor-pointer'
                      : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 hover:shadow-sm cursor-pointer'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-1 sm:mb-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!disabled) onDateClick?.(date)
                    }}
                    disabled={disabled}
                    className={`
                      text-sm sm:text-base md:text-lg font-bold transition-colors bg-transparent border-0 p-0 cursor-pointer min-w-[24px] min-h-[24px]
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
                
                {/* Events */}
                {dayEvents.length > 0 && (
                  <div className="space-y-1.5 sm:space-y-2 mt-1.5 sm:mt-2">
                    {dayEvents.slice(0, 2).map((event) => (
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
                          w-full text-left px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-3 md:py-2.5 rounded-lg
                          text-xs sm:text-sm md:text-base font-semibold
                          transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
                          cursor-pointer relative z-10 min-h-[36px] sm:min-h-[40px] md:min-h-[44px]
                          flex flex-col justify-center
                          ${getStatusColor(event.status)}
                        `}
                        title={event.title}
                        style={{
                          display: 'flex',
                          opacity: 1,
                          visibility: 'visible',
                          pointerEvents: 'auto',
                        }}
                      >
                        <div className="truncate font-semibold text-white text-xs sm:text-sm md:text-base leading-tight mb-0.5">
                          {event.title}
                        </div>
                        {event.time && (
                          <div className="text-[11px] sm:text-xs md:text-sm text-white/90 truncate font-medium">
                            {event.time}
                          </div>
                        )}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[11px] sm:text-xs md:text-sm text-indigo-700 font-semibold px-2 py-1 sm:px-2.5 sm:py-1.5 bg-indigo-100 rounded-lg border border-indigo-200 min-h-[28px] flex items-center justify-center">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Elegant Legend */}
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
    </div>
  )
}


