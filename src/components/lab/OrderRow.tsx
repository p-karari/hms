// components/laboratory/OrderRow.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { OrderStatus } from '@/lib/lab/lab-order';
import { startOrderProgress, declineOrder } from '@/lib/lab/updateOrderStatus';
import ResultsFormModal from './ResultsFormModal';
import ResultsViewModal from './ResultsViewModal';


interface OrderRowProps {
  order: any;
  status: OrderStatus;
  isExpanded: boolean;
  onExpandToggle: () => void;
}

export default function OrderRow({ 
  order, 
  status, 
  isExpanded, 
  onExpandToggle 
}: OrderRowProps) {
  const [showPickConfirm, setShowPickConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [showResultsView, setShowResultsView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePickOrder = async () => {
    setIsLoading(true);
    try {
      await startOrderProgress(order.uuid);
      window.location.reload(); // Refresh to show updated status
    } catch (error) {
      console.error('Failed to pick order:', error);
    } finally {
      setIsLoading(false);
      setShowPickConfirm(false);
    }
  };

  const handleRejectOrder = async () => {
    setIsLoading(true);
    try {
      await declineOrder(order.uuid, 'Order declined by lab technician');
      window.location.reload();
    } catch (error) {
      console.error('Failed to reject order:', error);
    } finally {
      setIsLoading(false);
      setShowRejectConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (date.toDateString() === new Date().toDateString()) {
        return `Today, ${format(date, 'hh:mm a')}`;
      }
      return format(date, 'MMM dd, yyyy hh:mm a');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = () => {
    switch (order.fulfillerStatus) {
      case null:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Order not picked</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">IN_PROGRESS</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">COMPLETED</span>;
      case 'DECLINED':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">DECLINED</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={onExpandToggle}
              className="mr-2 text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '►'}
            </button>
            <span className="font-medium text-gray-900">
              {order.patient.person.display}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">{order.patient.person.age}</td>
        <td className="px-6 py-4 text-sm text-gray-900">
          {order.patient.person.gender === 'M' ? 'Male' : 
           order.patient.person.gender === 'F' ? 'Female' : 
           order.patient.person.gender}
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">1</td>
        {status === 'COMPLETED' && (
          <td className="px-6 py-4">
            <button
              onClick={() => setShowResultsView(true)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              View test results
            </button>
          </td>
        )}
      </tr>
      
      {/* Expanded Details */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={status === 'COMPLETED' ? 5 : 4} className="px-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Order number:</div>
                  <div className="text-sm text-gray-900">{order.orderNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Order Date:</div>
                  <div className="text-sm text-gray-900">{formatDate(order.dateActivated)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Status:</div>
                  <div className="mt-1">{getStatusBadge()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Urgency:</div>
                  <div className="text-sm text-gray-900 capitalize">
                    {order.urgency?.toLowerCase() || 'Routine'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm font-medium text-gray-700">Test ordered:</div>
                  <div className="text-sm text-gray-900">{order.concept.display}</div>
                </div>
                {order.instructions && (
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-700">Instructions:</div>
                    <div className="text-sm text-gray-900">{order.instructions}</div>
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-sm font-medium text-gray-700">Orderer Name:</div>
                  <div className="text-sm text-gray-900">{order.orderer.display}</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                {order.fulfillerStatus === null && (
                  <>
                    <button
                      onClick={() => setShowRejectConfirm(true)}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      disabled={isLoading}
                    >
                      dangerReject lab request
                    </button>
                    <button
                      onClick={() => setShowPickConfirm(true)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      disabled={isLoading}
                    >
                      Pick Lab Request
                    </button>
                  </>
                )}
                
                {order.fulfillerStatus === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={() => setShowRejectConfirm(true)}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      disabled={isLoading}
                    >
                      dangerReject lab request
                    </button>
                    <button
                      onClick={() => setShowResultsForm(true)}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      disabled={isLoading}
                    >
                      Add lab results
                    </button>
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
      
      {/* Modals */}
      {showPickConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Pick lab request</h3>
            <p className="text-gray-600 mb-6">
              Continuing will update the request status to "In Progress" and advance it to the next stage. 
              Are you sure you want to proceed?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPickConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                disabled={isLoading}
              >
                Discard
              </button>
              <button
                onClick={handlePickOrder}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? 'Picking...' : 'Pick up lab request'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reject lab request</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reject this lab request? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectOrder}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? 'Rejecting...' : 'Reject request'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Results Form Modal */}
      {showResultsForm && (
        <ResultsFormModal
          order={order}
          isOpen={showResultsForm}
          onClose={() => setShowResultsForm(false)}
        />
      )}
      
      {/* Results View Modal */}
      {showResultsView && (
        <ResultsViewModal
          order={order}
          isOpen={showResultsView}
          onClose={() => setShowResultsView(false)}
        />
      )}
    </>
  );
}