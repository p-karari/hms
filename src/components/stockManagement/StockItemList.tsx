'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Download,
  MoreVertical,
  Tag,
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw,
  Grid,
  List,
  ChevronDown,
  CheckSquare,
  Square
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StockItem } from '@/lib/stockManagement/stockItem'; // Your updated interface
import { searchStockItemsDirect, deleteStockItemDirect } from '@/lib/stockManagement/stockItemDirect';
// Import your new database actions
// import { searchStockItemsDirect, deleteStockItemDirect } from '@/lib/stockManagement/stockItemDirect';

export default function StockItemList() {
  const router = useRouter();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 15;

  // Fetch stock items
  useEffect(() => {
    fetchStockItems();
  }, [currentPage, searchQuery, sortBy, sortOrder]);

  const fetchStockItems = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await searchStockItemsDirect({
        name: searchQuery || undefined,
        startIndex: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder
      });

      if (result.success && result.data) {
        setItems(result.data);
        setTotalCount(result.totalCount || result.data.length);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError('Failed to load stock items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStockItems();
  };

  const handleRefresh = () => {
    fetchStockItems();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map(item => item.uuid!));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (uuid: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, uuid]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== uuid));
    }
  };

  const handleDeleteItem = async (uuid: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteStockItemDirect(uuid, `Deleted via pharmacy system`);
      
      if (result.success) {
        fetchStockItems();
        setSelectedItems(prev => prev.filter(id => id !== uuid));
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    if (!window.confirm(`Delete ${selectedItems.length} selected item(s)?`)) {
      return;
    }

    try {
      const deletions = selectedItems.map(uuid => 
        deleteStockItemDirect(uuid, `Bulk delete`)
      );
      
      await Promise.all(deletions);
      fetchStockItems();
      setSelectedItems([]);
    } catch (err) {
      alert(`Failed to delete selected items: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleExport = () => {
    // Simple CSV export
    const itemsToExport = selectedItems.length > 0 
      ? items.filter(item => selectedItems.includes(item.uuid!))
      : items;

    const headers = ['Drug Name', 'Common Name', 'Purchase Price', 'Reorder Level', 'Max Stock', 'Category', 'Expiration', 'Created'];
    const csvRows = [
      headers.join(','),
      ...itemsToExport.map(item => [
        `"${item.drugName}"`,
        `"${item.commonName || ''}"`,
        item.purchasePrice || 0,
        item.reorderLevel || '',
        // item.maximumStock || '',
        `"${item.category?.uuid || ''}"`,
        item.hasExpiration ? 'Yes' : 'No',
        item.dateCreated ? new Date(item.dateCreated).toISOString().split('T')[0] : ''
      ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTotalPages = () => {
    return Math.ceil(totalCount / itemsPerPage);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSortIcon = (field: 'name' | 'date' | 'price') => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchStockItems}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stock Items</h1>
                <p className="text-gray-600 mt-1">{totalCount.toLocaleString()} items in inventory</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={() => router.push('/stockManagement/items/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Item</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Controls */}
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by name or code..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
                disabled={loading}
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                {items.length} of {totalCount} items
              </div>
              
              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-600'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-600'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
              
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'price')}
                  className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Sort by Name {getSortIcon('name')}</option>
                  <option value="date">Sort by Date {getSortIcon('date')}</option>
                  <option value="price">Sort by Price {getSortIcon('price')}</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleExport}
                disabled={items.length === 0}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 inline mr-2" />
                Export
              </button>
              {selectedItems.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  Delete ({selectedItems.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-8 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            <p className="mt-2 text-gray-600">Loading items...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="mt-16 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No matching items found' : 'No stock items yet'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchQuery ? 'Try a different search term' : 'Start by adding your first stock item to the inventory'}
            </p>
            <button
              onClick={() => router.push('/stockManagement/items/new')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </button>
          </div>
        )}

        {/* Items List */}
        {!loading && items.length > 0 && viewMode === 'list' && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSelectAll(selectedItems.length !== items.length)}
                        className="p-1 hover:bg-gray-200 rounded transition"
                      >
                        {selectedItems.length === items.length ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Levels
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr
                      key={item.uuid}
                      className={`hover:bg-gray-50 transition ${selectedItems.includes(item.uuid!) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSelectItem(item.uuid!, !selectedItems.includes(item.uuid!))}
                          className="p-1 hover:bg-gray-200 rounded transition"
                        >
                          {selectedItems.includes(item.uuid!) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{item.drugName}</div>
                            <div className="text-sm text-gray-500 truncate">{item.commonName}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              {item.category && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {item.category.uuid}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {formatDate(item.dateCreated)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium">{formatCurrency(item.purchasePrice)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                            <span>Reorder: {item.reorderLevel || '-'}</span>
                          </div>
                          {/* <div className="flex items-center text-sm">
                            <Package className="h-4 w-4 text-blue-500 mr-2" />
                            <span>Max: {item.maximumStock || '-'}</span>
                          </div> */}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {item.hasExpiration ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Calendar className="h-3 w-3 mr-1" />
                              Expires
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              No Expiry
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => router.push(`/pharmacy/stock/items/${item.uuid}`)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/pharmacy/stock/items/${item.uuid}/edit`)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.uuid!, item.drugName)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {getTotalPages() > 1 && (
              <div className="border-t border-gray-200 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {getTotalPages()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(3, getTotalPages()) }, (_, i) => {
                      let pageNum = currentPage - 1 + i;
                      if (currentPage === 1) pageNum = i + 1;
                      if (currentPage === getTotalPages()) pageNum = getTotalPages() - 2 + i;
                      
                      return pageNum > 0 && pageNum <= getTotalPages() ? (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded-lg transition ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ) : null;
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === getTotalPages()}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {totalCount.toLocaleString()} total
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grid View */}
        {!loading && items.length > 0 && viewMode === 'grid' && (
          <>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.uuid}
                  className={`bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition ${selectedItems.includes(item.uuid!) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 truncate">{item.drugName}</h3>
                        <p className="text-sm text-gray-500 truncate">{item.commonName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectItem(item.uuid!, !selectedItems.includes(item.uuid!))}
                      className="p-1"
                    >
                      {selectedItems.includes(item.uuid!) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Price</span>
                      <span className="font-medium">{formatCurrency(item.purchasePrice)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Reorder Level</span>
                      <span>{item.reorderLevel || '-'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Category</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {item.category?.uuid || 'Uncategorized'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.hasExpiration
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.hasExpiration ? (
                          <>
                            <Calendar className="h-3 w-3 mr-1" />
                            Expires
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            No Expiry
                          </>
                        )}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => router.push(`/pharmacy/stock/items/${item.uuid}`)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/pharmacy/stock/items/${item.uuid}/edit`)}
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.uuid!, item.drugName)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Pagination */}
            {getTotalPages() > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {currentPage} of {getTotalPages()}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === getTotalPages()}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}