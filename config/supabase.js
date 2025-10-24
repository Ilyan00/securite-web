const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Variables d'environnement Supabase manquantes");
}

if (!supabaseUrl.startsWith("https://")) {
  throw new Error("URL Supabase invalide - doit commencer par https://");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "X-Client-Info": "backend-api",
    },
  },
});

module.exports = supabase;
