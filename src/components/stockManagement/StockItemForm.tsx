'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Save, 
  X, 
  DollarSign,
  Tag,
  AlertTriangle,
  Check,
  Search,
  Calendar,
  Settings,
  BarChart3,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getDrugs } from '@/lib/stockManagement/getDrugs';
import { getStockCategories } from '@/lib/stockManagement/getStockCategories';
import { getUOMConcepts } from '@/lib/stockManagement/conceptUuids';
import { getStockItemDirect, createStockItemDirect } from '@/lib/stockManagement/stockItem';

export default function StockItemForm({ 
  itemUuid 
}: { 
  itemUuid?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [drugs, setDrugs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uomConcepts, setUOMConcepts] = useState<any[]>([]);
  
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);

  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    // Basic Information
    drugUuid: '',
    drugName: '',
    conceptUuid: '',
    commonName: '',
    acronym: '',
    hasExpiration: true,
    expiryNotice: 30,
    defaultBatchNo: '',
    defaultExpiryMonths: 24,
    
    // Manufacturer
    manufacturerCode: '',
    
    // Pricing
    purchasePrice: 0,
    purchasePriceUoM: '',
    
    // UOM Fields
    defaultStockOperationsUoM: '',
    dispensingUnit: '',
    reorderLevelUoM: '',
    maximumStockUoM: '',
    
    // Stock Levels
    reorderLevel: 0,
    maximumStock: 0,
    
    // Category
    categoryUuid: '',
    
    // Status
    isDrug: true,
  });

  const isEditMode = !!itemUuid;

  // Load initial data
  useEffect(() => {
    loadInitialData();
    if (itemUuid) {
      loadStockItem();
    }
  }, [itemUuid]);

  // Debounced drug search
  useEffect(() => {
    const searchDrugs = async () => {
      if (searchTerm.length > 1) {
        setIsSearching(true);
        const result = await getDrugs(searchTerm, 10);
        if (result.success && result.data) {
          setDrugs(result.data);
          setShowDrugDropdown(true);
        }
        setIsSearching(false);
      } else if (searchTerm.length === 0) {
        setDrugs([]);
        setShowDrugDropdown(false);
      }
    };

    const timeoutId = setTimeout(searchDrugs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Load initial data
  const loadInitialData = async () => {
    try {
      // Load categories
      const categoriesResult = await getStockCategories();
      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }

      // Load UOM concepts
      const uomResult = await getUOMConcepts();
      if (uomResult.success && uomResult.data) {
        setUOMConcepts(uomResult.data);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load initial data. Please try again.');
    }
  };

const loadStockItem = async () => {
  if (!itemUuid) return;

  try {
    setFetching(true);
    const result = await getStockItemDirect(itemUuid);

    if (result.success && result.data) {
      const item = result.data;
      setFormData(prev => ({
        ...prev,
        drugUuid: item.drug?.uuid || '',
        drugName: item.drugName || '',
        conceptUuid: item.concept?.uuid || '',
        commonName: item.commonName || '',
        acronym: item.acronym || '',
        hasExpiration: item.hasExpiration,
        expiryNotice: item.expiryNotice || 30,
        // Remove fields that don't exist in database
        // defaultBatchNo: item.defaultBatchNo || '',
        // defaultExpiryMonths: item.defaultExpiryMonths || 24,
        
        // Remove field that doesn't exist in database
        // manufacturerCode: item.manufacturerCode || '',
        
        purchasePrice: item.purchasePrice || 0,
        purchasePriceUoM: item.purchasePriceUoM?.uuid || '',
        
        defaultStockOperationsUoM: item.defaultStockOperationsUoM?.uuid || '',
        dispensingUnit: item.dispensingUnit?.uuid || '',
        
        reorderLevel: item.reorderLevel || 0,
        reorderLevelUoM: item.reorderLevelUoM?.uuid || '',
        // Remove fields that don't exist in database
        // maximumStock: item.maximumStock || 0,
        // maximumStockUoM: item.maximumStockUoM?.uuid || '',
        
        categoryUuid: item.category?.uuid || '',
        
        isDrug: item.isDrug || false,
      }));
      
      // Set the search term to the drug name for edit mode
      if (item.drugName) {
        setSearchTerm(item.drugName);
      }
    } else {
      setError('Failed to load stock item. Please try again.');
    }
  } catch (err) {
    setError('Failed to load stock item. Please try again.');
  } finally {
    setFetching(false);
  }
};
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDrugSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value === '') {
      setFormData(prev => ({
        ...prev,
        drugUuid: '',
        drugName: '',
        conceptUuid: ''
      }));
    }
  };

  const handleDrugSelect = (drug: any) => {
    setFormData(prev => ({
      ...prev,
      drugUuid: drug.uuid,
      drugName: drug.display || drug.name,
      conceptUuid: drug.concept?.uuid || ''
    }));
    setSearchTerm(drug.display || drug.name);
    setShowDrugDropdown(false);
  };

  const validateForm = (): boolean => {
    if (!formData.drugUuid) {
      setError('Please select a drug');
      return false;
    }

    if (!formData.drugName) {
      setError('Drug name is required');
      return false;
    }

    if (formData.hasExpiration && !formData.expiryNotice) {
      setError('Expiry notice days are required for items with expiration');
      return false;
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

      const stockItemData = {
        drug: formData.drugUuid ? { uuid: formData.drugUuid } : undefined,
        drugName: formData.drugName,
        concept: formData.conceptUuid ? { uuid: formData.conceptUuid } : undefined,
        commonName: formData.commonName || undefined,
        acronym: formData.acronym || undefined,
        hasExpiration: formData.hasExpiration,
        expiryNotice: formData.hasExpiration ? formData.expiryNotice : undefined,
        defaultBatchNo: formData.defaultBatchNo || undefined,
        defaultExpiryMonths: formData.defaultExpiryMonths || undefined,
        
        manufacturerCode: formData.manufacturerCode || undefined,
        
        purchasePrice: formData.purchasePrice || undefined,
        purchasePriceUoM: formData.purchasePriceUoM ? { uuid: formData.purchasePriceUoM } : undefined,
        
        defaultStockOperationsUoM: formData.defaultStockOperationsUoM ? { uuid: formData.defaultStockOperationsUoM } : undefined,
        dispensingUnit: formData.dispensingUnit ? { uuid: formData.dispensingUnit } : undefined,
        
        reorderLevel: formData.reorderLevel || undefined,
        reorderLevelUoM: formData.reorderLevelUoM ? { uuid: formData.reorderLevelUoM } : undefined,
        maximumStock: formData.maximumStock || undefined,
        maximumStockUoM: formData.maximumStockUoM ? { uuid: formData.maximumStockUoM } : undefined,
        
        category: formData.categoryUuid ? { uuid: formData.categoryUuid } : undefined,
        
        isDrug: formData.isDrug,
      };

      const result = await createStockItemDirect(stockItemData, 'admin'); // Pass username from session

      if (result.success) {
        setSuccess(isEditMode ? 'Stock item updated successfully' : 'Stock item created successfully');
        
        setTimeout(() => {
          router.push('/pharmacy/stock/items');
        }, 1500);
      } else {
        setError(result.message || 'Failed to save. Please check your data and try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Form submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/pharmacy/stock/items');
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-600">Loading stock item...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Stock Item' : 'New Stock Item'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {isEditMode 
                    ? 'Update medication details and inventory settings' 
                    : 'Create new medication for inventory management'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isEditMode ? 'Update' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex space-x-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 text-sm font-medium transition ${
              activeTab === 'basic'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Basic Info</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-3 text-sm font-medium transition ${
              activeTab === 'pricing'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Pricing</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-3 text-sm font-medium transition ${
              activeTab === 'inventory'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Inventory</span>
            </div>
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Check className="h-5 w-5 text-green-500" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="mt-8">
          {activeTab === 'basic' && (
            <div className="space-y-8">
              {/* Drug Search */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Drug Selection</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Drug *
                    </label>
                    <div className="relative">
                      <div className="flex items-center border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition">
                        <Search className="w-4 h-4 text-gray-400 ml-3" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={handleDrugSearchChange}
                          placeholder="Type drug name or code..."
                          className="w-full py-3 px-3 focus:outline-none"
                          required
                        />
                        {isSearching && (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin mr-3" />
                        )}
                      </div>
                      
                      {showDrugDropdown && drugs.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {drugs.map((drug) => (
                            <button
                              key={drug.uuid}
                              type="button"
                              onClick={() => handleDrugSelect(drug)}
                              className="w-full text-left p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                            >
                              <div className="font-medium text-gray-900">{drug.display || drug.name}</div>
                              {drug.strength && (
                                <div className="text-sm text-gray-600 mt-1">Strength: {drug.strength}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {formData.drugUuid && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{formData.drugName}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Common Name
                      </label>
                      <input
                        type="text"
                        value={formData.commonName}
                        onChange={(e) => handleInputChange('commonName', e.target.value)}
                        placeholder="Generic name"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Short Code
                      </label>
                      <input
                        type="text"
                        value={formData.acronym}
                        onChange={(e) => handleInputChange('acronym', e.target.value)}
                        placeholder="ABC"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category & Expiration */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Category</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Category
                    </label>
                    <select
                      value={formData.categoryUuid}
                      onChange={(e) => handleInputChange('categoryUuid', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category...</option>
                      {categories.map(category => (
                        <option key={category.uuid} value={category.uuid}>
                          {category.display || category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Expiration Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Expiration Date
                      </label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange('hasExpiration', true)}
                          className={`flex-1 py-2.5 rounded-lg border transition ${
                            formData.hasExpiration
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        >
                          Required
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('hasExpiration', false)}
                          className={`flex-1 py-2.5 rounded-lg border transition ${
                            !formData.hasExpiration
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        >
                          Not Required
                        </button>
                      </div>
                    </div>

                    {formData.hasExpiration && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Alert Days
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.expiryNotice}
                            onChange={(e) => handleInputChange('expiryNotice', parseInt(e.target.value) || 30)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Pricing Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Price
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.purchasePrice}
                        onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Unit
                    </label>
                    <select
                      value={formData.purchasePriceUoM}
                      onChange={(e) => handleInputChange('purchasePriceUoM', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select unit...</option>
                      {uomConcepts.map(uom => (
                        <option key={uom.uuid} value={uom.uuid}>
                          {uom.display}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manufacturer Code
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturerCode}
                      onChange={(e) => handleInputChange('manufacturerCode', e.target.value)}
                      placeholder="Manufacturer identifier"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Unit Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Unit
                    </label>
                    <select
                      value={formData.defaultStockOperationsUoM}
                      onChange={(e) => handleInputChange('defaultStockOperationsUoM', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select unit...</option>
                      {uomConcepts.map(uom => (
                        <option key={uom.uuid} value={uom.uuid}>
                          {uom.display}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dispensing Unit
                    </label>
                    <select
                      value={formData.dispensingUnit}
                      onChange={(e) => handleInputChange('dispensingUnit', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select unit...</option>
                      {uomConcepts.map(uom => (
                        <option key={uom.uuid} value={uom.uuid}>
                          {uom.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Stock Levels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reorderLevel}
                      onChange={(e) => handleInputChange('reorderLevel', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Alert when stock falls below this
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reorder Unit
                    </label>
                    <select
                      value={formData.reorderLevelUoM}
                      onChange={(e) => handleInputChange('reorderLevelUoM', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select unit...</option>
                      {uomConcepts.map(uom => (
                        <option key={uom.uuid} value={uom.uuid}>
                          {uom.display}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maximumStock}
                      onChange={(e) => handleInputChange('maximumStock', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum quantity to maintain
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Stock Unit
                    </label>
                    <select
                      value={formData.maximumStockUoM}
                      onChange={(e) => handleInputChange('maximumStockUoM', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select unit...</option>
                      {uomConcepts.map(uom => (
                        <option key={uom.uuid} value={uom.uuid}>
                          {uom.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="mt-8 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'pricing') setActiveTab('basic');
                    if (activeTab === 'inventory') setActiveTab('pricing');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Back
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isEditMode ? 'Update Item' : 'Create Item'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}