import StockTakeSessionComponent from '@/components/stockManagement/StockTakeSession';

export default function StockTakeSessionPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  return <StockTakeSessionComponent />;
}