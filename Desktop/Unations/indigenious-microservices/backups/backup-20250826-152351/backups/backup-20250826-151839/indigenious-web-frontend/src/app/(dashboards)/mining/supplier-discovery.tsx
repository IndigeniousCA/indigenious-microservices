'use client';

import { useState } from 'react';
import { IndigiousVerifiedBadge } from '@/lib/brand/brand-components';
import { Search, Filter, MapPin, DollarSign, Star, Truck, Clock, Users } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  services: string[];
  location: string;
  distance: number; // km from site
  indigenousOwnership: number; // percentage
  rating: number;
  completedContracts: number;
  availability: 'immediate' | 'busy' | 'booked';
  typicalValue: string;
  verified: boolean;
  certifications: string[];
}

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Northern Heavy Equipment Ltd',
    services: ['Equipment Rental', 'Operators', 'Maintenance'],
    location: 'Thunder Bay, ON',
    distance: 45,
    indigenousOwnership: 100,
    rating: 4.8,
    completedContracts: 23,
    availability: 'immediate',
    typicalValue: '$50K-$200K',
    verified: true,
    certifications: ['ISO 9001', 'COR Certified'],
  },
  {
    id: '2',
    name: 'Eagle Transport Services',
    services: ['Freight', 'Logistics', 'Ice Road Transport'],
    location: 'Sioux Lookout, ON',
    distance: 120,
    indigenousOwnership: 51,
    rating: 4.6,
    completedContracts: 45,
    availability: 'busy',
    typicalValue: '$20K-$100K',
    verified: true,
    certifications: ['Transportation Safety'],
  },
  {
    id: '3',
    name: 'Traditional Land Monitors Inc',
    services: ['Environmental Monitoring', 'TEK Consultation', 'Site Assessment'],
    location: 'Remote - Mobile',
    distance: 0,
    indigenousOwnership: 100,
    rating: 5.0,
    completedContracts: 12,
    availability: 'immediate',
    typicalValue: '$30K-$80K',
    verified: true,
    certifications: ['Environmental Certified'],
  },
];

export default function SupplierDiscovery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  
  const services = ['all', 'Equipment', 'Transport', 'Environmental', 'Construction', 'Catering'];
  
  const getAvailabilityColor = (availability: Supplier['availability']) => {
    switch (availability) {
      case 'immediate': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-yellow-600 bg-yellow-100';
      case 'booked': return 'text-red-600 bg-red-100';
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
          />
        </div>
        <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>
      
      {/* Service Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {services.map((service) => (
          <button
            key={service}
            onClick={() => setSelectedService(service)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
              selectedService === service
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {service}
          </button>
        ))}
      </div>
      
      {/* Supplier List */}
      <div className="space-y-3">
        {mockSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-amber-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                  {supplier.verified && <IndigiousVerifiedBadge size="sm" status="verified" />}
                </div>
                <p className="text-sm text-gray-600">{supplier.services.join(' • ')}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getAvailabilityColor(supplier.availability)}`}>
                {supplier.availability}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{supplier.distance}km away</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{supplier.typicalValue}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                <span className="text-gray-600">{supplier.rating} ({supplier.completedContracts} jobs)</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{supplier.indigenousOwnership}% Indigenous</span>
              </div>
            </div>
            
            {supplier.certifications.length > 0 && (
              <div className="flex gap-2">
                {supplier.certifications.map((cert) => (
                  <span key={cert} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {cert}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Network Value */}
      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <p className="text-sm text-green-800">
          <span className="font-semibold">💡 Cost Savings Alert:</span> Using local Indigenous suppliers 
          could save you <span className="font-semibold">$2.3M annually</span> in transport costs based 
          on your project location.
        </p>
      </div>
    </div>
  );
}