# Haulers.app

A nonprofit, transparent directory and marketplace for local moving and hauling services built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Transparent Marketplace**: Low platform fees with public financial reporting
- **Role-based Access**: Consumers, providers, and admin roles with appropriate permissions
- **Business Management**: Complete CRUD for business profiles with verification
- **Discovery & Search**: Full-text search with filters, map integration, and distance-based results
- **Booking System**: End-to-end booking flow with quotes, deposits, and messaging
- **Review System**: Job-verified reviews with photo support
- **Admin Dashboard**: Provider verification, moderation, and ledger management
- **Transparency Reports**: Monthly public financial ledgers with CSV export

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Storage)
- **Maps**: Mapbox GL
- **Payments**: Stripe
- **Email**: Resend
- **Testing**: Vitest, Playwright, Testing Library
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase account
- Mapbox account
- Stripe account (for payments)

### Environment Setup

1. Copy the environment template:
   ```bash
   cp env.example .env.local
   ```

2. Fill in your environment variables:
   ```bash
   # Site Configuration
   NEXT_PUBLIC_SITE_NAME=Haulers.app
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Mapbox
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Resend (Email)
   RESEND_API_KEY=your_resend_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Movers module (Google Calendar)
   GOOGLE_SERVICE_ACCOUNT_EMAIL=svc-...@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
   GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com
   ```

### Database Setup

1. Create a new Supabase project
2. Run the database migration:
   ```bash
   npm run db:migrate
   ```
3. Seed the database with sample data:
   ```bash
   npm run db:seed
   ```

### Development

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

Run the test suite:
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# All tests
pnpm test:all
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (marketing)/        # Public pages
│   ├── (dashboard)/        # Authenticated pages
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
├── lib/                   # Utilities and configurations
│   ├── supabase/         # Supabase client setup
│   └── schema.ts         # Zod schemas
├── db/                   # Database files
│   └── migrations/       # SQL migrations
├── scripts/              # Utility scripts
└── tests/                # Test files
```

## Key Features

### Authentication & Authorization
- Email/password and magic link authentication
- Role-based access control (consumer, provider, admin)
- Row-level security (RLS) for data protection

### Business Management
- Multi-step business profile creation
- Service area mapping with radius
- Document upload for verification
- Availability calendar management

### Discovery & Search
- Full-text search across business names and descriptions
- Advanced filtering (service type, rating, price, distance)
- Map integration with clustering
- Distance-based sorting

### Booking System
- Quote request and response flow
- Secure deposit payments via Stripe
- Real-time messaging between parties
- Status tracking and notifications

### Transparency
- Monthly financial reports
- Public ledger with CSV export
- Community reinvestment tracking
- Nonprofit financial transparency

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Ensure all environment variables are set in your production environment, including:
- Supabase production URLs and keys
- Stripe production keys
- Mapbox production token
- Resend API key

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@haulers.app or join our community Discord.