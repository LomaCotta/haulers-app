import { z } from 'zod'

// Minimal schema aligned to OneShotMove with defaults for drafts
export const quoteSchema = z.object({
  pickup_address: z.string().optional().default(''),
  dropoff_address: z.string().optional().default(''),
  all_addresses: z.array(z.string()).optional().default([]), // All addresses for furthest calculation
  move_size: z.string().optional().default(''),
  move_date: z.coerce.date().optional(),
  full_name: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),

  // Service options
  packing_help: z.string().optional().default('none'),
  packing_rooms: z.number().int().min(0).optional().default(0),
  packing_materials: z.array(z.object({
    name: z.string(),
    price_cents: z.number(),
    quantity: z.number().optional().default(1)
  })).optional().default([]),
  storage: z.string().optional().default('none'),
  storage_size: z.string().optional().default(''),
  storage_duration: z.string().optional().default(''),
  ins_coverage: z.string().optional().default('base'),
  stairs_flights: z.number().int().min(0).optional().default(0),
  heavy_items: z.array(z.object({
    band: z.string(),
    count: z.number().int().min(0),
    price_cents: z.number().int().min(0)
  })).optional().default([]),

  // Timing
  arrival_time: z.string().optional().default(''),
  pickup_time: z.string().optional().default(''),

  // Team and pricing
  mover_team: z.number().int().min(1).max(8).optional().default(2),
  hourly_rate: z.number().min(100).max(500).optional().default(140),

  // Reservation status
  reservation: z.boolean().optional().default(false),
  status: z.string().optional(),
  reservation_time: z.coerce.date().optional(),

  // Notes
  notes: z.array(z.object({
    name: z.string().default(''),
    note: z.string().default(''),
    date: z.string().default('')
  })).default([]).optional(),

  _debugging: z.any().optional(),
  calendar_event: z.any().optional(),
  current_zip: z.string().optional(),
  customer_id: z.string().optional(),
  deposit_recieved: z.boolean().optional().default(false),
  destination_zip: z.string().optional(),
  ip: z.string().optional(),
  canceled: z.boolean().optional().default(false),
  lead: z.boolean().optional().default(true),
  move_date_requested: z.coerce.date().optional(),
  dateWasntAvailable: z.boolean().optional(),
  movers: z.string().optional(),
  payment_type: z.string().optional(),
  promo_code: z.string().optional(),
  quote_id: z.string().optional(),
  recommended_supply: z.string().optional(),
  request_date: z.coerce.date().optional(),
  transaction_id: z.string().optional(),
  quote_time: z.coerce.date().optional(),
  site: z.string().optional(),
  swift: z.any().optional(),
})

export type QuoteInput = z.infer<typeof quoteSchema>


