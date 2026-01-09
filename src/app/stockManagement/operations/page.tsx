'use client';

import React, { useState } from 'react';
import StockOperationsList from '@/components/stockManagement/StockOperationsList';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function OperationsPage() {
  const [operationType, setOperationType] = useState<'adjustment' | 'transfer' | 'receipt'>('adjustment');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Operations</h1>
          <p className="text-gray-600 mt-1">Track all stock movements and adjustments</p>
        </div>
        
        {/* Operation Type Selector with Create Button */}
        <div className="flex items-center space-x-3">
          <div className="flex border border-gray-300 rounded-lg">
            <button
              type="button"
              onClick={() => setOperationType('adjustment')}
              className={`px-4 py-2 text-sm font-medium ${
                operationType === 'adjustment'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } rounded-l-lg`}
            >
              Adjustment
            </button>
            <button
              type="button"
              onClick={() => setOperationType('transfer')}
              className={`px-4 py-2 text-sm font-medium ${
                operationType === 'transfer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border-l border-gray-300`}
            >
              Transfer
            </button>
            <button
              type="button"
              onClick={() => setOperationType('receipt')}
              className={`px-4 py-2 text-sm font-medium ${
                operationType === 'receipt'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } rounded-r-lg border-l border-gray-300`}
            >
              Receipt
            </button>
          </div>
          
          <Link
            href={`/stock-management/operations/new?type=${operationType}`}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4 mr-2" />
            New {operationType.charAt(0).toUpperCase() + operationType.slice(1)}
          </Link>
        </div>
      </div>

      <StockOperationsList />
    </div>
  );
}