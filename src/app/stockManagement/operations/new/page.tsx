'use client'

import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import StockOperationFormContent from './StockOperationFormContent';
// import StockOperationFormContent from './StockOperationFormContent';

export default function NewOperationPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading operation form...</span>
      </div>
    }>
      <StockOperationFormContent />
    </Suspense>
  );
}