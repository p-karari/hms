// components/laboratory/OrdersTable.tsx
'use client';

import { getLabOrders } from '@/lib/lab/getLabOrders';
import { OrderStatus } from '@/lib/lab/lab-order';
import { useState, useEffect } from 'react';
import OrderRow from './OrderRow';


interface OrdersTableProps {
  status: OrderStatus;
  dateRange: { start: Date; end: Date };
  searchQuery: string;
  onCountsUpdate: (counts: any) => void;
}

export default function OrdersTable({ 
  status, 
  dateRange, 
  searchQuery,
  onCountsUpdate 
}: OrdersTableProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const result = await getLabOrders(status, dateRange);
        setOrders(result.orders);
        
        // Update counts if needed
        if (result.orders.length !== orders.length) {
          const counts = {
            ordered: result.orders.filter(o => !o.fulfillerStatus).length,
            inProgress: result.orders.filter(o => o.fulfillerStatus === 'IN_PROGRESS').length,
            completed: result.orders.filter(o => o.fulfillerStatus === 'COMPLETED').length,
            declined: result.orders.filter(o => o.fulfillerStatus === 'DECLINED').length
          };
          onCountsUpdate(counts);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [status, dateRange]);

  // Filter orders by search query
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      order.patient.display.toLowerCase().includes(searchLower) ||
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.concept.display.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">Loading orders...</div>
      </div>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-700 font-medium">No lab requests found</div>
        <div className="text-gray-500 text-sm mt-1">
          Please check the filters above and try again
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Patient
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Age
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gender
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total orders
            </th>
            {status === 'COMPLETED' && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredOrders.map((order) => (
            <OrderRow
              key={order.uuid}
              order={order}
              status={status}
              isExpanded={expandedOrder === order.uuid}
              onExpandToggle={() => 
                setExpandedOrder(expandedOrder === order.uuid ? null : order.uuid)
              }
            />
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
        <div className="text-sm text-gray-700">
          Items per page:
          <select className="ml-2 border border-gray-300 rounded px-2 py-1">
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700">
            {filteredOrders.length > 0 ? `1-${filteredOrders.length}` : '0'} of {filteredOrders.length} items
          </div>
          <div className="text-sm text-gray-700">Page of 1 pages</div>
          <div className="flex space-x-1">
            <button className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50">
              &lt;
            </button>
            <button className="px-2 py-1 bg-blue-500 text-white rounded">1</button>
            <button className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50">
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}