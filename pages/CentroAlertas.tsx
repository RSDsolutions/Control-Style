import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Alerta, PrioridadAlerta, TipoAlerta } from '../types';
import {
    AlertTriangle,
    TrendingDown,
    TrendingUp,
    DollarSign,
    Package,
    AlertCircle,
    Activity,
    FileText,
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

export const CentroAlertas: React.FC = () => {
    const { obtenerAlertas, inventario, ordenes, gastos, productos, pagos } = useStore();
    const [alertas, setAlertas] = useState<Alerta[]>([]);

    useEffect(() => {
        // Recalculate alerts whenever data changes
        setAlertas(obtenerAlertas());
    }, [inventario, ordenes, gastos, productos, pagos, obtenerAlertas]);

    // Extract the projection alert separately for the permanent card
    const proyeccionAlerta = alertas.find(a => a.id?.startsWith('proyeccion-utilidad-'));
    const otrasAlertas = alertas.filter(a => !a.id?.startsWith('proyeccion-utilidad-'));

    // Parse projection data safely
    const proyeccion = useMemo(() => {
        if (!proyeccionAlerta) return null;
        try {
            return JSON.parse(proyeccionAlerta.mensaje);
        } catch {
            return null;
        }
    }, [proyeccionAlerta]);

    const getIcon = (tipo: TipoAlerta) => {
        switch (tipo) {
            case 'INVENTARIO': return <Package className="w-6 h-6" />;
            case 'FINANCIERO': return <DollarSign className="w-6 h-6" />;
            case 'OPERATIVO': return <Activity className="w-6 h-6" />;
            case 'TRIBUTARIO': return <FileText className="w-6 h-6" />;
            default: return <AlertCircle className="w-6 h-6" />;
        }
    };

    const getColorClass = (prioridad: PrioridadAlerta) => {
        switch (prioridad) {
            case 'ALTA': return 'border-l-4 border-red-500 bg-red-50';
            case 'MEDIA': return 'border-l-4 border-yellow-500 bg-yellow-50';
            case 'BAJA': return 'border-l-4 border-gray-500 bg-gray-50';
            default: return 'bg-white';
        }
    };

    const getTextColorClass = (prioridad: PrioridadAlerta) => {
        switch (prioridad) {
            case 'ALTA': return 'text-red-700';
            case 'MEDIA': return 'text-yellow-700';
            case 'BAJA': return 'text-gray-700';
            default: return 'text-gray-900';
        }
    };

    const mesActual = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

    return (
        <div className="p-6 max-w-7xl mx-auto h-full overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                    Centro de Alertas
                </h1>
                <p className="text-gray-600 mt-2">
                    Monitoreo inteligente de situaciones críticas del negocio.
                </p>
            </div>

            {/* ====== TARJETA PROYECCIÓN DE UTILIDAD (SIEMPRE VISIBLE) ====== */}
            {proyeccion && (
                <div className="mb-8">
                    <div className={`rounded-2xl shadow-lg border-2 overflow-hidden ${proyeccion.utilidadProyectada >= proyeccion.utilidadRealMesAnterior || proyeccion.utilidadRealMesAnterior <= 0
                            ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                            : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
                        }`}>
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${proyeccion.utilidadProyectada >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                                    }`}>
                                    <Calendar className={proyeccion.utilidadProyectada >= 0 ? 'text-emerald-600' : 'text-red-600'} size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">📅 Proyección de Utilidad Mensual</h2>
                                    <p className="text-sm text-gray-500 capitalize">{mesActual} — Día {proyeccion.diasTranscurridos} de {proyeccion.diasTotalesMes}</p>
                                </div>
                            </div>
                            {proyeccion.utilidadRealMesAnterior > 0 && (
                                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${proyeccion.utilidadProyectada >= proyeccion.utilidadRealMesAnterior
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                    {proyeccion.utilidadProyectada >= proyeccion.utilidadRealMesAnterior
                                        ? <><ArrowUpRight size={16} /> Mejorando</>
                                        : <><ArrowDownRight size={16} /> Bajando</>
                                    }
                                </div>
                            )}
                        </div>

                        {/* Main number */}
                        <div className="px-6 pb-4">
                            <div className="text-center py-4">
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Utilidad Proyectada al Fin de Mes</p>
                                <p className={`text-5xl font-extrabold tracking-tight ${proyeccion.utilidadProyectada >= 0 ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                    ${proyeccion.utilidadProyectada.toFixed(2)}
                                </p>
                                {proyeccion.utilidadRealMesAnterior > 0 && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Mes anterior: <strong>${proyeccion.utilidadRealMesAnterior.toFixed(2)}</strong>
                                        {' '}
                                        <span className={
                                            proyeccion.utilidadProyectada >= proyeccion.utilidadRealMesAnterior ? 'text-green-600' : 'text-red-600'
                                        }>
                                            ({proyeccion.utilidadRealMesAnterior > 0
                                                ? `${((proyeccion.utilidadProyectada - proyeccion.utilidadRealMesAnterior) / proyeccion.utilidadRealMesAnterior * 100).toFixed(1)}%`
                                                : '—'
                                            })
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Breakdown stats */}
                        <div className="px-6 pb-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-white/50">
                                    <p className="text-xs text-gray-500 font-medium mb-1">💰 Ingresos Cobrados</p>
                                    <p className="text-lg font-bold text-gray-900">${proyeccion.ingresosMesActual.toFixed(2)}</p>
                                </div>
                                <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-white/50">
                                    <p className="text-xs text-gray-500 font-medium mb-1">🏭 Costos Producción</p>
                                    <p className="text-lg font-bold text-orange-600">${proyeccion.costosProduccionMes.toFixed(2)}</p>
                                </div>
                                <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-white/50">
                                    <p className="text-xs text-gray-500 font-medium mb-1">📋 Gastos Operativos</p>
                                    <p className="text-lg font-bold text-red-600">${proyeccion.gastosOperativosMes.toFixed(2)}</p>
                                </div>
                                <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-white/50">
                                    <p className="text-xs text-gray-500 font-medium mb-1">📈 Utilidad Actual</p>
                                    <p className={`text-lg font-bold ${proyeccion.utilidadActualMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ${proyeccion.utilidadActualMes.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 bg-white/50 rounded-lg p-3 text-xs text-gray-500">
                                <strong>Fórmula:</strong> Promedio diario (${proyeccion.promedioDiario.toFixed(2)}/día) × {proyeccion.diasTotalesMes} días = Proyección
                            </div>
                        </div>

                        {/* Alert banner if projection is below previous month */}
                        {proyeccion.utilidadRealMesAnterior > 0 && proyeccion.utilidadProyectada < proyeccion.utilidadRealMesAnterior && (
                            <div className="bg-red-100 border-t border-red-200 px-6 py-4 flex items-center gap-3">
                                <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                                <div>
                                    <p className="text-sm font-bold text-red-800">⚠️ La utilidad proyectada es menor al mes anterior</p>
                                    <p className="text-xs text-red-600">
                                        Proyección: ${proyeccion.utilidadProyectada.toFixed(2)} vs Mes anterior: ${proyeccion.utilidadRealMesAnterior.toFixed(2)}
                                        {' — '}Diferencia: ${(proyeccion.utilidadProyectada - proyeccion.utilidadRealMesAnterior).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ====== OTRAS ALERTAS ====== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otrasAlertas.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900">Todo en orden</h3>
                        <p className="text-gray-500">No se han detectado alertas en este momento.</p>
                    </div>
                ) : (
                    otrasAlertas.map((alerta) => (
                        <div
                            key={alerta.id}
                            className={`rounded-lg shadow-sm p-6 transition-all hover:shadow-md ${getColorClass(alerta.prioridad)}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-full bg-white/50 ${getTextColorClass(alerta.prioridad)}`}>
                                    {getIcon(alerta.tipo)}
                                </div>
                                <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wider ${alerta.prioridad === 'ALTA' ? 'bg-red-100 text-red-700' :
                                    alerta.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {alerta.prioridad}
                                </span>
                            </div>

                            <h3 className={`text-lg font-bold mb-2 ${getTextColorClass(alerta.prioridad)}`}>
                                {alerta.titulo}
                            </h3>

                            <p className="text-gray-600 font-medium">
                                {alerta.mensaje}
                            </p>

                            <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center text-xs text-gray-500">
                                <span>{alerta.tipo}</span>
                                <span>{new Date(alerta.fecha_generacion).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    );
}

export default CentroAlertas;
