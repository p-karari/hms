// Reusing the type defined in the Lab Results action
type LabResultInterpretation = 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | 'CRITICALLY_HIGH' | 'CRITICALLY_LOW' | null;

/**
 * Formats an ISO 8601 date string into a user-friendly date and time string.
 * @param dateString The ISO date string from the OpenMRS API (e.g., "2025-10-27T16:38:11.000+0300").
 * @returns A formatted date and time string (e.g., "Oct 27, 2025 4:38 PM").
 */
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
        return dateString; // Return original string on error
    }
}

/**
 * Returns a Tailwind CSS color class based on the lab result interpretation.
 * NOTE: This function is useful if you need dynamic inline styling beyond what
 * was done in the LabResultsTable JSX.
 * @param interpretation The interpretation status from the LabResult object.
 * @returns A Tailwind CSS class string for background/text color.
 */
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