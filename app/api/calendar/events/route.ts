import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const events: any[] = []

    if (profile.role === 'provider') {
      // Get provider's scheduled jobs
      const { data: provider } = await supabase
        .from('movers_providers')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle()

      if (provider) {
        // Get scheduled jobs for this provider
        const { data: scheduledJobs } = await supabase
          .from('movers_scheduled_jobs')
          .select(`
            id,
            scheduled_date,
            time_slot,
            scheduled_start_time,
            scheduled_end_time,
            crew_size,
            status,
            quote:quote_id (
              full_name,
              phone,
              email,
              pickup_address,
              dropoff_address,
              price_total_cents
            )
          `)
          .eq('provider_id', provider.id)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate)
          .order('scheduled_date', { ascending: true })

        if (scheduledJobs) {
          scheduledJobs.forEach((job) => {
            const quote = job.quote as any
            events.push({
              id: job.id,
              date: job.scheduled_date,
              title: quote?.full_name || 'Reservation',
              time: `${job.scheduled_start_time} - ${job.scheduled_end_time}`,
              type: 'reservation',
              status: job.status,
              metadata: {
                customer: quote?.full_name,
                address: quote?.pickup_address,
                price: quote?.price_total_cents || 0,
                crewSize: job.crew_size,
                timeSlot: job.time_slot,
              },
            })
          })
        }
      }
    } else if (profile.role === 'consumer') {
      // Get consumer's bookings/reservations
      // Match by email or user ID in quotes
      const { data: quotes } = await supabase
        .from('movers_quotes')
        .select('id, email, customer_id')
        .or(`email.eq.${user.email},customer_id.eq.${user.id}`)
        .gte('move_date', startDate)
        .lte('move_date', endDate)

      if (quotes && quotes.length > 0) {
        const quoteIds = quotes.map(q => q.id)
        
        // Get scheduled jobs for these quotes
        const { data: scheduledJobs } = await supabase
          .from('movers_scheduled_jobs')
          .select(`
            id,
            scheduled_date,
            time_slot,
            scheduled_start_time,
            scheduled_end_time,
            crew_size,
            status,
            quote_id,
            provider_id
          `)
          .in('quote_id', quoteIds)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate)
          .order('scheduled_date', { ascending: true })

        if (scheduledJobs && scheduledJobs.length > 0) {
          // Get provider and business info for each job
          const providerIds = [...new Set(scheduledJobs.map(j => j.provider_id).filter(Boolean))]
          
          const providersMap = new Map()
          if (providerIds.length > 0) {
            const { data: providers } = await supabase
              .from('movers_providers')
              .select(`
                id,
                business_id,
                businesses!movers_providers_business_id_fkey (
                  name,
                  city,
                  state
                )
              `)
              .in('id', providerIds)

            if (providers) {
              providers.forEach((p: any) => {
                providersMap.set(p.id, p)
              })
            }
          }

          // Get quote details
          const quoteDetailsMap = new Map()
          for (const quote of quotes) {
            const { data: quoteData } = await supabase
              .from('movers_quotes')
              .select('full_name, email, phone, pickup_address, dropoff_address, price_total_cents')
              .eq('id', quote.id)
              .single()
            
            if (quoteData) {
              quoteDetailsMap.set(quote.id, quoteData)
            }
          }

          scheduledJobs.forEach((job) => {
            const quote = quoteDetailsMap.get(job.quote_id)
            const provider = providersMap.get(job.provider_id)
            const business = provider?.businesses as any
            
            events.push({
              id: job.id,
              date: job.scheduled_date,
              title: `Move with ${business?.name || 'Provider'}`,
              time: `${job.scheduled_start_time} - ${job.scheduled_end_time}`,
              type: 'booking',
              status: job.status,
              metadata: {
                customer: quote?.full_name,
                address: quote?.pickup_address,
                price: quote?.price_total_cents || 0,
                crewSize: job.crew_size,
                timeSlot: job.time_slot,
              },
            })
          })
        }
      }
    } else if (profile.role === 'admin') {
      // Admin can see all scheduled jobs
      const { data: scheduledJobs } = await supabase
        .from('movers_scheduled_jobs')
        .select(`
          id,
          scheduled_date,
          time_slot,
          scheduled_start_time,
          scheduled_end_time,
          crew_size,
          status,
          quote_id,
          provider_id,
          quote:quote_id (
            full_name,
            email,
            phone,
            pickup_address,
            dropoff_address,
            price_total_cents
          )
        `)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true })

      if (scheduledJobs) {
        scheduledJobs.forEach((job) => {
          const quote = job.quote as any
          events.push({
            id: job.id,
            date: job.scheduled_date,
            title: quote?.full_name || `Job #${job.id.slice(0, 8)}`,
            time: `${job.scheduled_start_time} - ${job.scheduled_end_time}`,
            type: 'reservation',
            status: job.status,
            metadata: {
              customer: quote?.full_name,
              address: quote?.pickup_address,
              price: quote?.price_total_cents || 0,
              crewSize: job.crew_size,
              timeSlot: job.time_slot,
            },
          })
        })
      }
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error('[Calendar Events API] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch events' 
    }, { status: 500 })
  }
}

