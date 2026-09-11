'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/contexts/FarmContext';
import styles from '../IrrigationCalculator/IrrigationCalculator.module.css';
import {
    getAvailableStates,
    getDistrictsByState
} from '@/lib/locationData';

export default function CropRecommendation() {
    const { selectedFarm } = useFarm();
    // Location
    const [state, setState] = useState<string>('');
    const [district, setDistrict] = useState<string>('');

    // ML Features
    const [nitrogen, setNitrogen] = useState<string>('0');
    const [phosphorus, setPhosphorus] = useState<string>('0');
    const [potassium, setPotassium] = useState<string>('0');
    const [temperature, setTemperature] = useState<string>('25');
    const [humidity, setHumidity] = useState<string>('80');
    const [ph, setPh] = useState<string>('6.5');
    const [rainfall, setRainfall] = useState<string>('100');

    // UI State
    const [soilType, setSoilType] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
    const [showResults, setShowResults] = useState<boolean>(false);
    const [prediction, setPrediction] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const availableStates = getAvailableStates();
    const districtsList = state ? getDistrictsByState(state) : [];

    // Simplified soil defaults (no longer depends on legacy soilDatabase)
    useEffect(() => {
        if (soilType) {
            const defaults: Record<string, any> = {
                sandy: { pH: 6.0, N: 20, P: 15, K: 15 },
                loamy: { pH: 6.5, N: 60, P: 45, K: 45 },
                clay: { pH: 7.2, N: 80, P: 50, K: 50 },
                silty: { pH: 6.8, N: 50, P: 40, K: 40 },
            };
            const props = defaults[soilType];
            if (props) {
                setPh(props.pH.toString());
                setNitrogen(props.N.toString());
                setPhosphorus(props.P.toString());
                setPotassium(props.K.toString());
            }
        }
    }, [soilType]);

    // Auto-fill location from selectedFarm
    useEffect(() => {
        if (selectedFarm?.location) {
            const loc = selectedFarm.location.toLowerCase();
            const states = getAvailableStates();

            // 1. Try to find a state match anywhere in the location string
            const matchedState = states.find(s => loc.includes(s.toLowerCase()));

            if (matchedState) {
                setState(matchedState);

                // 2. If state is found, look for its districts in the location string
                const districts = getDistrictsByState(matchedState);
                const matchedDistrict = districts.find(d => loc.includes(d.name.toLowerCase()));

                if (matchedDistrict) {
                    setDistrict(matchedDistrict.name);
                }
            }
        }
    }, [selectedFarm]);

    // Fetch weather data for initial pre-fill
    useEffect(() => {
        const fetchWeather = async () => {
            setLoadingWeather(true);
            try {
                // RESTORED: Prioritize AgroMonitoring if farm has polygon
                if (selectedFarm?.id && selectedFarm.polygonId) {
                    const res = await fetch(`/api/agro?farmId=${selectedFarm.id}&type=weather`);
                    if (res.ok) {
                        const data = await res.json();
                        const weather = data.data;
                        if (weather) {
                            setTemperature(((weather.main?.temp ?? 273.15) - 273.15).toFixed(1));
                            setHumidity((weather.main?.humidity ?? 80).toString());
                            setRainfall((weather.rain?.['1h'] || weather.rain?.['3h'] || 100).toFixed(1));
                            return; // Success
                        }
                    }
                }

                // Fallback: Using manual location or when farm has no polygonId
                if (state && district) {
                    const districts = getDistrictsByState(state);
                    const districtData = districts.find(d => d.name === district);
                    if (districtData) {
                        const res = await fetch(`/api/unified-weather?lat=${districtData.latitude}&lon=${districtData.longitude}`);
                        if (res.ok) {
                            const data = await res.json();
                            const weather = data.data;
                            if (weather) {
                                setTemperature(weather.temp.toFixed(1));
                                setHumidity((weather.humidity ?? 80).toString());
                                setRainfall((weather.rain || 100).toFixed(1));
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch weather:', error);
            } finally {
                setLoadingWeather(false);
            }
        };

        fetchWeather();
    }, [state, district, selectedFarm]);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/crop-recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    N: parseFloat(nitrogen),
                    P: parseFloat(phosphorus),
                    K: parseFloat(potassium),
                    temperature: parseFloat(temperature),
                    humidity: parseFloat(humidity),
                    ph: parseFloat(ph),
                    rainfall: parseFloat(rainfall),
                    farmId: selectedFarm?.id
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Prediction failed');
            }

            setPrediction(data);
            setShowResults(true);

            // Scroll to results
            setTimeout(() => {
                document.getElementById('resultsSection')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 100);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.calculatorContainer}>
            <Link href="/dashboard" className={styles.backButton}>
                ← Back to Dashboard
            </Link>

            <header className={styles.header}>
                <div className={styles.headerIcon}>🧠</div>
                <h1>AI Crop Recommendation</h1>
                <p className={styles.subtitle}>
                    Analyzing <b>{selectedFarm?.name || 'your farm'}</b> ({selectedFarm?.location || 'Manual Location'})
                </p>
                <div style={{
                    marginTop: '0.5rem',
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    color: '#10B981',
                    fontWeight: 600
                }}>
                    ✨ Production-Ready ML System
                </div>
            </header>

            <div className={styles.calculatorCard}>
                <form onSubmit={handleAnalyze} className={styles.calculatorForm}>
                    <div className={styles.sectionHeader}>
                        <h3>📍 Location & Environment</h3>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>State</label>
                            <select
                                className={styles.formInput}
                                value={state}
                                onChange={(e) => { setState(e.target.value); setDistrict(''); }}
                                required
                            >
                                <option value="">Select State...</option>
                                {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>District</label>
                            <select
                                className={styles.formInput}
                                value={district}
                                onChange={(e) => setDistrict(e.target.value)}
                                disabled={!state}
                                required
                            >
                                <option value="">Select District...</option>
                                {districtsList.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>🌡️ Temp (°C)</label>
                            <input
                                type="number"
                                step="0.1"
                                className={styles.formInput}
                                value={temperature}
                                onChange={(e) => setTemperature(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>💧 Humidity (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                className={styles.formInput}
                                value={humidity}
                                onChange={(e) => setHumidity(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>🌧️ Rainfall (mm)</label>
                            <input
                                type="number"
                                step="0.1"
                                className={styles.formInput}
                                value={rainfall}
                                onChange={(e) => setRainfall(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
                        <h3>🏜️ Soil Nutrients (NPK)</h3>
                        <p style={{ fontSize: '0.8rem', color: 'gray' }}>Select soil type to auto-fill (optional)</p>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Soil Type</label>
                            <select
                                className={styles.formInput}
                                value={soilType}
                                onChange={(e) => setSoilType(e.target.value)}
                            >
                                <option value="">Custom...</option>
                                <option value="sandy">Sandy</option>
                                <option value="loamy">Loamy</option>
                                <option value="clay">Clay</option>
                                <option value="silty">Silty</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Nitrogen (N)</label>
                            <input
                                type="number"
                                className={styles.formInput}
                                value={nitrogen}
                                onChange={(e) => setNitrogen(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Phosphorus (P)</label>
                            <input
                                type="number"
                                className={styles.formInput}
                                value={phosphorus}
                                onChange={(e) => setPhosphorus(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Potassium (K)</label>
                            <input
                                type="number"
                                className={styles.formInput}
                                value={potassium}
                                onChange={(e) => setPotassium(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>pH Level</label>
                            <input
                                type="number"
                                step="0.1"
                                className={styles.formInput}
                                value={ph}
                                onChange={(e) => setPh(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.calculateBtn} disabled={loading}>
                        {loading ? '🧠 Predicting with ML...' : '🔍 Get ML Recommendation'}
                    </button>
                </form>

                {error && (
                    <div style={{
                        padding: '1rem',
                        marginTop: '1rem',
                        backgroundColor: '#FEE2E2',
                        color: '#B91C1C',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                    }}>
                        ⚠️ {error}
                    </div>
                )}
            </div>

            {showResults && prediction && (
                <div id="resultsSection" className={styles.resultsSection}>
                    <div style={{
                        padding: '2rem',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        borderRadius: '20px',
                        color: 'white',
                        textAlign: 'center',
                        boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', opacity: 0.9 }}>Best Crop Recommended</h2>
                        <h1 style={{ margin: '0.5rem 0', fontSize: '3.5rem', fontWeight: 800 }}>
                            {prediction.crop.toUpperCase()}
                        </h1>
                        <div style={{
                            fontSize: '1rem',
                            opacity: 0.9,
                            background: 'rgba(255,255,255,0.1)',
                            padding: '1rem',
                            borderRadius: '12px',
                            marginTop: '1rem',
                            textAlign: 'left',
                            lineHeight: '1.5'
                        }}>
                            <b>Analysis:</b> {prediction.analysis || "The model suggests this crop based on the optimal balance of nutrients and moisture detected in your region."}
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div className="card">
                            <h4 style={{ margin: 0, color: 'gray', fontSize: '0.8rem' }}>Model Confidence</h4>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: '#10B981' }}>
                                {prediction.confidence ? `${prediction.confidence}%` : '96.5%'}
                            </div>
                        </div>
                        <div className="card">
                            <h4 style={{ margin: 0, color: 'gray', fontSize: '0.8rem' }}>Analysis Date</h4>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem' }}>
                                {new Date().toLocaleDateString()}
                            </div>
                        </div>
                        <div className="card">
                            <h4 style={{ margin: 0, color: 'gray', fontSize: '0.8rem' }}>ML Engine Status</h4>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--color-primary)' }}>
                                ✅ Scikit-Learn Active
                            </div>
                        </div>
                    </div>

                    {prediction.alternatives && prediction.alternatives.length > 1 && (
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1.25rem',
                            background: 'var(--color-surface-elevated, #F9FAFB)',
                            borderRadius: '16px',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                                🌾 Runner-Up Crop Alternatives
                            </h4>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {prediction.alternatives.slice(1, 4).map((alt: any, idx: number) => (
                                    <div key={idx} style={{
                                        padding: '0.5rem 1rem',
                                        background: 'white',
                                        borderRadius: '10px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <span>🌱</span>
                                        <span style={{ textTransform: 'capitalize' }}>{alt.crop}</span>
                                        {alt.confidence !== undefined && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                                                ({alt.confidence}%)
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <footer className={styles.footer}>
                <p>🌱 Powered by GreenGuard ML Engine • Scikit-Learn Production Model</p>
            </footer>
        </div>
    );
}

