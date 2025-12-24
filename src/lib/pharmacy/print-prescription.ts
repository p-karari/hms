'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';

export interface PrintPrescriptionParams {
  prescriptionIds: string[]; // Changed to array for multiple selection
  patientId: string;
}

export async function printPrescription(
  params: PrintPrescriptionParams
): Promise<{
  success: boolean;
  message: string;
  html?: string;
}> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed.' };
  }

  try {
    const { prescriptionIds, patientId } = params;

    // 1. Fetch Patient Data
    const patientRes = await fetch(`${process.env.OPENMRS_API_URL_ALT}/Patient/${patientId}?_summary=data`, { headers });
    if (!patientRes.ok) throw new Error('Failed to fetch patient details');
    const patient = await patientRes.json();

    // 2. Fetch all selected MedicationRequests
    const medicationRequests = await Promise.all(
      prescriptionIds.map(async (id) => {
        const res = await fetch(`${process.env.OPENMRS_API_URL_ALT}/MedicationRequest/${id}?_summary=data`, { headers });
        return res.ok ? res.json() : null;
      })
    );

    const validRequests = medicationRequests.filter(r => r !== null);

    // 3. Generate the clean HTML
    const html = generatePrescriptionHtml(patient, validRequests);

    return {
      success: true,
      message: 'Print layout generated',
      html
    };

  } catch (error) {
    console.error('Print Error:', error);
    return { success: false, message: 'Failed to generate print view' };
  }
}

function generatePrescriptionHtml(patient: any, requests: any[]): string {
  const patientName = patient.name?.[0]?.text || 'Unknown';
  const patientId = patient.identifier?.[0]?.value || 'N/A';
  
  const medicationsHtml = requests.map(req => `
    <div class="item">
      <div class="drug-title">${req.medicationReference?.display || 'Medication'}</div>
      <div class="item-details">
        ${req.dosageInstruction?.[0]?.text || 'As directed'}<br/>
        Qty: ${req.dispenseRequest?.quantity?.value || ''} | Refills: ${req.dispenseRequest?.numberOfRepeatsAllowed || 0}
      </div>
      ${req.dosageInstruction?.[0]?.patientInstruction ? 
        `<div class="note">Note: ${req.dosageInstruction[0].patientInstruction}</div>` : ''}
    </div>
  `).join('<div class="separator">--------------------------</div>');

  return `
    <html>
      <head>
        <style>
          /* Thermal Printer Optimization (80mm) */
          @page { size: 80mm auto; margin: 0; }
          body { 
            width: 72mm; /* Standard printable area for 80mm rolls */
            margin: 0 auto; 
            padding: 5mm 2mm; 
            font-family: "Courier New", Courier, monospace; 
            font-size: 12px; 
            color: #000; 
            line-height: 1.2;
          }
          .hospital-name { 
            text-align: center; 
            font-size: 16px; 
            font-weight: bold; 
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .sub-header { text-align: center; font-size: 10px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
          .patient-info { margin-bottom: 10px; font-size: 11px; }
          .item { margin: 10px 0; }
          .drug-title { font-weight: bold; text-transform: uppercase; font-size: 13px; }
          .item-details { margin-top: 3px; }
          .note { margin-top: 5px; font-size: 10px; border-left: 2px solid #000; padding-left: 4px; }
          .separator { text-align: center; margin: 5px 0; }
          .footer { margin-top: 15px; text-align: center; font-size: 9px; border-top: 1px dashed #000; pt: 5px; }
          @media print { 
            button { display: none; } 
          }
        </style>
      </head>
      <body>
        <div class="hospital-name">ALPHIL HOSPITAL</div>
        <div class="sub-header">Prescription Voucher</div>
        
        <div class="patient-info">
          ID: ${patientId}<br/>
          Name: ${patientName}<br/>
          Date: ${new Date().toLocaleDateString()}
        </div>

        <div class="separator">==========================</div>
        ${medicationsHtml}
        <div class="separator">==========================</div>

        <div class="footer">
          Thank you for choosing Alphil.<br/>
          *** End of Prescription ***
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `;
}