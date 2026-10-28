/* TechEmpire — Lógica global */
const CFG = window.SUPABASE_CONFIG || {};
const CONFIGURADO = !!(CFG.url && CFG.anonKey && !CFG.url.startsWith("COLE"));
const sb = CONFIGURADO ? supabase.createClient(CFG.url, CFG.anonKey) : null;
const { SERVICOS, STATUS, PAGAMENTO_STATUS, FORMAS, ETAPAS_LEAD, DISPOSITIVOS, TIPOS_SITE, ATENDIMENTO } = window.TE || {};
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
const opts = (arr, sel) => (arr || []).map(x => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("");
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
    headerEl.innerHTML = `<div class="bar-in">
      <a class="logo" href="index.html" aria-label="TechEmpire — início" style="display:flex; align-items:center; text-decoration:none;">
        <img src="tech.png?v=99" alt="TechEmpire" style="height: 60px; width: auto; object-fit: contain;">
      </a>
     <button class="menu" aria-expanded="false" aria-label="Abrir menu">☰</button>
     <nav id="nav">${l("index.html", "Início")}${l("servicos.html", "Serviços")}${l("manutencao.html", "Manutenção")}${l("sobre.html", "Sobre")}${l("contato.html", "Contato")}
     <a href="consulta.html" style="color: var(--lime); font-weight: bold;">Acompanhar</a>
     ${logado ? `${adm ? l("admin.html", "Admin") : ""}${l("painel.html", "Meu painel")}${l("perfil.html", "Perfil")}<a href="#" class="btn sm" onclick="fazerLogout(event)">Sair</a>`
       : `<a class="btn sm" href="login.html">Entrar</a><a class="btn sm primary" href="criar-conta.html">Criar conta</a>`}</nav></div>`;
    $(".menu").onclick = e => { const n = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n); };
  }

  const footerEl = $("#site-footer");
  if (footerEl && document.body.dataset.page !== 'admin') {
    footerEl.innerHTML = `<div class="foot">
      <div>
        <a href="index.html" style="display:inline-block; margin-bottom:24px;"><img src="tech.png?v=99" alt="TechEmpire" style="height: 80px; width: auto; object-fit: contain;"></a>
        <p>Manutenção de dispositivos, suporte técnico e criação de sites. Tecnologia que funciona.</p>
      </div>
      <div><h4>Site</h4><a href="servicos.html">Serviços</a><a href="manutencao.html">Manutenção preventiva</a><a href="sobre.html">Sobre</a><a href="contato.html">Contato</a></div>
      <div><h4>Sua conta</h4><a href="login.html">Entrar</a><a href="criar-conta.html">Criar conta</a><a href="recuperar-senha.html">Recuperar senha</a></div></div>
      <div class="copy">© ${new Date().getFullYear()} TechEmpire · Seus dados são tratados conforme a LGPD.</div>`;
  }
}

window.fazerLogout = async (e) => {
  if (e) e.preventDefault();
  sessionStorage.removeItem('te_user_id');
  sessionStorage.removeItem('te_user_email');
  if (sb) await sb.auth.signOut();
  window.location.href = "index.html";
};

async function boot() {
  const need = document.body.dataset.auth || "public";
  
  if (sb) {
    const { data } = await sb.auth.getSession(); 
    App.session = data.session;
    
    if (App.session) { 
      const r = await sb.from("usuarios").select("*").eq("id", App.session.user.id).maybeSingle(); 
      App.perfil = r.data;
      if (App.perfil?.ativo === false) { await sb.auth.signOut(); location.href = "login.html?inativo=1"; return; } 
    }
  }

  if ((need === "client" || need === "admin") && !App.session) { location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); return; }
  if (need === "admin" && !App.perfil?.is_admin) { location.href = "painel.html"; return; }
  if (need === "guest" && App.session && !location.hash.includes("type=recovery")) { location.href = App.perfil?.is_admin ? "admin.html" : "painel.html"; return; }
  
  desenharChrome();
  const fn = Pages[document.body.dataset.page];
  if (fn) { 
    if (!sb && need !== "public") return; 
    try { await fn(); } catch (e) { console.error(e); toast("Ocorreu um erro ao carregar a página."); } 
  }
  
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: .1 }); 
  $$(".reveal").forEach(e => io.observe(e));
}

/* ====================== PÁGINAS ====================== */
const Pages = {};

Pages.home = () => { 
  const c = $("#cards-servicos"); 
  if (c) c.innerHTML = SERVICOS.map(s => `<div class="card"><div class="ic">${s.icone}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div>`).join(""); 
};

Pages.servicos = () => { 
  const el = $("#lista-servicos"); 
  if(el) el.innerHTML = SERVICOS.map(s => `<div class="card"><div class="ic">${s.icone}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p><p style="margin-top:14px"><a class="btn sm primary" href="novo-chamado.html?tipo=${s.cat}">Solicitar</a></p></div>`).join(""); 
};

Pages.painel = async () => {
  const elOla = $("#ola");
  if (elOla) elOla.textContent = App.perfil?.nome ? "Olá, " + App.perfil.nome.split(" ")[0] + "." : "";
  
  const carregar = async () => {
    const { data, error } = await sb.from("chamados").select("id,numero,categoria,titulo,status,criado_em").eq("cliente_id", App.session.user.id).order("criado_em", { ascending: false });
    if (error) { const l = $("#lista"); if (l) l.innerHTML = '<p class="empty">Erro ao carregar.</p>'; return; }
    
    const abertos = data.filter(c => !["Concluída", "Cancelada"].includes(c.status)).length;
    const kpisEl = $("#kpis");
    if (kpisEl) kpisEl.innerHTML = [[data.length, "Chamados"], [abertos, "Em aberto"], [data.length - abertos, "Finalizados"], [0, "Novas msgs"]].map(([n, l]) => `<div class="k"><b>${n}</b><span>${l}</span></div>`).join("");
    
    const listaEl = $("#lista");
    if (listaEl) {
      listaEl.innerHTML = data.length ? tabela(["Nº", "Serviço", "Título", "Status", "Data"], data.map(c => `<tr class="go" data-act="abrir" data-id="${c.id}"><td><a href="chamado.html?id=${c.id}">${num(c.numero)}</a></td><td>${c.categoria === "site" ? "Site" : "Manutenção"}</td><td>${esc(c.titulo)}</td><td>${pill(c.status)}</td><td>${fmtData(c.criado_em)}</td></tr>`))
        : '<p class="empty">Você ainda não tem chamados.</p>';
    }
  };
  Act.abrir = d => location.href = "chamado.html?id=" + d.id;
  await carregar(); 
};

Pages.perfil = () => {
  const p = App.perfil || {}, en = p.endereco || {};
  const campos = { nome: p.nome, telefone: p.telefone, rua: en.rua, numero: en.numero, bairro: en.bairro, cidade: en.cidade, estado: en.estado };
  const f = $("#f-perfil"); 
  if(f) {
    Object.entries(campos).forEach(([k, v]) => { if (f[k]) f[k].value = v || ""; }); 
    f.email.value = p.email || App.session.user.email; 
    f.cpf.value = p.cpf || "";
    
    f.addEventListener("submit", async e => { 
      e.preventDefault(); 
      const d = Object.fromEntries(new FormData(f)); 
      if (!d.nome.trim()) return msg("m-perfil", "Informe seu nome."); 
      ocupado(f, true);
      const { error } = await sb.from("usuarios").update({ nome: d.nome.trim(), telefone: digitos(d.telefone) }).eq("id", App.session.user.id);
      ocupado(f, false); 
      msg("m-perfil", error ? "Erro ao salvar." : "Dados atualizados.", !error); 
    });
  }
};

Pages.chamado = async () => {
  const id = qs("id"); 
  const { data: c } = await sb.from("chamados").select("*").eq("id", id).maybeSingle();
  if (!c) { const el = $("#conteudo"); if (el) el.innerHTML = '<p class="empty">Chamado não encontrado.</p>'; return; }
  if (qs("novo")) msg("m-topo", `Chamado ${num(c.numero)} registrado!`, true);
  
  const el = $("#conteudo");
  if (el) {
    el.innerHTML = `
      <p><a href="painel.html">← Voltar</a></p>
      <h2>${num(c.numero)} · ${esc(c.titulo)}</h2>
      <p>${pill(c.status)} <span class="sub">Aberto em ${fmtData(c.criado_em)}</span></p>
      <div class="box"><h3>Sua solicitação</h3><p style="white-space:pre-wrap">${esc(c.descricao)}</p></div>
      <div class="box"><h3>💬 Conversa com a TechEmpire</h3><div id="chat-container"></div></div>
    `;
  }

  const chatBody = $("<div class='chat-body' id='chat-msgs' style='height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; background:#0a0d0f; padding:15px; border-radius:8px;'><p style='text-align:center;'>Carregando chat...</p></div>");
  const inputMsg = $("<input type='text' placeholder='Digite sua mensagem...' style='flex:1; padding:10px; border-radius:8px; border:1px solid #444; background:#06080a; color:#fff;'>");
  const form = $("<form style='display:flex; gap:10px; margin-top:10px;'></form>");
  const btn = $("<button type='submit' style='background:#b4f03c; color:#000; border:none; padding:10px 20px; border-radius:8px; font-weight:bold;'>Enviar</button>");
  
  form.append(inputMsg, btn);
  const chatContainer = $("#chat-container");
  if (chatContainer) chatContainer.append(chatBody, form);

  async function carregarMsgs() {
    const { data } = await sb.from('mensagens').select('*').eq('chamado_id', id).order('criado_em', { ascending: true });
    if (!data || data.length === 0) { if (chatBody) chatBody.innerHTML = "<p style='color:#97a0a6; text-align:center;'>Nenhuma mensagem ainda.</p>"; return; }
    
    if (chatBody) {
      chatBody.innerHTML = data.map(m => {
        const isMe = m.remetente_id === App.session.user.id;
        return `<div style="background:${isMe ? '#b4f03c' : '#1a1e22'}; color:${isMe ? '#000' : '#fff'}; padding:10px 15px; border-radius:12px; align-self:${isMe ? 'flex-end' : 'flex-start'}; max-width:80%;"><small style="display:block; opacity:0.7; font-size:10px;">${isMe ? 'Você' : 'TechEmpire'}</small>${m.conteudo}</div>`;
      }).join('');
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const t = inputMsg.value.trim();
    if(!t) return;
    await sb.from('mensagens').insert({ chamado_id: id, remetente_id: App.session.user.id, conteudo: t });
    inputMsg.value = "";
    await carregarMsgs();
  };

  await carregarMsgs();
};

document.addEventListener("DOMContentLoaded", boot);
