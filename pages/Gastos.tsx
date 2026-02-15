import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Receipt, Check, FileText, Calendar, Wallet, Building2, Tag } from 'lucide-react';
import { CategoriaGasto, FrecuenciaGasto, AreaGasto, TipoGasto, GastoOperativo } from '../types';

export const Gastos: React.FC = () => {
    const gastos = useStore(state => state.gastos);
    const registrarGasto = useStore(state => state.registrarGasto);

    const [showModal, setShowModal] = useState(false);

    const initialGastoState: Omit<GastoOperativo, 'id'> = {
        nombre: '',
        categoria: 'Otros',
        monto: 0,
        tipo_gasto: 'Variable',
        fecha: new Date().toISOString().split('T')[0],
        frecuencia: 'Único',
        metodo_pago: 'Efectivo',
        tiene_factura: false,
        area: 'General',
        notas: '',
        proveedor: '',
        ruc_proveedor: '',
        nro_factura: ''
    };

    const [newGasto, setNewGasto] = useState<Omit<GastoOperativo, 'id'>>(initialGastoState);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await registrarGasto(newGasto);
        setShowModal(false);
        setNewGasto(initialGastoState);
    };

    const categorias: CategoriaGasto[] = [
        'Arriendo', 'Servicios Básicos', 'Internet', 'Sueldos',
        'Transporte', 'Mantenimiento', 'Publicidad / Marketing',
        'Insumos Administrativos', 'Equipamiento', 'Software / Suscripciones',
        'Impuestos', 'Honorarios Profesionales', 'Seguridad',
        'Limpieza', 'Logística', 'Otros'
    ];

    const frecuencias: FrecuenciaGasto[] = ['Único', 'Diario', 'Semanal', 'Mensual', 'Trimestral', 'Anual'];
    const areas: AreaGasto[] = ['Producción', 'Administración', 'Ventas', 'Logística', 'Marketing', 'General'];

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gastos Operativos</h1>
                    <p className="text-gray-500">Registro detallado de egresos, control tributario e impacto operativo.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/30"
                >
                    <Plus size={18} /> Registrar Gasto
                </button>
            </div>

            {/* --- ESTADÍSTICAS DE GASTOS --- */}
            {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const prevDate = new Date(currentYear, currentMonth - 1, 1);
                const prevMonth = prevDate.getMonth();
                const prevYear = prevDate.getFullYear();

                const gastosMesActual = gastos.filter(g => {
                    const d = new Date(g.fecha);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const gastosMesAnterior = gastos.filter(g => {
                    const d = new Date(g.fecha);
                    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
                });

                const totalMesActual = gastosMesActual.reduce((acc, g) => acc + Number(g.monto), 0);
                const totalMesAnterior = gastosMesAnterior.reduce((acc, g) => acc + Number(g.monto), 0);
                const totalGeneral = gastos.reduce((acc, g) => acc + Number(g.monto), 0);

                // Top categorias
                const catCount = gastosMesActual.reduce((acc, g) => {
                    acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.monto);
                    return acc;
                }, {} as Record<string, number>);
                const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

                // Factura vs no factura
                const conFactura = gastosMesActual.filter(g => g.tiene_factura);
                const sinFactura = gastosMesActual.filter(g => !g.tiene_factura);
                const montoConFactura = conFactura.reduce((acc, g) => acc + Number(g.monto), 0);
                const montoSinFactura = sinFactura.reduce((acc, g) => acc + Number(g.monto), 0);
                const pctFactura = totalMesActual > 0 ? Math.round((montoConFactura / totalMesActual) * 100) : 0;

                // Fijos vs Variables
                const montoFijos = gastosMesActual.filter(g => g.tipo_gasto === 'Fijo').reduce((acc, g) => acc + Number(g.monto), 0);
                const montoVariables = gastosMesActual.filter(g => g.tipo_gasto === 'Variable').reduce((acc, g) => acc + Number(g.monto), 0);

                // Cambio mes a mes
                const cambio = totalMesAnterior > 0 ? ((totalMesActual - totalMesAnterior) / totalMesAnterior * 100) : 0;
                const mesNombre = now.toLocaleDateString('es-MX', { month: 'long' });

                return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                        {/* Gastos del Mes */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                                    <Wallet className="text-red-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mes Actual</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">${totalMesActual.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1 capitalize">
                                {gastosMesActual.length} gastos en {mesNombre}
                            </p>
                        </div>

                        {/* Top Categorías */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Tag className="text-blue-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Top Categorías</span>
                            </div>
                            <div className="space-y-1">
                                {topCats.length > 0 ? topCats.map(([cat, monto]) => (
                                    <div key={cat} className="flex justify-between text-xs">
                                        <span className="text-gray-600 truncate mr-2">{cat}</span>
                                        <span className="font-bold text-gray-900">${monto.toFixed(0)}</span>
                                    </div>
                                )) : <p className="text-xs text-gray-400">Sin gastos este mes</p>}
                            </div>
                        </div>

                        {/* Control Tributario */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                                    <FileText className="text-green-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tributario</span>
                            </div>
                            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100 mb-2">
                                {montoConFactura > 0 && <div className="bg-green-500" style={{ width: `${pctFactura}%` }}></div>}
                                {montoSinFactura > 0 && <div className="bg-gray-300" style={{ width: `${100 - pctFactura}%` }}></div>}
                            </div>
                            <p className="text-xs text-gray-500">
                                <span className="text-green-600 font-bold">{pctFactura}%</span> con factura (${montoConFactura.toFixed(0)})
                            </p>
                            <p className="text-xs text-gray-400">
                                Sin factura: ${montoSinFactura.toFixed(0)}
                            </p>
                        </div>

                        {/* Fijos vs Variables */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Receipt className="text-purple-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo Gasto</span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">🔒 Fijos</span>
                                    <span className="font-bold text-gray-900">${montoFijos.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">📊 Variables</span>
                                    <span className="font-bold text-gray-900">${montoVariables.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Comparación Mensual */}
                        <div className={`rounded-xl border p-5 shadow-sm ${totalMesAnterior === 0 ? 'bg-gray-50 border-gray-200' :
                                cambio <= 0 ? 'bg-green-50 border-green-200' : cambio <= 20 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                            }`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-white/60 rounded-lg flex items-center justify-center">
                                    <Calendar className={
                                        totalMesAnterior === 0 ? 'text-gray-500' :
                                            cambio <= 0 ? 'text-green-600' : 'text-red-600'
                                    } size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">vs Mes Ant.</span>
                            </div>
                            <p className={`text-2xl font-bold ${totalMesAnterior === 0 ? 'text-gray-600' :
                                    cambio <= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {totalMesAnterior > 0 ? `${cambio > 0 ? '+' : ''}${cambio.toFixed(0)}%` : '—'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {totalMesAnterior > 0
                                    ? `Anterior: $${totalMesAnterior.toFixed(0)}`
                                    : 'Sin datos previos'
                                }
                            </p>
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gastos.map((gasto) => (
                    <div key={gasto.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100">
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-tight">{gasto.nombre}</h3>
                                    <span className="text-xs text-gray-400 font-medium">{gasto.categoria}</span>
                                </div>
                            </div>
                            {gasto.tiene_factura && (
                                <div className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border border-green-100">
                                    <Check size={10} /> SRI
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Frecuencia:</span>
                                <span className="font-medium text-gray-700">{gasto.frecuencia}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Área:</span>
                                <span className="font-medium text-gray-700">{gasto.area}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Tipo:</span>
                                <span className={`font-medium px-1.5 rounded ${gasto.tipo_gasto === 'Fijo' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                    {gasto.tipo_gasto}
                                </span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex justify-between items-end">
                            <div className="text-xs text-gray-400">
                                {gasto.fecha}
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-400 block mb-0.5">{gasto.metodo_pago}</span>
                                <span className="text-xl font-bold text-gray-900">${gasto.monto.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-0 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Wallet className="text-primary" /> Registrar Nuevo Gasto Operativo
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* COLUMNA IZQUIERDA: GENERAL Y FINANCIERO */}
                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Tag size={14} /> Información General
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Gasto</label>
                                                <input className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary" required
                                                    placeholder="Ej: Arriendo Local, Pago Internet"
                                                    value={newGasto.nombre} onChange={e => setNewGasto({ ...newGasto, nombre: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                                <select className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                                    value={newGasto.categoria} onChange={e => setNewGasto({ ...newGasto, categoria: e.target.value as CategoriaGasto })}>
                                                    {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <DollarSignIcon /> Información Financiera
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                                                <input type="number" step="0.01" className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary font-bold" required
                                                    value={newGasto.monto} onChange={e => setNewGasto({ ...newGasto, monto: parseFloat(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Gasto</label>
                                                <select className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                                    value={newGasto.tipo_gasto} onChange={e => setNewGasto({ ...newGasto, tipo_gasto: e.target.value as TipoGasto })}>
                                                    <option value="Fijo">Fijo</option>
                                                    <option value="Variable">Variable</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                                                <select className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                                    value={newGasto.metodo_pago} onChange={e => setNewGasto({ ...newGasto, metodo_pago: e.target.value })}>
                                                    <option value="Efectivo">Efectivo</option>
                                                    <option value="Transferencia">Transferencia Bancaria</option>
                                                    <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                                                    <option value="Cheque">Cheque</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* COLUMNA DERECHA: OPERATIVO Y TRIBUTARIO */}
                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Calendar size={14} /> Información Operativa
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                                <input type="date" className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary" required
                                                    value={newGasto.fecha} onChange={e => setNewGasto({ ...newGasto, fecha: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
                                                <select className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                                    value={newGasto.frecuencia} onChange={e => setNewGasto({ ...newGasto, frecuencia: e.target.value as FrecuenciaGasto })}>
                                                    {frecuencias.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Área Afectada</label>
                                                <select className="w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary"
                                                    value={newGasto.area} onChange={e => setNewGasto({ ...newGasto, area: e.target.value as AreaGasto })}>
                                                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Building2 size={14} /> Información Tributaria
                                        </h4>
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 mb-4">
                                                <input
                                                    type="checkbox"
                                                    id="gastoFactura"
                                                    className="rounded text-primary focus:ring-primary w-4 h-4"
                                                    checked={newGasto.tiene_factura}
                                                    onChange={e => setNewGasto({ ...newGasto, tiene_factura: e.target.checked })}
                                                />
                                                <label htmlFor="gastoFactura" className="text-sm font-bold text-gray-900 cursor-pointer">
                                                    ¿Tiene Factura? (Deducible SRI)
                                                </label>
                                            </div>

                                            {newGasto.tiene_factura && (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Número de Factura</label>
                                                        <input className="w-full text-sm rounded border-gray-300" placeholder="001-001-000000000"
                                                            value={newGasto.nro_factura} onChange={e => setNewGasto({ ...newGasto, nro_factura: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor (Razón Social)</label>
                                                        <input className="w-full text-sm rounded border-gray-300"
                                                            value={newGasto.proveedor} onChange={e => setNewGasto({ ...newGasto, proveedor: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">RUC / ID Proveedor</label>
                                                        <input className="w-full text-sm rounded border-gray-300"
                                                            value={newGasto.ruc_proveedor} onChange={e => setNewGasto({ ...newGasto, ruc_proveedor: e.target.value })} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <FileText size={14} /> Notas Adicionales
                                </h4>
                                <textarea className="w-full rounded-lg border-gray-300 text-sm" rows={2}
                                    placeholder="Detalles adicionales sobre el gasto..."
                                    value={newGasto.notas} onChange={e => setNewGasto({ ...newGasto, notas: e.target.value })} />
                            </div>
                        </form>

                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-bold shadow-lg shadow-primary/30 transition-all transform hover:scale-105">
                                Registrar Gasto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DollarSignIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="1" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
);