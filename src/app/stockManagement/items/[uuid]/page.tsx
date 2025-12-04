import StockItemForm from '@/components/stockManagement/StockItemForm';

export default function EditStockItemPage({ 
  params 
}: { 
  params: { uuid: string } 
}) {
  return <StockItemForm itemUuid={params.uuid} />;
}