// app/laboratory/page.tsx
import LaboratoryDashboard from '@/components/lab/LaboratoryDashboard';
import { getLabOrderCounts } from '@/lib/lab/getLabOrders';
import { Suspense } from 'react';


export default async function LaboratoryPage() {
  // Default to today's date range
  const today = new Date();
  const dateRange = {
    start: today,
    end: today
  };
  
  const counts = await getLabOrderCounts(dateRange);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <Suspense fallback={<div>Loading lab console...</div>}>
          <LaboratoryDashboard 
            initialCounts={counts}
            initialDateRange={dateRange}
          />
        </Suspense>
      </div>
    </div>
  );
}