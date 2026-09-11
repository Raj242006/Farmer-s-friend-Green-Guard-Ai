import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotificationDispatcher } from '@/lib/alerts/notificationDispatcher';
import { Alert } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json();
        const { email, phone, channels, alert: customAlert } = body;

        const targetEmail = email || session?.user?.email;
        const targetPhone = phone;

        if (!targetEmail && !targetPhone) {
            return NextResponse.json({ error: 'At least an email or mobile phone number is required' }, { status: 400 });
        }

        // Default sample alert for testing if not provided
        const alert: Alert = customAlert || {
            id: `test-${Date.now()}`,
            timestamp: new Date(),
            type: 'irrigation_due',
            severity: 'high',
            severityScore: 85,
            title: 'Test Notification: Low Soil Moisture Alert',
            message: 'Soil moisture dropped to 24% in Field Zone 1. Morning irrigation recommended for 35 minutes.',
            actionRequired: true,
            read: false,
        };

        const result = await NotificationDispatcher.dispatch({
            alert,
            email: email || session.user.email || undefined,
            phone: phone || undefined,
            channels: channels || { email: true, sms: true, whatsapp: true },
        });

        return NextResponse.json({
            success: true,
            message: 'Alert dispatched across selected channels',
            result,
        });
    } catch (error: any) {
        console.error('Notification dispatch error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to dispatch notification' },
            { status: 500 }
        );
    }
}
