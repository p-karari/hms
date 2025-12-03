'use client';

import { useState, useRef } from 'react';
import { 
  Pill, FileText, History, AlertCircle, Printer, 
  CheckSquare, Square, MoreVertical, Edit2, Trash2 
} from 'lucide-react';
import type { Prescription, PrescriptionAction, Condition, PrescriptionHistory } from '@/lib/pharmacy/pharmacy';
import { fetchPrescriptionDetails } from '@/lib/pharmacy/fetch-prescription-details';
import { printPrescription } from '@/lib/pharmacy/print-prescription';

interface PrescriptionDetailsProps {
  prescription: Prescription;
  onAction: (action: PrescriptionAction) => void;
}

type DetailsTab = 'details' | 'conditions' | 'history';

export default function PrescriptionDetails({ prescription, onAction }: PrescriptionDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailsTab>('details');
  const [details, setDetails] = useState<{
    conditions: Condition[];
    history: PrescriptionHistory[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isSelected, setIsSelected] = useState(true);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const loadDetails = async () => {
    if (details) return;
    setIsLoading(true);
    try {
      const data = await fetchPrescriptionDetails({
        prescriptionId: prescription.id,
        patientId: prescription.patientUuid,
        encounterId: prescription.encounterId
      });
      setDetails({ conditions: data.conditions, history: data.history });
    } catch (error) {
      console.error('Failed to load details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabClick = (tab: DetailsTab) => {
    setActiveTab(tab);
    if (tab !== 'details') loadDetails();
  };

  const handlePrint = async () => {
    if (!isSelected) return;
    try {
      const result = await printPrescription({
        prescriptionIds: [prescription.id],
        patientId: prescription.patientUuid
      });

      if (result.success && result.html && printFrameRef.current) {
        const doc = printFrameRef.current.contentDocument || printFrameRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(result.html);
          doc.close();
        }
      }
    } catch (error) {
      console.error("Print failed:", error);
    }
  };

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-6">
      <iframe ref={printFrameRef} className="hidden" />

      {/* Mini Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => handleTabClick('details')}
          className={`pb-3 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2"><Pill className="h-4 w-4" /> Prescription details</div>
        </button>
        <button
          onClick={() => handleTabClick('conditions')}
          className={`pb-3 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'conditions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Conditions and diagnoses</div>
        </button>
        <button
          onClick={() => handleTabClick('history')}
          className={`pb-3 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2"><History className="h-4 w-4" /> History and comments</div>
        </button>
      </div>

      <div className="min-h-[200px]">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSelected(!isSelected)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600"
              >
                {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-gray-400" />}
                SELECT FOR PRINT
              </button>
              <button onClick={() => onAction('dispense')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">Dispense</button>
              <button onClick={() => onAction('pause')} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition">Pause</button>
              <button onClick={() => onAction('close')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">Close</button>
              <button 
                onClick={handlePrint}
                className="ml-auto flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white transition"
              >
                <Printer className="h-4 w-4" /> Print prescriptions
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">{prescription.drugs}</h4>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1 uppercase text-[10px] tracking-wider">Dose</div>
                  <div className="text-gray-900">
                    {prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.value} {prescription.dosage?.doseAndRate?.[0]?.doseQuantity?.unit} — {prescription.dosage?.route?.text} — {prescription.dosage?.timing?.code?.text}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1 uppercase text-[10px] tracking-wider">Quantity</div>
                    <div className="text-gray-900">{prescription.quantity?.value} {prescription.quantity?.unit}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1 uppercase text-[10px] tracking-wider">Refills</div>
                    <div className="text-gray-900">{prescription.refills}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1 uppercase text-[10px] tracking-wider">Instructions</div>
                  <div className="text-gray-900 text-sm">{prescription.instructions}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conditions' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
            ) : details?.conditions?.map((condition) => (
              <div key={condition.id} className="bg-white rounded-lg border border-gray-200 p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">{condition.name}</div>
                  <div className="text-sm text-gray-500">Recorded: {new Date(condition.recordedDate).toLocaleDateString()}</div>
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase">{condition.status}</div>
              </div>
            ))}
          </div>
        )}

{activeTab === 'history' && (
  <div className="flex flex-col items-center space-y-3">
    {isLoading ? (
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 my-12"></div>
    ) : details?.history && details.history.length > 0 ? (
      details.history.map((item) => (
        <div 
          key={item.id} 
          className="flex items-center gap-6 bg-white border border-gray-100 rounded-lg p-4 w-full max-w-3xl hover:bg-gray-50 transition-colors relative group shadow-sm"
        >
          {/* Time Column - slightly wider for clarity */}
          <div className="flex flex-col items-end min-w-[90px] border-r border-gray-100 pr-5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
              {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-sm font-extrabold text-blue-600">
              {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>

          {/* Core Info - Larger text for better readability */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[15px] font-bold text-gray-800 truncate">{item.performer}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                item.type === 'prescribed' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'
              }`}>
                {item.type}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium truncate">{item.details}</p>
          </div>

          {/* Kebab Menu */}
          <div className="relative">
            <button 
              onClick={(e) => {
                const menu = e.currentTarget.nextElementSibling;
                // Close all other open menus first
                document.querySelectorAll('.history-menu').forEach(m => {
                  if (m !== menu) m.classList.add('hidden');
                });
                menu?.classList.toggle('hidden');
              }}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            
            <div className="history-menu hidden absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1.5">
              <button 
                onClick={() => console.log('Edit record:', item.id)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3"
              >
                <FileText className="h-4 w-4" /> Edit record
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button 
                onClick={() => console.log('Delete record:', item.id)}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
              >
                <AlertCircle className="h-4 w-4" /> Delete record
              </button>
            </div>
          </div>
        </div>
      ))
    ) : (
      <div className="py-16 text-gray-400 text-sm italic font-medium">No prescription history found.</div>
    )}
  </div>
)}
      </div>
    </div>
  );
}