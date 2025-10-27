'use client';

import React, { useState } from 'react';
// Your core DrugOrder interface
import { Trash2, RotateCcw } from 'lucide-react'; 
import { DrugOrder } from '@/lib/medications/getPatientMedicationOrders';
import { SessionContextType } from '@/lib/context/session-context';
import { DiscontinueOrderData, discontinueDrugOrder } from '@/lib/medications/discontinueDrugOrder';
import { RenewOrderData, renewDrugOrder } from '@/lib/medications/renewDrugOrder';

interface RenewDiscontinueActionsProps {
    order: DrugOrder;
    sessionData: SessionContextType;
    onActionSuccess: () => void;
}

/**
 * Renders buttons to Renew or Discontinue a specific drug order based on its status.
 */
export default function RenewDiscontinueActions({ order, sessionData, onActionSuccess }: RenewDiscontinueActionsProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Logic to determine action availability
    const isActive = !order.dateStopped && order.action !== 'DISCONTINUE';
    // Orders that have a dateStopped (are finished) but weren't explicitly discontinued
    const isRenewable = !!order.dateStopped && order.action !== 'DISCONTINUE'; 

    const handleDiscontinue = async () => {
        if (!confirm(`Confirm discontinuation of ${order.display}?`)) return;

        setIsSubmitting(true);
        const data: DiscontinueOrderData = {
            orderUuid: order.uuid,
            discontinueReason: "Order manually discontinued by clinician via UI.", 
        };

        try {
            await discontinueDrugOrder(data, sessionData);
            alert(`Success: Order for ${order.concept.display} has been stopped.`);
            onActionSuccess();
        } catch (error: any) {
            console.error("Discontinue failed:", error);
            alert(`Error discontinuing medication: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRenew = async () => {
        if (!confirm(`Confirm renewal of ${order.display} with default settings (30 Days)?`)) return;
        
        // --- VALIDATION AND ERROR CHECKING FOR MISSING CONCEPTS ---
        if (!order.drug || !order.concept || !order.patient || !order.doseUnits || !order.route || !order.frequency || !order.quantityUnits) {
             alert("Error: Missing critical drug, dose, route, or frequency information required for renewal. Cannot proceed.");
             console.error("Missing order data for renewal:", order);
             return;
        }
        
        setIsSubmitting(true);

        // 🎯 CORRECTED MAPPING: Accessing nested UUIDs correctly
        const renewData: RenewOrderData = {
            patientUuid: order.patient.uuid, // ✅ Correct: Patient is a nested object
            previousOrderUuid: order.uuid,
            duration: 30, // Default duration for renewal (should be user input)
            durationUnitsConceptUuid: order.durationUnits.uuid, // ✅ Correct: Assuming nested concept
            conceptUuid: order.concept.uuid,
            drugUuid: order.drug.uuid,
            dose: order.dose, 
            doseUnitsConceptUuid: order.doseUnits.uuid, // ✅ Correct: Assuming nested concept
            routeConceptUuid: order.route.uuid, // ✅ Correct: Assuming nested concept
            frequencyConceptUuid: order.frequency.uuid, // ✅ Correct: Assuming nested concept
            quantity: 30, // Default quantity for renewal (should be user input)
            quantityUnitsConceptUuid: order.quantityUnits.uuid, // ✅ Correct: Assuming nested concept
        };

        try {
            await renewDrugOrder(renewData, sessionData);
            alert(`Success: Order for ${order.concept.display} renewed.`);
            onActionSuccess();
        } catch (error: any) {
            console.error("Renewal failed:", error);
            alert(`Error renewing medication: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex space-x-2">
            {/* 1. Discontinue Button (Only visible if the order is currently active) */}
            {isActive && (
                <button
                    onClick={handleDiscontinue}
                    disabled={isSubmitting}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Discontinue Active Order"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            )}

            {/* 2. Renew Button (Only visible if the order is stopped/expired) */}
            {isRenewable && (
                <button
                    onClick={handleRenew}
                    disabled={isSubmitting}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Renew Prescription"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}