'use client';

import { ChevronDown, User, Calendar, Package } from 'lucide-react';
import { formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/pharmacy/pharmacy';
import type { PrescriptionTableProps, Prescription, PrescriptionAction } from '@/lib/pharmacy/pharmacy';
import PrescriptionDetails from './PrescriptionDetails';

export default function PrescriptionsTable({
  prescriptions,
  isLoading,
  onAction,
  onRowClick,
  expandedRowId,
}: PrescriptionTableProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading prescriptions...</p>
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900">No prescriptions found</h3>
        <p className="text-gray-600 mt-1">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Patient name
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prescriber
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Drugs
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last dispenser
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {prescriptions.map((prescription) => (
            <TableRow
              key={prescription.id}
              prescription={prescription}
              isExpanded={expandedRowId === prescription.id}
              onExpand={() => onRowClick?.(prescription)}
              onAction={(action) => onAction?.(action, prescription)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({
  prescription,
  isExpanded,
  onExpand,
  onAction,
}: {
  prescription: Prescription;
  isExpanded: boolean;
  onExpand: () => void;
  onAction: (action: PrescriptionAction) => void;
}) {
  return (
    <>
      <tr 
        className={`hover:bg-gray-50 transition ${isExpanded ? 'bg-blue-50' : ''}`}
        onClick={onExpand}
      >
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-900">
              {formatDate(prescription.created, 'short')}
            </span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">{prescription.patientName}</div>
              <div className="text-xs text-gray-500">
                OpenMRS ID: {prescription.patientId}, Age: 0
              </div>
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm text-gray-900">{prescription.prescriber}</div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm text-gray-900">{prescription.drugs}</div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm text-gray-500">
            {prescription.lastDispenser || '—'}
          </div>
        </td>
        <td className="py-4 px-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(prescription.status)}`}>
            {getStatusLabel(prescription.status)}
          </span>
        </td>
        <td className="py-4 px-4 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <PrescriptionDetails 
              prescription={prescription}
              onAction={onAction}
            />
          </td>
        </tr>
      )}
    </>
  );
}