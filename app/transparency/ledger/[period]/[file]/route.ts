import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ period: string; file: string }> }
) {
  const { period, file } = await params
  
  // Log the suspicious request
  console.log(`Suspicious request to: /transparency/ledger/${period}/${file}`)
  
  // Return 404 for any file requests (CSV, JSON, etc.)
  return new NextResponse('Not Found', { 
    status: 404,
    headers: {
      'Content-Type': 'text/plain',
    }
  })
}

