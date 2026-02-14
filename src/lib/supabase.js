import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage helpers that match the window.storage API pattern
export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data) return null;
    return { key, value: data.value };
  },

  async set(key, value) {
    const { data, error } = await supabase
      .from('app_data')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single();
    if (error) { console.error('Storage set error:', error); return null; }
    return { key, value: data.value };
  },

  async delete(key) {
    const { error } = await supabase
      .from('app_data')
      .delete()
      .eq('key', key);
    if (error) { console.error('Storage delete error:', error); return null; }
    return { key, deleted: true };
  },

  async list(prefix) {
    const { data, error } = await supabase
      .from('app_data')
      .select('key')
      .like('key', `${prefix}%`);
    if (error) { console.error('Storage list error:', error); return { keys: [] }; }
    return { keys: data.map(d => d.key) };
  },
};
