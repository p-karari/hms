import { validateDispenseForm } from "../pharmacy/pharmacy";

type LabResultInterpretation = 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | 'CRITICALLY_HIGH' | 'CRITICALLY_LOW' | null;

export function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch (e) {
        console.error("Failed to format date:", dateString, e);
        return dateString;
    }
}

export function getInterpretationColor(interpretation: LabResultInterpretation): string {
    if (!interpretation) return 'text-gray-600';

    switch (interpretation) {
        case 'CRITICAL':
        case 'CRITICALLY_HIGH':
        case 'CRITICALLY_LOW':
            return 'text-red-700 font-bold';
        case 'ABNORMAL':
            return 'text-orange-700 font-medium';
        case 'NORMAL':
            return 'text-green-700';
        default:
            return 'text-gray-600';
    }
}


// Format FHIR date strings for display
export function formatFHIRDate(dateString: string): string {
  if (!dateString) return 'Unknown';
  
  try {
    // Handle various FHIR date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if can't parse
    }
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  } catch {
    return dateString;
  }
}

// Extract patient name from FHIR display string
export function extractPatientName(display: string): string {
  if (!display) return 'Unknown';
  
  const match = display.match(/^([^(]+)/);
  return match ? match[1].trim() : display;
}

// Extract patient ID from FHIR display string
export function extractPatientId(display: string): string {
  if (!display) return 'Unknown';
  
  const match = display.match(/OpenMRS ID:\s*([^),]+)/);
  return match ? match[1].trim() : 'Unknown';
}

// Calculate patient age from birth date
export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch {
    return 0;
  }
}

// Format medication display name
export function formatMedicationDisplay(medication: any): string {
  if (!medication) return 'Unknown Medication';
  
  if (medication.medicationReference?.display) {
    return medication.medicationReference.display;
  }
  
  if (medication.medicationCodeableConcept?.text) {
    return medication.medicationCodeableConcept.text;
  }
  
  if (medication.medicationCodeableConcept?.coding?.[0]?.display) {
    return medication.medicationCodeableConcept.coding[0].display;
  }
  
  return 'Unknown Medication';
}

// Create dosage instruction text
export function createDosageText(dosage: any): string {
  if (!dosage) return 'No dosage instructions';
  
  const parts: string[] = [];
  
  // Add dose
  if (dosage.doseAndRate?.[0]?.doseQuantity) {
    const dose = dosage.doseAndRate[0].doseQuantity;
    parts.push(`DOSE ${dose.value} ${dose.unit}`);
  }
  
  // Add route
  if (dosage.route?.text) {
    parts.push(`— ${dosage.route.text}`);
  }
  
  // Add frequency
  if (dosage.timing?.code?.text) {
    parts.push(`— ${dosage.timing.code.text}`);
  }
  
  // Add duration
  if (dosage.timing?.repeat?.duration && dosage.timing?.repeat?.durationUnit) {
    parts.push(`for ${dosage.timing.repeat.duration} ${dosage.timing.repeat.durationUnit}`);
  }
  
  return parts.join(' ');
}

// Debounce function for search
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Local storage helpers for pharmacy
export class PharmacyStorage {
  private static readonly PREFIX = 'pharmacy_';
  
  static setItem(key: string, value: any): void {
    try {
      localStorage.setItem(`${this.PREFIX}${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  static getItem<T = any>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${this.PREFIX}${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }
  
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(`${this.PREFIX}${key}`);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
  
  static clear(): void {
    try {
      // Only clear pharmacy items
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

// Export all utilities
export {
  validateDispenseForm
};