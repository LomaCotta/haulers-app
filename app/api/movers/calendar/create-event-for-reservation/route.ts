import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const calendar = google.calendar('v3')
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
})

export async function POST(request: NextRequest) {
  try {
    const { quoteId, startISO, endISO, summary = 'Mover Job', description = '', location = '' } = await request.json()
    if (!quoteId || !startISO || !endISO) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID
    if (!calendarId) return NextResponse.json({ error: 'Calendar not configured' }, { status: 503 })

    const response = await calendar.events.insert({
      auth,
      calendarId,
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: startISO, timeZone: 'America/Los_Angeles' },
        end: { dateTime: endISO, timeZone: 'America/Los_Angeles' },
      },
      conferenceDataVersion: 1,
    })

    const created = response.data
    return NextResponse.json({ success: true, event: { id: created.id, link: created.htmlLink, start: created.start?.dateTime, end: created.end?.dateTime, summary: created.summary } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create calendar event'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


