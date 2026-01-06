'use client';

import {
  AlertTriangle,
  Building,
  Calculator,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  Package,
  Search,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';


import { StockTakeSession as StockTakeSessionType, completeStockTakeSession, createStockTakeSession, getStockTakeSession, startStockTakeSession, updateStockTakeItem } from '@/lib/stockManagement/stockTake';
import { Minus, Plus } from 'lucide-react';


import { getPharmacyLocations } from '@/lib/stockManagement/pharmacyLocations';
import { useParams, useRouter } from 'next/navigation';

export default function StockTakeSessionComponent() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [session, setSession] = useState<StockTakeSessionType | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [countingStarted, setCountingStarted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'counted' | 'uncounted' | 'variance'>('all');

  const isEditMode = !!sessionId;

// Load initial data
useEffect(() => {
  const loadSession = async () => {
    if (!sessionId) return;

    try {
      setFetching(true);
      const result = await getStockTakeSession(sessionId);

      if (result.success && result.data) {
        setSession(result.data);
        setCountingStarted(result.data.status === 'IN_PROGRESS');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(`Failed to load stock take session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFetching(false);
    }
  };

  fetchLocations();
  if (sessionId) {
    loadSession();
  }
}, [sessionId]);

  const fetchLocations = async () => {
    try {
      // Direct call to the FHIR-based Server Action
      const data = await getPharmacyLocations();
      
      // Update state with mapped { uuid, display } objects
      setLocations(data);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };


  const handleCreateSession = async () => {
    try {
      setLoading(true);
      setError('');

      if (!session?.locationUuid) {
        setError('Location is required');
        return;
      }

      const result = await createStockTakeSession({
        locationUuid: session.locationUuid,
        operationDate: session.operationDate || new Date().toISOString().split('T')[0],
        includeExpiredItems: session.includeExpiredItems,
        includeZeroQuantityItems: session.includeZeroQuantityItems,
        allowPartialCounts: session.allowPartialCounts,
        remarks: session.remarks
      });

      if (result.success && result.sessionUuid) {
        setSuccess('Stock take session created successfully');
        router.push(`/pharmacy/stock/stocktakes/${result.sessionUuid}`);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(`Failed to create session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCounting = async () => {
    if (!session?.uuid) return;

    try {
      setLoading(true);
      
      // Get current user
      const userResponse = await fetch('/api/current-user');
      if (!userResponse.ok) {
        throw new Error('Failed to get current user');
      }
      const userData = await userResponse.json();
      const userId = userData.data?.uuid;

      if (!userId) {
        throw new Error('User not found');
      }

      const result = await startStockTakeSession(session.uuid, userId);
      
      if (result.success && result.session) {
        setSession(result.session);
        setCountingStarted(true);
        setSuccess('Counting started successfully');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(`Failed to start counting: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (itemIndex: number, physicalQuantity: number) => {
    if (!session?.uuid) return;

    try {
      const item = filteredItems[itemIndex];
      if (!item) return;

      const result = await updateStockTakeItem({
        sessionUuid: session.uuid,
        stockItemUuid: item.stockItemUuid,
        batchNumber: item.batchNumber,
        physicalQuantity: physicalQuantity,
        physicalExpirationDate: item.physicalExpirationDate,
        remarks: item.remarks
      });

      if (result.success && result.session) {
        setSession(result.session);
        setSuccess('Item count updated');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(`Failed to update item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCompleteSession = async (generateAdjustment: boolean = false) => {
    if (!session?.uuid) return;

    try {
      setLoading(true);
      
      const userResponse = await fetch('/api/current-user');
      if (!userResponse.ok) {
        throw new Error('Failed to get current user');
      }
      const userData = await userResponse.json();
      const userId = userData.data?.uuid;

      if (!userId) {
        throw new Error('User not found');
      }

      const result = await completeStockTakeSession({
        sessionUuid: session.uuid,
        generateAdjustment: generateAdjustment,
        adjustmentReason: 'Stock take variance adjustment',
        completedByUuid: userId
      });

      if (result.success && result.session) {
        setSession(result.session);
        setSuccess('Stock take completed successfully');
        
        if (generateAdjustment && result.adjustmentOperationUuid) {
          setSuccess('Stock take completed and adjustments generated');
        }
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(`Failed to complete session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionChange = (field: string, value: any) => {
    setSession(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Filter items based on search and status
  const filteredItems = session?.items?.filter(item => {
    // Search filter
    if (searchQuery && !item.stockItemName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    switch (filterStatus) {
      case 'counted': return item.counted;
      case 'uncounted': return !item.counted;
      case 'variance': return item.hasVariance;
      default: return true;
    }
  }) || [];

  const getVarianceColor = (variancePercentage: number) => {
    const absVariance = Math.abs(variancePercentage);
    if (absVariance === 0) return 'text-green-600';
    if (absVariance <= 5) return 'text-yellow-600';
    if (absVariance <= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getVarianceIcon = (variancePercentage: number) => {
    const absVariance = Math.abs(variancePercentage);
    if (absVariance === 0) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (absVariance <= 5) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  if (fetching) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading stock take session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'Stock Take Session' : 'New Stock Take'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {isEditMode 
                    ? 'Physical inventory counting and reconciliation' 
                    : 'Create a new physical inventory count session'}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {isEditMode && session && (
                <>
                  <button
                    onClick={() => router.push('/pharmacy/stock/stocktakes')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <X className="h-4 w-4 inline mr-2" />
                    Back to List
                  </button>
                  {session.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleCompleteSession(false)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      Complete Session
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          )}
        </div>

        {/* Session Configuration (for new sessions) */}
        {!isEditMode && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Session Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={session?.locationUuid || ''}
                    onChange={(e) => handleSessionChange('locationUuid', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select location...</option>
                    {locations.map(location => (
                      <option key={location.uuid} value={location.uuid}>
                        {location.display}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={session?.operationDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleSessionChange('operationDate', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeExpired"
                      checked={session?.includeExpiredItems || true}
                      onChange={(e) => handleSessionChange('includeExpiredItems', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="includeExpired" className="ml-2 text-sm text-gray-700">
                      Include expired items in count
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeZero"
                      checked={session?.includeZeroQuantityItems || false}
                      onChange={(e) => handleSessionChange('includeZeroQuantityItems', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="includeZero" className="ml-2 text-sm text-gray-700">
                      Include items with zero quantity
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowPartial"
                      checked={session?.allowPartialCounts || false}
                      onChange={(e) => handleSessionChange('allowPartialCounts', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="allowPartial" className="ml-2 text-sm text-gray-700">
                      Allow partial counts (complete session even if some items not counted)
                    </label>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={session?.remarks || ''}
                  onChange={(e) => handleSessionChange('remarks', e.target.value)}
                  placeholder="Add any notes about this stock take..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleCreateSession}
                disabled={loading || !session?.locationUuid}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  'Create Session'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Session Details (for existing sessions) */}
        {isEditMode && session && (
          <div className="space-y-6">
            {/* Session Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{session.locationName}</h2>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-gray-600">
                      Session: {session.uuid?.substring(0, 8)}...
                    </span>
                    <span className="text-sm text-gray-600">
                      Created: {new Date(session.dateCreated || '').toLocaleDateString()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      session.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      session.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                </div>
                
                {session.status === 'DRAFT' && (
                  <button
                    onClick={handleStartCounting}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Start Counting
                  </button>
                )}
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Package className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{session.totalItems}</div>
                      <div className="text-sm text-gray-600">Total Items</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{session.itemsCounted}</div>
                      <div className="text-sm text-gray-600">Counted</div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{session.itemsWithVariance}</div>
                      <div className="text-sm text-gray-600">With Variance</div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Calculator className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{session.totalVarianceQuantity}</div>
                      <div className="text-sm text-gray-600">Total Variance</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Counting Interface */}
            {countingStarted && session.status === 'IN_PROGRESS' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Counting Interface</h3>
                  
                  <div className="flex space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search items..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Items</option>
                      <option value="uncounted">Uncounted</option>
                      <option value="counted">Counted</option>
                      <option value="variance">With Variance</option>
                    </select>
                  </div>
                </div>

                {filteredItems.length > 0 && currentItemIndex < filteredItems.length ? (
                  <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">
                          Item {currentItemIndex + 1} of {filteredItems.length}
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">
                          {filteredItems[currentItemIndex].stockItemName}
                        </h4>
                        {filteredItems[currentItemIndex].batchNumber && (
                          <div className="text-sm text-gray-600 mt-1">
                            Batch: {filteredItems[currentItemIndex].batchNumber}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setCurrentItemIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentItemIndex === 0}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setCurrentItemIndex(prev => Math.min(filteredItems.length - 1, prev + 1))}
                          disabled={currentItemIndex === filteredItems.length - 1}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-700 mb-2">System Quantity</h5>
                          <div className="text-3xl font-bold text-blue-600">
                            {filteredItems[currentItemIndex].systemQuantity}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Expected quantity in system
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-700 mb-2">Physical Count</h5>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                const currentQty = filteredItems[currentItemIndex].physicalQuantity || 0;
                                handleUpdateItem(currentItemIndex, Math.max(0, currentQty - 1));
                              }}
                              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            
                            <input
                              type="number"
                              value={filteredItems[currentItemIndex].physicalQuantity || 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                handleUpdateItem(currentItemIndex, value);
                              }}
                              className="flex-1 text-center text-2xl font-bold border border-gray-300 rounded-lg px-4 py-3"
                            />
                            
                            <button
                              onClick={() => {
                                const currentQty = filteredItems[currentItemIndex].physicalQuantity || 0;
                                handleUpdateItem(currentItemIndex, currentQty + 1);
                              }}
                              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-sm text-gray-500 mt-2">
                            Enter actual counted quantity
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-700 mb-2">Variance</h5>
                          <div className={`text-3xl font-bold ${getVarianceColor(filteredItems[currentItemIndex].variancePercentage)}`}>
                            {filteredItems[currentItemIndex].varianceQuantity > 0 ? '+' : ''}
                            {filteredItems[currentItemIndex].varianceQuantity}
                          </div>
                          <div className="flex items-center mt-2">
                            {getVarianceIcon(filteredItems[currentItemIndex].variancePercentage)}
                            <span className={`ml-2 font-medium ${getVarianceColor(filteredItems[currentItemIndex].variancePercentage)}`}>
                              {filteredItems[currentItemIndex].variancePercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-700 mb-2">Status</h5>
                          <div className="flex items-center">
                            {filteredItems[currentItemIndex].counted ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                                <span className="text-green-700 font-medium">Counted</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                                <span className="text-yellow-700 font-medium">Pending</span>
                              </>
                            )}
                          </div>
                          
                          {filteredItems[currentItemIndex].requiresRecount && (
                            <div className="mt-2 flex items-center text-red-600">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              <span className="text-sm">Requires recount</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-between">
                      <button
                        onClick={() => {
                          handleUpdateItem(currentItemIndex, filteredItems[currentItemIndex].systemQuantity);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Match System Quantity
                      </button>
                      
                      <button
                        onClick={() => {
                          handleUpdateItem(currentItemIndex, 0);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Set to Zero
                      </button>
                      
                      <button
                        onClick={() => {
                          setCurrentItemIndex(prev => {
                            const nextIndex = prev + 1;
                            if (nextIndex < filteredItems.length) {
                              return nextIndex;
                            }
                            return 0; // Loop back to start
                          });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Next Item
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">All items counted!</h4>
                    <p className="text-gray-600 mb-6">
                      You have counted all items in this session.
                    </p>
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => handleCompleteSession(false)}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Complete Without Adjustments
                      </button>
                      <button
                        onClick={() => handleCompleteSession(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Complete & Generate Adjustments
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Items List Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">All Items ({session.items.length})</h3>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      // Export functionality
                      const csvRows = [
                        ['Item Name', 'Batch', 'System Qty', 'Physical Qty', 'Variance', 'Status'],
                        ...session.items.map(item => [
                          item.stockItemName,
                          item.batchNumber || 'N/A',
                          item.systemQuantity,
                          item.physicalQuantity,
                          item.varianceQuantity,
                          item.counted ? 'Counted' : 'Pending'
                        ])
                      ];
                      
                      const csvString = csvRows.map(row => row.join(',')).join('\n');
                      const blob = new Blob([csvString], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `stock-take-${session.uuid?.substring(0, 8)}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        System Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Physical Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {session.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.stockItemName}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.batchNumber || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{item.systemQuantity}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`font-medium ${item.counted ? 'text-green-600' : 'text-gray-400'}`}>
                            {item.physicalQuantity}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center ${getVarianceColor(item.variancePercentage)}`}>
                            {getVarianceIcon(item.variancePercentage)}
                            <span className="ml-2 font-medium">
                              {item.varianceQuantity > 0 ? '+' : ''}{item.varianceQuantity}
                            </span>
                            <span className="ml-2 text-sm">
                              ({item.variancePercentage.toFixed(1)}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.counted ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Counted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              const itemIndex = session.items.findIndex(i => 
                                i.stockItemUuid === item.stockItemUuid && 
                                i.batchNumber === item.batchNumber
                              );
                              if (itemIndex !== -1) {
                                setCurrentItemIndex(itemIndex);
                                // Scroll to counting interface
                                document.getElementById('counting-interface')?.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Count Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Missing icon imports
