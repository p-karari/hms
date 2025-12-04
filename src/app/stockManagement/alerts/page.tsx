import StockAlerts from '@/components/stockManagement/StockAlerts';

export default function AlertsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Alerts</h1>
        <p className="text-gray-600 mt-1">Active alerts and notifications</p>
      </div>
      <StockAlerts />
    </div>
  );
}