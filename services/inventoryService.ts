
import { supabase } from '../lib/supabase';
import { Material } from '../types';

export const inventoryService = {
    async getMateriales(empresaId?: string): Promise<Material[]> {
        if (!empresaId) return [];
        const { data, error } = await supabase
            .from('materiales')
            .select('*')
            .eq('empresa_id', empresaId);

        if (error) throw error;
        return (data || []).map(item => ({
            ...item,
            cantidad_actual: Number(item.cantidad_actual),
            costo_unitario_promedio: Number(item.costo_unitario_promedio),
            stock_minimo: Number(item.stock_minimo)
        }));
    },

    async getMovimientos(empresaId?: string): Promise<import('../types').MovimientoInventario[]> {
        if (!empresaId) return [];
        const { data, error } = await supabase
            .from('movimientos_inventario')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('fecha', { ascending: false });

        if (error) throw error;
        return (data || []).map(m => ({
            ...m,
            cantidad: Number(m.cantidad),
            costo_total: Number(m.costo_total)
        }));
    },

    async addMaterial(material: Omit<Material, 'id'>, fechaCreacion?: string): Promise<Material> {
        const { data, error } = await supabase
            .from('materiales')
            .insert([{ ...material, created_at: fechaCreacion || new Date().toISOString() }])
            .select('*')
            .single();

        if (error) throw error;
        return data;
    },

    async registrarCompraMaterial(id: string, cantidad: number, costo_total: number, empresaId?: string): Promise<void> {
        // 1. Get current material
        const { data: material, error: fetchError } = await supabase
            .from('materiales')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // 2. Calculate new average cost
        const currentTotalValue = (material.cantidad_actual || 0) * (material.costo_unitario_promedio || 0);
        const newTotalValue = currentTotalValue + costo_total;
        const newTotalQuantity = (material.cantidad_actual || 0) + cantidad;
        const newAverageCost = newTotalQuantity > 0 ? newTotalValue / newTotalQuantity : 0;

        // 3. Update Material
        const { error: updateError } = await supabase
            .from('materiales')
            .update({
                cantidad_actual: newTotalQuantity,
                costo_unitario_promedio: newAverageCost
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // 4. Record Movement (Asset Increase)
        const { error: movementError } = await supabase
            .from('movimientos_inventario')
            .insert([{
                material_id: id,
                tipo: 'COMPRA',
                cantidad: cantidad,
                costo_total: costo_total,
                fecha: new Date().toISOString(),
                empresa_id: empresaId
            }]);

        if (movementError) console.error("Error logging movement:", movementError);
    },

    async registrarMerma(id: string, cantidad: number, empresaId?: string): Promise<void> {
        // 1. Get current material
        const { data: material, error: fetchError } = await supabase
            .from('materiales')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // 2. Logic: Reduce Stock, Keep Total Value (Cost), Recalculate Unit Cost
        // Costo Unitario = Costo Total Invertido / Stock Actual
        const currentStock = material.cantidad_actual || 0;
        const currentAvgCost = material.costo_unitario_promedio || 0;
        const totalInvestedValue = currentStock * currentAvgCost; // This value MUST be preserved

        const newStock = currentStock - cantidad;

        if (newStock < 0) throw new Error("Stock insuficiente para registrar merma");

        // Recalculate Unit Cost: Total Value / New Stock
        // If newStock is 0, cost is 0 (or undefined, but let's say 0 to avoid Infinity in DB)
        const newAverageCost = newStock > 0 ? totalInvestedValue / newStock : 0;

        // 3. Update Material
        const { error: updateError } = await supabase
            .from('materiales')
            .update({
                cantidad_actual: newStock,
                costo_unitario_promedio: newAverageCost
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // 4. Record Movement (Merma - Internal)
        // We log it so we know where the stock went, but this type 'MERMA' should NOT be used for Tax/Financial Dashboard generally.
        // It consumes stock but generates NO financial expense (cost was already incurred at purchase).
        const { error: movementError } = await supabase
            .from('movimientos_inventario')
            .insert([{
                material_id: id,
                tipo: 'MERMA', // New Type
                cantidad: cantidad,
                costo_total: 0, // No NEW cost incurred. Value is transferred to remaining units.
                fecha: new Date().toISOString(),
                empresa_id: empresaId
            }]);

        if (movementError) console.error("Error logging movement:", movementError);
        if (movementError) console.error("Error logging movement:", movementError);
    },

    async registrarIngresoActivo(
        materialData: { nombre: string; tipo: Material['tipo']; unidad_medida: Material['unidad_medida'] },
        cantidad: number,
        costo_total: number,
        notas: string,
        empresaId?: string,
        ordenOrigenId?: string, // New optional param
        fechaCreacion?: string // New optional param for custom date
    ): Promise<void> {
        // 1. Find or Create Material
        let materialId: string | undefined;

        const { data: existingMaterials } = await supabase
            .from('materiales')
            .select('id, cantidad_actual, costo_unitario_promedio')
            .eq('nombre', materialData.nombre)
            .eq('empresa_id', empresaId)
            .limit(1);

        if (existingMaterials && existingMaterials.length > 0) {
            materialId = existingMaterials[0].id;
        } else {
            // Create new
            const { data: newMat, error: createError } = await supabase
                .from('materiales')
                .insert([{
                    nombre: materialData.nombre,
                    tipo: materialData.tipo || 'Producto Terminado',
                    unidad_medida: materialData.unidad_medida || 'Unidad',
                    cantidad_actual: 0,
                    costo_unitario_promedio: 0,
                    stock_minimo: 0,
                    empresa_id: empresaId,
                    created_at: fechaCreacion || new Date().toISOString()
                }])
                .select()
                .single();

            if (createError) throw createError;
            materialId = newMat.id;
        }

        if (!materialId) throw new Error("Failed to resolve material ID");

        // 2. Fetch current state
        const { data: material, error: fetchError } = await supabase
            .from('materiales')
            .select('*')
            .eq('id', materialId)
            .single();

        if (fetchError) throw fetchError;

        // 3. Update Material (Stock & Cost)
        const currentTotalValue = (material.cantidad_actual || 0) * (material.costo_unitario_promedio || 0);
        const newTotalValue = currentTotalValue + costo_total;
        const newTotalQuantity = (material.cantidad_actual || 0) + cantidad;
        const newAverageCost = newTotalQuantity > 0 ? newTotalValue / newTotalQuantity : 0;

        const { error: updateError } = await supabase
            .from('materiales')
            .update({
                cantidad_actual: newTotalQuantity,
                costo_unitario_promedio: newAverageCost
            })
            .eq('id', materialId);

        if (updateError) throw updateError;

        // 4. Record Movement (INGRESO_ACTIVO)
        const mvmt: any = {
            material_id: materialId,
            tipo: 'INGRESO_ACTIVO',
            cantidad: cantidad,
            costo_total: costo_total,
            fecha: new Date().toISOString(),
            empresa_id: empresaId,
            referencia_id: ordenOrigenId,
            origen: ordenOrigenId ? 'ActivoRecuperado' : 'Activo'
        };

        const { error: movementError } = await supabase
            .from('movimientos_inventario')
            .insert([mvmt]);

        if (movementError) {
            // Fallback: If 'origen' column doesn't exist, try without it
            if (movementError.message.includes('origen')) {
                delete mvmt.origen;
                const { error: retryError } = await supabase
                    .from('movimientos_inventario')
                    .insert([mvmt]);
                if (retryError) console.error("Error logging movement (retry):", retryError);
            } else {
                console.error("Error logging movement:", movementError);
            }
        }
    }
    ,

    async registrarCorreccionIngreso(
        materialId: string,
        cantidad: number,
        motivo: string,
        empresaId?: string
    ): Promise<number> {
        // 1. Get Material
        const { data: material, error: matError } = await supabase
            .from('materiales')
            .select('*')
            .eq('id', materialId)
            .single();

        if (matError || !material) throw new Error("Material no encontrado");

        // Validate Stock
        if (material.cantidad_actual < cantidad) {
            throw new Error(`Stock insuficiente para corrección. Stock actual: ${material.cantidad_actual} ${material.unidad_medida}`);
        }

        // 2. Calculate Cost to Reverse
        // Costo Total = Cantidad * Costo Promedio Actual
        const costoTotal = cantidad * (material.costo_unitario_promedio || 0);
        const newStock = material.cantidad_actual - cantidad;

        // 3. Update Material (Reduce Stock, Keep Cost Avg)
        const { error: updateError } = await supabase
            .from('materiales')
            .update({ cantidad_actual: newStock })
            .eq('id', materialId);

        if (updateError) throw updateError;

        // 4. Record Movement
        const { error: mvmtError } = await supabase.from('movimientos_inventario').insert([{
            material_id: materialId,
            tipo: 'CORRECCION_INGRESO',
            cantidad: -cantidad,
            costo_total: -costoTotal,
            fecha: new Date().toISOString(),
            origen: motivo,
            empresa_id: empresaId
        }]);

        if (mvmtError) console.error("Error logging movement:", mvmtError);

        return costoTotal;
    }
};
