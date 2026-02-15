
import { supabase } from '../lib/supabase';
import { GastoOperativo } from '../types';

export const expenseService = {
    async getGastos(empresaId?: string): Promise<GastoOperativo[]> {
        if (!empresaId) return [];
        const { data, error } = await supabase
            .from('gastos')
            .select('*')
            .eq('empresa_id', empresaId);

        if (error) throw error;
        return data || [];
    },

    async addGasto(gasto: Omit<GastoOperativo, 'id'>): Promise<GastoOperativo> {
        const { data, error } = await supabase
            .from('gastos')
            .insert([gasto])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
