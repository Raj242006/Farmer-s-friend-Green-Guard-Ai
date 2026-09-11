import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import cropService from '../../../../backend/services/cropRecommendation.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const farmId = body.farmId; // Optional but recommended

        // Validate required fields
        const requiredFields = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'];
        for (const field of requiredFields) {
            if (body[field] === undefined || body[field] === null || body[field] === '') {
                return NextResponse.json(
                    { success: false, error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Call backend service for prediction
        const predictionResult = await cropService.getRecommendation({
            nitrogen: body.N,
            phosphorus: body.P,
            potassium: body.K,
            temperature: body.temperature,
            humidity: body.humidity,
            ph: body.ph,
            rainfall: body.rainfall
        });

        const recommendedCrop = predictionResult.crop;
        const analysis = predictionResult.analysis;

        // Save to database as a specialized insight if farmId is present
        if (farmId && prisma) {
            try {
                await prisma.insight.create({
                    data: {
                        farmId,
                        insight: JSON.stringify({
                            predictedCrop: recommendedCrop,
                            analysis: analysis,
                            isML: true,
                            inputs: { N: body.N, P: body.P, K: body.K, temp: body.temperature, hum: body.humidity, ph: body.ph, rain: body.rainfall }
                        }),
                        recommendation: `ML Recommended Crop: ${recommendedCrop}`,
                        riskLevel: 'good'
                    }
                });
            } catch (dbError) {
                console.error('Failed to save ML recommendation to DB:', dbError);
            }
        }

        return NextResponse.json({
            success: true,
            crop: recommendedCrop,
            analysis: analysis,
            confidence: predictionResult.confidence || 95.0,
            alternatives: predictionResult.alternatives || [],
            timestamp: new Date().toISOString(),
            model: 'ML-based (scikit-learn)'
        });
    } catch (error: any) {
        console.error('Crop recommendation error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Prediction failed' },
            { status: 500 }
        );
    }
}

