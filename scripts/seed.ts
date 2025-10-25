import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Sample data for Los Angeles area
const LA_COORDINATES = [
  { lat: 34.0522, lng: -118.2437, city: 'Los Angeles' },
  { lat: 34.0736, lng: -118.4004, city: 'Santa Monica' },
  { lat: 34.1478, lng: -118.1445, city: 'Pasadena' },
  { lat: 33.7701, lng: -118.1937, city: 'Long Beach' },
  { lat: 34.1808, lng: -118.3090, city: 'Burbank' },
  { lat: 34.0195, lng: -118.4912, city: 'Beverly Hills' },
  { lat: 34.0689, lng: -118.4452, city: 'West Hollywood' },
  { lat: 34.0736, lng: -118.4004, city: 'Venice' },
  { lat: 34.0259, lng: -118.7798, city: 'Malibu' },
  { lat: 34.0522, lng: -118.2437, city: 'Downtown LA' },
]

const SERVICE_TYPES = ['moving', 'junk_haul', 'packing', 'piano', 'storage', 'cleaning']
const BUSINESS_NAMES = [
  'Reliable Movers LA',
  'Quick Haul Services',
  'Professional Moving Co',
  'Eco-Friendly Haulers',
  'Premium Moving Solutions',
  'Fast Track Movers',
  'Trusted Hauling Co',
  'Efficient Moving Services',
  'Green Haul Solutions',
  'Speedy Movers LA',
  'Quality Moving Co',
  'Reliable Haulers',
  'Professional Packing',
  'Eco Haul Services',
  'Premium Hauling',
  'Quick Move Solutions',
  'Trusted Moving Co',
  'Efficient Haulers',
  'Green Moving LA',
  'Speedy Haul Co'
]

async function seedProfiles() {
  console.log('Creating profiles...')
  
  // Create 10 sample users (5 consumers, 5 providers)
  const profiles = []
  
  for (let i = 0; i < 10; i++) {
    const isProvider = i >= 5
    const profile = {
      id: faker.string.uuid(),
      role: isProvider ? 'provider' : 'consumer',
      full_name: faker.person.fullName(),
      avatar_url: faker.image.avatar(),
      phone: faker.phone.number(),
    }
    profiles.push(profile)
  }
  
  const { error } = await supabase.from('profiles').insert(profiles)
  if (error) {
    console.error('Error creating profiles:', error)
    return []
  }
  
  console.log(`Created ${profiles.length} profiles`)
  return profiles
}

async function seedBusinesses(providerProfiles: any[]) {
  console.log('Creating businesses...')
  
  const businesses = []
  
  for (let i = 0; i < 20; i++) {
    const coord = faker.helpers.arrayElement(LA_COORDINATES)
    const business = {
      id: faker.string.uuid(),
      owner_id: faker.helpers.arrayElement(providerProfiles).id,
      name: BUSINESS_NAMES[i],
      slug: BUSINESS_NAMES[i].toLowerCase().replace(/\s+/g, '-'),
      description: faker.lorem.paragraph(),
      logo_url: faker.image.url(),
      photos: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.image.url()),
      base_rate_cents: faker.number.int({ min: 5000, max: 15000 }), // $50-$150
      hourly_rate_cents: faker.number.int({ min: 5000, max: 10000 }), // $50-$100/hour
      verified: faker.datatype.boolean(),
      license_number: faker.string.alphanumeric(8).toUpperCase(),
      insurance_url: faker.internet.url(),
      service_types: faker.helpers.arrayElements(SERVICE_TYPES, { min: 1, max: 3 }),
      location: {
        type: 'Point',
        coordinates: [coord.lng, coord.lat]
      },
      service_radius_km: faker.number.int({ min: 10, max: 50 }),
      address: faker.location.streetAddress(),
      city: coord.city,
      state: 'CA',
      postal_code: faker.location.zipCode(),
      country: 'US',
      rating_avg: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
      rating_count: faker.number.int({ min: 0, max: 50 }),
    }
    businesses.push(business)
  }
  
  const { error } = await supabase.from('businesses').insert(businesses)
  if (error) {
    console.error('Error creating businesses:', error)
    return []
  }
  
  console.log(`Created ${businesses.length} businesses`)
  return businesses
}

async function seedBookings(consumerProfiles: any[], businesses: any[]) {
  console.log('Creating bookings...')
  
  const bookings = []
  const statuses = ['requested', 'quoted', 'accepted', 'scheduled', 'completed', 'canceled']
  
  for (let i = 0; i < 15; i++) {
    const consumer = faker.helpers.arrayElement(consumerProfiles)
    const business = faker.helpers.arrayElement(businesses)
    const status = faker.helpers.arrayElement(statuses)
    
    const booking = {
      id: faker.string.uuid(),
      consumer_id: consumer.id,
      business_id: business.id,
      status,
      move_date: faker.date.future().toISOString().split('T')[0],
      details: {
        size: faker.helpers.arrayElement(['studio', '1br', '2br', '3br', '4br+', 'commercial']),
        from_address: faker.location.streetAddress(),
        to_address: faker.location.streetAddress(),
        stairs: faker.datatype.boolean(),
        elevator: faker.datatype.boolean(),
        special_items: faker.helpers.arrayElements(['piano', 'artwork', 'antiques', 'electronics'], { min: 0, max: 2 }),
        notes: faker.lorem.sentence(),
      },
      quote_cents: status !== 'requested' ? faker.number.int({ min: 10000, max: 50000 }) : null,
      deposit_cents: status === 'accepted' || status === 'scheduled' || status === 'completed' ? faker.number.int({ min: 1000, max: 10000 }) : null,
      stripe_payment_intent: status === 'accepted' || status === 'scheduled' || status === 'completed' ? faker.string.alphanumeric(20) : null,
    }
    bookings.push(booking)
  }
  
  const { error } = await supabase.from('bookings').insert(bookings)
  if (error) {
    console.error('Error creating bookings:', error)
    return []
  }
  
  console.log(`Created ${bookings.length} bookings`)
  return bookings
}

async function seedReviews(bookings: any[]) {
  console.log('Creating reviews...')
  
  const completedBookings = bookings.filter(b => b.status === 'completed')
  const reviews = []
  
  for (const booking of completedBookings) {
    const review = {
      id: faker.string.uuid(),
      booking_id: booking.id,
      consumer_id: booking.consumer_id,
      business_id: booking.business_id,
      rating: faker.number.int({ min: 1, max: 5 }),
      body: faker.lorem.paragraph(),
      photos: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => faker.image.url()),
    }
    reviews.push(review)
  }
  
  if (reviews.length > 0) {
    const { error } = await supabase.from('reviews').insert(reviews)
    if (error) {
      console.error('Error creating reviews:', error)
    } else {
      console.log(`Created ${reviews.length} reviews`)
    }
  }
  
  return reviews
}

async function seedLedgerEntries() {
  console.log('Creating ledger entries...')
  
  const entries = []
  const categories = ['income_fees', 'donations', 'infra_costs', 'staff', 'grants', 'reserves', 'other']
  
  // Create entries for the last 3 months
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const date = new Date()
    date.setMonth(date.getMonth() - monthOffset)
    date.setDate(1) // First of the month
    
    for (const category of categories) {
      const entry = {
        id: faker.string.uuid(),
        period_month: date.toISOString().split('T')[0],
        category,
        amount_cents: faker.number.int({ min: -50000, max: 100000 }),
        note: faker.lorem.sentence(),
      }
      entries.push(entry)
    }
  }
  
  const { error } = await supabase.from('ledger_entries').insert(entries)
  if (error) {
    console.error('Error creating ledger entries:', error)
    return []
  }
  
  console.log(`Created ${entries.length} ledger entries`)
  return entries
}

async function main() {
  console.log('Starting database seeding...')
  
  try {
    // Create profiles
    const allProfiles = await seedProfiles()
    const consumerProfiles = allProfiles.filter(p => p.role === 'consumer')
    const providerProfiles = allProfiles.filter(p => p.role === 'provider')
    
    // Create businesses
    const businesses = await seedBusinesses(providerProfiles)
    
    // Create bookings
    const bookings = await seedBookings(consumerProfiles, businesses)
    
    // Create reviews
    await seedReviews(bookings)
    
    // Create ledger entries
    await seedLedgerEntries()
    
    console.log('Database seeding completed successfully!')
  } catch (error) {
    console.error('Error during seeding:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { main as seedDatabase }
