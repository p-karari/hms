'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  AlertOctagon,
  Bell,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Package,
  Building,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  ShoppingCart,
  BellRing
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { getStockAlerts, StockAlert } from '@/lib/stockManagement/stockReport';
import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';

export default function StockAlerts() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('');
  const [alertLevelFilter, setAlertLevelFilter] = useState<string>('');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

// Load initial data
  useEffect(() => {
    fetchLocations();
    fetchAlerts();
  }, []);

  const fetchLocations = async () => {
    try {
      // Call the Server Action directly
      const data = await getPharmacyLocations();
      
      // The action returns an array of { uuid, display }
      setLocations(data);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await getStockAlerts({
        locationUuid: locationFilter || undefined
      });

      if (result.success && result.data) {
        setAlerts(result.data);
        setSummary(result.summary);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load stock alerts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string, stockItemUuid: string) => {
    try {
      // In a real app, you would call an API to mark the alert as acknowledged
      // For now, we'll just update the local state
      setAlerts(prev => prev.map(alert => {
        if (alert.stockItemUuid === stockItemUuid && alert.dateGenerated === alertId) {
          return { 
            ...alert, 
            acknowledged: true,
            acknowledgedByName: 'Current User',
            acknowledgementDate: new Date().toISOString()
          };
        }
        return alert;
      }));

      // Show success message
      // toast.success('Alert acknowledged');
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      // toast.error('Failed to acknowledge alert');
    }
  };

  const handleExport = async () => {
    try {
      const headers = [
        'Alert Type',
        'Alert Level',
        'Item Name',
        'Location',
        'Current Quantity',
        'Threshold',
        'Batch',
        'Expiration Date',
        'Days to Expiry',
        'Message',
        'Suggested Action',
        'Date Generated',
        'Acknowledged',
        'Acknowledged By',
        'Acknowledgement Date'
      ];

      const csvRows = [
        headers.join(','),
        ...alerts.map(alert => [
          `"${alert.alertType}"`,
          `"${alert.alertLevel}"`,
          `"${alert.stockItemName}"`,
          `"${alert.locationName}"`,
          alert.currentQuantity,
          alert.thresholdQuantity || '',
          `"${alert.batchNumber || 'N/A'}"`,
          `"${alert.expirationDate || 'N/A'}"`,
          alert.daysToExpiry || '',
          `"${alert.message}"`,
          `"${alert.suggestedAction || 'N/A'}"`,
          `"${alert.dateGenerated}"`,
          alert.acknowledged ? 'Yes' : 'No',
          `"${alert.acknowledgedByName || 'N/A'}"`,
          `"${alert.acknowledgementDate || 'N/A'}"`
        ].join(','))
      ];

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-alerts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export alerts');
    }
  };

  const toggleExpand = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return <TrendingDown className="h-5 w-5" />;
      case 'EXPIRING':
        return <Clock className="h-5 w-5" />;
      case 'EXPIRED':
        return <XCircle className="h-5 w-5" />;
      case 'OVERSTOCK':
        return <TrendingUp className="h-5 w-5" />;
      case 'NEEDS_REORDER':
        return <ShoppingCart className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'EXPIRING':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'OVERSTOCK':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'NEEDS_REORDER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <AlertOctagon className="h-5 w-5" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5" />;
      case 'INFO':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'WARNING':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'INFO':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredAlerts = alerts.filter(alert => {
    if (locationFilter && alert.locationUuid !== locationFilter) return false;
    if (alertTypeFilter && alert.alertType !== alertTypeFilter) return false;
    if (alertLevelFilter && alert.alertLevel !== alertLevelFilter) return false;
    if (acknowledgedFilter === 'ACKNOWLEDGED' && !alert.acknowledged) return false;
    if (acknowledgedFilter === 'UNACKNOWLEDGED' && alert.acknowledged) return false;
    return true;
  });

  const criticalAlerts = filteredAlerts.filter(a => a.alertLevel === 'CRITICAL');
  const warningAlerts = filteredAlerts.filter(a => a.alertLevel === 'WARNING');
  const infoAlerts = filteredAlerts.filter(a => a.alertLevel === 'INFO');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Alerts</h1>
            <p className="text-gray-600 mt-1">Monitor inventory issues and take action</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={alerts.length === 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Alerts
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {summary?.totalAlerts || filteredAlerts.length}
                </p>
              </div>
              <BellRing className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {summary?.criticalAlerts || criticalAlerts.length}
                </p>
              </div>
              <AlertOctagon className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Warnings</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {summary?.warningAlerts || warningAlerts.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unacknowledged</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {filteredAlerts.filter(a => !a.acknowledged).length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-gray-600" />
            </div>
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

            {/* Alert Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Type
              </label>
              <select
                value={alertTypeFilter}
                onChange={(e) => setAlertTypeFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="EXPIRING">Expiring Soon</option>
                <option value="EXPIRED">Expired</option>
                <option value="OVERSTOCK">Overstock</option>
                <option value="NEEDS_REORDER">Needs Reorder</option>
              </select>
            </div>

            {/* Alert Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Level
              </label>
              <select
                value={alertLevelFilter}
                onChange={(e) => setAlertLevelFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            {/* Acknowledged Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={acknowledgedFilter}
                onChange={(e) => setAcknowledgedFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="UNACKNOWLEDGED">Unacknowledged</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts Found</h3>
              <p className="text-gray-500">All systems are normal. No alerts match your filters.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isExpanded = expandedAlerts.has(alert.dateGenerated);
              
              return (
                <div
                  key={`${alert.stockItemUuid}-${alert.dateGenerated}`}
                  className={`bg-white rounded-xl border transition-all duration-200 ${
                    alert.alertLevel === 'CRITICAL' 
                      ? 'border-red-200 hover:border-red-300' 
                      : alert.alertLevel === 'WARNING'
                      ? 'border-orange-200 hover:border-orange-300'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${getAlertLevelColor(alert.alertLevel)}`}>
                          {getAlertLevelIcon(alert.alertLevel)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAlertTypeColor(alert.alertType)}`}>
                              <span className="flex items-center">
                                {getAlertTypeIcon(alert.alertType)}
                                <span className="ml-1">{alert.alertType.replace('_', ' ')}</span>
                              </span>
                            </span>
                            {alert.acknowledged && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                <span className="flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Acknowledged
                                </span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900">{alert.stockItemName}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <Building className="inline h-3 w-3 mr-1" />
                            {alert.locationName}
                            {alert.batchNumber && (
                              <span className="ml-4">
                                <Package className="inline h-3 w-3 mr-1" />
                                Batch: {alert.batchNumber}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-700 mt-2">{alert.message}</p>
                          {alert.expirationDate && (
                            <p className="text-sm text-gray-600 mt-1">
                              <Clock className="inline h-3 w-3 mr-1" />
                              Expires: {new Date(alert.expirationDate).toLocaleDateString()} 
                              {alert.daysToExpiry && (
                                <span className={alert.daysToExpiry <= 0 ? 'text-red-600 font-medium' : ''}>
                                  ({alert.daysToExpiry} days)
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleExpand(alert.dateGenerated)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Stock Details</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Current Quantity:</span>
                                <span className="text-sm font-medium">{alert.currentQuantity}</span>
                              </div>
                              {alert.reorderLevel !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Reorder Level:</span>
                                  <span className="text-sm font-medium">{alert.reorderLevel}</span>
                                </div>
                              )}
                              {alert.maximumStock !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Maximum Stock:</span>
                                  <span className="text-sm font-medium">{alert.maximumStock}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Actions</h4>
                            <p className="text-sm text-gray-700 mb-3">{alert.suggestedAction}</p>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => router.push(`/stockManagement/operations/new?type=ORDER&item=${alert.stockItemUuid}&location=${alert.locationUuid}`)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                              >
                                Create Order
                              </button>
                              <button
                                onClick={() => router.push(`/stockManagement/operations/new?type=TRANSFER&item=${alert.stockItemUuid}&location=${alert.locationUuid}`)}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                              >
                                Transfer Stock
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Alert Information</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Generated:</span>
                                <span className="text-sm">{formatDate(alert.dateGenerated)}</span>
                              </div>
                              {alert.acknowledged && alert.acknowledgedByName && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Acknowledged By:</span>
                                  <span className="text-sm">{alert.acknowledgedByName}</span>
                                </div>
                              )}
                              {alert.acknowledged && alert.acknowledgementDate && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Acknowledged On:</span>
                                  <span className="text-sm">{formatDate(alert.acknowledgementDate)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                          {!alert.acknowledged && (
                            <button
                              onClick={() => handleAcknowledge(alert.dateGenerated, alert.stockItemUuid)}
                              className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
                            >
                              <CheckCircle className="inline h-4 w-4 mr-2" />
                              Acknowledge Alert
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/pharmacy/stock/items/${alert.stockItemUuid}?location=${alert.locationUuid}`)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                          >
                            <Eye className="inline h-4 w-4 mr-2" />
                            View Item Details
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary Stats */}
        {filteredAlerts.length > 0 && !loading && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">By Alert Level</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-600 font-medium">Critical</span>
                      <span>{criticalAlerts.length}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500" 
                        style={{ width: `${(criticalAlerts.length / filteredAlerts.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-orange-600 font-medium">Warning</span>
                      <span>{warningAlerts.length}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500" 
                        style={{ width: `${(warningAlerts.length / filteredAlerts.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-600 font-medium">Info</span>
                      <span>{infoAlerts.length}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(infoAlerts.length / filteredAlerts.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">By Alert Type</h4>
                <div className="space-y-3">
                  {Object.entries(
                    filteredAlerts.reduce((acc, alert) => {
                      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{type.replace('_', ' ')}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gray-400" 
                          style={{ width: `${(count / filteredAlerts.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">By Location</h4>
                <div className="space-y-3">
                  {Object.entries(
                    filteredAlerts.reduce((acc, alert) => {
                      acc[alert.locationName] = (acc[alert.locationName] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([location, count]) => (
                    <div key={location}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{location}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gray-400" 
                          style={{ width: `${(count / filteredAlerts.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}