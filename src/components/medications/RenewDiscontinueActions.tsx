'use client';

import React, { useState } from 'react';
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

export default function RenewDiscontinueActions({ order, sessionData, onActionSuccess }: RenewDiscontinueActionsProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isActive = !order.dateStopped && order.action !== 'DISCONTINUE';
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
        
        if (!order.drug || !order.concept || !order.patient || !order.doseUnits || !order.route || !order.frequency || !order.quantityUnits) {
             alert("Error: Missing critical drug, dose, route, or frequency information required for renewal. Cannot proceed.");
             console.error("Missing order data for renewal:", order);
             return;
        }
        
        setIsSubmitting(true);

        const renewData: RenewOrderData = {
            patientUuid: order.patient.uuid,
            previousOrderUuid: order.uuid,
            duration: 30,
            durationUnitsConceptUuid: order.durationUnits.uuid,
            conceptUuid: order.concept.uuid,
            drugUuid: order.drug.uuid,
            dose: order.dose, 
            doseUnitsConceptUuid: order.doseUnits.uuid,
            routeConceptUuid: order.route.uuid,
            frequencyConceptUuid: order.frequency.uuid,
            quantity: 30,
            quantityUnitsConceptUuid: order.quantityUnits.uuid,
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
        <div className="flex space-x-1">
            {isActive && (
                <button
                    onClick={handleDiscontinue}
                    disabled={isSubmitting}
                    className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Discontinue Active Order"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}

            {isRenewable && (
                <button
                    onClick={handleRenew}
                    disabled={isSubmitting}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Renew Prescription"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}