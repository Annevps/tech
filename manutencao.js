/* Página de manutenção preventiva e detectiva: PC em 3D (three.js) */
Pages.manutencao = () => {
  const PARTES = {
    fans:  { nome: "Ventoinhas e filtros", prev: ["Limpeza a cada 3 meses", "Verificar filtros"], det: ["Ruídos anormais", "Verificar rotação"] },
    cpu:   { nome: "Processador e pasta térmica", prev: ["Troca a cada 1-2 anos", "Limpar dissipador"], det: ["Monitorar temperatura", "Quedas de desempenho"] },
    ram:   { nome: "Memória RAM", prev: ["Limpar contatos", "Não misturar frequências"], det: ["Teste de memória", "Travamentos e telas azuis"] },
    gpu:   { nome: "Placa de vídeo", prev: ["Limpar ventoinhas", "Atualizar drivers"], det: ["Temperatura em jogos", "Artefatos na tela"] },
    disco: { nome: "SSD / HD", prev: ["Backup regular", "Espaço livre"], det: ["Saúde do disco (SMART)", "Lentidão e ruídos"] },
    psu:   { nome: "Fonte", prev: ["Limpar poeira", "Usar filtro de linha"], det: ["Desligamentos", "Cheiro de queimado"] }
  };

  const lista = $("#parts"), info = $("#info"), stage = $("#stage");
  if(!lista) return; // Se não for a página de manutenção, aborta
  
  lista.innerHTML = Object.entries(PARTES).map(([k, p]) => `<button type="button" data-k="${k}" aria-pressed="false">${esc(p.nome)}</button>`).join("");

  let destacar = () => {};
  function mostrar(k) {
    const p = PARTES[k]; if (!p) return;
    info.innerHTML = `<h3>${esc(p.nome)}</h3><p class="tag t1">Preventiva</p><ul>${p.prev.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="tag t2">Detectiva</p><ul>${p.det.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    $$("#parts button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === k)); destacar(k);
  }
  lista.addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (b) mostrar(b.dataset.k); });

  if (typeof THREE === "undefined") { stage.innerHTML = '<p class="empty" style="padding:24px">Visualizador 3D não carregado.</p>'; return; }
  
  let renderer; 
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { stage.innerHTML = 'WebGL não suportado.'; return; }
  
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); 
  stage.prepend(renderer.domElement); 
  renderer.domElement.style.touchAction = "pan-y";

  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, .1, 100); 
  cam.position.set(0, .5, 14);

  // Iluminação Realista
  scene.add(new THREE.AmbientLight(0xffffff, .6)); 
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(5, 10, 7); scene.add(dl);
  const pl = new THREE.PointLight(0x00DDB5, 1.5, 20); pl.position.set(-3, 0, 5); scene.add(pl); // Luz Turquesa

  const pc = new THREE.Group(); scene.add(pc); 
  const hit = [], porParte = {}, fans = [], marcadores = {};

  // Materiais Premium
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .3, metalness: .7, ...o });
  const cMetal = 0x2a2d30, cDark = 0x121518, cTurq = 0x00DDB5;

  const caixa = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); return m; };
  
  function marcar(k, obj) { 
    obj.traverse(o => { if (o.isMesh) { o.userData.k = k; hit.push(o); (porParte[k] = porParte[k] || []).push(o); } }); 
    pc.add(obj); 
  }

  function fan(r, axisX) { 
    const g = new THREE.Group(), blades = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * .05, 12, 32), M(cDark)));
    for (let i = 0; i < 7; i++) { 
      const b = new THREE.Mesh(new THREE.BoxGeometry(r * .8, r * .3, .02), M(0x3a3f44, { metalness: .9, roughness: .1 })); 
      const a = i / 7 * Math.PI * 2; 
      b.position.set(Math.cos(a) * r * .5, Math.sin(a) * r * .5, 0); 
      b.rotation.z = a + .35; blades.add(b); 
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * .25, r * .25, .04, 16), M(cTurq, {emissive: cTurq, emissiveIntensity: 0.5})); 
    hub.rotation.x = Math.PI / 2; blades.add(hub); g.add(blades); fans.push(blades); if (axisX) g.rotation.y = Math.PI / 2; return g; 
  }

  const W = 2.6, H = 5.0, D = 4.8;

  // Gabinete Translúcido
  pc.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: cTurq, transparent: true, opacity: .6 })));
  pc.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .03, side: THREE.DoubleSide, depthWrite: false })));
  
  // Placa-mãe
  pc.add(caixa(.1, 4.2, 4.0, 0x0e1114, -1.2, .2, .2));

  // CPU e Watercooler
  const cpuG = new THREE.Group(); 
  cpuG.add(caixa(.6, 1.0, 1.0, 0xaab4bc, -.85, 1.2, .25)); 
  const wf = fan(.45, true); wf.position.set(-.45, 1.2, .25); cpuG.add(wf);
  marcar("cpu", cpuG);

  // RAM
  const ramG = new THREE.Group(); 
  [-1.0, -1.4, -1.8].forEach(z => { ramG.add(caixa(.14, 1.0, .2, 0x3a3f44, -1.0, 1.3, z)); ramG.add(caixa(.15, .1, .22, cTurq, -1.0, 1.75, z)); }); 
  marcar("ram", ramG);

  // GPU
  const gpuG = new THREE.Group(); 
  gpuG.add(caixa(.7, .6, 3.5, 0x15181b, -.8, -.6, .3)); 
  [-.6, 1.0].forEach(z => { const f = fan(.5, true); f.position.set(-.4, -.6, z); gpuG.add(f); }); 
  marcar("gpu", gpuG);

  // Fans
  const fanG = new THREE.Group(); 
  [[1.2, 2.4], [-.6, 2.4]].forEach(([y, z]) => { const f = fan(.9, false); f.position.set(.2, y, z); fanG.add(f); }); 
  marcar("fans", fanG);

  // PSU e SSD
  marcar("psu", caixa(2.2, 1.0, 2.5, 0x23282d, 0, -2.2, -.9));
  const ssdG = new THREE.Group(); ssdG.add(caixa(.5, 1.0, .2, 0x1A1D21, .8, .5, -1.8)); ssdG.add(caixa(.51, .1, .21, cTurq, .8, .9, -1.8)); marcar("disco", ssdG);

  // Interatividade (Drag & Click)
  let rotY = -1.1, rotX = .14, vel = 0, arrasta = false, lx = 0, ly = 0, moveu = 0, parado = 0, visivel = true; 
  const el = renderer.domElement, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  const reduz = matchMedia("(prefers-reduced-motion:reduce)").matches;

  el.addEventListener("pointerdown", e => { arrasta = true; lx = e.clientX; ly = e.clientY; moveu = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", e => { if (!arrasta) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moveu += Math.abs(dx) + Math.abs(dy); rotY += dx * .012; vel = dx * .012; if (e.pointerType === "mouse") rotX = Math.max(-.7, Math.min(.7, rotX + dy * .008)); parado = 0; });
  el.addEventListener("pointerup", e => { arrasta = false; if (moveu < 6) { const r = el.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, cam); const h = ray.intersectObjects(hit, false)[0]; if (h) mostrar(h.object.userData.k); } });
  el.addEventListener("pointercancel", () => arrasta = false);

  const ro = new ResizeObserver(() => { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }); ro.observe(stage);
  new IntersectionObserver(es => visivel = es[0].isIntersecting).observe(stage);
  
  const rel = new THREE.Clock();
  (function loop() { 
    requestAnimationFrame(loop); if (!visivel) return; const t = rel.getElapsedTime();
    if (!arrasta) { rotY += vel; vel *= .93; parado += 1 / 60; if (!reduz && parado > 2) rotY += .004; }
    pc.rotation.set(rotX, rotY, 0); 
    if (!reduz) fans.forEach((f, i) => f.rotation.z -= .08 + i * .002);
    renderer.render(scene, cam); 
  })();

  mostrar("cpu");
};
