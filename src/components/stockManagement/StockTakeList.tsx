'use client';

import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
// import { searchStockTakeSessions, StockTakeSession } from '@/actions/stock-take.actions';
import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';
import { StockTakeSession, searchStockTakeSessions } from '@/lib/stockManagement/stockTake';
import { useRouter } from 'next/navigation';

export default function StockTakeList() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StockTakeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<any[]>([]);
  const itemsPerPage = 20;

// Load initial data
// Load initial data
useEffect(() => {
  const fetchLocations = async () => {
    try {
      // Call the Server Action directly
      const data = await getPharmacyLocations();
      
      // Update the locations list state with { uuid, display }
      setLocations(data);
      
      // If your session logic requires a starting location:
      if (data && data.length > 0 && !locationFilter) {
        setLocationFilter(data[0].uuid);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  fetchLocations();
}, [locationFilter]);

  // Fetch sessions - re-runs when locationFilter or other filters change
// Fetch sessions - re-runs when locationFilter or other filters change
useEffect(() => {
  const fetchSessions = async () => {
    try {
;
      setError('');

      const filters: any = {
        searchQuery: searchQuery || undefined,
        status: statusFilter || undefined,
        locationUuid: locationFilter || undefined,
        operationDateFrom: dateRange.start || undefined,
        operationDateTo: dateRange.end || undefined,
        startIndex: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      };

      const result = await searchStockTakeSessions(filters);

      if (result.success && result.data) {
        setSessions(result.data);
        setTotalCount(result.totalCount || result.data.length);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load stock take sessions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchSessions();
}, [currentPage, statusFilter, locationFilter, dateRange.start, dateRange.end, searchQuery]);


  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');

      const filters: any = {
        searchQuery: searchQuery || undefined,
        status: statusFilter || undefined,
        locationUuid: locationFilter || undefined,
        operationDateFrom: dateRange.start || undefined,
        operationDateTo: dateRange.end || undefined,
        startIndex: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      };

      const result = await searchStockTakeSessions(filters);

      if (result.success && result.data) {
        setSessions(result.data);
        setTotalCount(result.totalCount || result.data.length);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load stock take sessions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSessions();
  };

  const handleExport = async () => {
    try {
      const filters: any = {
        status: statusFilter || undefined,
        locationUuid: locationFilter || undefined,
        operationDateFrom: dateRange.start || undefined,
        operationDateTo: dateRange.end || undefined,
        limit: 1000
      };

      const result = await searchStockTakeSessions(filters);

      if (result.success && result.data) {
        const headers = ['Session ID', 'Location', 'Date', 'Status', 'Total Items', 'Counted', 'Variances', 'Total Variance', 'Created By', 'Created Date'];
        const csvRows = [
          headers.join(','),
          ...result.data.map(session => [
            session.uuid?.substring(0, 8) || 'N/A',
            `"${session.locationName || 'N/A'}"`,
            new Date(session.operationDate).toLocaleDateString(),
            session.status,
            session.totalItems,
            session.itemsCounted,
            session.itemsWithVariance,
            session.totalVarianceQuantity,
            `"${session.creatorName || 'N/A'}"`,
            new Date(session.dateCreated || '').toISOString()
          ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-take-sessions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export sessions');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FINALIZED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'FINALIZED': return <CheckCircle className="h-4 w-4" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4" />;
      case 'DRAFT': return <FileText className="h-4 w-4" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getProgressPercentage = (session: StockTakeSession) => {
    if (session.totalItems === 0) return 0;
    return Math.round((session.itemsCounted / session.totalItems) * 100);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTotalPages = () => {
    return Math.ceil(totalCount / itemsPerPage);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
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
            <h1 className="text-3xl font-bold text-gray-900">Stock Take Sessions</h1>
            <p className="text-gray-600 mt-1">Manage physical inventory counting sessions</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={sessions.length === 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => router.push('/pharmacy/stock/stocktakes/new')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Stock Take
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    placeholder="Search by session ID or item..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  <option value="DRAFT">Draft</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FINALIZED">Finalized</option>
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

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
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
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {sessions.length} of {totalCount} sessions
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {statusFilter && `Status: ${statusFilter}`}
                  {locationFilter && ` | Location: ${locations.find(l => l.uuid === locationFilter)?.display || locationFilter}`}
                  {dateRange.start && ` | From: ${dateRange.start}`}
                  {dateRange.end && ` To: ${dateRange.end}`}
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Summary Stats */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => s.status === 'COMPLETED' || s.status === 'FINALIZED').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => s.status === 'IN_PROGRESS').length}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {sessions.reduce((sum, s) => sum + s.itemsWithVariance, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Variances</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Table */}
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
              onClick={fetchSessions}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stock take sessions found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search filters or create a new stock take</p>
            <button
              onClick={() => router.push('/pharmacy/stock/stocktakes/new')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Create First Session
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location & Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variances
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
                  {sessions.map((session) => {
                    const progress = getProgressPercentage(session);
                    const hasVariances = session.itemsWithVariance > 0;
                    
                    return (
                      <tr key={session.uuid} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {session.uuid?.substring(0, 8)}...
                              </div>
                              <div className="text-sm text-gray-500">
                                {session.totalItems} items
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">
                              {session.locationName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(session.operationDate).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                {progress}%
                              </span>
                              <span className="text-xs text-gray-500">
                                {session.itemsCounted}/{session.totalItems}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  progress === 100 ? 'bg-green-600' :
                                  progress >= 50 ? 'bg-yellow-600' :
                                  'bg-blue-600'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center">
                              {hasVariances ? (
                                <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
                              ) : (
                                <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                              )}
                              <span className={`font-medium ${hasVariances ? 'text-red-700' : 'text-green-700'}`}>
                                {session.itemsWithVariance} items
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Total: {session.totalVarianceQuantity} units
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                              <span className="mr-1">{getStatusIcon(session.status)}</span>
                              {session.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">
                              {session.creatorName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(session.dateCreated || '').toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/pharmacy/stock/stocktakes/${session.uuid}`)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Session"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            
                            {session.status === 'DRAFT' && (
                              <button
                                onClick={() => router.push(`/pharmacy/stock/stocktakes/${session.uuid}/edit`)}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Edit"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            )}
                            
                            {session.status === 'COMPLETED' && session.adjustmentOperationUuid && (
                              <button
                                onClick={() => router.push(`/pharmacy/stock/operations/${session.adjustmentOperationUuid}`)}
                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                title="View Adjustment"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </button>
                            )}
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
                    {totalCount.toLocaleString()} total sessions
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}