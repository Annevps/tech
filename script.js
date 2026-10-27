/* TechEmpire — design system */
:root{--bg:#07090b;--s1:#0e1114;--s2:#14181c;--line:rgba(255,255,255,.09);--line2:rgba(255,255,255,.16);--ink:#f2f5f0;--muted:#97a0a6;--lime:#b4f03c;--lime2:#8fd21f;--tint:rgba(180,240,60,.12);--err:#ff7b6b;--r:20px;--head:"Space Grotesk",Inter,system-ui,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth;color-scheme:dark}
body{margin:0;font-family:Inter,system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased;
 background-image:radial-gradient(60rem 30rem at 85% -10%,rgba(180,240,60,.10),transparent 60%),linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:auto,64px 64px,64px 64px;background-attachment:fixed;background-position:0 0,-1px -1px,-1px -1px}
body::before{content:"";position:fixed;inset:0;background:radial-gradient(ellipse at center,transparent 30%,var(--bg) 85%);pointer-events:none;z-index:0}
a{color:inherit}button,input,select,textarea{font:inherit;color:inherit}:focus-visible{outline:2px solid var(--lime);outline-offset:3px}
#site-header,.wrap-main,#site-footer,.warn{position:relative;z-index:1}
.wrap-main{max-width:1160px;margin:0 auto;padding:40px 24px 88px;min-height:70vh}

/* Cabeçalho */
#site-header{position:sticky;top:0;z-index:30;background:rgba(7,9,11,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.bar-in{max-width:1160px;margin:0 auto;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{display:flex;align-items:center;gap:11px;font-family:var(--head);font-weight:700;font-size:21px;text-decoration:none;letter-spacing:-.02em}
.logo i{font-style:normal;background:var(--lime);color:#0a0d05;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:16px;box-shadow:0 0 28px rgba(180,240,60,.35)}.logo b{color:var(--lime)}
#nav{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
#nav a:not(.btn){padding:8px 13px;border-radius:999px;text-decoration:none;font-weight:500;font-size:15px;color:var(--muted);transition:.2s}
#nav a:not(.btn):hover,#nav a.on{color:var(--ink);background:rgba(255,255,255,.07)}
.menu{display:none;background:none;border:1px solid var(--line2);border-radius:10px;padding:6px 12px;cursor:pointer}

/* Botões */
.btn{border:1px solid var(--line2);background:rgba(255,255,255,.04);border-radius:999px;padding:12px 24px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:transform .15s,background .2s,box-shadow .2s}
.btn:hover{background:rgba(255,255,255,.09);transform:translateY(-1px)}
.btn.primary{background:var(--lime);border-color:var(--lime);color:#0a0d05;box-shadow:0 10px 30px -10px rgba(180,240,60,.6)}.btn.primary:hover{background:#c6f75e;box-shadow:0 14px 34px -8px rgba(180,240,60,.7)}
.btn.sm{padding:8px 16px;font-size:14px}.btn.danger{color:var(--err);border-color:rgba(255,123,107,.5)}.btn:disabled{opacity:.55;cursor:wait;transform:none}
.warn{background:#3a2f06;color:#ffd866;padding:12px 24px;text-align:center;font-weight:600}

/* Tipografia */
h1,h2,h3{font-family:var(--head);letter-spacing:-.03em;margin:0}
h1{font-size:clamp(42px,8vw,86px);line-height:1;font-weight:700;margin-bottom:22px}
h1 em,.grad{font-style:normal;background:linear-gradient(100deg,var(--lime),#e4ff9a 60%,var(--lime2));-webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:clamp(28px,4.4vw,44px);line-height:1.08;font-weight:700;margin-bottom:10px}h3{font-size:20px;font-weight:600;margin-bottom:8px}
.lead{max-width:58ch;color:var(--muted);font-size:clamp(16px,2vw,19px)}.sub{color:var(--muted);margin:0 0 22px}
.badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(180,240,60,.35);background:var(--tint);color:var(--lime);border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:22px}
.badge::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--lime);box-shadow:0 0 10px var(--lime)}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}

/* Hero */
.hero{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center;padding:36px 0 56px}
.hero.solo{grid-template-columns:1fr;max-width:860px}
.mock{background:linear-gradient(160deg,var(--s2),var(--s1));border:1px solid var(--line2);border-radius:24px;padding:22px;box-shadow:0 40px 80px -30px rgba(0,0,0,.8),0 0 60px -20px rgba(180,240,60,.25);transform:rotate(1.2deg)}
.mock .top{display:flex;gap:6px;margin-bottom:16px}.mock .top i{width:10px;height:10px;border-radius:50%;background:var(--line2)}
.mock .ex{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.mock .st{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);margin-bottom:8px;font-size:14px}
.mock .st b{margin-left:auto;font-size:12px;color:var(--lime)}.mock .dot{width:9px;height:9px;border-radius:50%;background:var(--line2)}.mock .on .dot{background:var(--lime);box-shadow:0 0 12px var(--lime)}.mock .on{outline:1px solid rgba(180,240,60,.4)}
.mark{overflow:hidden;border-block:1px solid var(--line);margin:8px 0 56px;padding:14px 0;mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.mark div{display:flex;gap:48px;width:max-content;animation:mq 30s linear infinite;font-family:var(--head);font-size:20px;color:var(--muted)}.mark span::after{content:"✦";color:var(--lime);margin-left:48px}
@keyframes mq{to{transform:translateX(-50%)}}

/* Seções e cartões */
.sec{margin:72px 0}.sec-h{max-width:640px;margin-bottom:32px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;margin:24px 0}
.card,.panel,.box{background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));border:1px solid var(--line);border-radius:var(--r);padding:26px;position:relative;transition:border-color .25s,transform .25s}
.card:hover{border-color:rgba(180,240,60,.45);transform:translateY(-3px)}.card p{margin:0;color:var(--muted)}
.ic{width:48px;height:48px;border-radius:14px;background:var(--tint);color:var(--lime);display:grid;place-items:center;margin-bottom:18px}.ic svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}.bento .card:nth-child(1){grid-column:span 3}.bento .card:nth-child(2){grid-column:span 3}.bento .card:nth-child(3){grid-column:span 2}.bento .card:nth-child(4){grid-column:span 4;background:linear-gradient(135deg,rgba(180,240,60,.16),rgba(255,255,255,.02))}
.steps{counter-reset:s;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}.steps .card::before{counter-increment:s;content:"0" counter(s);font-family:var(--head);font-size:44px;font-weight:700;color:var(--lime);display:block;line-height:1;margin-bottom:14px}
.cta{background:var(--lime);color:#0a0d05;border-radius:28px;padding:clamp(28px,5vw,56px);display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;margin:72px 0 0}
.cta h2{margin:0;color:#0a0d05}.cta p{margin:6px 0 0;opacity:.75}.cta .btn{background:#0a0d05;border-color:#0a0d05;color:var(--lime)}

/* Formulários */
.panel{max-width:660px;margin:0 auto;padding:clamp(22px,4vw,38px);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));backdrop-filter:blur(8px)}.panel.wide{max-width:800px}.box{margin-bottom:16px;padding:22px}
form{display:grid;gap:14px}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
label{display:grid;gap:6px;font-size:13.5px;font-weight:600;color:#d4dad6}
input,select,textarea{border:1px solid var(--line2);background:#0b0e11;border-radius:12px;padding:12px 14px;width:100%;transition:border-color .2s,box-shadow .2s}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--lime);box-shadow:0 0 0 3px rgba(180,240,60,.18)}input:disabled{opacity:.6}textarea{min-height:100px;resize:vertical}input[type=file]{padding:9px}
select option{background:#0b0e11}
.msg{padding:12px 14px;border-radius:12px;font-size:14px;display:none}.msg.on{display:block}.msg.err{background:rgba(255,123,107,.12);color:var(--err);border:1px solid rgba(255,123,107,.3)}.msg.ok{background:var(--tint);color:var(--lime);border:1px solid rgba(180,240,60,.3)}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}.tabs .btn.act{background:var(--lime);color:#0a0d05;border-color:var(--lime)}

/* Painel, tabelas */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:24px}
.k{background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid var(--line);border-radius:18px;padding:18px}.k b{display:block;font-family:var(--head);font-size:36px;font-weight:700;color:var(--lime);line-height:1.1}.k span{color:var(--muted);font-size:14px}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.02)}table{width:100%;border-collapse:collapse;font-size:14px}
th{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:600}th,td{text-align:left;padding:13px 14px;border-bottom:1px solid var(--line);vertical-align:top}tr:last-child td{border-bottom:0}
tr.go{cursor:pointer}tr.go:hover{background:rgba(180,240,60,.06)}td a{color:var(--lime);font-weight:600;text-decoration:none}
.pill{background:var(--tint);color:var(--lime);border-radius:999px;padding:3px 11px;font-weight:600;font-size:12px;white-space:nowrap;display:inline-block;border:1px solid rgba(180,240,60,.25)}.pill.gray{background:var(--line);color:var(--muted);border-color:transparent}
.empty{color:var(--muted);padding:18px 0}.bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.bar input,.bar select{width:auto;min-width:170px}
.files{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.file{margin:0}.file img,.file video{width:100%;border-radius:12px;max-height:180px;object-fit:cover;border:1px solid var(--line)}.file figcaption{font-size:13px;word-break:break-all;margin-top:4px}.file a{color:var(--lime)}
.tl{list-style:none;padding:0;margin:0}.tl li{padding:7px 0 7px 18px;border-left:2px solid var(--lime);margin-left:6px;font-size:14px;color:#d4dad6}

/* Chat */
.chat{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#090c0f}
.chat-log{height:380px;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.b{max-width:80%;padding:10px 14px;border-radius:16px;font-size:14.5px;white-space:pre-wrap;word-break:break-word}.b small{display:block;font-size:11px;opacity:.7;margin-bottom:2px}
.b.ou{align-self:flex-start;background:var(--s2);border:1px solid var(--line);border-bottom-left-radius:4px}.b.me{align-self:flex-end;background:var(--lime);color:#0a0d05;border-bottom-right-radius:4px}
.b.int{background:repeating-linear-gradient(135deg,#2b2508,#2b2508 8px,#241f06 8px,#241f06 16px);color:#ffd866;border:1px dashed #a88a1a}
.chat-form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line);align-items:flex-end;flex-wrap:wrap}.chat-form textarea{flex:1;min-width:160px;min-height:44px;max-height:120px;padding:10px 14px;border-radius:14px}
.chat-form .clip{font-size:20px;cursor:pointer;padding:6px}.chat-form .int{display:flex;gap:6px;align-items:center;font-size:12px;color:#ffd866}.chat-form .int input{width:auto}
#toast{position:fixed;bottom:20px;right:20px;background:var(--lime);color:#0a0d05;font-weight:600;padding:12px 18px;border-radius:14px;display:none;z-index:99;max-width:80vw;box-shadow:0 10px 40px rgba(0,0,0,.5)}

/* ================= NOVO RODAPÉ PREMIUM ================= */
#site-footer {
  background: #0a0d0f !important;
  border-top: 1px solid var(--line);
  padding: 60px 24px 30px;
  margin-top: 60px;
}

.foot-new {
  max-width: 1160px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 40px;
}

.foot-col.brand p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
  max-width: 250px;
}

.social-links {
  display: flex;
  gap: 12px;
}

.social-links a {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  font-size: 16px;
  transition: 0.2s;
}

.social-links a:hover {
  border-color: var(--lime);
  color: var(--lime);
  transform: translateY(-3px);
}

.foot-col h4 {
  font-family: var(--head);
  color: var(--ink);
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
}

.foot-col a:not(.social-links a) {
  display: block;
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 12px;
  transition: 0.2s;
}

.foot-col a:not(.social-links a):hover {
  color: var(--lime);
  padding-left: 4px;
}

.copy-new {
  max-width: 1160px;
  margin: 40px auto 0;
  padding-top: 24px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 900px) {
  .foot-new {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .foot-new {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .foot-col.brand p { margin: 0 auto 20px; }
  .social-links { justify-content: center; }
  .copy-new {
    flex-direction: column;
    text-align: center;
  }
}

/* Responsivo Geral */
@media(max-width:860px){.hero,.lab{grid-template-columns:1fr}.mock{transform:none}.bento{grid-template-columns:1fr}.bento .card{grid-column:auto!important}.stage{min-height:360px}}
@media(max-width:760px){.two{grid-template-columns:1fr}.menu{display:block}#nav{display:none;position:absolute;left:0;right:0;top:100%;background:rgba(7,9,11,.97);border-bottom:1px solid var(--line);padding:12px 24px;flex-direction:column;align-items:stretch}#nav.open{display:flex}.wrap-main{padding:24px 16px 64px}.b{max-width:92%}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}html{scroll-behavior:auto}.reveal{opacity:1;transform:none}}
