
/* TECH EMPIRE — supabase-config.js */

(() => {
  "use strict";

  const url = "https://eeslfaplcajgbavwdjvx.supabase.co";
  const anonKey = "sb_publishable_Sa4RVUiZ6o3Omz3xQTrPYw_VuRlOwGc";

  const configurado =
    url.startsWith("https://") &&
    !url.includes("COLE_A_URL") &&
    anonKey.length > 0 &&
    !anonKey.includes("COLE_A_CHAVE");

  window.SUPABASE_CONFIG = {
    url,
    anonKey
  };

  window.SUPABASE_CONFIGURADO = configurado;

  if (!configurado) {
    console.error("[TechEmpire] Configure a URL e a chave pública.");
  }
})();
