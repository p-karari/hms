'use client';

import { useRouter } from 'next/navigation';
import StockTakeSessionComponent from '@/components/stockManagement/StockTakeSession';

export default function NewStockTakePage() {
  const router = useRouter();

  // The component already handles its own success redirect
  // But we can add an additional handler if needed
  const handleSessionCreated = (sessionId: string) => {
    // Optional: You could show a toast notification here
    console.log('Session created:', sessionId);
  };

  return <StockTakeSessionComponent />;
}