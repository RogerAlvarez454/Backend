const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Debe ser Service Role Key para permisos de storage
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
