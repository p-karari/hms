import React from 'react';
import StockTakeList from '@/components/stockManagement/StockTakeList';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function StockTakesPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Takes</h1>
          <p className="text-gray-600 mt-1">Physical inventory counting sessions</p>
        </div>
        <Link
          href="/stock-management/stocTtakes/new"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Stock Take
        </Link>
      </div>

      <StockTakeList />
    </div>
  );
}