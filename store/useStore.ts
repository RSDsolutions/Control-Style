import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Material, OrdenTrabajo, GastoOperativo, ResumenFinanciero, ItemOrden, Producto, MovimientoInventario, PagoOrden } from '../types';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { expenseService } from '../services/expenseService';
import { designService } from '../services/designService';
import { paymentService } from '../services/paymentService';

interface AppState {
  // Auth State
  empresaId: string | null;
  empresa: import('../types').Empresa | null; // Full company object
  userProfile: import('../types').UserProfile | null; // New User Profile

  inventario: Material[];
  ordenes: OrdenTrabajo[];
  gastos: GastoOperativo[];
  productos: Producto[];
  movimientos: MovimientoInventario[];
  disenos: import('../types').Diseno[];
  pagos: PagoOrden[];
  loading: boolean;
  error: string | null;

  // Auth Actions
  fetchUserData: (userId: string) => Promise<void>;
  updateEmpresa: (updates: Partial<import('../types').Empresa>) => Promise<void>;
  createEmpresa: (empresa: Omit<import('../types').Empresa, 'id' | 'created_at' | 'logo_url'>) => Promise<void>;
  updateUser: (updates: Partial<import('../types').UserProfile>) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  logout: () => void;

  // Actions
  fetchInitialData: () => Promise<void>;
  agregarMaterial: (material: Omit<Material, 'id' | 'empresa_id' | 'created_at'>, fechaCreacion?: string) => Promise<Material | null>;
  registrarCompraMaterial: (id: string, cantidad: number, costo_total: number) => Promise<void>;
  registrarMerma: (id: string, cantidad: number) => Promise<void>;
  registrarIngresoActivo: (
    materialData: { nombre: string; tipo: import('../types').Material['tipo']; unidad_medida: import('../types').Material['unidad_medida'] },
    cantidad: number,
    costo_total: number,
    notas: string,
    ordenOrigenId?: string,
    fechaCreacion?: string
  ) => Promise<void>;
  registrarCorreccionIngreso: (materialId: string, cantidad: number, motivo: string) => Promise<number>;

  // Productos Actions
  agregarProducto: (producto: Omit<Producto, 'id'>) => Promise<void>;
  eliminarProducto: (id: string) => Promise<void>;

  // Modified Order Action
  // Returns true if successful, false (and alert) if insufficient stock
  crearOrdenConProducto: (
    ordenBase: Omit<OrdenTrabajo, 'id' | 'materiales_usados' | 'fecha_creacion' | 'saldo' | 'estado' | 'tipo_trabajo'>,
    productoId: string
  ) => Promise<boolean>;

  asignarMaterialAOrden: (ordenId: string, materialId: string, cantidad: number) => Promise<void>; // Kept for legacy compatibility
  cambiarEstadoOrden: (ordenId: string, estado: OrdenTrabajo['estado']) => Promise<void>;
  eliminarOrden: (ordenId: string) => Promise<boolean>;
  cancelarOrden: (ordenId: string, nuevoEstado: string) => Promise<boolean>;
  registrarPago: (ordenId: string, pago: { monto: number; metodo_pago: string; tiene_factura: boolean; notas?: string }) => Promise<boolean>;
  registrarGasto: (gasto: Omit<GastoOperativo, 'id'>) => Promise<void>;

  // Design Actions
  agregarDiseno: (diseno: Omit<import('../types').Diseno, 'id' | 'created_at'>) => Promise<import('../types').Diseno | null>;
  editarDiseno: (id: string, updates: Partial<import('../types').Diseno>) => Promise<void>;
  eliminarDiseno: (id: string) => Promise<void>;


  // Computed
  obtenerResumen: () => ResumenFinanciero;
  obtenerAlertas: () => import('../types').Alerta[];
}

export const useStore = create<AppState>((set, get) => ({
  empresaId: null,
  empresa: null,
  userProfile: null,

  inventario: [],
  ordenes: [],
  gastos: [],
  productos: [],
  movimientos: [],
  disenos: [],
  pagos: [],
  loading: false,
  error: null,

  fetchUserData: async (userId: string) => {
    // 1. Fetch User Profile
    try {
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userProfile) {
        set({ userProfile });
      } else if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
      }
    } catch (e) {
      console.error("Error fetching (try/catch) user profile:", e);
    }

    let retries = 3;
    const startTime = Date.now();

    while (retries > 0) {
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('*') // Fetch all fields
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Row not found
          } else {
            console.error("Error fetching company data:", error);
            return;
          }
        }

        if (data) {
          set({ empresaId: data.id, empresa: data });

          // Trigger initial data fetch immediately after getting company
          await get().fetchInitialData();
          return;
        }
      } catch (err) {
        console.error("Error in fetchUserData loop:", err);
      }

      console.log(`Waiting for Company creation... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries--;
    }

    // Failed to find company after retries
    console.error("Could not find company for user after retries.");
  },

  updateEmpresa: async (updates) => {
    const { empresaId } = get();
    if (!empresaId) return;

    try {
      const { data, error } = await supabase
        .from('empresas')
        .update(updates)
        .eq('id', empresaId)
        .select()
        .single();

      if (error) throw error;
      if (data) set({ empresa: data });
    } catch (error) {
      console.error("Error updating company:", error);
      alert("Error al actualizar datos de empresa");
    }
  },

  createEmpresa: async (empresaData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('empresas')
        .insert({ ...empresaData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        set({ empresaId: data.id, empresa: data });
        await get().fetchInitialData();
      }
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Error al crear empresa");
      throw error;
    }
  },

  updateUser: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      const { userProfile } = get();
      set({ userProfile: { ...(userProfile || { id: user.id, nombre: '', cedula: '' }), ...updates } });

      alert("Datos de usuario actualizados");
    } catch (error) {
      console.error("Error updating user profile:", error);
      alert("Error al actualizar datos de usuario");
    }
  },

  uploadLogo: async (file) => {
    const { empresaId, updateEmpresa } = get();
    if (!empresaId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${empresaId}/logo.${fileExt}`;
      const filePath = fileName;

      // Upload to 'company_logos' bucket
      const { error: uploadError } = await supabase.storage
        .from('company_logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data } = supabase.storage
        .from('company_logos')
        .getPublicUrl(filePath);

      // Update Empresa
      await get().updateEmpresa({ logo_url: data.publicUrl });

    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Error al subir logo");
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({
      empresaId: null,
      empresa: null,
      inventario: [],
      ordenes: [],
      gastos: [],
      movimientos: [],
      error: null
    });
  },

  fetchInitialData: async () => {
    const { empresaId } = get();
    if (!empresaId) return;

    set({ loading: true, error: null });
    try {
      const [inventario, productos, ordenes, gastos, movimientos, disenos, pagos] = await Promise.all([
        inventoryService.getMateriales(empresaId),
        productService.getProductos(empresaId),
        orderService.getOrdenes(empresaId),
        expenseService.getGastos(empresaId),
        inventoryService.getMovimientos(empresaId),
        designService.getDisenos(empresaId),
        paymentService.getPagosByEmpresa(empresaId)
      ]);
      set({ inventario, productos, ordenes, gastos, movimientos, disenos, pagos });
    } catch (err: any) {
      console.error("Error fetching data:", err);
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  agregarMaterial: async (material, fechaCreacion) => {
    const { empresaId } = get();
    if (!empresaId) {
      alert("Error: No hay sesión de empresa activa. Intente recargar.");
      return null;
    }

    try {
      const newMaterial = await inventoryService.addMaterial({ ...material, empresa_id: empresaId }, fechaCreacion);
      // Ensure created_at is present (fallback to client time if DB doesn't return it immediately)
      const materialWithDate = { ...newMaterial, created_at: newMaterial.created_at || fechaCreacion || new Date().toISOString() };
      set(state => ({ inventario: [...state.inventario, materialWithDate] }));
      return materialWithDate;
    } catch (error) {
      console.error("Error adding material:", error);
      alert("Error al agregar material");
      return null;
    }
  },

  registrarCompraMaterial: async (id, cantidad, costo_total) => {
    const { empresaId } = get();
    if (!empresaId) return;

    // Note: 'tiene_factura' removed. Expense logic is now handled via 'movimientos_inventario' (Asset), not 'gastos' (Expense).
    const state = get();
    const materialIndex = state.inventario.findIndex(m => m.id === id);
    if (materialIndex === -1) return;

    const material = state.inventario[materialIndex];
    // Optimistic calculation for UI, but service handles the real math
    const valorActual = (material.cantidad_actual || 0) * (material.costo_unitario_promedio || 0);
    const nuevoStock = (material.cantidad_actual || 0) + cantidad;
    const nuevoCostoPromedio = nuevoStock > 0 ? (valorActual + costo_total) / nuevoStock : 0;

    try {
      await inventoryService.registrarCompraMaterial(id, cantidad, costo_total, empresaId);

      const nuevosMateriales = [...state.inventario];
      nuevosMateriales[materialIndex] = {
        ...material,
        cantidad_actual: nuevoStock,
        costo_unitario_promedio: nuevoCostoPromedio
      };
      set({ inventario: nuevosMateriales });
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("Error al actualizar existencias");
    }
  },

  registrarMerma: async (id: string, cantidad: number) => {
    const { empresaId } = get();
    if (!empresaId) return;

    try {
      await inventoryService.registrarMerma(id, cantidad, empresaId);

      // Refresh Inventory to show new cost/stock
      const updatedInventory = await inventoryService.getMateriales(empresaId);
      set({ inventario: updatedInventory });
    } catch (error) {
      console.error("Error registering merma:", error);
      alert("Error al registrar merma");
    }
  },

  registrarIngresoActivo: async (materialData, cantidad, costo_total, notas, ordenOrigenId, fechaCreacion) => {
    const { empresaId } = get();
    if (!empresaId) return;

    try {
      await inventoryService.registrarIngresoActivo(materialData, cantidad, costo_total, notas, empresaId, ordenOrigenId, fechaCreacion);

      // Refresh Inventory
      const updatedInventory = await inventoryService.getMateriales(empresaId);
      set({ inventario: updatedInventory });
    } catch (error) {
      console.error("Error registering active asset:", error);
      alert("Error al registrar ingreso de activo");
    }
  },

  registrarCorreccionIngreso: async (materialId, cantidad, motivo) => {
    const { empresaId } = get();
    if (!empresaId) throw new Error("No empresa session");

    try {
      const costoTotal = await inventoryService.registrarCorreccionIngreso(materialId, cantidad, motivo, empresaId);

      // Refresh Inventory
      const updatedInventory = await inventoryService.getMateriales(empresaId);
      set({ inventario: updatedInventory });

      return costoTotal;
    } catch (error) {
      console.error("Error correcting inventory:", error);
      throw error;
    }
  },

  agregarProducto: async (producto) => {
    const { empresaId } = get();
    if (!empresaId) return;

    try {
      const newProduct = await productService.addProducto({ ...producto, empresa_id: empresaId });
      set(state => ({ productos: [...state.productos, newProduct] }));
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Error al crear producto");
    }
  },

  eliminarProducto: async (id) => {
    try {
      await productService.deleteProducto(id);
      set(state => ({ productos: state.productos.filter(p => p.id !== id) }));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error al eliminar producto");
    }
  },

  // --- Design Actions ---
  agregarDiseno: async (diseno) => {
    const { empresaId } = get();
    if (!empresaId) return null;
    try {
      const newDiseno = await designService.addDiseno({ ...diseno, empresa_id: empresaId });
      set(state => ({ disenos: [newDiseno, ...state.disenos] }));
      return newDiseno;
    } catch (error) {
      console.error("Error adding design:", error);
      alert("Error al agregar diseño");
      return null;
    }
  },

  editarDiseno: async (id, updates) => {
    try {
      const updatedDiseno = await designService.updateDiseno(id, updates);
      set(state => ({
        disenos: state.disenos.map(d => d.id === id ? updatedDiseno : d)
      }));
    } catch (error) {
      console.error("Error updating design:", error);
      alert("Error al actualizar diseño");
    }
  },

  eliminarDiseno: async (id) => {
    try {
      await designService.deleteDiseno(id);
      set(state => ({ disenos: state.disenos.filter(d => d.id !== id) }));
    } catch (error) {
      console.error("Error deleting design:", error);
      alert("Error al eliminar diseño");
    }
  },
  // ----------------------

  crearOrdenConProducto: async (ordenBase, productoId) => {
    const state = get();
    const { empresaId } = state;
    if (!empresaId) return false;

    const producto = state.productos.find(p => p.id === productoId);

    if (!producto) return false;

    // 1. Validar Stock de TODOS los ingredientes (Local check first to avoid partial fails)
    const materialesFaltantes: string[] = [];
    const receta = producto.receta || [];

    for (const item of receta) {
      const material = state.inventario.find(m => m.id === item.material_id);
      if (!material || material.cantidad_actual < item.cantidad) {
        materialesFaltantes.push(material ? material.nombre : 'Material Desconocido');
      }
    }

    if (materialesFaltantes.length > 0) {
      alert(`Inventario insuficiente para fabricar este producto.\nFalta: ${materialesFaltantes.join(', ')}`);
      return false;
    }

    // 2. Prepare Data
    const materialesUsadosOrden: ItemOrden[] = [];
    // Recalculate costs based on current average
    receta.forEach(item => {
      const material = state.inventario.find(m => m.id === item.material_id);
      if (material) {
        const costoCalculado = item.cantidad * material.costo_unitario_promedio;
        materialesUsadosOrden.push({
          material_id: item.material_id,
          cantidad: item.cantidad,
          costo_calculado: costoCalculado
        });
      }
    });

    try {
      // Create Order (Service handles stock updates and movement logging)
      const nuevaOrdenData = {
        ...ordenBase,
        tipo_trabajo: producto.nombre,
        producto_id: producto.id,
        fecha_creacion: new Date().toISOString(),
        saldo: ordenBase.precio_venta - ordenBase.anticipo,
        estado: 'EN_PROCESO' as OrdenTrabajo['estado'],
        empresa_id: empresaId
      };

      const nuevaOrden = await orderService.createOrden(nuevaOrdenData, materialesUsadosOrden, empresaId);

      // We technically should refetch material stock to be accurate, 
      // but for UI speed we can calculate it optimistically or just fetch.
      // Let's fetch to be safe and simple.
      const updatedInventory = await inventoryService.getMateriales(empresaId);

      set({
        inventario: updatedInventory,
        ordenes: [...state.ordenes, nuevaOrden]
      });

      return true;
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Error crítico al crear la orden. Por favor recargue la página.");
      return false;
    }
  },

  asignarMaterialAOrden: async (ordenId, materialId, cantidad) => {
    // This seems to be legacy or manual assignment.
    // Implementing purely for compatibility if used.
    alert("Función 'asignarMaterialAOrden' no implementada completamente con backend en esta versión.");
  },

  cambiarEstadoOrden: async (ordenId, estado) => {
    try {
      await orderService.updateOrdenEstado(ordenId, estado);
      set(state => ({
        ordenes: state.ordenes.map(o => o.id === ordenId ? { ...o, estado } : o)
      }));
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  },

  eliminarOrden: async (ordenId) => {
    try {
      await orderService.deleteOrden(ordenId);
      // Refresh inventory since stock was reversed
      const { empresaId } = get();
      const inventario = await inventoryService.getMateriales(empresaId || undefined);
      set(state => ({
        ordenes: state.ordenes.filter(o => o.id !== ordenId),
        pagos: state.pagos.filter(p => p.orden_id !== ordenId),
        inventario
      }));
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error al eliminar la orden');
      return false;
    }
  },

  cancelarOrden: async (ordenId, nuevoEstado) => {
    try {
      await orderService.cancelOrden(ordenId, nuevoEstado);
      set(state => ({
        ordenes: state.ordenes.map(o =>
          o.id === ordenId ? { ...o, estado: nuevoEstado as any, saldo: 0 } : o
        ),
        pagos: state.pagos.filter(p => p.orden_id !== ordenId)
      }));
      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Error al cancelar la orden');
      return false;
    }
  },

  registrarPago: async (ordenId, pagoData) => {
    const { empresaId } = get();
    if (!empresaId) return false;

    const orden = get().ordenes.find(o => o.id === ordenId);
    if (!orden) return false;

    // Validate
    const currentSaldo = Number(orden.saldo);
    const precioVenta = Number(orden.precio_venta);
    if (pagoData.monto < 0) {
      alert('Monto inválido');
      return false;
    }
    // Validate against precio_venta (full sale value)
    if (pagoData.monto > precioVenta) {
      alert(`Monto inválido. El precio de venta es $${precioVenta.toFixed(2)}`);
      return false;
    }

    try {
      // Always create payment record for financial tracking when monto > 0
      if (pagoData.monto > 0) {
        const nuevoPago = await paymentService.createPago({
          orden_id: ordenId,
          monto: pagoData.monto,
          metodo_pago: pagoData.metodo_pago as any,
          tiene_factura: pagoData.tiene_factura,
          fecha: new Date().toISOString(),
          notas: pagoData.notas,
          empresa_id: empresaId
        });
        set(state => ({
          pagos: [nuevoPago, ...state.pagos]
        }));
      }

      // When paying full precio_venta, set saldo to 0 and estado to PAGADO
      const nuevoSaldo = 0;
      const nuevoEstado = 'PAGADO';

      // Update order saldo and estado
      await paymentService.updateOrdenSaldo(ordenId, nuevoSaldo, nuevoEstado);

      set(state => ({
        ordenes: state.ordenes.map(o =>
          o.id === ordenId
            ? { ...o, saldo: nuevoSaldo, estado: nuevoEstado as any }
            : o
        )
      }));

      return true;
    } catch (error) {
      console.error("Error registering payment:", error);
      alert("Error al registrar el pago");
      return false;
    }
  },

  registrarGasto: async (gasto) => {
    const { empresaId } = get();
    if (!empresaId) return;

    try {
      const newGasto = await expenseService.addGasto({ ...gasto, empresa_id: empresaId });
      set(state => ({ gastos: [...state.gastos, newGasto] }));
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Error al registrar gasto");
    }
  },

  obtenerResumen: () => {
    const { ordenes = [], gastos = [], pagos = [] } = get();

    // --- 1. INGRESOS (from actual payments, not order totals) ---
    // Financiero Real: payments WITHOUT factura (undeclared income)
    const ingresos_reales = pagos
      .filter(p => !p.tiene_factura)
      .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

    // Tributario: payments WITH factura (declared income)  
    const ingresos_facturados = pagos
      .filter(p => p.tiene_factura)
      .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

    // Total sales = all payments received
    const ventas_totales = ingresos_reales + ingresos_facturados;
    const ventas_facturadas = ingresos_facturados;


    // --- 2. GASTOS (Separación Lógica) ---

    // A. Compras de Materiales (Inventario)
    const compras_materiales = gastos.filter(g => g.categoria === 'Compra Materiales');
    const compras_materiales_facturadas = compras_materiales
      .filter(g => g.tiene_factura)
      .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

    // B. Gastos Operativos Reales (Excluyendo compras de material)
    const gastos_operativos = gastos.filter(g => g.categoria !== 'Compra Materiales');

    const gastos_operativos_totales = gastos_operativos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
    const gastos_operativos_facturados = gastos_operativos
      .filter(g => g.tiene_factura)
      .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);


    // --- 3. COSTOS (Uso de Material) ---
    // Calculado desde las órdenes (material consumido)
    let costo_venta_real = 0;

    ordenes.forEach(orden => {
      const materiales = orden.materiales_usados || [];
      const consumoOrden = materiales.reduce((sum, item) => sum + (Number(item.costo_calculado) || 0), 0);
      costo_venta_real += consumoOrden;
    });


    // --- 4. CÁLCULOS FINALES ---

    // FINANCIERO: Utilidad Real
    // Ingresos - (Gastos Operativos + Costo de Venta)
    // * Las compras de inventario NO restan aquí, son Activos. Resta el Costo de Venta (uso).
    const utilidad_real = ventas_totales - (gastos_operativos_totales + costo_venta_real);


    // TRIBUTARIO: Utilidad Imponible
    // Ventas Facturadas - (Gastos Op. Facturados + Compras Inventario Facturadas)
    // * Aquí SÍ restan las compras de inventario (son deducibles al comprar).
    // * NO resta el Costo de Venta (sería doble deducción).
    const gastos_deducibles_totales = gastos_operativos_facturados + compras_materiales_facturadas;
    const utilidad_tributaria = ventas_facturadas - gastos_deducibles_totales;


    // Indicadores
    const ratio_tributario = ventas_facturadas > 0 ? (gastos_deducibles_totales / ventas_facturadas) : 0;

    let alerta_riesgo: 'BAJO' | 'MEDIO' | 'ALTO' = 'BAJO';
    if (ratio_tributario > 0.85) alerta_riesgo = 'ALTO'; // Gastos muy altos respecto a ventas
    else if (ratio_tributario < 0.20 && ventas_facturadas > 0) alerta_riesgo = 'MEDIO'; // Pocos gastos deducibles (posible pago alto impuestos)

    return {
      ventas_totales,
      gastos_operativos_totales, // Muestra gastos op (luz, arriendo...)
      consumo_materiales_total: costo_venta_real, // Muestra costo de venta
      utilidad_real,

      ventas_facturadas,
      gastos_facturados: gastos_deducibles_totales, // Para vista tributaria (Op + Compras)
      utilidad_tributaria,

      ratio_tributario,
      alerta_riesgo
    };
  },

  obtenerAlertas: () => {
    try {
      const { inventario = [], productos = [], gastos = [], ordenes = [], movimientos = [] } = get();
      // Use full type definition to avoid implicit any errors
      const alertas: import('../types').Alerta[] = [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = prevDate.getMonth();
      const prevYear = prevDate.getFullYear();

      const getDaysOld = (dateStr?: string) => {
        if (!dateStr) return 9999; // Assume old if unknown
        const created = new Date(dateStr);
        const diffTime = Math.abs(now.getTime() - created.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      // 1. PRODUCTO SIN STOCK
      productos.forEach(p => {
        if ((p.stock || 0) <= 0) {
          alertas.push({
            id: `prod-stock-${p.id}`,
            titulo: 'Producto Sin Stock',
            mensaje: `El producto ${p.nombre} no tiene stock disponible`,
            tipo: 'INVENTARIO',
            prioridad: 'ALTA',
            fecha_generacion: now.toISOString()
          });
        }

        // 7. MARGEN DE PRODUCTO BAJO
        if (p.precio_sugerido > 0 && p.receta) {
          let costoReceta = 0;
          p.receta.forEach(r => {
            const mat = inventario.find(m => m.id === r.material_id);
            if (mat) costoReceta += (mat.costo_unitario_promedio || 0) * r.cantidad;
          });

          const margen = (p.precio_sugerido - costoReceta) / p.precio_sugerido;
          if (margen < 0.20) {
            alertas.push({
              id: `prod-margen-${p.id}`,
              titulo: 'Margen de Utilidad Bajo',
              mensaje: `El producto ${p.nombre} tiene un margen de ${(margen * 100).toFixed(1)}%`,
              tipo: 'FINANCIERO',
              prioridad: 'MEDIA',
              fecha_generacion: now.toISOString()
            });
          }
        }
      });

      // 2. MATERIAL BAJO STOCK MÍNIMO
      inventario.forEach(m => {
        const min = m.stock_minimo !== undefined ? m.stock_minimo : 0;
        if ((m.cantidad_actual || 0) <= min) {
          alertas.push({
            id: `mat-stock-${m.id}`,
            titulo: 'Material Bajo Stock Mínimo',
            mensaje: `El material ${m.nombre} está bajo el mínimo (${m.cantidad_actual} / ${min})`,
            tipo: 'INVENTARIO',
            prioridad: 'ALTA',
            fecha_generacion: now.toISOString()
          });
        }
      });

      // HELPERS
      const getExpensesByMonth = (m: number, y: number) => {
        return gastos
          .filter(g => {
            const d = new Date(g.fecha);
            return d.getMonth() === m && d.getFullYear() === y && g.categoria !== 'Compra Materiales' && d <= now;
          })
          .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
      };

      const getProfitByMonth = (m: number, y: number) => {
        const sales = ordenes
          .filter(o => { const d = new Date(o.fecha_creacion); return d.getMonth() === m && d.getFullYear() === y && d <= now; })
          .reduce((acc, o) => acc + (Number(o.precio_venta) || 0), 0);

        const exp = getExpensesByMonth(m, y);

        const cogs = ordenes
          .filter(o => { const d = new Date(o.fecha_creacion); return d.getMonth() === m && d.getFullYear() === y && d <= now; })
          .reduce((acc, o) => {
            const mats = o.materiales_usados || [];
            return acc + mats.reduce((sum, item) => sum + (Number(item.costo_calculado) || 0), 0);
          }, 0);

        return sales - (exp + cogs);
      };

      const getProductionCostAvgByMonth = (m: number, y: number) => {
        const ordersInMonth = ordenes.filter(o => { const d = new Date(o.fecha_creacion); return d.getMonth() === m && d.getFullYear() === y && d <= now; });
        if (ordersInMonth.length === 0) return 0;

        const totalCogs = ordersInMonth.reduce((acc, o) => {
          const mats = o.materiales_usados || [];
          return acc + mats.reduce((sum, item) => sum + (Number(item.costo_calculado) || 0), 0);
        }, 0);

        return totalCogs / ordersInMonth.length;
      };

      // 3. GASTO OPERATIVO ALTO
      const gastosMesActual = getExpensesByMonth(currentMonth, currentYear);
      const gastosMesAnterior = getExpensesByMonth(prevMonth, prevYear);

      if (gastosMesAnterior > 0 && gastosMesActual > (gastosMesAnterior * 1.20)) {
        alertas.push({
          id: `gasto-alto-${currentMonth}`,
          titulo: 'Gastos Operativos Altos',
          mensaje: 'Los gastos operativos aumentaron más del 20% respecto al mes anterior',
          tipo: 'OPERATIVO',
          prioridad: 'MEDIA',
          fecha_generacion: now.toISOString()
        });
      }

      // 4. UTILIDAD MENOR AL MES PASADO
      const utilidadMesActual = getProfitByMonth(currentMonth, currentYear);
      const utilidadMesAnterior = getProfitByMonth(prevMonth, prevYear);

      if (utilidadMesAnterior > 0 && utilidadMesActual < utilidadMesAnterior) {
        alertas.push({
          id: `utilidad-baja-${currentMonth}`,
          titulo: 'Caída de Utilidad',
          mensaje: 'La utilidad del negocio es menor al mes pasado',
          tipo: 'FINANCIERO',
          prioridad: 'MEDIA',
          fecha_generacion: now.toISOString()
        });
      }

      // 5. AUMENTO COSTO PRODUCCIÓN
      const costoPromActual = getProductionCostAvgByMonth(currentMonth, currentYear);
      const costoPromAnterior = getProductionCostAvgByMonth(prevMonth, prevYear);

      if (costoPromAnterior > 0 && costoPromActual > (costoPromAnterior * 1.10)) {
        alertas.push({
          id: `costo-prod-alto-${currentMonth}`,
          titulo: 'Aumento Costo Producción',
          mensaje: 'El costo de producción aumentó este mes (+10%)',
          tipo: 'OPERATIVO',
          prioridad: 'MEDIA',
          fecha_generacion: now.toISOString()
        });
      }

      // 6. UTILIDAD TRIBUTARIA ALTA
      const ventasFactMes = ordenes
        .filter(o => o.tipo_comprobante === 'FACTURA')
        .filter(o => { const d = new Date(o.fecha_creacion); return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d <= now; })
        .reduce((acc, o) => acc + (Number(o.precio_venta) || 0), 0);

      const gastosFactMes = gastos
        .filter(g => g.tiene_factura)
        .filter(g => { const d = new Date(g.fecha); return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d <= now; })
        .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

      const utilidadTributariaMes = ventasFactMes - gastosFactMes;
      // const UMBRAL_TRIBUTARIO = 5000;

      // if (utilidadTributariaMes > UMBRAL_TRIBUTARIO) {
      //   alertas.push({
      //     id: `trib-alta-${currentMonth}`,
      //     titulo: 'Utilidad Tributaria Alta',
      //     mensaje: 'Posible aumento de impuesto a pagar (Supera umbral $5000)',
      //     tipo: 'TRIBUTARIO',
      //     prioridad: 'BAJA',
      //     fecha_generacion: now.toISOString()
      //   });
      // }

      // --- NUEVAS ALERTAS PREDICTIVAS ---

      // 8. PREDICCIÓN DE FLUJO DE CAJA NEGATIVO
      // A. Caja Actual = Ventas Pagadas (Total) - Gastos Pagados (Total)
      // Usamos 'saldo' para saber cuánto falta por cobrar. Si saldo es 0 o menor que precio, la diferencia es lo cobrado.
      const totalCobrado = ordenes.reduce((acc, o) => {
        const d = new Date(o.fecha_creacion);
        if (d > now) return acc;
        const precio = Number(o.precio_venta) || 0;
        const saldo = Number(o.saldo) || 0;
        return acc + (precio - saldo);
      }, 0);

      const totalGastosPagados = gastos.reduce((acc, g) => {
        const d = new Date(g.fecha);
        if (d > now) return acc;
        return acc + (Number(g.monto) || 0);
      }, 0);

      // Initial Cash assumption: 0 + current operations. (User said "Obtener CajaActual", we approximate with history if no initial balance)
      const cajaActual = totalCobrado - totalGastosPagados;

      // B. Gastos Operativos Restantes del Mes
      // Estimar gasto mensual usando el mes anterior o promedio.
      const gastoMensualEstimado = gastosMesAnterior > 0 ? gastosMesAnterior : (gastosMesActual * 1.5 || 2000);
      const gastosRestantesMes = Math.max(0, gastoMensualEstimado - gastosMesActual);

      // C. Utilidad Proyectada Restante
      const diasTranscurridos = Math.max(1, now.getDate());
      const diasTotalesMes = new Date(currentYear, currentMonth + 1, 0).getDate();
      const diasRestantes = Math.max(0, diasTotalesMes - diasTranscurridos);

      const ventasActualesMes = ordenes
        .filter(o => { const d = new Date(o.fecha_creacion); return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d <= now; })
        .reduce((acc, o) => acc + (Number(o.precio_venta) || 0), 0);

      const ritmoVentaDiario = ventasActualesMes / diasTranscurridos;
      const ventasProyectadasRestantes = ritmoVentaDiario * diasRestantes;

      // Utilidad Promedio (Margen) del Mes
      const utilidadTotalMes = getProfitByMonth(currentMonth, currentYear);
      const margenPromedio = ventasActualesMes > 0 ? (utilidadTotalMes / ventasActualesMes) : 0.30; // Default 30% if no sales

      const utilidadProyectadaRestante = ventasProyectadasRestantes * margenPromedio;

      const cajaFinalProyectada = cajaActual + utilidadProyectadaRestante;

      if (cajaFinalProyectada < gastosRestantesMes) {
        alertas.push({
          id: `flujo-negativo-${currentMonth}`,
          titulo: 'Riesgo de Flujo de Caja Negativo',
          mensaje: 'Según el ritmo actual, no habrá suficiente dinero para cubrir gastos restantes.',
          tipo: 'FINANCIERO',
          prioridad: 'ALTA',
          fecha_generacion: now.toISOString()
        });
      } else if (cajaFinalProyectada >= gastosRestantesMes * 1.20 && gastosRestantesMes > 0) {
        alertas.push({
          id: `flujo-estable-${currentMonth}`,
          titulo: 'Flujo de Caja Estable',
          mensaje: 'El flujo de caja proyectado cubrirá los gastos restantes del mes.',
          tipo: 'FINANCIERO',
          prioridad: 'BAJA',
          fecha_generacion: now.toISOString()
        });
      }

      // 9. CAÍDA DE RENTABILIDAD POR AUMENTO DE MERMA
      const getMermaQty = (m: number, y: number) => {
        return movimientos
          .filter(mv => {
            const d = new Date(mv.fecha);
            return d.getMonth() === m && d.getFullYear() === y && mv.tipo === 'MERMA' && d <= now;
          })
          .reduce((acc, mv) => acc + (Number(mv.cantidad) || 0), 0);
      };

      const mermaMesActual = getMermaQty(currentMonth, currentYear);
      const mermaMesAnterior = getMermaQty(prevMonth, prevYear);

      // Condicion: Merma Actual > Merma Anterior * 1.15 AND Costo Prod Actual > Costo Prod Anterior * 1.05
      if (mermaMesAnterior > 0 && mermaMesActual > (mermaMesAnterior * 1.15)) {
        if (costoPromAnterior > 0 && costoPromActual > (costoPromAnterior * 1.05)) {
          alertas.push({
            id: `merma-rentabilidad-${currentMonth}`,
            titulo: 'Posible Caída de Rentabilidad por Merma',
            mensaje: 'El aumento de merma está incrementando el costo de producción (>5%).',
            tipo: 'OPERATIVO',
            prioridad: 'MEDIA',
            fecha_generacion: now.toISOString()
          });
        }
      }

      // 10. SOBRESTOCK DE MATERIAL
      // 1. Consumo Mensual Promedio (Mes Actual + Anterior) / 2
      // Necesitamos iterar por materiales
      inventario.forEach(m => {
        // AGE CHECK: Solo analizar si el material tiene >= 30 días
        const daysOld = getDaysOld(m.created_at);
        if (daysOld < 30) return; // Skip new items

        const getUsoMaterial = (matId: string, month: number, year: number) => {
          return ordenes
            .filter(o => { const d = new Date(o.fecha_creacion); return d.getMonth() === month && d.getFullYear() === year && d <= now; })
            .reduce((acc, o) => {
              const uso = o.materiales_usados?.find(item => item.material_id === matId);
              return acc + (uso ? Number(uso.cantidad) : 0);
            }, 0);
        };

        const usoMesActual = getUsoMaterial(m.id, currentMonth, currentYear);
        const usoMesAnterior = getUsoMaterial(m.id, prevMonth, prevYear);

        // Si no hay uso en 2 meses, el promedio es 0.
        const consumoPromedioMensual = (usoMesActual + usoMesAnterior) / 2;

        if (consumoPromedioMensual > 0) {
          const mesesCobertura = (m.cantidad_actual || 0) / consumoPromedioMensual;

          if (mesesCobertura >= 2) {
            alertas.push({
              id: `sobrestock-${m.id}`,
              titulo: 'Sobrestock de Material Detectado',
              mensaje: `El material ${m.nombre} tiene stock para ${mesesCobertura.toFixed(1)} meses.`,
              tipo: 'INVENTARIO',
              prioridad: 'MEDIA',
              fecha_generacion: now.toISOString()
            });
          }
        } else if ((m.cantidad_actual || 0) > 0 && usoMesActual === 0 && usoMesAnterior === 0) {
          // Caso especial: Hay stock pero 0 uso en 2 meses -> Sobrestock "infinito"/muerto
          alertas.push({
            id: `sobrestock-muerto-${m.id}`,
            titulo: 'Material Sin Movimiento',
            mensaje: `El material ${m.nombre} tiene stock pero no se ha usado en 2 meses.`,
            tipo: 'INVENTARIO',
            prioridad: 'MEDIA',
            fecha_generacion: now.toISOString()
          });
        }
      });

      // 11. BAJA ROTACIÓN DE PRODUCTOS (STOCK MUERTO)
      // Producto tiene Stock > 0 pero NO se ha vendido en los últimos 30 días.
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      productos.forEach(p => {
        // AGE CHECK: Solo analizar si el producto tiene >= 30 días
        const daysOld = getDaysOld(p.created_at);
        if (daysOld < 30) return; // Skip new items

        if ((p.stock || 0) > 0) {
          const hasSalesLast30Days = ordenes.some(o => {
            const d = new Date(o.fecha_creacion);
            // Check if order is recent AND contains this product (via producto_id if exists)
            // If producto_id is missing, we might need another way, but let's rely on id for now.
            if (d < thirtyDaysAgo) return false;
            return o.producto_id === p.id;
          });

          if (!hasSalesLast30Days) {
            alertas.push({
              id: `prod-dead-${p.id}`,
              titulo: 'Producto con Baja Rotación',
              mensaje: `El producto ${p.nombre} tiene stock pero no se ha vendido en 30 días.`,
              tipo: 'INVENTARIO',
              prioridad: 'MEDIA',
              fecha_generacion: now.toISOString()
            });
          }
        }
      });

      // 12. 📅 PROYECCIÓN DE UTILIDAD MENSUAL
      // Uses actual payments (pagos) as income, not just order creation
      const { pagos: allPagos = [] } = get();

      // INGRESOS: Pagos registrados en el mes actual
      const ingresosMesActual = allPagos
        .filter(p => {
          const d = new Date(p.fecha);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d <= now;
        })
        .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

      // COSTOS DE PRODUCCIÓN: Materiales usados en OTs del mes actual
      const costosProduccionMes = ordenes
        .filter(o => {
          const d = new Date(o.fecha_creacion);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d <= now;
        })
        .reduce((acc, o) => {
          const mats = o.materiales_usados || [];
          return acc + mats.reduce((sum, item) => sum + (Number(item.costo_calculado) || 0), 0);
        }, 0);

      // GASTOS OPERATIVOS del mes actual (excluyendo compra de materiales que ya se cuentan)
      const gastosOperativosMes = gastosMesActual; // Already calculated above

      // UTILIDAD ACTUAL
      const utilidadActualMes = ingresosMesActual - costosProduccionMes - gastosOperativosMes;

      // PROYECCIÓN
      const diasTranscurridosProyeccion = Math.max(1, now.getDate());
      const diasTotalesMesProyeccion = new Date(currentYear, currentMonth + 1, 0).getDate();
      const promedioDiario = utilidadActualMes / diasTranscurridosProyeccion;
      const utilidadProyectada = promedioDiario * diasTotalesMesProyeccion;

      // Utilidad mes anterior (using same methodology: pagos - costos producción - gastos)
      const ingresosMesAnterior = allPagos
        .filter(p => {
          const d = new Date(p.fecha);
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear && d <= now;
        })
        .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

      const costosProduccionMesAnterior = ordenes
        .filter(o => {
          const d = new Date(o.fecha_creacion);
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear && d <= now;
        })
        .reduce((acc, o) => {
          const mats = o.materiales_usados || [];
          return acc + mats.reduce((sum, item) => sum + (Number(item.costo_calculado) || 0), 0);
        }, 0);

      const gastosOperativosMesAnterior = gastosMesAnterior; // Already calculated
      const utilidadRealMesAnterior = ingresosMesAnterior - costosProduccionMesAnterior - gastosOperativosMesAnterior;

      // Always push the projection as an informational "alert" for the UI card
      alertas.push({
        id: `proyeccion-utilidad-${currentMonth}`,
        titulo: 'Proyección de Utilidad Mensual',
        mensaje: JSON.stringify({
          ingresosMesActual,
          costosProduccionMes,
          gastosOperativosMes,
          utilidadActualMes,
          promedioDiario,
          utilidadProyectada,
          utilidadRealMesAnterior,
          diasTranscurridos: diasTranscurridosProyeccion,
          diasTotalesMes: diasTotalesMesProyeccion
        }),
        tipo: 'FINANCIERO',
        prioridad: utilidadProyectada < utilidadRealMesAnterior && utilidadRealMesAnterior > 0 ? 'ALTA' : 'BAJA',
        fecha_generacion: now.toISOString()
      });

      return alertas;
    } catch (error) {
      console.error("Error al generar alertas:", error);
      return [];
    }
  }
}));