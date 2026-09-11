'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Dashboard/Sidebar';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import { useFarm } from '@/contexts/FarmContext';
import styles from '../dashboard/dashboard.module.css';

type SettingsTab = 'farm' | 'profile' | 'irrigation' | 'notifications' | 'system';

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { farms, selectedFarm, selectFarm, refreshFarms } = useFarm();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    const [activeTab, setActiveTab] = useState<SettingsTab>('farm');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // User Profile state
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userRole, setUserRole] = useState('FARMER');
    const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);

    // Farm Details state
    const [farmName, setFarmName] = useState('');
    const [farmLocation, setFarmLocation] = useState('');

    // Irrigation Preferences state
    const [irrigationMode, setIrrigationMode] = useState('ai_automated');
    const [irrigationMethod, setIrrigationMethod] = useState('drip');
    const [moistureThreshold, setMoistureThreshold] = useState(28);
    const [rainDelay, setRainDelay] = useState(true);
    const [preferredWindow, setPreferredWindow] = useState('morning');

    // Notification Preferences state
    const [phone, setPhone] = useState('');
    const [alertEmail, setAlertEmail] = useState('');
    const [whatsappAlerts, setWhatsappAlerts] = useState(true);
    const [testingAlert, setTestingAlert] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        smsAlerts: true,
        whatsappAlerts: true,
        dailySummary: false,
        weatherAlerts: true,
    });

    // Display & Units state
    const [tempUnit, setTempUnit] = useState('celsius');
    const [areaUnit, setAreaUnit] = useState('hectares');
    const [language, setLanguage] = useState('en');

    // System Status state
    const [systemStatus, setSystemStatus] = useState({
        geminiModel: 'gemini-3.6-flash',
        geminiStatus: true,
        agroStatus: true,
        mlModelStatus: true,
    });

    // Load initial settings and user info
    useEffect(() => {
        const fetchSettingsData = async () => {
            setLoading(true);
            try {
                // Check localStorage first
                const localPhone = localStorage.getItem('greenguard_farmer_phone') || '';
                const localEmail = localStorage.getItem('greenguard_alert_email') || '';
                if (localPhone) setPhone(localPhone);
                if (localEmail) setAlertEmail(localEmail);

                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setUserName(data.user.name || '');
                        setUserEmail(data.user.email || '');
                        setUserRole(data.user.role || 'FARMER');
                        setUserCreatedAt(data.user.createdAt || null);
                        setAlertEmail(prev => prev || data.user.email || '');
                    }
                    if (data.settings) {
                        if (data.settings.notifications) {
                            setNotifications(data.settings.notifications);
                            if (data.settings.notifications.phone) setPhone(data.settings.notifications.phone);
                            if (data.settings.notifications.alertEmail) setAlertEmail(data.settings.notifications.alertEmail);
                            if (data.settings.notifications.whatsappAlerts !== undefined) setWhatsappAlerts(data.settings.notifications.whatsappAlerts);
                        }
                        if (data.settings.irrigation) {
                            setIrrigationMode(data.settings.irrigation.mode || 'ai_automated');
                            setIrrigationMethod(data.settings.irrigation.method || 'drip');
                            setMoistureThreshold(data.settings.irrigation.moistureThreshold || 28);
                            setRainDelay(data.settings.irrigation.rainDelay ?? true);
                            setPreferredWindow(data.settings.irrigation.preferredWindow || 'morning');
                        }
                        if (data.settings.display) {
                            setTempUnit(data.settings.display.tempUnit || 'celsius');
                            setAreaUnit(data.settings.display.areaUnit || 'hectares');
                            setLanguage(data.settings.display.language || 'en');
                        }
                        if (data.settings.system) {
                            setSystemStatus(data.settings.system);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettingsData();
    }, []);

    // Sync selected farm state when changed
    useEffect(() => {
        if (selectedFarm) {
            setFarmName(selectedFarm.name || '');
            setFarmLocation(selectedFarm.location || '');
        }
    }, [selectedFarm]);

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setErrorMsg('');
        setTimeout(() => setSuccessMsg(''), 4000);
    };

    const showError = (msg: string) => {
        setErrorMsg(msg);
        setSuccessMsg('');
        setTimeout(() => setErrorMsg(''), 5000);
    };

    // Save Farm Details
    const handleSaveFarm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFarm?.id) {
            showError('Please select a farm first');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/farms/${selectedFarm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: farmName.trim(),
                    location: farmLocation.trim(),
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update farm');
            }

            await refreshFarms();
            showSuccess(`Farm "${farmName}" updated successfully!`);
        } catch (err: any) {
            showError(err.message || 'Failed to save farm changes');
        } finally {
            setSaving(false);
        }
    };

    // Save User Profile
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/user/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: userName.trim() }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update profile');
            }

            showSuccess('Profile name updated successfully!');
        } catch (err: any) {
            showError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // Save System / Irrigation Preferences
    const handleSavePreferences = async () => {
        setSaving(true);
        try {
            const payload = {
                notifications: {
                    ...notifications,
                    phone: phone.trim(),
                    alertEmail: (alertEmail || userEmail).trim(),
                    whatsappAlerts,
                },
                irrigation: {
                    mode: irrigationMode,
                    method: irrigationMethod,
                    moistureThreshold,
                    rainDelay,
                    preferredWindow,
                },
                display: {
                    tempUnit,
                    areaUnit,
                    language,
                }
            };

            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save settings');
            }

            // Mirror to localStorage
            localStorage.setItem('greenguard_irrigation_mode', irrigationMode);
            localStorage.setItem('greenguard_moisture_threshold', moistureThreshold.toString());
            localStorage.setItem('greenguard_farmer_phone', phone.trim());
            localStorage.setItem('greenguard_alert_email', (alertEmail || userEmail).trim());

            showSuccess('Settings & notification destinations saved successfully!');
        } catch (err: any) {
            showError(err.message || 'Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    // Send Live Test Alert across channels
    const handleSendTestAlert = async (channel: 'all' | 'email' | 'sms' | 'whatsapp') => {
        const destEmail = (alertEmail || userEmail || '').trim();
        const destPhone = phone.trim();

        if (channel === 'email' && !destEmail) {
            showError('Please enter an alert email address');
            return;
        }

        if ((channel === 'sms' || channel === 'whatsapp') && !destPhone) {
            showError('Please enter a mobile phone number for SMS/WhatsApp');
            return;
        }

        if (channel === 'all' && !destEmail && !destPhone) {
            showError('Please enter either an email or mobile phone number to test');
            return;
        }

        setTestingAlert(true);
        setTestResult(null);

        try {
            const channels = {
                email: channel === 'all' || channel === 'email',
                sms: channel === 'all' || channel === 'sms',
                whatsapp: channel === 'all' || channel === 'whatsapp',
            };

            const res = await fetch('/api/alerts/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: destEmail,
                    phone: destPhone,
                    channels,
                    alert: {
                        id: `test-${Date.now()}`,
                        timestamp: new Date(),
                        type: 'irrigation_due',
                        severity: 'high',
                        severityScore: 85,
                        title: `GreenGuard AI: Low Soil Moisture Alert (${farmName || 'Field 1'})`,
                        message: `Soil moisture dropped to 22% (Below ${moistureThreshold}% threshold). Run drip irrigation for 35 minutes before 8 AM.`,
                        actionRequired: true,
                        read: false,
                    }
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to dispatch test notification');

            setTestResult(data.result);
            showSuccess(`Test notification triggered across requested channels!`);

            if (channel === 'whatsapp' && data.result?.whatsappUrl) {
                window.open(data.result.whatsappUrl, '_blank');
            }
        } catch (err: any) {
            showError(err.message || 'Error sending test alert');
        } finally {
            setTestingAlert(false);
        }
    };

    // Export Farm Telemetry Data
    const handleExportData = () => {
        if (!selectedFarm) return;
        const exportObj = {
            farm: selectedFarm,
            exportedAt: new Date().toISOString(),
            irrigationSettings: {
                mode: irrigationMode,
                method: irrigationMethod,
                moistureThreshold: `${moistureThreshold}%`,
                preferredWindow,
            },
            notifications,
            systemHealth: systemStatus,
        };

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `${selectedFarm.name.replace(/\s+/g, '_')}_telemetry.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showSuccess('Farm configuration downloaded!');
    };

    // Clear Cache
    const handleClearCache = () => {
        localStorage.removeItem('calculatedIrrigationInterval');
        localStorage.removeItem('calculationTimestamp');
        showSuccess('Telemetry cache cleared! Data will freshly sync.');
    };

    return (
        <div className={styles.dashboardLayout}>
            <Sidebar />
            <div className={styles.mainContent}>
                <DashboardHeader userName={userName || session?.user?.name || 'Farmer'} />
                <main className={styles.contentArea}>
                    {/* Header */}
                    <div className={styles.pageHeader}>
                        <div>
                            <h2 className={styles.pageTitle}>⚙️ Settings & Farm Configuration</h2>
                            <p className={styles.pageSubtitle}>
                                Manage your farm details, irrigation automation thresholds, and profile settings
                            </p>
                        </div>
                        {selectedFarm && (
                            <div className={styles.farmSwitcher}>
                                <span className={styles.farmSwitcherLabel}>Active Farm:</span>
                                <select
                                    className={styles.farmSelect}
                                    value={selectedFarm.id}
                                    onChange={(e) => selectFarm(e.target.value)}
                                >
                                    {farms.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            🌾 {f.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Feedback Banners */}
                    {successMsg && (
                        <div style={{
                            padding: '1rem 1.25rem',
                            marginBottom: '1.5rem',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid #10B981',
                            color: '#065F46',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            animation: 'fadeIn 0.3s ease',
                        }}>
                            <span style={{ fontSize: '1.25rem' }}>✅</span>
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {errorMsg && (
                        <div style={{
                            padding: '1rem 1.25rem',
                            marginBottom: '1.5rem',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid #EF4444',
                            color: '#991B1B',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                        }}>
                            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                        paddingBottom: '0.5rem',
                        flexWrap: 'wrap',
                    }}>
                        {[
                            { id: 'farm', label: '🌾 Farm Details', icon: '🌾' },
                            { id: 'profile', label: '👤 User Profile', icon: '👤' },
                            { id: 'irrigation', label: '💧 Irrigation & Thresholds', icon: '💧' },
                            { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
                            { id: 'system', label: '🤖 AI & Integrations', icon: '🤖' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as SettingsTab)}
                                style={{
                                    padding: '0.6rem 1.1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: activeTab === t.id ? 'var(--color-primary, #10B981)' : 'transparent',
                                    color: activeTab === t.id ? 'white' : 'var(--color-text-primary, #374151)',
                                    fontWeight: activeTab === t.id ? 700 : 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />
                    ) : (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {/* TAB 1: FARM DETAILS */}
                            {activeTab === 'farm' && (
                                <div className="card" style={{ padding: '1.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                                🌾 Active Farm Details
                                            </h3>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                Edit farm name, geographic coordinates, and satellite monitoring parameters
                                            </p>
                                        </div>
                                        {selectedFarm?.polygonId ? (
                                            <span style={{
                                                padding: '0.35rem 0.8rem',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10B981',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}>
                                                🛰️ Satellite Sync Active
                                            </span>
                                        ) : (
                                            <span style={{
                                                padding: '0.35rem 0.8rem',
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                color: '#D97706',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}>
                                                ⚠️ No Satellite Polygon
                                            </span>
                                        )}
                                    </div>

                                    {selectedFarm ? (
                                        <form onSubmit={handleSaveFarm} style={{ display: 'grid', gap: '1.25rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                        Farm Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={farmName}
                                                        onChange={(e) => setFarmName(e.target.value)}
                                                        required
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem 1rem',
                                                            borderRadius: '10px',
                                                            border: '1px solid var(--color-border, #E5E7EB)',
                                                            fontSize: '0.95rem',
                                                        }}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                        Location / Region
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={farmLocation}
                                                        onChange={(e) => setFarmLocation(e.target.value)}
                                                        required
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem 1rem',
                                                            borderRadius: '10px',
                                                            border: '1px solid var(--color-border, #E5E7EB)',
                                                            fontSize: '0.95rem',
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Read-Only Metadata */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                gap: '1rem',
                                                padding: '1rem',
                                                background: 'var(--color-surface-elevated, #F9FAFB)',
                                                borderRadius: '12px',
                                            }}>
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                        Farm ID
                                                    </span>
                                                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                                        {selectedFarm.id}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                        Agro Polygon ID
                                                    </span>
                                                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                                        {selectedFarm.polygonId || 'None registered'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                        Monitored Area
                                                    </span>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem' }}>
                                                        {selectedFarm.areaHa ? `${selectedFarm.areaHa.toFixed(2)} Hectares` : 'Auto-detected'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    style={{
                                                        padding: '0.75rem 1.75rem',
                                                        borderRadius: '10px',
                                                        background: 'var(--gradient-primary, linear-gradient(135deg, #10B981, #059669))',
                                                        color: 'white',
                                                        border: 'none',
                                                        fontWeight: 600,
                                                        cursor: saving ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    {saving ? '⏳ Saving...' : '💾 Save Farm Details'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleExportData}
                                                    style={{
                                                        padding: '0.75rem 1.25rem',
                                                        borderRadius: '10px',
                                                        background: 'transparent',
                                                        border: '1px solid var(--color-border, #D1D5DB)',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    📥 Export Farm JSON
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <p style={{ color: 'var(--color-text-muted)' }}>No farm found. Please add a farm first.</p>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: USER PROFILE */}
                            {activeTab === 'profile' && (
                                <div className="card" style={{ padding: '1.75rem' }}>
                                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                        👤 Farmer Profile & Security
                                    </h3>
                                    <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '1.25rem', maxWidth: '650px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={userName}
                                                onChange={(e) => setUserName(e.target.value)}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--color-border, #E5E7EB)',
                                                    fontSize: '0.95rem',
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                Email Address (Read-Only)
                                            </label>
                                            <input
                                                type="email"
                                                value={userEmail}
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--color-border, #E5E7EB)',
                                                    background: 'var(--color-surface-elevated, #F3F4F6)',
                                                    color: 'var(--color-text-muted, #6B7280)',
                                                    fontSize: '0.95rem',
                                                    cursor: 'not-allowed',
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: '180px' }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    Account Role
                                                </label>
                                                <div style={{
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '10px',
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    color: '#065F46',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem'
                                                }}>
                                                    🌾 {userRole}
                                                </div>
                                            </div>

                                            <div style={{ flex: 1, minWidth: '180px' }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    Member Since
                                                </label>
                                                <div style={{
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '10px',
                                                    background: 'var(--color-surface-elevated, #F9FAFB)',
                                                    color: 'var(--color-text-primary)',
                                                    fontWeight: 600,
                                                    fontSize: '0.9rem'
                                                }}>
                                                    📅 {userCreatedAt ? new Date(userCreatedAt).toLocaleDateString() : 'Active'}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={saving}
                                            style={{
                                                padding: '0.75rem 1.75rem',
                                                borderRadius: '10px',
                                                background: 'var(--gradient-primary, linear-gradient(135deg, #10B981, #059669))',
                                                color: 'white',
                                                border: 'none',
                                                fontWeight: 600,
                                                cursor: saving ? 'not-allowed' : 'pointer',
                                                width: 'fit-content',
                                                marginTop: '0.5rem',
                                            }}
                                        >
                                            {saving ? '⏳ Updating...' : '💾 Update Profile Name'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* TAB 3: IRRIGATION & THRESHOLDS */}
                            {activeTab === 'irrigation' && (
                                <div className="card" style={{ padding: '1.75rem' }}>
                                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                        💧 Irrigation Automation & Soil Thresholds
                                    </h3>

                                    <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '750px' }}>
                                        {/* Automation Mode */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
                                                Operation Mode
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                                                <div
                                                    onClick={() => setIrrigationMode('ai_automated')}
                                                    style={{
                                                        padding: '1rem',
                                                        borderRadius: '12px',
                                                        border: `2px solid ${irrigationMode === 'ai_automated' ? 'var(--color-primary, #10B981)' : '#E5E7EB'}`,
                                                        background: irrigationMode === 'ai_automated' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                                                        🤖 AI-Automated Mode
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                        App calculates optimum duration and interval using FAO-56 and triggers alerts automatically.
                                                    </p>
                                                </div>

                                                <div
                                                    onClick={() => setIrrigationMode('manual_approval')}
                                                    style={{
                                                        padding: '1rem',
                                                        borderRadius: '12px',
                                                        border: `2px solid ${irrigationMode === 'manual_approval' ? 'var(--color-primary, #10B981)' : '#E5E7EB'}`,
                                                        background: irrigationMode === 'manual_approval' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                                                        👨‍🌾 Manual Farmer Approval
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                        AI suggests durations, but requires farmer confirmation before scheduling any valve operation.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delivery Method & Preferred Window */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    Irrigation Method
                                                </label>
                                                <select
                                                    value={irrigationMethod}
                                                    onChange={(e) => setIrrigationMethod(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem',
                                                        borderRadius: '10px',
                                                        border: '1px solid var(--color-border, #E5E7EB)',
                                                        fontSize: '0.95rem',
                                                    }}
                                                >
                                                    <option value="drip">💧 Drip Irrigation (90% Efficiency)</option>
                                                    <option value="sprinkler">🚿 Sprinkler System (75% Efficiency)</option>
                                                    <option value="surface">🌊 Surface / Furrow (60% Efficiency)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    Preferred Irrigation Window
                                                </label>
                                                <select
                                                    value={preferredWindow}
                                                    onChange={(e) => setPreferredWindow(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem',
                                                        borderRadius: '10px',
                                                        border: '1px solid var(--color-border, #E5E7EB)',
                                                        fontSize: '0.95rem',
                                                    }}
                                                >
                                                    <option value="morning">🌅 Early Morning (5:30 AM - 8:30 AM)</option>
                                                    <option value="evening">🌇 Late Evening (5:30 PM - 8:00 PM)</option>
                                                    <option value="night">🌙 Night (10:00 PM - 3:00 AM)</option>
                                                    <option value="anytime">⚡ Any Time When Needed</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Moisture Threshold Slider */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                    Low Moisture Alert Trigger Threshold
                                                </label>
                                                <span style={{ fontWeight: 700, color: 'var(--color-primary, #10B981)' }}>
                                                    {moistureThreshold}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="15"
                                                max="45"
                                                step="1"
                                                value={moistureThreshold}
                                                onChange={(e) => setMoistureThreshold(parseInt(e.target.value))}
                                                style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                <span>15% (Extreme Dry)</span>
                                                <span>28% (Standard Recommended)</span>
                                                <span>45% (High Moisture)</span>
                                            </div>
                                        </div>

                                        {/* Rain Delay Toggle */}
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '1rem',
                                            borderRadius: '10px',
                                            background: 'var(--color-surface-elevated, #F9FAFB)',
                                            cursor: 'pointer'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                                    🌧️ Automatic Rain Lockout
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    Automatically suspend irrigation if &gt;5mm rainfall is forecasted within next 24 hours.
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={rainDelay}
                                                onChange={(e) => setRainDelay(e.target.checked)}
                                                style={{ width: '20px', height: '20px', accentColor: '#10B981' }}
                                            />
                                        </label>

                                        <button
                                            onClick={handleSavePreferences}
                                            disabled={saving}
                                            style={{
                                                padding: '0.75rem 1.75rem',
                                                borderRadius: '10px',
                                                background: 'var(--gradient-primary, linear-gradient(135deg, #10B981, #059669))',
                                                color: 'white',
                                                border: 'none',
                                                fontWeight: 600,
                                                cursor: saving ? 'not-allowed' : 'pointer',
                                                width: 'fit-content',
                                            }}
                                        >
                                            {saving ? '⏳ Saving...' : '💾 Save Irrigation Preferences'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: NOTIFICATIONS & ALERT SYSTEM */}
                            {activeTab === 'notifications' && (
                                <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '850px' }}>
                                    {/* Destination Channels Card */}
                                    <div className="card" style={{ padding: '1.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                                    📲 Alert Notification Recipients & Channels
                                                </h3>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    Configure your mobile number and email to receive instantaneous drought warnings, soil moisture drops, and weather shock alerts.
                                                </p>
                                            </div>
                                            <span style={{
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: 'rgba(16, 185, 129, 0.12)',
                                                color: '#10B981',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                            }}>
                                                ● Multi-Channel Active
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                            {/* Mobile Phone Number Input */}
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    📱 Mobile Phone Number (SMS & WhatsApp)
                                                </label>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        placeholder="+91 9876543210"
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.75rem 1rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(0,0,0,0.15)',
                                                            fontSize: '0.95rem',
                                                            background: 'var(--color-surface, #FFFFFF)',
                                                            color: 'var(--color-text-primary)',
                                                        }}
                                                    />
                                                </div>
                                                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    Supports 10-digit Indian numbers or international format (e.g. +91 9876543210).
                                                </p>
                                            </div>

                                            {/* Alert Email Address Input */}
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    📧 Alert Notification Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={alertEmail}
                                                    onChange={(e) => setAlertEmail(e.target.value)}
                                                    placeholder="farmer@example.com"
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 1rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(0,0,0,0.15)',
                                                        fontSize: '0.95rem',
                                                        background: 'var(--color-surface, #FFFFFF)',
                                                        color: 'var(--color-text-primary)',
                                                    }}
                                                />
                                                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    Receives high-priority HTML alerts with soil telemetry and actionable steps.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Alert Channels Selection */}
                                    <div className="card" style={{ padding: '1.75rem' }}>
                                        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                            🔔 Enabled Notification Types
                                        </h3>

                                        <div style={{ display: 'grid', gap: '0.85rem' }}>
                                            {[
                                                {
                                                    key: 'emailAlerts',
                                                    icon: '📧',
                                                    title: 'Email Notifications for Critical Farm Alerts',
                                                    desc: 'Dispatches instant detailed HTML alerts whenever soil moisture drops below threshold or extreme drought is forecast.',
                                                    value: notifications.emailAlerts,
                                                    toggle: (v: boolean) => setNotifications({ ...notifications, emailAlerts: v }),
                                                },
                                                {
                                                    key: 'smsAlerts',
                                                    icon: '📱',
                                                    title: 'SMS Alerts to Mobile Phone',
                                                    desc: 'Urgent mobile SMS sent directly to your phone when severe heatwaves (>38°C) or critical soil dehydration occurs.',
                                                    value: notifications.smsAlerts,
                                                    toggle: (v: boolean) => setNotifications({ ...notifications, smsAlerts: v }),
                                                },
                                                {
                                                    key: 'whatsappAlerts',
                                                    icon: '💬',
                                                    title: 'WhatsApp Advisory Alerts',
                                                    desc: 'Instant 1-click WhatsApp alerts formatted with actionable irrigation run times and emergency recommendations.',
                                                    value: whatsappAlerts,
                                                    toggle: (v: boolean) => {
                                                        setWhatsappAlerts(v);
                                                        setNotifications({ ...notifications, whatsappAlerts: v });
                                                    },
                                                },
                                                {
                                                    key: 'weatherAlerts',
                                                    icon: '🌤️',
                                                    title: 'Live AgroMonitoring Satellite & Storm Sync',
                                                    desc: 'Notifications when fresh satellite passes detect NDVI vigor drops or rain events delay scheduled irrigation.',
                                                    value: notifications.weatherAlerts,
                                                    toggle: (v: boolean) => setNotifications({ ...notifications, weatherAlerts: v }),
                                                },
                                                {
                                                    key: 'dailySummary',
                                                    icon: '📊',
                                                    title: 'Morning 7:00 AM Farm Briefing',
                                                    desc: 'Daily digest summarizing moisture depletion, yesterday ETc loss, and today recommended run time.',
                                                    value: notifications.dailySummary,
                                                    toggle: (v: boolean) => setNotifications({ ...notifications, dailySummary: v }),
                                                },
                                            ].map((item) => (
                                                <label
                                                    key={item.key}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '1rem',
                                                        padding: '1rem',
                                                        borderRadius: '10px',
                                                        background: item.value ? 'rgba(16, 185, 129, 0.04)' : 'var(--color-surface-elevated, #F9FAFB)',
                                                        cursor: 'pointer',
                                                        border: item.value ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(0,0,0,0.05)',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={item.value}
                                                        onChange={(e) => item.toggle(e.target.checked)}
                                                        style={{ width: '20px', height: '20px', accentColor: '#10B981', marginTop: '0.2rem', cursor: 'pointer' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                                                            {item.icon} {item.title}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', lineHeight: '1.4' }}>
                                                            {item.desc}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>

                                        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={handleSavePreferences}
                                                disabled={saving}
                                                style={{
                                                    padding: '0.75rem 1.75rem',
                                                    borderRadius: '10px',
                                                    background: 'var(--gradient-primary, linear-gradient(135deg, #10B981, #059669))',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontWeight: 600,
                                                    cursor: saving ? 'not-allowed' : 'pointer',
                                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                                }}
                                            >
                                                {saving ? '⏳ Saving...' : '💾 Save Notification Settings'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Test Alert Dispatcher Section */}
                                    <div className="card" style={{ padding: '1.75rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text-primary)' }}>
                                                    🚀 Live Alert Dispatcher (Instant Test)
                                                </h3>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    Send a real test alert right now to your email and mobile phone to verify notification delivery.
                                                </p>
                                            </div>
                                            {testingAlert && (
                                                <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>
                                                    ⏳ Dispatching test alert...
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                            <button
                                                onClick={() => handleSendTestAlert('email')}
                                                disabled={testingAlert}
                                                style={{
                                                    padding: '0.6rem 1.15rem',
                                                    borderRadius: '8px',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    color: '#2563EB',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    cursor: testingAlert ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                📧 Test Email Alert
                                            </button>
                                            <button
                                                onClick={() => handleSendTestAlert('sms')}
                                                disabled={testingAlert}
                                                style={{
                                                    padding: '0.6rem 1.15rem',
                                                    borderRadius: '8px',
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                                    color: '#D97706',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    cursor: testingAlert ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                📱 Test Mobile SMS
                                            </button>
                                            <button
                                                onClick={() => handleSendTestAlert('whatsapp')}
                                                disabled={testingAlert}
                                                style={{
                                                    padding: '0.6rem 1.15rem',
                                                    borderRadius: '8px',
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                                    color: '#059669',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    cursor: testingAlert ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                💬 Test WhatsApp Alert
                                            </button>
                                            <button
                                                onClick={() => handleSendTestAlert('all')}
                                                disabled={testingAlert}
                                                style={{
                                                    padding: '0.6rem 1.25rem',
                                                    borderRadius: '8px',
                                                    background: 'var(--gradient-primary, linear-gradient(135deg, #10B981, #059669))',
                                                    border: 'none',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    cursor: testingAlert ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                🚀 Dispatch All Channels
                                            </button>
                                        </div>

                                        {/* Test Result Feedback Box */}
                                        {testResult && (
                                            <div style={{
                                                padding: '1rem',
                                                borderRadius: '10px',
                                                background: 'var(--color-surface-elevated, #F8FAFC)',
                                                border: '1px solid rgba(0,0,0,0.08)',
                                                marginTop: '0.5rem',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#10B981' }}>
                                                        ✓ Dispatch Report (Processed at {new Date(testResult.dispatchedAt).toLocaleTimeString()})
                                                    </span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                                                    {/* Email status */}
                                                    <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                                                        <div style={{ fontWeight: 600, color: '#2563EB' }}>📧 Email Channel</div>
                                                        <div>Status: <strong>{testResult.email?.status || 'N/A'}</strong></div>
                                                        {testResult.email?.recipient && <div style={{ color: 'var(--color-text-muted)' }}>To: {testResult.email.recipient}</div>}
                                                    </div>

                                                    {/* SMS status */}
                                                    <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                                                        <div style={{ fontWeight: 600, color: '#D97706' }}>📱 SMS Channel</div>
                                                        <div>Status: <strong>{testResult.sms?.status || 'N/A'}</strong></div>
                                                        {testResult.sms?.provider && <div style={{ color: 'var(--color-text-muted)' }}>Provider: {testResult.sms.provider}</div>}
                                                        {testResult.sms?.to && <div style={{ color: 'var(--color-text-muted)' }}>To: {testResult.sms.to}</div>}
                                                    </div>

                                                    {/* WhatsApp status */}
                                                    <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                                        <div style={{ fontWeight: 600, color: '#059669' }}>💬 WhatsApp Channel</div>
                                                        <div>Status: <strong>{testResult.whatsapp?.status || 'N/A'}</strong></div>
                                                        {testResult.whatsapp?.url && (
                                                            <a
                                                                href={testResult.whatsapp.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: '#10B981', fontWeight: 600, textDecoration: 'underline', display: 'inline-block', marginTop: '0.2rem' }}
                                                            >
                                                                👉 Open Chat in WhatsApp
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Gateway Notes */}
                                        <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.1)', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                                            ℹ️ <strong>Telecom Gateway Integration:</strong> The system automatically formats and delivers via Fast2SMS / Twilio APIs when configured in environment variables. For zero-config instant mobile delivery, the WhatsApp channel opens pre-composed alert advisories directly with the farmer number.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 5: AI & SYSTEM STATUS */}
                            {activeTab === 'system' && (
                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    <div className="card" style={{ padding: '1.75rem' }}>
                                        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                            🤖 Connected AI Services & System Telemetry
                                        </h3>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                                            <div style={{
                                                padding: '1.25rem',
                                                borderRadius: '12px',
                                                background: 'rgba(16, 185, 129, 0.05)',
                                                border: '1px solid rgba(16, 185, 129, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '1.5rem' }}>✨</span>
                                                    <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.8rem' }}>● OPERATIONAL</span>
                                                </div>
                                                <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1rem' }}>Google Gemini AI</h4>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    Model: <code>gemini-3.6-flash</code> (with <code>gemini-flash-latest</code> fallback)
                                                </p>
                                            </div>

                                            <div style={{
                                                padding: '1.25rem',
                                                borderRadius: '12px',
                                                background: 'rgba(59, 130, 246, 0.05)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '1.5rem' }}>🧠</span>
                                                    <span style={{ color: '#3B82F6', fontWeight: 700, fontSize: '0.8rem' }}>● ACTIVE</span>
                                                </div>
                                                <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1rem' }}>Scikit-Learn ML Model</h4>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    Crop recommendation classifier loaded &amp; predicting with 99% accuracy.
                                                </p>
                                            </div>

                                            <div style={{
                                                padding: '1.25rem',
                                                borderRadius: '12px',
                                                background: 'rgba(139, 92, 246, 0.05)',
                                                border: '1px solid rgba(139, 92, 246, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '1.5rem' }}>🛰️</span>
                                                    <span style={{ color: '#8B5CF6', fontWeight: 700, fontSize: '0.8rem' }}>● SYNCED</span>
                                                </div>
                                                <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1rem' }}>AgroMonitoring Sentinel</h4>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    High-resolution NDVI satellite telemetry &amp; live weather stations.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Data Management Actions */}
                                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border, #E5E7EB)' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>🛠️ Diagnostics &amp; Cache Tools</h4>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={handleClearCache}
                                                    style={{
                                                        padding: '0.65rem 1.25rem',
                                                        borderRadius: '10px',
                                                        background: 'transparent',
                                                        border: '1px solid var(--color-border, #D1D5DB)',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    🧹 Clear Cached Schedules
                                                </button>
                                                <button
                                                    onClick={handleExportData}
                                                    style={{
                                                        padding: '0.65rem 1.25rem',
                                                        borderRadius: '10px',
                                                        background: 'transparent',
                                                        border: '1px solid var(--color-border, #D1D5DB)',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    📥 Download System Diagnostics
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
