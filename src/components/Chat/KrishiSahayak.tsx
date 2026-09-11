'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, FarmContext } from '@/types';
import { useFarm } from '@/contexts/FarmContext';

// Web Speech API type declarations
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export default function KrishiSahayak() {
    const { selectedFarm } = useFarm();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: '🙏 Namaste! Main hoon Krishi Sahayak (कृषि सहायक), aapka AI farming assistant. Aap mujhse koi bhi sawaal pooch sakte hain — type karke ya 🎤 mic button se baat karke!',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ─── Voice States ─────────────────────────────────────────
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Initialize Voice APIs
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check SpeechRecognition support
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                setVoiceSupported(true);
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.lang = 'hi-IN'; // Hindi + English mixed

                recognition.onresult = (event: any) => {
                    const transcript = Array.from(event.results)
                        .map((result: any) => result[0].transcript)
                        .join('');
                    setInput(transcript);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }

            // Check TTS support
            if ('speechSynthesis' in window) {
                setSpeechSupported(true);
                synthRef.current = window.speechSynthesis;
            }
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ─── Voice Input (Mic) ────────────────────────────────────
    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setInput('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    // ─── Voice Output (TTS) ───────────────────────────────────
    const speakText = useCallback((text: string) => {
        if (!synthRef.current || !speechSupported) return;

        // Stop any current speech
        synthRef.current.cancel();

        // Clean markdown/emoji from spoken text
        const cleanText = text
            .replace(/[🙏👨‍🌾🌱💧⚠️✅❌🔄➤🎤🔊🔴]/g, '')
            .replace(/\*\*/g, '')
            .replace(/#{1,6}\s/g, '')
            .replace(/•/g, '')
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = synthRef.current.getVoices();

        const hasHindi = /[\u0900-\u097F]/.test(cleanText);
        let selectedVoice;

        if (hasHindi) {
            // Priority 1: Best Hindi voices
            selectedVoice = voices.find(v => v.name.includes('Google हिन्दी') || v.name.includes('Microsoft Heera'));
            // Priority 2: Any Hindi voice
            if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith('hi'));
            // Priority 3: Indian English fallback
            if (!selectedVoice) selectedVoice = voices.find(v => v.lang === 'en-IN');
        } else {
            // English / Other languages
            // Priority 1: Explicitly female voices
            selectedVoice = voices.find(v => v.name.toLowerCase().includes('female'));

            // Priority 2: Known female English voices
            if (!selectedVoice) {
                const femaleVoiceNames = [
                    'Microsoft Zira', 'Samantha', 'Victoria', 'Karen', 'Moira', 'Tessa', 
                    'Google UK English Female', 'Google US English', 'Microsoft Susan', 'Microsoft Anna'
                ];
                for (const name of femaleVoiceNames) {
                    const found = voices.find(v => v.name.includes(name));
                    if (found) { selectedVoice = found; break; }
                }
            }
        }

        // Final fallback chain if still no voice found
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang === 'en-IN') || 
                            voices.find(v => v.lang.startsWith('en')) || 
                            voices[0];
        }

        utterance.voice = selectedVoice || voices[0];
        utterance.rate = hasHindi ? 0.85 : 0.92; // Slightly slower for Hindi to sound clearer
        utterance.pitch = 1.15;   // Higher pitch = more feminine
        utterance.volume = 1;
        utterance.lang = selectedVoice?.lang || (hasHindi ? 'hi-IN' : 'en-US');

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        currentUtteranceRef.current = utterance;
        synthRef.current.speak(utterance);
    }, [speechSupported]);

    const stopSpeaking = () => {
        synthRef.current?.cancel();
        setIsSpeaking(false);
    };

    // Farm context
    const farmContext: FarmContext = {
        cropType: selectedFarm?.name || 'unknown',
        growthStage: 'Development',
        currentSoilMoisture: 0,
        weatherConditions: 'data from AgroMonitoring',
        recentAlerts: []
    };

    const sendMessage = async (messageText?: string) => {
        const textToSend = messageText || input;
        if (!textToSend.trim()) return;

        // Stop listening if active
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }

        const userMessage: ChatMessage = {
            id: String(Date.now()),
            role: 'user',
            content: textToSend,
            timestamp: new Date(),
            context: farmContext
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    context: farmContext,
                    sessionId,
                    farmId: selectedFarm?.id || null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            const assistantMessage: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Auto-speak the response
            speakText(data.response);

        } catch (error) {
            const errorMessage: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: '🙏 Sorry! AI service se connect nahi ho pa raha. Thodi der baad try karein.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = async () => {
        stopSpeaking();
        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, reset: true })
            });
            setMessages([{
                id: '1',
                role: 'assistant',
                content: '🙏 Namaste! Main hoon Krishi Sahayak (कृषि सहायक), aapka AI farming assistant. Aap mujhse koi bhi sawaal pooch sakte hain — type karke ya 🎤 mic button se baat karke!',
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error('Error resetting chat:', error);
        }
    };

    const suggestions = [
        'Meri farming ki condition kaisi hai?',
        'Irrigation kab karni chahiye?',
        'Patte peele kyon ho rahe hain?',
        'Khad kab dalni chahiye?'
    ];

    // ─── Floating Button ──────────────────────────────────────
    if (!isOpen) {
        return (
            <div
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.5)',
                    zIndex: 1000,
                    transition: 'all 0.3s ease',
                    fontSize: '1.8rem'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 8px 28px rgba(16, 185, 129, 0.7)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.5)';
                }}
            >
                👨‍🌾
            </div>
        );
    }

    // ─── Chat Window ──────────────────────────────────────────
    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '420px',
            height: '620px',
            background: '#0f172a',
            borderRadius: '20px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>

            {/* ── Header ── */}
            <div style={{
                background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(16,185,129,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '44px', height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem',
                        border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                        👨‍🌾
                    </div>
                    <div>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 700 }}>
                            Krishi Sahayak
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                background: '#4ade80',
                                boxShadow: '0 0 6px #4ade80',
                                animation: 'pulse 2s infinite'
                            }} />
                            <p style={{ margin: 0, color: '#a7f3d0', fontSize: '0.72rem' }}>
                                AI Farming Assistant • Voice Enabled
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {/* Stop Speaking */}
                    {isSpeaking && (
                        <button
                            onClick={stopSpeaking}
                            title="Bolna band karo"
                            style={{
                                background: 'rgba(239,68,68,0.3)',
                                border: '1px solid rgba(239,68,68,0.5)',
                                color: 'white', width: '32px', height: '32px',
                                borderRadius: '50%', cursor: 'pointer',
                                fontSize: '0.9rem', display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            🔇
                        </button>
                    )}
                    {/* New Chat */}
                    <button
                        onClick={handleNewChat}
                        title="Nai baat shuru karo"
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none', color: 'white',
                            width: '32px', height: '32px',
                            borderRadius: '50%', cursor: 'pointer',
                            fontSize: '1rem', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >
                        🔄
                    </button>
                    {/* Close */}
                    <button
                        onClick={() => { setIsOpen(false); stopSpeaking(); }}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none', color: 'white',
                            width: '32px', height: '32px',
                            borderRadius: '50%', cursor: 'pointer',
                            fontSize: '1.2rem', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* ── Messages ── */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: '#0f172a',
                scrollbarWidth: 'thin',
                scrollbarColor: '#1e293b transparent'
            }}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            gap: '0.5rem',
                            alignItems: 'flex-end'
                        }}
                    >
                        {msg.role === 'assistant' && (
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #059669, #10b981)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.9rem', flexShrink: 0
                            }}>
                                🌱
                            </div>
                        )}

                        <div style={{
                            maxWidth: '78%',
                            padding: '0.7rem 1rem',
                            borderRadius: msg.role === 'user'
                                ? '18px 18px 4px 18px'
                                : '18px 18px 18px 4px',
                            background: msg.role === 'user'
                                ? 'linear-gradient(135deg, #059669, #10b981)'
                                : '#1e293b',
                            color: 'white',
                            fontSize: '0.875rem',
                            lineHeight: 1.65,
                            boxShadow: msg.role === 'user'
                                ? '0 2px 12px rgba(16,185,129,0.3)'
                                : '0 2px 8px rgba(0,0,0,0.3)',
                            border: msg.role === 'assistant'
                                ? '1px solid rgba(16,185,129,0.15)'
                                : 'none'
                        }}>
                            {msg.content}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '0.35rem'
                            }}>
                                <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                                {/* Speak button on assistant messages */}
                                {msg.role === 'assistant' && speechSupported && (
                                    <button
                                        onClick={() => speakText(msg.content)}
                                        title="Sunao"
                                        style={{
                                            background: 'rgba(16,185,129,0.2)',
                                            border: '1px solid rgba(16,185,129,0.3)',
                                            color: '#4ade80',
                                            borderRadius: '10px',
                                            padding: '1px 6px',
                                            fontSize: '0.65rem',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '3px'
                                        }}
                                    >
                                        🔊 Sunao
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #059669, #10b981)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem'
                        }}>
                            🌱
                        </div>
                        <div style={{
                            padding: '0.7rem 1rem',
                            borderRadius: '18px 18px 18px 4px',
                            background: '#1e293b',
                            border: '1px solid rgba(16,185,129,0.2)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: '#10b981',
                                        animation: `bounce 1.2s ${i * 0.2}s infinite`
                                    }} />
                                ))}
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '6px' }}>
                                    Soch raha hoon...
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Quick Suggestions ── */}
            {messages.length === 1 && (
                <div style={{
                    padding: '0.6rem 1rem',
                    display: 'flex',
                    gap: '0.4rem',
                    flexWrap: 'wrap',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: '#0f172a'
                }}>
                    {suggestions.map((sug, i) => (
                        <button
                            key={i}
                            onClick={() => sendMessage(sug)}
                            style={{
                                padding: '0.35rem 0.7rem',
                                background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.25)',
                                borderRadius: '20px',
                                fontSize: '0.72rem',
                                color: '#4ade80',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                        >
                            {sug}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Input Bar ── */}
            <div style={{
                padding: '0.85rem 1rem',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: '#0f172a',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
            }}>
                {/* Mic Button */}
                {voiceSupported && (
                    <button
                        onClick={toggleListening}
                        title={isListening ? 'Sunna band karo' : 'Mic se bolo'}
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            border: isListening
                                ? '2px solid #ef4444'
                                : '2px solid rgba(16,185,129,0.4)',
                            background: isListening
                                ? 'rgba(239,68,68,0.2)'
                                : 'rgba(16,185,129,0.1)',
                            color: isListening ? '#f87171' : '#4ade80',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.3s',
                            boxShadow: isListening ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
                            animation: isListening ? 'micPulse 1s infinite' : 'none'
                        }}
                    >
                        {isListening ? '🔴' : '🎤'}
                    </button>
                )}

                {/* Text Input */}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={isListening ? '🎤 Bol raha hoon...' : 'Kuch bhi poochho...'}
                    style={{
                        flex: 1,
                        padding: '0.65rem 1rem',
                        background: '#1e293b',
                        border: isListening
                            ? '2px solid rgba(239,68,68,0.5)'
                            : '2px solid rgba(16,185,129,0.2)',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        color: 'white',
                        outline: 'none',
                        transition: 'border-color 0.3s'
                    }}
                    onFocus={e => {
                        if (!isListening) e.target.style.borderColor = 'rgba(16,185,129,0.6)';
                    }}
                    onBlur={e => {
                        if (!isListening) e.target.style.borderColor = 'rgba(16,185,129,0.2)';
                    }}
                />

                {/* Send Button */}
                <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        border: 'none',
                        background: (!input.trim() || loading)
                            ? 'rgba(16,185,129,0.2)'
                            : 'linear-gradient(135deg, #059669, #10b981)',
                        color: 'white',
                        cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.3s',
                        boxShadow: (!input.trim() || loading)
                            ? 'none'
                            : '0 2px 12px rgba(16,185,129,0.4)'
                    }}
                >
                    ➤
                </button>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }
                @keyframes micPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
                    50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
