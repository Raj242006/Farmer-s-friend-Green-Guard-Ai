/**
 * Krishi Sahayak - AI Chatbot using Gemini REST API (Direct)
 * Uses gemini-3.6-flash — confirmed working with this API key
 */

import { FarmContext } from '@/types';

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: string;
}

const WORKING_MODEL = 'gemini-3.6-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class KrishiSahayakChatbot {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GOOGLE_GEMINI_APIKEY || process.env.GEMINI_API_KEY;
        if (this.apiKey) {
            console.log(`✅ [Chatbot] Ready — model: ${WORKING_MODEL}, key length: ${this.apiKey.length}`);
        } else {
            console.error('❌ [Chatbot] No API key found!');
        }
    }

    async generateResponse(
        userMessage: string,
        context: FarmContext,
        chatHistory: GeminiMessage[] = [],
        ragData?: string
    ): Promise<{ response: string; updatedHistory: GeminiMessage[] }> {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured.');
        }

        const limitedHistory = chatHistory.slice(-15);
        const systemPrompt = this.buildSystemPrompt(context, ragData);

        // Build contents array
        const contents: { role: string; parts: { text: string }[] }[] = [];

        if (limitedHistory.length === 0) {
            // First message — include full system prompt
            contents.push({
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }]
            });
        } else {
            // Add conversation history
            for (const msg of limitedHistory) {
                contents.push({
                    role: msg.role,
                    parts: [{ text: msg.parts }]
                });
            }
            // Add current message
            contents.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });
        }

        const url = `${GEMINI_BASE}/${WORKING_MODEL}:generateContent?key=${this.apiKey}`;

        const body = JSON.stringify({
            contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 1024,
            }
        });

        console.log(`🤖 [Chatbot] Calling ${WORKING_MODEL}...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ [Chatbot] ${WORKING_MODEL} failed (${response.status}):`, errText.substring(0, 200));
            throw new Error(`Gemini API error ${response.status}: ${errText.substring(0, 100)}`);
        }

        const data = await response.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            console.error('❌ [Chatbot] Empty response:', JSON.stringify(data).substring(0, 300));
            throw new Error('Empty response from Gemini API');
        }

        console.log(`✅ [Chatbot] Response OK — ${responseText.length} chars`);

        const updatedHistory: GeminiMessage[] = [
            ...limitedHistory,
            { role: 'user', parts: userMessage },
            { role: 'model', parts: responseText },
        ];

        return { response: responseText, updatedHistory };
    }

    private buildSystemPrompt(context: FarmContext, ragData?: string): string {
        let prompt = `You are Krishi Sahayak (कृषि सहायक), an intelligent agricultural assistant for GreenGuard AI.
You specialize in irrigation management, crop health, and sustainable farming practices.

CURRENT FARM CONTEXT:
- Crop: ${context.cropType}
- Growth Stage: ${context.growthStage}
- Soil Moisture: ${context.currentSoilMoisture.toFixed(1)}%
- Next Irrigation: ${context.nextIrrigation ? new Date(context.nextIrrigation).toLocaleString() : 'Not scheduled'}
- Weather: ${context.weatherConditions}
- Recent Alerts: ${context.recentAlerts.length > 0 ? context.recentAlerts.map((a: any) => a.title).join(', ') : 'None'}`;

        if (ragData) {
            prompt += `\n\nREAL-TIME SATELLITE & WEATHER DATA:\n${ragData}\n\nIMPORTANT: Reference the actual NDVI, soil moisture, and drought risk values in your answer.`;
        }

        prompt += `\n\nINSTRUCTIONS:
1. Give practical, actionable farming advice
2. Be concise and use simple language
3. Support all languages (Hindi, English, Punjabi, Spanish, etc.) — always respond in the exact same language and script the user writes in
4. Reference real farm data numbers when available
5. For crop diseases: give symptoms, cause, remedy, prevention

Answer the question:`;

        return prompt;
    }

    async diagnoseCropDisease(symptoms: string, cropType: string): Promise<string> {
        if (!this.apiKey) return 'AI service not configured.';

        const prompt = `As an agricultural expert, diagnose crop disease for ${cropType} with symptoms: ${symptoms}.
Give: 1) Likely disease 2) Confirming symptoms 3) Treatment 4) Prevention. Be concise.`;

        try {
            const url = `${GEMINI_BASE}/${WORKING_MODEL}:generateContent?key=${this.apiKey}`;
            const body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to diagnose at this time.';
        } catch (e) {
            return `Inspect ${cropType} leaves for fungal spots or pest damage. Consult local agricultural office.`;
        }
    }

    getBestPractices(cropType: string, growthStage: string): string {
        return `General care for ${cropType} at ${growthStage}: Monitor soil moisture and apply nutrients as needed.`;
    }
}

export default KrishiSahayakChatbot;
