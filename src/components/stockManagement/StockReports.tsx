'use client';

import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';
import { ConsumptionItem, ExpiryItem, StockAlert, StockLevel, StockSummary, getConsumptionReport, getExpiryItems, getStockAlerts, getStockLevels } from '@/lib/stockManagement/stockReport';
import {
  Activity,
  AlertTriangle,
  Building,
  ChevronRight,
  Clock,
  Database,
  Download,
  Eye,
  FileText,
  Layers,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';


export default function StockReports() {
  const router = useRouter();
  const [activeReport, setActiveReport] = useState<'OVERVIEW' | 'STOCK_LEVELS' | 'EXPIRY' | 'CONSUMPTION' | 'ALERTS'>('OVERVIEW');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
  const [loading, setLoading] = useState({
    overview: false,
    stockLevels: false,
    expiry: false,
    consumption: false,
    alerts: false
  });
  
  // Report data
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [expiryItems, setExpiryItems] = useState<ExpiryItem[]>([]);
  const [expirySummary, setExpirySummary] = useState<any>(null);
  const [consumptionData, setConsumptionData] = useState<ConsumptionItem[]>([]);
  const [consumptionSummary, setConsumptionSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<any>(null);

// Load initial data
  useEffect(() => {
    fetchLocations();
  }, []);

  // Effect to load data once a location is selected


  const fetchLocations = async () => {
    try {
      // Call the Server Action directly
      const data = await getPharmacyLocations();
      
      setLocations(data);

      // Automatically set the first pharmacy as the active filter
      if (data && data.length > 0) {
        setLocationFilter(data[0].uuid);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const loadOverviewData = async () => {
    if (!locationFilter) return;

    setLoading(prev => ({ ...prev, overview: true }));
    
    try {
      // Load all reports data in parallel
      await Promise.all([
        loadStockLevels(),
        loadExpiryItems(),
        loadConsumptionReport(),
        loadAlerts()
      ]);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  };

    useEffect(() => {
    if (locationFilter) {
      loadOverviewData();
    }
  }, [locationFilter, dateRange, loadOverviewData]);

  const loadStockLevels = async () => {
    setLoading(prev => ({ ...prev, stockLevels: true }));
    try {
      const result = await getStockLevels({
        locationUuid: locationFilter,
        includeZeroQuantity: false
      });

      if (result.success && result.data) {
        setStockLevels(result.data);
        setStockSummary(result.summary ?? null);
      }
    } catch (err) {
      console.error('Failed to load stock levels:', err);
    } finally {
      setLoading(prev => ({ ...prev, stockLevels: false }));
    }
  };

  const loadExpiryItems = async () => {
    setLoading(prev => ({ ...prev, expiry: true }));
    try {
      const result = await getExpiryItems({
        locationUuid: locationFilter,
        expiryStatus: 'ALL'
      });

      if (result.success && result.data) {
        setExpiryItems(result.data);
        setExpirySummary(result.summary);
      }
    } catch (err) {
      console.error('Failed to load expiry items:', err);
    } finally {
      setLoading(prev => ({ ...prev, expiry: false }));
    }
  };

  const loadConsumptionReport = async () => {
    setLoading(prev => ({ ...prev, consumption: true }));
    try {
      const result = await getConsumptionReport({
        locationUuid: locationFilter,
        dateRange
      });

      if (result.success && result.data) {
        setConsumptionData(result.data);
        setConsumptionSummary(result.summary);
      }
    } catch (err) {
      console.error('Failed to load consumption report:', err);
    } finally {
      setLoading(prev => ({ ...prev, consumption: false }));
    }
  };

  const loadAlerts = async () => {
    setLoading(prev => ({ ...prev, alerts: true }));
    try {
      const result = await getStockAlerts({
        locationUuid: locationFilter
      });

      if (result.success && result.data) {
        setAlerts(result.data);
        setAlertsSummary(result.summary);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  };

  const getReportData = () => {
    switch (activeReport) {
      case 'STOCK_LEVELS':
        return { data: stockLevels, summary: stockSummary, loading: loading.stockLevels };
      case 'EXPIRY':
        return { data: expiryItems, summary: expirySummary, loading: loading.expiry };
      case 'CONSUMPTION':
        return { data: consumptionData, summary: consumptionSummary, loading: loading.consumption };
      case 'ALERTS':
        return { data: alerts, summary: alertsSummary, loading: loading.alerts };
      default:
        return { data: [], summary: null, loading: loading.overview };
    }
  };

  const getReportIcon = (reportType: string) => {
    switch (reportType) {
      case 'OVERVIEW':
        return <Database className="h-5 w-5" />;
      case 'STOCK_LEVELS':
        return <Layers className="h-5 w-5" />;
      case 'EXPIRY':
        return <Clock className="h-5 w-5" />;
      case 'CONSUMPTION':
        return <Activity className="h-5 w-5" />;
      case 'ALERTS':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getReportTitle = (reportType: string) => {
    switch (reportType) {
      case 'OVERVIEW':
        return 'Reports Dashboard';
      case 'STOCK_LEVELS':
        return 'Stock Levels Report';
      case 'EXPIRY':
        return 'Expiry Items Report';
      case 'CONSUMPTION':
        return 'Consumption Report';
      case 'ALERTS':
        return 'Stock Alerts Report';
      default:
        return 'Report';
    }
  };

  const handleExport = () => {
    const { data } = getReportData();
    if (!data || data.length === 0) return;

    let headers: string[] = [];
    let csvRows: string[] = [];

    switch (activeReport) {
      case 'STOCK_LEVELS':
        headers = ['Item Name', 'Location', 'Quantity', 'Batch', 'Expiry Date', 'Days to Expiry', 'Stock Status'];
        csvRows = [
          headers.join(','),
          ...(data as StockLevel[]).map(item => [
            `"${item.stockItemName}"`,
            `"${item.locationName}"`,
            item.quantity,
            `"${item.batchNumber || 'N/A'}"`,
            `"${item.expirationDate || 'N/A'}"`,
            item.daysToExpiry || '',
            `"${item.stockStatus}"`
          ].join(','))
        ];
        break;
      case 'EXPIRY':
        headers = ['Item Name', 'Location', 'Batch', 'Quantity', 'Expiry Date', 'Days to Expiry', 'Expiry Status'];
        csvRows = [
          headers.join(','),
          ...(data as ExpiryItem[]).map(item => [
            `"${item.stockItemName}"`,
            `"${item.locationName}"`,
            `"${item.batchNumber}"`,
            item.quantity,
            `"${item.expirationDate}"`,
            item.daysToExpiry,
            `"${item.expiryStatus}"`
          ].join(','))
        ];
        break;
      case 'CONSUMPTION':
        headers = ['Item Name', 'Location', 'Period', 'Opening Balance', 'Receipts', 'Issues', 'Adjustments', 'Closing Balance', 'Total Consumption', 'Avg Daily'];
        csvRows = [
          headers.join(','),
          ...(data as ConsumptionItem[]).map(item => [
            `"${item.stockItemName}"`,
            `"${item.locationName}"`,
            `"${item.period}"`,
            item.openingBalance,
            item.receipts,
            item.issues,
            item.adjustments,
            item.closingBalance,
            item.totalConsumption,
            item.averageDailyConsumption?.toFixed(2) || '0.00'
          ].join(','))
        ];
        break;
      case 'ALERTS':
        headers = ['Alert Type', 'Alert Level', 'Item Name', 'Location', 'Current Quantity', 'Message', 'Suggested Action', 'Date Generated'];
        csvRows = [
          headers.join(','),
          ...(data as StockAlert[]).map(alert => [
            `"${alert.alertType}"`,
            `"${alert.alertLevel}"`,
            `"${alert.stockItemName}"`,
            `"${alert.locationName}"`,
            alert.currentQuantity,
            `"${alert.message}"`,
            `"${alert.suggestedAction || 'N/A'}"`,
            `"${alert.dateGenerated}"`
          ].join(','))
        ];
        break;
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport.toLowerCase()}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const navigateToDetailReport = () => {
    switch (activeReport) {
      case 'STOCK_LEVELS':
        router.push('/pharmacy/stock/levels');
        break;
      case 'EXPIRY':
        router.push('/pharmacy/stock/reports/expiry');
        break;
      case 'CONSUMPTION':
        router.push('/pharmacy/stock/reports/consumption');
        break;
      case 'ALERTS':
        router.push('/pharmacy/stock/reports/alerts');
        break;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{getReportTitle(activeReport)}</h1>
            <p className="text-gray-600 mt-1">Comprehensive inventory analysis and reporting</p>
          </div>
          <div className="flex space-x-3">
            {activeReport !== 'OVERVIEW' && (
              <>
                <button
                  onClick={navigateToDetailReport}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Report
                </button>
                <button
                  onClick={handleExport}
                  disabled={getReportData().data.length === 0}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {getReportTitle(activeReport).split(' ')[0]}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Report Selection Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-2 mb-6">
          <div className="flex space-x-1">
            {(['OVERVIEW', 'STOCK_LEVELS', 'EXPIRY', 'CONSUMPTION', 'ALERTS'] as const).map((report) => (
              <button
                key={report}
                onClick={() => setActiveReport(report)}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition ${
                  activeReport === report
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {getReportIcon(report)}
                <span className="ml-2">{getReportTitle(report).split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {locations.map(location => (
                    <option key={location.uuid} value={location.uuid}>
                      {location.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range */}
            {activeReport === 'CONSUMPTION' || activeReport === 'OVERVIEW' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Period
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="THIS_WEEK">This Week</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="THIS_QUARTER">This Quarter</option>
                  <option value="THIS_YEAR">This Year</option>
                </select>
              </div>
            ) : null}

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={loadOverviewData}
                disabled={loading.overview}
                className="flex items-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading.overview ? 'animate-spin' : ''}`} />
                Refresh All Reports
              </button>
            </div>
          </div>
        </div>

        {/* Reports Content */}
        <div className="space-y-6">
          {activeReport === 'OVERVIEW' ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Stock Items</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stockSummary?.totalItems || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {stockSummary?.itemsInStock || 0} in stock
                      </p>
                    </div>
                    <Layers className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Expiring Items</p>
                      <p className="text-3xl font-bold text-orange-600 mt-2">
                        {(expirySummary?.criticalCount || 0) + (expirySummary?.warningCount || 0)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {expirySummary?.expiredCount || 0} expired
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                      <p className="text-3xl font-bold text-red-600 mt-2">
                        {alertsSummary?.criticalAlerts || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {alertsSummary?.totalAlerts || 0} total alerts
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Consumption</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {consumptionSummary?.totalConsumption?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {consumptionSummary?.totalItems || 0} items
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Report Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stock Levels Card */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Stock Levels</h3>
                      <button
                        onClick={() => setActiveReport('STOCK_LEVELS')}
                        className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {loading.stockLevels ? (
                      <div className="text-center py-8">
                        <div className="animate-pulse">
                          <Layers className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Loading stock levels...</p>
                        </div>
                      </div>
                    ) : stockLevels.length === 0 ? (
                      <div className="text-center py-8">
                        <Layers className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No stock data available</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {stockLevels.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={`h-3 w-3 rounded-full mr-3 ${
                                  item.stockStatus === 'LOW' || item.stockStatus === 'CRITICAL' ? 'bg-red-500' :
                                  item.stockStatus === 'OVERSTOCK' ? 'bg-blue-500' :
                                  'bg-green-500'
                                }`}></div>
                                <span className="text-sm text-gray-700 truncate max-w-[150px]">{item.stockItemName}</span>
                              </div>
                              <div className="text-sm font-medium">
                                {item.quantity} <span className="text-gray-500 text-xs">{item.quantityUom}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {stockLevels.length > 5 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-500">
                              +{stockLevels.length - 5} more items
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Expiry Items Card */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Expiring Items</h3>
                      <button
                        onClick={() => setActiveReport('EXPIRY')}
                        className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {loading.expiry ? (
                      <div className="text-center py-8">
                        <div className="animate-pulse">
                          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Loading expiry data...</p>
                        </div>
                      </div>
                    ) : expiryItems.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No expiring items</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {expiryItems
                            .filter(item => item.expiryStatus === 'CRITICAL' || item.expiryStatus === 'WARNING')
                            .slice(0, 5)
                            .map((item, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className={`h-3 w-3 rounded-full mr-3 ${
                                    item.expiryStatus === 'CRITICAL' ? 'bg-red-500' :
                                    item.expiryStatus === 'WARNING' ? 'bg-orange-500' :
                                    'bg-green-500'
                                  }`}></div>
                                  <div>
                                    <span className="text-sm text-gray-700 block">{item.stockItemName}</span>
                                    <span className="text-xs text-gray-500">Batch: {item.batchNumber}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-sm font-medium ${
                                    item.expiryStatus === 'CRITICAL' ? 'text-red-600' :
                                    item.expiryStatus === 'WARNING' ? 'text-orange-600' :
                                    'text-gray-600'
                                  }`}>
                                    {item.daysToExpiry} days
                                  </div>
                                  <div className="text-xs text-gray-500">{item.quantity} units</div>
                                </div>
                              </div>
                            ))}
                        </div>
                        {expiryItems.length > 5 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-500">
                              +{expiryItems.length - 5} more items
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Consumption Card */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Top Consumption</h3>
                      <button
                        onClick={() => setActiveReport('CONSUMPTION')}
                        className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {loading.consumption ? (
                      <div className="text-center py-8">
                        <div className="animate-pulse">
                          <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Loading consumption data...</p>
                        </div>
                      </div>
                    ) : consumptionData.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No consumption data available</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {consumptionData
                            .sort((a, b) => b.totalConsumption - a.totalConsumption)
                            .slice(0, 5)
                            .map((item, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="h-3 w-3 bg-blue-500 rounded-full mr-3"></div>
                                  <span className="text-sm text-gray-700 truncate max-w-[150px]">{item.stockItemName}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">{item.totalConsumption.toLocaleString()}</div>
                                  <div className="text-xs text-gray-500">
                                    Avg: {item.averageDailyConsumption?.toFixed(1) || 0}/day
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                        {consumptionData.length > 5 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-500">
                              +{consumptionData.length - 5} more items
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Alerts Card */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
                      <button
                        onClick={() => setActiveReport('ALERTS')}
                        className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {loading.alerts ? (
                      <div className="text-center py-8">
                        <div className="animate-pulse">
                          <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">Loading alerts...</p>
                        </div>
                      </div>
                    ) : alerts.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No active alerts</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {alerts.slice(0, 5).map((alert, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={`h-3 w-3 rounded-full mr-3 ${
                                  alert.alertLevel === 'CRITICAL' ? 'bg-red-500' :
                                  alert.alertLevel === 'WARNING' ? 'bg-orange-500' :
                                  'bg-blue-500'
                                }`}></div>
                                <div>
                                  <span className="text-sm text-gray-700 block">{alert.stockItemName}</span>
                                  <span className="text-xs text-gray-500">{alert.alertType.replace('_', ' ')}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{alert.currentQuantity}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(alert.dateGenerated).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {alerts.length > 5 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-500">
                              +{alerts.length - 5} more alerts
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Individual Report View */
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{getReportTitle(activeReport)}</h3>
                {getReportData().summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(getReportData().summary).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-xl font-semibold mt-1">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {getReportData().loading ? (
                <div className="text-center py-12">
                  <div className="animate-pulse">
                    {getReportIcon(activeReport)}
                    <p className="text-gray-500 mt-2">Loading {getReportTitle(activeReport).toLowerCase()}...</p>
                  </div>
                </div>
              ) : getReportData().data.length === 0 ? (
                <div className="text-center py-12">
                  {getReportIcon(activeReport)}
                  <p className="text-gray-500 mt-2">No data available for this report</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {activeReport === 'STOCK_LEVELS' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </>
                        )}
                        {activeReport === 'EXPIRY' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days to Expiry</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </>
                        )}
                        {activeReport === 'CONSUMPTION' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipts</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumption</th>
                          </>
                        )}
                        {activeReport === 'ALERTS' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alert</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getReportData().data.slice(0, 10).map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {activeReport === 'STOCK_LEVELS' && (
                            <>
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{item.stockItemName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-700">{item.locationName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium">{item.quantity}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-700">{item.batchNumber || 'Default'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  item.stockStatus === 'NORMAL' ? 'bg-green-100 text-green-800' :
                                  item.stockStatus === 'LOW' ? 'bg-orange-100 text-orange-800' :
                                  item.stockStatus === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                  item.stockStatus === 'OVERSTOCK' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.stockStatus}
                                </span>
                              </td>
                            </>
                          )}
                          {activeReport === 'EXPIRY' && (
                            <>
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{item.stockItemName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-700">{item.batchNumber}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium">{item.quantity}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-700">{new Date(item.expirationDate).toLocaleDateString()}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`font-medium ${
                                  item.expiryStatus === 'CRITICAL' ? 'text-red-600' :
                                  item.expiryStatus === 'WARNING' ? 'text-orange-600' :
                                  'text-gray-600'
                                }`}>
                                  {item.daysToExpiry}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  item.expiryStatus === 'SAFE' ? 'bg-green-100 text-green-800' :
                                  item.expiryStatus === 'WARNING' ? 'bg-orange-100 text-orange-800' :
                                  item.expiryStatus === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                  item.expiryStatus === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.expiryStatus}
                                </span>
                              </td>
                            </>
                          )}
                          {activeReport === 'CONSUMPTION' && (
                            <>
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{item.stockItemName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-700">{item.period}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium">{item.openingBalance}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium">{item.receipts}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium">{item.issues}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium text-blue-600">{item.totalConsumption}</div>
                              </td>
                            </>
                          )}
                          {activeReport === 'ALERTS' && (
                            <>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  item.alertLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                  item.alertLevel === 'WARNING' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {item.alertType.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">{item.stockItemName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-700">{item.locationName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`font-medium ${
                                  item.currentQuantity === 0 ? 'text-red-600' :
                                  item.belowReorderLevel ? 'text-orange-600' :
                                  'text-gray-600'
                                }`}>
                                  {item.currentQuantity}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-700 max-w-md truncate">{item.message}</div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {getReportData().data.length > 10 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                      <p className="text-sm text-gray-500">
                        Showing 10 of {getReportData().data.length} items
                      </p>
                      <button
                        onClick={navigateToDetailReport}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View all {getReportData().data.length} items →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}