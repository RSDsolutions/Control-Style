import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { FileText, Download, Filter, Calendar, Search, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// import { format } from 'date-fns'; // We don't have date-fns, use native

// Import types if needed, but we can rely on store types
// import { ... } from '../types';

type ReportType =
    | 'FINANCIERO_REAL'
    | 'TRIBUTARIO'
    | 'INVENTARIO'
    | 'PRODUCCION'
    | 'MERMA'
    | 'ACTIVOS_RECUPERADOS'
    | 'RENTABILIDAD';

export const Auditoria: React.FC = () => {
    // Store Data
    const ordenes = useStore(state => state.ordenes);
    const gastos = useStore(state => state.gastos);
    const inventario = useStore(state => state.inventario);
    const productos = useStore(state => state.productos);
    const movimientos = useStore(state => state.movimientos);
    const pagos = useStore(state => state.pagos);
    const empresa = useStore(state => state.empresa);

    // Local State
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportType, setReportType] = useState<ReportType>('FINANCIERO_REAL');

    // Filters
    const [selectedProducto, setSelectedProducto] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState('');

    // Preview Data
    const [reportData, setReportData] = useState<any[]>([]);
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);

    // Constants
    const REPORT_TYPES: { id: ReportType; label: string; desc: string }[] = [
        { id: 'FINANCIERO_REAL', label: 'Financiero Real', desc: 'Ingresos y gastos reales (incluye no facturado)' },
        { id: 'TRIBUTARIO', label: 'Tributario', desc: 'Solo movimientos con factura (para impuestos)' },
        { id: 'INVENTARIO', label: 'Inventario', desc: 'Stock, costos, y movimientos de material' },
        { id: 'PRODUCCION', label: 'Producción', desc: 'Órdenes, costos y materiales usados' },
        { id: 'MERMA', label: 'Merma y Desperdicio', desc: 'Registro de pérdidas y su impacto' },
        { id: 'ACTIVOS_RECUPERADOS', label: 'Activos Recuperados', desc: 'Trazabilidad de economía circular' },
        { id: 'RENTABILIDAD', label: 'Rentabilidad', desc: 'Margen por producto y utilidad' },
    ];

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);


    // --- GENERATION LOGIC ---
    const handleGenerate = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day

        const isInRange = (dateStr: string) => {
            const d = new Date(dateStr);
            return d >= start && d <= end;
        };

        let data: any[] = [];
        let headers: string[] = [];

        switch (reportType) {
            case 'FINANCIERO_REAL':
                headers = ['Fecha', 'Tipo', 'Descripción', 'Ingreso', 'Egreso', 'Utilidad', 'Estado'];
                // 1. Pagos (Ingresos)
                const ingresos = pagos.filter(p => isInRange(p.fecha)).map(p => ({
                    fecha: p.fecha.split('T')[0],
                    tipo: 'INGRESO',
                    descripcion: `Cobro Orden #${p.orden_id.slice(0, 8)} (${p.metodo_pago})`,
                    ingreso: p.monto,
                    egreso: 0,
                    utilidad: p.monto,
                    estado: p.tiene_factura ? 'Facturado' : 'No Facturado'
                }));
                // 2. Gastos
                const egresos = gastos.filter(g => isInRange(g.fecha)).map(g => ({
                    fecha: g.fecha.split('T')[0],
                    tipo: 'GASTO',
                    descripcion: `${g.categoria} - ${g.nombre}`,
                    ingreso: 0,
                    egreso: g.monto,
                    utilidad: -g.monto,
                    estado: g.tiene_factura ? 'Facturado' : 'No Facturado'
                }));
                data = [...ingresos, ...egresos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                break;

            case 'TRIBUTARIO':
                headers = ['Fecha', 'Comprobante', 'Concepto', 'Base Imponible (+)', 'Gastos Deducibles (-)', 'Impuesto Est.'];
                // Only Facturado
                const ventasFact = pagos.filter(p => isInRange(p.fecha) && p.tiene_factura).map(p => ({
                    fecha: p.fecha.split('T')[0],
                    comprobante: 'Factura Venta',
                    concepto: `Cobro Orden ${p.orden_id.slice(0, 8)}`,
                    base: p.monto,
                    deducible: 0,
                    impuesto: p.monto * 0.15 // Est. IVA 15% (Adjust as needed)
                }));
                const gastosFact = gastos.filter(g => isInRange(g.fecha) && g.tiene_factura).map(g => ({
                    fecha: g.fecha.split('T')[0],
                    comprobante: `Factura prov. ${g.nro_factura || ''}`,
                    concepto: g.categoria,
                    base: 0,
                    deducible: g.monto,
                    impuesto: 0
                }));
                data = [...ventasFact, ...gastosFact].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                break;

            case 'INVENTARIO':
                headers = ['Material', 'Tipo', 'Unidad', 'Stock Actual', 'Costo Promedio', 'Valor Total'];
                data = inventario.map(m => ({
                    material: m.nombre,
                    tipo: m.tipo,
                    unidad: m.unidad_medida,
                    stock: m.cantidad_actual,
                    costo: formatMoney(m.costo_unitario_promedio),
                    valor: formatMoney(m.cantidad_actual * m.costo_unitario_promedio)
                }));
                if (selectedMaterial) {
                    data = data.filter(d => d.material.includes(selectedMaterial));
                }
                break;

            case 'PRODUCCION':
                headers = ['Fecha', 'Orden', 'Producto', 'Cliente', 'Estado', 'Costo Material', 'Precio Venta'];
                data = ordenes.filter(o => isInRange(o.fecha_creacion)).map(o => {
                    const costoMat = o.materiales_usados.reduce((acc, m) => acc + (Number(m.costo_calculado) || 0), 0);
                    return {
                        fecha: o.fecha_creacion.split('T')[0],
                        orden: o.id.slice(0, 8),
                        producto: o.tipo_trabajo,
                        cliente: o.cliente_nombre || 'N/A',
                        estado: o.estado,
                        costo: formatMoney(costoMat),
                        precio: formatMoney(o.precio_venta)
                    };
                });
                break;

            case 'MERMA':
                headers = ['Fecha', 'Material', 'Tipo', 'Cantidad', 'Costo Afectado'];
                data = movimientos.filter(m => m.tipo === 'MERMA' && isInRange(m.fecha)).map(m => {
                    const mat = inventario.find(i => i.id === m.material_id);
                    return {
                        fecha: m.fecha.split('T')[0],
                        material: mat?.nombre || 'Desconocido',
                        tipo: 'Desperdicio',
                        cantidad: m.cantidad,
                        costo: formatMoney(m.costo_total)
                    };
                });
                break;

            case 'ACTIVOS_RECUPERADOS':
                headers = ['Fecha', 'Material', 'Origen', 'Cantidad', 'Valor Estimado'];
                data = movimientos.filter(m => m.tipo === 'INGRESO_ACTIVO' && isInRange(m.fecha)).map(m => {
                    const mat = inventario.find(i => i.id === m.material_id);
                    return {
                        fecha: m.fecha.split('T')[0],
                        material: mat?.nombre || 'Desconocido',
                        origen: m.origen || 'N/A',
                        cantidad: m.cantidad,
                        valor: formatMoney(m.costo_total)
                    };
                });
                break;

            case 'RENTABILIDAD':
                headers = ['Producto', 'Vendidos', 'Ingresos Totales', 'Costo Total', 'Margen ($)', 'Margen (%)'];
                const prodStats: Record<string, any> = {};
                ordenes.filter(o => isInRange(o.fecha_creacion)).forEach(o => {
                    const pid = o.producto_id || o.tipo_trabajo;
                    if (!prodStats[pid]) prodStats[pid] = { name: o.tipo_trabajo, qty: 0, rev: 0, cost: 0 };

                    const costoOrden = o.materiales_usados.reduce((acc, m) => acc + (Number(m.costo_calculado) || 0), 0);
                    prodStats[pid].qty += 1;
                    prodStats[pid].rev += Number(o.precio_venta);
                    prodStats[pid].cost += costoOrden;
                });

                data = Object.values(prodStats).map(p => ({
                    producto: p.name,
                    vendidos: p.qty,
                    ingresos: formatMoney(p.rev),
                    costo: formatMoney(p.cost),
                    margen: formatMoney(p.rev - p.cost),
                    margen_pct: p.rev > 0 ? ((p.rev - p.cost) / p.rev * 100).toFixed(1) + '%' : '0%'
                }));
                break;
        }

        setPreviewHeaders(headers);
        setReportData(data);
    };

    // --- EXPORT LOGIC ---
    const exportPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text(`Reporte de Auditoría: ${REPORT_TYPES.find(r => r.id === reportType)?.label}`, 14, 22);

        doc.setFontSize(11);
        doc.text(`Empresa: ${empresa?.nombre_empresa || 'Mi Empresa'}`, 14, 30);
        doc.text(`Rango: ${startDate} al ${endDate}`, 14, 36);
        doc.text(`Generado por: Usuario Actual`, 14, 42); // Replace with real user if avail

        // Tax Warning
        if (reportType === 'TRIBUTARIO') {
            doc.setTextColor(200, 0, 0);
            doc.setFontSize(10);
            doc.text("ADVERTENCIA: Este reporte incluye únicamente información facturada válida para SRI.", 14, 50);
            doc.setTextColor(0, 0, 0);
        }

        // Table
        const tableColumn = previewHeaders;
        const tableRows = reportData.map(row => Object.values(row));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: reportType === 'TRIBUTARIO' ? 55 : 48,
        });

        doc.save(`reporte_${reportType.toLowerCase()}_${startDate}.pdf`);
    };

    const exportCSV = () => {
        if (reportData.length === 0) return;

        const headers = previewHeaders.join(',');
        const rows = reportData.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_${reportType.toLowerCase()}_${startDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="p-8 h-full overflow-y-auto bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <FileText size={32} className="text-blue-600" />
                    Centro de Auditoría y Reportes
                </h1>
                <p className="text-gray-500 mt-2">Generación de reportes financieros, operativos y tributarios.</p>
            </div>

            {/* Filters Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Range */}
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                        <input
                            type="date"
                            className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                        <input
                            type="date"
                            className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    {/* Report Selection */}
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reporte</label>
                        <select
                            className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as ReportType)}
                        >
                            {REPORT_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.label} - {t.desc}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleGenerate}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                    >
                        <Search size={20} /> Generar Vista Previa
                    </button>
                </div>
            </div>

            {/* Results Section */}
            {reportData.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Vista Previa del Reporte</h3>
                            <p className="text-sm text-gray-500">{reportData.length} registros encontrados</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={exportCSV}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors"
                            >
                                <FileSpreadsheet size={18} /> Excel (CSV)
                            </button>
                            <button
                                onClick={exportPDF}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors"
                            >
                                <Download size={18} /> PDF
                            </button>
                        </div>
                    </div>

                    {reportType === 'TRIBUTARIO' && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-6">
                            <div className="flex">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        Información estrictamente tributaria. Solo se incluyen transacciones con factura válida.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                                <tr>
                                    {previewHeaders.map((h, i) => (
                                        <th key={i} className="p-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reportData.slice(0, 50).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        {Object.values(row).map((val: any, i) => (
                                            <td key={i} className="p-4 text-gray-700 whitespace-nowrap">
                                                {val}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {reportData.length > 50 && (
                            <div className="p-4 text-center text-gray-500 text-sm bg-gray-50 border-t border-gray-100">
                                ... y {reportData.length - 50} registros más (Descargue para ver todo)
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
                    <FileText className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay datos generados</h3>
                    <p className="mt-1 text-sm text-gray-500">Seleccione los filtros y haga clic en "Generar Vista Previa"</p>
                </div>
            )}
        </div>
    );
};
