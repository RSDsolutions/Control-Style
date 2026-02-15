import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Search, Archive, Package, DollarSign, FileText, Calendar, Building2, Calculator, CheckCircle2 } from 'lucide-react';
import { TipoMaterial, UnidadMedida, Material } from '../types';

export const Inventario: React.FC = () => {
    const inventario = useStore(state => state.inventario);
    const movimientos = useStore(state => state.movimientos);
    const registrarCompraMaterial = useStore(state => state.registrarCompraMaterial);
    const agregarMaterial = useStore(state => state.agregarMaterial);
    const registrarGasto = useStore(state => state.registrarGasto);
    const registrarMerma = useStore(state => state.registrarMerma);

    const [showModal, setShowModal] = useState(false);

    // Initial Form State
    const initialFormState = {
        mode: 'NEW' as 'NEW' | 'EXISTING' | 'MERMA', // Added MERMA

        // Material Info
        materialId: '', // For EXISTING / MERMA
        nombre: '', // For NEW
        tipo: 'Otro' as TipoMaterial, // For NEW
        unidad: 'Unidad' as UnidadMedida, // For NEW

        // Entry Info
        cantidad: 0,
        costoTotal: 0,
        costoUnitarioCalculado: 0,

        // Tax Info
        tieneFactura: false,
        nroFactura: '',
        proveedor: '',
        rucProveedor: '',

        // Additional Info
        fechaCompra: new Date().toISOString().split('T')[0],
        metodoPago: 'Efectivo',
        observaciones: ''
    };

    const [form, setForm] = useState(initialFormState);

    // Auto-calculate Unit Cost
    useEffect(() => {
        if (form.cantidad > 0) {
            setForm(prev => ({
                ...prev,
                costoUnitarioCalculado: prev.costoTotal / prev.cantidad
            }));
        } else {
            setForm(prev => ({ ...prev, costoUnitarioCalculado: 0 }));
        }
    }, [form.cantidad, form.costoTotal]);

    const handleOpenModal = (mode: 'NEW' | 'EXISTING' | 'MERMA', materialId: string = '') => {
        setForm({
            ...initialFormState,
            mode,
            materialId
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.cantidad <= 0 && form.mode !== 'MERMA') { // Merma quantity handled differently? No, merma needs qty > 0 too.
            // Actually, check logic below.
        }

        if (form.mode === 'MERMA') {
            if (form.cantidad <= 0) {
                alert("La cantidad de merma debe ser mayor a 0");
                return;
            }
            await registrarMerma(form.materialId, form.cantidad);
            setShowModal(false);
            return;
        }

        if (form.cantidad <= 0 || form.costoTotal <= 0) {
            alert("La cantidad y el costo deben ser mayores a 0.");
            return;
        }

        let currentMaterialId = form.materialId;

        // 1. Handle New Material Creation
        if (form.mode === 'NEW') {
            // Create with 0 stock initially, then add via purchase to ensure movement log
            const newMaterial = await agregarMaterial({
                nombre: form.nombre,
                tipo: form.tipo,
                unidad_medida: form.unidad,
                costo_unitario_promedio: 0,
                cantidad_actual: 0,
                stock_minimo: 0 // Default value
            });

            if (!newMaterial) return; // Error handled in store
            currentMaterialId = newMaterial.id;
        }

        // 2. Register Purchase (Updates Stock, Cost Avg, and logs Movement)
        if (currentMaterialId) {
            await registrarCompraMaterial(currentMaterialId, form.cantidad, form.costoTotal);
        }

        // 3. Register Expense (Restored for Cash Flow visibility)
        await registrarGasto({
            nombre: `Compra Material: ${form.mode === 'NEW' ? form.nombre : 'Stock Adicional'}`,
            monto: form.costoTotal,
            fecha: form.fechaCompra,
            categoria: 'Compra Materiales',
            tiene_factura: form.tieneFactura,
            metodo_pago: form.metodoPago,
            nro_factura: form.nroFactura,
            proveedor: form.proveedor,
            ruc_proveedor: form.rucProveedor,
            frecuencia: 'Único',
            tipo_gasto: 'Variable',
            area: 'Producción',
            notas: form.observaciones
        });

        setShowModal(false);
    };

    const tipoOpciones: TipoMaterial[] = ['Cuero', 'Cuero sintético', 'Tela', 'Espuma', 'Hilo', 'Pegamento', 'PVC', 'Alcántara', 'Vinil', 'Otro'];
    const unidadOpciones: UnidadMedida[] = ['Metro', 'Unidad', 'Litro', 'Rollo', 'Par', 'Kilogramo', 'Hoja', 'Galón'];

    // Helper to get age and merma status
    const getMaterialInfo = (material: Material) => {
        const hasMerma = movimientos.some(m => m.material_id === material.id && m.tipo === 'MERMA');

        let ageLabel = 'N/A';
        let isNew = false;

        if (material.created_at) {
            const created = new Date(material.created_at);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 30) {
                ageLabel = `${diffDays} días`;
                isNew = true;
            } else {
                const months = Math.floor(diffDays / 30);
                ageLabel = `${months} meses`;
            }
        }

        return { hasMerma, ageLabel, isNew };
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventario de Materiales</h1>
                    <p className="text-gray-500">Gestión de stock, compras y cálculo de costos.</p>
                </div>
                <button
                    onClick={() => handleOpenModal('NEW')}
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-gray-900/20">
                    <Plus size={18} /> Añadir Material
                </button>
            </div>

            {/* --- ESTADÍSTICAS DEL INVENTARIO --- */}
            {(() => {
                const totalMateriales = inventario.length;
                const costoTotal = inventario.reduce((acc, m) => acc + (m.cantidad_actual * m.costo_unitario_promedio), 0);
                const costoPromedioMaterial = totalMateriales > 0 ? costoTotal / totalMateriales : 0;
                const stockTotal = inventario.reduce((acc, m) => acc + m.cantidad_actual, 0);
                const materialesConMerma = inventario.filter(m =>
                    movimientos.some(mov => mov.material_id === m.id && mov.tipo === 'MERMA')
                ).length;
                const materialesSinStock = inventario.filter(m => m.cantidad_actual <= 0).length;
                const materialesBajoStock = inventario.filter(m => m.cantidad_actual > 0 && m.cantidad_actual <= 5).length;

                // Inventory health: 100% = all items have stock, penalty for low/zero stock and merma
                const healthScore = totalMateriales > 0
                    ? Math.max(0, Math.round(((totalMateriales - materialesSinStock - materialesBajoStock * 0.5 - materialesConMerma * 0.3) / totalMateriales) * 100))
                    : 0;
                const healthColor = healthScore >= 80 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600';
                const healthBg = healthScore >= 80 ? 'bg-green-50 border-green-200' : healthScore >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
                const healthLabel = healthScore >= 80 ? '✅ Saludable' : healthScore >= 50 ? '⚠️ Atención' : '🔴 Crítico';

                // Types breakdown
                const tiposCount = inventario.reduce((acc, m) => {
                    acc[m.tipo] = (acc[m.tipo] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const topTipos = Object.entries(tiposCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

                return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                        {/* Total Materiales */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Package className="text-blue-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Materiales</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{totalMateriales}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {topTipos.map(([tipo, count]) => `${tipo} (${count})`).join(', ')}
                            </p>
                        </div>

                        {/* Costo Total del Inventario */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="text-green-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Costo Inventario</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">${costoTotal.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Promedio: ${costoPromedioMaterial.toFixed(2)} / material
                            </p>
                        </div>

                        {/* Stock Total */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Archive className="text-purple-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stock Total</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stockTotal.toFixed(1)}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {materialesSinStock > 0
                                    ? <span className="text-red-500 font-medium">{materialesSinStock} sin stock</span>
                                    : 'Todos con stock'
                                }
                            </p>
                        </div>

                        {/* Mermas */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                                    <FileText className="text-red-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Con Merma</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{materialesConMerma}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {materialesConMerma > 0
                                    ? <span className="text-orange-500">{((materialesConMerma / totalMateriales) * 100).toFixed(0)}% del inventario</span>
                                    : '✅ Sin mermas reportadas'
                                }
                            </p>
                        </div>

                        {/* Estado del Inventario */}
                        <div className={`rounded-xl border p-5 shadow-sm ${healthBg}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-white/60 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className={healthColor} size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</span>
                            </div>
                            <p className={`text-2xl font-bold ${healthColor}`}>{healthScore}%</p>
                            <p className="text-xs text-gray-500 mt-1">{healthLabel}</p>
                        </div>
                    </div>
                );
            })()}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Material</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Antigüedad</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Stock</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Costo Promedio (Unitario)</th>
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total Invertido</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {inventario.map((item) => {
                            const { hasMerma, ageLabel, isNew } = getMaterialInfo(item);
                            return (
                                <tr key={item.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {item.nombre}
                                        <div className="text-xs text-gray-500">{item.tipo}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${isNew ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {ageLabel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {hasMerma ? (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                                                Con Merma
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">
                                                Normal
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">
                                        {item.cantidad_actual.toFixed(2)} <span className="text-xs text-gray-400">{item.unidad_medida}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-blue-600 font-bold">
                                        ${item.costo_unitario_promedio.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                        ${(item.cantidad_actual * item.costo_unitario_promedio).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenModal('EXISTING', item.id)}
                                            className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                                        >
                                            + Comprar
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal('MERMA', item.id)}
                                            className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                                        >
                                            Reportar Merma
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODAL UNIFICADO: AGREGAR MATERIAL / COMPRA / MERMA */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className={`p-6 border-b border-gray-200 flex justify-between items-center ${form.mode === 'MERMA' ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <h3 className={`text-xl font-bold flex items-center gap-2 ${form.mode === 'MERMA' ? 'text-red-800' : 'text-gray-900'}`}>
                                    <Package className={form.mode === 'MERMA' ? 'text-red-600' : 'text-primary'} />
                                    {form.mode === 'NEW' ? 'Registrar Nuevo Material' :
                                        form.mode === 'EXISTING' ? 'Ingreso de Material Existente' : 'Reportar Merma (Pérdida)'}
                                </h3>
                                {form.mode !== 'MERMA' && (
                                    <div className="bg-white border border-gray-300 rounded-lg p-1 flex text-sm">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, mode: 'NEW' })}
                                            className={`px-3 py-1.5 rounded-md font-medium transition-all ${form.mode === 'NEW' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            Material Nuevo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, mode: 'EXISTING' })}
                                            className={`px-3 py-1.5 rounded-md font-medium transition-all ${form.mode === 'EXISTING' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            Material Existente
                                        </button>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 flex-1">
                                {/* MERMA MODE: SIMPLE FORM */}
                                {form.mode === 'MERMA' ? (
                                    <div className="max-w-xl mx-auto space-y-6">
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                                            <p className="font-bold flex items-center gap-2"><CheckCircle2 size={16} /> Información de Merma:</p>
                                            <p className="mt-1">
                                                Al reportar merma, el stock físico se reducirá pero el <strong>Costo Total Invertido</strong> se mantendrá.
                                                Esto causará que el <strong>Costo Unitario</strong> del material restante AUMENTE automáticamente.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Material a dar de Baja</label>
                                            <select className="w-full rounded-lg border-gray-300 bg-gray-50 font-medium" required
                                                value={form.materialId} onChange={e => setForm({ ...form, materialId: e.target.value })}>
                                                <option value="">-- Seleccionar --</option>
                                                {inventario.map(m => (
                                                    <option key={m.id} value={m.id}>{m.nombre} (Stock: {m.cantidad_actual})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Perdida / Dañada</label>
                                            <input type="number" step="0.1" className="w-full rounded-lg border-gray-300 focus:ring-red-500 focus:border-red-500 font-bold text-red-600 text-lg" required
                                                placeholder="0.00"
                                                value={form.cantidad || ''} onChange={e => setForm({ ...form, cantidad: parseFloat(e.target.value) })} />
                                            <p className="text-xs text-gray-500 mt-1">Esta cantidad se restará del inventario.</p>
                                        </div>
                                    </div>
                                ) : (
                                    /* NORMAL MODE (NEW / EXISTING) */
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* COLUMNA IZQUIERDA: DETALLES Y COSTOS */}
                                        <div className="space-y-6">
                                            <section>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Archive size={14} /> Información del Material
                                                </h4>

                                                {form.mode === 'NEW' ? (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Material</label>
                                                            <input className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary" required
                                                                placeholder="Ej: Cuero sintético negro"
                                                                value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                                                <select className="w-full rounded-lg border-gray-300"
                                                                    value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoMaterial })}>
                                                                    {tipoOpciones.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                                                                <select className="w-full rounded-lg border-gray-300"
                                                                    value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value as UnidadMedida })}>
                                                                    {unidadOpciones.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Material</label>
                                                        <select className="w-full rounded-lg border-gray-300 bg-gray-50 font-medium" required
                                                            value={form.materialId} onChange={e => setForm({ ...form, materialId: e.target.value })}>
                                                            <option value="">-- Seleccionar del Inventario --</option>
                                                            {inventario.map(m => (
                                                                <option key={m.id} value={m.id}>{m.nombre} (Stock: {m.cantidad_actual} {m.unidad_medida})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </section>

                                            <section className="pt-4 border-t border-gray-100">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <DollarSign size={14} /> Información de Ingreso
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Ingresada</label>
                                                        <input type="number" step="0.1" className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary font-bold" required
                                                            value={form.cantidad || ''} onChange={e => setForm({ ...form, cantidad: parseFloat(e.target.value) })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Costo Total Compra ($)</label>
                                                        <input type="number" step="0.01" className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary font-bold" required
                                                            value={form.costoTotal || ''} onChange={e => setForm({ ...form, costoTotal: parseFloat(e.target.value) })} />
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-between text-sm pt-2 border-t border-blue-200">
                                                        <span className="flex items-center gap-1 text-blue-700">
                                                            <Calculator size={14} /> Costo Unitario Calculado:
                                                        </span>
                                                        <span className="font-mono font-bold text-blue-900 text-lg">
                                                            ${form.costoUnitarioCalculado.toFixed(2)} <span className="text-xs font-normal opacity-70">/unidad</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        {/* COLUMNA DERECHA: TRIBUTARIO Y ADICIONAL */}
                                        <div className="space-y-6">
                                            <section>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Building2 size={14} /> Información Tributaria
                                                </h4>
                                                <div className={`p-4 rounded-lg border transition-all ${form.tieneFactura ? 'bg-white border-primary ring-1 ring-primary' : 'bg-gray-50 border-gray-200'}`}>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <input
                                                            type="checkbox"
                                                            id="hasInvoice"
                                                            className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
                                                            checked={form.tieneFactura}
                                                            onChange={e => setForm({ ...form, tieneFactura: e.target.checked })}
                                                        />
                                                        <label htmlFor="hasInvoice" className="font-bold text-gray-900 cursor-pointer select-none">
                                                            ¿Tiene Factura?
                                                        </label>
                                                        {form.tieneFactura && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Deducible SRI</span>}
                                                    </div>

                                                    {form.tieneFactura && (
                                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Número de Factura</label>
                                                                <input className="w-full text-sm rounded border-gray-300" placeholder="001-001-000000000"
                                                                    value={form.nroFactura} onChange={e => setForm({ ...form, nroFactura: e.target.value })} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del Proveedor</label>
                                                                <input className="w-full text-sm rounded border-gray-300"
                                                                    value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">RUC del Proveedor</label>
                                                                <input className="w-full text-sm rounded border-gray-300"
                                                                    value={form.rucProveedor} onChange={e => setForm({ ...form, rucProveedor: e.target.value })} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </section>

                                            <section className="pt-4 border-t border-gray-100">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Calendar size={14} /> Información Adicional
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Compra</label>
                                                        <input type="date" className="w-full rounded-lg border-gray-300"
                                                            value={form.fechaCompra} onChange={e => setForm({ ...form, fechaCompra: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                                                        <select className="w-full rounded-lg border-gray-300"
                                                            value={form.metodoPago} onChange={e => setForm({ ...form, metodoPago: e.target.value })}>
                                                            <option value="Efectivo">Efectivo</option>
                                                            <option value="Transferencia">Transferencia</option>
                                                            <option value="Tarjeta">Tarjeta</option>
                                                            <option value="Crédito">Crédito</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                                        <textarea className="w-full rounded-lg border-gray-300 text-sm" rows={2}
                                                            placeholder="Detalles adicionales..."
                                                            value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                )}

                                {form.mode !== 'MERMA' && (
                                    <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-xs text-yellow-800 flex gap-2">
                                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Acciones Automáticas:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                                                <li>Se actualizará el stock y se recalculará el costo promedio ponderado.</li>
                                                <li>Se registrará automáticamente un <strong>Gasto Operativo</strong> por ${form.costoTotal.toFixed(2)}.</li>
                                                {form.tieneFactura && <li>El gasto se marcará como <strong>Deducible</strong> para el Control Tributario.</li>}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </form>

                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className={`px-6 py-2 rounded-lg hover:shadow-lg font-bold transition-all transform hover:scale-105 ${form.mode === 'MERMA' ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20' : 'bg-gray-900 text-white hover:bg-black shadow-gray-900/20'}`}
                                    disabled={form.cantidad <= 0 || (form.mode !== 'MERMA' && form.costoTotal <= 0)}
                                >
                                    {form.mode === 'MERMA' ? 'Confirmar Pérdida' : 'Guardar y Registrar Gasto'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};