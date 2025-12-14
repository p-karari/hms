'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calculator,
  Building,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  BarChart3,
  Package,
  Clock,
  DollarSign,
  FileText,
  Save,
  Send,
  AlertCircle
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { ReconciliationReport, BatchReconciliation, ReconciliationItem, ReconciliationPeriod, reconcileDispensingWithStock, getBatchReconciliation, resolveReconciliationVariance } from '@/lib/stockManagement/stockReconcilliation';
import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';

export default function ReconciliationReportPage() {
  const router = useRouter();
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationReport | null>(null);
  const [batchReconciliations, setBatchReconciliations] = useState<BatchReconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [periodType, setPeriodType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'>('MONTHLY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<ReconciliationItem | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionType, setResolutionType] = useState<'ADJUSTMENT' | 'WRITE_OFF' | 'CORRECTION' | 'OTHER'>('ADJUSTMENT');
  const [resolving, setResolving] = useState(false);

// Load initial data
  useEffect(() => {
    fetchLocations();
    setDefaultDates();
  }, []);

  const fetchLocations = async () => {
    try {
      // Call the Server Action
      const data = await getPharmacyLocations();
      
      // Update state with the returned array
      setLocations(data);

      // Set default location filter if list isn't empty and no filter exists
      if (data && data.length > 0 && !locationFilter) {
        setLocationFilter(data[0].uuid);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const setDefaultDates = () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = today;
    
    setCustomStartDate(startDate.toISOString().split('T')[0]);
    setCustomEndDate(endDate.toISOString().split('T')[0]);
  };

  const generatePeriod = (): ReconciliationPeriod => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (periodType) {
      case 'DAILY':
        startDate = new Date(today);
        break;
      case 'WEEKLY':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'MONTHLY':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'CUSTOM':
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      periodType,
      locationUuid: locationFilter
    };
  };

  const runReconciliation = async () => {
    if (!locationFilter) {
      setError('Please select a location');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const period = generatePeriod();

      const result = await reconcileDispensingWithStock({
        period,
        locationUuid: locationFilter,
        generateAdjustments: false,
        autoApproveMinorVariances: false,
        varianceThreshold: 5
      });

      if (result.success && result.report) {
        setReconciliationReport(result.report);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run reconciliation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBatchReconciliation = async () => {
    if (!locationFilter) return;

    try {
      setBatchLoading(true);
      const result = await getBatchReconciliation(locationFilter);
      
      if (result.success && result.data) {
        setBatchReconciliations(result.data);
      }
    } catch (err) {
      console.error('Failed to load batch reconciliation:', err);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleResolveVariance = async (item: ReconciliationItem) => {
    if (!item.requiresInvestigation) return;

    setSelectedItem(item);
    setShowResolutionModal(true);
  };

  const confirmResolveVariance = async () => {
    if (!selectedItem || !locationFilter) return;

    try {
      setResolving(true);
      
      const result = await resolveReconciliationVariance(
        selectedItem.stockItemUuid,
        selectedItem.batchNumber,
        locationFilter,
        selectedItem.varianceQuantity,
        resolutionType,
        'CURRENT_USER_UUID', // Would come from auth
        resolutionNotes[selectedItem.stockItemUuid] || ''
      );

      if (result.success) {
        // Update local state
        if (reconciliationReport) {
          setReconciliationReport({
            ...reconciliationReport,
            items: reconciliationReport.items.map(item => 
              item.stockItemUuid === selectedItem.stockItemUuid && 
              item.batchNumber === selectedItem.batchNumber
                ? {
                    ...item,
                    requiresInvestigation: false,
                    resolutionType,
                    investigationNotes: resolutionNotes[selectedItem.stockItemUuid] || '',
                    resolvedByUuid: 'CURRENT_USER_UUID',
                    resolutionDate: new Date().toISOString()
                  }
                : item
            )
          });
        }

        setShowResolutionModal(false);
        setSelectedItem(null);
        setResolutionNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[selectedItem.stockItemUuid];
          return newNotes;
        });

        // Show success message
        // toast.success('Variance resolved successfully');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve variance');
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MATCH':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MINOR_VARIANCE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'MAJOR_VARIANCE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'UNRECONCILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'MATCH':
        return <CheckCircle className="h-4 w-4" />;
      case 'MINOR_VARIANCE':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MAJOR_VARIANCE':
      case 'UNRECONCILED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const exportReport = () => {
    if (!reconciliationReport) return;

    const headers = [
      'Item Name',
      'Batch Number',
      'Location',
      'Theoretical Quantity',
      'Actual Quantity',
      'Dispensed Quantity',
      'Received Quantity',
      'Variance Quantity',
      'Variance %',
      'Status',
      'Requires Investigation'
    ];

    const csvRows = [
      headers.join(','),
      ...reconciliationReport.items.map(item => [
        `"${item.stockItemName}"`,
        `"${item.batchNumber || 'N/A'}"`,
        `"${item.locationName}"`,
        item.theoreticalQuantity,
        item.actualQuantity,
        item.dispensedQuantity,
        item.receivedQuantity,
        item.varianceQuantity,
        item.variancePercentage?.toFixed(2) || '0.00',
        `"${item.status}"`,
        item.requiresInvestigation ? 'Yes' : 'No'
      ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reconciliation Report</h1>
            <p className="text-gray-600 mt-1">Reconcile dispensing with physical stock counts</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                runReconciliation();
                loadBatchReconciliation();
              }}
              disabled={loading || !locationFilter}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {loading ? 'Running Reconciliation...' : 'Run Reconciliation'}
            </button>
            {reconciliationReport && (
              <button
                onClick={exportReport}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Location</option>
                  {locations.map(location => (
                    <option key={location.uuid} value={location.uuid}>
                      {location.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period Type
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {periodType === 'CUSTOM' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
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
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Reconciliation Settings */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Reconciliation Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoAdjust"
                  className="h-4 w-4 text-blue-600 rounded"
                  defaultChecked={false}
                />
                <label htmlFor="autoAdjust" className="ml-2 text-sm text-gray-700">
                  Auto-generate adjustments for minor variances
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoApprove"
                  className="h-4 w-4 text-blue-600 rounded"
                  defaultChecked={false}
                />
                <label htmlFor="autoApprove" className="ml-2 text-sm text-gray-700">
                  Auto-approve minor variances
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variance Threshold (%)
                </label>
                <input
                  type="number"
                  defaultValue="5"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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

        {/* Summary Cards */}
        {reconciliationReport && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {reconciliationReport.totalItems}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Matched</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {reconciliationReport.matchedItems}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Variances</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {reconciliationReport.minorVarianceItems + reconciliationReport.majorVarianceItems}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Variance</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {Math.abs(reconciliationReport.totalVarianceValue).toFixed(2)}
                  </p>
                </div>
                <Scale className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Reconciliation Results */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="animate-pulse">
              <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Running Reconciliation</h3>
              <p className="text-gray-500">Comparing dispensing data with stock levels...</p>
            </div>
          </div>
        ) : reconciliationReport ? (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Reconciliation Report</h3>
                  <p className="text-sm text-gray-600">
                    Period: {formatDate(reconciliationReport.period.startDate)} to {formatDate(reconciliationReport.period.endDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Location: {locations.find(l => l.uuid === locationFilter)?.display || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Generated: {formatDate(reconciliationReport.generatedDate)}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-medium ${
                  reconciliationReport.status === 'COMPLETED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {reconciliationReport.status}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Theoretical</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reconciliationReport.items.map((item) => {
                      const itemId = `${item.stockItemUuid}_${item.batchNumber}`;
                      const isExpanded = expandedItems.has(itemId);
                      
                      return (
                        <React.Fragment key={itemId}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{item.stockItemName}</p>
                                <p className="text-sm text-gray-500">{item.locationName}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-gray-700">{item.batchNumber || 'Default'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium">{item.theoreticalQuantity.toFixed(2)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium">{item.actualQuantity.toFixed(2)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`flex items-center font-medium ${
                                item.varianceQuantity === 0 ? 'text-gray-600' :
                                item.varianceQuantity > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {item.varianceQuantity > 0 ? (
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                ) : item.varianceQuantity < 0 ? (
                                  <TrendingDown className="h-4 w-4 mr-1" />
                                ) : null}
                                <span>
                                  {item.varianceQuantity > 0 ? '+' : ''}
                                  {item.varianceQuantity.toFixed(2)}
                                </span>
                                <span className="ml-2 text-sm text-gray-500">
                                  ({item.variancePercentage?.toFixed(1) || 0}%)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                {getStatusIcon(item.status)}
                                <span className="ml-1">{item.status.replace('_', ' ')}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleExpand(itemId)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </button>
                                {item.requiresInvestigation && (
                                  <button
                                    onClick={() => handleResolveVariance(item)}
                                    className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
                                  >
                                    Resolve
                                  </button>
                                )}
                                <button
                                  onClick={() => router.push(`/pharmacy/stock/items/${item.stockItemUuid}?location=${item.locationUuid}`)}
                                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Transaction Summary</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Dispensed:</span>
                                        <span className="text-sm font-medium">{item.dispensedQuantity.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Received:</span>
                                        <span className="text-sm font-medium">{item.receivedQuantity.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Adjusted:</span>
                                        <span className="text-sm font-medium">{item.adjustedQuantity.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Transferred Out:</span>
                                        <span className="text-sm font-medium">{item.transferredOutQuantity.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Investigation Notes</h4>
                                    {item.investigationNotes ? (
                                      <p className="text-sm text-gray-600">{item.investigationNotes}</p>
                                    ) : (
                                      <textarea
                                        value={resolutionNotes[item.stockItemUuid] || ''}
                                        onChange={(e) => setResolutionNotes(prev => ({
                                          ...prev,
                                          [item.stockItemUuid]: e.target.value
                                        }))}
                                        placeholder="Add investigation notes..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                      />
                                    )}
                                  </div>
                                  
                                  {item.requiresInvestigation && !item.investigationNotes && (
                                    <div className="md:col-span-2">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Resolution Actions</h4>
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => {
                                            setSelectedItem(item);
                                            setResolutionType('ADJUSTMENT');
                                            setShowResolutionModal(true);
                                          }}
                                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                        >
                                          Create Adjustment
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedItem(item);
                                            setResolutionType('WRITE_OFF');
                                            setShowResolutionModal(true);
                                          }}
                                          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                        >
                                          Write Off
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedItem(item);
                                            setResolutionType('CORRECTION');
                                            setShowResolutionModal(true);
                                          }}
                                          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                        >
                                          Mark as Correct
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Batch Reconciliation */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Batch-level Reconciliation</h3>
                <button
                  onClick={loadBatchReconciliation}
                  disabled={batchLoading || !locationFilter}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${batchLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {batchLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading batch data...</p>
                  </div>
                </div>
              ) : batchReconciliations.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No batch reconciliation data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {batchReconciliations.map((batch) => (
                        <tr key={`${batch.stockItemUuid}_${batch.batchNumber}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{batch.batchNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{batch.stockItemName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{batch.closingBalance.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{batch.actualQuantity.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-medium ${
                              batch.varianceQuantity === 0 ? 'text-gray-600' :
                              batch.varianceQuantity > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {batch.varianceQuantity.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              batch.reconciliationStatus === 'RECONCILED' 
                                ? 'bg-green-100 text-green-800'
                                : batch.reconciliationStatus === 'VARIANCES'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {batch.reconciliationStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {batch.expirationDate ? (
                              <div className={`text-sm ${
                                batch.batchStatus === 'EXPIRED' ? 'text-red-600' :
                                batch.batchStatus === 'NEAR_EXPIRY' ? 'text-orange-600' :
                                'text-gray-600'
                              }`}>
                                {formatDate(batch.expirationDate)}
                                {batch.daysToExpiry !== undefined && (
                                  <span className="block text-xs">
                                    ({batch.daysToExpiry} days)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No expiry</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reconciliation Data</h3>
            <p className="text-gray-500 mb-6">Select a location and run reconciliation to see results</p>
            <button
              onClick={runReconciliation}
              disabled={!locationFilter}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Run First Reconciliation
            </button>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {showResolutionModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resolve Variance</h3>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Item: {selectedItem.stockItemName}</p>
                <p className="text-sm text-gray-600 mb-2">Batch: {selectedItem.batchNumber || 'Default'}</p>
                <p className="text-sm text-gray-600 mb-2">
                  Variance: <span className="font-medium">
                    {selectedItem.varianceQuantity > 0 ? '+' : ''}
                    {selectedItem.varianceQuantity.toFixed(2)} units
                    ({selectedItem.variancePercentage?.toFixed(1)}%)
                  </span>
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Type
                </label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADJUSTMENT">Create Adjustment</option>
                  <option value="WRITE_OFF">Write Off Variance</option>
                  <option value="CORRECTION">Mark as Correct</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={resolutionNotes[selectedItem.stockItemUuid] || ''}
                  onChange={(e) => setResolutionNotes(prev => ({
                    ...prev,
                    [selectedItem!.stockItemUuid]: e.target.value
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add resolution notes..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResolutionModal(false);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={resolving}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResolveVariance}
                  disabled={resolving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {resolving ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}