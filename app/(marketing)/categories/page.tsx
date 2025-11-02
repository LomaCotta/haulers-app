import Link from "next/link"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'haulers.app'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-medium text-gray-900 mb-4 tracking-tight">
              All Service Categories
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Find trusted professionals for any service you need. Each category has its own dedicated subdomain for easy access.
            </p>
          </div>

          {/* Categories by Parent */}
          {Object.entries(categoriesByParent).map(([parentName, categories]) => {
            if (categories.length === 0) return null

            return (
              <div key={parentName} className="mb-20">
                <div className="mb-10">
                  <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">
                    {parentName}
                  </h2>
                  <div className="w-16 h-0.5 bg-orange-500"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => (
                    <Card 
                      key={category.id} 
                      className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
                    >
                      <CardHeader className="pb-4 pt-6">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="text-3xl flex-shrink-0">{category.icon}</div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-medium text-gray-900 mb-1.5">
                              {category.name}
                            </CardTitle>
                            <Badge 
                              variant="outline" 
                              className="text-xs font-mono bg-gray-50 border-gray-200 text-gray-600 px-2 py-0.5"
                            >
                              {category.subdomain}.haulers.app
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="text-sm text-gray-600 leading-relaxed">
                          {category.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 pb-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-xs text-gray-700 mb-2 uppercase tracking-wide">
                              Popular Services
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {category.keywords.slice(0, 4).map((keyword) => (
                                <Badge 
                                  key={keyword} 
                                  variant="secondary" 
                                  className="text-xs font-normal bg-gray-100 text-gray-700 border-0 px-2 py-0.5 rounded"
                                >
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-100">
                            <Link 
                              href={`https://${category.subdomain}.${ROOT_DOMAIN}/find?search=${encodeURIComponent(category.name.toLowerCase())}`}
                              className="group/link"
                            >
                              <div className="flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors duration-200">
                                <span>Browse {category.name} Services</span>
                                <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
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
          <div className="mt-20 text-center">
            <Card className="max-w-2xl mx-auto border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-10">
                <h3 className="text-2xl md:text-3xl font-medium text-gray-900 mb-3 tracking-tight">
                  Don't See Your Service?
                </h3>
                <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-lg mx-auto">
                  We're always adding new service categories. Contact us to suggest a new category or join as a provider.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/auth/signup?role=provider">
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-8 text-sm font-medium rounded-lg">
                      Join as Provider
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button 
                      variant="outline" 
                      className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium h-11 px-8 text-sm rounded-lg"
                    >
                      Suggest New Category
                    </Button>
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
