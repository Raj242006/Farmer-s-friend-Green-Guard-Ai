/**
 * SMS & WhatsApp Alert Service
 * Handles mobile messaging dispatch via SMS gateways (Twilio / Fast2SMS) and WhatsApp
 */

export interface SMSResult {
    success: boolean;
    channel: 'sms' | 'whatsapp';
    messageId?: string;
    details: string;
    simulated?: boolean;
}

export class SMSService {
    /**
     * Clean phone number to standard international format (defaulting to +91 India)
     */
    static normalizePhoneNumber(phone: string): string {
        let clean = phone.replace(/[^0-9+]/g, '');
        if (clean.startsWith('+')) {
            return clean;
        }
        // If 10 digits (standard Indian number), prefix with +91
        if (clean.length === 10) {
            return `+91${clean}`;
        }
        if (clean.startsWith('91') && clean.length === 12) {
            return `+${clean}`;
        }
        return `+${clean}`;
    }

    /**
     * Send SMS Alert to farmer's mobile number
     */
    static async sendAlertSMS(phone: string, alertText: string): Promise<SMSResult> {
        const normalized = this.normalizePhoneNumber(phone);
        const fast2smsKey = process.env.FAST2SMS_API_KEY;
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

        // 1. If Fast2SMS (Indian SMS Gateway) is configured
        if (fast2smsKey) {
            try {
                const pureDigits = normalized.replace(/\D/g, '').slice(-10);
                const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                    method: 'POST',
                    headers: {
                        'authorization': fast2smsKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        route: 'q',
                        message: alertText,
                        language: 'english',
                        flash: 0,
                        numbers: pureDigits,
                    }),
                });
                const data = await res.json();
                if (data.return) {
                    return {
                        success: true,
                        channel: 'sms',
                        messageId: data.request_id,
                        details: `SMS successfully sent to ${normalized} via Fast2SMS.`,
                    };
                }
            } catch (err: any) {
                console.error('Fast2SMS error:', err.message);
            }
        }

        // 2. If Twilio is configured
        if (twilioSid && twilioToken && twilioFrom) {
            try {
                const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
                const params = new URLSearchParams();
                params.append('To', normalized);
                params.append('From', twilioFrom);
                params.append('Body', alertText);

                const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString(),
                });
                const data = await res.json();
                if (data.sid) {
                    return {
                        success: true,
                        channel: 'sms',
                        messageId: data.sid,
                        details: `SMS successfully dispatched to ${normalized} via Twilio.`,
                    };
                }
            } catch (err: any) {
                console.error('Twilio SMS error:', err.message);
            }
        }

        // 3. Fallback / Simulation mode (when API keys are pending configuration)
        console.log(`📱 [SMS Gateway Log] To: ${normalized} | Message: "${alertText}"`);
        return {
            success: true,
            channel: 'sms',
            simulated: true,
            details: `SMS dispatch simulated to ${normalized}. Add FAST2SMS_API_KEY or TWILIO credentials in .env.local for live telecom dispatch.`,
        };
    }

    /**
     * Generate direct WhatsApp Click-to-Chat URL
     */
    static getWhatsAppUrl(phone: string, message: string): string {
        const clean = phone.replace(/\D/g, '');
        const recipient = clean.length === 10 ? `91${clean}` : clean;
        return `https://api.whatsapp.com/send?phone=${recipient}&text=${encodeURIComponent(message)}`;
    }
}
