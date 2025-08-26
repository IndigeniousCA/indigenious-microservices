'use client';

import { useState } from 'react';
import { IndigiousVerifiedBadge } from '@/lib/brand/brand-components';
import { Search, Filter, MapPin, Briefcase, Star, TrendingUp, Award, CheckCircle } from 'lucide-react';

interface SupplierResult {
  id: string;
  name: string;
  category: string;
  location: string;
  indigenousOwnership: number;
  rating: number;
  contractCapacity: string;
  pastPerformance: number; // percentage
  readyToContract: boolean;
  naicsCode: string;
  verified: boolean;
}

const mockResults: SupplierResult[] = [
  {
    id: '1',
    name: 'TechNorth Solutions',
    category: 'IT Services',
    location: 'Ottawa, ON',
    indigenousOwnership: 100,
    rating: 4.9,
    contractCapacity: '$500K',
    pastPerformance: 98,
    readyToContract: true,
    naicsCode: '541510',
    verified: true,
  },
  {
    id: '2',
    name: 'Indigenous Facilities Management',
    category: 'Janitorial Services',
    location: 'Toronto, ON',
    indigenousOwnership: 51,
    rating: 4.7,
    contractCapacity: '$250K',
    pastPerformance: 95,
    readyToContract: true,
    naicsCode: '561720',
    verified: true,
  },
  {
    id: '3',
    name: 'Northern Office Supplies',
    category: 'Office Supplies',
    location: 'Winnipeg, MB',
    indigenousOwnership: 100,
    rating: 4.5,
    contractCapacity: '$100K',
    pastPerformance: 92,
    readyToContract: false,
    naicsCode: '453210',
    verified: true,
  },
];

const categories = [
  'All Categories',
  'IT Services',
  'Professional Services',
  'Construction',
  'Janitorial',
  'Office Supplies',
  'Consulting',
];

export default function SupplierSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showReadyOnly, setShowReadyOnly] = useState(true);
  
  const filteredResults = mockResults.filter(supplier => 
    (!showReadyOnly || supplier.readyToContract) &&
    (selectedCategory === 'All Categories' || supplier.category === selectedCategory)
  );
  
  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by service, NAICS code, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showReadyOnly}
              onChange={(e) => setShowReadyOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Ready to contract only</span>
          </label>
        </div>
      </div>
      
      {/* Results */}
      <div className="space-y-3">
        {filteredResults.map((supplier) => (
          <div
            key={supplier.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                  {supplier.verified && <IndigiousVerifiedBadge size="sm" />}
                </div>
                <p className="text-sm text-gray-600">{supplier.category} • NAICS: {supplier.naicsCode}</p>
              </div>
              {supplier.readyToContract && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Ready
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{supplier.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Cap: {supplier.contractCapacity}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                <span className="text-gray-600">{supplier.rating} rating</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-gray-600">{supplier.pastPerformance}% performance</span>
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {supplier.indigenousOwnership}% Indigenous owned
              </span>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
                View Profile →
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Quick Tip */}
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">💡 Pro Tip:</span> Suppliers marked as "Ready" have all 
          required documentation and can start contracts immediately, helping you meet your 5% target faster.
        </p>
      </div>
    </div>
  );
}