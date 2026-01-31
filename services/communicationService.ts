import { EmailPayload, SmsPayload } from "../types";

// In a real app, this might be 'https://api.yourdomain.com'
// For local development with a backend, it might be 'http://localhost:3001'
const API_BASE_URL = ''; 

/**
 * Simulates capturing a specific HTML Element as an image.
 * In a real production build, you would use a library like 'html2canvas'.
 * e.g., import html2canvas from 'html2canvas'; return html2canvas(element);
 */
export const captureElementAsImage = async (element: HTMLElement | null): Promise<Blob | null> => {
    if (!element) {
        console.error("No element provided for capture");
        return null;
    }

    console.log("Capturing screenshot of:", element);
    
    // SIMULATION: Create a dummy image Blob to represent the screenshot
    // This allows the flow to work without installing heavy npm packages in this environment.
    return new Promise((resolve) => {
        setTimeout(() => {
            // Create a 1x1 pixel transparent GIF as a placeholder blob
            const base64Data = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "image/gif" });
            resolve(blob);
        }, 800); // Simulate rendering time
    });
};

/**
 * Sends data to a backend API for emailing.
 * Provider suggestions: SendGrid, AWS SES, Mailgun.
 */
export const sendEmailService = async (payload: EmailPayload): Promise<boolean> => {
    console.log("--- EMAIL SERVICE INITIATED ---");
    
    try {
        // Attempt to hit the backend API
        const response = await fetch(`${API_BASE_URL}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: payload.to,
                subject: payload.subject,
                body: payload.body,
                // Note: Sending blobs/files often requires FormData, not JSON, in real implementations
            })
        });

        if (response.ok) {
             console.log("--- EMAIL SENT VIA BACKEND ---");
             return true;
        }
        throw new Error("Backend not available");
    } catch (e) {
        // Fallback to simulation
        console.warn("Backend unavailable, using simulation.", e);
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`(SIMULATED) Email sent to ${payload.to}`);
                resolve(true);
            }, 1500);
        });
    }
};

/**
 * Sends data to a backend API for SMS (e.g. Twilio).
 */
export const sendSmsService = async (payload: SmsPayload): Promise<boolean> => {
    console.log("--- SMS SERVICE INITIATED ---");

    try {
        // Attempt to hit the backend API (The Twilio Integration)
        const response = await fetch(`${API_BASE_URL}/api/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: payload.to,
                message: payload.message
            })
        });

        if (response.ok) {
             console.log("--- SMS SENT VIA TWILIO BACKEND ---");
             return true;
        }
        throw new Error("Backend not available");
    } catch (e) {
        // Fallback to simulation
        console.warn("Backend unavailable, switching to simulation mode.");
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`(SIMULATED) SMS sent to ${payload.to}: "${payload.message}"`);
                resolve(true);
            }, 1000);
        });
    }
};
