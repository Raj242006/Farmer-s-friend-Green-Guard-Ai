'use client';

import { useEffect, useState } from 'react';
import { IrrigationEvent } from '@/types';
import { useLocation } from '@/contexts/LocationContext';

export default function IrrigationSchedule() {
    const { lat, lon } = useLocation();
    const [schedule, setSchedule] = useState<IrrigationEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [calculatedInterval, setCalculatedInterval] = useState<string | null>(null);

    useEffect(() => {
        fetchSchedule();
        // Read calculated interval from Water Calculator
        const savedInterval = localStorage.getItem('calculatedIrrigationInterval');
        setCalculatedInterval(savedInterval);
    }, [lat, lon]);

    const fetchSchedule = async () => {
        try {
            // Try simulation-based schedule first
            if (lat && lon) {
                const simResponse = await fetch(
                    `/api/irrigation-schedule?lat=${lat}&lon=${lon}&crop=wheat&currentMoisture=42`
                );

                if (simResponse.ok) {
                    const recommendation = await simResponse.json();

                    if (recommendation.isNeeded) {
                        // Convert recommendation to IrrigationEvent format
                        const event: IrrigationEvent = {
                            id: 'sim-1',
                            scheduledTime: new Date(recommendation.scheduledDate),
                            amount: recommendation.amount,
                            status: 'scheduled',
                            method: 'Adaptive Irrigation',
                            aiRecommended: true,
                            confidenceScore: recommendation.confidence
                        };
                        setSchedule([event]);
                        setLoading(false);
                        return;
                    }
                }
            }

            // Fallback to existing API
            const response = await fetch('/api/irrigation');
            const data = await response.json();
            setSchedule(data.schedule);
        } catch (error) {
            console.error('Schedule fetch error:', error);
            // Keep empty schedule or use fallback
        } finally {
            setLoading(false);
        }
    };

    const getTimeUntil = (date: Date) => {
        const now = new Date();
        const target = new Date(date);
        const diff = target.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
        return 'Soon';
    };

    // Manual Entry State
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualEntry, setManualEntry] = useState({
        date: new Date().toISOString().slice(0, 16), // datetime-local format
        amount: '',
        method: 'Manual',
        note: ''
    });

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!manualEntry.amount || !manualEntry.date) return;

        const newEvent: IrrigationEvent = {
            id: `manual-${Date.now()}`,
            scheduledTime: new Date(manualEntry.date),
            amount: parseFloat(manualEntry.amount),
            status: 'completed', // Manual entries are usually past/done
            method: manualEntry.method,
            aiRecommended: false
        };

        // Add to top of list
        setSchedule(prev => [newEvent, ...prev]);

        // Reset and close
        setManualEntry({
            date: new Date().toISOString().slice(0, 16),
            amount: '',
            method: 'Manual',
            note: ''
        });
        setShowManualForm(false);
    };

    return (
        <div className="card-glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>Irrigation Schedule</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>AI-optimized watering</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowManualForm(!showManualForm)}
                    style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem'
                    }}
                >
                    {showManualForm ? 'Cancel' : '+ Add Manual'}
                </button>
            </div>

            {/* Manual Entry Form */}
            {showManualForm && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1.25rem',
                    background: 'var(--color-surface-elevated)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-primary-light)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--color-primary)' }}>Add Manual Irrigation</h4>
                    <form onSubmit={handleManualSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.8 }}>Date & Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="form-input"
                                    value={manualEntry.date}
                                    onChange={e => setManualEntry({ ...manualEntry, date: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #E5E7EB' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.8 }}>Amount (mm)</label>
                                <input
                                    type="number"
                                    required
                                    min="0.1"
                                    step="0.1"
                                    placeholder="e.g. 10"
                                    value={manualEntry.amount}
                                    onChange={e => setManualEntry({ ...manualEntry, amount: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #E5E7EB' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.8 }}>Method</label>
                                <select
                                    value={manualEntry.method}
                                    onChange={e => setManualEntry({ ...manualEntry, method: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #E5E7EB' }}
                                >
                                    <option value="Manual">Manual</option>
                                    <option value="Drip">Drip</option>
                                    <option value="Sprinkler">Sprinkler</option>
                                    <option value="Flood">Flood</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', opacity: 0.8 }}>Note (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Extra watering"
                                    value={manualEntry.note}
                                    onChange={e => setManualEntry({ ...manualEntry, note: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #E5E7EB' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowManualForm(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: '1px solid #E5E7EB',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Save Entry
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="skeleton" style={{ height: '200px' }} />
            ) : schedule.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                    <p>No irrigation scheduled</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {schedule.map((event, index) => (
                        <div
                            key={event.id}
                            style={{
                                padding: '1.25rem',
                                background: index === 0 ? 'var(--gradient-subtle)' : 'var(--color-surface-elevated)',
                                borderRadius: '12px',
                                border: index === 0 ? '2px solid var(--color-primary)' : 'none',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {/* AI Badge */}
                            {event.aiRecommended && (
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: 'var(--gradient-primary)',
                                    color: 'white',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '20px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600
                                }}>
                                    🤖 AI Recommended
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                {/* Icon */}
                                <div style={{
                                    fontSize: '2.5rem',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    💧
                                </div>

                                {/* Details */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                                            {event.method}
                                        </h4>
                                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                            {event.status}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                                        <div>📅 {new Date(event.scheduledTime).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'short',
                                            day: 'numeric'
                                        })}</div>
                                        <div>⏰ {new Date(event.scheduledTime).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}</div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: '1.5rem',
                                        fontSize: '0.875rem'
                                    }}>
                                        <div>
                                            <span style={{ opacity: 0.7 }}>Amount:</span>{' '}
                                            <strong style={{ color: 'var(--color-primary)' }}>{event.amount}mm</strong>
                                        </div>
                                        <div>
                                            <span style={{ opacity: 0.7 }}>Time Until:</span>{' '}
                                            <strong>{getTimeUntil(event.scheduledTime)}</strong>
                                        </div>
                                        {event.confidenceScore && (
                                            <div>
                                                <span style={{ opacity: 0.7 }}>Confidence:</span>{' '}
                                                <strong style={{ color: event.confidenceScore > 0.8 ? '#10B981' : '#FBBF24' }}>
                                                    {(event.confidenceScore * 100).toFixed(0)}%
                                                </strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar (for upcoming) */}
                            {index === 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{
                                        height: '6px',
                                        background: '#E5E7EB',
                                        borderRadius: '3px',
                                        overflow: 'hidden'
                                    }}>
                                        <div className="pulse" style={{
                                            height: '100%',
                                            width: '60%',
                                            background: 'var(--gradient-primary)',
                                            borderRadius: '3px'
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Stats */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(16, 185, 129, 0.05)',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                fontSize: '0.875rem'
            }}>
                <div>
                    <div style={{ opacity: 0.7 }}>Scheduled Events</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {schedule.length}
                    </div>
                </div>
                <div>
                    <div style={{ opacity: 0.7 }}>AI Recommended</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {schedule.filter(e => e.aiRecommended).length}
                    </div>
                </div>
            </div>

            {/* Simulation Info */}
            <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '8px',
                fontSize: '0.875rem'
            }}>
                <div style={{ opacity: 0.8 }}>
                    💡 Irrigation scheduled only when predicted moisture crosses stress threshold based on 7-day weather forecast.
                </div>
            </div>

            {/* Calculated Irrigation Interval */}
            {calculatedInterval && (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'rgba(139, 92, 246, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>⏱️</span>
                        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Calculated Irrigation Interval</div>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        Every {Math.round(parseFloat(calculatedInterval))} {Math.round(parseFloat(calculatedInterval)) === 1 ? 'day' : 'days'}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>
                        Based on FAO-56 soil water balance from Water Calculator
                    </div>
                </div>
            )}
        </div>
    );
}
