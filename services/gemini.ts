import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

export const initializeGemini = (apiKey: string) => {
    if (!apiKey) return;
    try {
        genAI = new GoogleGenerativeAI(apiKey);
    } catch (e) {
        console.error("Gemini: Error Init:", e);
    }
};

// Based on diagnostic: models/gemini-2.0-flash-lite, models/gemini-2.5-flash-lite, etc.
const MODEL_FALLBACKS = [
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-pro"
];

export const sendMessageToGemini = async (history: { role: string, parts: string }[], message: string, systemContext: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) return "Error: No se encontró la API Key en el archivo .env";

    if (!genAI) initializeGemini(apiKey);
    if (!genAI) return "Error inicializando el SDK de IA.";

    let lastErrorMessage = "";

    for (const modelName of MODEL_FALLBACKS) {
        try {
            console.log(`Gemini: Probando con ${modelName}...`);
            const currentModel = genAI.getGenerativeModel({ model: modelName });

            const result = await currentModel.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `Actúa como mi asistente financiero para un taller. Datos: ${systemContext}` }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Entendido. Soy tu asistente financiero. ¿En qué puedo ayudarte?" }],
                    },
                    ...history.map(msg => ({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.parts }]
                    })),
                    {
                        role: "user",
                        parts: [{ text: message }]
                    }
                ],
                generationConfig: { maxOutputTokens: 800 },
            });

            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.warn(`Gemini: Falló ${modelName}:`, error.message);
            lastErrorMessage = error.message;

            // If quota is 0, trying other models likely won't help unless quota is per-model
            // But we'll try them all anyway just in case Lite has a separate budget.
        }
    }

    if (lastErrorMessage.includes('429') && lastErrorMessage.includes('limit: 0')) {
        return `Error: Tu API Key tiene una cuota de 0 (Limit: 0). 
        
Para solucionar esto:
1. Entra a https://aistudio.google.com/
2. Haz clic en "Ajustes" o "Plan".
3. Asegúrate de que el "Free Tier" esté habilitado para esta clave.
4. Si acabas de crear la clave, Google puede tardar unos minutos en asignar la cuota inicial.`;
    }

    return `Error de comunicación (${lastErrorMessage || 'Desconocido'}).`;
};
