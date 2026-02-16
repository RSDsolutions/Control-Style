/**
 * AI Service using OpenRouter (OpenAI-compatible API)
 * Updated with VERIFIED free model IDs from diagnostic list.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// List of free models specifically verified for this API Key
const VERIFIED_FREE_MODELS = [
    "openrouter/auto", // Best available free model
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "qwen/qwen3-coder:free",
    "openrouter/free"
];

export const sendMessageToAI = async (
    history: { role: string, content: string }[],
    message: string,
    systemContext: string
) => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
        return "Error: No se encontró la API Key de OpenRouter (VITE_OPENROUTER_API_KEY).";
    }

    // Try each model until one works
    for (const model of VERIFIED_FREE_MODELS) {
        try {
            console.log(`AI Service: Intentando con ${model}...`);

            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "Control Style Assistant",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: `Actúa como un asistente financiero experto para un taller de tapicería. 
                            Contexto actual del negocio: ${systemContext}`
                        },
                        ...history,
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.warn(`AI Service: Falló ${model}:`, errorData.error?.message);
                continue; // Next fallback
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content;

            if (reply) {
                console.log(`AI Service: Éxito con ${model}`);
                return reply;
            }
        } catch (error: any) {
            console.warn(`AI Service: Error en ${model}:`, error.message);
        }
    }

    return "Lo siento, la red de modelos gratuitos de OpenRouter está saturada en este momento. Intenta de nuevo en un minuto o considera añadir un pequeño saldo ($5) a OpenRouter para acceso prioritario.";
};
