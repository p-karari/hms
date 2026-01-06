'use client';

import { searchStockOperations } from '@/lib/stockManagement/stockOperation';
import { StockOperationSummary, StockOperationType } from '@/lib/stockManagement/stockOperationTypes';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  Truck,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function StockOperationsList() {
  const router = useRouter();
  const [operations, setOperations] = useState<StockOperationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [operationTypeFilter, setOperationTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<any[]>([]);
  const itemsPerPage = 20;

  // Operation type labels
  const operationTypeLabels: Record<StockOperationType, string> = {
    [StockOperationType.ADJUSTMENT]: 'Adjustment',
    [StockOperationType.DISPOSAL]: 'Disposal',
    [StockOperationType.TRANSFER_OUT]: 'Transfer Out',
    [StockOperationType.RECEIPT]: 'Receipt',
    [StockOperationType.RETURN]: 'Return',
    [StockOperationType.STOCK_ISSUE]: 'Stock Issue',
    [StockOperationType.REQUISITION]: 'Requisition',
    [StockOperationType.STOCK_TAKE]: 'Stock Take',
    [StockOperationType.OPENING_STOCK]: 'Opening Stock'
  };
// Fetch operations - will re-run when locationFilter is set by fetchLocations
  useEffect(() => {
    fetchOperations();
  }, [currentPage, operationTypeFilter, statusFilter, locationFilter, dateRange]);


  const fetchOperations = async () => {
    try {
      setLoading(true);
      setError('');

      const filters: any = {
        searchQuery: searchQuery || undefined,
        operationType: operationTypeFilter || undefined,
        status: statusFilter || undefined,
        locationUuid: locationFilter || undefined,
        operationDateFrom: dateRange.start || undefined,
        operationDateTo: dateRange.end || undefined,
        startIndex: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      };

      const result = await searchStockOperations(filters);

      if (result.success && result.data) {
        setOperations(result.data);
        setTotalCount(result.totalCount || result.data.length);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load stock operations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOperations();
  };

  const handleExport = async () => {
    try {
      const filters: any = {
        operationType: operationTypeFilter || undefined,
        status: statusFilter || undefined,
        locationUuid: locationFilter || undefined,
        operationDateFrom: dateRange.start || undefined,
        operationDateTo: dateRange.end || undefined,
        limit: 1000
      };

      const result = await searchStockOperations(filters);

      if (result.success && result.data) {
        const headers = ['Operation #', 'Type', 'Date', 'Status', 'Location', 'Source', 'Destination', 'Items', 'Quantity', 'Created By'];
        const csvRows = [
          headers.join(','),
          ...result.data.map(op => [
            `"${op.operationNumber}"`,
            operationTypeLabels[op.operationType] || op.operationType,
            new Date(op.operationDate).toLocaleDateString(),
            op.status,
            `"${op.locationName}"`,
            `"${op.sourceLocationName || 'N/A'}"`,
            `"${op.destinationLocationName || 'N/A'}"`,
            op.totalItems,
            op.totalQuantity,
            `"${op.creatorName}"`
          ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-operations-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export operations');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'SUBMITTED': return 'bg-yellow-100 text-yellow-800';
      case 'NEW': return 'bg-gray-100 text-gray-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />;
      case 'SUBMITTED': return <Clock className="h-4 w-4" />;
      case 'NEW': return <Clock className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getOperationIcon = (type: StockOperationType) => {
    switch (type) {
      case StockOperationType.RECEIPT: return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case StockOperationType.ADJUSTMENT: return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case StockOperationType.TRANSFER_OUT: return <Truck className="h-4 w-4 text-purple-600" />;
      case StockOperationType.DISPOSAL: return <XCircle className="h-4 w-4 text-red-600" />;
      case StockOperationType.STOCK_ISSUE: return <Package className="h-4 w-4 text-yellow-600" />;
      case StockOperationType.STOCK_TAKE: return <FileText className="h-4 w-4 text-indigo-600" />;
      default: return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTotalPages = () => {
    return Math.ceil(totalCount / itemsPerPage);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setOperationTypeFilter('');
    setStatusFilter('');
    setLocationFilter('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Operations</h1>
            <p className="text-gray-600 mt-1">View and manage all inventory transactions</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchOperations}
              disabled={loading}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={operations.length === 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => router.push('/stockManagement/operations/new')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Operation
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by operation #, item, etc."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Operation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation Type
                </label>
                <select
                  value={operationTypeFilter}
                  onChange={(e) => setOperationTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {Object.entries(operationTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Location */}
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
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {operations.length} of {totalCount} operations
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {operationTypeFilter && `Type: ${operationTypeLabels[operationTypeFilter as StockOperationType] || operationTypeFilter}`}
                  {statusFilter && ` | Status: ${statusFilter}`}
                  {dateRange.start && ` | From: ${dateRange.start}`}
                  {dateRange.end && ` To: ${dateRange.end}`}
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Operations Table */}
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
              onClick={fetchOperations}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : operations.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search filters or create a new operation</p>
            <button
              onClick={() => router.push('/stockManagement/operations/new')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Create First Operation
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items & Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {operations.map((operation) => (
                    <tr key={operation.uuid} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-lg mr-3">
                            {getOperationIcon(operation.operationType)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {operation.operationNumber || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {operationTypeLabels[operation.operationType] || operation.operationType}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(operation.operationDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {operation.locationName}
                          </div>
                          {operation.sourceLocationName && (
                            <div className="text-sm text-gray-600">
                              From: {operation.sourceLocationName}
                            </div>
                          )}
                          {operation.destinationLocationName && (
                            <div className="text-sm text-gray-600">
                              To: {operation.destinationLocationName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium">{operation.totalItems} items</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Total quantity: {operation.totalQuantity}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(operation.status)}`}>
                            <span className="mr-1">{getStatusIcon(operation.status)}</span>
                            {operation.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">
                            {operation.creatorName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(operation.dateCreated).toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/pharmacy/stock/operations/${operation.uuid}`)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {operation.status === 'NEW' && (
                            <button
                              onClick={() => router.push(`/pharmacy/stock/operations/${operation.uuid}/edit`)}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Edit"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
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
                    {totalCount.toLocaleString()} total operations
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Stats */}
      {operations.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {operations.filter(op => op.status === 'COMPLETED').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {operations.filter(op => op.status === 'NEW' || op.status === 'SUBMITTED').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {operations.reduce((sum, op) => sum + op.totalQuantity, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Items Moved</div>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}