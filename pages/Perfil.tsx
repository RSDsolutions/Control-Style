import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { User, Building2, Image as ImageIcon, Save, Upload, Edit, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, Empresa } from '../types';

export const Perfil: React.FC = () => {
    const { empresa, userProfile, updateEmpresa, updateUser, uploadLogo, fetchUserData } = useStore();
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [userModalOpen, setUserModalOpen] = useState(false);
    const [companyModalOpen, setCompanyModalOpen] = useState(false);

    // Form States
    const [userForm, setUserForm] = useState<Partial<UserProfile>>({});
    const [companyForm, setCompanyForm] = useState<Partial<Empresa>>({});

    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Initial Load & Sync
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser(user);
                // Ensure profile exists in DB (Backfill if missing)
                // We check if store has it, if not we fetch. 
                // If fetch fails (406/null), we create.
                if (!userProfile) {
                    // Try to fetch manually to be sure
                    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();

                    if (!data) {
                        // Insert default ONLY if missing
                        // Check if we already tried? No, just do it.
                        const { error: insertError } = await supabase.from('user_profiles').insert({
                            id: user.id,
                            email: user.email,
                            nombre: user.user_metadata?.nombre || '',
                            cedula: user.user_metadata?.cedula || ''
                        });
                        if (!insertError) {
                            // Refresh store to get the new profile
                            await fetchUserData(user.id);
                        }
                    } else {
                        // It exists but store didn't have it? Refresh store.
                        await fetchUserData(user.id);
                    }
                }
            }
        };
        init();
    }, [userProfile, fetchUserData]);

    // Update form state when store data changes
    useEffect(() => {
        if (userProfile) {
            setUserForm(userProfile);
        } else if (currentUser) {
            setUserForm({ email: currentUser.email }); // Fallback
        }

        if (empresa) {
            setCompanyForm(empresa);
        }
    }, [userProfile, empresa, currentUser]);


    const handleUserSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // We pass only the fields allowed to edit. Email is read-only.
        await updateUser({ nombre: userForm.nombre, cedula: userForm.cedula });
        setLoading(false);
        setUserModalOpen(false);
    };

    const handleCompanySave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await updateEmpresa(companyForm);
        setLoading(false);
        setCompanyModalOpen(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploadingLogo(true);
        await uploadLogo(e.target.files[0]);
        setUploadingLogo(false);
    };

    // If user is loaded but NO company, show "Create Company" view
    if (userProfile && !empresa && !loading) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-blue-600 p-4 rounded-full">
                            <Building2 className="text-white w-8 h-8" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Bienvenido, {userProfile.nombre}</h2>
                    <p className="text-center text-gray-500 mb-8">Para comenzar, necesitamos registrar los datos de tu empresa o negocio.</p>

                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setLoading(true);
                        // Use local createEmpresa from store
                        const create = useStore.getState().createEmpresa;
                        await create({
                            nombre_empresa: companyForm.nombre_empresa || 'Mi Empresa',
                            ruc: companyForm.ruc || '',
                            direccion: companyForm.direccion || '',
                            cedula_representante: userProfile.cedula,
                            user_id: userProfile.id
                        });
                        setLoading(false);
                    }} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Empresa</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 outline-none"
                                required
                                placeholder="Ej: Tapicería El Maestro"
                                value={companyForm.nombre_empresa || ''}
                                onChange={e => setCompanyForm({ ...companyForm, nombre_empresa: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">RUC (Opcional)</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 outline-none"
                                placeholder="1790000000001"
                                value={companyForm.ruc || ''}
                                onChange={e => setCompanyForm({ ...companyForm, ruc: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección (Opcional)</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 outline-none"
                                placeholder="Ciudad, Sector..."
                                value={companyForm.direccion || ''}
                                onChange={e => setCompanyForm({ ...companyForm, direccion: e.target.value })}
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors mt-4">
                            {loading ? 'Creando...' : 'Comenzar a Usar el Sistema'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (!empresa) return <div className="p-8 flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

    return (
        <div className="p-8 h-full overflow-y-auto">
            {/* ... Rest of existing Perfil code ... */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="text-primary" /> Perfil y Configuración
                </h1>
                <p className="text-gray-500">Visualiza y actualiza la información de tu cuenta.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">

                {/* 1. Tarjeta Usuario */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <User size={20} className="text-gray-600" />
                            <h3 className="font-semibold text-gray-900">Datos del Usuario</h3>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Nombre</span>
                            <p className="text-gray-900 font-medium">{userProfile?.nombre || 'No registrado'}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Cédula</span>
                            <p className="text-gray-900 font-medium">{userProfile?.cedula || 'No registrada'}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Correo Electrónico</span>
                            <p className="text-gray-900 font-medium">{currentUser?.email}</p>
                        </div>
                        <button
                            onClick={() => setUserModalOpen(true)}
                            className="w-full mt-4 flex justify-center items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition-colors"
                        >
                            <Edit size={16} /> Editar Datos
                        </button>
                    </div>
                </div>

                {/* 2. Tarjeta Empresa */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Building2 size={20} className="text-gray-600" />
                            <h3 className="font-semibold text-gray-900">Datos de la Empresa</h3>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Nombre Empresa</span>
                            <p className="text-gray-900 font-medium">{empresa.nombre_empresa}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">RUC</span>
                            <p className="text-gray-900 font-medium">{empresa.ruc || 'N/A'}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Dirección</span>
                            <p className="text-gray-900 font-medium">{empresa.direccion || 'N/A'}</p>
                        </div>
                        <button
                            onClick={() => setCompanyModalOpen(true)}
                            className="w-full mt-4 flex justify-center items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition-colors"
                        >
                            <Edit size={16} /> Editar Empresa
                        </button>
                    </div>
                </div>

                {/* 3. Tarjeta Logo */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <ImageIcon size={20} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-900">Logo de la Empresa</h3>
                    </div>
                    <div className="p-6 flex flex-col items-center justify-center">
                        <div className="w-48 h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative mb-4">
                            {empresa.logo_url ? (
                                <img src={empresa.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <span className="text-gray-400 text-sm font-medium">Sin Logo</span>
                            )}
                            {uploadingLogo && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-bold">
                                    Subiendo...
                                </div>
                            )}
                        </div>
                        <label className="inline-flex">
                            <span className="bg-gray-900 text-white hover:bg-black px-6 py-2 rounded-lg cursor-pointer font-medium text-sm flex items-center gap-2 shadow-sm transition-all">
                                <Upload size={16} />
                                {empresa.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                            </span>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="hidden"
                                onChange={handleLogoUpload}
                                disabled={uploadingLogo}
                            />
                        </label>
                        <p className="text-xs text-gray-400 mt-2">Formatos: PNG, JPG.</p>
                    </div>
                </div>
            </div>

            {/* MODAL USER */}
            {userModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
                        {/* Close Button Absolute */}
                        <button onClick={() => setUserModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-100 rounded-full">
                            <X size={20} />
                        </button>

                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold text-xl text-gray-900">Editar Usuario</h3>
                            <p className="text-sm text-gray-500">Actualiza tus datos personales</p>
                        </div>

                        <form onSubmit={handleUserSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-black focus:border-black transition-all"
                                    value={userForm.nombre || ''}
                                    onChange={e => setUserForm({ ...userForm, nombre: e.target.value })}
                                    placeholder="Tu nombre completo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                                <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-black focus:border-black transition-all"
                                    value={userForm.cedula || ''}
                                    onChange={e => setUserForm({ ...userForm, cedula: e.target.value })}
                                    placeholder="Número de cédula"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                <input className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-500 cursor-not-allowed"
                                    value={currentUser?.email || ''}
                                    disabled
                                />
                                <p className="text-xs text-gray-400 mt-1">El correo no se puede modificar.</p>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setUserModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-medium transition-colors shadow-lg shadow-gray-200">
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL COMPANY */}
            {companyModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
                        <button onClick={() => setCompanyModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-100 rounded-full">
                            <X size={20} />
                        </button>

                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold text-xl text-gray-900">Editar Empresa</h3>
                            <p className="text-sm text-gray-500">Actualiza los datos de facturación</p>
                        </div>

                        <form onSubmit={handleCompanySave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Empresa</label>
                                <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-black focus:border-black transition-all"
                                    value={companyForm.nombre_empresa || ''}
                                    onChange={e => setCompanyForm({ ...companyForm, nombre_empresa: e.target.value })}
                                    placeholder="Nombre comercial"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                                <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-black focus:border-black transition-all"
                                    value={companyForm.ruc || ''}
                                    onChange={e => setCompanyForm({ ...companyForm, ruc: e.target.value })}
                                    placeholder="RUC de la empresa"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <textarea rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-black focus:border-black transition-all"
                                    value={companyForm.direccion || ''}
                                    onChange={e => setCompanyForm({ ...companyForm, direccion: e.target.value })}
                                    placeholder="Dirección completa"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setCompanyModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-medium transition-colors shadow-lg shadow-gray-200">
                                    {loading ? 'Guardando...' : 'Guardar Empresa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
