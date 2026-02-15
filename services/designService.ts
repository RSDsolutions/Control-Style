import { supabase } from '../lib/supabase';
import { Diseno } from '../types';

export const designService = {
    async getDisenos(empresaId: string): Promise<Diseno[]> {
        const { data, error } = await supabase
            .from('disenos')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async addDiseno(diseno: Omit<Diseno, 'id' | 'created_at'>): Promise<Diseno> {
        const { data, error } = await supabase
            .from('disenos')
            .insert([diseno])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateDiseno(id: string, updates: Partial<Diseno>): Promise<Diseno> {
        const { data, error } = await supabase
            .from('disenos')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteDiseno(id: string): Promise<void> {
        const { error } = await supabase
            .from('disenos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async uploadDesignImage(file: File, empresaId: string): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${empresaId}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('disenos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('disenos')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
