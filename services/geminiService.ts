import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("MISSING_API_KEY");
    }
    return new GoogleGenAI({ apiKey });
};

export const draftEmail = async (
    recipientName: string,
    role: string,
    topic: string,
    keyDetails: string,
    tone: 'Professional' | 'Firm' | 'Friendly' = 'Professional'
): Promise<string> => {
    try {
        const client = getClient();
        const model = "gemini-3-flash-preview"; 
        
        const prompt = `
        Draft a ${tone.toLowerCase()} email.
        Recipient: ${recipientName} (${role})
        Topic: ${topic}
        Key Details to Include: ${keyDetails}
        
        The email should be concise and formatted for business communication. 
        Do not include subject lines or placeholders if possible, just the body text.
        `;

        const response = await client.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text || "Unable to generate draft.";
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        if (error.message === "MISSING_API_KEY") {
            return "Setup Required: API Key missing.\n\nTo run AI features locally, create a .env file in your project root with:\nAPI_KEY=your_key_here";
        }
        return `AI Service Unavailable: ${error.message || "Unknown error"}`;
    }
};

export const analyzePropertyDeal = async (
    address: string,
    price: number,
    repairCost: number,
    arv: number
): Promise<string> => {
    try {
        const client = getClient();
        const model = "gemini-3-flash-preview";

        const prompt = `
        Analyze this real estate investment deal briefly.
        Property Location: ${address}
        Purchase Price: $${price}
        Renovation Budget: $${repairCost}
        Target ARV: $${arv}

        Important: The property is located at the address specified above. Do not assume a different location.
        Provide a bulleted list of 3 pros and 3 cons based on typical investment metrics (70% rule, cap rates for the area if known).
        Ensure the analysis is specific to the market of the provided address.
        `;

        const response = await client.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text || "Unable to analyze deal.";
    } catch (error: any) {
         console.error("Gemini API Error:", error);
         if (error.message === "MISSING_API_KEY") {
            return "Setup Required: API Key missing.\n\nTo run AI features locally, create a .env file in your project root with:\nAPI_KEY=your_key_here";
        }
        return `AI Service Unavailable: ${error.message || "Unknown error"}`;
    }
};

export const generatePropertyReport = async (
    property: any,
    financials: any
): Promise<string> => {
    try {
        const client = getClient();
        const model = "gemini-3-flash-preview";

        const prompt = `
        Act as a Senior Real Estate Appraiser. Create a Market Valuation Report for the following property.

        SUBJECT PROPERTY:
        Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}
        Specs: ${property.beds} Bed, ${property.baths} Bath, ${property.sqFt} SqFt
        Type: ${property.type}
        Year Built: ${property.yearBuilt}
        
        FINANCIAL CONTEXT:
        Purchase Price: $${property.purchasePrice}
        Renovation Budget: $${property.estimatedRepairCost}
        Investor Target ARV: $${property.afterRepairValue}

        REQUIREMENTS:
        1. NEIGHBORHOOD ANALYSIS: Based on the city/state/zip, describe the general market conditions and neighborhood vibe.
        2. MLS VALUATION ESTIMATE: Provide an estimated listing price range based on the specific amenities (Beds/Baths/SqFt). Compare this to the Investor's Target ARV.
        3. AMENITIES IMPACT: Explain how the specific specs (Square footage, bed count) affect the value in this specific market.
        4. VERDICT: Is the Investor's Target ARV realistic given the current market?

        Format the output clearly with headers.
        `;

        const response = await client.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text || "Unable to generate report.";
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        if (error.message === "MISSING_API_KEY") {
            return "Setup Required: API Key missing.\n\nTo run AI features locally, create a .env file in your project root with:\nAPI_KEY=your_key_here";
        }
        return `AI Service Unavailable: ${error.message || "Unknown error"}`;
    }
};