import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Diseno, TipoCostura, TipoPatron } from '../types';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Search, Palette } from 'lucide-react';

export const Disenos: React.FC = () => {
    const { disenos, agregarDiseno, editarDiseno, eliminarDiseno } = useStore();
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const initialFormState: Omit<Diseno, 'id' | 'created_at' | 'empresa_id'> = {
        nombre: '',
        tipo_costura: 'Recta',
        tipo_patron: 'Liso',
        imagen_url: null,
        observaciones: '',
        activo: true
    };

    const [form, setForm] = useState(initialFormState);

    const tipoCosturaOptions: TipoCostura[] = ['Recta', 'Diamante', 'Panal', 'Horizontal', 'Vertical', 'Personalizado'];
    const tipoPatronOptions: TipoPatron[] = ['Liso', 'Acolchado', 'Perforado', 'Mixto'];

    const filteredDisenos = disenos.filter(d =>
        d.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (diseno?: Diseno) => {
        setFile(null);
        if (diseno) {
            setEditingId(diseno.id);
            setForm({
                nombre: diseno.nombre,
                tipo_costura: diseno.tipo_costura,
                tipo_patron: diseno.tipo_patron,
                imagen_url: diseno.imagen_url,
                observaciones: diseno.observaciones || '',
                activo: diseno.activo
            });
        } else {
            setEditingId(null);
            setForm(initialFormState);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = form.imagen_url;

            if (file) {
                // We need the empresaId to upload. 
                // Since generic `uploadDesignImage` takes empresaId, we can get it from store or just pass a placeholder if service handles it?
                // `designService` needs `empresaId`. 
                // `useStore` has `empresaId`. 
                // I should probably expose an upload action in store or just use the service and get empresaid from store.
                // Accessing store state non-hook way: `useStore.getState().empresaId`
                const empresaId = useStore.getState().empresaId;
                if (empresaId) {
                    // Need to import designService
                    const { designService } = await import('../services/designService');
                    imageUrl = await designService.uploadDesignImage(file, empresaId);
                }
            }

            const disenoData = { ...form, imagen_url: imageUrl };

            if (editingId) {
                await editarDiseno(editingId, disenoData);
            } else {
                await agregarDiseno(disenoData);
            }
            setShowModal(false);
        } catch (error) {
            console.error("Error saving design:", error);
            alert("Error al guardar diseño");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este diseño?')) {
            await eliminarDiseno(id);
        }
    };

    const toggleActivo = async (diseno: Diseno) => {
        await editarDiseno(diseno.id, { activo: !diseno.activo });
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Palette className="text-primary" /> Diseños
                    </h1>
                    <p className="text-gray-500">Catálogo de estilos y acabados para forros.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-gray-900/20">
                    <Plus size={18} /> Nuevo Diseño
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar diseños..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Costura</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Patrón</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Imagen</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Estado</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredDisenos.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {item.nombre}
                                    {item.observaciones && (
                                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{item.observaciones}</p>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-600">{item.tipo_costura}</td>
                                <td className="px-6 py-4 text-gray-600">{item.tipo_patron}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {item.imagen_url ? (
                                        <img src={item.imagen_url} alt={item.nombre} className="w-12 h-12 rounded object-cover border border-gray-200" />
                                    ) : (
                                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                                            <Palette size={20} />
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => toggleActivo(item)}
                                        className={`transition-colors ${item.activo ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
                                        title={item.activo ? 'Desactivar' : 'Activar'}
                                    >
                                        {item.activo ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button
                                        onClick={() => handleOpenModal(item)}
                                        className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredDisenos.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No se encontraron diseños.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingId ? 'Editar Diseño' : 'Nuevo Diseño'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Diseño</label>
                                <input
                                    required
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                    placeholder="Ej: Deportivo Premium"
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Costura</label>
                                    <select
                                        className="w-full rounded-lg border-gray-300"
                                        value={form.tipo_costura}
                                        onChange={e => setForm({ ...form, tipo_costura: e.target.value as TipoCostura })}
                                    >
                                        {tipoCosturaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Patrón</label>
                                    <select
                                        className="w-full rounded-lg border-gray-300"
                                        value={form.tipo_patron}
                                        onChange={e => setForm({ ...form, tipo_patron: e.target.value as TipoPatron })}
                                    >
                                        {tipoPatronOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del Diseño</label>
                                <div className="flex items-center gap-4">
                                    {form.imagen_url && !file && (
                                        <img src={form.imagen_url} alt="Preview" className="w-16 h-16 rounded object-cover border border-gray-200" />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-violet-50 file:text-violet-700
                                            hover:file:bg-violet-100"
                                        onChange={e => {
                                            if (e.target.files && e.target.files[0]) {
                                                setFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (Opcional)</label>
                                <textarea
                                    className="w-full rounded-lg border-gray-300"
                                    rows={3}
                                    placeholder="Detalles adicionales..."
                                    value={form.observaciones}
                                    onChange={e => setForm({ ...form, observaciones: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={form.activo}
                                        onChange={e => setForm({ ...form, activo: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-700">Diseño Activo</span>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {uploading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Diseño')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
