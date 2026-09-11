/**
 * Insights Generation API
 * Uses Gemini (with model fallback & retry) to generate AI insights from real farm + live AgroMonitoring data
 * Includes intelligent agronomic fallback if Gemini encounters 503 service overload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AgroMonitoringService } from '@/lib/agromonitoring/agroService';

export const dynamic = 'force-dynamic';

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Call Gemini with model fallback and retry for 503 / 429
 */
async function callGeminiWithFallback(apiKey: string, prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (const model of GEMINI_MODELS) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const apiUrl = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 1200,
                        },
                    }),
                });

                if (response.status === 503 || response.status === 429) {
                    const errText = await response.text();
                    console.warn(`Gemini ${model} attempt ${attempt + 1} returned ${response.status}:`, errText.substring(0, 100));
                    // Wait 1.5s before retry
                    await new Promise((r) => setTimeout(r, 1500));
                    continue;
                }

                if (!response.ok) {
                    const errText = await response.text();
                    console.error(`Gemini ${model} error ${response.status}:`, errText.substring(0, 200));
                    lastError = new Error(`Gemini error ${response.status}`);
                    break; // try next model
                }

                const data = await response.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            } catch (err: any) {
                lastError = err;
                console.warn(`Gemini call error on ${model}:`, err.message);
                await new Promise((r) => setTimeout(r, 1000));
            }
        }
    }

    throw lastError || new Error('All Gemini models failed');
}

/**
 * Agronomic Engine Fallback (Used when Gemini is temporarily down / 503)
 * Produces high-quality, conversational agricultural insights based on real farm parameters
 */
function generateAgronomicFallback(params: {
    farmName: string;
    location: string;
    ndvi: number | null;
    ndviTrend: string;
    soilMoisture: number | null;
    droughtRisk: number | null;
    temp: string | null;
    humidity: number | null;
    weatherDesc: string | null;
}) {
    const { farmName, location, ndvi, ndviTrend, soilMoisture, droughtRisk, temp, humidity, weatherDesc } = params;

    const problems: string[] = [];
    const recommendations: string[] = [];
    const futureRisks: string[] = [];
    let overallHealth: 'good' | 'moderate' | 'poor' | 'critical' = 'good';

    const tempNum = temp ? parseFloat(temp) : null;

    // Soil Moisture Analysis
    if (soilMoisture !== null) {
        if (soilMoisture < 25) {
            overallHealth = 'poor';
            problems.push(`Soil moisture is critically low at ${soilMoisture.toFixed(1)}%, which can cause root dehydration and stunted growth.`);
            recommendations.push(`Initiate irrigation immediately for 40-50 minutes, preferably in the morning before sunlight becomes intense.`);
            futureRisks.push(`Leaf wilting and irreversible moisture stress could develop within 48 hours without adequate watering.`);
        } else if (soilMoisture < 35) {
            if (overallHealth === 'good') overallHealth = 'moderate';
            problems.push(`Soil moisture is on the lower side at ${soilMoisture.toFixed(1)}% and heading toward water stress.`);
            recommendations.push(`Schedule irrigation for 30-35 minutes within the next 24 hours to replenish root-zone moisture.`);
            futureRisks.push(`Reduced flowering and crop vigor if the next watering cycle is delayed.`);
        } else if (soilMoisture > 75) {
            overallHealth = 'moderate';
            problems.push(`Soil moisture is very high at ${soilMoisture.toFixed(1)}%, indicating waterlogging or excessive irrigation.`);
            recommendations.push(`Pause irrigation and inspect field drainage channels to prevent fungal root rot.`);
            futureRisks.push(`Risk of root asphyxiation and damping-off disease under prolonged saturated soil conditions.`);
        } else {
            recommendations.push(`Maintain the current irrigation schedule; root zone moisture is in a balanced optimal range.`);
        }
    } else {
        recommendations.push(`Irrigate during early morning hours (6:00 AM to 8:30 AM) to minimize evaporation losses.`);
    }

    // NDVI Analysis
    if (ndvi !== null) {
        if (ndvi < 0.25) {
            overallHealth = 'poor';
            problems.push(`NDVI satellite reading is low at ${ndvi.toFixed(2)}, pointing to sparse canopy density or vegetative stress.`);
            recommendations.push(`Inspect crops for nutrient deficiencies (especially Nitrogen) and check for pest infestation.`);
            futureRisks.push(`Expected yield reduction if canopy chlorophyll levels do not recover over the next week.`);
        } else if (ndvi < 0.4) {
            if (overallHealth === 'good') overallHealth = 'moderate';
            problems.push(`NDVI is moderate at ${ndvi.toFixed(2)}. Foliage growth is fair but could benefit from a nutrient boost.`);
            recommendations.push(`Consider applying a balanced micronutrient or bio-fertilizer spray to stimulate leaf development.`);
        } else {
            recommendations.push(`Crop canopy shows strong vegetative vigor with healthy chlorophyll index (NDVI: ${ndvi.toFixed(2)}).`);
        }
    }

    // Weather / Heat Analysis
    if (tempNum !== null && tempNum > 35) {
        problems.push(`Ambient temperature is elevated at ${tempNum}°C, accelerating soil evaporation.`);
        recommendations.push(`Apply organic mulching (straw or dry leaves) around plant beds to retain soil coolness and moisture.`);
        futureRisks.push(`High daytime heat could cause pollen sterility and increased water transpiration.`);
    }

    if (droughtRisk !== null && droughtRisk > 0.4) {
        futureRisks.push(`Satellite indicators forecast an elevated drought index (${(droughtRisk * 100).toFixed(0)}%) over the upcoming week.`);
    }

    // Default safety values if data was sparse
    if (problems.length === 0) {
        problems.push(`No major stress detected. Field conditions are currently within normal baseline.`);
    }
    if (recommendations.length === 0) {
        recommendations.push(`Continue regular monitoring and adhere to scheduled drip irrigation.`);
        recommendations.push(`Perform routine weeding and check crop underside for early pest traces.`);
    }
    if (futureRisks.length === 0) {
        futureRisks.push(`Sudden temperature fluctuations could alter evapotranspiration rate; monitor daily.`);
    }

    const summary = `Farm "${farmName}" in ${location} is in ${overallHealth} condition. ${
        soilMoisture !== null ? `Soil moisture stands at ${soilMoisture.toFixed(0)}%. ` : ''
    }${ndvi !== null ? `Vegetation vigor index (NDVI) is ${ndvi.toFixed(2)}. ` : ''}${
        recommendations[0]
    }`;

    return {
        problems,
        recommendations,
        futureRisks,
        overallHealth,
        summary,
    };
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { farmId } = await request.json();
        if (!farmId) {
            return NextResponse.json({ error: 'farmId is required' }, { status: 400 });
        }

        // Get farm details
        const farm = await prisma.farm.findUnique({
            where: { id: farmId },
            include: {
                farmData: { orderBy: { createdAt: 'desc' }, take: 3 },
            },
        });

        if (!farm) {
            return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
        }

        if (farm.userId !== (session.user as any).id && (session.user as any).role !== 'GOVERNMENT') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        // ── Build context from stored farmData (if any) ──
        const latestData = farm.farmData[0] || null;
        const previousData = farm.farmData[1] || null;

        let ndviTrend = 'stable';
        if (latestData?.ndvi != null && previousData?.ndvi != null) {
            const diff = latestData.ndvi - previousData.ndvi;
            if (diff > 0.05) ndviTrend = 'improving';
            else if (diff < -0.05) ndviTrend = 'declining';
        }

        const weather = latestData?.weather as any;

        // ── Fetch live data directly from AgroMonitoringService if polygonId exists ──
        let liveWeather: any = null;
        let liveNDVI: any = null;
        let liveSoil: any = null;

        if (farm.polygonId) {
            try {
                const [wRes, nRes, sRes] = await Promise.allSettled([
                    AgroMonitoringService.getWeather(farm.polygonId),
                    AgroMonitoringService.getNDVI(farm.polygonId),
                    AgroMonitoringService.getSoilData(farm.polygonId),
                ]);
                if (wRes.status === 'fulfilled' && wRes.value) liveWeather = wRes.value;
                if (nRes.status === 'fulfilled' && nRes.value) liveNDVI = nRes.value;
                if (sRes.status === 'fulfilled' && sRes.value) liveSoil = sRes.value;
            } catch (e: any) {
                console.warn('Live AgroMonitoring fetch error:', e?.message);
            }
        }

        // ── Normalize values ──
        const ndvi = latestData?.ndvi ?? (Array.isArray(liveNDVI) ? liveNDVI[liveNDVI.length - 1]?.data?.mean : liveNDVI?.data?.mean) ?? null;
        const soilMoisture = latestData?.soilMoisture ?? liveSoil?.moisture ?? null;
        const droughtRisk = latestData?.droughtRisk ?? liveSoil?.droughtRisk ?? null;

        const rawTemp = weather?.main?.temp ?? liveWeather?.main?.temp ?? null;
        const temp = rawTemp ? (rawTemp > 200 ? (rawTemp - 273.15).toFixed(1) : rawTemp.toFixed(1)) : null;

        const humidity = weather?.main?.humidity ?? liveWeather?.main?.humidity ?? null;
        const windSpeed = weather?.wind?.speed ?? liveWeather?.wind?.speed ?? null;
        const weatherDesc = weather?.weather?.[0]?.description ?? liveWeather?.weather?.[0]?.description ?? null;
        const clouds = (typeof weather?.clouds === 'object' ? weather?.clouds?.all : weather?.clouds) ?? liveWeather?.clouds?.all ?? null;

        const cropNames = farm.name;

        // ── Build prompt ──
        const ndviHealth = ndvi == null ? 'unknown'
            : ndvi > 0.6 ? 'Excellent (healthy dense vegetation)'
            : ndvi > 0.4 ? 'Good (healthy vegetation)'
            : ndvi > 0.25 ? 'Fair (mild stress/moderate density)'
            : 'Poor (vegetative stress or low canopy)';

        const contextLines = [
            `Farm Name: ${farm.name}`,
            `Location: ${farm.location}`,
            `Crop Identifier: ${cropNames}`,
            ndvi != null ? `NDVI: ${ndvi.toFixed(3)} — ${ndviHealth} (trend: ${ndviTrend})` : 'NDVI: Not available yet',
            temp ? `Temperature: ${temp}°C` : null,
            humidity ? `Humidity: ${humidity}%` : null,
            windSpeed ? `Wind Speed: ${windSpeed} m/s` : null,
            weatherDesc ? `Current Sky/Weather: ${weatherDesc}` : null,
            clouds != null ? `Cloud Cover: ${clouds}%` : null,
            soilMoisture != null ? `Soil Moisture: ${soilMoisture.toFixed(1)}%` : null,
            droughtRisk != null ? `Drought Risk: ${(droughtRisk * 100).toFixed(0)}%` : null,
        ].filter(Boolean).join('\n');

        const prompt = `You are a warm, experienced senior agricultural expert advising an Indian farmer about their field.
Speak in clear, respectful, natural English sentences that a real farmer can immediately understand and act upon.
DO NOT use code blocks, DO NOT write variable names, and DO NOT sound like a robot.

ACTUAL FARM DATA:
${contextLines}

Generate a concise, insightful advisory tailored specifically for ${cropNames} at ${farm.location}.
Return ONLY a valid JSON object matching this structure:
{
  "problems": [
    "A clear, practical sentence describing an issue observed from the data (e.g., 'Soil moisture at 26% is nearing the stress point, which can restrict nutrient absorption.')",
    "Another real practical observation in simple English"
  ],
  "recommendations": [
    "Actionable step 1 for the farmer today (e.g., 'Run drip irrigation for 35 minutes early in the morning before 8 AM.')",
    "Actionable step 2 regarding crop care, soil health, or mulching",
    "Actionable step 3 for pest prevention or water conservation"
  ],
  "futureRisks": [
    "A realistic risk for the coming 5-7 days if recommended actions are skipped",
    "Weather or moisture risk to watch out for"
  ],
  "overallHealth": "good",
  "summary": "A friendly 2-sentence summary of how the farm is doing today and the top priority task for the farmer."
}

RULES:
1. "overallHealth" must be one of: "good", "moderate", "poor", "critical".
2. Every value must be a real, complete, conversational English sentence.
3. Incorporate real numbers from the data: NDVI (${ndvi != null ? ndvi.toFixed(2) : 'N/A'}), Soil Moisture (${soilMoisture != null ? soilMoisture.toFixed(1) + '%' : 'N/A'}), Temperature (${temp ? temp + '°C' : 'N/A'}).
4. Return ONLY valid raw JSON with NO markdown backticks.`;

        let insights: any = null;

        // Try calling Gemini if API key is present
        if (apiKey) {
            try {
                const responseText = await callGeminiWithFallback(apiKey, prompt);
                const cleanText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                const parsed = JSON.parse(cleanText);

                if (parsed.summary && Array.isArray(parsed.recommendations)) {
                    insights = {
                        problems: Array.isArray(parsed.problems) ? parsed.problems : ['Field parameters monitored.'],
                        recommendations: parsed.recommendations,
                        futureRisks: Array.isArray(parsed.futureRisks) ? parsed.futureRisks : [],
                        overallHealth: ['good', 'moderate', 'poor', 'critical'].includes(parsed.overallHealth) ? parsed.overallHealth : 'moderate',
                        summary: parsed.summary,
                    };
                }
            } catch (err: any) {
                console.warn('Gemini call failed or returned 503, switching to agronomic engine fallback:', err?.message);
            }
        }

        // If Gemini failed (e.g. 503 error) or API key is missing, use Agronomic Fallback
        if (!insights) {
            insights = generateAgronomicFallback({
                farmName: farm.name,
                location: farm.location,
                ndvi,
                ndviTrend,
                soilMoisture,
                droughtRisk,
                temp,
                humidity,
                weatherDesc,
            });
        }

        // ── Save to DB ──
        const savedInsight = await prisma.insight.create({
            data: {
                farmId,
                insight: JSON.stringify({
                    problems: insights.problems,
                    futureRisks: insights.futureRisks,
                    overallHealth: insights.overallHealth,
                    summary: insights.summary,
                }),
                recommendation: JSON.stringify(insights.recommendations),
                riskLevel: insights.overallHealth,
            },
        });

        return NextResponse.json({
            insights,
            savedId: savedInsight.id,
            farmId,
            timestamp: new Date().toISOString(),
            dataSource: 'live_analyzed',
        });

    } catch (error) {
        console.error('Insights generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate insights' },
            { status: 500 }
        );
    }
}

/**
 * GET: Fetch existing insights for a farm
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farmId');

        if (!farmId) {
            return NextResponse.json({ error: 'farmId is required' }, { status: 400 });
        }

        const insights = await prisma.insight.findMany({
            where: { farmId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const parsed = insights.map((i: any) => ({
            id: i.id,
            farmId: i.farmId,
            createdAt: i.createdAt,
            riskLevel: i.riskLevel,
            data: (() => { try { return JSON.parse(i.insight); } catch { return { summary: i.insight }; } })(),
            recommendations: (() => { try { return JSON.parse(i.recommendation); } catch { return [i.recommendation]; } })(),
        }));

        return NextResponse.json({ insights: parsed });
    } catch (error) {
        console.error('Error fetching insights:', error);
        return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
    }
}
