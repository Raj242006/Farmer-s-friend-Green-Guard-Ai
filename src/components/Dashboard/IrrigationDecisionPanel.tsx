'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface IrrigationDecisionPanelProps {
    irrigationNeeded: boolean;
    hoursUntilIrrigation: number | null;
    confidence?: number;            // 0–1 from irrigationRec
    farmId?: string;                // for live history
    recommendedDuration?: number;   // AI-suggested duration in minutes
    onEditSchedule?: () => void;
}

interface HistoryEntry {
    date: string;
    soilMoisture: number | null;
    label: string;
    moisture: string;
}

function formatHours(h: number): string {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

function relativeDay(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
}

const TIME_SLOTS = ['6AM', '1PM', '6PM'];

function getSimulatedHistory(): HistoryEntry[] {
    return [
        { date: '', label: 'Yesterday', soilMoisture: null, moisture: '25 min · 6AM' },
        { date: '', label: '2 days ago', soilMoisture: null, moisture: '30 min · 1PM' },
        { date: '', label: '3 days ago', soilMoisture: null, moisture: '20 min · 6AM' },
    ];
}

export default function IrrigationDecisionPanel({
    irrigationNeeded,
    hoursUntilIrrigation,
    confidence,
    farmId,
    recommendedDuration,
    onEditSchedule,
}: IrrigationDecisionPanelProps) {
    const router = useRouter();
    const [selectedTime, setSelectedTime] = useState('6AM');
    const [duration, setDuration] = useState(30);
    const [durationManuallyChanged, setDurationManuallyChanged] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Auto-set duration from AI recommendation (only if user hasn't manually changed)
    useEffect(() => {
        if (recommendedDuration !== undefined && recommendedDuration > 0 && !durationManuallyChanged) {
            const clamped = Math.min(120, Math.max(5, Math.round(recommendedDuration / 5) * 5));
            setDuration(clamped);
        }
    }, [recommendedDuration]);

    // Live data state
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [dataSource, setDataSource] = useState<'live' | 'simulated'>('simulated');

    const countdownLabel = hoursUntilIrrigation !== null
        ? formatHours(hoursUntilIrrigation)
        : irrigationNeeded ? '< 6h' : '—';

    // Fetch real history from DB
    const fetchHistory = useCallback(async () => {
        if (!farmId) return;
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/farmData/history?farmId=${farmId}&limit=10`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();

            const entries: HistoryEntry[] = (data.history || [])
                .filter((h: any) => h.soilMoisture !== null)
                .slice(-5)
                .reverse()
                .map((h: any) => ({
                    date: h.date,
                    soilMoisture: h.soilMoisture,
                    label: relativeDay(h.date),
                    moisture: `${Number(h.soilMoisture).toFixed(1)}% moisture`,
                }));

            if (entries.length > 0) {
                setHistory(entries);
                setDataSource('live');
            } else {
                setHistory(getSimulatedHistory());
                setDataSource('simulated');
            }
            setLastUpdated(new Date());
        } catch {
            setHistory(getSimulatedHistory());
            setDataSource('simulated');
        } finally {
            setHistoryLoading(false);
        }
    }, [farmId]);

    // Fetch on mount + when farmId changes
    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(fetchHistory, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchHistory]);

    const confidencePct = confidence !== undefined ? Math.round(confidence * 100) : null;
    const confidenceColor = confidencePct === null ? '#9CA3AF'
        : confidencePct >= 75 ? '#10B981'
        : confidencePct >= 50 ? '#FBBF24'
        : '#EF4444';

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            height: '100%',
        }}>
            {/* ── Title + LIVE/SIMULATED badge ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                    Irrigation Decision &amp; Schedule
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: dataSource === 'live' ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
                    border: `1px solid ${dataSource === 'live' ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
                    borderRadius: '20px',
                    padding: '2px 8px',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: dataSource === 'live' ? '#10B981' : '#F59E0B',
                    letterSpacing: '0.04em',
                }}>
                    <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: dataSource === 'live' ? '#10B981' : '#F59E0B',
                        animation: dataSource === 'live' ? 'livePulse 2s infinite' : 'none',
                        flexShrink: 0,
                        display: 'inline-block',
                    }} />
                    {dataSource === 'live' ? 'LIVE' : 'SIMULATED'}
                </div>
            </div>

            {/* ── Predicted next irrigation ── */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                        Predicted Next Irrigation
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 900,
                        color: irrigationNeeded ? '#EF4444' : '#10B981',
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                    }}>
                        {countdownLabel}
                    </div>

                    {/* AI Confidence bar */}
                    {confidencePct !== null && (
                        <div style={{ marginTop: '0.45rem' }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: '0.62rem', color: 'var(--color-text-muted)',
                                marginBottom: '3px',
                            }}>
                                <span>AI Confidence</span>
                                <span style={{ color: confidenceColor, fontWeight: 700 }}>{confidencePct}%</span>
                            </div>
                            <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${confidencePct}%`,
                                    background: confidenceColor,
                                    borderRadius: '4px',
                                    transition: 'width 0.6s ease',
                                }} />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            if (onEditSchedule) onEditSchedule();
                            else router.push('/calculator');
                        }}
                        style={{
                            marginTop: '0.5rem',
                            background: 'var(--color-primary, #10B981)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.35rem 0.9rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        Edit Schedule
                    </button>
                </div>

                {/* NO IRRIGATION / IRRIGATE badge */}
                <div style={{
                    width: '80px', height: '80px',
                    borderRadius: '16px',
                    background: irrigationNeeded
                        ? 'linear-gradient(135deg, #FEF2F2, #FCA5A5)'
                        : 'linear-gradient(135deg, #ECFDF5, #A7F3D0)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '2px', flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                    <span style={{ fontSize: '2rem' }}>{irrigationNeeded ? '💧' : '🌱'}</span>
                    <span style={{
                        fontSize: '0.52rem', fontWeight: 800,
                        color: irrigationNeeded ? '#DC2626' : '#065F46',
                        textAlign: 'center', lineHeight: 1.2, letterSpacing: '0.03em',
                    }}>
                        {irrigationNeeded ? 'IRRIGATE\nSOON' : 'NO\nIRRIGATION'}
                    </span>
                </div>
            </div>

            {/* ── Time of day ── */}
            <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Time of day
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {TIME_SLOTS.map(slot => (
                        <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            style={{
                                flex: 1, padding: '0.35rem 0', borderRadius: '8px',
                                border: selectedTime === slot
                                    ? '2px solid var(--color-primary, #10B981)'
                                    : '2px solid #E5E7EB',
                                background: selectedTime === slot
                                    ? 'var(--color-primary, #10B981)'
                                    : 'var(--color-surface-elevated, #F9FAFB)',
                                color: selectedTime === slot ? '#fff' : 'var(--color-text-muted)',
                                fontSize: '0.75rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {slot}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Duration slider ── */}
            <div>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.72rem', color: 'var(--color-text-muted)',
                    fontWeight: 600, marginBottom: '0.35rem',
                    alignItems: 'center',
                }}>
                    <span>Duration</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* AI Recommended badge */}
                        {recommendedDuration !== undefined && !durationManuallyChanged && (
                            <span style={{
                                fontSize: '0.58rem',
                                background: 'rgba(16,185,129,0.12)',
                                color: '#059669',
                                border: '1px solid rgba(16,185,129,0.3)',
                                borderRadius: '8px',
                                padding: '1px 5px',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                            }}>
                                🤖 AI
                            </span>
                        )}
                        {durationManuallyChanged && (
                            <button
                                onClick={() => {
                                    setDurationManuallyChanged(false);
                                    if (recommendedDuration) {
                                        const clamped = Math.min(120, Math.max(5, Math.round(recommendedDuration / 5) * 5));
                                        setDuration(clamped);
                                    }
                                }}
                                style={{
                                    fontSize: '0.58rem', background: 'none', border: 'none',
                                    color: '#9CA3AF', cursor: 'pointer', padding: 0,
                                    textDecoration: 'underline',
                                }}
                                title="Reset to AI recommendation"
                            >
                                reset
                            </button>
                        )}
                        <span style={{ color: 'var(--color-primary, #10B981)', fontWeight: 700 }}>{duration} min</span>
                    </div>
                </div>
                <input
                    type="range" min={5} max={120} step={5} value={duration}
                    onChange={e => {
                        setDuration(Number(e.target.value));
                        setDurationManuallyChanged(true);
                    }}
                    style={{ width: '100%', accentColor: 'var(--color-primary, #10B981)', cursor: 'pointer' }}
                />
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.65rem', color: '#D1D5DB', marginTop: '0.1rem',
                }}>
                    <span>5 min</span>
                    <span>120 min</span>
                </div>
            </div>


            {/* ── History ── */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '0.75rem' }}>
                <button
                    onClick={() => setShowHistory(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', width: '100%',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: 700,
                        color: 'var(--color-text-primary)', padding: 0,
                    }}
                >
                    <span>History</span>
                    <span style={{ color: 'var(--color-primary, #10B981)', fontSize: '1rem' }}>
                        {showHistory ? '⌃' : '›'}
                    </span>
                </button>

                {showHistory && (
                    <div style={{
                        marginTop: '0.5rem', fontSize: '0.75rem',
                        color: 'var(--color-text-muted)', display: 'flex',
                        flexDirection: 'column', gap: '0.35rem',
                    }}>
                        {historyLoading ? (
                            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#9CA3AF', fontSize: '0.7rem' }}>
                                ⏳ Loading live data...
                            </div>
                        ) : history.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#9CA3AF', fontSize: '0.7rem' }}>
                                No history available yet
                            </div>
                        ) : (
                            history.map((entry, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', padding: '0.3rem 0.5rem',
                                    background: '#F9FAFB', borderRadius: '6px',
                                }}>
                                    <span>{entry.label}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {entry.soilMoisture !== null && (
                                            <span style={{
                                                fontSize: '0.6rem',
                                                background: entry.soilMoisture < 40 ? '#FEF2F2' : '#ECFDF5',
                                                color: entry.soilMoisture < 40 ? '#DC2626' : '#065F46',
                                                borderRadius: '4px', padding: '1px 4px', fontWeight: 600,
                                            }}>
                                                💧 {Number(entry.soilMoisture).toFixed(1)}%
                                            </span>
                                        )}
                                        <span style={{ color: 'var(--color-primary, #10B981)', fontWeight: 600 }}>
                                            {entry.moisture}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Last updated */}
                        {lastUpdated && (
                            <div style={{
                                textAlign: 'right', fontSize: '0.6rem', color: '#9CA3AF',
                                marginTop: '0.15rem', display: 'flex',
                                alignItems: 'center', justifyContent: 'flex-end', gap: '4px',
                            }}>
                                <span style={{
                                    width: '5px', height: '5px', borderRadius: '50%',
                                    background: dataSource === 'live' ? '#10B981' : '#F59E0B',
                                    display: 'inline-block', flexShrink: 0,
                                }} />
                                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                {' · '}{dataSource === 'live' ? 'From database' : 'Simulated'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes livePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%       { opacity: 0.4; transform: scale(0.8); }
                }
            `}</style>
        </div>
    );
}
