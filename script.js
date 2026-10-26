/* TechEmpire — Lógica global */
const CFG = window.SUPABASE_CONFIG || {};
const CONFIGURADO = !!(CFG.url && CFG.anonKey && !CFG.url.startsWith("COLE"));
const sb = CONFIGURADO ? supabase.createClient(CFG.url, CFG.anonKey) : null;
const { SERVICOS, STATUS, PAGAMENTO_STATUS, FORMAS, ETAPAS_LEAD, DISPOSITIVOS, TIPOS_SITE, ATENDIMENTO } = window.TE;
const App = { session: null, perfil: null };

/* Utilitários */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtData = d => d ? new Date(d).toLocaleString("pt-BR") : "—";
const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = n => "TE-" + String(n ?? "").padStart(6, "0");
const digitos = v => String(v || "").replace(/\D/g, "");
const qs = k => new URLSearchParams(location.search).get(k);
const opts = (arr, sel) => arr.map(x => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("");
const pill = (t, cinza) => `<span class="pill ${cinza ? "gray" : ""}">${esc(t)}</span>`;
const tabela = (cab, linhas) => linhas.length ? `<div class="tw"><table><thead><tr>${cab.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${linhas.join("")}</tbody></table></div>` : `<p class="empty">Nada por aqui ainda.</p>`;
function toast(t) { let e = $("#toast"); if (!e) { e = document.createElement("div"); e.id = "toast"; e.setAttribute("role", "status"); document.body.append(e); } e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = "none", 3500); }
function msg(id, texto, ok) { const e = $("#" + id); if (!e) return; e.textContent = texto; e.className = "msg on " + (ok ? "ok" : "err"); }
function ocupado(form, on) { const b = form.querySelector("button[type=submit]"); if (b) b.disabled = on; }
function cpfValido(c) { c = digitos(c); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false; for (const t of [9, 10]) { let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if ((s * 10) % 11 % 10 !== +c[t]) return false; } return true; }
const proximaSegura = n => /^[a-z\-]+\.html(\?[\w=&\-]*)?$/i.test(n || "") ? n : null;

async function comClientes(linhas) { 
  const ids = [...new Set(linhas.map(l => l.cliente_id).filter(Boolean))]; if (!ids.length) return linhas;
  const { data } = await sb.from("usuarios").select("id,nome,email").in("id", ids); const m = Object.fromEntries((data || []).map(u => [u.id, u]));
  return linhas.map(l => ({ ...l, cliente: m[l.cliente_id] || {} }));
}

/* Ações Rápidas */
const Act = {}, Chg = {};
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && Act[b.dataset.act]) { e.preventDefault(); Act[b.dataset.act](b.dataset, b); } });
document.addEventListener("change", e => { const b = e.target.closest("[data-chg]"); if (b && Chg[b.dataset.chg]) Chg[b.dataset.chg](b.dataset, b); });

/* ====================== MENU GLOBAL E SEGURANÇA ====================== */
function desenharChrome() {
  const adm = App.perfil?.is_admin, logado = !!App.session, atual = location.pathname.split("/").pop() || "index.html";
  const l = (href, txt) => `<a href="${href}" class="${atual === href ? "on" : ""}">${txt}</a>`;
  
  // Renderiza o cabeçalho global em todas as páginas (exceto se for a tela de admin, que tem layout próprio)
  const headerEl = $("#site-header");
  if (headerEl && document.body.dataset.page !== 'admin') {
    headerEl.innerHTML = `<div class="bar-in"><a class="logo" href="index.html" aria-label="TechEmpire — início"><i>TE</i><span>Tech<b>Empire</b></span></a>
     <button class="menu" aria-expanded="false" aria-label="Abrir menu">☰</button>
     <nav id="nav">${l("index.html", "Início")}${l("servicos.html", "Serviços")}${l("manutencao.html", "Manutenção")}${l("sobre.html", "Sobre")}${l("contato.html", "Contato")}
     ${logado ? `${adm ? l("admin.html", "Admin") : ""}${l("painel.html", "Meu painel")}${l("perfil.html", "Perfil")}<button class="btn sm" data-act="sair">Sair</button>`
       : `<a class="btn sm" href="login.html">Entrar</a><a class="btn sm primary" href="criar-conta.html">Criar conta</a>`}</nav></div>`;
    $(".menu").onclick = e => { const n = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n); };
  }

  // Renderiza o rodapé
  const footerEl = $("#site-footer");
  if (footerEl && document.body.dataset.page !== 'admin') {
    footerEl.innerHTML = `<div class="foot"><div><a class="logo" href="index.html"><i>TE</i><span>Tech<b>Empire</b></span></a><p>Manutenção de dispositivos, suporte técnico e criação de sites. Tecnologia que funciona.</p></div>
      <div><h4>Site</h4><a href="servicos.html">Serviços</a><a href="manutencao.html">Manutenção preventiva</a><a href="sobre.html">Sobre</a><a href="contato.html">Contato</a></div>
      <div><h4>Sua conta</h4><a href="login.html">Entrar</a><a href="criar-conta.html">Criar conta</a><a href="recuperar-senha.html">Recuperar senha</a></div></div>
      <div class="copy">© ${new Date().getFullYear()} TechEmpire · Seus dados são tratados conforme a LGPD.</div>`;
  }
}
Act.sair = async () => { await sb.auth.signOut(); location.href = "index.html"; };

async function boot() {
  const need = document.body.dataset.auth || "public";
  if (!CONFIGURADO) document.body.insertAdjacentHTML("afterbegin", '<div class="warn">Configure o arquivo supabase-config.js com a URL e a chave anon do seu projeto Supabase.</div>');
  if (sb) {
    const { data } = await sb.auth.getSession(); App.session = data.session;
    if (App.session) { const r = await sb.from("usuarios").select("*").eq("id", App.session.user.id).maybeSingle(); App.perfil = r.data;
      if (App.perfil?.ativo === false) { await sb.auth.signOut(); location.href = "login.html?inativo=1"; return; } }
  }
  if ((need === "client" || need === "admin") && !App.session) { location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); return; }
  if (need === "admin" && !App.perfil?.is_admin) { location.href = "painel.html"; return; }
  if (need === "guest" && App.session && !location.hash.includes("type=recovery")) { location.href = App.perfil?.is_admin ? "admin.html" : "painel.html"; return; }
  
  desenharChrome();
  const fn = Pages[document.body.dataset.page];
  if (fn) { if (!sb && need !== "public") return; try { await fn(); } catch (e) { console.error(e); toast("Ocorreu um erro ao carregar a página."); } }
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: .1 }); $$(".reveal").forEach(e => io.observe(e));
}

/* ====================== STORAGE E CHAT ====================== */
const MAX_BYTES = 50 * 1024 * 1024, TIPOS_OK = /^(image\/|video\/|application\/pdf|text\/plain)/;
async function enviarArquivos(chamadoId, files) {
  let falhas = 0;
  for (const f of files) {
    if (f.size > MAX_BYTES || !TIPOS_OK.test(f.type)) { falhas++; continue; }
    const path = `${chamadoId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
    const up = await sb.storage.from("anexos").upload(path, f, { contentType: f.type });
    if (up.error) { falhas++; continue; }
    const { error } = await sb.from("arquivos_chamados").insert({ chamado_id: chamadoId, usuario_id: App.session.user.id, nome_original: f.name, caminho_storage: path, tipo_arquivo: f.type, tamanho_bytes: String(f.size) });
    if (error) falhas++;
  }
  return falhas;
}
async function desenharArquivos(el, chamadoId) {
  const { data } = await sb.from("arquivos_chamados").select("*").eq("chamado_id", chamadoId).order("criado_em");
  if (!data?.length) { el.innerHTML = '<p class="empty">Nenhum arquivo enviado.</p>'; return; }
  const urls = await Promise.all(data.map(a => sb.storage.from("anexos").createSignedUrl(a.caminho_storage, 3600)));
  el.innerHTML = '<div class="files">' + data.map((a, i) => { const u = urls[i].data?.signedUrl; if (!u) return ""; const t = a.tipo_arquivo || "";
    return `<figure class="file">${t.startsWith("image/") ? `<img src="${esc(u)}" alt="${esc(a.nome_original)}" loading="lazy">` : t.startsWith("video/") ? `<video src="${esc(u)}" controls preload="metadata"></video>` : ""}<figcaption><a href="${esc(u)}" target="_blank" rel="noopener">${esc(a.nome_original)}</a></figcaption></figure>`; }).join("") + "</div>";
}
function iniciarChat(el, chamadoId, admin) {
  el.innerHTML = `<div class="chat"><div class="chat-log" aria-live="polite"><p class="empty">Carregando conversa…</p></div>
    <form class="chat-form"><textarea name="t" rows="1" placeholder="Escreva sua mensagem…" required></textarea>
    <label class="clip" title="Anexar arquivo">📎<input type="file" name="f" multiple hidden accept="image/*,video/*,.pdf,.txt"></label>
    ${admin ? '<label class="int"><input type="checkbox" name="int"> Nota interna</label>' : ""}<button class="btn primary sm" type="submit">Enviar</button></form></div>`;
  const log = $(".chat-log", el), form = $(".chat-form", el); let busy = false, primeira = true;
  async function carregar() {
    if (busy) return; busy = true;
    const { data } = await sb.from("mensagens").select("*").eq("chamado_id", chamadoId).order("criado_em");
    const ids = [...new Set((data || []).map(m => m.remetente_id))]; const us = ids.length ? (await sb.from("usuarios").select("id,nome,is_admin").in("id", ids)).data || [] : [];
    const nomes = Object.fromEntries(us.map(x => [x.id, x])); const meu = App.session.user.id;
    const perto = primeira || log.scrollHeight - log.scrollTop - log.clientHeight < 90;
    log.innerHTML = (data || []).map(m => { const r = nomes[m.remetente_id] || {}, eu = m.remetente_id === meu;
      const quem = eu ? "Você" : (r.is_admin ? "TechEmpire" : r.nome || "Cliente");
      return `<div class="b ${eu ? "me" : "ou"} ${m.interno ? "int" : ""}"><small>${esc(quem)} · ${fmtData(m.criado_em)}${m.interno ? " · NOTA INTERNA" : ""}</small><div>${esc(m.conteudo)}</div></div>`; }).join("") || '<p class="empty">Nenhuma mensagem ainda.</p>';
    if (perto) log.scrollTop = log.scrollHeight; primeira = false;
    busy = false;
  }
  form.addEventListener("submit", async e => { e.preventDefault(); const t = form.t.value.trim(); const files = [...form.f.files]; if (!t && !files.length) return; ocupado(form, true);
    if (files.length) await enviarArquivos(chamadoId, files);
    const texto = t || `📎 Enviou arquivo(s).`;
    const { error } = await sb.from("mensagens").insert({ chamado_id: chamadoId, remetente_id: App.session.user.id, conteudo: texto, interno: admin ? !!form.int?.checked : false });
    ocupado(form, false); if (error) return toast("Erro ao enviar."); form.t.value = ""; form.f.value = ""; await carregar(); log.scrollTop = log.scrollHeight; });
  sb.channel("chat-" + chamadoId).on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `chamado_id=eq.${chamadoId}` }, carregar).subscribe();
  setInterval(carregar, 20000); return carregar();
}

/* ====================== PÁGINAS PÚBLICAS E CLIENTE ====================== */
const Pages = {};
Pages.home = () => { const c = $("#cards-servicos"); if (c) c.innerHTML = SERVICOS.map(s => `<div class="card"><div class="ic">${s.icone}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div>`).join(""); };
Pages.servicos = () => { $("#lista-servicos").innerHTML = SERVICOS.map(s => `<div class="card"><div class="ic">${s.icone}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p><p style="margin-top:14px"><a class="btn sm primary" href="novo-chamado.html?tipo=${s.cat}">Solicitar</a></p></div>`).join(""); };

Pages.contato = () => {
  $("#f-contato").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    if (!d.nome.trim() || !(d.email.trim() || d.telefone.trim()) || !d.mensagem.trim()) return msg("m-contato", "Preencha os campos obrigatórios.");
    ocupado(f, true);
    const { error } = await sb.from("formleads").insert({ nome: d.nome.trim(), email: d.email.trim() || null, telefone: d.telefone.trim() || null, origem: "Site - formulário de contato", servico_interesse: d.servico || null, observacoes: d.mensagem.trim(), etapa: "Novo contato" });
    ocupado(f, false);
    if (error) return msg("m-contato", "Não foi possível enviar agora.");
    f.reset(); msg("m-contato", "Mensagem enviada! Entraremos em contato.", true);
  });
};

Pages.criarConta = () => {
  $("#f-conta").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    if (Object.values(d).some(v => !v.trim())) return msg("m-conta", "Preencha todos os campos.");
    if (!cpfValido(d.cpf)) return msg("m-conta", "CPF inválido.");
    if (d.senha.length < 8) return msg("m-conta", "A senha precisa ter 8 caracteres.");
    if (d.senha !== d.senha2) return msg("m-conta", "As senhas não coincidem.");
    ocupado(f, true);
    const { data, error } = await sb.auth.signUp({ email: d.email.trim().toLowerCase(), password: d.senha, options: { data: { nome: d.nome.trim(), cpf: digitos(d.cpf), telefone: digitos(d.telefone) } } });
    ocupado(f, false);
    if (error) return msg("m-conta", /registered|already/i.test(error.message) ? "E-mail já cadastrado." : "Erro: " + error.message);
    if (!data.session) return msg("m-conta", "Conta criada! Confirme seu e-mail para entrar.", true);
    location.href = "painel.html";
  });
};

Pages.login = () => {
  if (qs("inativo")) msg("m-login", "Seu cadastro está desativado.");
  $("#f-login").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f)); ocupado(f, true);
    const { data, error } = await sb.auth.signInWithPassword({ email: d.email.trim(), password: d.senha });
    if (error) { ocupado(f, false); return msg("m-login", /confirm/i.test(error.message) ? "Confirme seu e-mail." : "E-mail ou senha incorretos."); }
    const { data: p } = await sb.from("usuarios").select("is_admin,ativo").eq("id", data.user.id).maybeSingle();
    if (p?.ativo === false) { await sb.auth.signOut(); ocupado(f, false); return msg("m-login", "Cadastro desativado."); }
    location.href = proximaSegura(qs("next")) || (p?.is_admin ? "admin.html" : "painel.html");
  });
};

Pages.painel = async () => {
  $("#ola").textContent = App.perfil?.nome ? "Olá, " + App.perfil.nome.split(" ")[0] + "." : "";
  const carregar = async () => {
    const { data, error } = await sb.from("chamados").select("id,numero,categoria,titulo,status,criado_em").eq("cliente_id", App.session.user.id).order("criado_em", { ascending: false });
    if (error) { $("#lista").innerHTML = '<p class="empty">Erro ao carregar.</p>'; return; }
    const naoLidas = (await sb.from("mensagens").select("*", { count: "exact", head: true }).eq("lida", false).eq("interno", false).neq("remetente
