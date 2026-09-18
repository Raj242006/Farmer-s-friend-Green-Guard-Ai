'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SoilMoistureWidgetProps {
    currentMoisture: number;
    fieldCapacity: number;
    wiltingPoint: number;
    trend?: 'up' | 'down' | 'stable';
    predictions?: any[];  // 7-day forecast
    stressAnalysis?: any;  // Stress data
}

function useLiveSoilMoisture() {
    const [liveMoisture, setLiveMoisture] = useState<number | null>(null);

    useEffect(() => {
        const fetchMoisture = async () => {
            try {
                const response = await fetch('/api/iot/soil', {
                    cache: 'no-store'
                });

                if (!response.ok) return;

                const data = await response.json();

                if (typeof data.moisture === 'number') {
                    setLiveMoisture(data.moisture);
                }
            } catch (error) {
                console.error('Live soil moisture error:', error);
            }
        };

        fetchMoisture();

        const interval = setInterval(fetchMoisture, 3000);

        return () => clearInterval(interval);
    }, []);

    return liveMoisture;
}

export default function SoilMoistureWidget({
    currentMoisture,
    fieldCapacity = 70,
    wiltingPoint = 20,
    trend = 'stable',
    predictions,
    stressAnalysis
}: SoilMoistureWidgetProps) {
    const liveMoisture = useLiveSoilMoisture();
    const displayedMoisture = liveMoisture ?? currentMoisture;
    const getTrendEmoji = () => {
        if (trend === 'up') return '📈';
        if (trend === 'down') return '📉';
        return '➡️';
    };

    const getStatusColor = () => {
        if (displayedMoisture < 30) return '#EF4444';
        if (displayedMoisture < 40) return '#F97316';
        if (displayedMoisture > 65) return '#3B82F6';
        return '#10B981';
    };

    const getStatusText = () => {
        if (displayedMoisture < 30) return 'Critical';
        if (displayedMoisture < 40) return 'Low';
        if (displayedMoisture > 65) return 'High';
        return 'Optimal';
    };

    const percentage = ((displayedMoisture - wiltingPoint) / (fieldCapacity - wiltingPoint)) * 100;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    const getStressRGB = (status: string) => {
        if (status === 'optimal') return '16, 185, 129';
        if (status === 'mild_stress') return '251, 191, 36';
        if (status === 'moderate_stress') return '249, 115, 22';
        return '239, 68, 68';
    };

    return (
        <div className="card-glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>Soil Moisture</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>Real-time monitoring</p>
                </div>
                <div className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                    Live
                </div>
            </div>

            {/* Main Display */}
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{
                        fontSize: '4rem',
                        fontWeight: 800,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: 1
                    }}
                >
                    {displayedMoisture.toFixed(1)}%
                </motion.div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>{getTrendEmoji()}</span>
                    <span style={{
                        color: getStatusColor(),
                        fontWeight: 600,
                        fontSize: '1.1rem'
                    }}>
                        {getStatusText()}
                    </span>
                </div>
            </div>

            {/* Visual Progress Bar */}
            <div style={{
                position: 'relative',
                height: '80px',
                background: '#E5E7EB',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '1rem'
            }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedPercentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{
                        height: '100%',
                        background: 'var(--gradient-primary)',
                        borderRadius: '12px',
                        position: 'relative'
                    }}
                >
                    {/* Water Droplet Animation */}
                    <div style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '2rem',
                        animation: 'pulse 2s infinite'
                    }}>
                        💧
                    </div>
                </motion.div>

                {/* Range Markers */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    pointerEvents: 'none'
                }}>
                    <span style={{ position: 'absolute', left: '5px', color: '#EF4444' }}>
                        {wiltingPoint}%
                    </span>
                    <span style={{ position: 'absolute', right: '5px', color: '#047857' }}>
                        {fieldCapacity}%
                    </span>
                </div>
            </div>

            {/* Status Indicators */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                fontSize: '0.875rem'
            }}>
                <div style={{
                    padding: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#EF4444', fontWeight: 600 }}>≤{wiltingPoint}%</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Wilting</div>
                </div>
                <div style={{
                    padding: '0.5rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#10B981', fontWeight: 600 }}>30-65%</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Optimal</div>
                </div>
                <div style={{
                    padding: '0.5rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#3B82F6', fontWeight: 600 }}>{fieldCapacity}%</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Field Cap.</div>
                </div>
            </div>

            {/* 7-Day Forecast */}
            {predictions && predictions.length > 1 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.8 }}>
                        7-Day Moisture Forecast
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
                        {predictions.slice(0, 7).map((pred, i) => (
                            <div key={i} style={{
                                flex: '1 0 auto',
                                minWidth: '60px',
                                textAlign: 'center',
                                padding: '0.5rem',
                                background: i === 0 ? 'rgba(16, 185, 129, 0.1)' : '#F9FAFB',
                                borderRadius: '8px',
                                fontSize: '0.75rem'
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                    {i === 0 ? 'Today' : `+${i}d`}
                                </div>
                                <div style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: pred.moisture < 25 ? '#EF4444' : '#10B981'
                                }}>
                                    {pred.moisture.toFixed(0)}%
                                </div>
                                {pred.rainfall > 0 && (
                                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                        🌧️ {pred.rainfall}mm
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stress Index Indicator */}
            {stressAnalysis && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: `rgba(${getStressRGB(stressAnalysis.status)}, 0.1)`,
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        Stress Index: {(stressAnalysis.stressIndex * 100).toFixed(0)}/100
                    </div>
                    <div style={{ opacity: 0.8 }}>
                        {stressAnalysis.description}
                    </div>
                </div>
            )}

            {/* How Irrigation Decision Works */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#047857',
                fontSize: '0.875rem',
                lineHeight: 1.5
            }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#047857' }}>
                    How Irrigation Decision Works
                </h4>
                <p>Soil works like a water bucket. Moisture decreases due to evapotranspiration (ET), while rain or irrigation increases moisture.</p>
                <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                    <li>If moisture &lt; threshold → irrigation needed</li>
                    <li>If moisture optimal → no irrigation</li>
                </ul>
                <p>Formula:</p>
                <pre style={{
                    background: '#E5E7EB',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    overflowX: 'auto'
                }}>
                    SM(t) = SM(t−1) + Rain + Irrigation − ET
                    ET = ET₀ × Kc
                </pre>
            </div>
        </div>
    );
}
