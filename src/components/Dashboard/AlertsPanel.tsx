'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/types';

export default function AlertsPanel() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [dispatchingId, setDispatchingId] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const fetchAlerts = async () => {
        try {
            const response = await fetch('/api/alerts');
            const data = await response.json();
            setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
        } catch (error) {
            console.error('Alerts fetch error:', error);
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsApp = (alert: Alert) => {
        let phone = localStorage.getItem('greenguard_farmer_phone') || '';
        if (!phone) {
            const userPhone = window.prompt('Enter farmer mobile number for WhatsApp alert (e.g., +91 9876543210):');
            if (!userPhone) return;
            phone = userPhone.trim();
            localStorage.setItem('greenguard_farmer_phone', phone);
        }

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const message = `🚨 *GreenGuard AI Farm Alert*\n\n` +
            `*${alert.title}*\n` +
            `${alert.message}\n\n` +
            `Severity: ${alert.severity.toUpperCase()}\n` +
            `Action Required: ${alert.actionRequired ? 'Yes (Immediate)' : 'Monitor'}\n\n` +
            `_GreenGuard AI Smart Irrigation System_`;

        const waUrl = cleanPhone 
            ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

        window.open(waUrl, '_blank');
        showToast('WhatsApp advisory opened for dispatch!', 'success');
    };

    const handleDispatchChannel = async (alert: Alert, channel: 'sms' | 'email') => {
        let phone = localStorage.getItem('greenguard_farmer_phone') || '';
        let email = localStorage.getItem('greenguard_alert_email') || '';

        if (channel === 'sms' && !phone) {
            const userPhone = window.prompt('Enter mobile number for SMS alert (e.g. +91 9876543210):');
            if (!userPhone) return;
            phone = userPhone.trim();
            localStorage.setItem('greenguard_farmer_phone', phone);
        }

        if (channel === 'email' && !email) {
            const userEmail = window.prompt('Enter recipient email for notification:');
            if (!userEmail) return;
            email = userEmail.trim();
            localStorage.setItem('greenguard_alert_email', email);
        }

        setDispatchingId(alert.id);
        try {
            const res = await fetch('/api/alerts/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    phone,
                    channels: {
                        email: channel === 'email',
                        sms: channel === 'sms',
                        whatsapp: false
                    },
                    alert
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to dispatch alert');

            if (channel === 'sms') {
                showToast(`SMS alert dispatched to ${phone}!`, 'success');
            } else {
                showToast(`Email alert dispatched to ${email}!`, 'success');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to send alert', 'error');
        } finally {
            setDispatchingId(null);
        }
    };

    const markAsRead = async (alertId: string) => {
        try {
            await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'markAsRead', alertId })
            });
            setAlerts(alerts.map(a => a.id === alertId ? { ...a, read: true } : a));
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const getSeverityColor = (severity: string) => {
        const colors = {
            low: '#10B981',
            medium: '#FBBF24',
            high: '#F97316',
            critical: '#EF4444'
        };
        return colors[severity as keyof typeof colors] || colors.low;
    };

    const getSeverityIcon = (severity: string) => {
        const icons = {
            low: '💚',
            medium: '⚠️',
            high: '🔶',
            critical: '🚨'
        };
        return icons[severity as keyof typeof icons] || '💚';
    };

    const getTypeIcon = (type: string) => {
        const icons = {
            water_stress: '💧',
            irrigation_due: '🚿',
            weather_warning: '🌤️',
            anomaly: '📊',
            sensor_malfunction: '🔧'
        };
        return icons[type as keyof typeof icons] || '🔔';
    };

    const displayedAlerts = showAll ? alerts : alerts.slice(0, 3);
    const unreadCount = alerts.filter(a => !a.read).length;

    return (
        <div className="card-glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                        Alerts & Notifications
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>
                        {unreadCount} unread • Multi-channel delivery ready
                    </p>
                </div>
                {unreadCount > 0 && (
                    <div className="badge" style={{
                        background: '#EF4444',
                        color: 'white',
                        fontSize: '0.75rem'
                    }}>
                        {unreadCount}
                    </div>
                )}
            </div>

            {/* Notification Feedback Toast */}
            {toastMsg && (
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: toastMsg.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: toastMsg.type === 'error' ? '#EF4444' : '#10B981',
                    border: `1px solid ${toastMsg.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                }}>
                    <span>{toastMsg.type === 'error' ? '⚠️' : '✓'} {toastMsg.text}</span>
                    <button
                        onClick={() => setToastMsg(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {loading ? (
                <div className="skeleton" style={{ height: '200px' }} />
            ) : alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <p>No alerts - All systems normal</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {displayedAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                style={{
                                    padding: '1rem',
                                    background: alert.read ? 'var(--color-surface-elevated)' : 'rgba(16, 185, 129, 0.05)',
                                    borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                                    borderRadius: '8px',
                                    opacity: alert.read ? 0.8 : 1,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                    {/* Icons */}
                                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                        {getTypeIcon(alert.type)}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'start',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div style={{
                                                fontSize: '0.95rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text-primary)'
                                            }}>
                                                {getSeverityIcon(alert.severity)} {alert.title}
                                            </div>
                                            {!alert.read && (
                                                <button
                                                    onClick={() => markAsRead(alert.id)}
                                                    title="Mark as read"
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: 'var(--color-primary)',
                                                        flexShrink: 0
                                                    }} />
                                                </button>
                                            )}
                                        </div>

                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.85rem',
                                            color: 'var(--color-text-secondary)',
                                            marginBottom: '0.5rem',
                                            lineHeight: 1.5
                                        }}>
                                            {alert.message}
                                        </p>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '0.75rem',
                                            opacity: 0.7,
                                            marginBottom: '0.6rem'
                                        }}>
                                            <span>
                                                {new Date(alert.timestamp).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            {alert.actionRequired && (
                                                <span style={{
                                                    color: '#F97316',
                                                    fontWeight: 600
                                                }}>
                                                    Action Required
                                                </span>
                                            )}
                                        </div>

                                        {/* Multi-Channel Quick Action Buttons */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                borderTop: '1px solid rgba(0,0,0,0.06)',
                                                paddingTop: '0.5rem'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => handleSendWhatsApp(alert)}
                                                style={{
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                                    color: '#059669',
                                                    borderRadius: '6px',
                                                    padding: '0.25rem 0.65rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                }}
                                            >
                                                💬 WhatsApp
                                            </button>

                                            <button
                                                onClick={() => handleDispatchChannel(alert, 'sms')}
                                                disabled={dispatchingId === alert.id}
                                                style={{
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                                    color: '#D97706',
                                                    borderRadius: '6px',
                                                    padding: '0.25rem 0.65rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: dispatchingId === alert.id ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                }}
                                            >
                                                📱 {dispatchingId === alert.id ? 'Sending...' : 'Send SMS'}
                                            </button>

                                            <button
                                                onClick={() => handleDispatchChannel(alert, 'email')}
                                                disabled={dispatchingId === alert.id}
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    color: '#2563EB',
                                                    borderRadius: '6px',
                                                    padding: '0.25rem 0.65rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: dispatchingId === alert.id ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                }}
                                            >
                                                📧 {dispatchingId === alert.id ? 'Sending...' : 'Email'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Show More Button */}
                    {alerts.length > 3 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            style={{
                                width: '100%',
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: 'var(--color-surface-elevated)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'var(--color-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface-elevated)'}
                        >
                            {showAll ? 'Show Less' : `Show All (${alerts.length - 3} more)`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
