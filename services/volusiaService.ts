interface VolusiaAppraisalResult {
    success: boolean;
    searchAddress: string;
    fullAddress: string;
    directoryName: string;
    extractionResult?: any;
    screenshot?: string;
    filesCreated?: string[];
    timestamp?: string;
    error?: string;
}

export const searchVolusiaAppraiser = async (address: string): Promise<VolusiaAppraisalResult> => {
    try {
        console.log('🔍 Starting Volusia County appraisal search for:', address);
        
        const response = await fetch('/.netlify/functions/volusia-appraiser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Volusia appraisal search completed:', result);
        
        return result;
    } catch (error) {
        console.error('❌ Volusia appraisal search failed:', error);
        return {
            success: false,
            searchAddress: address,
            fullAddress: address,
            directoryName: '',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};

// Function to extract partial address for search
export const extractPartialAddress = (fullAddress: string): string => {
    if (!fullAddress) return '';
    
    const parts = fullAddress.trim().split(' ');
    if (parts.length < 2) return fullAddress;
    
    // Take everything after first number, but limit to first 3 words
    const afterNumber = parts.slice(1).join(' ');
    const words = afterNumber.split(' ');
    const partialAddress = words.slice(0, 3).join(' ');
    
    return parts[0] + ' ' + partialAddress;
};
