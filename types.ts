export type TipoMaterial =
  | 'Cuero' | 'Cuero sintético' | 'Tela' | 'Espuma' | 'Hilo'
  | 'Pegamento' | 'PVC' | 'Alcántara' | 'Vinil' | 'Otro';

export type UnidadMedida = 'Metro' | 'Unidad' | 'Litro' | 'Rollo' | 'Par' | 'Kilogramo' | 'Hoja' | 'Galón';

export type EstadoOrden = 'EN_PROCESO' | 'TERMINADO' | 'ENTREGADO' | 'ENTREGADO_PARCIAL' | 'PAGADO' | 'DEVOLUCION' | 'CANCELADO_FABRICACION';
export type TipoComprobante = 'FACTURA' | 'CONSUMIDOR_FINAL';

// ... imports ...

export interface Material {
  id: string;
  nombre: string;
  tipo: TipoMaterial;
  unidad_medida: UnidadMedida;
  cantidad_actual: number;
  costo_unitario_promedio: number;
  stock_minimo: number; // Nuevo campo para alertas
  created_at?: string;
  empresa_id?: string;
}

export interface ItemOrden {
  material_id: string;
  cantidad: number;
  costo_calculado: number; // Costo al momento del uso (promedio ponderado snapshot)
  empresa_id?: string;
}

// Nueva estructura para Recetas
export interface RecetaItem {
  material_id: string;
  cantidad: number;
  empresa_id?: string;
}

// Nueva entidad Producto (Servicio Fabricado)
export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio_sugerido: number;
  stock: number; // Nuevo campo para alertas
  receta: RecetaItem[];
  created_at?: string;
  empresa_id?: string;
}

export interface OrdenTrabajo {
  id: string;
  cliente: string; // Keep for backward compatibility or display
  vehiculo: string;
  tipo_trabajo: string;
  producto_id?: string;
  precio_venta: number;
  anticipo: number;
  saldo: number;
  tipo_comprobante: TipoComprobante;
  estado: EstadoOrden;
  materiales_usados: ItemOrden[];
  fecha_creacion: string;
  empresa_id?: string;

  // New Fields
  design_id?: string;
  cliente_nombre?: string;
  cliente_cedula?: string;
  cliente_telefono?: string;
  cliente_direccion?: string;

  // Customization
  color_material_principal?: string;
  color_material_secundario?: string;
  color_costura_principal?: string;
  color_costura_secundario?: string;
  tipo_costura_principal?: string;
  tipo_costura_secundario?: string;

  // Finance
  abono?: number;

  // Extra
  notas?: string;
}

export type MetodoPago = 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Depósito' | 'Otro';

export interface PagoOrden {
  id: string;
  orden_id: string;
  monto: number;
  metodo_pago: MetodoPago;
  tiene_factura: boolean;
  fecha: string;
  notas?: string;
  empresa_id?: string;
  created_at?: string;
}

export type CategoriaGasto =
  | 'Arriendo' | 'Servicios Básicos' | 'Internet' | 'Sueldos'
  | 'Transporte' | 'Mantenimiento' | 'Publicidad / Marketing'
  | 'Insumos Administrativos' | 'Equipamiento' | 'Software / Suscripciones'
  | 'Impuestos' | 'Honorarios Profesionales' | 'Seguridad'
  | 'Limpieza' | 'Logística' | 'Otros' | 'Compra Materiales'; // Added Compra Materiales

export type FrecuenciaGasto = 'Único' | 'Diario' | 'Semanal' | 'Mensual' | 'Trimestral' | 'Anual';
export type AreaGasto = 'Producción' | 'Administración' | 'Ventas' | 'Logística' | 'Marketing' | 'General';
export type TipoGasto = 'Fijo' | 'Variable';

export interface GastoOperativo {
  id: string;
  // Información General
  nombre: string;
  categoria: CategoriaGasto;

  // Información Financiera
  monto: number;
  tipo_gasto: TipoGasto;
  metodo_pago: string;

  // Información Operativa
  fecha: string;
  frecuencia: FrecuenciaGasto;

  // Información Tributaria
  tiene_factura: boolean;
  nro_factura?: string;
  proveedor?: string;
  ruc_proveedor?: string;

  // Impacto Operativo
  area: AreaGasto;

  // Adicional
  notas?: string;
  empresa_id?: string;
}

export interface ResumenFinanciero {
  ventas_totales: number;
  gastos_operativos_totales: number;
  consumo_materiales_total: number;
  utilidad_real: number;

  ventas_facturadas: number;
  gastos_facturados: number;
  utilidad_tributaria: number;

  ratio_tributario: number;
  alerta_riesgo: 'BAJO' | 'MEDIO' | 'ALTO';
}

export type PrioridadAlerta = 'ALTA' | 'MEDIA' | 'BAJA';
export type TipoAlerta = 'INVENTARIO' | 'FINANCIERO' | 'OPERATIVO' | 'TRIBUTARIO';

export interface Alerta {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: TipoAlerta;
  prioridad: PrioridadAlerta;
  fecha_generacion: string;
  leido?: boolean;
}

// NUEVO: Módulo de Diseños
export type TipoCostura = 'Recta' | 'Diamante' | 'Panal' | 'Horizontal' | 'Vertical' | 'Personalizado';
export type TipoPatron = 'Liso' | 'Acolchado' | 'Perforado' | 'Mixto';

export interface Diseno {
  id: string;
  nombre: string;
  tipo_costura: TipoCostura;
  tipo_patron: TipoPatron;
  imagen_url?: string | null;
  observaciones?: string;
  activo: boolean;
  empresa_id?: string;
  created_at?: string;
}

export interface Empresa {
  id: string;
  nombre_empresa: string;
  ruc: string;
  direccion: string;
  cedula_representante: string;
  logo_url?: string;
  user_id: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  nombre: string;
  cedula: string;
  email?: string;
  created_at?: string;
}

export type TipoMovimiento = 'COMPRA' | 'CONSUMO' | 'AJUSTE' | 'MERMA';

export interface MovimientoInventario {
  id: string;
  material_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  costo_total: number;
  fecha: string;
  empresa_id?: string;
}