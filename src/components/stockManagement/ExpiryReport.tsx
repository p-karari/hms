'use client';

import {
  AlertTriangle,
  BarChart3,
  Building,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Package,
  RefreshCw,
  TrendingDown,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
// import { getExpiryItems, ExpiryItem } from '@/actions/stock-report.actions';
import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';
import { ExpiryItem, getExpiryItems } from '@/lib/stockManagement/stockReport';
import { useRouter } from 'next/navigation';

export default function ExpiryReport() {
  const router = useRouter();
  const [expiryItems, setExpiryItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>('ALL');
  const [daysThreshold, setDaysThreshold] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const itemsPerPage = 20;

// Load initial data
  useEffect(() => {
    fetchLocations();
  }, []);



  const fetchLocations = async () => {
    try {
      // Call the Server Action directly
      const data = await getPharmacyLocations();
      
      // 'data' is already the array: [{ uuid, display }, ...]
      setLocations(data);
    } catch (err) {
      console.error('Failed to load locations:', err);
      // Optional: setLocations([]) to clear state on error
    }
  };

  const fetchExpiryItems = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await getExpiryItems({
        locationUuid: locationFilter || undefined,
        // expiryStatus: expiryStatusFilter !== 'ALL' ? expiryStatusFilter : undefined,
        expiryThresholdDays: daysThreshold,
        startIndex: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      });

      if (result.success && result.data) {
        setExpiryItems(result.data);
        setTotalCount(result.summary?.totalItems || result.data.length);
        setSummary(result.summary);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load expiry items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

    // Fetch expiry items
  useEffect(() => {
    fetchExpiryItems();
  }, [currentPage, locationFilter, expiryStatusFilter, daysThreshold, fetchExpiryItems]);

  const handleExport = async () => {
    try {
      const result = await getExpiryItems({
        locationUuid: locationFilter || undefined,
        // expiryStatus: expiryStatusFilter !== 'ALL' ? expiryStatusFilter : undefined,
        expiryThresholdDays: daysThreshold,
        limit: 1000
      });

      if (result.success && result.data) {
        const headers = ['Item Name', 'Location', 'Batch', 'Quantity', 'Expiration Date', 'Days to Expiry', 'Status', 'Stock Value'];
        const csvRows = [
          headers.join(','),
          ...result.data.map(item => [
            `"${item.stockItemName}"`,
            `"${item.locationName}"`,
            `"${item.batchNumber}"`,
            item.quantity,
            item.expirationDate,
            item.daysToExpiry,
            item.expiryStatus,
            item.stockValue || 0
          ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expiry-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export expiry report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'CRITICAL': return 'bg-orange-100 text-orange-800';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800';
      case 'SAFE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXPIRED': return <XCircle className="h-4 w-4" />;
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4" />;
      case 'WARNING': return <Clock className="h-4 w-4" />;
      case 'SAFE': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getDaysColor = (days: number) => {
    if (days < 0) return 'text-red-600';
    if (days <= 7) return 'text-red-600';
    if (days <= 30) return 'text-orange-600';
    if (days <= 90) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTotalPages = () => {
    return Math.ceil(totalCount / itemsPerPage);
  };

  const handleRefresh = () => {
    fetchExpiryItems();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expiry Management</h1>
            <p className="text-gray-600 mt-1">Track and manage expiring medications</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={expiryItems.length === 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {locations.map(location => (
                    <option key={location.uuid} value={location.uuid}>
                      {location.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expiry Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Status
              </label>
              <select
                value={expiryStatusFilter}
                onChange={(e) => setExpiryStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="EXPIRED">Expired</option>
                <option value="CRITICAL">Critical (&lt;= 30 days)</option>
                <option value="WARNING">Warning (31-90 days)</option>
                <option value="SAFE">Safe (&gt; 90 days)</option>
              </select>
            </div>

            {/* Days Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days Threshold
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={daysThreshold}
                  onChange={(e) => setDaysThreshold(parseInt(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setLocationFilter('');
                  setExpiryStatusFilter('ALL');
                  setDaysThreshold(30);
                  setCurrentPage(1);
                }}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{summary.totalItems}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{summary.expiredCount}</div>
                <div className="text-sm text-gray-600">Expired</div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{summary.criticalCount}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{summary.warningCount}</div>
                <div className="text-sm text-gray-600">Warning</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  ${summary.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </div>
                <div className="text-sm text-gray-600">At Risk Value</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Items Table */}
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
              onClick={fetchExpiryItems}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : expiryItems.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expiring items found</h3>
            <p className="text-gray-600 mb-6">
              {expiryStatusFilter !== 'ALL' 
                ? `No items with status "${expiryStatusFilter}"`
                : 'All items are within safe expiry ranges'}
            </p>
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
                      Batch Information
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock & Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expiryItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.stockItemName}</div>
                            <div className="text-sm text-gray-500">
                              {item.quantity} units
                              {item.stockValue && (
                                <span className="ml-2">• ${item.stockValue.toFixed(2)} value</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {item.batchNumber}
                          </div>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span>{formatDate(item.expirationDate)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {item.locationName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {item.quantity} units in stock
                          </div>
                          {item.purchasePrice && (
                            <div className="text-sm text-gray-600">
                              ${item.purchasePrice.toFixed(2)} per unit
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.expiryStatus)}`}>
                            <span className="mr-1">{getStatusIcon(item.expiryStatus)}</span>
                            {item.expiryStatus}
                          </span>
                          <div className={`text-sm font-medium ${getDaysColor(item.daysToExpiry)}`}>
                            {item.daysToExpiry < 0 ? (
                              <>Expired {Math.abs(item.daysToExpiry)} days ago</>
                            ) : (
                              <>{item.daysToExpiry} days remaining</>
                            )}
                          </div>
                          {item.expiryStatus === 'CRITICAL' && (
                            <div className="text-xs text-red-600">
                              Requires immediate attention
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              // View item details
                              router.push(`/pharmacy/stock/items/${item.stockItemUuid}`);
                            }}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Item"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Create disposal operation for expired items
                              if (item.expiryStatus === 'EXPIRED') {
                                router.push(`/stockManagement/operations/new?type=disposal&item=${item.stockItemUuid}&batch=${item.batchNumber}`);
                              }
                            }}
                            disabled={item.expiryStatus !== 'EXPIRED'}
                            className={`p-2 rounded-lg transition ${
                              item.expiryStatus === 'EXPIRED'
                                ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title="Dispose Expired"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Create transfer for expiring items
                              router.push(`/stockManagement/operations/new?type=transfer&item=${item.stockItemUuid}&batch=${item.batchNumber}`);
                            }}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Transfer Stock"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                    {totalCount.toLocaleString()} expiring items
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Actions */}
      {expiryItems.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                const expiredItems = expiryItems.filter(item => item.expiryStatus === 'EXPIRED');
                if (expiredItems.length === 0) {
                  alert('No expired items selected');
                  return;
                }
                // Navigate to bulk disposal
                router.push('/stockManagement/operations/new?type=disposal&bulk=expired');
              }}
              className="p-4 border border-red-200 rounded-lg hover:bg-red-50 transition text-left"
            >
              <div className="flex items-center">
                <XCircle className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Dispose Expired Items</div>
                  <div className="text-sm text-gray-600">
                    {expiryItems.filter(item => item.expiryStatus === 'EXPIRED').length} expired items
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                const criticalItems = expiryItems.filter(item => item.expiryStatus === 'CRITICAL');
                if (criticalItems.length === 0) {
                  alert('No critical items selected');
                  return;
                }
                // Navigate to bulk transfer
                router.push('/stockManagement/operations/new?type=transfer&bulk=critical');
              }}
              className="p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition text-left"
            >
              <div className="flex items-center">
                <BarChart3 className="h-6 w-6 text-orange-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Transfer Critical Items</div>
                  <div className="text-sm text-gray-600">
                    {expiryItems.filter(item => item.expiryStatus === 'CRITICAL').length} critical items
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                // Generate report for management
                handleExport();
              }}
              className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition text-left"
            >
              <div className="flex items-center">
                <Download className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Generate Management Report</div>
                  <div className="text-sm text-gray-600">
                    Export detailed expiry report
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}