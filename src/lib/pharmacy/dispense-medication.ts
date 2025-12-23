'use server';

import { getAuthHeaders, redirectToLogin } from '@/lib/auth/auth';
import { revalidatePath } from 'next/cache';

export interface DispenseMedicationParams {
  prescriptionId: string;
  
  // Use Medication UUID (not Concept UUID)
  medicationId: string;
  // Make medicationDisplay optional - derive from medication if needed
  medicationDisplay?: string;
  
  patientId: string;
  
  quantity: number;
  unit: string;
  unitCode: string;
  
  dose: number;
  doseUnit: string;
  doseUnitCode: string;
  
  route: string;
  routeCode: string;
  
  frequency: string;
  frequencyCode: string;
  
  instructions?: string;
  
  // Duration fields from your payload
  duration?: number;
  durationUnit?: string;
  
  // MUST be an OpenMRS Practitioner UUID
  dispensedByPractitionerId: string;
  
  locationId: string;
  
  dispenseDate?: string;
  
  // For error tracking
  encounterId?: string;
}

// Helper functions for SNOMED CT codes
function getSnomedCodeForFrequency(frequencyCode: string): string {
  const snomedMap: Record<string, string> = {
    '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '229797004', // Once daily
    '160863AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '229798009', // Twice daily
    '160864AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '229799001', // Three times daily
    '160865AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '229800002', // Four times daily
    '160862': '229797004', // Without A suffix
    '160863': '229798009',
    '160864': '229799001',
    '160865': '229800002',
  };
  return snomedMap[frequencyCode] || '229797004'; // Default to once daily
}

function getSnomedCodeForRoute(routeCode: string): string {
  const snomedMap: Record<string, string> = {
    '162390AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '54485002', // In both eyes
    '160240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '26643006', // Oral
    '160242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '47625008', // Intravenous
    '160241AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '78421000', // Intramuscular
    '162390': '54485002', // Without A suffix
    '160240': '26643006',
    '160242': '47625008',
    '160241': '78421000',
  };
  return snomedMap[routeCode] || '26643006'; // Default to oral
}

function getCielCodeWithoutSuffix(code: string): string {
  // Remove the AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA suffix if present
  return code.replace('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '');
}

async function handleApiError(response: Response, source: string) {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  const errorText = await response.text();
  console.error(`API Error [${source}] ${response.status}: ${errorText}`);
  throw new Error(`Failed to ${source}: HTTP ${response.status}`);
}

export async function dispenseMedication(
  params: DispenseMedicationParams
): Promise<{
  success: boolean;
  message: string;
  dispenseId?: string;
}> {
  let headers: Record<string, string>;

  try {
    headers = await getAuthHeaders();
  } catch {
    redirectToLogin();
    return { success: false, message: 'Authentication failed' };
  }

  try {
    const {
      prescriptionId,
      medicationId,
      medicationDisplay,
      patientId,
      quantity,
      unit,
      unitCode,
      dose,
      doseUnit,
      doseUnitCode,
      route,
      routeCode,
      frequency,
      frequencyCode,
      instructions,
      duration,
      durationUnit,
      dispensedByPractitionerId,
      locationId,
      dispenseDate
    } = params;

    // -----------------------
    // Debug logging
    // -----------------------
    console.log('Dispense params received:', {
      medicationId,
      medicationDisplay,
      prescriptionId,
      patientId,
      quantity,
      locationId,
      dispensedByPractitionerId,
      dispenseDate
    });

    // -----------------------
    // Hard validations
    // -----------------------

    if (!medicationId || medicationId.trim() === '') {
      return { success: false, message: 'Medication ID is required' };
    }

    if (!dispensedByPractitionerId || dispensedByPractitionerId.trim() === '') {
      return { success: false, message: 'Practitioner is required' };
    }

    if (!locationId || locationId.trim() === '') {
      return { success: false, message: 'Location is required' };
    }

    if (!quantity || quantity <= 0) {
      return { success: false, message: 'Quantity must be greater than zero' };
    }

    if (!prescriptionId || prescriptionId.trim() === '') {
      return { success: false, message: 'Prescription ID is required' };
    }

    // -----------------------
    // FIXED: Use consistent local time for both timestamps
    // -----------------------

    // Get current local time in ISO format without timezone conversion
    const now = new Date();
    
    // Create ISO string with local timezone offset instead of UTC 'Z'
    const timezoneOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localTime = new Date(now.getTime() - timezoneOffset);
    const localTimeISO = localTime.toISOString().slice(0, -1); // Remove 'Z' suffix
    
    // Use local time for both timestamps
    const whenPrepared = localTimeISO;
    
    // Only use dispenseDate if it contains a full timestamp with time component
    // Otherwise default to current local time
    let whenHandedOver = localTimeISO;
    if (dispenseDate) {
      const parsedDate = new Date(dispenseDate);
      // Check if the date has a time component (not just date-only)
      const hasTimeComponent = parsedDate.getHours() !== 0 || 
                               parsedDate.getMinutes() !== 0 || 
                               parsedDate.getSeconds() !== 0 ||
                               parsedDate.getMilliseconds() !== 0;
      
      if (hasTimeComponent) {
        // Convert the provided timestamp to local time format
        const dispenseLocalTime = new Date(parsedDate.getTime() - timezoneOffset);
        whenHandedOver = dispenseLocalTime.toISOString().slice(0, -1);
      } else {
        // If it's just a date without time, combine with current local time
        const combinedDate = new Date(parsedDate);
        combinedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        const combinedLocalTime = new Date(combinedDate.getTime() - timezoneOffset);
        whenHandedOver = combinedLocalTime.toISOString().slice(0, -1);
      }
    }

    console.log('Timestamp debug:', {
      whenPrepared,
      whenHandedOver,
      dispenseDateProvided: !!dispenseDate,
      originalDispenseDate: dispenseDate
    });

    // -----------------------
    // Prepare CIEL codes without suffix
    // -----------------------
    const cielFrequencyCode = getCielCodeWithoutSuffix(frequencyCode);
    const cielRouteCode = getCielCodeWithoutSuffix(routeCode);
    const cielDoseUnitCode = getCielCodeWithoutSuffix(doseUnitCode);
    const cielUnitCode = getCielCodeWithoutSuffix(unitCode);

    // -----------------------
    // OpenMRS-compatible payload
    // -----------------------

    const medicationDispense: any = {
      resourceType: 'MedicationDispense',
      status: 'completed',

      // Use medicationReference instead of medicationCodeableConcept
      medicationReference: {
        reference: `Medication/${medicationId}`,
        type: 'Medication',
        display: medicationDisplay || `Medication ${medicationId}`
      },

      subject: {
        reference: `Patient/${patientId}`,
        type: 'Patient'
      },

      performer: [
        {
          actor: {
            reference: `Practitioner/${dispensedByPractitionerId}`,
            type: 'Practitioner'
          }
        }
      ],

      location: {
        reference: `Location/${locationId}`,
        type: 'Location'
      },

      authorizingPrescription: [
        {
          reference: `MedicationRequest/${prescriptionId}`,
          type: 'MedicationRequest'
        }
      ],

      quantity: {
        value: quantity,
        unit,
        code: unitCode
      },

      whenPrepared,
      whenHandedOver,

      dosageInstruction: [
        {
          text: instructions ?? '',

          timing: {
            code: {
              coding: [
                {
                  code: frequencyCode,
                  display: frequency
                },
                {
                  system: 'https://cielterminology.org',
                  code: cielFrequencyCode
                },
                {
                  system: 'http://snomed.info/sct/',
                  code: getSnomedCodeForFrequency(frequencyCode)
                }
              ],
              text: frequency
            }
          },

          asNeededBoolean: false,

          route: {
            coding: [
              {
                code: routeCode,
                display: route
              },
              {
                system: 'https://cielterminology.org',
                code: cielRouteCode
              },
              {
                system: 'http://snomed.info/sct/',
                code: getSnomedCodeForRoute(routeCode)
              }
            ],
            text: route
          },

          doseAndRate: [
            {
              doseQuantity: {
                value: dose,
                unit: doseUnit,
                code: doseUnitCode
              }
            }
          ]
        }
      ],

      substitution: {
        wasSubstituted: false,
        reason: [
          {
            coding: [
              {
                code: null
              }
            ]
          }
        ],
        type: {
          coding: [
            {
              code: null
            }
          ]
        }
      }
    };

    // Add duration to timing if provided
    if (duration && durationUnit) {
      medicationDispense.dosageInstruction[0].timing.repeat = {
        duration,
        durationUnit
      };
    }

    // Add _summary parameter for optimized response
    const url = `${process.env.OPENMRS_API_URL_ALT}/MedicationDispense?_summary=data`;

    console.log('Creating MedicationDispense:', JSON.stringify(medicationDispense, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(medicationDispense)
    });

    if (!response.ok) {
      await handleApiError(response, 'create dispense record');
    }

    const data = await response.json();

    if (!data?.id) {
      throw new Error('Dispense created but no ID returned');
    }

    revalidatePath('/pharmacy/dispensing');

    return {
      success: true,
      message: 'Medication dispensed successfully',
      dispenseId: data.id
    };

  } catch (error) {
    console.error('Error dispensing medication:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Failed to dispense medication'
    };
  }
}