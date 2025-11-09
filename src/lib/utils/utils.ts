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