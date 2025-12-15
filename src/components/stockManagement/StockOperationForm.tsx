'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Save, 
  X, 
  Plus, 
  Minus,
  Trash2,
  Search,
  AlertTriangle,
  Check,
  Loader2,
  Calendar,
  Building,
  User,
  FileText,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

import { useRouter, useSearchParams } from 'next/navigation';
// Update import to use database action
import { searchStockItemsDirect } from '@/lib/stockManagement/stockItemDirect';
import { StockItem } from '@/lib/stockManagement/stockItemDirect'; // Import from same file
import { getStockOperationTypes, createStockAdjustment, createStockTransfer, createStockReceipt, createStockOperation } from '@/lib/stockManagement/stockOperation';
import { StockOperationType, StockOperationItem } from '@/lib/stockManagement/stockOperationTypes';

export default function StockOperationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const operationTypeParam = searchParams.get('type');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [operationType, setOperationType] = useState<StockOperationType>(
    operationTypeParam as StockOperationType || StockOperationType.ADJUSTMENT
  );
  const [operationTypes, setOperationTypes] = useState<Array<{uuid: StockOperationType, name: string}>>([]);
  
  const [formData, setFormData] = useState({
    locationUuid: '',
    sourceLocationUuid: '',
    destinationLocationUuid: '',
    operationDate: new Date().toISOString().split('T')[0],
    responsiblePersonUuid: '',
    responsiblePersonOther: '',
    reasonUuid: '',
    reasonOther: '',
    remarks: '',
    approvalRequired: false
  });

  const [items, setItems] = useState<StockOperationItem[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load operation types
  useEffect(() => {
    loadOperationTypes();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load locations
      const locationsResponse = await fetch('');
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        setLocations(locationsData.data || []);
        if (locationsData.data?.[0]) {
          setFormData(prev => ({ ...prev, locationUuid: locationsData.data[0].uuid }));
        }
      }

      // Load current user
      const userResponse = await fetch('/api/current-user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.data) {
          setFormData(prev => ({ ...prev, responsiblePersonUuid: userData.data.uuid }));
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadOperationTypes = async () => {
    try {
      const result = await getStockOperationTypes();
      if (result.success && result.data) {
        setOperationTypes(result.data);
      }
    } catch (err) {
      console.error('Failed to load operation types:', err);
    }
  };

  const handleSearchItems = async () => {
    if (!searchTerm.trim()) return;

    try {
      setSearching(true);
      // Use database-based search function instead of API
      const result = await searchStockItemsDirect({
        name: searchTerm,
        limit: 10
      });

      if (result.success && result.data) {
        setStockItems(result.data);
      } else {
        setStockItems([]);
      }
    } catch (err) {
      console.error('Failed to search items:', err);
      setStockItems([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedItem) {
      setError('Please select an item first');
      return;
    }

    // Check if item already exists
    const existingItem = items.find(item => item.stockItemUuid === selectedItem.uuid);
    if (existingItem) {
      setError('Item already added to operation');
      return;
    }

    const newItem: StockOperationItem = {
      stockItemUuid: selectedItem.uuid!,
      stockItemName: selectedItem.drugName,
      quantity: 1,
      // Note: defaultBatchNumber and pricing fields don't exist in database
      // Use appropriate fields from your actual StockItem interface
      batchNumber: selectedItem.defaultBatchNo || '', // Changed from defaultBatchNumber
      purchasePrice: selectedItem.purchasePrice, // Changed from pricing.purchasePrice
      // sellingPrice field removed since it doesn't exist in database
    };

    setItems(prev => [...prev, newItem]);
    setSelectedItem(null);
    setSearchTerm('');
    setStockItems([]);
    setError('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof StockOperationItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.locationUuid) {
      setError('Location is required');
      return false;
    }

    if (operationType === StockOperationType.TRANSFER_OUT && !formData.destinationLocationUuid) {
      setError('Destination location is required for transfers');
      return false;
    }

    if (items.length === 0) {
      setError('At least one item is required');
      return false;
    }

    for (const item of items) {
      if (!item.stockItemUuid) {
        setError('Stock item is required for all items');
        return false;
      }

      if (item.quantity <= 0) {
        setError('Quantity must be greater than zero for all items');
        return false;
      }

      if (operationType === StockOperationType.RECEIPT || operationType === StockOperationType.OPENING_STOCK) {
        if (!item.batchNumber) {
          setError('Batch number is required for receipts and opening stock');
          return false;
        }
        if (operationType === StockOperationType.RECEIPT && !item.expirationDate) {
          setError('Expiration date is required for receipts');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const operationData = {
        operationType,
        operationDate: formData.operationDate,
        locationUuid: formData.locationUuid,
        sourceLocationUuid: formData.sourceLocationUuid,
        destinationLocationUuid: formData.destinationLocationUuid,
        responsiblePersonUuid: formData.responsiblePersonUuid,
        responsiblePersonOther: formData.responsiblePersonOther,
        reasonUuid: formData.reasonUuid,
        reasonOther: formData.reasonOther,
        remarks: formData.remarks,
        approvalRequired: formData.approvalRequired,
        status: 'NEW' as const,
        items
      };

      let result;
      
      // Use specific helper functions for common operations
      switch (operationType) {
        case StockOperationType.ADJUSTMENT:
          const adjustmentReason = formData.reasonOther || 'Manual adjustment';
          result = await createStockAdjustment(
            formData.locationUuid,
            items,
            adjustmentReason,
            formData.operationDate
          );
          break;

        case StockOperationType.TRANSFER_OUT:
          if (!formData.destinationLocationUuid) {
            throw new Error('Destination location required for transfers');
          }
          result = await createStockTransfer(
            formData.locationUuid,
            formData.destinationLocationUuid,
            items,
            formData.remarks
          );
          break;

        case StockOperationType.RECEIPT:
          const supplier = formData.responsiblePersonOther;
          result = await createStockReceipt(
            formData.locationUuid,
            items,
            supplier,
            formData.remarks
          );
          break;

        default:
          // Use generic create function for other operation types
          result = await createStockOperation(operationData);
      }

      if (result.success) {
        setSuccess(`Operation created successfully: ${result.operationUuid || ''}`);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/pharmacy/stock/operations');
        }, 2000);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(`Failed to create operation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/pharmacy/stock/operations');
  };

  const getOperationTitle = () => {
    const type = operationTypes.find(t => t.uuid === operationType);
    return type ? `New ${type.name}` : 'New Stock Operation';
  };

  const requiresBatchInfo = () => {
    return operationType === StockOperationType.RECEIPT || 
           operationType === StockOperationType.OPENING_STOCK;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{getOperationTitle()}</h1>
                <p className="text-gray-600 mt-1">Create a new inventory transaction</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <X className="h-4 w-4 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 inline mr-2" />
                    Create Operation
                  </>
                )}
              </button>
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
                <Check className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Operation Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Operation Type */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Operation Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operation Type *
                  </label>
                  <div className="relative">
                    <select
                      value={operationType}
                      onChange={(e) => setOperationType(e.target.value as StockOperationType)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {operationTypes.map(type => (
                        <option key={type.uuid} value={type.uuid}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operation Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.operationDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, operationDate: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={formData.locationUuid}
                      onChange={(e) => setFormData(prev => ({ ...prev, locationUuid: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
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

                {operationType === StockOperationType.TRANSFER_OUT && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Location *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={formData.destinationLocationUuid}
                        onChange={(e) => setFormData(prev => ({ ...prev, destinationLocationUuid: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select destination...</option>
                        {locations.map(location => (
                          <option key={location.uuid} value={location.uuid}>
                            {location.display}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsible Person
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.responsiblePersonOther}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsiblePersonOther: e.target.value }))}
                      placeholder="Person responsible for operation"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason / Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Enter reason for this operation..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Add Items */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Items</h2>
              
              <div className="space-y-4">
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchItems()}
                      placeholder="Search for stock items..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchItems}
                    disabled={searching || !searchTerm.trim()}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {searching ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>

                {/* Search Results */}
                {stockItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="p-2 bg-gray-50 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-700">Search Results</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {stockItems.map(item => (
                        <div
                          key={item.uuid}
                          className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            selectedItem?.uuid === item.uuid ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedItem(item)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{item.drugName}</div>
                              {item.commonName && (
                                <div className="text-sm text-gray-600">{item.commonName}</div>
                              )}
                              <div className="text-sm text-gray-500">
                                {/* Note: manufacturer field doesn't exist in database */}
                                Category: {item.category?.uuid || 'Not specified'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                ${item.purchasePrice?.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.reorderLevel || 'N/A'} reorder
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Item Preview */}
                {selectedItem && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">Selected Item</h3>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{selectedItem.drugName}</div>
                        <div className="text-sm text-gray-600">
                          ${selectedItem.purchasePrice?.toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <Plus className="h-4 w-4 inline mr-2" />
                        Add to Operation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Operation Items</h2>
                <span className="text-sm text-gray-600">
                  {items.length} item(s) • Total: {items.reduce((sum, item) => sum + item.quantity, 0)} units
                </span>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No items added yet</p>
                  <p className="text-sm text-gray-400 mt-1">Search and add items above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Package className="h-5 w-5 text-blue-600 mr-2" />
                            <div>
                              <div className="font-medium text-gray-900">{item.stockItemName}</div>
                              <div className="text-sm text-gray-500">
                                Item ID: {item.stockItemUuid?.substring(0, 8) || 'N/A'}...
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        {requiresBatchInfo() && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Batch Number *
                              </label>
                              <input
                                type="text"
                                value={item.batchNumber || ''}
                                onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required={requiresBatchInfo()}
                              />
                            </div>

                            {operationType === StockOperationType.RECEIPT && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Expiration Date *
                                </label>
                                <input
                                  type="date"
                                  value={item.expirationDate || ''}
                                  onChange={(e) => handleItemChange(index, 'expirationDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required={operationType === StockOperationType.RECEIPT}
                                />
                              </div>
                            )}
                          </>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Purchase Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.purchasePrice || ''}
                            onChange={(e) => handleItemChange(index, 'purchasePrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary and Actions */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Operation Summary</h3>
              <p className="text-sm text-gray-600">
                {items.length} items • {items.reduce((sum, item) => sum + item.quantity, 0)} total units
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || items.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                    Creating Operation...
                  </>
                ) : (
                  'Create Operation'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}