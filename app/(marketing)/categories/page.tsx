import Link from "next/link"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'haulers.app'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SERVICE_CATEGORIES } from "@/config/service-categories"

export default function CategoriesPage() {
  // Define parent categories and their associated service categories
  const parentCategories = {
    'Home & Property Services': [
      'movers', 'plumbers', 'electricians', 'hvac', 'roofers', 'cleaners', 
      'handymen', 'painters', 'landscapers', 'pestcontrol', 'flooring', 
      'locksmiths', 'appliancerepair', 'carpetcleaning', 'windowcleaning', 
      'junkremoval', 'waterdamage', 'solarinstallers', 'fenceinstallers', 'garagedoors'
    ],
    'Auto & Transport': [
      'autorepair', 'mobilemechanics', 'towing', 'tires', 'windshield'
    ],
    'Personal, Beauty & Wellness': [
      'barbers', 'salons', 'massage', 'personaltrainers', 'tattoo'
    ],
    'Professional & Financial': [
      'lawyers', 'accountants', 'taxprep', 'realestateagents', 'insuranceagents'
    ],
    'Family, Education & Coaching': [
      'tutors', 'musiclessons', 'childcare', 'petcare', 'photographers'
    ],
    'Events & Hospitality': [
      'caterers', 'eventplanners', 'djs', 'venues', 'partyrentals'
    ],
    'Facilities, Trades & B2B': [
      'itservices', 'securitysystems', 'commercialcleaning', 'signage', 'printers'
    ]
  }

  // Group categories by parent category
  const categoriesByParent = Object.entries(parentCategories).reduce((acc, [parentName, categoryIds]) => {
    acc[parentName] = SERVICE_CATEGORIES.filter(category => categoryIds.includes(category.id))
    return acc
  }, {} as Record<string, typeof SERVICE_CATEGORIES>)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              All Service Categories
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find trusted professionals for any service you need. Each category has its own dedicated subdomain for easy access.
            </p>
          </div>

          {/* Categories by Parent */}
          {Object.entries(categoriesByParent).map(([parentName, categories]) => {
            if (categories.length === 0) return null

            return (
              <div key={parentName} className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{parentName}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => (
                    <Card key={category.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">
                              {category.subdomain}.haulers.app
                            </Badge>
                          </div>
                        </div>
                        <CardDescription>
                          {category.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Popular Services:</h4>
                            <div className="flex flex-wrap gap-1">
                              {category.keywords.slice(0, 4).map((keyword) => (
                                <Badge key={keyword} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t">
                            <Link href={`https://${category.subdomain}.${ROOT_DOMAIN}/find?search=${encodeURIComponent(category.name.toLowerCase())}`}>
                              <div className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                Browse {category.name} Services →
                              </div>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Don't See Your Service?</h3>
                <p className="text-gray-600 mb-6">
                  We're always adding new service categories. Contact us to suggest a new category or join as a provider.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/signup?role=provider">
                    <Button>Join as Provider</Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline">Suggest New Category</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
