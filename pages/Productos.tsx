import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Tag, Trash2, Box } from 'lucide-react';
import { RecetaItem } from '../types';

export const Productos: React.FC = () => {
    const productos = useStore(state => state.productos);
    const inventario = useStore(state => state.inventario);
    const agregarProducto = useStore(state => state.agregarProducto);
    const eliminarProducto = useStore(state => state.eliminarProducto);

    const [showModal, setShowModal] = useState(false);
    const [selectedProducto, setSelectedProducto] = useState<import('../types').Producto | null>(null);

    // Form State
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precioSugerido, setPrecioSugerido] = useState(0);
    const [receta, setReceta] = useState<RecetaItem[]>([]);

    // Recipe Builder State
    const [selectedMatId, setSelectedMatId] = useState('');
    const [cantidadMat, setCantidadMat] = useState(0);

    const calcularCostoEstimado = (items: RecetaItem[]) => {
        return items.reduce((acc, item) => {
            const mat = inventario.find(m => m.id === item.material_id);
            return acc + (mat ? item.cantidad * mat.costo_unitario_promedio : 0);
        }, 0);
    };

    const handleAddIngredient = () => {
        if (!selectedMatId || cantidadMat <= 0) return;

        const exists = receta.find(r => r.material_id === selectedMatId);
        if (exists) {
            setReceta(receta.map(r => r.material_id === selectedMatId ? { ...r, cantidad: r.cantidad + cantidadMat } : r));
        } else {
            setReceta([...receta, { material_id: selectedMatId, cantidad: cantidadMat }]);
        }

        setSelectedMatId('');
        setCantidadMat(0);
    };

    const removeIngredient = (matId: string) => {
        setReceta(receta.filter(r => r.material_id !== matId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await agregarProducto({
            nombre,
            descripcion,
            precio_sugerido: precioSugerido,
            stock: 0,
            receta
        });
        setShowModal(false);
        // Reset
        setNombre(''); setDescripcion(''); setPrecioSugerido(0); setReceta([]);
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Productos (Servicios Fabricados)</h1>
                    <p className="text-gray-500">Defina productos y sus recetas de materiales para automatizar el inventario.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> Nuevo Producto
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {productos.map((prod) => {
                    const costoEstimado = calcularCostoEstimado(prod.receta);
                    const utilidadEstimada = prod.precio_sugerido - costoEstimado;

                    return (
                        <div key={prod.id}
                            onClick={() => setSelectedProducto(prod)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary opacity-5 rounded-bl-full -mr-5 -mt-5"></div>
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-700">
                                    <Tag size={24} />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); eliminarProducto(prod.id); }} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 mb-1">{prod.nombre}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">{prod.descripcion}</p>

                            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Precio Sugerido:</span>
                                    <span className="font-bold text-gray-900">${prod.precio_sugerido.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Costo Materiales:</span>
                                    <span className="font-bold text-red-600">${costoEstimado.toFixed(2)}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 flex justify-between text-sm">
                                    <span className="font-medium text-gray-700">Utilidad Est.:</span>
                                    <span className="font-bold text-green-600">${utilidadEstimada.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Receta ({prod.receta.length} items)</p>
                                <div className="flex flex-wrap gap-1">
                                    {prod.receta.slice(0, 3).map((r, i) => {
                                        const mat = inventario.find(m => m.id === r.material_id);
                                        return (
                                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                                                {mat?.nombre.split(' ')[0]}
                                            </span>
                                        )
                                    })}
                                    {prod.receta.length > 3 && (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                                            +{prod.receta.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Crear Nuevo Producto</h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                                    <input className="w-full rounded-lg border-gray-300" required
                                        value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Forro Asiento Toyota" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Precio Sugerido ($)</label>
                                    <input type="number" step="0.01" className="w-full rounded-lg border-gray-300" required
                                        value={precioSugerido} onChange={e => setPrecioSugerido(parseFloat(e.target.value))} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                                <textarea className="w-full rounded-lg border-gray-300" rows={2}
                                    value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                            </div>

                            {/* Recipe Builder */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Box size={18} /> Receta de Materiales
                                </h4>

                                <div className="flex gap-2 mb-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Material</label>
                                        <select className="w-full text-sm rounded-lg border-gray-300"
                                            value={selectedMatId} onChange={e => setSelectedMatId(e.target.value)}>
                                            <option value="">Seleccionar...</option>
                                            {inventario.map(m => (
                                                <option key={m.id} value={m.id}>{m.nombre} ({m.unidad_medida})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                                        <input type="number" step="0.1" className="w-full text-sm rounded-lg border-gray-300"
                                            value={cantidadMat} onChange={e => setCantidadMat(parseFloat(e.target.value))} />
                                    </div>
                                    <button type="button" onClick={handleAddIngredient}
                                        disabled={!selectedMatId || cantidadMat <= 0}
                                        className="bg-black text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50">
                                        Agregar
                                    </button>
                                </div>

                                {receta.length > 0 ? (
                                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                                        {receta.map((item, idx) => {
                                            const mat = inventario.find(m => m.id === item.material_id);
                                            return (
                                                <li key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200 text-sm">
                                                    <span>{mat?.nombre}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{item.cantidad} {mat?.unidad_medida}</span>
                                                        <button type="button" onClick={() => removeIngredient(item.material_id)} className="text-red-500 hover:text-red-700">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-400 text-center py-2 italic">Sin materiales asignados.</p>
                                )}

                                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Costo Estimado Receta:</span>
                                    <span className="text-lg font-bold text-gray-900">${calcularCostoEstimado(receta).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">Guardar Producto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedProducto && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setSelectedProducto(null)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{selectedProducto.nombre}</h3>
                                <p className="text-gray-500 text-sm mt-1">Detalle del Producto</p>
                            </div>
                            <button onClick={() => setSelectedProducto(null)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="font-bold text-gray-700 mb-2">Descripción</h4>
                                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg text-sm leading-relaxed border border-gray-100">
                                    {selectedProducto.descripcion || "Sin descripción."}
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Box size={16} /> Receta / Materiales
                                </h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                            <tr>
                                                <th className="px-3 py-2">Material</th>
                                                <th className="px-3 py-2 text-right">Cant.</th>
                                                <th className="px-3 py-2 text-right">Costo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedProducto.receta.map((item, idx) => {
                                                const mat = inventario.find(m => m.id === item.material_id);
                                                const costo = mat ? item.cantidad * mat.costo_unitario_promedio : 0;
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 text-gray-800">{mat?.nombre || 'Desconocido'}</td>
                                                        <td className="px-3 py-2 text-right text-gray-600">{item.cantidad} {mat?.unidad_medida}</td>
                                                        <td className="px-3 py-2 text-right font-medium text-gray-700">${costo.toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-bold text-gray-900 border-t">
                                            <tr>
                                                <td className="px-3 py-2" colSpan={2}>Costo Total Estimado</td>
                                                <td className="px-3 py-2 text-right text-red-600">${calcularCostoEstimado(selectedProducto.receta).toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase font-bold tracking-wider">Precio Sugerido</span>
                                    <span className="text-xl font-bold text-gray-900">${selectedProducto.precio_sugerido.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase font-bold tracking-wider">Utilidad Estimada</span>
                                    <span className="text-xl font-bold text-green-600">
                                        ${(selectedProducto.precio_sugerido - calcularCostoEstimado(selectedProducto.receta)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setSelectedProducto(null)} className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};