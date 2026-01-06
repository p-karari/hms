'use client';

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Package,
  RefreshCw,
  Search,
  TrendingDown
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
// import { getStockLevels, StockLevel } from '@/actions/stock-report.actions';
import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';
import { getStockLevels, StockLevel } from '@/lib/stockManagement/stockReport';
import { useRouter } from 'next/navigation';

export default function StockLevelsTable() {
  const router = useRouter();
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<any[]>([]);
  const itemsPerPage = 20;

// Fetch initial data
  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch stock levels
  useEffect(() => {
    fetchStockLevels();
  }, [currentPage, searchQuery, locationFilter]);

  const fetchLocations = async () => {
    try {
      // Direct call to our new FHIR-based Server Action
      const data = await getPharmacyLocations();
      
      // Update state with the array of { uuid, display }
      setLocations(data);
    } catch (err) {
      console.error('Failed to load locations:', err);
      // Optional: setLocations([]) to prevent undefined errors in the UI
    }
  };

  const fetchStockLevels = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await getStockLevels({
        locationUuid: locationFilter || undefined,
        startIndex: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        stockItemUuid: searchQuery || undefined
      });

      if (result.success && result.data) {
        setStockLevels(result.data);
        setTotalCount(result.totalCount || result.data.length);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load stock levels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStockLevels();
  };

  const handleExport = async () => {
    try {
      const result = await getStockLevels({
        locationUuid: locationFilter || undefined,
        limit: 1000
      });

      if (result.success && result.data) {
        const headers = ['Item Name', 'Location', 'Quantity', 'Batch', 'Expiration', 'Status', 'Reorder Level', 'Max Stock'];
        const csvRows = [
          headers.join(','),
          ...result.data.map(item => [
            `"${item.stockItemName}"`,
            `"${item.locationName}"`,
            item.quantity,
            `"${item.batchNumber || 'N/A'}"`,
            `"${item.expirationDate || 'N/A'}"`,
            item.stockStatus,
            item.reorderLevel || 'N/A',
            item.maximumStock || 'N/A'
          ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-levels-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export stock levels');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'LOW': return 'bg-yellow-100 text-yellow-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'OVERSTOCK': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysToExpiry = (expirationDate: string | undefined) => {
    if (!expirationDate) return null;
    
    const expiry = new Date(expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTotalPages = () => {
    return Math.ceil(totalCount / itemsPerPage);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Levels</h1>
            <p className="text-gray-600 mt-1">Current inventory across all locations</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchStockLevels}
              disabled={loading}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={stockLevels.length === 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Items
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by item name or UUID..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {locations.map(location => (
                    <option key={location.uuid} value={location.uuid}>
                      {location.display}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {stockLevels.length} of {totalCount} items
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setLocationFilter('');
                  setCurrentPage(1);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Stock Levels Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchStockLevels}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : stockLevels.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stock levels found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Information
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch & Expiry
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stockLevels.map((item) => {
                    const daysToExpiry = getDaysToExpiry(item.expirationDate);
                    const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 30;

                    return (
                      <tr key={`${item.stockItemUuid}-${item.locationUuid}-${item.batchNumber || 'default'}`} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{item.stockItemName}</div>
                              <div className="text-sm text-gray-500">
                                {item.quantity} {item.quantityUom}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.locationName}</div>
                          <div className="text-sm text-gray-500">
                            {item.locationUuid.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <div className={`h-2 w-2 rounded-full mr-2 ${item.belowReorderLevel ? 'bg-red-500' : 'bg-green-500'}`}></div>
                              <span className="font-medium">{item.quantity} {item.quantityUom}</span>
                            </div>
                            {item.reorderLevel !== undefined && (
                              <div className="text-sm text-gray-600">
                                Reorder at: {item.reorderLevel}
                              </div>
                            )}
                            {item.maximumStock !== undefined && (
                              <div className="text-sm text-gray-600">
                                Max: {item.maximumStock}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {item.batchNumber && (
                              <div className="text-sm">
                                <span className="font-medium">Batch:</span> {item.batchNumber}
                              </div>
                            )}
                            {item.expirationDate && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm">{formatDate(item.expirationDate)}</div>
                                  {daysToExpiry !== null && (
                                    <div className={`text-xs ${isExpiringSoon ? 'text-red-600' : 'text-gray-500'}`}>
                                      {daysToExpiry > 0 ? `${daysToExpiry} days left` : 'Expired'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.stockStatus)}`}>
                              {item.stockStatus}
                            </span>
                            {item.belowReorderLevel && (
                              <div className="flex items-center text-sm text-red-600">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Below reorder level
                              </div>
                            )}
                            {item.isExpired && (
                              <div className="flex items-center text-sm text-red-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                Expired
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/pharmacy/stock/items/${item.stockItemUuid}`)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Item"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/stockManagement/operations/new?item=${item.stockItemUuid}&type=adjustment`)}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Adjust Stock"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {getTotalPages() > 1 && (
              <div className="border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {getTotalPages()}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg border ${
                        currentPage === 1
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                      let pageNum;
                      if (getTotalPages() <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= getTotalPages() - 2) {
                        pageNum = getTotalPages() - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 rounded-lg border ${
                            currentPage === pageNum
                              ? 'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === getTotalPages()}
                      className={`p-2 rounded-lg border ${
                        currentPage === getTotalPages()
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-700">
                    {totalCount.toLocaleString()} total items
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Stats */}
      {stockLevels.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stockLevels.filter(item => item.belowReorderLevel).length}
                </div>
                <div className="text-sm text-gray-600">Low Stock Items</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stockLevels.filter(item => {
                    const daysToExpiry = getDaysToExpiry(item.expirationDate);
                    return daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0;
                  }).length}
                </div>
                <div className="text-sm text-gray-600">Expiring Soon</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stockLevels.filter(item => item.isExpired).length}
                </div>
                <div className="text-sm text-gray-600">Expired Items</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <ArrowUpRight className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stockLevels.filter(item => item.quantity === 0).length}
                </div>
                <div className="text-sm text-gray-600">Out of Stock</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}