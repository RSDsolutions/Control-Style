import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { UserPlus, Building2 } from 'lucide-react';

interface RegisterProps {
    onLoginClick: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onLoginClick }) => {
    const [cedula, setCedula] = useState('');
    const [nombreUsuario, setNombreUsuario] = useState(''); // New field

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUserData = useStore(state => state.fetchUserData);

    // Test Mode Autofill
    useEffect(() => {
        if (email === 'thislopi99@gmail.com') {
            setCedula('1723456789');
            setNombreUsuario('Admin Carsuit');
        }
    }, [email]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario");

            // 2. Insert User Profile
            // We assume RLS allows insert for own id.
            if (authData.user) {
                // Try to insert profile. 
                // Note: If SignUp requires email confirmation, this might fail or be weird if session is not active.
                // However, for this project usually email confirmation is off or auto-sign-in is used.
                const { error: profileError } = await supabase.from('user_profiles').insert({
                    id: authData.user.id,
                    nombre: nombreUsuario,
                    cedula: cedula,
                    email: email
                });
                if (profileError) {
                    console.error("Error creating profile:", profileError);
                }
            }

            // Auto Login / Fetch
            await fetchUserData(authData.user.id);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gray-900 p-3 rounded-xl">
                            <Building2 className="text-white w-8 h-8" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Crear Cuenta</h2>
                    <p className="text-center text-gray-500 mb-8">Registra tu empresa para comenzar</p>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">

                        {/* SECCION USUARIO */}
                        <div className="pb-2 border-b border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Datos del Usuario</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-gray-300 focus:ring-gray-900 focus:border-gray-900"
                                        value={nombreUsuario}
                                        onChange={(e) => setNombreUsuario(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-gray-300 focus:ring-gray-900 focus:border-gray-900"
                                        value={cedula}
                                        onChange={(e) => setCedula(e.target.value)}
                                        placeholder="Ej: 1712345678"
                                    />
                                </div>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        className="w-full rounded-lg border-gray-300 focus:ring-gray-900 focus:border-gray-900"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>


                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 text-white py-2.5 rounded-lg hover:bg-black transition-colors font-medium flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? 'Registrando...' : (
                                <>
                                    <UserPlus size={18} /> Registrarse
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">¿Ya tienes una cuenta? </span>
                        <button
                            onClick={onLoginClick}
                            className="text-gray-900 font-bold hover:underline"
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
