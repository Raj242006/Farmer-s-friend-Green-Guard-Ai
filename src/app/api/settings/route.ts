import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// In-memory store for session/user settings with fallback
const userSettingsStore = new Map<string, any>();

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Fetch user details & farms
        const dbUser = userId && prisma ? await prisma.user.findUnique({
            where: { id: userId },
            include: {
                farms: {
                    select: { id: true, name: true, location: true, polygonId: true, areaHa: true, createdAt: true }
                }
            }
        }) : null;

        const stored = userId ? userSettingsStore.get(userId) : null;

        const defaults = {
            notifications: {
                phone: '',
                alertEmail: '',
                emailAlerts: true,
                smsAlerts: true,
                whatsappAlerts: true,
                dailySummary: false,
                weatherAlerts: true,
            },
            irrigation: {
                mode: 'ai_automated', // 'ai_automated' | 'manual_approval'
                method: 'drip', // 'drip' | 'sprinkler' | 'surface'
                moistureThreshold: 28, // %
                rainDelay: true,
                preferredWindow: 'morning', // 'morning' | 'evening' | 'anytime'
            },
            display: {
                tempUnit: 'celsius',
                areaUnit: 'hectares',
                language: 'en',
                theme: 'dark',
            },
            system: {
                geminiModel: 'gemini-3.6-flash',
                geminiStatus: !!process.env.GEMINI_API_KEY,
                agroStatus: !!process.env.AGROMONITORING_API_KEY,
                mlModelStatus: true,
            }
        };

        return NextResponse.json({
            user: {
                id: dbUser?.id || userId,
                name: dbUser?.name || session.user.name || 'Farmer',
                email: dbUser?.email || session.user.email || '',
                role: dbUser?.role || (session.user as any).role || 'FARMER',
                createdAt: dbUser?.createdAt || null,
            },
            farms: dbUser?.farms || [],
            settings: stored ? { ...defaults, ...stored, system: defaults.system } : defaults,
        });
    } catch (error: any) {
        console.error('Error fetching settings:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        if (!userId) {
            return NextResponse.json({ error: 'User ID missing' }, { status: 400 });
        }

        const body = await req.json();
        const { notifications, irrigation, display } = body;

        const current = userSettingsStore.get(userId) || {};
        const updated = {
            ...current,
            ...(notifications && { notifications }),
            ...(irrigation && { irrigation }),
            ...(display && { display }),
            updatedAt: new Date().toISOString(),
        };

        userSettingsStore.set(userId, updated);

        return NextResponse.json({
            success: true,
            message: 'Preferences saved successfully',
            settings: updated,
        });
    } catch (error: any) {
        console.error('Error saving settings:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to save settings' },
            { status: 500 }
        );
    }
}
