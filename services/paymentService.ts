import { supabase } from '../lib/supabase';
import { PagoOrden } from '../types';

export const paymentService = {
    async getPagosByEmpresa(empresaId: string): Promise<PagoOrden[]> {
        if (!empresaId) return [];
        const { data, error } = await supabase
            .from('pagos')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('fecha', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getPagosByOrden(ordenId: string): Promise<PagoOrden[]> {
        const { data, error } = await supabase
            .from('pagos')
            .select('*')
            .eq('orden_id', ordenId)
            .order('fecha', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async createPago(pago: Omit<PagoOrden, 'id' | 'created_at'>): Promise<PagoOrden> {
        const { data, error } = await supabase
            .from('pagos')
            .insert([pago])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateOrdenSaldo(ordenId: string, nuevoSaldo: number, estado: string): Promise<void> {
        const { error } = await supabase
            .from('ordenes')
            .update({ saldo: nuevoSaldo, estado })
            .eq('id', ordenId);

        if (error) throw error;
    }
};
