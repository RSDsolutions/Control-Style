import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { sendMessageToAI } from '../../services/aiService';
import { buildFinancialContext } from '../../utils/aiContext';

export const AssistantWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get the whole store to ensure stability
    const store = useStore();

    // Memoize the context data to avoid re-calculating on every render
    const storeData = useMemo(() => {
        try {
            return {
                resumen: typeof store.obtenerResumen === 'function' ? store.obtenerResumen() : {},
                inventario: store.inventario || [],
                gastos: store.gastos || [],
                alertas: typeof store.obtenerAlertas === 'function' ? store.obtenerAlertas() : []
            };
        } catch (e) {
            console.error("AI Context Generation Error:", e);
            return { resumen: {}, inventario: [], gastos: [], alertas: [] };
        }
    }, [store.inventario, store.gastos, store.ordenes, store.pagos]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(scrollToBottom, 50);
            return () => clearTimeout(timer);
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue;
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const context = buildFinancialContext(storeData);
            // Using the new OpenRouter service
            const response = await sendMessageToAI(messages, userMsg, context);

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error("Chat Interaction Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, tuve un problema al procesar tu solicitud." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 md:w-96 h-[500px] mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-yellow-300" />
                            <h3 className="font-bold text-sm md:text-base">Asistente Financiero</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 mt-10">
                                <Bot size={48} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Hola, soy tu asistente virtual.</p>
                                <p className="text-xs mt-1 px-4 text-gray-500">
                                    Pregúntame sobre tus ventas, gastos o sugerencias para mejorar tu rentabilidad.
                                </p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100" />
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-200 shrink-0">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all shadow-inner">
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none p-0"
                                placeholder="Escribe tu consulta..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className={`p-1.5 rounded-full transition-all shrink-0 ${inputValue.trim() && !isLoading
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform active:scale-95'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center pointer-events-auto ${isOpen ? 'scale-0 opacity-0' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white ring-4 ring-white shadow-indigo-500/50'
                    }`}
            >
                <MessageSquare size={28} />
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border-2 border-white"></span>
                    </span>
                )}
            </button>
        </div>
    );
};
