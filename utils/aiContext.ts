import { useStore } from '../store/useStore';

export const generateSystemPrompt = () => {
    // Access state directly from the store's getter if possible, or we might need to pass data in.
    // Since useStore is a hook, we can't use it outside a component effectively without getState().
    // We will assume the caller passes the store state or we use the vanilla store accessor if available.
    // For now, let's assume we pass the data to this function.
    return "";
};

// Better approach: A helper that takes the store data object
export const buildFinancialContext = (data: any) => {
    const {
        resumen,
        inventario,
        gastos,
        alertas
    } = data;

    const topGastos = gastos
        .sort((a: any, b: any) => b.monto - a.monto)
        .slice(0, 5)
        .map((g: any) => `- ${g.nombre}: $${g.monto} (${g.categoria})`)
        .join('\n');

    const lowStock = inventario
        .filter((i: any) => i.cantidad_actual <= (i.stock_minimo || 5))
        .map((i: any) => `- ${i.nombre}: ${i.cantidad_actual} ${i.unidad_medida}`)
        .join('\n');

    return `
    ERES UN ASISTENTE FINANCIERO VIRTUAL EXPERTO PARA UN TALLER AUTOMOTRIZ (Tapicería).
    TU OBJETIVO: Dar consejos breves, directos y basados en los datos. No saludes con "Hola soy Gemini", di "Hola, soy tu asistente financiero".

    DATOS ACTUALES DEL NEGOCIO:
    - Ventas Totales (Mes): $${resumen?.ventas_totales?.toFixed(2) || 0}
    - Gastos Operativos: $${resumen?.gastos_operativos_totales?.toFixed(2) || 0}
    - Costo de Venta (Materiales): $${resumen?.consumo_materiales_total?.toFixed(2) || 0}
    - Utilidad Real: $${resumen?.utilidad_real?.toFixed(2) || 0}
    - Margen Tributario (Riesgo): ${resumen?.alerta_riesgo || 'N/A'}

    TOP 5 GASTOS:
    ${topGastos || 'No hay gastos registrados.'}

    ALERTA DE STOCK BAJO:
    ${lowStock || 'Inventario saludable.'}

    INSTRUCCIONES:
    1. Si preguntan por "cómo mejorar", analiza los gastos vs ingresos.
    2. Si preguntan por stock, menciona los críticos.
    3. Si el margen tributario es ALTO, sugiere pedir más facturas de gastos.
    4. Sé conciso. Máximo 3 oraciones por respuesta salvo que pidan detalle.
    `;
};
