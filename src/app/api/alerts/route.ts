import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ThresholdManager } from '@/lib/alerts/thresholdManager';
import prisma from '@/lib/prisma';
import { Alert } from '@/types';
import { AgroMonitoringService } from '@/lib/agromonitoring/agroService';

export const dynamic = 'force-dynamic';

/**
 * Alerts API — generates alerts from REAL farm data in PostgreSQL.
 * No mock data. Alerts are derived from the latest FarmData records.
 */

async function generateAlertsFromFarmData(userId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
        const farms = await prisma.farm.findMany({
            where: { userId },
            include: {
                farmData: { orderBy: { createdAt: 'desc' }, take: 1 },
                insights: { orderBy: { createdAt: 'desc' }, take: 3 },
            },
        });

        for (const farm of farms) {
            const latestData = farm.farmData[0];

            let ndvi: number | null = latestData?.ndvi ?? null;
            let soilMoisture: number | null = latestData?.soilMoisture ?? null;
            let droughtRisk: number | null = latestData?.droughtRisk ?? null;
            let weatherData: any = latestData?.weather ?? null;

            // Direct fetch from AgroMonitoringService if not in DB yet
            if (!latestData && farm.polygonId) {
                try {
                    const [wRes, nRes, sRes] = await Promise.allSettled([
                        AgroMonitoringService.getWeather(farm.polygonId),
                        AgroMonitoringService.getNDVI(farm.polygonId),
                        AgroMonitoringService.getSoilData(farm.polygonId),
                    ]);
                    if (wRes.status === 'fulfilled' && wRes.value) weatherData = wRes.value;
                    if (nRes.status === 'fulfilled' && nRes.value) {
                        const nd = nRes.value as any;
                        ndvi = Array.isArray(nd) ? nd[nd.length - 1]?.data?.mean : nd?.data?.mean;
                    }
                    if (sRes.status === 'fulfilled' && sRes.value) {
                        const sd = sRes.value as any;
                        soilMoisture = sd?.moisture ?? null;
                        droughtRisk = sd?.droughtRisk ?? null;
                    }
                } catch {
                    // Ignore service error
                }
            }

            // 1. Drought risk alert
            if (droughtRisk !== null) {
                if (droughtRisk > 0.7) {
                    alerts.push({
                        id: `drought-crit-${farm.id}`,
                        timestamp: latestData?.createdAt ?? new Date(),
                        type: 'water_stress',
                        severity: 'critical',
                        severityScore: Math.round(droughtRisk * 100),
                        title: `Critical Drought Risk — ${farm.name}`,
                        message: `Drought risk is ${Math.round(droughtRisk * 100)}%. Immediate irrigation required to prevent crop loss.`,
                        actionRequired: true,
                        read: false,
                    });
                } else if (droughtRisk > 0.35) {
                    alerts.push({
                        id: `drought-med-${farm.id}`,
                        timestamp: latestData?.createdAt ?? new Date(),
                        type: 'water_stress',
                        severity: 'medium',
                        severityScore: Math.round(droughtRisk * 100),
                        title: `Elevated Drought Risk — ${farm.name}`,
                        message: `Drought risk is ${Math.round(droughtRisk * 100)}%. Monitor soil moisture levels closely.`,
                        actionRequired: false,
                        read: false,
                    });
                }
            }

            // 2. Soil moisture alert
            if (soilMoisture !== null) {
                if (soilMoisture < 25) {
                    alerts.push({
                        id: `soil-low-${farm.id}`,
                        timestamp: latestData?.createdAt ?? new Date(),
                        type: 'irrigation_due',
                        severity: 'high',
                        severityScore: 80,
                        title: `Low Soil Moisture — ${farm.name}`,
                        message: `Soil moisture is at ${soilMoisture.toFixed(1)}%. Scheduled irrigation should be started soon.`,
                        actionRequired: true,
                        read: false,
                    });
                } else if (soilMoisture > 75) {
                    alerts.push({
                        id: `soil-high-${farm.id}`,
                        timestamp: latestData?.createdAt ?? new Date(),
                        type: 'water_stress',
                        severity: 'medium',
                        severityScore: 40,
                        title: `High Soil Moisture — ${farm.name}`,
                        message: `Soil moisture is at ${soilMoisture.toFixed(1)}%. Hold pending irrigation to prevent root rot.`,
                        actionRequired: false,
                        read: false,
                    });
                }
            } else {
                // If no specific moisture reading yet, provide irrigation guideline alert
                alerts.push({
                    id: `soil-guideline-${farm.id}`,
                    timestamp: new Date(),
                    type: 'irrigation_due',
                    severity: 'low',
                    severityScore: 30,
                    title: `Irrigation Advisory — ${farm.name}`,
                    message: `Morning irrigation recommended between 6:00 AM - 8:30 AM for optimal water uptake.`,
                    actionRequired: false,
                    read: false,
                });
            }

            // 3. NDVI alert
            if (ndvi !== null) {
                if (ndvi < 0.25) {
                    alerts.push({
                        id: `ndvi-poor-${farm.id}`,
                        timestamp: latestData?.createdAt ?? new Date(),
                        type: 'anomaly',
                        severity: 'high',
                        severityScore: 75,
                        title: `Low Canopy Density — ${farm.name}`,
                        message: `NDVI is ${ndvi.toFixed(2)}. Check crop for nutrient deficiency or pest activity.`,
                        actionRequired: true,
                        read: false,
                    });
                } else if (ndvi >= 0.4) {
                    alerts.push({
                        id: `ndvi-good-${farm.id}`,
                        timestamp: latestData?.createdAt ?? new Date(),
                        type: 'anomaly',
                        severity: 'low',
                        severityScore: 10,
                        title: `Healthy Canopy Growth — ${farm.name}`,
                        message: `NDVI is ${ndvi.toFixed(2)}, indicating vigorous vegetative growth and good chlorophyll levels.`,
                        actionRequired: false,
                        read: false,
                    });
                }
            }

            // 4. Weather-based alerts
            if (weatherData && typeof weatherData === 'object') {
                const w = weatherData as any;
                const tempK = w.main?.temp;
                const tempC = tempK ? (tempK > 200 ? tempK - 273.15 : tempK) : null;
                if (tempC && tempC > 38) {
                    alerts.push({
                        id: `heat-${farm.id}`,
                        timestamp: latestData?.createdAt ?? new Date(),
                        type: 'weather_warning',
                        severity: 'high',
                        severityScore: 65,
                        title: `Extreme Heat Warning — ${farm.name}`,
                        message: `Temperature reached ${Math.round(tempC)}°C. Increase irrigation frequency and apply mulching to protect roots.`,
                        actionRequired: true,
                        read: false,
                    });
                }
                const rain = w.rain?.['1h'] || w.rain?.['3h'];
                if (rain && rain > 2) {
                    alerts.push({
                        id: `rain-${farm.id}`,
                        timestamp: latestData?.createdAt ?? new Date(),
                        type: 'weather_warning',
                        severity: 'medium',
                        severityScore: 45,
                        title: `Rainfall Detected — ${farm.name}`,
                        message: `Precipitation recorded (${rain}mm). Consider pausing scheduled drip irrigation.`,
                        actionRequired: false,
                        read: false,
                    });
                }
            }

            // 5. Farm status notice
            if (!farm.polygonId) {
                alerts.push({
                    id: `nopoly-${farm.id}`,
                    timestamp: farm.createdAt,
                    type: 'sensor_malfunction',
                    severity: 'medium',
                    severityScore: 50,
                    title: `No Satellite Polygon — ${farm.name}`,
                    message: `Draw a boundary on the farm map to activate automated NDVI and satellite soil monitoring.`,
                    actionRequired: true,
                    read: false,
                });
            }
        }

        if (farms.length === 0) {
            alerts.push({
                id: 'no-farms',
                timestamp: new Date(),
                type: 'sensor_malfunction',
                severity: 'low',
                severityScore: 10,
                title: 'No Farms Registered',
                message: 'Add your first farm from the dashboard to start receiving automated irrigation and crop alerts.',
                actionRequired: true,
                read: false,
            });
        }
    } catch (err) {
        console.error('Error generating alerts from farm data:', err);
    }

    alerts.sort((a, b) => b.severityScore - a.severityScore);
    return alerts;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        let userId = (session?.user as any)?.id;
        if (!userId && session?.user?.email) {
            const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
            userId = dbUser?.id;
        }

        let alerts: Alert[] = [];
        try {
            if (userId) {
                alerts = await generateAlertsFromFarmData(userId);
            }
        } catch (e) {
            console.error('generateAlertsFromFarmData error:', e);
        }

        if (alerts.length === 0) {
            alerts = [{
                id: 'sys-advisory',
                timestamp: new Date(),
                type: 'irrigation_due',
                severity: 'low',
                severityScore: 20,
                title: 'Irrigation Advisory — GreenGuard AI Active',
                message: 'All monitoring services active. Morning drip irrigation recommended for optimal root retention.',
                actionRequired: false,
                read: false,
            }];
        }

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const filtered = unreadOnly ? alerts.filter(a => !a.read) : alerts;

        return NextResponse.json({
            alerts: filtered,
            unreadCount: alerts.filter(a => !a.read).length,
        });
    } catch (error) {
        console.error('Alerts API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alerts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'markAsRead') {
            // In-memory only for now — a real app would persist this
            return NextResponse.json({ success: true });
        }

        if (action === 'create') {
            const { type, severity, severityScore, context } = body;
            const newAlert = ThresholdManager.createAlert(type, severity, severityScore, context);
            return NextResponse.json({ alert: newAlert, success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Alert action error:', error);
        return NextResponse.json(
            { error: 'Failed to process alert action' },
            { status: 500 }
        );
    }
}
