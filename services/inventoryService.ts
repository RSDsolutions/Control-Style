
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
        return data || [];
    },

    async getMovimientos(empresaId?: string): Promise<import('../types').MovimientoInventario[]> {
        if (!empresaId) return [];
        const { data, error } = await supabase
            .from('movimientos_inventario')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('fecha', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async addMaterial(material: Omit<Material, 'id'>): Promise<Material> {
        const { data, error } = await supabase
            .from('materiales')
            .insert([material])
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
    }
};
