"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  MapPin, 
  Filter, 
  X, 
  Mic,
  Camera,
  SortAsc,
  Grid3X3,
  List,
  Map
} from "lucide-react"

interface MobileSearchProps {
  onSearch: (query: string, location: string) => void
  onFilter: () => void
  onViewChange: (view: 'list' | 'grid' | 'map') => void
  currentView: 'list' | 'grid' | 'map'
  searchQuery: string
  location: string
  onSearchChange: (query: string) => void
  onLocationChange: (location: string) => void
}

export function MobileSearch({
  onSearch,
  onFilter,
  onViewChange,
  currentView,
  searchQuery,
  location,
  onSearchChange,
  onLocationChange
}: MobileSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSearch = () => {
    onSearch(searchQuery, location)
    setIsExpanded(false)
  }

  return (
    <div className="lg:hidden">
      {/* Compact Search Bar */}
      {!isExpanded && (
        <div className="bg-white border-b p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="What service do you need?"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
                onFocus={() => setIsExpanded(true)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
            <Button variant="outline" size="sm" onClick={onFilter}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Expanded Search */}
      {isExpanded && (
        <div className="bg-white border-b p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Search Services</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="What service do you need?"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>

            <div className="relative">
              <Input
                placeholder="Where are you located?"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                className="pl-10"
              />
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Mic className="h-4 w-4 mr-2" />
                Voice
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Photo
              </Button>
            </div>

            {/* Popular Searches */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Popular Searches</h3>
              <div className="flex flex-wrap gap-2">
                {['Moving', 'Cleaning', 'Plumbing', 'Electrical', 'HVAC', 'Painting'].map((term) => (
                  <Badge
                    key={term}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      onSearchChange(term)
                      handleSearch()
                    }}
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </div>

            <Button onClick={handleSearch} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      )}

      {/* View Controls */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View:</span>
            <div className="flex gap-1">
              <Button
                variant={currentView === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewChange('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={currentView === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewChange('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={currentView === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewChange('map')}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onFilter}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
