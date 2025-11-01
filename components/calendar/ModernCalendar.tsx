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
    
    // Also normalize event dates to handle timezone issues
    const matchingEvents = events.filter(e => {
      let eventDateStr = e.date
      // If event date is a Date object or needs parsing
      if (eventDateStr) {
        // Try to parse if it's not already YYYY-MM-DD
        try {
          const eventDate = new Date(eventDateStr)
          if (!isNaN(eventDate.getTime())) {
            const eventYear = eventDate.getFullYear()
            const eventMonth = String(eventDate.getMonth() + 1).padStart(2, '0')
            const eventDay = String(eventDate.getDate()).padStart(2, '0')
            eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`
          }
        } catch (err) {
          // If it's already YYYY-MM-DD, keep it
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
        return 'bg-blue-100 border-blue-300 text-blue-700'
      case 'in_progress':
        return 'bg-orange-100 border-orange-300 text-orange-700'
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-700'
      case 'cancelled':
        return 'bg-gray-100 border-gray-300 text-gray-500'
      default:
        return 'bg-purple-100 border-purple-300 text-purple-700'
    }
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="text-xl font-bold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-bold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="h-24" />
            }

            const disabled = isDateDisabled(date)
            const todayDate = isToday(date)
            const dayEvents = getEventsForDate(date)

            return (
              <div
                key={date.toISOString()}
                className={`
                  min-h-24 p-1.5 rounded-lg border transition-all duration-150
                  ${disabled 
                    ? 'bg-gray-50 border-gray-100' 
                    : todayDate
                      ? 'bg-orange-50 border-2 border-orange-400 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-1">
                  <button
                    type="button"
                    onClick={() => !disabled && onDateClick?.(date)}
                    disabled={disabled}
                    className={`
                      text-sm font-semibold transition-colors
                      ${disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : todayDate
                          ? 'text-orange-700'
                          : 'text-gray-900 hover:text-orange-600'
                      }
                    `}
                  >
                    {date.getDate()}
                  </button>
                </div>
                
                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      className={`
                        w-full text-left px-1.5 py-0.5 rounded text-xs font-medium
                        border truncate transition-all hover:scale-105 hover:shadow-sm
                        ${getStatusColor(event.status)}
                      `}
                      title={event.title}
                    >
                      <div className="truncate">{event.title}</div>
                      {event.time && (
                        <div className="text-[10px] opacity-75 truncate">{event.time}</div>
                      )}
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-gray-500 font-medium px-1.5">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 bg-blue-100 border-blue-300"></div>
            <span className="text-gray-700">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 bg-orange-100 border-orange-300"></div>
            <span className="text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 bg-green-100 border-green-300"></div>
            <span className="text-gray-700">Completed</span>
          </div>
        </div>
      </div>
    </div>
  )
}


