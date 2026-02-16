import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Plus, ChevronDown, Package, AlertTriangle, Building2, FileText, Printer, User, Palette, PenTool, DollarSign, Clock, Trash2, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react';
import { EstadoOrden, TipoComprobante, OrdenTrabajo, MetodoPago } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Ordenes: React.FC = () => {
    const ordenes = useStore(state => state.ordenes);
    const inventario = useStore(state => state.inventario);
    const productos = useStore(state => state.productos);
    const disenos = useStore(state => state.disenos);

    const crearOrdenConProducto = useStore(state => state.crearOrdenConProducto);
    const cambiarEstadoOrden = useStore(state => state.cambiarEstadoOrden);
    const registrarPago = useStore(state => state.registrarPago);
    const eliminarOrden = useStore(state => state.eliminarOrden);
    const cancelarOrden = useStore(state => state.cancelarOrden);
    const pagos = useStore(state => state.pagos);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    // Sort orders by date to determine sequential numbers client-side
    const sortedOrdenes = useMemo(() => {
        return [...ordenes].sort((a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime());
    }, [ordenes]);

    const getOrderNumber = (ordenId: string) => {
        const index = sortedOrdenes.findIndex(o => o.id === ordenId);
        return String(index + 1).padStart(9, '0');
    };

    // --- FORM STATE ---
    // 1. Datos Generales
    const [cliente, setCliente] = useState(''); // Keep for listing, maybe auto-fill from detail
    const [vehiculo, setVehiculo] = useState('');
    const [selectedProductoId, setSelectedProductoId] = useState('');
    const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('FACTURA');

    // 2. Diseño
    const [designId, setDesignId] = useState('');

    // 3. Cliente Detalle
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteCedula, setClienteCedula] = useState('');
    const [clienteTelefono, setClienteTelefono] = useState('');
    const [clienteDireccion, setClienteDireccion] = useState('');

    // 4. Personalización
    const [colorMaterialPrincipal, setColorMaterialPrincipal] = useState('');
    const [colorMaterialSecundario, setColorMaterialSecundario] = useState('');
    const [tipoCosturaPrincipal, setTipoCosturaPrincipal] = useState('');
    const [tipoCosturaSecundario, setTipoCosturaSecundario] = useState('');
    const [colorCosturaPrincipal, setColorCosturaPrincipal] = useState('');
    const [colorCosturaSecundario, setColorCosturaSecundario] = useState('');

    // 5. Financiero
    const [precioVenta, setPrecioVenta] = useState(0);
    const [abono, setAbono] = useState(0);

    // 6. Notas
    const [notas, setNotas] = useState('');

    // --- PAYMENT MODAL STATE ---
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentOrdenId, setPaymentOrdenId] = useState<string | null>(null);
    const [paymentMonto, setPaymentMonto] = useState(0);
    const [paymentMetodo, setPaymentMetodo] = useState<MetodoPago>('Efectivo');
    const [paymentFactura, setPaymentFactura] = useState(false);
    const [paymentNotas, setPaymentNotas] = useState('');

    // --- DELETE MODAL STATE ---
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteOrdenId, setDeleteOrdenId] = useState<string | null>(null);
    const [deleteMotivo, setDeleteMotivo] = useState('');
    const [deleteType, setDeleteType] = useState<'devolucion' | 'fabricacion' | 'datos' | null>(null);


    // Computed
    const selectedProducto = useMemo(() => productos.find(p => p.id === selectedProductoId), [selectedProductoId, productos]);
    const saldoPendiente = precioVenta - abono;

    // Reset Form
    const resetForm = () => {
        setCliente(''); setVehiculo(''); setSelectedProductoId('');
        setDesignId('');
        setClienteNombre(''); setClienteCedula(''); setClienteTelefono(''); setClienteDireccion('');
        setColorMaterialPrincipal(''); setColorMaterialSecundario('');
        setTipoCosturaPrincipal(''); setTipoCosturaSecundario('');
        setColorCosturaPrincipal(''); setColorCosturaSecundario('');
        setPrecioVenta(0); setAbono(0);
        setNotas('');
    };

    const handleProductoChange = (id: string) => {
        // Enforce string
        const safeId = String(id);
        setSelectedProductoId(safeId);

        const prod = productos.find(p => String(p.id) === safeId);
        if (prod) {
            setPrecioVenta(prod.precio_sugerido);
        }
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductoId) return;

        // Combine Client Name for the main list view
        const clienteDisplay = clienteNombre || cliente;

        const nuevaOrden: Partial<OrdenTrabajo> = {
            cliente: clienteDisplay,
            vehiculo,
            precio_venta: precioVenta,
            anticipo: abono, // Backend expects 'anticipo'
            saldo: saldoPendiente,
            tipo_comprobante: tipoComprobante,

            // New Fields
            design_id: designId,
            cliente_nombre: clienteNombre,
            cliente_cedula: clienteCedula,
            cliente_telefono: clienteTelefono,
            cliente_direccion: clienteDireccion,

            color_material_principal: colorMaterialPrincipal,
            color_material_secundario: colorMaterialSecundario,
            tipo_costura_principal: tipoCosturaPrincipal,
            tipo_costura_secundario: tipoCosturaSecundario,
            color_costura_principal: colorCosturaPrincipal,
            color_costura_secundario: colorCosturaSecundario,

            abono: abono,
            notas: notas
        };

        const success = await crearOrdenConProducto(nuevaOrden as any, selectedProductoId);

        if (success) {
            setShowCreateModal(false);
            resetForm();
        }
    };

    // Helper: load image URL as base64 data URL (avoids CORS issues with jsPDF)
    const loadImageAsBase64 = (url: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    const generatePDF = async (orden: OrdenTrabajo) => {
        const empresa = useStore.getState().empresa;
        const diseno = disenos.find(d => d.id === orden.design_id);
        const orderNum = getOrderNumber(orden.id);

        const doc = new jsPDF();

        // --- LOGO (top-left) ---
        let logoAdded = false;
        if (empresa?.logo_url) {
            const base64 = await loadImageAsBase64(empresa.logo_url);
            if (base64) {
                try {
                    doc.addImage(base64, 'PNG', 10, 8, 40, 20); // Horizontal Logo
                    logoAdded = true;
                } catch (e) {
                    console.warn('Logo could not be added:', e);
                }
            }
        }

        // --- HEADER (company info, shifted right if logo present) ---
        const textX = logoAdded ? 120 : 105;
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(empresa?.nombre_empresa || 'Empresa', textX, 18, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`RUC: ${empresa?.ruc || 'N/A'}`, textX, 24, { align: 'center' });
        doc.text(`Dirección: ${empresa?.direccion || 'N/A'}`, textX, 29, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(10, 36, 200, 36);

        // --- TITLE ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTA DE VENTA', 105, 46, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Orden: #${orderNum}`, 105, 53, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date(orden.fecha_creacion).toLocaleDateString()}`, 105, 59, { align: 'center' });

        // --- CLIENT DATA ---
        doc.setFillColor(240, 240, 240);
        doc.rect(10, 65, 190, 8, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL CLIENTE', 15, 71);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const startY = 80;
        doc.text(`Cliente: ${orden.cliente_nombre || orden.cliente}`, 15, startY);
        doc.text(`Cédula/RUC: ${orden.cliente_cedula || 'N/A'}`, 110, startY);
        doc.text(`Teléfono: ${orden.cliente_telefono || 'N/A'}`, 15, startY + 6);
        doc.text(`Dirección: ${orden.cliente_direccion || 'N/A'}`, 110, startY + 6);
        doc.text(`Vehículo: ${orden.vehiculo}`, 15, startY + 12);

        // --- JOB DETAILS ---
        doc.setFillColor(240, 240, 240);
        doc.rect(10, 105, 190, 8, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLE DEL TRABAJO', 15, 111);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        let y = 120;
        doc.text(`Producto: ${orden.tipo_trabajo}`, 15, y);
        doc.text(`Diseño: ${diseno?.nombre || 'Estándar'}`, 110, y);
        y += 8;

        // Customization Table
        const tableData = [
            ['Material Principal', orden.color_material_principal || 'N/A', 'Material Secundario', orden.color_material_secundario || 'N/A'],
            ['Costura Principal', `${orden.tipo_costura_principal || ''} ${orden.color_costura_principal || ''}`.trim() || 'N/A', 'Costura Secundaria', `${orden.tipo_costura_secundario || ''} ${orden.color_costura_secundario || ''}`.trim() || 'N/A']
        ];

        autoTable(doc, {
            startY: y,
            head: [['Zona', 'Detalle', 'Zona', 'Detalle']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50] },
            styles: { fontSize: 9 }
        });

        // --- NOTES + FINANCIALS ---
        // @ts-ignore
        y = doc.lastAutoTable.finalY + 12;

        // Notes (left side)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Notas:', 15, y);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(orden.notas || 'Sin notas adicionales.', 80);
        doc.text(splitNotes, 15, y + 5);

        // Financials (right side, using autoTable for clean alignment)
        const totalVal = Number(orden.precio_venta).toFixed(2);
        const abonoVal = Number(orden.abono || orden.anticipo).toFixed(2);

        // Logic for Paid orders: Show the balance that was paid off
        let saldoVal = Number(orden.saldo).toFixed(2); // Default
        let saldoLabel = 'SALDO:';
        let isPaid = orden.estado === 'PAGADO';

        if (isPaid) {
            const theoreticalSaldo = Number(orden.precio_venta) - Number(orden.abono || orden.anticipo);
            saldoVal = theoreticalSaldo.toFixed(2);
            saldoLabel = 'SALDO (PAGADO):';
        }

        autoTable(doc, {
            startY: y - 3,
            margin: { left: 130 },
            head: [],
            body: [
                ['TOTAL:', `$${totalVal}`],
                ['ABONO:', `$${abonoVal}`],
                [saldoLabel, `$${saldoVal}`],
            ],
            theme: 'plain',
            styles: { fontSize: 11, fontStyle: 'bold', cellPadding: 1.5 },
            columnStyles: {
                0: { halign: 'right', cellWidth: 40 }, // Increased width for longer label
                1: { halign: 'right', cellWidth: 30 },
            },
            didParseCell: (data: any) => {
                if (data.row.index === 2) {
                    if (isPaid) {
                        data.cell.styles.textColor = [0, 128, 0]; // Green
                    } else {
                        data.cell.styles.textColor = [200, 0, 0]; // Red
                    }
                }
            }
        });

        // Footer
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('Generado por Carsuit System', 105, 280, { align: 'center' });

        doc.save(`NotaVenta_${orderNum}.pdf`);
    };

    // --- PAYMENT HANDLERS ---
    const openPaymentModal = (orden: OrdenTrabajo) => {
        setPaymentOrdenId(orden.id);
        // Always register the FULL sale value into financial control
        setPaymentMonto(Number(orden.precio_venta));
        setPaymentMetodo('Efectivo');
        setPaymentFactura(false);
        setPaymentNotas('');
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async () => {
        if (!paymentOrdenId) return;
        const success = await registrarPago(paymentOrdenId, {
            monto: paymentMonto,
            metodo_pago: paymentMetodo,
            tiene_factura: paymentFactura,
            notas: paymentNotas || undefined
        });
        if (success) {
            setShowPaymentModal(false);
            setPaymentOrdenId(null);
        }
    };

    const handleEstadoChange = (orden: OrdenTrabajo, nuevoEstado: string) => {
        if (nuevoEstado === 'PAGADO') {
            openPaymentModal(orden);
        } else {
            cambiarEstadoOrden(orden.id, nuevoEstado as EstadoOrden);
        }
    };

    const estadoLabel = (estado: string) => {
        const labels: Record<string, string> = {
            'EN_PROCESO': '🟡 En Proceso',
            'TERMINADO': '🔵 Terminado',
            'ENTREGADO': '🟣 Entregado',
            'ENTREGADO_PARCIAL': '🟠 Pago Parcial',
            'PAGADO': '🟢 Pagado',
            'DEVOLUCION': '🔴 Devolución',
            'CANCELADO_FABRICACION': '🔴 Error Fabricación'
        };
        return labels[estado] || estado;
    };

    const estadoColor = (estado: string) => {
        const colors: Record<string, string> = {
            'EN_PROCESO': 'bg-yellow-100 text-yellow-700',
            'TERMINADO': 'bg-blue-100 text-blue-700',
            'ENTREGADO': 'bg-purple-100 text-purple-700',
            'ENTREGADO_PARCIAL': 'bg-orange-100 text-orange-700',
            'PAGADO': 'bg-green-100 text-green-700',
            'DEVOLUCION': 'bg-red-100 text-red-700',
            'CANCELADO_FABRICACION': 'bg-red-100 text-red-700'
        };
        return colors[estado] || 'bg-gray-100 text-gray-700';
    };

    const getOrdenPagos = (ordenId: string) => pagos.filter(p => p.orden_id === ordenId);

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
                    <p className="text-gray-500">Gestión de trabajos, personalización y entregas.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/30 transition-all"
                >
                    <Plus size={18} /> Nueva Orden
                </button>
            </div>

            {/* --- ESTADÍSTICAS DE ÓRDENES --- */}
            {(() => {
                const totalOrdenes = ordenes.length;
                const ventasTotales = ordenes.reduce((acc, o) => acc + Number(o.precio_venta), 0);
                const promedioOrden = totalOrdenes > 0 ? ventasTotales / totalOrdenes : 0;

                const enProceso = ordenes.filter(o => o.estado === 'EN_PROCESO').length;
                const terminadas = ordenes.filter(o => o.estado === 'TERMINADO').length;
                const pagadas = ordenes.filter(o => o.estado === 'PAGADO').length;
                const parciales = ordenes.filter(o => o.estado === 'ENTREGADO_PARCIAL').length;
                const canceladas = ordenes.filter(o => o.estado === 'DEVOLUCION' || o.estado === 'CANCELADO_FABRICACION').length;

                const totalCobrado = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
                const saldoPendienteTotal = ordenes
                    .filter(o => o.estado !== 'DEVOLUCION' && o.estado !== 'CANCELADO_FABRICACION')
                    .reduce((acc, o) => acc + Number(o.saldo), 0);
                const tasaCobro = ventasTotales > 0 ? Math.round((totalCobrado / ventasTotales) * 100) : 0;

                return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                        {/* Total Órdenes */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="text-blue-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Órdenes</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{totalOrdenes}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {enProceso > 0 && <span className="text-yellow-600">{enProceso} en proceso</span>}
                                {enProceso > 0 && terminadas > 0 && ' · '}
                                {terminadas > 0 && <span className="text-blue-600">{terminadas} terminadas</span>}
                            </p>
                        </div>

                        {/* Ventas Totales */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="text-green-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ventas Totales</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">${ventasTotales.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1">Promedio: ${promedioOrden.toFixed(2)}</p>
                        </div>

                        {/* Cobrado */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="text-emerald-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cobrado</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600">${totalCobrado.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {saldoPendienteTotal > 0
                                    ? <span className="text-orange-500">Pendiente: ${saldoPendienteTotal.toFixed(2)}</span>
                                    : '✅ Todo cobrado'
                                }
                            </p>
                        </div>

                        {/* Estado de Órdenes Visual */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <BarChart3 className="text-purple-600" size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Por Estado</span>
                            </div>
                            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
                                {enProceso > 0 && <div className="bg-yellow-400" style={{ width: `${(enProceso / totalOrdenes) * 100}%` }} title={`En Proceso: ${enProceso}`}></div>}
                                {terminadas > 0 && <div className="bg-blue-400" style={{ width: `${(terminadas / totalOrdenes) * 100}%` }} title={`Terminadas: ${terminadas}`}></div>}
                                {parciales > 0 && <div className="bg-orange-400" style={{ width: `${(parciales / totalOrdenes) * 100}%` }} title={`Parciales: ${parciales}`}></div>}
                                {pagadas > 0 && <div className="bg-green-500" style={{ width: `${(pagadas / totalOrdenes) * 100}%` }} title={`Pagadas: ${pagadas}`}></div>}
                                {canceladas > 0 && <div className="bg-red-400" style={{ width: `${(canceladas / totalOrdenes) * 100}%` }} title={`Canceladas: ${canceladas}`}></div>}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[10px] text-gray-500">
                                {enProceso > 0 && <span>🟡 {enProceso}</span>}
                                {terminadas > 0 && <span>🔵 {terminadas}</span>}
                                {parciales > 0 && <span>🟠 {parciales}</span>}
                                {pagadas > 0 && <span>🟢 {pagadas}</span>}
                                {canceladas > 0 && <span>🔴 {canceladas}</span>}
                            </div>
                        </div>

                        {/* Tasa de Cobro */}
                        <div className={`rounded-xl border p-5 shadow-sm ${tasaCobro >= 80 ? 'bg-green-50 border-green-200' : tasaCobro >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                            }`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 bg-white/60 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className={tasaCobro >= 80 ? 'text-green-600' : tasaCobro >= 50 ? 'text-yellow-600' : 'text-red-600'} size={18} />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tasa Cobro</span>
                            </div>
                            <p className={`text-2xl font-bold ${tasaCobro >= 80 ? 'text-green-600' : tasaCobro >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{tasaCobro}%</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {pagadas} de {totalOrdenes} pagadas
                            </p>
                        </div>
                    </div>
                );
            })()}

            <div className="space-y-4">
                {ordenes.map((orden) => (
                    <div key={orden.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Header Row */}
                        <div className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedOrderId(expandedOrderId === orden.id ? null : orden.id)}>
                            {/* ... Same ID/Status Block ... */}
                            <div className="flex items-center gap-4 min-w-[200px]">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${estadoColor(orden.estado)}`}>
                                    {getOrderNumber(orden.id).slice(-3)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{orden.cliente_nombre || orden.cliente}</h3>
                                    <p className="text-xs text-gray-400">#{getOrderNumber(orden.id)}</p>
                                    <p className="text-xs text-gray-500">{orden.vehiculo}</p>
                                </div>
                            </div>

                            {/* Product */}
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 uppercase font-bold">Trabajo</span>
                                <span className="text-sm font-medium">{orden.tipo_trabajo}</span>
                            </div>

                            {/* Status Badge */}
                            <div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${estadoColor(orden.estado)}`}>
                                    {estadoLabel(orden.estado)}
                                </span>
                            </div>

                            {/* Financials */}
                            <div className="flex flex-col text-right">
                                <span className="text-xs text-gray-400 uppercase font-bold">Saldo</span>
                                <span className={`text-sm font-bold ${Number(orden.saldo) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    ${Number(orden.saldo).toFixed(2)}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => generatePDF(orden)}
                                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Descargar Nota de Venta"
                                >
                                    <Printer size={18} />
                                </button>

                                {orden.estado !== 'DEVOLUCION' && orden.estado !== 'CANCELADO_FABRICACION' && (
                                    <button
                                        onClick={() => {
                                            setDeleteOrdenId(orden.id);
                                            setDeleteMotivo('');
                                            setDeleteType(null);
                                            setShowDeleteModal(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Cancelar / Eliminar Orden"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}

                                {/* Single progressive button */}
                                {orden.estado === 'EN_PROCESO' && (
                                    <button
                                        onClick={() => handleEstadoChange(orden, 'TERMINADO')}
                                        className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        ✅ Marcar Terminado
                                    </button>
                                )}
                                {orden.estado === 'TERMINADO' && (
                                    <button
                                        onClick={() => openPaymentModal(orden)}
                                        className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
                                    >
                                        <DollarSign size={16} /> Registrar Pago
                                    </button>
                                )}
                                {orden.estado === 'ENTREGADO_PARCIAL' && (
                                    <button
                                        onClick={() => openPaymentModal(orden)}
                                        className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2"
                                    >
                                        <DollarSign size={16} /> Completar Pago
                                    </button>
                                )}
                                {orden.estado === 'PAGADO' && (
                                    <span className="px-4 py-2 text-sm font-bold rounded-lg bg-green-100 text-green-700 flex items-center gap-2">
                                        ✅ Pagado
                                    </span>
                                )}
                                {(orden.estado === 'DEVOLUCION' || orden.estado === 'CANCELADO_FABRICACION') && (
                                    <span className="px-4 py-2 text-sm font-bold rounded-lg bg-red-100 text-red-700 flex items-center gap-2">
                                        {estadoLabel(orden.estado)}
                                    </span>
                                )}

                                <ChevronDown size={20} className={`text-gray-400 transition-transform ${expandedOrderId === orden.id ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {/* Details */}
                        {expandedOrderId === orden.id && (
                            <div className="bg-gray-50 p-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left: Client & Job Details */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2"><User size={16} /> Información Cliente</h4>
                                    <div className="text-sm text-gray-600 grid grid-cols-2 gap-2 bg-white p-4 rounded-lg border border-gray-200">
                                        <div><span className="font-semibold block">Nombre:</span> {orden.cliente_nombre || orden.cliente}</div>
                                        <div><span className="font-semibold block">Cédula:</span> {orden.cliente_cedula || '-'}</div>
                                        <div><span className="font-semibold block">Teléfono:</span> {orden.cliente_telefono || '-'}</div>
                                        <div><span className="font-semibold block">Dirección:</span> {orden.cliente_direccion || '-'}</div>
                                        <div className="col-span-2 mt-2 pt-2 border-t border-gray-100 italic">
                                            "{orden.notas || 'Sin notas'}"
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-gray-800 flex items-center gap-2 mt-6"><Palette size={16} /> Personalización</h4>
                                    <div className="text-sm text-gray-600 bg-white p-4 rounded-lg border border-gray-200 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><span className="font-semibold text-xs uppercase text-gray-400">Material Principal</span><p>{orden.color_material_principal || '-'}</p></div>
                                            <div><span className="font-semibold text-xs uppercase text-gray-400">Material Secundario</span><p>{orden.color_material_secundario || '-'}</p></div>
                                            <div><span className="font-semibold text-xs uppercase text-gray-400">Costura Principal</span><p>{orden.tipo_costura_principal} - {orden.color_costura_principal}</p></div>
                                            <div><span className="font-semibold text-xs uppercase text-gray-400">Costura Secundaria</span><p>{orden.tipo_costura_secundario} - {orden.color_costura_secundario}</p></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Materials, Costs & Payment History */}
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Package size={18} /> Materiales Consumidos
                                    </h4>
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-gray-500">Material</th>
                                                    <th className="px-4 py-2 text-right text-gray-500">Cant.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {orden.materiales_usados.map((item, idx) => {
                                                    const mat = inventario.find(m => m.id === item.material_id);
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-2">{mat?.nombre}</td>
                                                            <td className="px-4 py-2 text-right">{item.cantidad} {mat?.unidad_medida}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex justify-between items-center">
                                        <span className="font-bold text-green-800">Total a Pagar</span>
                                        <span className="font-bold text-xl text-green-700">${Number(orden.precio_venta).toFixed(2)}</span>
                                    </div>
                                    <div className="mt-2 flex justify-between text-sm px-2">
                                        <span>Abonado: <span className="font-bold">${Number(orden.abono || orden.anticipo).toFixed(2)}</span></span>
                                        <span className={Number(orden.saldo) > 0 ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>
                                            Pendiente: ${Number(orden.saldo).toFixed(2)}
                                        </span>
                                    </div>

                                    {/* PAYMENT HISTORY */}
                                    {getOrdenPagos(orden.id).length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <Clock size={16} /> Historial de Pagos
                                            </h4>
                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-gray-500">Fecha</th>
                                                            <th className="px-3 py-2 text-left text-gray-500">Método</th>
                                                            <th className="px-3 py-2 text-center text-gray-500">Factura</th>
                                                            <th className="px-3 py-2 text-right text-gray-500">Monto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {getOrdenPagos(orden.id).map(pago => (
                                                            <tr key={pago.id}>
                                                                <td className="px-3 py-2">{new Date(pago.fecha).toLocaleDateString()}</td>
                                                                <td className="px-3 py-2">{pago.metodo_pago}</td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${pago.tiene_factura ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                        {pago.tiene_factura ? 'Sí' : 'No'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-bold text-green-600">${Number(pago.monto).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* --- MODAL NUEVA ORDEN --- */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">Nueva Orden de Trabajo</h3>
                                <p className="text-sm text-gray-500">Complete todos los detalles para generar la orden.</p>
                            </div>
                            <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrder} className="p-6 space-y-8">

                            {/* 1. SELECCIÓN DE PRODUCTO Y DISEÑO */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">1. Producto y Diseño</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Producto a Fabricar </label>
                                        <select className="w-full rounded-lg border-gray-300 focus:ring-black focus:border-black" required
                                            value={selectedProductoId}
                                            onChange={e => {
                                                console.log("Selected Product ID:", e.target.value);
                                                handleProductoChange(e.target.value);
                                            }}
                                        >
                                            <option value="">Seleccionar Producto...</option>
                                            {productos.map(p => (
                                                <option key={p.id} value={String(p.id)}>{p.nombre} (${p.precio_sugerido})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Diseño</label>
                                        <select className="w-full rounded-lg border-gray-300 focus:ring-black focus:border-black"
                                            value={designId} onChange={e => setDesignId(e.target.value)}>
                                            <option value="">Estándar / Sin Diseño Específico</option>
                                            {disenos.map(d => (
                                                <option key={d.id} value={d.id}>{d.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo (Marca/Modelo/Año)</label>
                                        <input className="w-full rounded-lg border-gray-300" required placeholder="Ej: Toyota Hilux 2024"
                                            value={vehiculo} onChange={e => setVehiculo(e.target.value)} />
                                    </div>
                                </div>
                            </section>

                            {/* 2. DATOS DEL CLIENTE */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">2. Datos del Cliente</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                        <input className="w-full rounded-lg border-gray-300" required placeholder="Nombre del Cliente"
                                            value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cédula / RUC</label>
                                        <input className="w-full rounded-lg border-gray-300" placeholder="Identificación"
                                            value={clienteCedula} onChange={e => setClienteCedula(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input className="w-full rounded-lg border-gray-300" placeholder="099..."
                                            value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                        <input className="w-full rounded-lg border-gray-300" placeholder="Dirección Domicilio"
                                            value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} />
                                    </div>
                                </div>
                            </section>

                            {/* 3. PERSONALIZACIÓN */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">3. Personalización del Forro</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">MATERIALES (COLORES)</label>
                                        <div className="space-y-3">
                                            <input className="w-full rounded-lg border-gray-300 text-sm" placeholder="Color Principal (Ej: Negro Mate)"
                                                value={colorMaterialPrincipal} onChange={e => setColorMaterialPrincipal(e.target.value)} />
                                            <input className="w-full rounded-lg border-gray-300 text-sm" placeholder="Color Secundario (Ej: Rojo Perforado)"
                                                value={colorMaterialSecundario} onChange={e => setColorMaterialSecundario(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">COSTURAS (TIPO Y COLOR)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input className="w-full rounded-lg border-gray-300 text-sm" placeholder="Tipo Principal"
                                                value={tipoCosturaPrincipal} onChange={e => setTipoCosturaPrincipal(e.target.value)} />
                                            <input className="w-full rounded-lg border-gray-300 text-sm" placeholder="Color Principal"
                                                value={colorCosturaPrincipal} onChange={e => setColorCosturaPrincipal(e.target.value)} />

                                            <input className="w-full rounded-lg border-gray-300 text-sm" placeholder="Tipo Secundaria"
                                                value={tipoCosturaSecundario} onChange={e => setTipoCosturaSecundario(e.target.value)} />
                                            <input className="w-full rounded-lg border-gray-300 text-sm" placeholder="Color Secundaria"
                                                value={colorCosturaSecundario} onChange={e => setColorCosturaSecundario(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 4. FINANCIERO & NOTAS */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">4. Financiero y Notas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio Total Venta</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                            <input type="number" className="w-full pl-7 rounded-lg border-gray-300 font-bold" required
                                                value={precioVenta} onChange={e => setPrecioVenta(Number(e.target.value))} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Abono Inicial</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                            <input type="number" className="w-full pl-7 rounded-lg border-gray-300"
                                                value={abono} onChange={e => setAbono(Number(e.target.value))} />
                                        </div>
                                    </div>
                                    <div className="bg-gray-100 rounded-lg p-3 text-center">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">SALDO PENDIENTE</label>
                                        <span className={`text-xl font-bold ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            ${saldoPendiente.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas del Cliente / Observaciones</label>
                                        <textarea className="w-full rounded-lg border-gray-300" rows={3} placeholder="Detalles extra, fecha entrega estimada, etc."
                                            value={notas} onChange={e => setNotas(e.target.value)}></textarea>
                                    </div>
                                </div>
                            </section>

                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black font-medium transition-colors shadow-lg shadow-gray-200 flex items-center gap-2">
                                    <Plus size={18} /> Crear Orden
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL CANCELAR/ELIMINAR ORDEN --- */}
            {showDeleteModal && deleteOrdenId && (() => {
                const ordenDelete = ordenes.find(o => o.id === deleteOrdenId);
                if (!ordenDelete) return null;
                const ordenPagos = pagos.filter(p => p.orden_id === deleteOrdenId);
                const totalPagado = ordenPagos.reduce((acc, p) => acc + Number(p.monto), 0);
                const isPagado = ordenDelete.estado === 'PAGADO';

                return (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8">
                            <div className="p-6 border-b border-red-100">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                            <Trash2 className="text-red-600" size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Cancelar / Eliminar Orden</h3>
                                            <p className="text-sm text-gray-500">#{getOrderNumber(deleteOrdenId)} — {ordenDelete.cliente_nombre || ordenDelete.cliente}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setShowDeleteModal(false); setDeleteType(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Order summary */}
                                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                                    <div className="flex justify-between"><span className="text-gray-500">Cliente:</span><span className="font-medium">{ordenDelete.cliente_nombre || ordenDelete.cliente}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Precio Venta:</span><span className="font-medium">${Number(ordenDelete.precio_venta).toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Estado:</span><span className="font-medium">{estadoLabel(ordenDelete.estado)}</span></div>
                                    {totalPagado > 0 && <div className="flex justify-between"><span className="text-gray-500">Total Pagado:</span><span className="font-medium text-green-600">${totalPagado.toFixed(2)}</span></div>}
                                </div>

                                {/* 3 Options */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Selecciona el motivo:</label>
                                    <div className="space-y-2">
                                        {/* Option 1: Devolución */}
                                        <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${deleteType === 'devolucion' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                                            }`}>
                                            <div className="flex items-start gap-3">
                                                <input type="radio" name="deleteType" checked={deleteType === 'devolucion'} onChange={() => setDeleteType('devolucion')} className="mt-1" />
                                                <div>
                                                    <span className="font-semibold text-gray-900">🔄 Devolución del cliente</span>
                                                    <p className="text-xs text-gray-500 mt-1">La orden pasa a estado "Devolución". Se deduce del control financiero si ya se cobró. <strong>No afecta inventario ni materiales.</strong></p>
                                                </div>
                                            </div>
                                        </label>

                                        {/* Option 2: Error fabricación */}
                                        <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${deleteType === 'fabricacion' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                                            }`}>
                                            <div className="flex items-start gap-3">
                                                <input type="radio" name="deleteType" checked={deleteType === 'fabricacion'} onChange={() => setDeleteType('fabricacion')} className="mt-1" />
                                                <div>
                                                    <span className="font-semibold text-gray-900">🔧 Error en fabricación</span>
                                                    <p className="text-xs text-gray-500 mt-1">La orden se marca como error de fabricación. Se deduce del control financiero si ya se cobró. <strong>No afecta inventario ni materiales.</strong></p>
                                                </div>
                                            </div>
                                        </label>

                                        {/* Option 3: Error datos (Available for ALL orders now) */}
                                        <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${deleteType === 'datos' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                            }`}>
                                            <div className="flex items-start gap-3">
                                                <input type="radio" name="deleteType" checked={deleteType === 'datos'} onChange={() => setDeleteType('datos')} className="mt-1" />
                                                <div>
                                                    <span className="font-semibold text-gray-900">❌ Borrar totalmente (Error datos / Cancelación total)</span>
                                                    <p className="text-xs text-gray-500 mt-1">Se <strong>elimina por completo</strong> la orden. Se revierten materiales al inventario, se eliminan los ingresos registrados y se borra la orden.</p>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Impact warning */}
                                {deleteType && (
                                    <div className={`rounded-lg p-4 border ${deleteType === 'datos' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                                        }`}>
                                        <h4 className={`text-sm font-bold mb-2 ${deleteType === 'datos' ? 'text-red-800' : 'text-amber-800'}`}>
                                            ⚠️ {deleteType === 'datos' ? 'Impacto de eliminación:' : 'Impacto:'}
                                        </h4>
                                        <ul className={`text-sm space-y-1 ml-4 list-disc ${deleteType === 'datos' ? 'text-red-700' : 'text-amber-700'}`}>
                                            {deleteType === 'datos' ? (
                                                <>
                                                    <li>Se <strong>elimina</strong> la orden completamente</li>
                                                    <li>Se <strong>devuelven</strong> {ordenDelete.materiales_usados?.length || 0} material(es) al inventario</li>
                                                    {ordenPagos.length > 0 && <li>Se eliminan {ordenPagos.length} pago(s) por ${totalPagado.toFixed(2)}</li>}
                                                    <li>Se eliminan movimientos de inventario</li>
                                                </>
                                            ) : (
                                                <>
                                                    <li>La orden cambia a estado "{deleteType === 'devolucion' ? 'Devolución' : 'Error Fabricación'}"</li>
                                                    {ordenPagos.length > 0 && <li>Se eliminan {ordenPagos.length} pago(s) por ${totalPagado.toFixed(2)} del <strong>control financiero</strong></li>}
                                                    <li>Los materiales e inventario <strong>no se modifican</strong></li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {/* Comentario */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Comentario <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={deleteMotivo}
                                        onChange={e => setDeleteMotivo(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
                                        rows={2}
                                        placeholder="Detalle del motivo..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowDeleteModal(false); setDeleteType(null); }}
                                    className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!deleteMotivo.trim() || !deleteType) return;
                                        let success = false;
                                        if (deleteType === 'devolucion') {
                                            success = await cancelarOrden(deleteOrdenId, 'DEVOLUCION');
                                        } else if (deleteType === 'fabricacion') {
                                            success = await cancelarOrden(deleteOrdenId, 'CANCELADO_FABRICACION');
                                        } else if (deleteType === 'datos') {
                                            success = await eliminarOrden(deleteOrdenId);
                                        }
                                        if (success) {
                                            setShowDeleteModal(false);
                                            setDeleteOrdenId(null);
                                            setDeleteType(null);
                                            setExpandedOrderId(null);
                                        }
                                    }}
                                    disabled={!deleteMotivo.trim() || !deleteType}
                                    className={`px-5 py-2.5 text-white rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${deleteType === 'datos' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
                                        }`}
                                >
                                    <Trash2 size={18} /> {deleteType === 'datos' ? 'Eliminar Orden' : deleteType === 'devolucion' ? 'Registrar Devolución' : deleteType === 'fabricacion' ? 'Registrar Error' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* --- MODAL REGISTRAR PAGO --- */}
            {showPaymentModal && paymentOrdenId && (() => {
                const ordenPago = ordenes.find(o => o.id === paymentOrdenId);
                if (!ordenPago) return null;
                const saldoPendiente = Number(ordenPago.saldo);
                const precioVenta = Number(ordenPago.precio_venta);
                const anticipo = precioVenta - saldoPendiente;
                return (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <DollarSign className="text-green-600" size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Registrar Pago</h3>
                                            <p className="text-sm text-gray-500">Orden #{getOrderNumber(paymentOrdenId)} — {ordenPago.cliente_nombre || ordenPago.cliente}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                                </div>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Sale Breakdown */}
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Precio de Venta</span>
                                        <span className="text-lg font-bold text-gray-900">${precioVenta.toFixed(2)}</span>
                                    </div>
                                    {anticipo > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Anticipo recibido</span>
                                            <span className="text-green-600 font-medium">-${anticipo.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {saldoPendiente > 0 && (
                                        <div className="flex justify-between items-center text-sm border-t pt-2">
                                            <span className="text-gray-500">Saldo pendiente del cliente</span>
                                            <span className="text-red-600 font-medium">${saldoPendiente.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                    <p className="text-xs text-blue-700">📊 <strong>El monto total de la venta (${precioVenta.toFixed(2)})</strong> se registrará en el control financiero según la clasificación que elijas abajo.</p>
                                </div>

                                {/* Método de Pago */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                                    <select
                                        value={paymentMetodo}
                                        onChange={e => setPaymentMetodo(e.target.value as MetodoPago)}
                                        className="w-full rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500"
                                    >
                                        <option value="Efectivo">💵 Efectivo</option>
                                        <option value="Transferencia">🏦 Transferencia</option>
                                        <option value="Tarjeta">💳 Tarjeta</option>
                                        <option value="Depósito">🏧 Depósito</option>
                                        <option value="Otro">📝 Otro</option>
                                    </select>
                                </div>

                                {/* Monto (read-only, always precio_venta) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Registrar en Control Financiero</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={paymentMonto}
                                            className="w-full pl-8 rounded-lg border-gray-300 bg-gray-50 text-lg font-bold cursor-not-allowed"
                                            readOnly
                                        />
                                    </div>
                                </div>

                                {/* ¿Factura? */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">¿Se emitió factura?</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentFactura ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input type="radio" name="factura" checked={paymentFactura} onChange={() => setPaymentFactura(true)} className="sr-only" />
                                            <FileText size={16} />
                                            <span className="font-medium">Sí (Factura)</span>
                                        </label>
                                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${!paymentFactura ? 'border-gray-500 bg-gray-50 text-gray-700' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input type="radio" name="factura" checked={!paymentFactura} onChange={() => setPaymentFactura(false)} className="sr-only" />
                                            <User size={16} />
                                            <span className="font-medium">No (Consumidor Final)</span>
                                        </label>
                                    </div>
                                    <p className="text-xs mt-2 px-1">
                                        {paymentFactura
                                            ? <span className="text-blue-600">📊 Se registrará en <strong>Control Tributario</strong> como ingreso facturado.</span>
                                            : <span className="text-gray-500">💰 Se registrará en <strong>Control Financiero Real</strong> como ingreso no declarado.</span>
                                        }
                                    </p>
                                </div>

                                {/* Notas */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                                    <input
                                        type="text"
                                        value={paymentNotas}
                                        onChange={e => setPaymentNotas(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-sm"
                                        placeholder="Referencia, número de transferencia, etc."
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={paymentMonto <= 0}
                                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DollarSign size={18} /> Confirmar Pago
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};