'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, Filter, Pill } from 'lucide-react';

import type { Prescription, PrescriptionTab, PrescriptionAction, DispenseFormData, ApiResponse } from '@/lib/pharmacy/pharmacy';
import DispenseModal from '@/components/pharmacy/DispenseModal';
import PrescriptionsTable from '@/components/pharmacy/PrescriptionsTable';
import StatusUpdateModal from '@/components/pharmacy/StatusUpdateModal';
import { dispenseMedication } from '@/lib/pharmacy/dispense-medication';
import { fetchPatientInfo } from '@/lib/pharmacy/fetch-patient-info';
import { fetchPrescriptions } from '@/lib/pharmacy/fetch-prescriptions';
import { updatePrescriptionStatus } from '@/lib/pharmacy/update-prescription-status';

export default function DispensingPage() {
  const [activeTab, setActiveTab] = useState<PrescriptionTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  // Modal states
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [selectedAction, setSelectedAction] = useState<PrescriptionAction>('dispense');
  const [patientInfo, setPatientInfo] = useState<any>(null);

  // Fetch prescriptions
  const loadPrescriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPrescriptions({
        tab: activeTab,
        search: searchQuery,
        page: 1,
        limit: 10
      });
      setPrescriptions(result.prescriptions);
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  // Handle prescription action
  const handlePrescriptionAction = async (action: PrescriptionAction, prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setSelectedAction(action);

    if (action === 'dispense') {
      // Fetch patient info for dispense form
      const patientData = await fetchPatientInfo(prescription.patientUuid);
      setPatientInfo(patientData);
      setDispenseModalOpen(true);
    } else if (action === 'pause' || action === 'close') {
      setStatusModalOpen(true);
    } else if (action === 'print') {
      // Handle print action
      window.print();
    }
  };

  // Handle dispense form submission
    const handleDispenseSubmit = async (data: DispenseFormData): Promise<ApiResponse<any>> => {
      try {
        // Map the form data into the shape expected by dispenseMedication.
        // Provide required fallback values (quantity, prescriptionId, patientId, ) from the selected prescription or defaults.
        const params = {
          ...(data as any),
          prescriptionId: selectedPrescription?.id ?? (data as any).prescriptionId,
          medicationId: (data as any).medicationId ?? (selectedPrescription as any)?.medicationId,
          patientId: (selectedPrescription as any)?.patientUuid ?? (data as any).patientId,
          quantity: (data as any).quantity ?? 1,
          dispensedBy: (data as any).dispensedBy ?? 'Current User',
          dispensedByPractitionerId: (data as any).dispensedByPractitionerId ?? 'user-uuid',
          locationId: (data as any).locationId ?? (selectedPrescription as any)?.locationId,
        };
  
        const result = await dispenseMedication(params as any);
        if (result && typeof result === 'object') {
          if (result.success) {
            setDispenseModalOpen(false);
            loadPrescriptions(); // Refresh list
            // Show success toast
          } else {
            // Show error toast
            console.error(result.message);
          }
          return result as ApiResponse<any>;
        }
  
        // If dispenseMedication did not return an object, return a generic failure response
        const fallback: ApiResponse<any> = { success: false, message: 'Unexpected response from dispenseMedication' } as any;
        console.error(fallback.message);
        return fallback;
      } catch (error) {
        console.error('Failed to dispense medication:', error);
        const errResp: ApiResponse<any> = { success: false, message: String(error) } as any;
        return errResp;
      }
    };

  // Handle status update
  const handleStatusUpdate = async (reason?: string): Promise<ApiResponse<any>> => {
    if (!selectedPrescription || !selectedAction) {
      return { success: false, message: 'No prescription or action selected' } as ApiResponse<any>;
    }

    try {
      const result = await updatePrescriptionStatus({
        prescriptionId: selectedPrescription.id,
        action: selectedAction as 'pause' | 'close',
        reason,
        performedBy: 'Current User', // Replace with actual user
        performedById: 'user-uuid' // Replace with actual user ID
      });

      if (result.success) {
        setStatusModalOpen(false);
        loadPrescriptions(); // Refresh list
        // Show success toast
      } else {
        // Show error toast
        console.error(result.message);
      }

      return result as ApiResponse<any>;
    } catch (error) {
      console.error('Failed to update status:', error);
      return { success: false, message: String(error) } as ApiResponse<any>;
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (prescription: Prescription) => {
    const prescriptionId = prescription.id;
    setExpandedRowId((prev) => (prev === prescriptionId ? null : prescriptionId));
  };

  // Initial load
  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pharmacy</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              {/* <span className="font-medium">Inpatient Ward</span> */}
              {/* <span>·</span> */}
              <span>Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'active'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Active prescriptions
              </div>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All prescriptions
            </button>
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by patient ID or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium">Filters</span>
            </button>
            <button
              onClick={loadPrescriptions}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Prescriptions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <PrescriptionsTable
            prescriptions={prescriptions}
            isLoading={isLoading}
            onAction={handlePrescriptionAction}
            onRowClick={toggleRowExpansion}
            expandedRowId={expandedRowId ?? undefined}
          />
        </div>

        {/* Pagination */}
        {prescriptions.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">1-{prescriptions.length}</span> of{' '}
              <span className="font-medium">{prescriptions.length}</span> items
            </div>
            <div className="flex items-center gap-2">
              <select className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                  ←
                </button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">1</span>
                <button className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                  →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedPrescription && (
        <>
          <DispenseModal
            isOpen={dispenseModalOpen}
            onClose={() => setDispenseModalOpen(false)}
            prescription={selectedPrescription}
            patientInfo={patientInfo}
            onSubmit={handleDispenseSubmit}
          />
          
          <StatusUpdateModal
            isOpen={statusModalOpen}
            onClose={() => setStatusModalOpen(false)}
            prescription={selectedPrescription}
            action={selectedAction as 'pause' | 'close' | 'reactivate'}
            onSubmit={handleStatusUpdate}
          />
        </>
      )}
    </div>
  );
}