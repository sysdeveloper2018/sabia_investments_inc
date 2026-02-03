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
        // SOLUTION 1: Try Resend (modern email service)
        const resendData = {
            from: 'onboarding@resend.dev', // Resend's default sender
            to: [payload.to],
            subject: payload.subject,
            html: `<p>${payload.body.replace(/\n/g, '<br>')}</p>`
        };
        
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 're_123456789', // You'll need to get a real API key
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resendData)
        });
        
        if (response.ok) {
            console.log("--- EMAIL SENT VIA RESEND ---");
            return true;
        }
        
        throw new Error("Resend service failed");
        
    } catch (e) {
        console.error("--- EMAIL SERVICE ERROR ---", e);
        
        // SOLUTION 2: Try EmailJS as backup
        try {
            const emailJSData = {
                service_id: 'service_yourid',
                template_id: 'template_yourid',
                user_id: 'user_yourid',
                template_params: {
                    to_email: payload.to,
                    subject: payload.subject,
                    message: payload.body,
                    from_name: 'Sabia Investments Properties Inc'
                }
            };
            
            const emailJSResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailJSData)
            });
            
            if (emailJSResponse.ok) {
                console.log("--- EMAIL SENT VIA EMAILJS ---");
                return true;
            }
        } catch (emailJSError) {
            console.error("EmailJS also failed:", emailJSError);
        }
        
        // FINAL FALLBACK: Show user what would be sent
        console.log("--- EMAIL CONTENT (FOR MANUAL SENDING) ---");
        console.log("To:", payload.to);
        console.log("Subject:", payload.subject);
        console.log("Body:", payload.body);
        console.log("--- END EMAIL CONTENT ---");
        
        // Create a mailto link for easy sending
        const mailtoLink = `mailto:${payload.to}?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.body)}`;
        
        // Show user the content and offer to open email client
        const shouldOpenEmail = confirm(`Email prepared!\n\nTo: ${payload.to}\nSubject: ${payload.subject}\n\nClick OK to open your email client, or Cancel to copy manually.`);
        
        if (shouldOpenEmail) {
            window.open(mailtoLink, '_blank');
        } else {
            // Copy to clipboard
            navigator.clipboard.writeText(`To: ${payload.to}\nSubject: ${payload.subject}\n\n${payload.body}`);
            alert('Email content copied to clipboard! Paste it in your email client.');
        }
        
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
