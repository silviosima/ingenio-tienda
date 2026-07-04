// Configuración del cliente de Supabase para Ingenio cv
// Requiere que antes se haya cargado el SDK de Supabase vía CDN:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = "https://qlsnsrvjcdrpxjnvqpyi.supabase.co";
const SUPABASE_KEY = "sb_publishable_PD7GbUluKLSV-s62SUNinw_MHd7MZUR";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
