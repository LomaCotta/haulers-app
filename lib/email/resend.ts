import { Resend } from 'resend'

// Helper function to clean API key (remove quotes, trim whitespace)
function cleanApiKey(key: string | undefined): string | null {
  if (!key) return null
  // Remove surrounding quotes (single or double)
  let cleaned = key.trim().replace(/^["']|["']$/g, '')
  // Trim whitespace again after removing quotes
  cleaned = cleaned.trim()
  return cleaned || null
}

// Debug: Log what we're getting from environment
if (typeof process !== 'undefined' && process.env) {
  console.log('[DEBUG] Raw RESEND_API_KEY from process.env:', process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 10)}...` : 'NOT SET')
  console.log('[DEBUG] RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0)
  console.log('[DEBUG] RESEND_API_KEY starts with re_:', process.env.RESEND_API_KEY?.startsWith('re_') || false)
}

// Get cleaned API key
const apiKey = cleanApiKey(process.env.RESEND_API_KEY)

if (apiKey) {
  console.log('[DEBUG] Cleaned API key preview:', apiKey.substring(0, 10) + '...')
  console.log('[DEBUG] Cleaned API key starts with re_:', apiKey.startsWith('re_'))
}

// Initialize Resend client only if we have a valid API key
const resend = apiKey ? new Resend(apiKey) : null

// Default from email - update this to your verified domain
const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const DEFAULT_FROM_NAME = process.env.RESEND_FROM_NAME || 'Haulers.app'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  tags?: string[]
  metadata?: Record<string, string>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Get cleaned API key
    const currentApiKey = cleanApiKey(process.env.RESEND_API_KEY)
    
    if (!currentApiKey) {
      console.error('RESEND_API_KEY is not set')
      return {
        success: false,
        error: 'Email service not configured: RESEND_API_KEY is missing'
      }
    }

    // Create a fresh Resend client instance to ensure clean state
    const resendClient = currentApiKey ? new Resend(currentApiKey) : null
    
    if (!resendClient) {
      return {
        success: false,
        error: 'Email service not initialized'
      }
    }

    // Validate API key format (Resend keys start with 're_')
    if (!currentApiKey.startsWith('re_')) {
      console.error('Invalid RESEND_API_KEY format - should start with "re_"')
      console.error('API key preview:', currentApiKey.substring(0, 10) + '...')
      console.error('Raw env var preview:', process.env.RESEND_API_KEY?.substring(0, 10) + '...')
      return {
        success: false,
        error: 'Invalid API key format. Resend API keys should start with "re_". Please check your .env.local file and ensure there are no quotes or extra spaces.'
      }
    }

    // Format the "from" field - Resend accepts both "email" and "Name <email>" formats
    // If a custom from is provided, use it; otherwise use default email
    const fromEmail = options.from || DEFAULT_FROM_EMAIL
    // Use simple email format first (most compatible)
    // Only use name format if explicitly provided
    const fromField = options.from || DEFAULT_FROM_EMAIL
    
    // Ensure we have at least html or text
    if (!options.html && !options.text) {
      return {
        success: false,
        error: 'Either html or text content is required'
      }
    }
    
    // Build a clean email payload - only include fields that have values
    const emailPayload: any = {
      from: fromField,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
    }
    
    // Only include html/text if provided and not empty
    if (options.html && typeof options.html === 'string' && options.html.trim()) {
      emailPayload.html = options.html
    }
    if (options.text && typeof options.text === 'string' && options.text.trim()) {
      emailPayload.text = options.text
    }
    
    // Optional fields - only add if they have valid values
    if (options.replyTo && typeof options.replyTo === 'string' && options.replyTo.trim()) {
      emailPayload.reply_to = options.replyTo.trim()
    }
    if (options.cc) {
      const ccArray = Array.isArray(options.cc) ? options.cc : [options.cc]
      const validCc = ccArray.filter((email): email is string => 
        typeof email === 'string' && email.trim().length > 0
      )
      if (validCc.length > 0) {
        emailPayload.cc = validCc
      }
    }
    if (options.bcc) {
      const bccArray = Array.isArray(options.bcc) ? options.bcc : [options.bcc]
      const validBcc = bccArray.filter((email): email is string => 
        typeof email === 'string' && email.trim().length > 0
      )
      if (validBcc.length > 0) {
        emailPayload.bcc = validBcc
      }
    }
    if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
      const validTags = options.tags.filter((tag): tag is string => 
        typeof tag === 'string' && tag.trim().length > 0
      )
      if (validTags.length > 0) {
        emailPayload.tags = validTags
      }
    }
    if (options.metadata && typeof options.metadata === 'object' && options.metadata !== null) {
      const validMetadata: Record<string, string> = {}
      for (const [key, value] of Object.entries(options.metadata)) {
        if (key && value && typeof value === 'string' && value.trim()) {
          validMetadata[key] = value.trim()
        }
      }
      if (Object.keys(validMetadata).length > 0) {
        emailPayload.metadata = validMetadata
      }
    }

    // Remove any undefined values that might have slipped through
    Object.keys(emailPayload).forEach(key => {
      if (emailPayload[key] === undefined) {
        delete emailPayload[key]
      }
    })

    // Debug: Log the exact payload being sent (sanitized for security)
    console.log('[DEBUG] Resend payload keys:', Object.keys(emailPayload))
    console.log('[DEBUG] Resend payload structure:', JSON.stringify({
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      hasHtml: !!emailPayload.html,
      hasText: !!emailPayload.text,
      hasReplyTo: !!emailPayload.reply_to,
      hasCc: !!emailPayload.cc,
      hasBcc: !!emailPayload.bcc,
      hasTags: !!emailPayload.tags,
      hasMetadata: !!emailPayload.metadata
    }, null, 2))
    console.log('[DEBUG] Full payload (sanitized):', JSON.stringify({
      ...emailPayload,
      html: emailPayload.html ? `[${emailPayload.html.length} chars]` : undefined,
      text: emailPayload.text ? `[${emailPayload.text.length} chars]` : undefined
    }, null, 2))

    const { data, error } = await resendClient.emails.send(emailPayload)
    
    if (error) {
      console.error('[DEBUG] Resend error object:', error)
      console.error('[DEBUG] Resend error type:', typeof error)
      console.error('[DEBUG] Resend error keys:', Object.keys(error))
      console.error('[DEBUG] Full error details:', JSON.stringify(error, null, 2))
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Failed to send email'
      
      // Check for validation errors
      if (error.message?.includes('Invalid literal') || error.message?.includes('validation_error')) {
        errorMessage = `Email validation error. Please check the server console for detailed error information. The error may be related to the email payload format. Domain "${fromEmail.split('@')[1]}" appears to be verified.`
      } else if (error.message?.includes('API key') || error.message?.includes('Invalid') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Invalid API key. Please check your RESEND_API_KEY in .env.local. Make sure it starts with "re_" and is correct. You may need to regenerate the key in your Resend dashboard.'
      } else if (error.message?.includes('domain') || error.message?.includes('not verified')) {
        errorMessage = 'Domain not verified. Please verify your domain in Resend dashboard or use onboarding@resend.dev for testing.'
      } else if (error.message?.includes('from')) {
        errorMessage = `Invalid "from" email address. Please verify the domain "${fromEmail.split('@')[1]}" in Resend or use onboarding@resend.dev for testing.`
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
    
    return {
      success: true,
      messageId: data?.id
    }
  } catch (outerError: any) {
    // Catch any unexpected errors outside the try-catch
    console.error('Unexpected error sending email:', outerError)
    return {
      success: false,
      error: outerError.message || 'Unknown error occurred'
    }
  }
}

/**
 * Send a transactional email with template
 */
export async function sendTransactionalEmail(
  to: string | string[],
  template: 'booking-confirmation' | 'booking-reminder' | 'booking-update' | 'invoice' | 'quote',
  data: Record<string, any>,
  options?: Partial<EmailOptions>
): Promise<EmailResult> {
  // Import templates dynamically
  const { getEmailTemplate } = await import('./templates')
  const templateData = getEmailTemplate(template, data)

  return sendEmail({
    to,
    subject: templateData.subject,
    html: templateData.html,
    text: templateData.text,
    ...options
  })
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set')
    return false
  }
  return true
}

