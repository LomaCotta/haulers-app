export interface ServiceCategory {
  id: string
  name: string
  subdomain: string
  description: string
  icon: string
  parentCategory?: string
  keywords: string[]
  seoTitle: string
  seoDescription: string
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  // Home & Property Services
  {
    id: 'movers',
    name: 'Movers',
    subdomain: 'movers',
    description: 'Professional moving and relocation services',
    icon: '🚚',
    parentCategory: 'Home & Property Services',
    keywords: ['moving', 'relocation', 'furniture', 'packing', 'unpacking'],
    seoTitle: 'Professional Movers - Find Local Moving Services',
    seoDescription: 'Find trusted local movers for your next move. Get quotes from verified moving companies in your area.'
  },
  {
    id: 'plumbers',
    name: 'Plumbers',
    subdomain: 'plumbers',
    description: 'Licensed plumbing services and repairs',
    icon: '🔧',
    parentCategory: 'Home & Property Services',
    keywords: ['plumbing', 'pipes', 'drains', 'toilets', 'faucets', 'water heater'],
    seoTitle: 'Local Plumbers - Emergency Plumbing Services',
    seoDescription: 'Find licensed plumbers for emergency repairs, installations, and maintenance. Available 24/7.'
  },
  {
    id: 'electricians',
    name: 'Electricians',
    subdomain: 'electricians',
    description: 'Licensed electrical services and repairs',
    icon: '⚡',
    keywords: ['electrical', 'wiring', 'outlets', 'lighting', 'electrical panel'],
    seoTitle: 'Licensed Electricians - Electrical Services',
    seoDescription: 'Find certified electricians for electrical repairs, installations, and safety inspections.'
  },
  {
    id: 'hvac',
    name: 'HVAC Services',
    subdomain: 'hvac',
    description: 'Heating, ventilation, and air conditioning services',
    icon: '🌡️',
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac repair'],
    seoTitle: 'HVAC Services - Heating & Cooling Repair',
    seoDescription: 'Professional HVAC services for heating, cooling, and air quality systems.'
  },
  {
    id: 'roofers',
    name: 'Roofers',
    subdomain: 'roofers',
    description: 'Roofing installation, repair, and maintenance',
    icon: '🏠',
    keywords: ['roofing', 'roof repair', 'shingles', 'gutters', 'roof installation'],
    seoTitle: 'Professional Roofers - Roof Repair & Installation',
    seoDescription: 'Find experienced roofers for repairs, installations, and maintenance.'
  },
  {
    id: 'cleaners',
    name: 'House Cleaners',
    subdomain: 'cleaners',
    description: 'Professional house cleaning services',
    icon: '🧽',
    keywords: ['cleaning', 'house cleaning', 'deep clean', 'regular cleaning'],
    seoTitle: 'Professional House Cleaners - Cleaning Services',
    seoDescription: 'Find reliable house cleaners for regular and deep cleaning services.'
  },
  {
    id: 'handymen',
    name: 'Handymen',
    subdomain: 'handymen',
    description: 'General handyman and repair services',
    icon: '🔨',
    keywords: ['handyman', 'repairs', 'maintenance', 'fixes', 'home improvement'],
    seoTitle: 'Local Handymen - Home Repair Services',
    seoDescription: 'Find skilled handymen for home repairs, maintenance, and improvements.'
  },
  {
    id: 'painters',
    name: 'Painters',
    subdomain: 'painters',
    description: 'Interior and exterior painting services',
    icon: '🎨',
    keywords: ['painting', 'interior painting', 'exterior painting', 'color consultation'],
    seoTitle: 'Professional Painters - Interior & Exterior Painting',
    seoDescription: 'Find experienced painters for interior and exterior painting projects.'
  },
  {
    id: 'landscapers',
    name: 'Landscapers',
    subdomain: 'landscapers',
    description: 'Landscaping and lawn care services',
    icon: '🌱',
    keywords: ['landscaping', 'lawn care', 'gardening', 'yard maintenance'],
    seoTitle: 'Professional Landscapers - Lawn Care & Landscaping',
    seoDescription: 'Find landscapers for lawn care, garden design, and outdoor maintenance.'
  },
  {
    id: 'pestcontrol',
    name: 'Pest Control',
    subdomain: 'pestcontrol',
    description: 'Pest control and extermination services',
    icon: '🐛',
    keywords: ['pest control', 'exterminator', 'pest removal', 'insect control'],
    seoTitle: 'Pest Control Services - Professional Exterminators',
    seoDescription: 'Find licensed pest control professionals for effective pest management.'
  },
  {
    id: 'flooring',
    name: 'Flooring',
    subdomain: 'flooring',
    description: 'Flooring installation and repair services',
    icon: '🏗️',
    keywords: ['flooring', 'hardwood', 'carpet', 'tile', 'floor installation'],
    seoTitle: 'Flooring Services - Installation & Repair',
    seoDescription: 'Find flooring professionals for installation, repair, and maintenance.'
  },
  {
    id: 'locksmiths',
    name: 'Locksmiths',
    subdomain: 'locksmiths',
    description: 'Emergency locksmith and security services',
    icon: '🔐',
    keywords: ['locksmith', 'lock repair', 'key replacement', 'security systems'],
    seoTitle: 'Emergency Locksmiths - 24/7 Lock Services',
    seoDescription: 'Find emergency locksmiths available 24/7 for lockouts and security needs.'
  },
  {
    id: 'appliancerepair',
    name: 'Appliance Repair',
    subdomain: 'appliancerepair',
    description: 'Home appliance repair and maintenance',
    icon: '🔌',
    keywords: ['appliance repair', 'refrigerator', 'washer', 'dryer', 'dishwasher'],
    seoTitle: 'Appliance Repair Services - Home Appliance Fixes',
    seoDescription: 'Find appliance repair specialists for all your home appliances.'
  },
  {
    id: 'carpetcleaning',
    name: 'Carpet Cleaning',
    subdomain: 'carpetcleaning',
    description: 'Professional carpet and upholstery cleaning',
    icon: '🧼',
    keywords: ['carpet cleaning', 'upholstery', 'rug cleaning', 'deep clean'],
    seoTitle: 'Professional Carpet Cleaning Services',
    seoDescription: 'Find carpet cleaning professionals for deep cleaning and stain removal.'
  },
  {
    id: 'windowcleaning',
    name: 'Window Cleaning',
    subdomain: 'windowcleaning',
    description: 'Professional window cleaning services',
    icon: '🪟',
    keywords: ['window cleaning', 'glass cleaning', 'exterior windows'],
    seoTitle: 'Professional Window Cleaning Services',
    seoDescription: 'Find window cleaning professionals for residential and commercial properties.'
  },
  {
    id: 'junkremoval',
    name: 'Junk Removal',
    subdomain: 'junkremoval',
    description: 'Junk removal and hauling services',
    icon: '🗑️',
    keywords: ['junk removal', 'hauling', 'trash removal', 'debris cleanup'],
    seoTitle: 'Junk Removal Services - Professional Hauling',
    seoDescription: 'Find junk removal services for furniture, debris, and unwanted items.'
  },
  {
    id: 'waterdamage',
    name: 'Water Damage',
    subdomain: 'waterdamage',
    description: 'Water damage restoration and repair',
    icon: '💧',
    keywords: ['water damage', 'flood repair', 'restoration', 'mold removal'],
    seoTitle: 'Water Damage Restoration Services',
    seoDescription: 'Find water damage restoration specialists for emergency repairs.'
  },
  {
    id: 'solarinstallers',
    name: 'Solar Installers',
    subdomain: 'solarinstallers',
    description: 'Solar panel installation and maintenance',
    icon: '☀️',
    keywords: ['solar panels', 'solar installation', 'renewable energy', 'solar repair'],
    seoTitle: 'Solar Panel Installation Services',
    seoDescription: 'Find certified solar installers for residential and commercial projects.'
  },
  {
    id: 'fenceinstallers',
    name: 'Fence Installers',
    subdomain: 'fenceinstallers',
    description: 'Fence installation and repair services',
    icon: '🚧',
    keywords: ['fence installation', 'fence repair', 'fencing', 'privacy fence'],
    seoTitle: 'Fence Installation Services - Professional Fencing',
    seoDescription: 'Find fence installation professionals for all types of fencing.'
  },
  {
    id: 'garagedoors',
    name: 'Garage Doors',
    subdomain: 'garagedoors',
    description: 'Garage door installation and repair',
    icon: '🚪',
    keywords: ['garage door', 'garage door repair', 'garage door installation'],
    seoTitle: 'Garage Door Services - Installation & Repair',
    seoDescription: 'Find garage door specialists for installation, repair, and maintenance.'
  },

  // Auto & Transport
  {
    id: 'autorepair',
    name: 'Auto Repair',
    subdomain: 'autorepair',
    description: 'Automotive repair and maintenance services',
    icon: '🚗',
    keywords: ['auto repair', 'car repair', 'mechanic', 'automotive service'],
    seoTitle: 'Auto Repair Services - Professional Mechanics',
    seoDescription: 'Find certified auto mechanics for all your vehicle repair needs.'
  },
  {
    id: 'mobilemechanics',
    name: 'Mobile Mechanics',
    subdomain: 'mobilemechanics',
    description: 'On-site automotive repair services',
    icon: '🔧',
    keywords: ['mobile mechanic', 'on-site repair', 'roadside service'],
    seoTitle: 'Mobile Mechanics - On-Site Auto Repair',
    seoDescription: 'Find mobile mechanics who come to you for convenient auto repair.'
  },
  {
    id: 'towing',
    name: 'Towing Services',
    subdomain: 'towing',
    description: 'Vehicle towing and roadside assistance',
    icon: '🚛',
    keywords: ['towing', 'tow truck', 'roadside assistance', 'vehicle recovery'],
    seoTitle: 'Towing Services - 24/7 Vehicle Recovery',
    seoDescription: 'Find reliable towing services for emergency vehicle recovery.'
  },
  {
    id: 'tires',
    name: 'Tire Services',
    subdomain: 'tires',
    description: 'Tire installation, repair, and maintenance',
    icon: '🛞',
    keywords: ['tire repair', 'tire installation', 'tire replacement', 'tire service'],
    seoTitle: 'Tire Services - Installation & Repair',
    seoDescription: 'Find tire specialists for installation, repair, and maintenance.'
  },
  {
    id: 'windshield',
    name: 'Windshield Repair',
    subdomain: 'windshield',
    description: 'Windshield repair and replacement services',
    icon: '🪟',
    keywords: ['windshield repair', 'windshield replacement', 'auto glass'],
    seoTitle: 'Windshield Repair Services - Auto Glass',
    seoDescription: 'Find windshield repair specialists for chips, cracks, and replacements.'
  },

  // Personal, Beauty & Wellness
  {
    id: 'barbers',
    name: 'Barbers',
    subdomain: 'barbers',
    description: 'Professional barbering services',
    icon: '✂️',
    keywords: ['barber', 'haircut', 'beard trim', 'grooming'],
    seoTitle: 'Professional Barbers - Haircuts & Grooming',
    seoDescription: 'Find skilled barbers for haircuts, beard trims, and grooming services.'
  },
  {
    id: 'salons',
    name: 'Hair Salons',
    subdomain: 'salons',
    description: 'Hair styling and beauty services',
    icon: '💇',
    keywords: ['hair salon', 'hair styling', 'hair color', 'beauty services'],
    seoTitle: 'Hair Salons - Professional Hair Styling',
    seoDescription: 'Find hair salons for cuts, color, styling, and beauty treatments.'
  },
  {
    id: 'massage',
    name: 'Massage Therapy',
    subdomain: 'massage',
    description: 'Professional massage therapy services',
    icon: '💆',
    keywords: ['massage', 'massage therapy', 'therapeutic massage', 'relaxation'],
    seoTitle: 'Massage Therapy Services - Professional Massage',
    seoDescription: 'Find licensed massage therapists for therapeutic and relaxation massage.'
  },
  {
    id: 'personaltrainers',
    name: 'Personal Trainers',
    subdomain: 'personaltrainers',
    description: 'Personal fitness training and coaching',
    icon: '💪',
    keywords: ['personal trainer', 'fitness coach', 'workout', 'training'],
    seoTitle: 'Personal Trainers - Fitness Coaching',
    seoDescription: 'Find certified personal trainers for fitness coaching and training.'
  },
  {
    id: 'tattoo',
    name: 'Tattoo Artists',
    subdomain: 'tattoo',
    description: 'Professional tattoo and body art services',
    icon: '🎨',
    keywords: ['tattoo', 'tattoo artist', 'body art', 'tattoo removal'],
    seoTitle: 'Tattoo Artists - Professional Body Art',
    seoDescription: 'Find skilled tattoo artists for custom body art and designs.'
  },

  // Professional & Financial
  {
    id: 'lawyers',
    name: 'Lawyers',
    subdomain: 'lawyers',
    description: 'Legal services and consultation',
    icon: '⚖️',
    keywords: ['lawyer', 'attorney', 'legal services', 'legal consultation'],
    seoTitle: 'Lawyers - Legal Services & Consultation',
    seoDescription: 'Find experienced lawyers for legal advice and representation.'
  },
  {
    id: 'accountants',
    name: 'Accountants',
    subdomain: 'accountants',
    description: 'Accounting and bookkeeping services',
    icon: '📊',
    keywords: ['accountant', 'bookkeeping', 'tax preparation', 'financial services'],
    seoTitle: 'Accountants - Bookkeeping & Tax Services',
    seoDescription: 'Find certified accountants for bookkeeping and financial services.'
  },
  {
    id: 'taxprep',
    name: 'Tax Preparation',
    subdomain: 'taxprep',
    description: 'Tax preparation and filing services',
    icon: '📋',
    keywords: ['tax preparation', 'tax filing', 'tax services', 'irs'],
    seoTitle: 'Tax Preparation Services - Professional Tax Filing',
    seoDescription: 'Find tax professionals for preparation and filing services.'
  },
  {
    id: 'realestateagents',
    name: 'Real Estate Agents',
    subdomain: 'realestateagents',
    description: 'Real estate buying and selling services',
    icon: '🏘️',
    keywords: ['real estate', 'realtor', 'home buying', 'home selling'],
    seoTitle: 'Real Estate Agents - Buy & Sell Homes',
    seoDescription: 'Find experienced real estate agents for buying and selling properties.'
  },
  {
    id: 'insuranceagents',
    name: 'Insurance Agents',
    subdomain: 'insuranceagents',
    description: 'Insurance services and consultation',
    icon: '🛡️',
    keywords: ['insurance', 'insurance agent', 'coverage', 'policy'],
    seoTitle: 'Insurance Agents - Coverage & Policies',
    seoDescription: 'Find insurance agents for coverage and policy consultation.'
  },

  // Family, Education & Coaching
  {
    id: 'tutors',
    name: 'Tutors',
    subdomain: 'tutors',
    description: 'Private tutoring and educational services',
    icon: '📚',
    keywords: ['tutor', 'tutoring', 'education', 'homework help'],
    seoTitle: 'Private Tutors - Educational Services',
    seoDescription: 'Find qualified tutors for academic support and learning.'
  },
  {
    id: 'musiclessons',
    name: 'Music Lessons',
    subdomain: 'musiclessons',
    description: 'Music instruction and lessons',
    icon: '🎵',
    keywords: ['music lessons', 'piano lessons', 'guitar lessons', 'music teacher'],
    seoTitle: 'Music Lessons - Professional Music Instruction',
    seoDescription: 'Find music teachers for piano, guitar, and other instrument lessons.'
  },
  {
    id: 'childcare',
    name: 'Childcare',
    subdomain: 'childcare',
    description: 'Childcare and babysitting services',
    icon: '👶',
    keywords: ['childcare', 'babysitting', 'nanny', 'child care'],
    seoTitle: 'Childcare Services - Babysitting & Nanny Services',
    seoDescription: 'Find reliable childcare providers and babysitters.'
  },
  {
    id: 'petcare',
    name: 'Pet Care',
    subdomain: 'petcare',
    description: 'Pet walking, sitting, and care services',
    icon: '🐕',
    keywords: ['pet care', 'dog walking', 'pet sitting', 'animal care'],
    seoTitle: 'Pet Care Services - Dog Walking & Pet Sitting',
    seoDescription: 'Find pet care professionals for walking, sitting, and animal care.'
  },
  {
    id: 'photographers',
    name: 'Photographers',
    subdomain: 'photographers',
    description: 'Professional photography services',
    icon: '📸',
    keywords: ['photographer', 'photography', 'portraits', 'event photography'],
    seoTitle: 'Professional Photographers - Photography Services',
    seoDescription: 'Find professional photographers for portraits, events, and special occasions.'
  },

  // Events & Hospitality
  {
    id: 'caterers',
    name: 'Caterers',
    subdomain: 'caterers',
    description: 'Catering and food services',
    icon: '🍽️',
    keywords: ['catering', 'caterer', 'food service', 'event catering'],
    seoTitle: 'Catering Services - Professional Food Service',
    seoDescription: 'Find catering services for events, parties, and special occasions.'
  },
  {
    id: 'eventplanners',
    name: 'Event Planners',
    subdomain: 'eventplanners',
    description: 'Event planning and coordination services',
    icon: '🎉',
    keywords: ['event planning', 'party planning', 'wedding planner', 'event coordinator'],
    seoTitle: 'Event Planners - Professional Event Coordination',
    seoDescription: 'Find event planners for weddings, parties, and corporate events.'
  },
  {
    id: 'djs',
    name: 'DJs',
    subdomain: 'djs',
    description: 'DJ and music entertainment services',
    icon: '🎧',
    keywords: ['dj', 'disc jockey', 'music entertainment', 'party music'],
    seoTitle: 'DJ Services - Music Entertainment',
    seoDescription: 'Find professional DJs for parties, weddings, and events.'
  },
  {
    id: 'venues',
    name: 'Event Venues',
    subdomain: 'venues',
    description: 'Event venue rental and hosting',
    icon: '🏛️',
    keywords: ['event venue', 'venue rental', 'party venue', 'wedding venue'],
    seoTitle: 'Event Venues - Party & Wedding Venues',
    seoDescription: 'Find event venues for parties, weddings, and special occasions.'
  },
  {
    id: 'partyrentals',
    name: 'Party Rentals',
    subdomain: 'partyrentals',
    description: 'Party equipment and rental services',
    icon: '🎈',
    keywords: ['party rentals', 'equipment rental', 'party supplies', 'event rentals'],
    seoTitle: 'Party Rentals - Event Equipment & Supplies',
    seoDescription: 'Find party rental services for equipment, tables, chairs, and decorations.'
  },

  // Facilities, Trades & B2B
  {
    id: 'itservices',
    name: 'IT Services',
    subdomain: 'itservices',
    description: 'Managed IT and technology services',
    icon: '💻',
    keywords: ['it services', 'managed it', 'tech support', 'computer repair'],
    seoTitle: 'IT Services - Managed Technology Support',
    seoDescription: 'Find IT professionals for managed services and tech support.'
  },
  {
    id: 'securitysystems',
    name: 'Security Systems',
    subdomain: 'securitysystems',
    description: 'Security system installation and monitoring',
    icon: '🔒',
    keywords: ['security systems', 'alarm systems', 'surveillance', 'home security'],
    seoTitle: 'Security Systems - Home & Business Security',
    seoDescription: 'Find security system installers for home and business protection.'
  },
  {
    id: 'commercialcleaning',
    name: 'Commercial Cleaning',
    subdomain: 'commercialcleaning',
    description: 'Commercial and office cleaning services',
    icon: '🏢',
    keywords: ['commercial cleaning', 'office cleaning', 'janitorial services'],
    seoTitle: 'Commercial Cleaning Services - Office & Business',
    seoDescription: 'Find commercial cleaning services for offices and businesses.'
  },
  {
    id: 'signage',
    name: 'Signage',
    subdomain: 'signage',
    description: 'Sign design, installation, and maintenance',
    icon: '🪧',
    keywords: ['signage', 'sign design', 'sign installation', 'business signs'],
    seoTitle: 'Signage Services - Business Signs & Design',
    seoDescription: 'Find signage professionals for design, installation, and maintenance.'
  },
  {
    id: 'printers',
    name: 'Printing Services',
    subdomain: 'printers',
    description: 'Printing and document services',
    icon: '🖨️',
    keywords: ['printing', 'print services', 'document printing', 'business cards'],
    seoTitle: 'Printing Services - Business & Document Printing',
    seoDescription: 'Find printing services for business cards, documents, and marketing materials.'
  }
]

export const getCategoryBySubdomain = (subdomain: string): ServiceCategory | undefined => {
  return SERVICE_CATEGORIES.find(category => category.subdomain === subdomain)
}

export const getCategoryById = (id: string): ServiceCategory | undefined => {
  return SERVICE_CATEGORIES.find(category => category.id === id)
}

export const getParentCategories = (): ServiceCategory[] => {
  return SERVICE_CATEGORIES.filter(category => !category.parentCategory)
}

export const getSubCategories = (parentId: string): ServiceCategory[] => {
  return SERVICE_CATEGORIES.filter(category => category.parentCategory === parentId)
}
