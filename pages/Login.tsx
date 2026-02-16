import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { LogIn, Car } from 'lucide-react';

interface LoginProps {
    onRegisterClick: () => void;
}

export const Login: React.FC<LoginProps> = ({ onRegisterClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recoveryMode, setRecoveryMode] = useState(false);
    const [recoverySent, setRecoverySent] = useState(false);

    const fetchUserData = useStore(state => state.fetchUserData);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Fetch company data and update store
            if (data.user) {
                try {
                    await fetchUserData(data.user.id);
                } catch (fetchError: any) {
                    await supabase.auth.signOut();
                    throw fetchError;
                }
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setRecoverySent(false);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}`,
            });

            if (error) throw error;
            setRecoverySent(true);
        } catch (err: any) {
            console.error("Reset error:", err);
            setError(err.message || 'Error al enviar correo de recuperación');
        } finally {
            setLoading(false);
        }
    };

    if (recoveryMode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gray-900 p-3 rounded-xl">
                            <Car className="text-white w-8 h-8" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Recuperar Clave</h2>
                    <p className="text-center text-gray-500 mb-8">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>

                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>}
                    {recoverySent && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-6 text-sm font-bold">
                            ¡Correo enviado! Revisa tu bandeja de entrada.
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                className="w-full rounded-lg border-gray-300 focus:ring-gray-900 focus:border-gray-900"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-2.5 rounded-lg hover:bg-black transition-colors font-medium">
                            {loading ? 'Enviando...' : 'Enviar Enlace'}
                        </button>
                    </form>
                    <button onClick={() => setRecoveryMode(false)} className="w-full mt-4 text-sm text-gray-600 hover:text-gray-900 font-medium">
                        Volver al Inicio de Sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gray-900 p-3 rounded-xl">
                            <Car className="text-white w-8 h-8" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Bienvenido</h2>
                    <p className="text-center text-gray-500 mb-8">Ingresa a tu cuenta para continuar</p>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                className="w-full rounded-lg border-gray-300 focus:ring-gray-900 focus:border-gray-900"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                                <button
                                    type="button"
                                    onClick={() => setRecoveryMode(true)}
                                    className="text-xs text-blue-600 hover:underline font-medium"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                            <input
                                type="password"
                                required
                                className="w-full rounded-lg border-gray-300 focus:ring-gray-900 focus:border-gray-900"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 text-white py-2.5 rounded-lg hover:bg-black transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            {loading ? 'Iniciando sesión...' : (
                                <>
                                    <LogIn size={18} /> Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">¿No tienes una cuenta? </span>
                        <button
                            onClick={onRegisterClick}
                            className="text-gray-900 font-bold hover:underline"
                        >
                            Registrarse
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
