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
    const [viewingDesign, setViewingDesign] = useState<Diseno | null>(null);

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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDisenos.map((item) => (
                        <div key={item.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 group cursor-pointer"
                            onClick={() => setViewingDesign(item)}
                        >
                            {/* Image Area */}
                            <div className="aspect-video w-full bg-gray-100 relative group-hover:opacity-95 transition-opacity">
                                {item.imagen_url ? (
                                    <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-300 bg-gray-50">
                                        <Palette size={48} strokeWidth={1} />
                                    </div>
                                )}
                                {/* Active Badge overlay */}
                                <div className="absolute top-2 right-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleActivo(item); }}
                                        className={`p-1.5 rounded-full backdrop-blur-md shadow-sm transition-all transform hover:scale-105 ${item.activo ? 'bg-white/90 text-green-600' : 'bg-white/90 text-gray-400 grayscale'}`}
                                        title={item.activo ? 'Activo' : 'Inactivo'}
                                    >
                                        {item.activo ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1" title={item.nombre}>{item.nombre}</h3>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"><Edit size={16} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-medium">{item.tipo_costura}</span>
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full font-medium">{item.tipo_patron}</span>
                                </div>

                                {item.observaciones && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{item.observaciones}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredDisenos.length === 0 && (
                        <div className="col-span-full py-16 text-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Palette className="mx-auto mb-3 text-gray-300" size={48} />
                            <p className="font-medium">No se encontraron diseños que coincidan con la búsqueda.</p>
                        </div>
                    )}
                </div>
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


            {/* DETAIL MODAL */}
            {viewingDesign && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setViewingDesign(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        {/* Image Side */}
                        <div className="md:w-2/3 bg-gray-100 flex items-center justify-center relative overflow-hidden group">
                            {viewingDesign.imagen_url ? (
                                <img src={viewingDesign.imagen_url} alt={viewingDesign.nombre} className="w-full h-full object-contain max-h-[50vh] md:max-h-full" />
                            ) : (
                                <Palette size={80} className="text-gray-300" strokeWidth={1} />
                            )}
                            <button onClick={() => setViewingDesign(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors z-10">
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Details Side */}
                        <div className="md:w-1/3 p-6 md:p-8 flex flex-col h-full overflow-y-auto bg-white border-l border-gray-100 relative">
                            <div className="flex-1 space-y-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 leading-tight mb-4">{viewingDesign.nombre}</h2>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg font-medium text-sm">{viewingDesign.tipo_costura}</span>
                                        <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg font-medium text-sm">{viewingDesign.tipo_patron}</span>
                                        {viewingDesign.activo ? (
                                            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg font-medium text-sm flex items-center gap-1"><CheckCircle2 size={14} /> Activo</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg font-medium text-sm flex items-center gap-1"><XCircle size={14} /> Inactivo</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        Descripción / Detalles
                                    </h3>
                                    <div className="prose prose-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="whitespace-pre-wrap leading-relaxed text-base">
                                            {viewingDesign.observaciones || <span className="text-gray-400 italic">Sin descripción detallada.</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 mt-auto">
                                <button
                                    onClick={() => { setViewingDesign(null); handleOpenModal(viewingDesign); }}
                                    className="w-full bg-gray-900 hover:bg-black text-white px-4 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-gray-900/10 hover:shadow-gray-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <Edit size={20} /> Editar Diseño
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
