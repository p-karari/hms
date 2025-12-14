'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Search, 
  Filter, 
  Download, 
  TrendingUp,
  TrendingDown,
  Package,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  DollarSign,
  Clock,
  AlertTriangle
} from 'lucide-react';
// import { getConsumptionReport, ConsumptionItem } from '@/actions/stock-report.actions';
import { useRouter } from 'next/navigation';
import { ConsumptionItem, getConsumptionReport } from '@/lib/stockManagement/stockReport';
import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';

export default function ConsumptionReport() {
  const router = useRouter();
  const [consumptionData, setConsumptionData] = useState<ConsumptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'consumption' | 'cost' | 'rate'>('consumption');
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 20;

  // Load initial data
const fetchLocations = async () => {
    try {
      // Direct call to the Server Action
      const data = await getPharmacyLocations();
      
      // Based on the map in the action, 'data' is already the array of {uuid, display}
      setLocations(data || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
      // Optional: Set an error state to show in the UI
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []); // Only runs once on mount to populate the filter list

  const fetchConsumptionData = async () => {
    try {
      setLoading(true);
      setError('');

      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateRange === 'CUSTOM') {
        startDate = customDateRange.start || undefined;
        endDate = customDateRange.end || undefined;
      }

      const result = await getConsumptionReport({
        locationUuid: locationFilter || undefined,
        dateRange: dateRange !== 'CUSTOM' ? dateRange : undefined,
        startDate,
        endDate,
        startIndex: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        sortBy: sortBy,
        sortOrder: 'DESC'
      });

      if (result.success && result.data) {
        // Sort data
        let sortedData = [...result.data];
        switch (sortBy) {
          case 'consumption':
            sortedData.sort((a, b) => b.totalConsumption - a.totalConsumption);
            break;
          case 'cost':
            sortedData.sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));
            break;
          case 'rate':
            sortedData.sort((a, b) => (b.consumptionRate || 0) - (a.consumptionRate || 0));
            break;
        }
        
        setConsumptionData(sortedData);
        setTotalCount(result.summary?.totalItems || result.data.length);
        setSummary(result.summary);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load consumption data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateRange === 'CUSTOM') {
        startDate = customDateRange.start || undefined;
        endDate = customDateRange.end || undefined;
      }

      const result = await getConsumptionReport({
        locationUuid: locationFilter || undefined,
        dateRange: dateRange !== 'CUSTOM' ? dateRange : undefined,
        startDate,
        endDate,
        limit: 1000
      });

      if (result.success && result.data) {
        const headers = ['Item Name', 'Location', 'Period', 'Opening Balance', 'Receipts', 'Issues', 'Adjustments', 'Closing Balance', 'Total Consumption', 'Avg Daily', 'Total Cost', 'Consumption Rate'];
        const csvRows = [
          headers.join(','),
          ...result.data.map(item => [
            `"${item.stockItemName}"`,
            `"${item.locationName}"`,
            `"${item.period}"`,
            item.openingBalance,
            item.receipts,
            item.issues,
            item.adjustments,
            item.closingBalance,
            item.totalConsumption,
            item.averageDailyConsumption?.toFixed(2) || '0.00',
            item.totalCost?.toFixed(2) || '0.00',
            item.consumptionRate?.toFixed(2) || '0.00'
          ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consumption-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export consumption report');
    }
  };

  const getConsumptionRateColor = (rate: number | undefined) => {
    if (!rate) return 'text-gray-600';
    if (rate > 20) return 'text-red-600';
    if (rate > 10) return 'text-orange-600';
    if (rate > 0) return 'text-green-600';
    if (rate < -10) return 'text-red-600';
    if (rate < 0) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getConsumptionRateIcon = (rate: number | undefined) => {
    if (!rate) return null;
    if (rate > 0) return <TrendingUp className="h-4 w-4" />;
    if (rate < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTotalPages = () => {
    return Math.ceil(totalCount / itemsPerPage);
  };

  const handleRefresh = () => {
    fetchConsumptionData();
  };

  const getPeriodLabel = () => {
    if (dateRange === 'CUSTOM') {
      return `${customDateRange.start} to ${customDateRange.end}`;
    }
    return dateRange.replace('_', ' ').toLowerCase();
  };

  const filteredData = consumptionData.filter(item => 
    item.stockItemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.locationName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consumption Analytics</h1>
            <p className="text-gray-600 mt-1">Track medication usage patterns and trends</p>
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
              disabled={consumptionData.length === 0}
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

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="THIS_QUARTER">This Quarter</option>
                <option value="THIS_YEAR">This Year</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'CUSTOM' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Items
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by item or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="mt-4 flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <button
              onClick={() => setSortBy('consumption')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${sortBy === 'consumption' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Consumption Volume
            </button>
            <button
              onClick={() => setSortBy('cost')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${sortBy === 'cost' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Total Cost
            </button>
            <button
              onClick={() => setSortBy('rate')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${sortBy === 'rate' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Consumption Rate
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalItems || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Consumption</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalConsumption?.toLocaleString() || 0}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(summary.totalCost)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Daily Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{summary.avgConsumptionRate?.toFixed(1) || 0}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
                  <th className="px6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipts</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumption</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Daily</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={11} className="px-6 py-8">
                        <div className="flex justify-center">
                          <div className="animate-pulse flex space-x-4">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No consumption data found for the selected filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={`${item.stockItemUuid}-${item.locationUuid}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.stockItemName}</p>
                          <p className="text-sm text-gray-500">{item.stockItemName || 'Uncategorized'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-700">{item.locationName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{item.openingBalance?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 text-blue-600">{item.receipts?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 text-orange-600">{item.issues?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 text-gray-700">{item.closingBalance?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 text-green-600 mr-2" />
                          <span className="font-medium text-gray-900">{item.totalConsumption?.toLocaleString() || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{item.averageDailyConsumption?.toFixed(1) || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="font-medium">{formatCurrency(item.totalCost)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center font-medium ${getConsumptionRateColor(item.consumptionRate)}`}>
                          {getConsumptionRateIcon(item.consumptionRate)}
                          <span className="ml-1">{item.consumptionRate?.toFixed(1) || 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/inventory/stock-details/${item.stockItemUuid}?location=${item.locationUuid}`)}
                          className="flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredData.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> items
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {Array.from({ length: getTotalPages() }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === getTotalPages() || 
                      Math.abs(page - currentPage) <= 1
                    )
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg font-medium ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === getTotalPages()}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Period Info */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <Clock className="h-4 w-4 mr-2" />
            <span className="text-sm">Report period: {getPeriodLabel()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}