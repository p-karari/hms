'use client';

import { getPatientBills, voidBill } from '@/lib/billing/patientBilling/billActions';
import { DollarSign, Eye, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';


interface Bill {
  bill_id: number;
  receipt_number: string | null;
  date_created: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  cash_point_name: string;
  creator_username: string;
}

interface BillsHistoryTabProps {
  patientUuid: string;
}

export default function BillsHistoryTab({ patientUuid }: BillsHistoryTabProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

useEffect(() => {
  const loadBills = async () => {
    setLoading(true);
    try {
      const billsData = await getPatientBills(patientUuid);
      setBills(billsData);
    } catch (error) {
      console.error('Failed to load bills:', error);
      alert('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  loadBills();
}, [patientUuid]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const billsData = await getPatientBills(patientUuid);
      setBills(billsData);
    } catch (error) {
      console.error('Failed to load bills:', error);
      alert('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleVoidBill = async () => {
    if (!selectedBill || !voidReason.trim()) return;

    try {
      const result = await voidBill(selectedBill.bill_id, voidReason);
      if (result.success) {
        alert('Bill voided successfully');
        setShowVoidModal(false);
        setVoidReason('');
        setSelectedBill(null);
        loadBills();
      } else {
        alert(`Failed to void bill: ${result.message}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PARTIALLY_PAID': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Bills History</h2>
        <div className="text-sm text-gray-600">
          Total Bills: {bills.length}
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No bills found for this patient</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Bill ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Paid</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Balance</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.bill_id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium">{bill.bill_id}</div>
                    {bill.receipt_number && (
                      <div className="text-sm text-gray-500">{bill.receipt_number}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {new Date(bill.date_created).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    ${(bill.total_amount)}
                  </td>
                  <td className="py-3 px-4">
                    ${(bill.amount_paid)}
                  </td>
                  <td className="py-3 px-4">
                    ${((bill.total_amount || 0) - (bill.amount_paid || 0))}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedBill(bill)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {bill.status !== 'CANCELLED' && (
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowVoidModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Void Bill"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Bill Details</h3>
              <button
                onClick={() => setSelectedBill(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Bill ID</label>
                  <div className="font-medium">{selectedBill.bill_id}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Date Created</label>
                  <div>{new Date(selectedBill.date_created).toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Cash Point</label>
                  <div>{selectedBill.cash_point_name}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Created By</label>
                  <div>{selectedBill.creator_username}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Total Amount</label>
                  <div className="font-semibold">${(selectedBill.total_amount || 0)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Amount Paid</label>
                  <div>${(selectedBill.amount_paid || 0)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Bill Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4">
              <h3 className="text-xl font-bold text-red-600">Void Bill</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Are you sure you want to void Bill #{selectedBill?.bill_id}?
                This action cannot be undone.
              </p>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Reason for voiding</label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 h-24"
                  placeholder="Enter reason..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowVoidModal(false);
                    setVoidReason('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoidBill}
                  disabled={!voidReason.trim()}
                  className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300"
                >
                  Confirm Void
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}