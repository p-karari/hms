'use client';

import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';
import { StockAlert, StockSummary, getStockAlerts, getStockLevels } from '@/lib/stockManagement/stockReport';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Link,
  Package,
  RefreshCw,
  TrendingDown,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
// import { getStockLevels, getStockAlerts, StockSummary, StockAlert } from '@/actions/stock-report.actions';

export default function StockDashboard() {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState({
    locations: true,
    summary: true,
    alerts: true
  });
  const [error, setError] = useState<string>('');

  // Fetch locations on component mount


  // Fetch summary and alerts when location changes




const fetchLocations = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, locations: true }));
      setError(''); // Clear previous errors

      // Direct call to the FHIR-based Server Action
      const data = await getPharmacyLocations();
      
      // The action returns an array of { uuid, display }
      if (data && data.length > 0) {
        setLocations(data);
        
        // Only set default if not already selected
        if (!selectedLocation) {
          setSelectedLocation(data[0].uuid);
        }
      } else {
        // If no locations tagged as 'Pharmacy' are found
        throw new Error('No pharmacy locations found in the system');
      }
    } catch (err) {
      setError('Failed to load pharmacy locations');
      console.error('Location Fetch Error:', err);
    } finally {
      setLoading(prev => ({ ...prev, locations: false }));
    }
  }, [selectedLocation]); // Add selectedLocation as dependency since it's used in the function

const fetchSummary = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, summary: true }));
      const result = await getStockLevels({
        locationUuid: selectedLocation,
        limit: 1 // Just to get summary
      });

      if (result.success && result.summary) {
        setSummary(result.summary);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load stock summary');
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [selectedLocation]); // Add selectedLocation as dependency since it's used in the function

const fetchAlerts = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, alerts: true }));
      const result = await getStockAlerts({
        locationUuid: selectedLocation
      });

      if (result.success && result.data) {
        setAlerts(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load alerts');
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, [selectedLocation]); // Add selectedLocation as dependency since it's used in the function

// Then update the useEffect to use the memoized functions
useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

useEffect(() => {
    if (selectedLocation) {
      fetchSummary();
      fetchAlerts();
    }
  }, [selectedLocation, fetchSummary, fetchAlerts]);

  const handleRefresh = () => {
    if (selectedLocation) {
      fetchSummary();
      fetchAlerts();
    }
  };

  const handleExport = async () => {
    try {
      const result = await getStockLevels({
        locationUuid: selectedLocation,
        limit: 1000
      });

      if (result.success && result.data) {
        // Convert to CSV
        const headers = ['Item Name', 'Quantity', 'Batch', 'Expiry', 'Status'];
        const csvRows = [
          headers.join(','),
          ...result.data.map(item => [
            item.stockItemName,
            item.quantity,
            item.batchNumber || 'N/A',
            item.expirationDate || 'N/A',
            item.stockStatus
          ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-report-${selectedLocation}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'WARNING': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'INFO': return <Clock className="h-5 w-5 text-blue-600" />;
      default: return null;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={fetchLocations}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Management Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor inventory across all locations</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              disabled={loading.summary}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading.summary ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Location Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building className="h-5 w-5 text-gray-500 mr-2" />
              <span className="font-medium text-gray-700">Current Location:</span>
            </div>
            <div className="relative">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading.locations}
              >
                {loading.locations ? (
                  <option>Loading locations...</option>
                ) : (
                  locations.map(location => (
                    <option key={location.uuid} value={location.uuid}>
                      {location.display}
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Items Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            {loading.summary ? (
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-2xl font-bold text-gray-900">{summary?.totalItems.toLocaleString()}</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Stock Items</h3>
          <div className="flex items-center text-sm text-gray-600">
            <span className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              {loading.summary ? '...' : `${summary?.itemsInStock} in stock`}
            </span>
          </div>
        </div>

        {/* Stock Value Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            {loading.summary ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-2xl font-bold text-gray-900">
                ${summary?.totalStockValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Stock Value</h3>
          <div className="flex items-center text-sm text-gray-600">
            <span className="flex items-center">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              Avg: ${summary?.averageStockValuePerItem?.toFixed(2) || '0.00'} per item
            </span>
          </div>
        </div>

        {/* Low Stock Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            {loading.summary ? (
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-2xl font-bold text-gray-900">{summary?.itemsBelowReorderLevel}</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Below Reorder Level</h3>
          <div className="flex items-center text-sm text-gray-600">
            <span className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
              {loading.summary ? '...' : `${summary?.itemsOutOfStock} out of stock`}
            </span>
          </div>
        </div>

        {/* Expiring Soon Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            {loading.summary ? (
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-2xl font-bold text-gray-900">{summary?.expiringSoonItems}</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Expiring Soon (≤30 days)</h3>
          <div className="flex items-center text-sm text-gray-600">
            <span className="flex items-center">
              <XCircle className="h-4 w-4 text-red-500 mr-1" />
              {loading.summary ? '...' : `${summary?.expiredItems} expired`}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
              {alerts.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  {alerts.length}
                </span>
              )}
            </div>
            <button className="flex items-center text-sm text-blue-600 hover:text-blue-800">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {loading.alerts ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500">No active alerts</p>
              <p className="text-sm text-gray-400 mt-1">All stock levels are within normal ranges</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getAlertColor(alert.alertLevel)}`}
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-0.5">
                      {getAlertIcon(alert.alertLevel)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{alert.stockItemName}</h3>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white">
                          {alert.alertType.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-600">
                          {new Date(alert.dateGenerated).toLocaleDateString()} • {alert.locationName}
                        </span>
                        <button className="text-xs font-medium text-blue-600 hover:text-blue-800">
                          Take Action
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/stockManagement/items/new" className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Add New Stock Item</p>
                  <p className="text-sm text-gray-500">Register new medication</p>
                </div>
              </div>
            </Link>
            <Link href="/stockManagement/operations/new?type=adjustment" className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <RefreshCw className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Stock Adjustment</p>
                  <p className="text-sm text-gray-500">Add or remove stock</p>
                </div>
              </div>
            </Link>
            <Link href="/pharmacy/stock/stocktakes/new" className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Start Stock Take</p>
                  <p className="text-sm text-gray-500">Physical inventory count</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity - Would need actual API */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Stock Activity</h3>
          <div className="space-y-4">
            <div className="p-3 border border-gray-100 rounded-lg">
              <p className="text-gray-500 text-center">Recent activity would appear here</p>
              <p className="text-sm text-gray-400 text-center mt-1">
                Configure by integrating with stock operations API
              </p>
            </div>
          </div>
          <a href="/pharmacy/stock/operations" className="block w-full mt-4 py-2 text-center text-blue-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            View All Activity
          </a>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Last updated: {summary ? new Date(summary.lastUpdated).toLocaleString() : 'Loading...'}</p>
        <p className="mt-1">Data refreshes automatically every 5 minutes</p>
      </div>
    </div>
  );
}