
import { supabase } from '../lib/supabase';
import { Producto, RecetaItem } from '../types';

export const productService = {
    async getProductos(empresaId?: string): Promise<Producto[]> {
        if (!empresaId) return [];
        const { data: productos, error } = await supabase
            .from('productos')
            .select(`
        *,
        receta:receta_items(
          material_id,
          cantidad
        )
      `)
            .eq('empresa_id', empresaId);

        if (error) throw error;
        return productos || [];
    },

    async addProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
        const { receta, ...prodData } = producto;

        // 1. Insert Product
        const { data: newProduct, error: prodError } = await supabase
            .from('productos')
            .insert([prodData])
            .select()
            .single();

        if (prodError) throw prodError;

        // 2. Insert Recipe Items
        if (receta && receta.length > 0) {
            const recetaItems = receta.map(item => ({
                producto_id: newProduct.id,
                material_id: item.material_id,
                cantidad: item.cantidad,
                empresa_id: prodData.empresa_id
            }));

            const { error: recipeError } = await supabase
                .from('receta_items')
                .insert(recetaItems);

            if (recipeError) {
                console.error("Error saving recipe:", recipeError);
                await supabase.from('productos').delete().eq('id', newProduct.id);
                throw recipeError;
            }
        }

        return { ...newProduct, receta };
    },

    async deleteProducto(id: string): Promise<void> {
        const { error } = await supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
