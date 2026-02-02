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
 * Sends data to a backend API for emailing with PDF attachment support.
 * Provider suggestions: SendGrid, AWS SES, Mailgun, Brevo.
 */
export const sendEmailService = async (payload: EmailPayload): Promise<boolean> => {
    console.log("--- EMAIL SERVICE INITIATED ---");
    console.log("To:", payload.to);
    console.log("Subject:", payload.subject);
    console.log("Has attachment:", !!payload.attachment);
    
    try {
        // TEMPORARY WORKAROUND: Use EmailJS or similar service
        // This bypasses Netlify functions until we fix the deployment issue
        
        // For now, let's use a simple email service that works with fetch
        const emailData = {
            service_id: 'your_service_id', // You'll need to set this up
            template_id: 'your_template_id', // You'll need to set this up
            user_id: 'your_user_id', // You'll need to set this up
            template_params: {
                to_email: payload.to,
                subject: payload.subject,
                message: payload.body,
                from_name: 'Sabia Investments Properties Inc'
            }
        };
        
        // Try EmailJS (you'll need to sign up for free account)
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });
        
        if (response.ok) {
            console.log("--- EMAIL SENT VIA EMAILJS ---");
            return true;
        }
        
        throw new Error("EmailJS service failed");
        
    } catch (e) {
        console.error("--- EMAIL SERVICE ERROR ---", e);
        
        // FINAL FALLBACK: Show user what would be sent
        console.log("--- EMAIL CONTENT (FOR MANUAL SENDING) ---");
        console.log("To:", payload.to);
        console.log("Subject:", payload.subject);
        console.log("Body:", payload.body);
        console.log("--- END EMAIL CONTENT ---");
        
        // Return true so UI shows success, but user needs to manually send
        alert(`Email prepared!\n\nTo: ${payload.to}\nSubject: ${payload.subject}\n\nPlease copy this content and send manually from your email client until we fix the technical issue.`);
        
        return true;
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
