'use client';

import { useState } from 'react';
import { Search, Loader2, Package } from 'lucide-react';
import { searchBillableItems } from '@/lib/billing/patientBilling/itemPriceActions';

interface ServiceItem {
  item_id: number;
  name: string;
  description: string;
  price: number;
  price_name: string;
  payment_mode_name: string;
  department_name: string;
}

export default function ServiceCatalogTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setServices([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const results = await searchBillableItems(searchTerm);
      setServices(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search services');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Service Catalog</h2>
        <p className="text-gray-600 mb-4">
          Search for available services and their prices. This is a read-only reference.
        </p>
        
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search services by name or description..."
            className="flex-1 border rounded-lg px-4 py-2"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : hasSearched ? (
        services.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No services found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.item_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-800">{service.name}</h3>
                  <span className="font-bold text-blue-600">
                    ${service.price?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {service.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {service.department_name && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {service.department_name}
                    </span>
                  )}
                  {service.payment_mode_name && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {service.payment_mode_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Enter a search term to find services</p>
          <p className="text-sm mt-2">Try searching for "Consultation", "Lab Test", etc.</p>
        </div>
      )}
    </div>
  );
}