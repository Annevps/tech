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
  
  const headerEl = $("#site-header");
  if (headerEl && document.body.dataset.page !== 'admin') {
    headerEl.innerHTML = `<div class="bar-in"><a class="logo" href="index.html" aria-label="TechEmpire — início"><i>TE</i><span>Tech<b>Empire</b></span></a>
     <button class="menu" aria-expanded="false" aria-label="Abrir menu">☰</button>
     <nav id="nav">${l("index.html", "Início")}${l("servicos.html", "Serviços")}${l("manutencao.html", "Manutenção")}${l("sobre.html", "Sobre")}${l("contato.html", "Contato")}
     ${logado ? `${adm ? l("admin.html", "Admin") : ""}${l("painel.html", "Meu painel")}${l("perfil.html", "Perfil")}<button class="btn sm" data-act="sair">Sair</button>`
       : `<a class="btn sm" href="login.html">Entrar</a><a class="btn sm primary" href="criar-conta.html">Criar conta</a>`}</nav></div>`;
    $(".menu").onclick = e => { const n = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n); };
  }

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
    const naoLidas = (await sb.from("mensagens").select("*", { count: "exact", head: true }).eq("lida", false).eq("interno", false).neq("remetente_id", App.session.user.id)).count ?? 0;
    const abertos = data.filter(c => !["Concluída", "Cancelada"].includes(c.status)).length;
    $("#kpis").innerHTML = [[data.length, "Chamados"], [abertos, "Em aberto"], [data.length - abertos, "Finalizados"], [naoLidas, "Novas msgs"]].map(([n, l]) => `<div class="k"><b>${n}</b><span>${l}</span></div>`).join("");
    $("#lista").innerHTML = data.length ? tabela(["Nº", "Serviço", "Título", "Status", "Data"], data.map(c => `<tr class="go" data-act="abrir" data-id="${c.id}"><td><a href="chamado.html?id=${c.id}">${num(c.numero)}</a></td><td>${c.categoria === "site" ? "Site" : "Manutenção"}</td><td>${esc(c.titulo)}</td><td>${pill(c.status)}</td><td>${fmtData(c.criado_em)}</td></tr>`))
      : '<p class="empty">Você ainda não tem chamados.</p>';
  };
  Act.abrir = d => location.href = "chamado.html?id=" + d.id;
  await carregar(); setInterval(carregar, 30000);
};

Pages.novoChamado = () => {
  let tipo = qs("tipo") === "site" ? "site" : "manutencao";
  const sel = () => { $$("[data-tipo]").forEach(b => b.classList.toggle("act", b.dataset.tipo === tipo)); $("#f-manutencao").hidden = tipo !== "manutencao"; $("#f-site").hidden = tipo !== "site"; };
  Act.tipo = d => { tipo = d.tipo; sel(); }; sel();
  $("#sel-disp").innerHTML = '<option value="">Selecione</option>' + opts(DISPOSITIVOS); $("#sel-atend").innerHTML = opts(ATENDIMENTO);
  $("#sel-tsite").innerHTML = '<option value="">Selecione</option>' + opts(TIPOS_SITE);
  $$(".sel-pag").forEach(s => s.innerHTML = opts(FORMAS));
  async function criar(f, cat, titulo, descricao, tabela, detalhe, idMsg) {
    ocupado(f, true);
    const { data: ch, error } = await sb.from("chamados").insert({ cliente_id: App.session.user.id, categoria: cat, titulo, descricao }).select("id,numero").single();
    if (error) { ocupado(f, false); return msg(idMsg, "Erro: " + error.message); }
    await sb.from(tabela).insert({ chamado_id: ch.id, ...detalhe });
    await enviarArquivos(ch.id, [...(f.querySelector("input[type=file]")?.files || [])]);
    ocupado(f, false);
    location.href = `chamado.html?id=${ch.id}&novo=1`;
  }
  $("#f-manutencao").addEventListener("submit", e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (!d.tipo_dispositivo || !d.titulo.trim() || !d.descricao.trim()) return msg("m-manutencao", "Preencha os campos obrigatórios.");
    criar(e.target, "manutencao", d.titulo.trim(), d.descricao.trim(), "detalhes_manutencao", { tipo_dispositivo: d.tipo_dispositivo, marca: d.marca.trim() || null, modelo: d.modelo.trim() || null }, "m-manutencao"); });
  $("#f-site").addEventListener("submit", e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (!d.nome_projeto.trim() || !d.tipo_site || !d.descricao.trim()) return msg("m-site", "Preencha os campos obrigatórios.");
    criar(e.target, "site", "Site: " + d.nome_projeto.trim(), d.descricao.trim(), "detalhes_projetos", { nome_projeto: d.nome_projeto.trim(), tipo_site: d.tipo_site, objetivo: d.objetivo.trim() }, "m-site"); });
};

Pages.chamado = async () => {
  const id = qs("id"); const { data: c } = await sb.from("chamados").select("*").eq("id", id).maybeSingle();
  if (!c) { $("#conteudo").innerHTML = '<p class="empty">Chamado não encontrado.</p>'; return; }
  if (qs("novo")) msg("m-topo", `Chamado ${num(c.numero)} registrado!`, true);
  const m = c.categoria !== "site"; const dt = (await sb.from(m ? "detalhes_manutencao" : "detalhes_projetos").select("*").eq("chamado_id", id).maybeSingle()).data || {};
  $("#conteudo").innerHTML = `<p><a href="painel.html">← Voltar</a></p><h2>${num(c.numero)} · ${esc(c.titulo)}</h2><p>${pill(c.status)} <span class="sub">Aberto em ${fmtData(c.criado_em)}</span></p>
  <div class="box"><h3>Sua solicitação</h3><p style="white-space:pre-wrap">${esc(c.descricao)}</p></div>
  <div class="box"><h3>💬 Conversa com a TechEmpire</h3><div id="chat"></div></div>`;
  iniciarChat($("#chat"), id, false);
};

Pages.perfil = () => {
  const p = App.perfil || {}, en = p.endereco || {};
  const campos = { nome: p.nome, telefone: p.telefone, rua: en.rua, numero: en.numero, bairro: en.bairro, cidade: en.cidade, estado: en.estado };
  const f = $("#f-perfil"); Object.entries(campos).forEach(([k, v]) => { if (f[k]) f[k].value = v || ""; }); f.email.value = p.email || App.session.user.email; f.cpf.value = p.cpf || "";
  f.addEventListener("submit", async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (!d.nome.trim()) return msg("m-perfil", "Informe seu nome."); ocupado(f, true);
    const { error } = await sb.from("usuarios").update({ nome: d.nome.trim(), telefone: digitos(d.telefone) }).eq("id", App.session.user.id);
    ocupado(f, false); msg("m-perfil", error ? "Erro ao salvar." : "Dados atualizados.", !error); });
};

/* ====================== ADMIN (DASHBOARD) ====================== */
Pages.admin = async () => {
  const menuItems = {
    'nav-inicio': 'inicio', 'nav-chamados': 'chamados', 'nav-clientes': 'clientes', 
    'nav-leads': 'leads', 'nav-usuarios': 'usuarios'
  };
  
  Object.keys(menuItems).forEach(id => {
    $(`#${id}`).addEventListener('click', (e) => {
      e.preventDefault();
      $$('.admin-sidebar nav a').forEach(a => a.classList.remove('active'));
      $(`#${id}`).classList.add('active');
      carregarAba(menuItems[id]);
    });
  });

  $('#btn-ver-todos').addEventListener('click', (e) => {
    e.preventDefault();
    $('#nav-chamados').click();
  });

  document.querySelector("#admin-nome").textContent = App.perfil?.nome || "Admin";

  async function carregarAba(aba) {
    const dashView = $('#view-dashboard');
    const dynamicView = $('#area-admin-dinamica');
    const titulo = $('#page-title');
    const subtitulo = $('#page-subtitle');

    if (aba === 'inicio') {
      dashView.style.display = 'grid';
      dynamicView.style.display = 'none';
      titulo.textContent = 'Visão Geral';
      subtitulo.textContent = 'Acompanhe as métricas da sua empresa júnior.';
      
      const c = async (t, fn) => { let q = sb.from(t).select("*", { count: "exact", head: true }); if (fn) q = fn(q); return (await q).count ?? 0; };
      const r = await Promise.all([
        c("usuarios", q => q.eq("is_admin", false)), c("chamados"), 
        c("chamados", q => q.in("status", ["Nova chamada", "Aguardando análise"])), 
        c("chamados", q => q.eq("status", "Em andamento"))
      ]);
      const { data: ultimos } = await sb.from("chamados").select("id,numero,categoria,titulo,status,criado_em,cliente_id").order("criado_em", { ascending: false }).limit(5);
      const L = await comClientes(ultimos || []);

      $("#admin-kpis").innerHTML = `
        <div class="admin-kpi"><h3>Chamados Ativos</h3><b>${r[1] - r[3]}</b><i>📋</i></div>
        <div class="admin-kpi"><h3>Novos / Pendentes</h3><b style="color: var(--lime);">${r[2]}</b><i>⚡</i></div>
        <div class="admin-kpi"><h3>Em Andamento</h3><b>${r[3]}</b><i>🔧</i></div>
        <div class="admin-kpi"><h3>Total Clientes</h3><b>${r[0]}</b><i>👥</i></div>
      `;
      $("#ultimos-chamados").innerHTML = tabela(["Nº", "Cliente", "Serviço", "Status"], L.map(c => `<tr class="go" data-act="abrirAdm" data-id="${c.id}"><td><a href="admin-chamado.html?id=${c.id}">${num(c.numero)}</a></td><td>${esc(c.cliente?.nome || '—')}</td><td>${esc(c.titulo)}</td><td>${pill(c.status)}</td></tr>`));
    
    } else {
      dashView.style.display = 'none';
      dynamicView.style.display = 'block';
      $('#conteudo-admin').innerHTML = '<p class="empty">Carregando dados...</p>';

      if (aba === 'chamados') {
        titulo.textContent = 'Gestão de Chamados'; subtitulo.textContent = 'Gerencie todos os tickets abertos.';
        let q = sb.from("chamados").select("id,numero,cliente_id,categoria,titulo,status,criado_em").order("criado_em", { ascending: false });
        const { data } = await q; const L = await comClientes(data || []);
        $('#conteudo-admin').innerHTML = tabela(["Nº", "Cliente", "Título", "Status", "Data"], L.map(c => `<tr class="go" data-act="abrirAdm" data-id="${c.id}"><td><a href="admin-chamado.html?id=${c.id}">${num(c.numero)}</a></td><td>${esc(c.cliente?.nome)}</td><td>${esc(c.titulo)}</td><td>${pill(c.status)}</td><td>${fmtData(c.criado_em)}</td></tr>`));
      
      } else if (aba === 'clientes') {
        titulo.textContent = 'Base de Clientes'; subtitulo.textContent = 'Todos os usuários cadastrados.';
        const { data } = await sb.from("usuarios").select("*").eq("is_admin", false).order("nome");
        $('#conteudo-admin').innerHTML = tabela(["Nome", "E-mail", "Telefone"], (data || []).map(u => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(u.telefone)}</td></tr>`));

      } else if (aba === 'leads') {
        titulo.textContent = 'Oportunidades (Leads)'; subtitulo.textContent = 'Contatos recebidos pelo site.';
        const { data } = await sb.from("formleads").select("*").order("criado_em", { ascending: false });
        $('#conteudo-admin').innerHTML = tabela(["Nome", "Contato", "Origem", "Interesse", "Mensagem"], (data || []).map(l => `<tr><td>${esc(l.nome)}</td><td>${esc(l.email || l.telefone)}</td><td>${esc(l.origem)}</td><td>${esc(l.servico_interesse)}</td><td>${esc(l.observacoes)}</td></tr>`));
      
      } else if (aba === 'usuarios') {
        titulo.textContent = 'Administradores'; subtitulo.textContent = 'Pessoas com acesso total ao sistema.';
        const { data } = await sb.from("usuarios").select("*").eq("is_admin", true);
        $('#conteudo-admin').innerHTML = tabela(["Nome", "E-mail"], (data || []).map(u => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td></tr>`));
      }
    }
  }

  Act.abrirAdm = d => location.href = "admin-chamado.html?id=" + d.id;
  await carregarAba('inicio');
};

document.addEventListener("DOMContentLoaded", boot);
