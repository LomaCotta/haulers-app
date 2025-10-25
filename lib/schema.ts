import { z } from 'zod'

// Profile schemas
export const profileRoleSchema = z.enum(['consumer', 'provider', 'admin'])

export const profileSchema = z.object({
  id: z.string().uuid(),
  role: profileRoleSchema.default('consumer'),
  full_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  phone: z.string().optional(),
  created_at: z.date(),
})

// Business schemas
export const serviceTypeSchema = z.enum([
  'moving',
  'junk_haul',
  'packing',
  'piano',
  'storage',
  'cleaning'
])

export const businessSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  logo_url: z.string().url().optional(),
  photos: z.array(z.string().url()).default([]),
  base_rate_cents: z.number().int().positive().optional(),
  hourly_rate_cents: z.number().int().positive().optional(),
  verified: z.boolean().default(false),
  license_number: z.string().optional(),
  insurance_url: z.string().url().optional(),
  service_types: z.array(serviceTypeSchema).default([]),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()])
  }).optional(),
  service_radius_km: z.number().positive().default(25),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('US'),
  rating_avg: z.number().min(0).max(5).default(0),
  rating_count: z.number().int().min(0).default(0),
  created_at: z.date(),
})

// Booking schemas
export const bookingStatusSchema = z.enum([
  'requested',
  'quoted',
  'accepted',
  'scheduled',
  'completed',
  'canceled'
])

export const bookingDetailsSchema = z.object({
  size: z.enum(['studio', '1br', '2br', '3br', '4br+', 'commercial']),
  from_address: z.string(),
  to_address: z.string(),
  stairs: z.boolean().default(false),
  elevator: z.boolean().default(false),
  special_items: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export const bookingSchema = z.object({
  id: z.string().uuid(),
  consumer_id: z.string().uuid(),
  business_id: z.string().uuid(),
  status: bookingStatusSchema.default('requested'),
  move_date: z.date(),
  details: bookingDetailsSchema,
  quote_cents: z.number().int().positive().optional(),
  deposit_cents: z.number().int().positive().optional(),
  stripe_payment_intent: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
})

// Review schemas
export const reviewSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  consumer_id: z.string().uuid(),
  business_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().optional(),
  photos: z.array(z.string().url()).default([]),
  created_at: z.date(),
})

// Message schemas
export const messageSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  body: z.string().min(1),
  created_at: z.date(),
})

// Ledger schemas
export const ledgerCategorySchema = z.enum([
  'income_fees',
  'donations',
  'infra_costs',
  'staff',
  'grants',
  'reserves',
  'other'
])

export const ledgerEntrySchema = z.object({
  id: z.string().uuid(),
  period_month: z.date(),
  category: ledgerCategorySchema,
  amount_cents: z.number().int(),
  note: z.string().optional(),
  created_at: z.date(),
})

// API request/response schemas
export const searchRequestSchema = z.object({
  query: z.string().optional(),
  bbox: z.array(z.number()).length(4).optional(), // [minLng, minLat, maxLng, maxLat]
  filters: z.object({
    service_types: z.array(serviceTypeSchema).optional(),
    min_rating: z.number().min(0).max(5).optional(),
    max_price: z.number().int().positive().optional(),
    verified_only: z.boolean().optional(),
    max_distance_km: z.number().positive().optional(),
  }).optional(),
  sort: z.enum(['relevance', 'rating', 'price', 'distance']).default('relevance'),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

export const createBookingRequestSchema = z.object({
  business_id: z.string().uuid(),
  move_date: z.string().datetime(),
  details: bookingDetailsSchema,
})

export const quoteRequestSchema = z.object({
  quote_cents: z.number().int().positive(),
  deposit_cents: z.number().int().positive(),
})

export const createReviewRequestSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().optional(),
  photos: z.array(z.string().url()).default([]),
})

export const createMessageRequestSchema = z.object({
  booking_id: z.string().uuid(),
  body: z.string().min(1),
})

// Type exports
export type Profile = z.infer<typeof profileSchema>
export type ProfileRole = z.infer<typeof profileRoleSchema>
export type Business = z.infer<typeof businessSchema>
export type ServiceType = z.infer<typeof serviceTypeSchema>
export type Booking = z.infer<typeof bookingSchema>
export type BookingStatus = z.infer<typeof bookingStatusSchema>
export type BookingDetails = z.infer<typeof bookingDetailsSchema>
export type Review = z.infer<typeof reviewSchema>
export type Message = z.infer<typeof messageSchema>
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>
export type LedgerCategory = z.infer<typeof ledgerCategorySchema>
export type SearchRequest = z.infer<typeof searchRequestSchema>
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>
export type QuoteRequest = z.infer<typeof quoteRequestSchema>
export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>
export type CreateMessageRequest = z.infer<typeof createMessageRequestSchema>
