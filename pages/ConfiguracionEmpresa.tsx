import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Building2, Save } from 'lucide-react';
import { Empresa } from '../types';

export const ConfiguracionEmpresa: React.FC = () => {
    const { empresa, updateEmpresa } = useStore();
    const [form, setForm] = useState<Partial<Empresa>>({
        nombre_empresa: '',
        ruc: '',
        direccion: '',
        cedula_representante: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (empresa) {
            setForm({
                nombre_empresa: empresa.nombre_empresa || '',
                ruc: empresa.ruc || '',
                direccion: empresa.direccion || '',
                cedula_representante: empresa.cedula_representante || ''
            });
        }
    }, [empresa]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await updateEmpresa(form);
        setLoading(false);
        alert('Datos actualizados correctamente');
    };

    if (!empresa) return <div>Cargando datos de empresa...</div>;

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="text-primary" /> Configuración de Empresa
                </h1>
                <p className="text-gray-500">Administra los datos fiscales y generales de tu negocio.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-2xl">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Perfil de Empresa</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                            <input
                                required
                                className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                value={form.nombre_empresa}
                                onChange={e => setForm({ ...form, nombre_empresa: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">R.U.C.</label>
                            <input
                                required
                                className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                value={form.ruc}
                                onChange={e => setForm({ ...form, ruc: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cédula Representante</label>
                            <input
                                required
                                className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                value={form.cedula_representante}
                                onChange={e => setForm({ ...form, cedula_representante: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Matriz</label>
                            <textarea
                                required
                                rows={3}
                                className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                value={form.direccion}
                                onChange={e => setForm({ ...form, direccion: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-black transition-colors flex items-center gap-2 font-medium"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
