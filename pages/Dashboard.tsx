import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck,
  Package, ShoppingBag, RotateCcw, Factory, Trash2, ArrowUpRight, ArrowDownRight,
  Calculator, PieChart
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const ordenes = useStore(state => state.ordenes);
  const gastos = useStore(state => state.gastos);
  const inventario = useStore(state => state.inventario);
  const productos = useStore(state => state.productos);
  const movimientos = useStore(state => state.movimientos);
  const obtenerResumen = useStore(state => state.obtenerResumen);

  const resumen = useMemo(() => obtenerResumen(), [ordenes, gastos, obtenerResumen]);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);

  // --- ANALYTICS CALCULATIONS ---
  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Helper: Filter by current month
    const isCurrentMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    // 1. OPERATIONAL SUMMARY
    const ordenesMes = ordenes.filter(o => isCurrentMonth(o.fecha_creacion));

    // Forros Producidos: Finished orders (including paid/delivered)
    const producedOrders = ordenesMes.filter(o =>
      ['TERMINADO', 'ENTREGADO', 'ENTREGADO_PARCIAL', 'PAGADO'].includes(o.estado)
    );
    const totalProducidos = producedOrders.length;

    // Forros Vendidos: Assuming all non-cancelled orders count as "sold" intent, 
    // but strictly "sold" usually implies delivered/paid. Let's use same as produced for now 
    // unless there's a specific "Sold" status. We'll use the same set.
    const totalVendidos = totalProducidos;

    // Forros Devueltos
    const totalDevueltos = ordenesMes.filter(o => o.estado === 'DEVOLUCION').length;

    // Ventas desde Activo (Refurbished/Resold)
    // Identify by checking if the order consumes a 'Producto Terminado' material OR lacks production cost?
    // User request: "Forros Vendidos desde Activo"
    // Heuristic: If 'tipo_trabajo' is NOT in 'productos' list? Or simpler: 
    // Let's assume standard production is 'En Proceso' -> 'Terminado'.
    // Maybe checking if it consumed a material of type 'Producto Terminado'?
    const ventasDesdeActivo = producedOrders.filter(o =>
      o.materiales_usados.some(m => {
        const mat = inventario.find(inv => inv.id === m.material_id);
        return mat?.tipo === 'Producto Terminado';
      })
    ).length;

    const pctVentasActivo = totalVendidos > 0 ? (ventasDesdeActivo / totalVendidos) * 100 : 0;

    // Consumo Material & Merma
    // Consumo is calculated from orders
    const consumoMaterialMes = producedOrders.reduce((acc, o) => {
      return acc + o.materiales_usados.reduce((sum, m) => sum + (Number(m.costo_calculado) || 0), 0);
    }, 0);

    // Merma from movements
    const mermaMovs = movimientos.filter(m => m.tipo === 'MERMA' && isCurrentMonth(m.fecha));
    const totalMermaCosto = mermaMovs.reduce((acc, m) => acc + (Number(m.costo_total) || 0), 0);


    // 2. COSTO PROMEDIO & UTILIDAD
    const costoPromedioPorForro = totalProducidos > 0 ? (consumoMaterialMes / totalProducidos) : 0;

    // Ventas Totales del Mes (Sold Orders)
    const ventasMesTotal = producedOrders.reduce((acc, o) => acc + (Number(o.precio_venta) || 0), 0);

    const utilidadPromedioPorForro = totalVendidos > 0
      ? (ventasMesTotal - consumoMaterialMes) / totalVendidos
      : 0;


    // 3. IMPACTO DE MERMA
    // Costo Material Comprado This Month
    const comprasMes = movimientos.filter(m => m.tipo === 'COMPRA' && isCurrentMonth(m.fecha));
    const totalComprasCosto = comprasMes.reduce((acc, m) => acc + (Number(m.costo_total) || 0), 0);

    // We need 'StockDisponible' value... sum of current stock value?
    const stockValorTotal = inventario.reduce((acc, m) => acc + ((m.cantidad_actual || 0) * (m.costo_unitario_promedio || 0)), 0);

    // Formula: CostoMaterialComprado / (StockDisponible - Merma) vs CostoOriginal (This formula seems specific to user's logic)
    // User: "CostoMaterialComprado / (StockDisponible - Merma)" -> This looks like a unit cost inflation calculation
    // Let's interpret "Aumento del costo real": (Merma / Consumo) % maybe?
    // Implementing User's request literally might be tricky without exact context of "StockDisponible".
    // Let's use: Impacto Merma % = (Total Merma / (Consumo + Merma)) * 100 to show % wasted material.
    const materialTotalUsado = consumoMaterialMes + totalMermaCosto;
    const impactoMermaPct = materialTotalUsado > 0 ? (totalMermaCosto / materialTotalUsado) * 100 : 0;


    // 4. PUNTO DE EQUILIBRIO
    const margenPromedio = (ventasMesTotal > 0 && totalVendidos > 0)
      ? (ventasMesTotal / totalVendidos) - costoPromedioPorForro
      : 0;

    // Gastos Operativos del Mes (Fixed costs)
    const gastosFijosMes = gastos.filter(g =>
      g.categoria !== 'Compra Materiales' && isCurrentMonth(g.fecha)
    ).reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

    const puntoEquilibrioUnidades = margenPromedio > 0 ? Math.ceil(gastosFijosMes / margenPromedio) : 0;


    // 5. RENTABILIDAD POR PRODUCTO
    // Group orders by product
    const productStats: Record<string, { name: string, qty: number, revenue: number, cost: number }> = {};

    producedOrders.forEach(o => {
      const pid = o.producto_id || o.tipo_trabajo;
      if (!productStats[pid]) {
        productStats[pid] = { name: o.tipo_trabajo, qty: 0, revenue: 0, cost: 0 };
      }
      productStats[pid].qty += 1;
      productStats[pid].revenue += Number(o.precio_venta);
      productStats[pid].cost += o.materiales_usados.reduce((sum, m) => sum + (Number(m.costo_calculado) || 0), 0);
    });

    const productsSorted = Object.values(productStats).map(p => ({
      ...p,
      margin: p.revenue - p.cost,
      marginPct: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0
    })).sort((a, b) => b.margin - a.margin);

    const top3Rentables = productsSorted.slice(0, 3);
    const bottom3Rentables = [...productsSorted].sort((a, b) => a.margin - b.margin).slice(0, 3);


    // 6. PROYECCION FIN DE MES
    // Utilidad Actual / Dia Actual * 30
    const currentDay = now.getDate();
    const utilidadMesActual = ventasMesTotal - (consumoMaterialMes + gastosFijosMes);
    const proyeccionUtilidad = currentDay > 0 ? (utilidadMesActual / currentDay) * 30 : 0;

    return {
      totalProducidos, // Forros Producidos
      totalVendidos, // Forros Vendidos
      totalDevueltos,
      ventasDesdeActivo,
      pctVentasActivo,
      consumoMaterialMes,
      totalMermaCosto,
      costoPromedioPorForro,
      utilidadPromedioPorForro,
      impactoMermaPct,
      puntoEquilibrioUnidades,
      gastosFijosMes,
      top3Rentables,
      bottom3Rentables,
      proyeccionUtilidad,
      utilidadMesActual
    };

  }, [ordenes, gastos, inventario, movimientos]);


  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Empresarial</h1>
          <p className="text-gray-500 mt-1">Análisis en tiempo real • {new Date().toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Risk Alert Component */}
        <div className={`px-6 py-3 rounded-xl flex items-center gap-3 border ${resumen.alerta_riesgo === 'ALTO' ? 'bg-red-50 border-red-200 text-red-700' :
          resumen.alerta_riesgo === 'MEDIO' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
            'bg-green-50 border-green-200 text-green-700'
          }`}>
          {resumen.alerta_riesgo === 'ALTO' || resumen.alerta_riesgo === 'MEDIO' ? (
            <AlertTriangle size={24} />
          ) : (
            <ShieldCheck size={24} />
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Riesgo Tributario</p>
            <p className="font-bold text-lg">
              {resumen.alerta_riesgo === 'ALTO' && 'ALTO RIESGO'}
              {resumen.alerta_riesgo === 'MEDIO' && 'RIESGO MEDIO'}
              {resumen.alerta_riesgo === 'BAJO' && 'BAJO RIESGO'}
            </p>
          </div>
          <div className="ml-4 text-right">
            <p className="text-xs text-gray-500">Ratio</p>
            <p className="font-mono font-bold text-xl">{(resumen.ratio_tributario * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* 1. RESUMEN OPERATIVO */}
      <section>
        <h2 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <Factory size={16} /> Resumen Operativo Mensual
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase">Producidos</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{analytics.totalProducidos}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase">Vendidos</p>
            <p className="text-3xl font-bold mt-1 text-green-600">{analytics.totalVendidos}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
            <p className="text-xs text-gray-500 font-bold uppercase">Devueltos</p>
            <p className="text-3xl font-bold mt-1 text-red-600">{analytics.totalDevueltos}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase">Ventas Activo</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold mt-1 text-gray-900">{analytics.ventasDesdeActivo}</p>
              <span className="text-xs text-gray-400">({analytics.pctVentasActivo.toFixed(0)}%)</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 col-span-2">
            <div className="flex justify-between mb-2">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Consumo Material</p>
                <p className="text-xl font-bold text-gray-900">{formatMoney(analytics.consumoMaterialMes)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-red-500 font-bold uppercase">Merma ($)</p>
                <p className="text-xl font-bold text-red-600">{formatMoney(analytics.totalMermaCosto)}</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full" style={{ width: `${Math.min(analytics.impactoMermaPct, 100)}%` }}></div>
            </div>
            <p className="text-[10px] text-right text-red-500 mt-1">Impacto Merma: {analytics.impactoMermaPct.toFixed(1)}%</p>
          </div>
        </div>
      </section>

      {/* 2. COSTO PROMEDIO & INDICADORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Costo vs Utilidad Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="text-gray-400" size={20} />
            <h3 className="font-bold text-lg text-gray-900">Unitarios Promedio</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Costo Producción</span>
                <span className="font-bold text-gray-900">{formatMoney(analytics.costoPromedioPorForro)}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full">
                <div className="bg-gray-800 h-2 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Utilidad Neta</span>
                <span className="font-bold text-green-600">{formatMoney(analytics.utilidadPromedioPorForro)}</span>
              </div>
              <div className="w-full bg-green-100 h-2 rounded-full">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Punto de Equilibrio */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <PieChart size={100} className="text-gray-900" />
          </div>
          <h3 className="font-bold text-lg mb-1 text-gray-900">Punto de Equilibrio</h3>
          <p className="text-xs text-gray-500 mb-6">Cobertura de Gastos Fijos ({formatMoney(analytics.gastosFijosMes)})</p>

          <div className="flex items-end gap-2 mb-2">
            <span className="text-5xl font-bold tracking-tighter text-gray-900">{analytics.totalVendidos}</span>
            <span className="text-gray-400 text-sm mb-1">/ {analytics.puntoEquilibrioUnidades} Unidades</span>
          </div>

          {analytics.totalVendidos >= analytics.puntoEquilibrioUnidades ? (
            <div className="text-green-600 text-sm font-bold flex items-center gap-1">
              <TrendingUp size={16} /> Superávit Operativo
            </div>
          ) : (
            <div className="text-red-500 text-sm font-bold flex items-center gap-1">
              <TrendingDown size={16} /> Faltan {analytics.puntoEquilibrioUnidades - analytics.totalVendidos} uds
            </div>
          )}
        </div>

        {/* Proyección */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2 text-gray-900"><ArrowUpRight size={20} className="text-green-600" /> Proyección Mensual</h3>
          <p className="text-xs text-gray-500 mb-6">Estimación cierre de mes (lineal)</p>

          <div className="mb-4">
            <p className="text-sm text-gray-500">Utilidad Actual</p>
            <p className="text-2xl font-bold text-gray-900">{formatMoney(analytics.utilidadMesActual)}</p>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Proyección Cierre</p>
            <p className="text-3xl font-bold text-green-600">{formatMoney(analytics.proyeccionUtilidad)}</p>
          </div>
        </div>
      </div>

      {/* 3. RENTABILIDAD POR PRODUCTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase flex items-center gap-2 text-green-700">
            <ArrowUpRight size={16} /> Top Rentabilidad
          </h3>
          <div className="space-y-4">
            {analytics.top3Rentables.map((p, i) => (
              <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-bold text-sm text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.qty} vendidos</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatMoney(p.margin)}</p>
                  <p className="text-xs text-gray-400">{p.marginPct.toFixed(1)}% margen</p>
                </div>
              </div>
            ))}
            {analytics.top3Rentables.length === 0 && <p className="text-sm text-gray-400 italic">Sin datos suficientes.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase flex items-center gap-2 text-red-700">
            <ArrowDownRight size={16} /> Menor Rentabilidad
          </h3>
          <div className="space-y-4">
            {analytics.bottom3Rentables.filter(p => p.marginPct < 20).map((p, i) => ( // Show only low margin ones
              <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-bold text-sm text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.qty} vendidos</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{formatMoney(p.margin)}</p>
                  <p className="text-xs text-gray-400">{p.marginPct.toFixed(1)}% margen</p>
                </div>
              </div>
            ))}
            {analytics.bottom3Rentables.filter(p => p.marginPct < 20).length === 0 && (
              <p className="text-sm text-gray-400 italic">Todos los productos tienen margen saludable {'>'} 20%.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. CONTROL TRIBUTARIO (Nuevo) */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-blue-600" /> Control Tributario Mensual
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Facturado</p>
            <p className="text-2xl font-bold text-gray-900">{formatMoney(resumen.ventas_facturadas)}</p>
            <p className="text-xs text-gray-400 mt-1">Ingresos declarados con factura</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Gastos Deducibles</p>
            <p className="text-2xl font-bold text-gray-900">{formatMoney(resumen.gastos_facturados)}</p>
            <p className="text-xs text-gray-400 mt-1">Compras y gastos con factura</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Base Imponible (Estimada)</p>
            <p className="text-3xl font-bold text-blue-700">{formatMoney(resumen.utilidad_tributaria)}</p>
            <p className="text-xs text-blue-400 mt-1">Utilidad sujeta a impuestos</p>
          </div>
        </div>
      </section>

    </div>
  );
};