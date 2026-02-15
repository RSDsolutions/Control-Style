
import { supabase } from '../lib/supabase';
import { OrdenTrabajo, ItemOrden } from '../types';

export const orderService = {
    async getOrdenes(empresaId?: string): Promise<OrdenTrabajo[]> {
        if (!empresaId) return [];
        const { data, error } = await supabase
            .from('ordenes')
            .select(`
        *,
        materiales_usados:orden_items(
          material_id,
          cantidad,
          costo_calculado
        )
      `)
            .eq('empresa_id', empresaId);

        if (error) throw error;
        return data || [];
    },

    async createOrden(
        orden: Omit<OrdenTrabajo, 'id' | 'materiales_usados'>,
        items: ItemOrden[],
        empresaId?: string
    ): Promise<OrdenTrabajo> {
        // 1. Insert Order
        const { data: newOrder, error: orderError } = await supabase
            .from('ordenes')
            .insert([orden]) // Orden already has empresa_id passed from store
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Insert Order Items
        if (items && items.length > 0) {
            const dbItems = items.map(item => ({
                orden_id: newOrder.id,
                material_id: item.material_id,
                cantidad: item.cantidad,
                costo_calculado: item.costo_calculado,
                empresa_id: empresaId
            }));

            const { error: itemsError } = await supabase
                .from('orden_items')
                .insert(dbItems);

            if (itemsError) {
                console.error("Error saving order items:", itemsError);
                await supabase.from('ordenes').delete().eq('id', newOrder.id);
                throw itemsError;
            }

            // 3. Record Inventory Consumption (COGS)
            const movements = items.map(item => ({
                material_id: item.material_id,
                tipo: 'CONSUMO',
                cantidad: item.cantidad,
                costo_total: item.costo_calculado, // This is the total cost for this item line
                fecha: new Date().toISOString(),
                referencia_id: newOrder.id,
                empresa_id: empresaId
            }));

            const { error: moveError } = await supabase
                .from('movimientos_inventario')
                .insert(movements);

            if (moveError) console.error("Error logging consumption:", moveError);
        }

        return { ...newOrder, materiales_usados: items };
    },

    async updateOrdenEstado(id: string, estado: string): Promise<void> {
        const { error } = await supabase
            .from('ordenes')
            .update({ estado })
            .eq('id', id);

        if (error) throw error;
    },

    async deleteOrden(id: string): Promise<void> {
        // 1. Get orden_items to reverse inventory
        const { data: items } = await supabase
            .from('orden_items')
            .select('material_id, cantidad')
            .eq('orden_id', id);

        // 2. Reverse inventory consumption (add stock back)
        if (items && items.length > 0) {
            for (const item of items) {
                const { data: material } = await supabase
                    .from('materiales')
                    .select('cantidad_actual')
                    .eq('id', item.material_id)
                    .single();

                if (material) {
                    await supabase
                        .from('materiales')
                        .update({ cantidad_actual: (material.cantidad_actual || 0) + item.cantidad })
                        .eq('id', item.material_id);
                }
            }
        }

        // 3. Delete related pagos
        await supabase.from('pagos').delete().eq('orden_id', id);

        // 4. Delete related orden_items
        await supabase.from('orden_items').delete().eq('orden_id', id);

        // 5. Delete related movimientos_inventario
        await supabase.from('movimientos_inventario').delete().eq('referencia_id', id);

        // 6. Delete the order itself
        const { error } = await supabase.from('ordenes').delete().eq('id', id);
        if (error) throw error;
    },

    async cancelOrden(id: string, nuevoEstado: string): Promise<void> {
        // 1. Delete pagos (deduces from financial control)
        const { error: pagosError } = await supabase
            .from('pagos')
            .delete()
            .eq('orden_id', id);
        if (pagosError) console.error('Error deleting pagos:', pagosError);

        // 2. Change order state (does NOT touch inventory/materials)
        const { error } = await supabase
            .from('ordenes')
            .update({ estado: nuevoEstado, saldo: 0 })
            .eq('id', id);

        if (error) throw error;
    }
};
