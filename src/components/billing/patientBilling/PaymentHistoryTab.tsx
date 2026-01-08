'use client';

import { getPatientPayments, getPatientPaymentSummary } from '@/lib/billing/patientBilling/getPatientPayments';
import { CreditCard, DollarSign, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Payment {
  bill_payment_id: number;
  amount: number;
  amount_tendered: number;
  date_created: string;
  payment_mode_name: string;
  creator_username: string;
  bill_id: number;
  receipt_number?: string;
}

interface PaymentSummary {
  totalPaid: number;
  totalBills: number;
  paymentCount: number;
  paymentMethods: string[];
}

interface PaymentHistoryTabProps {
  patientUuid: string; // Changed from patientId to patientUuid
}

export default function PaymentHistoryTab({ patientUuid }: PaymentHistoryTabProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadPayments = async () => {
    setLoading(true);
    try {
      const [paymentsData, summaryData] = await Promise.all([
        getPatientPayments(patientUuid),
        getPatientPaymentSummary(patientUuid)
      ]);
      
      setPayments(paymentsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load payments:', error);
      alert('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  loadPayments();
}, [patientUuid]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const [paymentsData, summaryData] = await Promise.all([
        getPatientPayments(patientUuid),
        getPatientPaymentSummary(patientUuid)
      ]);
      
      setPayments(paymentsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load payments:', error);
      alert('Failed to load payment history');
    } finally {
      setLoading(false);
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
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-xl font-bold text-gray-900">
                  ${summary.totalPaid}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Payments</p>
                <p className="text-xl font-bold text-gray-900">
                  {summary.paymentCount}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bills</p>
                <p className="text-xl font-bold text-gray-900">
                  {summary.totalBills}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="bg-orange-100 p-2 rounded-lg mr-3">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Methods</p>
                <p className="text-xl font-bold text-gray-900">
                  {summary.paymentMethods.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Payment History</h2>
        <div className="text-sm text-gray-600">
          Total Payments: {payments.length}
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No payment history found</p>
          <p className="text-sm mt-2">Payments will appear here after bills are paid</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Payment ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Mode</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Bill ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Receipt</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Received By</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.bill_payment_id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{payment.bill_payment_id}</td>
                  <td className="py-3 px-4">
                    {new Date(payment.date_created).toLocaleDateString()}
                    <div className="text-xs text-gray-500">
                      {new Date(payment.date_created).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">${payment.amount}</div>
                    <div className="text-xs text-gray-500">
                      Tendered: ${payment.amount_tendered}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {payment.payment_mode_name || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-blue-600 hover:underline cursor-pointer">
                      #{payment.bill_id}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {payment.receipt_number || '—'}
                  </td>
                  <td className="py-3 px-4">{payment.creator_username || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}