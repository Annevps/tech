/* TechEmpire — lógica compartilhada por todas as páginas.
   Cada página declara <body data-page="..." data-auth="public|guest|client|admin">. */
const CFG = window.SUPABASE_CONFIG || {};
const CONFIGURADO = !!(CFG.url && CFG.anonKey && !CFG.url.startsWith("COLE"));
const sb = CONFIGURADO ? supabase.createClient(CFG.url, CFG.anonKey) : null;
const { SERVICOS, STATUS, PAGAMENTO_STATUS, FORMAS, ETAPAS_LEAD, DISPOSITIVOS, TIPOS_SITE, ATENDIMENTO, PRIORIDADES } = window.TE;
const App = { session: null, perfil: null };

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtData = d => d ? new Date(d).toLocaleString("pt-BR") : "—";
const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = n => "TE-" + String(n ?? "").padStart(6, "0");
const digitos = v => String(v || "").replace(/\D/g, "");
const qs = k => new URLSearchParams(location.search).get(k);
const opts = (arr, sel) => arr.map(x => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("");
const badge2 = n => n ? `<span class="pill" title="Mensagens não lidas">💬 ${n}</span>` : "";
const stPill = s => { const m = { "Em andamento": "run", "Concluída": "done", "Cancelada": "off", "Nova chamada": "new" }; return `<span class="st ${m[s] || "wait"}">${esc(s)}</span>`; };
const pill = (t, cinza) => `<span class="pill ${cinza ? "gray" : ""}">${esc(t)}</span>`;
const tabela = (cab, linhas) => linhas.length ? `<div class="tw"><table><thead><tr>${cab.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${linhas.join("")}</tbody></table></div>` : `<p class="empty">Nada por aqui ainda.</p>`;
function toast(t) { let e = $("#toast"); if (!e) { e = document.createElement("div"); e.id = "toast"; e.setAttribute("role", "status"); document.body.append(e); } e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = "none", 3500); }
function msg(id, texto, ok) { const e = $("#" + id); if (!e) return; e.textContent = texto; e.className = "msg on " + (ok ? "ok" : "err"); }
function ocupado(form, on) { const b = form.querySelector("button[type=submit]"); if (b) b.disabled = on; }
function cpfValido(c) { c = digitos(c); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false; for (const t of [9, 10]) { let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if ((s * 10) % 11 % 10 !== +c[t]) return false; } return true; }
const proximaSegura = n => /^[a-z\-]+\.html(\?[\w=&\-]*)?$/i.test(n || "") ? n : null;
async function comClientes(linhas) { // junta o nome do cliente em cada chamado
  const ids = [...new Set(linhas.map(l => l.cliente_id).filter(Boolean))]; if (!ids.length) return linhas;
  const { data } = await sb.from("usuarios").select("id,nome,email").in("id", ids); const m = Object.fromEntries((data || []).map(u => [u.id, u]));
  return linhas.map(l => ({ ...l, cliente: m[l.cliente_id] || {} }));
}

/* ---------- Ações por data-act / data-chg (sem onclick inline) ---------- */
const Act = {}, Chg = {};
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && Act[b.dataset.act]) { e.preventDefault(); Act[b.dataset.act](b.dataset, b); } });
document.addEventListener("change", e => { const b = e.target.closest("[data-chg]"); if (b && Chg[b.dataset.chg]) Chg[b.dataset.chg](b.dataset, b); });

/* ---------- Cabeçalho, rodapé e guarda de acesso ---------- */
function topoApp(o) {
  const nome = App.perfil?.nome || o.papel, ini = esc(nome.trim()[0] || "A").toUpperCase();
  $("#site-header").innerHTML = `<div class="bar-in wide"><a class="logo" href="${o.home}" aria-label="TechEmpire"><i>TE</i><span>Tech<b>Empire</b></span></a>
    <form class="search" id="busca-global" role="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input name="q" type="search" placeholder="${o.busca}" aria-label="Buscar"></form>
    <div class="top-r"><a class="bell" href="${o.sino}" aria-label="Mensagens novas"><svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0"/></svg><i></i></a>
    <div class="user"><span class="av">${ini}</span><span class="un"><b>${esc(nome)}</b><small>${o.papel}</small></span></div><button class="btn sm" data-act="sair">Sair</button></div></div>`;
  $("#busca-global").onsubmit = e => { e.preventDefault(); const v = e.target.q.value.trim(); location.href = o.buscaHref + (v ? "?q=" + encodeURIComponent(v) : ""); };
  sb.from("mensagens").select("*", { count: "exact", head: true }).eq("lida", false).eq("interna", false).neq("remetente_id", App.session.user.id).then(r => { if (r.count) $(".bell")?.classList.add("on"); });
  $("#site-footer").innerHTML = `<div class="copy" style="margin:0 auto">© ${new Date().getFullYear()} TechEmpire · ${o.rodape}</div>`;
}
const MENU_CLIENTE = [
  ["painel.html", "Início", '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
  ["painel.html#/servicos", "Meus Serviços", '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.6-.6-2.2z"/>'],
  ["painel.html#/tickets", "Meus Tickets", '<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z"/><path d="M13 6v12" stroke-dasharray="2 3"/>'],
  ["perfil.html", "Perfil", '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'],
  ["painel.html#/faturas", "Faturas", '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'],
  ["painel.html#/contato", "Contato", '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>']
];
function marcarMenu() {
  const f = location.pathname.split("/").pop() || "index.html", h = (location.hash || "").split("?")[0]; let alvo;
  if (f === "painel.html") alvo = "painel.html" + (h && h !== "#/" ? h : ""); else if (f === "perfil.html") alvo = "perfil.html"; else alvo = "painel.html#/servicos";
  $$(".side a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === alvo));
}
function envolverCliente() {
  const main = $("main.wrap-main"); if (!main) return; main.classList.add("wide");
  const shell = document.createElement("div"); shell.className = "shell"; const side = document.createElement("nav"); side.className = "side"; side.setAttribute("aria-label", "Menu do cliente");
  side.innerHTML = MENU_CLIENTE.map(([h, t, p]) => `<a href="${h}"><svg viewBox="0 0 24 24">${p}</svg>${t}</a>`).join("") + '<div class="side-card"><b>Seu equipamento em boas mãos!</b><span>Tecnologia que funciona.</span></div>';
  const box = document.createElement("div"); box.id = "conteudo-cli"; while (main.firstChild) box.append(main.firstChild); shell.append(side, box); main.append(shell); marcarMenu();
}
function desenharChrome() {
  const adm = App.perfil?.is_admin, logado = !!App.session, atual = location.pathname.split("/").pop() || "index.html";
  if (adm) { topoApp({ home: "admin.html", papel: "Administrador", busca: "Buscar chamados ou clientes…", buscaHref: "admin.html#/chamados", sino: "admin.html#/mensagens", rodape: "Painel administrativo" }); return; }
  if (logado && document.body.dataset.auth === "client") { topoApp({ home: "painel.html", papel: "Cliente", busca: "Buscar serviços, tickets ou informações…", buscaHref: "painel.html#/servicos", sino: "painel.html#/tickets", rodape: "Tecnologia que funciona." }); return; }
  const l = (href, txt) => `<a href="${href}" class="${atual === href ? "on" : ""}">${txt}</a>`;
  $("#site-header").innerHTML = `<div class="bar-in"><a class="logo" href="index.html" aria-label="TechEmpire — início"><i>TE</i><span>Tech<b>Empire</b></span></a>
   <button class="menu" aria-expanded="false" aria-label="Abrir menu">☰</button>
   <nav id="nav">${l("index.html", "Início")}${l("servicos.html", "Serviços")}${l("manutencao.html", "Manutenção")}${l("sobre.html", "Sobre")}${l("contato.html", "Contato")}
   ${logado ? `${adm ? l("admin.html", "Admin") : ""}${l("painel.html", "Meu painel")}${l("perfil.html", "Perfil")}<button class="btn sm" data-act="sair">Sair</button>`
     : `<a class="btn sm" href="login.html">Entrar</a><a class="btn sm primary" href="criar-conta.html">Criar conta</a>`}</nav></div>`;
  $(".menu").onclick = e => { const n = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n); };
  $("#site-footer").innerHTML = `<div class="foot"><div><a class="logo" href="index.html"><i>TE</i><span>Tech<b>Empire</b></span></a><p>Manutenção de dispositivos, suporte técnico e criação de sites. Tecnologia que funciona.</p></div>
    <div><h4>Site</h4><a href="servicos.html">Serviços</a><a href="manutencao.html">Manutenção preventiva</a><a href="sobre.html">Sobre</a><a href="contato.html">Contato</a></div>
    <div><h4>Sua conta</h4><a href="login.html">Entrar</a><a href="criar-conta.html">Criar conta</a><a href="recuperar-senha.html">Recuperar senha</a></div></div>
    <div class="copy">© ${new Date().getFullYear()} TechEmpire · Seus dados são tratados conforme a LGPD.</div>`;
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
  if (need === "client" && App.perfil?.is_admin) { location.href = "admin.html"; return; }
  if (need === "guest" && App.session && !location.hash.includes("type=recovery")) { location.href = App.perfil?.is_admin ? "admin.html" : "painel.html"; return; }
  desenharChrome(); if (need === "client") envolverCliente();
  const fn = Pages[document.body.dataset.page];
  if (fn) { if (!sb && need !== "public") return; try { await fn(); } catch (e) { console.error(e); toast("Ocorreu um erro ao carregar a página."); $$(".empty").forEach(p => { if (p.textContent.startsWith("Carregando")) p.textContent = "Não foi possível carregar: " + (e.message || e) + ". Confira se o script.js e o style.css foram atualizados e aperte Ctrl+F5."; }); } }
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: .1 }); $$(".reveal").forEach(e => io.observe(e));
}

/* ---------- Anexos (Storage privado "anexos", pasta = id do chamado) ---------- */
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
  if (iniciarChat.parar) iniciarChat.parar();
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
      return `<div class="b ${eu ? "me" : "ou"} ${m.interna ? "int" : ""}"><small>${esc(quem)} · ${fmtData(m.criado_em)}${m.interna ? " · NOTA INTERNA" : ""}</small><div>${esc(m.conteudo)}</div></div>`; }).join("") || '<p class="empty">Nenhuma mensagem ainda. Mande a primeira!</p>';
    if (perto) log.scrollTop = log.scrollHeight; primeira = false;
    const nao = (data || []).filter(m => !m.lida && m.remetente_id !== meu && (admin || !m.interna)).map(m => m.id);
    if (nao.length) sb.from("mensagens").update({ lida: true }).in("id", nao).then(() => {});
    busy = false;
  }
  form.addEventListener("submit", async e => { e.preventDefault(); const t = form.t.value.trim(); const files = [...form.f.files]; if (!t && !files.length) return; ocupado(form, true);
    let falhas = 0; if (files.length) { falhas = await enviarArquivos(chamadoId, files); document.dispatchEvent(new CustomEvent("chat-arquivos")); }
    const texto = t || `📎 Enviou ${files.length - falhas} arquivo(s).`;
    const { error } = await sb.from("mensagens").insert({ chamado_id: chamadoId, remetente_id: App.session.user.id, conteudo: texto, interna: admin ? !!form.int?.checked : false });
    ocupado(form, false); if (error) return toast("Não foi possível enviar a mensagem."); if (falhas) toast(falhas + " arquivo(s) não enviado(s) (máx. 50 MB)."); form.t.value = ""; form.f.value = ""; await carregar(); log.scrollTop = log.scrollHeight; });
  form.t.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  const canal = sb.channel("chat-" + chamadoId).on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `chamado_id=eq.${chamadoId}` }, carregar).subscribe();
  const tmr = setInterval(carregar, 20000); iniciarChat.parar = () => { clearInterval(tmr); sb.removeChannel(canal); }; return carregar();
}
async function desenharHistorico(el, chamadoId) {
  const { data } = await sb.from("historico_status").select("*").eq("chamado_id", chamadoId).order("criado_em");
  el.innerHTML = data?.length ? '<ul class="tl">' + data.map(h => `<li>${fmtData(h.criado_em)} — ${esc(h.status_anterior || "Início")} → <b>${esc(h.status_novo)}</b></li>`).join("") + "</ul>" : '<p class="empty">Sem alterações registradas.</p>';
}
async function desenharPagamentos(el, chamadoId) {
  const { data } = await sb.from("pagamentos").select("*").eq("chamado_id", chamadoId).order("criado_em", { ascending: false });
  el.innerHTML = tabela(["Valor", "Forma", "Status", "Origem", "Data"], (data || []).map(p => `<tr><td>${brl(p.valor)}</td><td>${esc(p.forma)}</td><td>${pill(p.status)}</td><td>${p.manual ? "Registro manual" : "Online"}</td><td>${fmtData(p.pago_em || p.criado_em)}</td></tr>`));
}

/* ====================== PÁGINAS ====================== */
const Pages = {};

Pages.home = () => { const c = $("#cards-servicos"); if (c) c.innerHTML = SERVICOS.map(s => `<div class="card"><div class="ic">${s.icone}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div>`).join(""); };
Pages.servicos = () => { $("#lista-servicos").innerHTML = SERVICOS.map(s => `<div class="card"><div class="ic">${s.icone}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p><p style="margin-top:14px"><a class="btn sm primary" href="novo-chamado.html?tipo=${s.cat}">Solicitar</a></p></div>`).join(""); };

Pages.contato = () => {
  $("#f-contato").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    if (!d.nome.trim() || !(d.email.trim() || d.telefone.trim()) || !d.mensagem.trim()) return msg("m-contato", "Informe nome, um contato (e-mail ou telefone) e a mensagem.");
    ocupado(f, true);
    const { error } = await sb.from("forleads").insert({ nome: d.nome.trim(), email: d.email.trim() || null, telefone: d.telefone.trim() || null, origem: "Site - formulário de contato", servico_interesse: d.servico || null, observacoes: d.mensagem.trim(), etapa: "Novo contato" });
    ocupado(f, false);
    if (error) return msg("m-contato", "Não foi possível enviar agora. Tente novamente em instantes.");
    f.reset(); msg("m-contato", "Mensagem enviada! Entraremos em contato em breve.", true);
  });
};

Pages.criarConta = () => {
  $("#f-conta").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    if (Object.values(d).some(v => !v.trim())) return msg("m-conta", "Preencha todos os campos.");
    if (!cpfValido(d.cpf)) return msg("m-conta", "CPF inválido. Confira os números.");
    if (digitos(d.telefone).length < 10) return msg("m-conta", "Informe um WhatsApp válido, com DDD.");
    if (!/^[A-Za-z]{2}$/.test(d.estado.trim())) return msg("m-conta", "O estado deve ter 2 letras (ex.: ES).");
    if (d.senha.length < 8) return msg("m-conta", "A senha precisa ter pelo menos 8 caracteres.");
    if (d.senha !== d.senha2) return msg("m-conta", "As senhas não coincidem.");
    ocupado(f, true);
    const { data, error } = await sb.auth.signUp({ email: d.email.trim().toLowerCase(), password: d.senha, options: { emailRedirectTo: location.origin + location.pathname.replace("criar-conta.html", "login.html"),
      data: { nome: d.nome.trim(), cpf: digitos(d.cpf), telefone: digitos(d.telefone), endereco: { rua: d.rua.trim(), numero: d.numero.trim(), bairro: d.bairro.trim(), cidade: d.cidade.trim(), estado: d.estado.trim().toUpperCase() } } } });
    ocupado(f, false);
    if (error) return msg("m-conta", /registered|already/i.test(error.message) ? "Este e-mail já está cadastrado." : /database/i.test(error.message) ? "Não foi possível criar a conta. O CPF pode já estar cadastrado." : "Erro ao criar conta: " + error.message);
    if (!data.session) return msg("m-conta", "Conta criada! Confirme seu e-mail pelo link que enviamos e depois faça login.", true);
    location.href = "painel.html";
  });
};

Pages.login = () => {
  if (qs("inativo")) msg("m-login", "Seu cadastro está desativado. Fale com a TechEmpire.");
  $("#f-login").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f)); ocupado(f, true);
    const { data, error } = await sb.auth.signInWithPassword({ email: d.email.trim(), password: d.senha });
    if (error) { ocupado(f, false); return msg("m-login", /confirm/i.test(error.message) ? "Confirme seu e-mail antes de entrar." : "E-mail ou senha incorretos."); }
    const { data: p } = await sb.from("usuarios").select("is_admin,ativo").eq("id", data.user.id).maybeSingle();
    if (p?.ativo === false) { await sb.auth.signOut(); ocupado(f, false); return msg("m-login", "Seu cadastro está desativado."); }
    location.href = proximaSegura(qs("next")) || (p?.is_admin ? "admin.html" : "painel.html");
  });
};

Pages.recuperar = () => {
  const mostrarNova = () => { $("#f-recuperar").hidden = true; $("#f-nova").hidden = false; };
  if (location.hash.includes("type=recovery")) mostrarNova();
  sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") mostrarNova(); });
  $("#f-recuperar").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target; ocupado(f, true);
    await sb.auth.resetPasswordForEmail(new FormData(f).get("email").trim(), { redirectTo: location.origin + location.pathname });
    ocupado(f, false); msg("m-recuperar", "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.", true);
  });
  $("#f-nova").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    if (d.senha.length < 8) return msg("m-nova", "A senha precisa ter pelo menos 8 caracteres.");
    if (d.senha !== d.senha2) return msg("m-nova", "As senhas não coincidem.");
    ocupado(f, true); const { error } = await sb.auth.updateUser({ password: d.senha }); ocupado(f, false);
    if (error) return msg("m-nova", "Não foi possível alterar a senha: " + error.message);
    msg("m-nova", "Senha alterada! Redirecionando…", true); setTimeout(() => location.href = "painel.html", 1200);
  });
};

Pages.painel = async () => {
  const me = App.session.user.id, nome = App.perfil?.nome || "";
  const PCT = { "Nova chamada": 10, "Aguardando análise": 25, "Aguardando aprovação do orçamento": 35, "Aguardando pagamento": 45, "Aprovada": 55, "Aguardando informações do cliente": 60, "Em andamento": 75, "Concluída": 100, "Cancelada": 0 };
  const SV = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>', app = $("#cli-app");
  async function dados() {
    const { data: chs } = await sb.from("chamados").select("id,numero,categoria,titulo,status,criado_em").eq("cliente_id", me).order("criado_em", { ascending: false });
    const { data: nm } = await sb.from("mensagens").select("chamado_id").eq("lida", false).eq("interna", false).neq("remetente_id", me);
    const nl = {}; (nm || []).forEach(x => nl[x.chamado_id] = (nl[x.chamado_id] || 0) + 1);
    const { data: pgs } = await sb.from("pagamentos").select("*").order("criado_em", { ascending: false });
    return { chs: chs || [], nl, pgs: pgs || [] };
  }
  const svc = c => { const p = PCT[c.status] ?? 0; return `<a class="svc" href="chamado.html?id=${c.id}"><span class="thumb">${SV}</span><div class="svc-i"><b>${esc(c.titulo)}</b><small>${num(c.numero)}</small><small>${c.categoria === "site" ? "Criação de site" : "Manutenção"}</small></div><div class="svc-p">${stPill(c.status)}<small>${new Date(c.criado_em).toLocaleDateString("pt-BR")}</small><div class="bar-p" title="Etapa do atendimento"><i style="width:${p}%"></i></div></div><span class="arr">›</span></a>`; };
  const kc = (href, cls, svg, t, big, sub) => `<a class="kpc" href="${href}"><span class="kic ${cls}"><svg viewBox="0 0 24 24">${svg}</svg></span><span class="arr">›</span><span class="kl" style="margin-top:12px">${t}</span>${big}<small>${sub}</small></a>`;
  const R = {
    async inicio() {
      const { chs, nl, pgs } = await dados(), ids = chs.map(c => c.id), mapa = Object.fromEntries(chs.map(c => [c.id, c]));
      const { data: hs } = ids.length ? await sb.from("historico_status").select("chamado_id,status_novo,criado_em").in("chamado_id", ids).order("criado_em", { ascending: false }).limit(4) : { data: [] };
      const andando = chs.filter(c => c.status === "Em andamento").length, espera = chs.filter(c => ["Aguardando informações do cliente", "Aguardando aprovação do orçamento"].includes(c.status)).length, pend = pgs.filter(p => ["Pendente", "Aguardando pagamento"].includes(p.status)).length;
      const lista = chs.filter(c => !["Concluída", "Cancelada"].includes(c.status)).concat(chs.filter(c => ["Concluída", "Cancelada"].includes(c.status))).slice(0, 3);
      const conv = chs.slice().sort((a, b) => (nl[b.id] || 0) - (nl[a.id] || 0)).slice(0, 30);
      app.innerHTML = `<div class="home-grid"><div class="home-main">
        <section class="hero-cli"><svg class="lap" viewBox="0 0 320 200" aria-hidden="true"><rect x="60" y="20" width="200" height="130" rx="10"/><rect x="72" y="32" width="176" height="106" rx="4"/><path d="M20 165h280l-18 15H38z"/></svg>
          <p class="hello"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg> Olá, ${esc(nome)}!</p><h2 class="big">Que bom te ver de volta!</h2><p class="sub" style="max-width:520px;margin:0">Aqui você acompanha o andamento dos seus serviços, tickets e tem acesso a todas as informações da sua conta.</p></section>
        <div class="kp">${kc("#/servicos", "g", '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.6-.6-2.2z"/>', "Meus serviços", `<b>${andando}</b>`, "Em andamento")}
          ${kc("#/tickets", "b", '<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z"/>', "Meus tickets", `<b>${espera}</b>`, "Aguardando sua resposta")}
          ${kc("#/faturas", "p", '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', "Faturas", `<b>${pend}</b>`, "Pendentes")}
          ${kc("#/contato", "m", '<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM20 14h-3v5h3zM17 19c0 2-2 2-5 2"/>', "Suporte", '<b style="font-size:19px;line-height:1.3;margin-top:10px">Sempre disponível</b>', "Segunda a Sábado · 8h às 19h")}</div>
        <div class="box"><div class="row" style="justify-content:space-between;margin-bottom:12px"><div><h3 style="margin:0">Meus serviços</h3><span class="sub" style="margin:0">Acompanhe o status dos seus equipamentos.</span></div><a class="btn sm" href="#/servicos">Ver todos ›</a></div>
          ${lista.length ? lista.map(svc).join("") : '<p class="empty">Você ainda não tem serviços. Que tal solicitar o primeiro?</p><div class="row"><a class="btn primary sm" href="novo-chamado.html?tipo=manutencao">+ Solicitar manutenção</a><a class="btn sm" href="novo-chamado.html?tipo=site">+ Solicitar site</a></div>'}</div>
        <div class="box"><div class="row" style="justify-content:space-between;margin-bottom:12px"><div><h3 style="margin:0">Últimos avisos</h3><span class="sub" style="margin:0">Fique por dentro das atualizações importantes.</span></div><a class="btn sm" href="#/tickets">Ver todos ›</a></div>
          ${(hs || []).length ? hs.map(h => `<a class="aviso" href="chamado.html?id=${h.chamado_id}"><span class="kic g"><svg viewBox="0 0 24 24"><path d="M4 10v4h3l6 4V6L7 10zM17 9a4 4 0 0 1 0 6"/></svg></span><span><b>${num(mapa[h.chamado_id]?.numero)} · ${esc(h.status_novo)}</b><small>${esc(mapa[h.chamado_id]?.titulo)}</small></span><small>${new Date(h.criado_em).toLocaleDateString("pt-BR")}</small></a>`).join("") : '<p class="empty">Nenhum aviso por enquanto.</p>'}</div>
      </div>
      <aside class="chat-card"><div class="chat-head"><span class="kic g"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></span><div><h3 style="margin:0">Chat com o administrador</h3><small>Tire suas dúvidas, envie mensagens e acompanhe seu atendimento.</small></div></div>
        ${conv.length ? `<select id="chat-sel" class="mini" style="width:100%;margin-bottom:10px" aria-label="Escolher chamado">${conv.map(x => `<option value="${x.id}">${nl[x.id] ? "💬 " + nl[x.id] + " · " : ""}${num(x.numero)} · ${esc(x.titulo)}</option>`).join("")}</select><div id="chat-home"></div>` : '<p class="empty">Abra um chamado para conversar com a equipe da TechEmpire.</p><a class="btn primary sm" href="novo-chamado.html?tipo=manutencao">+ Solicitar manutenção</a>'}</aside></div>`;
      if (conv.length) { iniciarChat($("#chat-home"), conv[0].id, false); $("#chat-sel").onchange = e => iniciarChat($("#chat-home"), e.target.value, false); }
    },
    async servicos(param) {
      const { chs, nl } = await dados(), q0 = new URLSearchParams(param || "").get("q") || "";
      app.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:14px"><h2 style="margin:0">Meus serviços</h2><div class="row"><a class="btn primary sm" href="novo-chamado.html?tipo=manutencao">+ Solicitar manutenção</a><a class="btn sm" href="novo-chamado.html?tipo=site">+ Solicitar site</a></div></div>
        <div class="bar"><input id="bq" placeholder="Buscar por título ou nº" value="${esc(q0)}"><select id="bs"><option value="">Todos os status</option>${opts(STATUS)}</select></div><div id="tb"></div>`;
      const d = () => { const q = $("#bq").value.trim().toLowerCase(), st = $("#bs").value; const l = chs.filter(c => (!st || c.status === st) && (!q || `${c.titulo} ${num(c.numero)}`.toLowerCase().includes(q)));
        $("#tb").innerHTML = l.length ? l.map(svc).join("") : '<p class="empty">Nenhum serviço encontrado.</p>'; }; $("#bq").oninput = d; $("#bs").oninput = d; d();
    },
    async tickets() {
      const { chs, nl } = await dados(), ids = chs.map(c => c.id); const mapa = Object.fromEntries(chs.map(c => [c.id, c]));
      const { data: ms } = ids.length ? await sb.from("mensagens").select("chamado_id,conteudo,criado_em,remetente_id").in("chamado_id", ids).eq("interna", false).order("criado_em", { ascending: false }).limit(300) : { data: [] };
      const ult = {}; (ms || []).forEach(m => { if (!ult[m.chamado_id]) ult[m.chamado_id] = m; });
      const l = Object.keys(ult).sort((a, b) => (nl[b] || 0) - (nl[a] || 0) || new Date(ult[b].criado_em) - new Date(ult[a].criado_em));
      app.innerHTML = `<h2>Meus tickets</h2><p class="sub">Suas conversas com a equipe. As com mensagens novas aparecem primeiro.</p>` + (l.length ? l.map(id => `<a class="rowlink" href="chamado.html?id=${id}"><span><b>${num(mapa[id].numero)}</b> · ${esc(mapa[id].titulo)}<small>${fmtData(ult[id].criado_em)} · ${ult[id].remetente_id === me ? "Você: " : ""}${esc(String(ult[id].conteudo).slice(0, 110))}</small></span>${badge2(nl[id])}</a>`).join("") : '<p class="empty">Nenhuma conversa ainda. Abra um chamado para falar com a equipe.</p>');
    },
    async faturas() {
      const { chs, pgs } = await dados(), mapa = Object.fromEntries(chs.map(c => [c.id, c])), soma = f => pgs.filter(f).reduce((t, p) => t + Number(p.valor || 0), 0);
      app.innerHTML = `<h2>Faturas</h2><p class="sub">Orçamentos e pagamentos dos seus serviços.</p><div class="kpis"><div class="k"><b>${brl(soma(p => ["Pendente", "Aguardando pagamento"].includes(p.status)))}</b><span>Pendente</span></div><div class="k"><b>${brl(soma(p => p.status === "Pago"))}</b><span>Pago</span></div></div>
        ${tabela(["Chamado", "Valor", "Forma", "Status", "Data"], pgs.map(p => `<tr><td><a href="chamado.html?id=${p.chamado_id}">${mapa[p.chamado_id] ? num(mapa[p.chamado_id].numero) : "—"}</a></td><td>${brl(p.valor)}</td><td>${esc(p.forma)}</td><td>${pill(p.status)}</td><td>${fmtData(p.pago_em || p.criado_em)}</td></tr>`))}`;
    },
    async contato() {
      app.innerHTML = `<h2>Contato</h2><p class="sub">Atendimento de Segunda a Sábado, das 8h às 19h.</p><div class="cards"><div class="card"><h3>Conversar com a equipe</h3><p>Use o chat da página inicial: ele fica ligado ao seu chamado.</p><p style="margin-top:14px"><a class="btn primary sm" href="painel.html">Abrir o chat</a></p></div>
        <div class="card"><h3>Novo chamado de manutenção</h3><p>Descreva o problema e envie fotos do equipamento.</p><p style="margin-top:14px"><a class="btn sm" href="novo-chamado.html?tipo=manutencao">Solicitar manutenção</a></p></div>
        <div class="card"><h3>Criação de site</h3><p>Conte sua ideia e receba um orçamento.</p><p style="margin-top:14px"><a class="btn sm" href="novo-chamado.html?tipo=site">Solicitar site</a></p></div></div>`;
    }
  };
  async function rota() { if (iniciarChat.parar) iniciarChat.parar(); marcarMenu(); const [r, param] = (location.hash.replace("#/", "") || "inicio").split("?"); try { await (R[r] || R.inicio)(param); } catch (e) { console.error(e); app.innerHTML = '<p class="empty">Não foi possível carregar. Tente novamente.</p>'; } }
  window.addEventListener("hashchange", rota); await rota();
  sb.channel("cli-live").on("postgres_changes", { event: "UPDATE", schema: "public", table: "chamados" }, () => { toast("Seu chamado foi atualizado"); rota(); }).subscribe();
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
    if (error) { ocupado(f, false); return msg(idMsg, "Não foi possível registrar o chamado: " + error.message); }
    const e2 = (await sb.from(tabela).insert({ chamado_id: ch.id, ...detalhe })).error;
    const falhas = await enviarArquivos(ch.id, [...(f.querySelector("input[type=file]")?.files || [])]);
    ocupado(f, false);
    location.href = `chamado.html?id=${ch.id}&novo=1${e2 ? "&det=0" : ""}${falhas ? "&anexos=" + falhas : ""}`;
  }
  $("#f-manutencao").addEventListener("submit", e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (!d.tipo_dispositivo || !d.titulo.trim() || !d.descricao.trim()) return msg("m-manutencao", "Preencha tipo de dispositivo, título e descrição.");
    const desc = `${d.descricao.trim()}\n\nSintomas/informações extras: ${d.extras.trim() || "—"}\nTipo de atendimento: ${d.atendimento}\nPagamento desejado: ${d.pagamento}`;
    criar(e.target, "manutencao", d.titulo.trim(), desc, "detalhes_manutencao", { tipo_dispositivo: d.tipo_dispositivo, marca: d.marca.trim() || null, modelo: d.modelo.trim() || null, problema_inicio: d.descricao.trim() }, "m-manutencao"); });
  $("#f-site").addEventListener("submit", e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (!d.nome_projeto.trim() || !d.tipo_site || !d.descricao.trim() || !d.objetivo.trim()) return msg("m-site", "Preencha nome do projeto, tipo, descrição e objetivo.");
    const desc = `${d.descricao.trim()}\n\nEmpresa/marca: ${d.empresa.trim() || "—"}\nReferências: ${d.referencias.trim() || "—"}\nPagamento desejado: ${d.pagamento}`;
    criar(e.target, "site", "Site: " + d.nome_projeto.trim(), desc, "detalhes_projetos", { nome_projeto: d.nome_projeto.trim(), tipo_site: d.tipo_site, objetivo: d.objetivo.trim(), funcionalidades: d.funcionalidades.trim() || null, estilo_visual: d.estilo_visual.trim() || null, cores_referencias: d.cores.trim() || null, prazo_desejado: d.prazo.trim() || null, orcamento_estimado: d.orcamento ? +d.orcamento : null }, "m-site"); });
};

Pages.chamado = async () => {
  const id = qs("id"); const { data: c } = await sb.from("chamados").select("*").eq("id", id).maybeSingle();
  if (!c) { $("#conteudo").innerHTML = '<p class="empty">Chamado não encontrado.</p>'; return; }
  if (qs("novo")) msg("m-topo", `Chamado ${num(c.numero)} registrado com sucesso! Você acompanha tudo por aqui.` + (qs("det") === "0" ? " (Alguns detalhes técnicos não foram salvos; informe-os por mensagem.)" : "") + (qs("anexos") ? ` ${qs("anexos")} arquivo(s) não puderam ser enviados (limite de 50 MB; imagens, vídeos e PDF).` : ""), !qs("anexos"));
  const m = c.categoria !== "site"; const dt = (await sb.from(m ? "detalhes_manutencao" : "detalhes_projetos").select("*").eq("chamado_id", id).maybeSingle()).data || {};
  $("#conteudo").innerHTML = `<p><a href="painel.html">← Meus chamados</a></p><h2>${num(c.numero)} · ${esc(c.titulo)}</h2><p>${pill(c.status)} <span class="sub">Aberto em ${fmtData(c.criado_em)}</span></p>
  <div class="box"><h3>Sua solicitação</h3><p style="white-space:pre-wrap">${esc(c.descricao)}</p>${m ? `<p>${esc(dt.tipo_dispositivo)} ${esc(dt.marca)} ${esc(dt.modelo)}</p>` : `<p>Tipo: ${esc(dt.tipo_site)} · Prazo desejado: ${esc(dt.prazo_desejado) || "—"}</p>`}</div>
  ${m && dt.solucao && c.status === "Concluída" ? `<div class="box"><h3>Solução aplicada</h3><p style="white-space:pre-wrap">${esc(dt.solucao)}</p><p class="sub">Concluído em ${fmtData(c.concluido_em)}</p></div>` : ""}
  ${!m && dt.proposta ? `<div class="box"><h3>Atualizações do projeto</h3><p style="white-space:pre-wrap">${esc(dt.proposta)}</p>${dt.prazo_estimado ? `<p>Prazo estimado: ${esc(dt.prazo_estimado)}</p>` : ""}</div>` : ""}
  <div class="box"><h3>Orçamento e pagamento</h3><div id="pg"></div></div>
  <div class="box"><h3>Andamento</h3><div id="hist"></div></div>
  <div class="box"><h3>Arquivos e vídeos</h3><div id="arq"></div></div>
  <div class="box"><h3>💬 Conversa com a TechEmpire</h3><div id="chat"></div></div>`;
  const atualizar = () => Promise.all([desenharPagamentos($("#pg"), id), desenharHistorico($("#hist"), id), desenharArquivos($("#arq"), id)]);
  await atualizar(); document.addEventListener("chat-arquivos", atualizar); iniciarChat($("#chat"), id, false);
};

Pages.perfil = () => {
  const p = App.perfil || {}, en = p.endereco || {};
  const campos = { nome: p.nome, telefone: p.telefone, rua: en.rua, numero: en.numero, bairro: en.bairro, cidade: en.cidade, estado: en.estado };
  const f = $("#f-perfil"); Object.entries(campos).forEach(([k, v]) => { if (f[k]) f[k].value = v || ""; }); f.email.value = p.email || App.session.user.email; f.cpf.value = p.cpf || "";
  f.addEventListener("submit", async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (!d.nome.trim()) return msg("m-perfil", "Informe seu nome."); ocupado(f, true);
    const { error } = await sb.from("usuarios").update({ nome: d.nome.trim(), telefone: digitos(d.telefone), endereco: { rua: d.rua.trim(), numero: d.numero.trim(), bairro: d.bairro.trim(), cidade: d.cidade.trim(), estado: d.estado.trim().toUpperCase() } }).eq("id", App.session.user.id);
    ocupado(f, false); msg("m-perfil", error ? "Não foi possível salvar." : "Dados atualizados.", !error); });
  $("#f-senha").addEventListener("submit", async e => { e.preventDefault(); const f2 = e.target, d = Object.fromEntries(new FormData(f2));
    if (d.senha.length < 8) return msg("m-senha", "A senha precisa ter pelo menos 8 caracteres."); if (d.senha !== d.senha2) return msg("m-senha", "As senhas não coincidem.");
    ocupado(f2, true); const { error } = await sb.auth.updateUser({ password: d.senha }); ocupado(f2, false); msg("m-senha", error ? "Não foi possível alterar: " + error.message : "Senha alterada.", !error); if (!error) f2.reset(); });
};

/* ---------- ADMIN: painel (início, chamados, clientes, leads, usuários) ---------- */
Pages.admin = async () => {
  const badge = n => n ? `<span class="pill" title="Mensagens não lidas">💬 ${n}</span>` : "";
  async function carregarChamados(cli) { let q = sb.from("chamados").select("id,numero,cliente_id,categoria,titulo,status,prioridade,criado_em").order("criado_em", { ascending: false }).limit(500); if (cli) q = q.eq("cliente_id", cli); const { data, error } = await q; if (error) throw error; return comClientes(data || []); }
  async function mapaNaoLidas() { const { data } = await sb.from("mensagens").select("chamado_id").eq("lida", false).eq("interna", false).neq("remetente_id", App.session.user.id); const m = {}; (data || []).forEach(x => m[x.chamado_id] = (m[x.chamado_id] || 0) + 1); return m; }
  async function mapaPagamentos() { const { data } = await sb.from("pagamentos").select("chamado_id,status,valor,criado_em").order("criado_em"); const m = {}; (data || []).forEach(p => m[p.chamado_id] = p); return m; }
  async function mudarStatus(id, de, para) { const { error } = await sb.from("chamados").update({ status: para, atualizado_em: new Date().toISOString() }).eq("id", id); if (!error) await sb.from("historico_status").insert({ chamado_id: id, status_anterior: de, status_novo: para, responsavel_id: App.session.user.id }); return !error; }
  Chg.rapido = async (d, el) => { const ok = await mudarStatus(d.id, d.de, el.value); toast(ok ? "Status atualizado" : "Erro ao mudar o status"); rota(); };
  const Rotas = {
    async inicio() {
      const c = async (t, fn) => { let q = sb.from(t).select("*", { count: "exact", head: true }); if (fn) q = fn(q); return (await q).count ?? 0; };
      const [nCli, nSite, nLead, nPP, nPG] = await Promise.all([c("usuarios", q => q.eq("is_admin", false)), c("chamados", q => q.eq("categoria", "site")), c("forleads"), c("pagamentos", q => q.in("status", ["Pendente", "Aguardando pagamento"])), c("pagamentos", q => q.eq("status", "Pago"))]);
      const [lista, nl] = await Promise.all([carregarChamados(), mapaNaoLidas()]);
      const ESPERA = ["Nova chamada", "Aguardando análise", "Aprovada"], espera = lista.filter(x => ESPERA.includes(x.status)), andando = lista.filter(x => x.status === "Em andamento").length, feitos = lista.filter(x => x.status === "Concluída").length, nMsg = Object.values(nl).reduce((t, n) => t + n, 0);
      const fila = espera.slice().sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em)).slice(0, 5), ultimos = lista.slice(0, 7);
      const kp = (href, cls, svg, n, l, sub) => `<a class="kpc" href="${href}"><span class="kic ${cls}"><svg viewBox="0 0 24 24">${svg}</svg></span><span class="arr">›</span><b>${n}</b><span class="kl">${l}</span><small>${sub}</small></a>`;
      const filaItem = c => `<div class="rowlink"><a href="admin-chamado.html?id=${c.id}" style="text-decoration:none;flex:1"><b>${num(c.numero)}</b> · ${esc(c.titulo)}<small>${esc(c.cliente?.nome)} · ${c.categoria === "site" ? "Site" : "Manutenção"} · ${fmtData(c.criado_em)}</small></a>${badge(nl[c.id])}<button class="btn primary sm" data-act="atender" data-id="${c.id}" data-de="${esc(c.status)}">Atender</button></div>`;
      const conv = lista.slice().sort((a, b) => (nl[b.id] || 0) - (nl[a.id] || 0)).slice(0, 30), pad = conv[0];
      const nome = (App.perfil?.nome || "").split(" ")[0] || "admin";
      $("#conteudo-admin").innerHTML = `<div class="home-grid"><div class="home-main">
        <p class="hello">Bem-vindo, ${esc(nome)}!</p><h2 class="big">Painel de atendimento</h2><p class="sub">Aqui você atende os chamados, acompanha os serviços e conversa com os clientes.</p>
        <div class="kp">${kp("#/chamados", "g", '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', lista.length, "Chamados", espera.length ? espera.length + " aguardando atendimento" : "Nenhum chamado pendente")}
          ${kp("#/chamados", "b", '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.6-.6-2.2z"/>', andando, "Em andamento", andando ? "Serviços sendo executados" : "Nenhum serviço em andamento")}
          ${kp("#/chamados", "p", '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>', feitos, "Finalizados", feitos ? "Serviços concluídos" : "Nenhum serviço finalizado")}
          ${kp("#/mensagens", "m", '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>', nMsg, "Mensagens novas", nMsg ? "Clientes aguardando resposta" : "Nenhuma mensagem nova")}</div>
        <div class="box"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h3 style="margin:0">⚡ Fila de atendimento</h3><span class="sub" style="margin:0">Do mais antigo para o mais novo</span></div>${fila.length ? fila.map(filaItem).join("") : '<p class="empty">Nenhum chamado esperando. Tudo em dia!</p>'}</div>
        <div class="box"><div class="row" style="justify-content:space-between;margin-bottom:10px"><div><h3 style="margin:0">🕒 Últimos chamados</h3><span class="sub" style="margin:0">Acompanhe os atendimentos mais recentes.</span></div><a class="btn sm" href="#/chamados">Ver todos ›</a></div>
          ${tabela(["Data", "Cliente", "Chamado", "Status", ""], ultimos.map(x => `<tr><td>${new Date(x.criado_em).toLocaleDateString("pt-BR")}</td><td>${esc(x.cliente?.nome)}</td><td>${esc(x.titulo)}<br><small style="color:var(--muted)">${num(x.numero)} · ${x.categoria === "site" ? "Site" : "Manutenção"}</small></td><td>${stPill(x.status)}</td><td><a class="btn sm" href="admin-chamado.html?id=${x.id}">Abrir</a></td></tr>`))}</div>
        <div class="mini-stats"><div><b>${nCli}</b><span>Clientes</span></div><div><b>${nSite}</b><span>Projetos de site</span></div><div><b>${nLead}</b><span>Leads</span></div><div><b>${nPP}</b><span>Pgtos pendentes</span></div><div><b>${nPG}</b><span>Pgtos confirmados</span></div></div>
      </div>
      <aside class="chat-card"><div class="chat-head"><span class="kic g"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></span><div><h3 style="margin:0">Chat do Cliente</h3><small id="chat-sub">Fale com o cliente</small></div><span class="online">Online</span></div>
        ${pad ? `<select id="chat-sel" class="mini" style="width:100%;margin-bottom:10px" aria-label="Escolher conversa">${conv.map(x => `<option value="${x.id}">${nl[x.id] ? "💬 " + nl[x.id] + " · " : ""}${num(x.numero)} · ${esc(x.cliente?.nome || "")} · ${esc(x.titulo)}</option>`).join("")}</select><div id="chat-home"></div><a class="btn sm" id="chat-abrir" style="margin-top:10px" href="admin-chamado.html?id=${pad.id}">Abrir chamado</a>` : '<p class="empty">Quando um cliente abrir um chamado, a conversa aparece aqui.</p>'}</aside></div>`;
      if (pad) { const abrirChat = id => { const x = lista.find(y => y.id === id); $("#chat-sub").textContent = (x?.cliente?.nome || "Cliente") + " · " + num(x?.numero); $("#chat-abrir").href = "admin-chamado.html?id=" + id; iniciarChat($("#chat-home"), id, true); };
        $("#chat-sel").onchange = e => abrirChat(e.target.value); abrirChat(pad.id); }
    },
    async chamados(param) {
      const pr0 = new URLSearchParams(param || ""), cli = pr0.get("c"); let modo = Rotas._modo || "lista", chip = "";
      const [todos, nl, pg] = await Promise.all([carregarChamados(cli), mapaNaoLidas(), mapaPagamentos()]);
      $("#conteudo-admin").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">Chamados${cli ? " do cliente" : ""}</h2><div class="row"><button class="btn sm" data-act="modo" data-m="lista">☰ Lista</button><button class="btn sm" data-act="modo" data-m="quadro">▦ Quadro</button></div></div>
        <div class="chips" id="chips"></div>
        <div class="bar"><input id="bq" placeholder="Buscar por título, nº ou cliente"><select id="bc"><option value="">Todas as categorias</option><option value="manutencao">Manutenção</option><option value="site">Site</option></select><select id="bp"><option value="">Qualquer prioridade</option>${opts(PRIORIDADES)}</select><select id="bo"><option value="desc">Mais recentes</option><option value="asc">Mais antigos</option></select></div><div id="tb"></div>`;
      const desenhar = () => {
        const q = $("#bq").value.trim().toLowerCase(), cat = $("#bc").value, pr = $("#bp").value, asc = $("#bo").value === "asc";
        let l = todos.filter(c => (!cat || c.categoria === cat) && (!pr || c.prioridade === pr) && (!q || `${c.titulo} ${num(c.numero)} ${c.numero} ${c.cliente?.nome || ""}`.toLowerCase().includes(q)));
        const cont = {}; l.forEach(c => cont[c.status] = (cont[c.status] || 0) + 1);
        $("#chips").innerHTML = `<button class="chip ${!chip ? "on" : ""}" data-act="chip" data-s="">Todos <b>${l.length}</b></button>` + STATUS.map(s => `<button class="chip ${chip === s ? "on" : ""}" data-act="chip" data-s="${esc(s)}">${esc(s)} <b>${cont[s] || 0}</b></button>`).join("");
        $$("[data-act=modo]").forEach(b => b.classList.toggle("primary", b.dataset.m === modo));
        if (modo === "lista") {
          if (chip) l = l.filter(c => c.status === chip); l.sort((a, b) => asc ? new Date(a.criado_em) - new Date(b.criado_em) : new Date(b.criado_em) - new Date(a.criado_em));
          $("#tb").innerHTML = tabela(["Nº", "Cliente", "Serviço", "Título", "Prioridade", "Status", "Pagamento", "", "Data", ""], l.map(c => `<tr><td><a href="admin-chamado.html?id=${c.id}">${num(c.numero)}</a></td><td>${esc(c.cliente?.nome)}</td><td>${c.categoria === "site" ? "Site" : "Manutenção"}</td><td><a href="admin-chamado.html?id=${c.id}">${esc(c.titulo)}</a></td><td>${c.prioridade ? pill(c.prioridade, true) : "—"}</td><td><select class="mini" data-chg="rapido" data-id="${c.id}" data-de="${esc(c.status)}" aria-label="Alterar status">${opts(STATUS, c.status)}</select></td><td>${pg[c.id] ? pill(pg[c.id].status, true) : "—"}</td><td>${badge(nl[c.id])}</td><td>${fmtData(c.criado_em)}</td><td>${["Nova chamada", "Aguardando análise", "Aprovada"].includes(c.status) ? `<button class="btn primary sm" data-act="atender" data-id="${c.id}" data-de="${esc(c.status)}">Atender</button>` : ""}</td></tr>`));
        } else {
          l.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
          $("#tb").innerHTML = `<p class="sub">Arraste os cartões entre as colunas para mudar o status (no celular, use a Lista).</p><div class="kanban">${STATUS.map(s => { const col = l.filter(c => c.status === s);
            return `<div class="col" data-s="${esc(s)}"><h4>${esc(s)} <span class="pill gray">${col.length}</span></h4>${col.map(c => `<div class="kc" draggable="true" data-id="${c.id}" data-de="${esc(s)}"><a href="admin-chamado.html?id=${c.id}"><b>${num(c.numero)}</b></a> ${badge(nl[c.id])}${c.prioridade ? " " + pill(c.prioridade, true) : ""}<div>${esc(c.titulo)}</div><small>${esc(c.cliente?.nome)} · ${c.categoria === "site" ? "Site" : "Manutenção"} · ${new Date(c.criado_em).toLocaleDateString("pt-BR")}</small></div>`).join("") || '<p class="empty" style="padding:6px">Vazio</p>'}</div>`; }).join("")}</div>`;
          $$(".kc").forEach(k => k.addEventListener("dragstart", e => e.dataTransfer.setData("text/plain", JSON.stringify({ id: k.dataset.id, de: k.dataset.de }))));
          $$(".col").forEach(col => { col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("over"); }); col.addEventListener("dragleave", () => col.classList.remove("over"));
            col.addEventListener("drop", async e => { e.preventDefault(); col.classList.remove("over"); let d; try { d = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
              if (d.de === col.dataset.s) return; const ok = await mudarStatus(d.id, d.de, col.dataset.s); toast(ok ? "Status atualizado" : "Erro ao mudar o status"); Rotas.chamados(param); }); });
        }
      };
      Act.modo = d => { modo = d.m; Rotas._modo = modo; desenhar(); }; Act.chip = d => { chip = d.s; desenhar(); };
      ["bq", "bc", "bp", "bo"].forEach(i => $("#" + i).oninput = desenhar); if (pr0.get("q")) $("#bq").value = pr0.get("q"); desenhar();
    },
    async mensagens() {
      const me = App.session.user.id; const { data: ms } = await sb.from("mensagens").select("chamado_id,remetente_id,conteudo,lida,interna,criado_em").order("criado_em", { ascending: false }).limit(400);
      const g = {}; (ms || []).forEach(m => { const x = g[m.chamado_id] = g[m.chamado_id] || { ultima: m, nl: 0 }; if (!m.lida && !m.interna && m.remetente_id !== me) x.nl++; });
      const ids = Object.keys(g); const { data: chs } = ids.length ? await sb.from("chamados").select("id,numero,titulo,cliente_id").in("id", ids) : { data: [] };
      const L = (await comClientes(chs || [])).sort((a, b) => (g[b.id].nl - g[a.id].nl) || (new Date(g[b.id].ultima.criado_em) - new Date(g[a.id].ultima.criado_em)));
      $("#conteudo-admin").innerHTML = `<h2>Mensagens</h2><p class="sub">Conversas com clientes. As não lidas aparecem primeiro.</p>` + (L.length ? L.map(c => { const x = g[c.id]; return `<a class="rowlink" href="admin-chamado.html?id=${c.id}"><span><b>${num(c.numero)}</b> · ${esc(c.titulo)}<small>${esc(c.cliente?.nome)} · ${fmtData(x.ultima.criado_em)}</small><small>${x.ultima.interna ? "Nota interna: " : ""}${esc(String(x.ultima.conteudo).slice(0, 110))}</small></span>${badge(x.nl)}</a>`; }).join("") : '<p class="empty">Nenhuma conversa ainda.</p>');
    },
    async pagamentos() {
      const { data } = await sb.from("pagamentos").select("*").order("criado_em", { ascending: false }).limit(300);
      const ids = [...new Set((data || []).map(p => p.chamado_id))]; const { data: chs } = ids.length ? await sb.from("chamados").select("id,numero,cliente_id").in("id", ids) : { data: [] };
      const cm = Object.fromEntries((await comClientes(chs || [])).map(c => [c.id, c])); const soma = f => (data || []).filter(f).reduce((t, p) => t + Number(p.valor || 0), 0);
      $("#conteudo-admin").innerHTML = `<h2>Pagamentos</h2><div class="kpis"><div class="k"><b>${brl(soma(p => p.status === "Pago"))}</b><span>Recebido</span></div><div class="k"><b>${brl(soma(p => ["Pendente", "Aguardando pagamento"].includes(p.status)))}</b><span>A receber</span></div><div class="k"><b>${brl(soma(p => p.status === "Parcialmente pago"))}</b><span>Parcialmente pago</span></div></div>
      <div class="bar"><select id="pf"><option value="">Todos os status</option>${opts(PAGAMENTO_STATUS)}</select></div><div id="tb"></div>`;
      const d = () => { const f = $("#pf").value; $("#tb").innerHTML = tabela(["Chamado", "Cliente", "Valor", "Forma", "Status", "Origem", "Data"], (data || []).filter(p => !f || p.status === f).map(p => { const c = cm[p.chamado_id] || {}; return `<tr><td><a href="admin-chamado.html?id=${p.chamado_id}">${c.numero ? num(c.numero) : "—"}</a></td><td>${esc(c.cliente?.nome)}</td><td>${brl(p.valor)}</td><td>${esc(p.forma)}</td><td>${pill(p.status)}</td><td>${p.manual ? "Registro manual" : "Online"}</td><td>${fmtData(p.pago_em || p.criado_em)}</td></tr>`; })); };
      $("#pf").oninput = d; d();
    },
    async clientes() {
      $("#conteudo-admin").innerHTML = `<h2>Clientes</h2><div class="bar"><input id="bq" placeholder="Nome, CPF, telefone ou e-mail"></div><div id="ed"></div><div id="tb"></div>`;
      const carregar = async () => {
        let q = sb.from("usuarios").select("*").eq("is_admin", false).order("criado_em", { ascending: false }); const t = $("#bq").value.trim().replace(/[,()%]/g, " ");
        if (t) q = q.or(`nome.ilike.%${t}%,cpf.ilike.%${digitos(t) || "@@"}%,telefone.ilike.%${t}%,email.ilike.%${t}%`);
        const { data } = await q; Rotas._clientes = data || [];
        $("#tb").innerHTML = tabela(["Nome", "E-mail", "Telefone", "CPF", "Ativo", ""], (data || []).map(u => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(u.telefone)}</td><td>${esc(u.cpf)}</td><td>${u.ativo === false ? "Não" : "Sim"}</td><td><a class="btn sm" href="#/chamados?c=${u.id}">Chamados</a> <button class="btn sm" data-act="editarCli" data-id="${u.id}">Editar</button> <button class="btn sm" data-act="ativarCli" data-id="${u.id}" data-v="${u.ativo === false}">${u.ativo === false ? "Ativar" : "Desativar"}</button></td></tr>`));
      };
      Rotas._recarregar = carregar; $("#bq").oninput = carregar; carregar();
    },
    async leads() {
      const { data, error } = await sb.from("forleads").select("*").order("criado_em", { ascending: false });
      if (error) return $("#conteudo-admin").innerHTML = '<p class="empty">Erro ao carregar leads. Rode o SQL 2-pagamentos-leads.sql.</p>';
      $("#conteudo-admin").innerHTML = `<h2>Leads</h2><div class="box"><h3>Novo lead</h3><form id="f-lead"><div class="two"><label>Nome<input name="nome" required></label><label>Telefone<input name="telefone"></label><label>E-mail<input name="email" type="email"></label><label>Origem<input name="origem" placeholder="Instagram, indicação…"></label></div><label>Serviço de interesse<input name="servico"></label><label>Observações comerciais<textarea name="obs"></textarea></label><button class="btn primary" type="submit">Cadastrar lead</button></form></div>
      ${tabela(["Nome", "Contato", "Origem", "Interesse", "Etapa", ""], data.map(l => `<tr><td>${esc(l.nome)}<br><small>${esc(l.observacoes)}</small></td><td>${esc(l.telefone)}<br>${esc(l.email)}</td><td>${esc(l.origem)}</td><td>${esc(l.servico_interesse)}</td><td><select data-chg="etapa" data-id="${l.id}">${opts(ETAPAS_LEAD, l.etapa)}</select></td><td><button class="btn sm" data-act="converter" data-id="${l.id}" data-email="${esc(l.email)}">Converter</button> <button class="btn sm danger" data-act="delLead" data-id="${l.id}">Excluir</button></td></tr>`))}`;
      $("#f-lead").addEventListener("submit", async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const n = v => v.trim() || null;
        const { error } = await sb.from("forleads").insert({ nome: d.nome.trim(), telefone: n(d.telefone), email: n(d.email), origem: n(d.origem), servico_interesse: n(d.servico), observacoes: n(d.obs) }); toast(error ? "Erro ao cadastrar" : "Lead cadastrado"); if (!error) Rotas.leads(); });
    },
    async usuarios() {
      const { data } = await sb.from("usuarios").select("*").eq("is_admin", true);
      $("#conteudo-admin").innerHTML = `<h2>Administradores</h2>${tabela(["Nome", "E-mail", "Ativo", ""], (data || []).map(u => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${u.ativo === false ? "Não" : "Sim"}</td><td>${u.id === App.session.user.id ? "" : `<button class="btn sm" data-act="admin" data-id="${u.id}" data-v="false">Remover admin</button> <button class="btn sm" data-act="ativarCli" data-id="${u.id}" data-v="${u.ativo === false}">${u.ativo === false ? "Ativar" : "Desativar"}</button>`}</td></tr>`))}
      <div class="box" style="margin-top:16px"><h3>Promover cliente a administrador</h3><div class="bar"><input id="ae" type="email" placeholder="E-mail de um cliente já cadastrado"><button class="btn primary" data-act="promover">Promover</button></div></div>`;
    }
  };
  Act.atender = async d => { const t = new Date().toISOString(); const { error } = await sb.from("chamados").update({ status: "Em andamento", assumido_em: t, admin_id: App.session.user.id, atualizado_em: t }).eq("id", d.id);
    if (error) return toast("Não foi possível iniciar o atendimento.");
    await sb.from("historico_status").insert({ chamado_id: d.id, status_anterior: d.de, status_novo: "Em andamento", responsavel_id: App.session.user.id }); location.href = "admin-chamado.html?id=" + d.id; };
  Act.abrirAdm = d => location.href = "admin-chamado.html?id=" + d.id;
  Act.editarCli = d => { const u = Rotas._clientes.find(x => x.id === d.id); $("#ed").innerHTML = `<form class="box" id="f-ed"><h3>Editar cliente</h3><div class="two"><label>Nome<input name="nome" value="${esc(u.nome)}" required></label><label>Telefone<input name="telefone" value="${esc(u.telefone)}"></label></div><div class="row"><button class="btn primary" type="submit">Salvar</button><button class="btn" type="button" data-act="cancelarEd">Cancelar</button></div></form>`;
    $("#f-ed").addEventListener("submit", async e => { e.preventDefault(); const f = e.target; const { error } = await sb.from("usuarios").update({ nome: f.nome.value.trim(), telefone: digitos(f.telefone.value) }).eq("id", d.id); toast(error ? "Erro ao salvar" : "Cliente atualizado"); $("#ed").innerHTML = ""; Rotas._recarregar(); }); };
  Act.cancelarEd = () => $("#ed").innerHTML = "";
  Act.ativarCli = async d => { const a = d.v === "true"; if (!confirm(a ? "Ativar este cadastro?" : "Desativar este cadastro? O usuário não conseguirá mais entrar.")) return; await sb.from("usuarios").update({ ativo: a }).eq("id", d.id); rota(); };
  Act.admin = async d => { if (!confirm("Remover a permissão de administrador?")) return; await sb.from("usuarios").update({ is_admin: false }).eq("id", d.id); rota(); };
  Act.promover = async () => { const e = $("#ae").value.trim().toLowerCase(); if (!e || !confirm("Dar acesso administrativo a " + e + "?")) return; const { data, error } = await sb.from("usuarios").update({ is_admin: true }).eq("email", e).select(); toast(error || !data?.length ? "Usuário não encontrado" : "Promovido a administrador"); rota(); };
  Chg.etapa = async d => { const el = $(`[data-chg=etapa][data-id="${d.id}"]`); const { error } = await sb.from("forleads").update({ etapa: el.value }).eq("id", d.id); toast(error ? "Erro" : "Etapa atualizada"); };
  Act.delLead = async d => { if (!confirm("Excluir este lead?")) return; await sb.from("forleads").delete().eq("id", d.id); Rotas.leads(); };
  Act.converter = async d => { if (!d.email) return toast("O lead precisa ter e-mail para converter."); const { data: u } = await sb.from("usuarios").select("id").eq("email", d.email.toLowerCase()).maybeSingle();
    if (!u) return toast("Este contato ainda não criou conta. Peça que se cadastre com este e-mail e converta depois.");
    const { error } = await sb.from("forleads").update({ cliente_id: u.id, etapa: "Convertido em cliente" }).eq("id", d.id); toast(error ? "Erro" : "Lead vinculado ao cliente existente"); Rotas.leads(); };
  async function rota() { if (iniciarChat.parar) iniciarChat.parar(); const [p, param] = (location.hash.replace("#/", "") || "inicio").split("?"); const nome = Rotas[p] && !p.startsWith("_") ? p : "inicio";
    $$(".side a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#/" + (nome === "inicio" ? "" : nome) || (nome === "inicio" && a.getAttribute("href") === "#/")));
    try { await Rotas[nome](param); } catch (e) { $("#conteudo-admin").innerHTML = '<p class="empty">Erro ao carregar.</p>'; } }
  window.addEventListener("hashchange", rota); rota();
  sb.channel("chamados-live").on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, () => { toast("Chamados atualizados"); const p = location.hash.replace("#/", ""); if (!p || p.startsWith("chamados")) rota(); }).subscribe();
  sb.channel("msgs-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, p => { if (p.new.remetente_id !== App.session.user.id && !p.new.interna) { toast("💬 Nova mensagem de cliente"); if (!location.hash.replace("#/", "")) rota(); } }).subscribe();
  setInterval(() => { if (!location.hash.replace("#/", "")) rota(); }, 60000);
};

/* ---------- ADMIN: detalhe e execução do chamado ---------- */
Pages.adminChamado = async () => {
  const id = qs("id"); const { data: c } = await sb.from("chamados").select("*").eq("id", id).maybeSingle();
  if (!c) { $("#conteudo").innerHTML = '<p class="empty">Chamado não encontrado.</p>'; return; }
  const m = c.categoria !== "site"; const dt = (await sb.from(m ? "detalhes_manutencao" : "detalhes_projetos").select("*").eq("chamado_id", id).maybeSingle()).data || {};
  const u = (await sb.from("usuarios").select("nome,email,telefone,cpf,endereco").eq("id", c.cliente_id).maybeSingle()).data || {};
  const fim = c.status === "Concluída";
  $("#conteudo").innerHTML = `<p><a href="admin.html#/chamados">← Chamados</a></p><h2>${num(c.numero)} · ${esc(c.titulo)}</h2>
  <div class="box"><h3>Cliente</h3>${esc(u.nome)} · ${esc(u.email)} · ${esc(u.telefone)}<br>CPF ${esc(u.cpf)}<br>${u.endereco ? esc(Object.values(u.endereco).join(", ")) : ""}<p class="row" style="margin-top:10px"><a class="btn sm" href="admin.html#/chamados?c=${c.cliente_id}">Todos os chamados deste cliente</a>${digitos(u.telefone).length >= 10 ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${digitos(u.telefone).length <= 11 ? "55" : ""}${digitos(u.telefone)}">WhatsApp</a>` : ""}</p></div>
  <div class="box"><h3>Solicitação</h3><p style="white-space:pre-wrap">${esc(c.descricao)}</p><p>Criado: ${fmtData(c.criado_em)} · Início: ${fmtData(c.assumido_em)} · Conclusão: ${fmtData(c.concluido_em)}</p>
  <div class="two" style="max-width:560px"><label>Status<select id="st">${opts(STATUS, c.status)}</select></label><label>Prioridade<select id="pri"><option value="">—</option>${opts(PRIORIDADES, c.prioridade)}</select></label></div>
  <div class="row" style="margin-top:12px">${!c.assumido_em && !fim ? '<button class="btn primary" data-act="iniciar">Iniciar atendimento</button>' : ""}<button class="btn" data-act="salvar">Salvar</button>${fim ? "" : '<button class="btn primary" data-act="concluir">Concluir chamada</button>'}<button class="btn danger" data-act="excluir">Excluir</button></div><div class="msg" id="m-top"></div></div>
  <div class="box"><h3>${m ? "Execução técnica" : "Projeto do site"}</h3>
  ${m ? `<p>${esc(dt.tipo_dispositivo)} ${esc(dt.marca)} ${esc(dt.modelo)}</p><label>Diagnóstico técnico<textarea id="dg">${esc(dt.diagnostico)}</textarea></label><label>Solução aplicada / resumo do serviço (visível ao cliente ao concluir)<textarea id="sl">${esc(dt.solucao)}</textarea></label>`
  : `<p>Tipo: ${esc(dt.tipo_site)} · Objetivo: ${esc(dt.objetivo)}<br>Funcionalidades: ${esc(dt.funcionalidades)}<br>Estilo/cores: ${esc(dt.estilo_visual)} ${esc(dt.cores_referencias)}<br>Prazo desejado: ${esc(dt.prazo_desejado)} · Orçamento do cliente: ${dt.orcamento_estimado != null ? brl(dt.orcamento_estimado) : "—"}</p><label>Atualizações, links de demonstração e endereço final (visível ao cliente)<textarea id="sl">${esc(dt.proposta)}</textarea></label><label>Prazo estimado<input id="pe" value="${esc(dt.prazo_estimado)}"></label>`}</div>
  <div class="box"><h3>Pagamentos</h3><div id="pg"></div><form id="f-pg" style="margin-top:12px"><div class="two"><label>Valor (R$)<input name="valor" type="number" step="0.01" min="0" required></label><label>Forma<select name="forma">${opts(FORMAS)}</select></label></div><label style="max-width:300px">Status<select name="status">${opts(PAGAMENTO_STATUS)}</select></label><button class="btn" type="submit">Registrar pagamento (manual)</button></form></div>
  <div class="box"><h3>Arquivos e vídeos</h3><div id="arq"></div><form id="f-arq" style="margin-top:12px"><label>Anexar fotos/vídeos da execução (visíveis ao cliente)<input type="file" name="f" multiple accept="image/*,video/*,.pdf,.txt" required></label><button class="btn" type="submit">Enviar</button></form></div>
  <div class="box"><h3>💬 Conversa com o cliente</h3><div id="chat"></div></div>
  <div class="box"><h3>Histórico de status</h3><div id="hist"></div></div>`;
  const atualizar = () => Promise.all([desenharPagamentos($("#pg"), id), desenharArquivos($("#arq"), id), desenharHistorico($("#hist"), id)]);
  await atualizar(); document.addEventListener("chat-arquivos", atualizar); iniciarChat($("#chat"), id, true);
  async function salvar(extra = {}) {
    const novo = extra.status || $("#st").value; let e = (await sb.from("chamados").update({ status: novo, atualizado_em: new Date().toISOString(), ...extra }).eq("id", id)).error;
    if (!e && novo !== c.status) { await sb.from("historico_status").insert({ chamado_id: id, status_anterior: c.status, status_novo: novo, responsavel_id: App.session.user.id }); c.status = novo; }
    const np = $("#pri").value || null; if (!e && np !== (c.prioridade || null)) { const e3 = (await sb.from("chamados").update({ prioridade: np }).eq("id", id)).error; if (e3) toast("Prioridade não salva (valor não aceito pelo banco)."); else c.prioridade = np; }
    if (!e) e = (await sb.from(m ? "detalhes_manutencao" : "detalhes_projetos").update(m ? { diagnostico: $("#dg").value, solucao: $("#sl").value } : { proposta: $("#sl").value, prazo_estimado: $("#pe").value }).eq("chamado_id", id)).error;
    return e;
  }
  const refaz = () => Pages.adminChamado();
  Act.salvar = async () => { const e = await salvar(); toast(e ? "Erro ao salvar" : "Alterações salvas"); if (!e) refaz(); };
  Act.iniciar = async () => { const e = await salvar({ status: "Em andamento", assumido_em: new Date().toISOString(), admin_id: App.session.user.id }); toast(e ? "Erro" : "Atendimento iniciado"); if (!e) refaz(); };
  Act.concluir = async () => { if (!$("#sl").value.trim()) return msg("m-top", "Registre a solução/resumo do serviço antes de concluir."); const e = await salvar({ status: "Concluída", concluido_em: new Date().toISOString() }); toast(e ? "Erro" : "Chamado concluído"); if (!e) refaz(); };
  Act.excluir = async () => { if (!confirm("Excluir este chamado definitivamente? Isso não pode ser desfeito.")) return; const { error } = await sb.from("chamados").delete().eq("id", id); if (error) return toast("Erro ao excluir"); location.href = "admin.html#/chamados"; };
  $("#f-pg").addEventListener("submit", async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    const { error } = await sb.from("pagamentos").insert({ chamado_id: id, valor: +d.valor, forma: d.forma, status: d.status, manual: true, pago_em: d.status === "Pago" ? new Date().toISOString() : null, registrado_por: App.session.user.id }); toast(error ? "Erro ao registrar" : "Pagamento registrado"); if (!error) { e.target.reset(); atualizar(); } });
  $("#f-arq").addEventListener("submit", async e => { e.preventDefault(); const f = e.target; ocupado(f, true); const falhas = await enviarArquivos(id, [...f.f.files]); ocupado(f, false); toast(falhas ? falhas + " arquivo(s) falharam (máx. 50 MB)" : "Arquivos enviados"); f.reset(); atualizar(); });
};

document.addEventListener("DOMContentLoaded", boot);
// Variável para armazenar o chamado selecionado no chat
let chamadoAtivoId = null;

// Função para carregar os serviços na tabela do Admin
async function carregarServicosAdmin() {
  const { data: chamados, error } = await supabaseClient
    .from('chamados')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar chamados:', error);
    return;
  }

  const tbody = document.getElementById('tbl-servicos');
  if (!tbody) return;

  tbody.innerHTML = chamados.map(item => `
    <tr onclick="selecionarChamadoParaChat('${item.id}')" style="cursor:pointer;">
      <td>${new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
      <td>${esc(item.cliente_nome)} (${esc(item.equipamento)})</td>
      <td>${esc(item.servico)}</td>
      <td><span class="badge ${item.status.toLowerCase().replace(/\s+/g, '-')}">${esc(item.status)}</span></td>
      <td>...</td>
    </tr>
  `).join('');

  // Atualiza os contadores
  if (document.getElementById('cnt-chamados')) {
    document.getElementById('cnt-chamados').innerText = chamados.length;
    document.getElementById('cnt-em-aberto').innerText = chamados.filter(c => c.status === 'Em andamento').length;
    document.getElementById('cnt-finalizados').innerText = chamados.filter(c => c.status === 'Finalizados' || c.status === 'Concluída').length;
  }
}

// Selecionar o chamado e carregar o histórico de mensagens
async function selecionarChamadoParaChat(chamadoId) {
  chamadoAtivoId = chamadoId;
  carregarMensagens(chamadoId);
  inscreverRealtimeMensagens(chamadoId);
}

// Carregar histórico do chat
async function carregarMensagens(chamadoId) {
  const { data: msgs, error } = await supabaseClient
    .from('mensagens')
    .select('*')
    .eq('chamado_id', chamadoId)
    .order('created_at', { ascending: true });

  if (error) return;

  const chatContainer = document.getElementById('chat-messages');
  chatContainer.innerHTML = msgs.map(m => `
    <div class="msg-bubble ${m.sender_role === 'admin' ? 'outgoing' : 'incoming'}">
      <p>${esc(m.conteudo)}</p>
      <span class="time">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    </div>
  `).join('');

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Enviar nova mensagem
const formChat = document.getElementById('form-chat');
if (formChat) {
  formChat.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = formChat.querySelector('input[name="mensagem"]');
    const texto = input.value.trim();

    if (!texto || !chamadoAtivoId) return;

    const { error } = await supabaseClient
      .from('mensagens')
      .insert([
        {
          chamado_id: chamadoAtivoId,
          sender_role: 'admin', // Ou 'client' no painel do cliente
          conteudo: texto
        }
      ]);

    if (!error) {
      input.value = '';
    }
  });
}

// Atualização em Tempo Real (Supabase Realtime)
let canalChat = null;
function inscreverRealtimeMensagens(chamadoId) {
  if (canalChat) supabaseClient.removeChannel(canalChat);

  canalChat = supabaseClient
    .channel('chat-chamado')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `chamado_id=eq.${chamadoId}`
      },
      (payload) => {
        // Quando uma nova mensagem chegar, recarrega o chat
        carregarMensagens(chamadoId);
      }
    )
    .subscribe();
}
// Dentro do script.js, na função que cuida da página admin:
if (document.body.dataset.page === 'admin') {
  const containerAdmin = document.getElementById('conteudo-admin');
  if (containerAdmin) {
    // Aqui você garante que o painel administrativo carrega a tabela e o chat correto
    carregarServicosAdmin();
  }

/* ---------- Painel Administrativo ---------- */
Pages.admin = async () => {
  const container = $("#admin-container");
  const nomeAdmin = App.perfil?.nome || "Administrador";

  // Renderiza a estrutura de 3 colunas (Sidebar, Painel Central e Chat)
  container.innerHTML = `
    <div class="admin-grid-layout" style="display:grid; grid-template-columns: 220px 1fr 340px; gap: 20px; align-items: start;">
      
      <!-- 1. Menu Lateral do Admin -->
      <nav class="side" aria-label="Menu do painel">
        <a href="admin.html" class="on"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>Início</a>
        <a href="#/servicos"><svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.6-.6-2.2z"/></svg>Serviços</a>
        <a href="manutencao.html"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Manutenção</a>
        <a href="sobre.html"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>Sobre</a>
        <a href="contato.html"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Contato</a>
        <div class="side-card" style="margin-top:20px"><b>Seu equipamento em boas mãos!</b><span>Tecnologia que funciona.</span></div>
      </nav>

      <!-- 2. Área Central do Painel -->
      <section class="admin-content">
        <div class="welcome-box" style="margin-bottom:20px">
          <p class="sub" style="margin:0">Bem-vinda, ${esc(nomeAdmin)}!</p>
          <h2 style="font-size:28px;margin:4px 0">Meu painel</h2>
          <p class="sub">Aqui você acompanha o status dos serviços, manutenções e pode falar diretamente com os clientes.</p>
        </div>

        <!-- 4 Cards de Métricas / Indicadores -->
        <div class="kpis" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:24px;" id="admin-stats">
          <div class="k"><b>0</b><span>Chamados</span></div>
          <div class="k"><b>0</b><span>Em aberto</span></div>
          <div class="k"><b>0</b><span>Finalizados</span></div>
          <div class="k"><b>0</b><span>Mensagens novas</span></div>
        </div>

        <!-- Tabela de Últimos Serviços -->
        <div class="box">
          <div class="row" style="justify-content:space-between;margin-bottom:12px">
            <div>
              <h3 style="margin:0">Últimos serviços</h3>
              <span class="sub" style="margin:0">Acompanhe os atendimentos mais recentes.</span>
            </div>
          </div>
          <div id="admin-tabela-servicos"><p class="empty">Carregando serviços…</p></div>
        </div>
      </section>

      <!-- 3. Coluna Direita: Chat do Cliente -->
      <aside class="chat-card" style="background:#0d1117;border:1px solid #1f2937;border-radius:12px;padding:16px;height:calc(100vh - 120px);display:flex;flex-direction:column;">
        <div class="chat-head" style="margin-bottom:12px">
          <h3 style="margin:0;font-size:16px">Chat do Cliente</h3>
          <small style="color:#b4f03c">● Online</small>
        </div>
        <div id="admin-chat-container" style="flex:1;overflow-y:auto;">
          <p class="empty">Selecione um chamado na tabela ao lado para conversar com o cliente.</p>
        </div>
      </aside>

    </div>
  `;

  // Buscar dados reais do Supabase
  const { data: chamados } = await sb.from("chamados").select("*").order("criado_em", { ascending: false });
  const listaChs = chamados || [];

  // Atualizar contadores dos KPIs
  const total = listaChs.length;
  const emAberto = listaChs.filter(c => c.status === "Em andamento").length;
  const finalizados = listaChs.filter(c => c.status === "Concluída").length;
  
  const statsEl = $("#admin-stats");
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="k"><b>${total}</b><span>Chamados</span></div>
      <div class="k"><b>${emAberto}</b><span>Em aberto</span></div>
      <div class="k"><b>${finalizados}</b><span>Finalizados</span></div>
      <div class="k"><b>${listaChs.filter(c => c.status === "Nova chamada").length}</b><span>Novas</span></div>
    `;
  }

  // Preencher a tabela de serviços com os chamados do banco
  const tabelaEl = $("#admin-tabela-servicos");
  if (tabelaEl) {
    tabelaEl.innerHTML = tabela(
      ["Data", "Equipamento", "Serviço", "Status"],
      listaChs.map(c => `
        <tr style="cursor:pointer;" onclick="abrirChatAdmin('${c.id}')">
          <td>${fmtData(c.criado_em)}</td>
          <td><b>${esc(c.titulo)}</b></td>
          <td>${esc(c.categoria)}</td>
          <td>${stPill(c.status)}</td>
        </tr>
      `)
    );
  }

  // Se houver chamados, já abre o chat do primeiro por padrão
  if (listaChs.length > 0) {
    window.abrirChatAdmin = (id) => {
      iniciarChat($("#admin-chat-container"), id, true);
    };
    abrirChatAdmin(listaChs[0].id);
  }
};
