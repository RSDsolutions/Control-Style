import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';

export const Dashboard: React.FC = () => {
  // Subscribe to specific state slices to trigger re-renders only when data changes
  const ordenes = useStore(state => state.ordenes);
  const gastos = useStore(state => state.gastos);
  const obtenerResumen = useStore(state => state.obtenerResumen);
  
  // Calculate summary only when dependencies change.
  // We call obtenerResumen() here, which uses get() internally to access the latest state.
  // The dependencies [ordenes, gastos] ensure this recalculates and the component 
  // has re-rendered whenever the underlying data updates.
  const resumen = useMemo(() => obtenerResumen(), [ordenes, gastos, obtenerResumen]);
  
  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resumen Financiero</h1>
          <p className="text-gray-500 mt-1">Panorama Real vs. Control Tributario (SRI)</p>
        </div>
        
        {/* Risk Alert Component */}
        <div className={`px-6 py-3 rounded-xl flex items-center gap-3 border ${
          resumen.alerta_riesgo === 'ALTO' ? 'bg-red-50 border-red-200 text-red-700' :
          resumen.alerta_riesgo === 'MEDIO' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
          'bg-green-50 border-green-200 text-green-700'
        }`}>
          {resumen.alerta_riesgo === 'ALTO' || resumen.alerta_riesgo === 'MEDIO' ? (
            <AlertTriangle size={24} />
          ) : (
            <ShieldCheck size={24} />
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Nivel de Riesgo Tributario</p>
            <p className="font-bold text-lg">
              {resumen.alerta_riesgo === 'ALTO' && 'ALTO RIESGO TRIBUTARIO'}
              {resumen.alerta_riesgo === 'MEDIO' && 'RIESGO TRIBUTARIO MEDIO'}
              {resumen.alerta_riesgo === 'BAJO' && 'BAJO RIESGO'}
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="text-xs text-gray-500">Ratio Gastos/Ventas</p>
            <p className="font-mono font-bold text-xl">{(resumen.ratio_tributario * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Real Control Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-900 opacity-5 rounded-bl-full -mr-10 -mt-10"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gray-900 rounded-lg text-white">
              <TrendingUp size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Control Financiero Real</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(resumen.ventas_totales)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Gastos + Costos</p>
              <p className="text-2xl font-bold text-red-600">
                {formatMoney(resumen.gastos_operativos_totales + resumen.consumo_materiales_total)}
              </p>
            </div>
            <div className="col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Utilidad Real Neta</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{formatMoney(resumen.utilidad_real)}</p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <DollarSign size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Tax Control Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-bl-full -mr-10 -mt-10"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary rounded-lg text-white">
              <TrendingDown size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Control Tributario (SRI)</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Ventas Facturadas</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(resumen.ventas_facturadas)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Gastos Deducibles</p>
              <p className="text-2xl font-bold text-red-600">{formatMoney(resumen.gastos_facturados)}</p>
            </div>
            <div className="col-span-2 bg-red-50 p-4 rounded-xl border border-red-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Base Imponible Estimada</p>
                <p className="text-3xl font-bold text-primary mt-1">{formatMoney(resumen.utilidad_tributaria)}</p>
              </div>
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                <DollarSign size={20} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Breakdown Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800">Desglose de Egresos</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4">Operativo (Costos Fijos)</h4>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Total</span>
                    <span className="font-bold">{formatMoney(resumen.gastos_operativos_totales)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                    <div className="bg-gray-800 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Con Factura (Deducible)</span>
                    <span className="text-gray-900 font-medium">
                        {formatMoney(gastos.filter(g=>g.tiene_factura).reduce((a,b)=>a+b.monto,0))}
                    </span>
                </div>
            </div>
            <div className="p-6">
                <h4 className="text-sm font-semibold text-primary uppercase mb-4">Consumo Materiales (Variable)</h4>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Total Consumido</span>
                    <span className="font-bold">{formatMoney(resumen.consumo_materiales_total)}</span>
                </div>
                <div className="w-full bg-red-100 rounded-full h-2 mb-4">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">En Ordenes Facturadas (Deducible)</span>
                    <span className="text-gray-900 font-medium">
                        {formatMoney(resumen.gastos_facturados - gastos.filter(g=>g.tiene_factura).reduce((a,b)=>a+b.monto,0))}
                    </span>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};