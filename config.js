// Configuração da nuvem. Sem estes valores a app funciona só neste aparelho, sem conta.
// Os valores estão em Supabase > Project Settings > API. A chave "anon" é pública por natureza:
// a segurança vem das regras (RLS) definidas em supabase/schema.sql.
window.VINHO_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
