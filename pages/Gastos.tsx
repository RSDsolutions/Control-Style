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

    const [activeTab, setActiveTab] = useState<'OPERATIVOS' | 'ACTIVOS'>('OPERATIVOS');

    const categorias: CategoriaGasto[] = [
        'Arriendo', 'Servicios Básicos', 'Internet', 'Sueldos',
        'Transporte', 'Mantenimiento', 'Publicidad / Marketing',
        'Insumos Administrativos', 'Equipamiento', 'Software / Suscripciones',
        'Impuestos', 'Honorarios Profesionales', 'Seguridad',
        'Limpieza', 'Logística', 'Otros', 'Compra Materiales', 'CORRECCION_INVENTARIO'
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

            {/* --- DATA PROCESSING --- */}
            {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // Filter Categories
                const isAsset = (cat: string) => cat === 'Compra Materiales' || cat === 'CORRECCION_INVENTARIO' || cat === 'Equipamiento';

                // DATA SETS
                const gastosOperativos = gastos.filter(g => !isAsset(g.categoria));
                const inversionActivos = gastos.filter(g => isAsset(g.categoria));

                const currentData = activeTab === 'OPERATIVOS' ? gastosOperativos : inversionActivos;

                // STATS (Based on Active Tab to be relevant, or Global? Let's do Global Split)

                const gastOpMes = gastosOperativos.filter(g => {
                    const d = new Date(g.fecha);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const invMes = inversionActivos.filter(g => {
                    const d = new Date(g.fecha);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });

                const totalOpMes = gastOpMes.reduce((acc, g) => acc + Number(g.monto), 0);
                const totalInvMes = invMes.reduce((acc, g) => acc + Number(g.monto), 0);

                // Top Categories (Operativos)
                const catCount = gastOpMes.reduce((acc, g) => {
                    acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.monto);
                    return acc;
                }, {} as Record<string, number>);
                const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

                return (
                    <>
                        {/* KPI CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {/* Card 1: Gasto Operativo Mes */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Wallet size={48} className="text-red-600" />
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                        <Wallet size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-500">Gasto Operativo (Mes)</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">${totalOpMes.toFixed(2)}</p>
                                <p className="text-xs text-gray-400 mt-1">Salidas puras de dinero (No retornables)</p>
                            </div>

                            {/* Card 2: Inversión Activos Mes */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Building2 size={48} className="text-blue-600" />
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                        <Tag size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-500">Inversión / Activos (Mes)</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">${totalInvMes.toFixed(2)}</p>
                                <p className="text-xs text-gray-400 mt-1">Compras de material y equipos (Capitalizable)</p>
                            </div>

                            {/* Card 3: Top Categoria Op */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Top Gastos Operativos</span>
                                </div>
                                <div className="space-y-1">
                                    {topCats.length > 0 ? topCats.map(([cat, monto]) => (
                                        <div key={cat} className="flex justify-between text-xs">
                                            <span className="text-gray-600 truncate">{cat}</span>
                                            <span className="font-bold text-gray-900">${monto.toFixed(0)}</span>
                                        </div>
                                    )) : <span className="text-xs text-gray-300">Sin datos</span>}
                                </div>
                            </div>
                        </div>

                        {/* TABS NAVIGATION */}
                        <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
                            <button
                                onClick={() => setActiveTab('OPERATIVOS')}
                                className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'OPERATIVOS' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <Receipt size={18} /> Gastos Operativos
                            </button>
                            <button
                                onClick={() => setActiveTab('ACTIVOS')}
                                className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'ACTIVOS' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <Building2 size={18} /> Inversión y Activos
                            </button>
                        </div>

                        {/* LIST */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {currentData.length > 0 ? currentData.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((gasto) => (
                                <div key={gasto.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden group hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${activeTab === 'OPERATIVOS' ? 'bg-red-500' : 'bg-blue-600'}`}>
                                                {activeTab === 'OPERATIVOS' ? <Receipt size={20} /> : <Tag size={20} />}
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
                            )) : (
                                <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-400">No hay registros en esta categoría.</p>
                                </div>
                            )}
                        </div>
                    </>
                );
            })()}

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