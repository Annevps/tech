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
    }
  };
  const h = (location.hash || "#/inicio").replace("#/", "");
  if (R[h]) await R[h](); else await R.inicio();
  window.addEventListener("hashchange", async () => { const h2 = (location.hash || "#/inicio").replace("#/", ""); if (R[h2]) await R[h2](); });
};

/* ---------- Painel Administrativo TechEmpire ---------- */
Pages.admin = async () => {
  const container = document.getElementById("conteudo-admin");
  if (!container) return;

  const nomeAdmin = App.perfil?.nome || "Administrador";

  container.innerHTML = `
    <div style="margin-bottom:20px">
      <p class="sub" style="margin:0">Bem-vinda, ${esc(nomeAdmin)}!</p>
      <h2 style="font-size:28px;margin:4px 0">Painel administrativo</h2>
      <p class="sub">Acompanhe os chamados do sistema em tempo real.</p>
    </div>
    <div class="kpis" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:24px;" id="admin-stats">
      <div class="k"><b>0</b><span>Chamados</span></div>
      <div class="k"><b>0</b><span>Em andamento</span></div>
      <div class="k"><b>0</b><span>Concluídos</span></div>
    </div>
    <div class="box">
      <h3 style="margin-bottom:12px">Lista de Chamados</h3>
      <div id="admin-tabela-servicos"><p class="empty">Carregando chamados...</p></div>
    </div>
  `;

  try {
    const { data: chamados } = await sb.from("chamados").select("*").order("criado_em", { ascending: false });
    const listaChs = chamados || [];

    const statsEl = document.getElementById("admin-stats");
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="k"><b>${listaChs.length}</b><span>Chamados</span></div>
        <div class="k"><b>${listaChs.filter(c => c.status === "Em andamento").length}</b><span>Em andamento</span></div>
        <div class="k"><b>${listaChs.filter(c => c.status === "Concluída").length}</b><span>Concluídos</span></div>
      `;
    }

    const tabelaEl = document.getElementById("admin-tabela-servicos");
    if (tabelaEl) {
      tabelaEl.innerHTML = tabela(
        ["Data", "Título", "Categoria", "Status"],
        listaChs.map(c => `
          <tr>
            <td>${fmtData(c.criado_em)}</td>
            <td><b>${esc(c.titulo)}</b></td>
            <td>${esc(c.categoria)}</td>
            <td>${stPill(c.status)}</td>
          </tr>
        `)
      );
    }
  } catch (err) {
    console.error("Erro ao carregar dados do admin:", err);
  }
};
