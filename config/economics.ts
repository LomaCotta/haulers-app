export const economics = {
  // Platform fee configuration
  max_platform_fee_percent: 3,
  default_platform_fee_percent: 2.5,
  
  // Donation configuration
  donation_suggested_percent: 1,
  donation_min_amount_cents: 100, // $1.00
  
  // Transparency settings
  ledger_public: true,
  
  // Fee structure
  stripe_fee_percent: 2.9,
  stripe_fee_fixed_cents: 30, // $0.30
  
  // Minimum amounts
  min_quote_cents: 5000, // $50.00
  min_deposit_cents: 1000, // $10.00
  max_deposit_percent: 50, // 50% of quote
  
  // Currency
  currency: 'USD',
  currency_symbol: '$',
  
  // Ledger categories
  ledger_categories: [
    'income_fees',
    'donations', 
    'infra_costs',
    'staff',
    'grants',
    'reserves',
    'other'
  ] as const,
} as const

export type Economics = typeof economics
