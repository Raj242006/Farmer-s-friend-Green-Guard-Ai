'use client';

import Link from 'next/link';
import { useState, useEffect, startTransition } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationOverlay from '@/components/NavigationOverlay';
import { showNavOverlay } from '@/lib/navigationOverlay';
import useNavigationOverlay from '@/lib/useNavigationOverlay';
import { goToDashboard } from '@/lib/goToDashboard';

const HeroSection = ({ router, setShowOverlay }: { router: any; setShowOverlay: (v: boolean) => void }) => {
    const { data: session, status } = useSession();

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '500px',
            overflow: 'hidden',
            borderRadius: '0 0 20px 20px'
        }}>
            {/* Single Static Image */}
            <div
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url('https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1600&h=500&fit=crop')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
                role="img"
                aria-label="Healthy crops growing"
            />

            {/* Auth Buttons - Top Right */}
            <div style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                display: 'flex',
                gap: '1rem',
                zIndex: 4
            }}>
                {status === 'loading' ? (
                    <div style={{ color: 'white' }}>Loading...</div>
                ) : session ? (
                    <>
                        <button
                            onClick={() => goToDashboard(router, setShowOverlay)}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '12px',
                                fontWeight: 600,
                                border: '2px solid white',
                                transition: 'all 0.3s ease',
                                backdropFilter: 'blur(10px)',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                        >
                            Dashboard
                        </button>
                        <button onClick={() => signOut({ callbackUrl: '/' })} style={{
                            backgroundColor: 'white',
                            color: '#10B981',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            border: '2px solid white',
                            transition: 'all 0.3s ease',
                            backdropFilter: 'blur(10px)'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}>
                            Login
                        </Link>
                        <Link href="/register" style={{
                            backgroundColor: 'white',
                            color: '#10B981',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            transition: 'all 0.3s ease'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                            Sign Up
                        </Link>
                    </>
                )}
            </div>

            {/* Dark Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6))',
                zIndex: 1
            }} />

            {/* Content Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                textAlign: 'center',
                padding: '2rem'
            }}>
                <h1 style={{
                    color: 'white',
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    fontWeight: 900,
                    marginBottom: '1rem',
                    textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    maxWidth: '900px'
                }}>
                    AI Powered Smart Irrigation for Modern Farming
                </h1>
                <p style={{
                    color: 'rgba(255,255,255,0.95)',
                    fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                    marginBottom: '2rem',
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    maxWidth: '700px'
                }}>
                    Monitor soil, save water, increase yield.
                </p>
                <button
                    onClick={() => goToDashboard(router, setShowOverlay)}
                    style={{
                        backgroundColor: '#10B981',
                        color: 'white',
                        padding: '1rem 2.5rem',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                        transition: 'all 0.3s ease',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#059669';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#10B981';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    Go to Dashboard →
                </button>
            </div>
        </div>
    );
}


export default function HomePage() {
    const [isVisible, setIsVisible] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const { data: session, status } = useSession();
    const router = useRouter();

    // Auto-hide overlay when route changes
    useNavigationOverlay(setShowOverlay);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleDashboardClick = () => {
        goToDashboard(router, setShowOverlay);
    };

    return (
        <div className="min-h-screen">
            {/* Navigation Overlay */}
            <NavigationOverlay show={showOverlay} />

            {/* Hero Section */}
            <HeroSection router={router} setShowOverlay={setShowOverlay} />

            {/* Live Farm Status Preview */}
            < section style={{ padding: '4rem 0', backgroundColor: 'var(--color-background)' }
            }>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Monitor Your Farm in Real-Time
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                            Everything you need to know about your farm at a glance
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {[
                            { icon: <img src="/assets/icons/soil-moisture.png" alt="" style={{ width: '64px', height: '64px' }} />, label: 'Soil Moisture', value: '42%', status: 'Optimal', color: '#10B981' },
                            { icon: <img src="/assets/icons/crop-health.png" alt="" style={{ width: '64px', height: '64px' }} />, label: 'Crop Health', value: '88/100', status: 'Good Condition', color: '#10B981' },
                            { icon: <img src="/assets/icons/irrigation-scheduled.png" alt="" style={{ width: '64px', height: '64px' }} />, label: 'Next Irrigation', value: '6 hours', status: 'AI Scheduled', color: '#FBBF24' },
                            { icon: '🌤️', label: 'Weather', value: '28°C', status: 'Sunny', color: '#3B82F6' }
                        ].map((stat, i) => (
                            <div key={i} className="card" style={{
                                textAlign: 'center',
                                padding: '2rem 1.5rem',
                                borderTop: `4px solid ${stat.color}`,
                                transition: 'all 0.3s ease'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{stat.icon}</div>
                                <div style={{
                                    fontSize: '2rem',
                                    fontWeight: 800,
                                    color: stat.color,
                                    marginBottom: '0.5rem'
                                }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                                    {stat.label}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                    {stat.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Benefits Section */}
            < section style={{ padding: '4rem 0', background: 'var(--gradient-subtle)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Why Farmers Choose GreenGuard AI
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                            Practical benefits that increase your farm productivity
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '2rem'
                    }}>
                        {[
                            {
                                icon: <img src="/assets/icons/water-saved.png" alt="" style={{ width: '72px', height: '72px' }} />,
                                title: 'Save Water Automatically',
                                description: 'AI detects exact water needs and irrigates only when required. Save up to 40% water.'
                            },
                            {
                                icon: '🔔',
                                title: 'Get Irrigation Alerts',
                                description: 'Receive SMS and email alerts when your crops need water or face threats.'
                            },
                            {
                                icon: <img src="/assets/icons/analytics-icon.png" alt="" style={{ width: '72px', height: '72px' }} />,
                                title: 'Increase Yield with Data',
                                description: 'Make informed decisions based on real-time soil, weather, and crop health data.'
                            }
                        ].map((benefit, i) => (
                            <div key={i} className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{benefit.icon}</div>
                                <h3 style={{
                                    color: 'var(--color-primary)',
                                    marginBottom: '1rem',
                                    fontSize: '1.3rem'
                                }}>
                                    {benefit.title}
                                </h3>
                                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                                    {benefit.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* How It Works */}
            < section style={{ padding: '4rem 0', backgroundColor: 'var(--color-background)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            How It Works
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                            Three simple steps to smarter farming
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '2rem',
                        maxWidth: '900px',
                        margin: '0 auto'
                    }}>
                        {[
                            {
                                step: '1',
                                icon: '📡',
                                title: 'Sensors Monitor Farm',
                                description: 'IoT sensors continuously track soil moisture, temperature, and humidity'
                            },
                            {
                                step: '2',
                                icon: '🤖',
                                title: 'AI Analyzes Data',
                                description: 'Machine learning predicts optimal irrigation timing and water requirements'
                            },
                            {
                                step: '3',
                                icon: <img src="/assets/icons/irrigation-scheduled.png" alt="" style={{ width: '64px', height: '64px' }} />,
                                title: 'Smart Irrigation',
                                description: 'Automated scheduling or instant alerts guide your irrigation decisions'
                            }
                        ].map((step, i) => (
                            <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'var(--gradient-primary)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    margin: '0 auto 1rem',
                                    boxShadow: 'var(--shadow-lg)'
                                }}>
                                    {step.step}
                                </div>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{step.icon}</div>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: 600,
                                    marginBottom: '0.75rem',
                                    color: 'var(--color-text-primary)'
                                }}>
                                    {step.title}
                                </h3>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* CTA Section */}
            < section style={{
                padding: '5rem 0',
                background: 'linear-gradient(135deg, #e8fff3, #d2f5e4)',
                textAlign: 'center'
            }}>
                <div className="container">
                    <h2 style={{ color: '#047857', fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 700 }}>
                        Ready to Improve Your Farm Efficiency?
                    </h2>
                    <p style={{
                        color: '#065F46',
                        fontSize: '1.2rem',
                        marginBottom: '2rem',
                        maxWidth: '600px',
                        margin: '0 auto 2rem'
                    }}>
                        Join thousands of farmers using AI to save water and increase yields
                    </p>
                    <button
                        onClick={handleDashboardClick}
                        disabled={showOverlay}
                        style={{
                            backgroundColor: showOverlay ? '#059669' : '#16a34a',
                            color: 'white',
                            fontSize: '1.2rem',
                            padding: '1.25rem 3rem',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                            fontWeight: 600,
                            opacity: showOverlay ? 0.8 : 1,
                            cursor: showOverlay ? 'wait' : 'pointer',
                            border: 'none',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {showOverlay ? (
                            <>
                                <span style={{
                                    display: 'inline-block',
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid white',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                Opening Dashboard...
                            </>
                        ) : (
                            'Start Monitoring Now →'
                        )}
                    </button>
                </div>
            </section >

            {/* Footer */}
            < footer style={{
                padding: '3rem 0',
                backgroundColor: 'var(--color-surface)',
                borderTop: '1px solid var(--color-primary-light)'
            }}>
                <div className="container">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '2rem',
                        marginBottom: '2rem'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '2rem' }}>🌿</span>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '1.3rem',
                                    background: 'var(--gradient-primary)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}>
                                    GreenGuard AI
                                </h3>
                            </div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                Smart Irrigation & Crop Wellness System
                            </p>
                        </div>

                        <div>
                            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Quick Links</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Link href="/dashboard" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                    Dashboard
                                </Link>
                                <Link href="/calculator" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                    Water Calculator
                                </Link>
                                <Link href="/crop-recommendation" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                    Crop Recommendation
                                </Link>
                                <Link href="/fertilizer-recommendation" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                    Fertilizer Recommendation
                                </Link>
                                <Link href="/weather" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                    Weather
                                </Link>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Contact</h4>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                📍 Uttar Pradesh, India<br />
                                📧 info@protominds.com<br />
                                📱 +91 7055-335677
                            </p>
                        </div>
                    </div>

                    <div style={{
                        textAlign: 'center',
                        paddingTop: '2rem',
                        borderTop: '1px solid rgba(16, 185, 129, 0.1)',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.9rem'
                    }}>
                        <p style={{ margin: 0 }}>
                            © 2026 GreenGuard AI. Nurturing fields with intelligence. 🌾
                        </p>
                    </div>
                </div>
            </footer >
        </div >
    );
}
