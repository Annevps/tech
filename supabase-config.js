// supabase-config.js
const SUPABASE_URL = 'https://eeslfaplcajgbavwdjvx.supabase.co'; // Insira sua URL do Supabase
const SUPABASE_ANON_KEY = 'sb_publishable_Sa4RVUiZ6o3Omz3xQTrPYw_VuRlOwGc'; // Insira sua chave anon do Supabase

if (typeof supabase === 'undefined') {
    console.error('O SDK do Supabase não foi carregado via CDN no HTML.');
}

// Inicializa a conexão global com o banco
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.db = supabaseClient;

// Função para testar se o banco está respondendo
async function checkDatabaseConnection() {
    try {
        const { data, error } = await window.db.from('usuarios').select('id').limit(1);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Erro de conexão com o Supabase:', err.message);
        return false;
    }
}
