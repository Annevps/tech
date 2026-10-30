/* Página de manutenção preventiva e detectiva: PC em 3D (three.js) */
Pages.manutencao = () => {
  const PARTES = {
    fans:  { nome: "Ventoinhas e filtros", prev: ["Limpeza a cada 3 meses", "Verificar filtros de poeira"], det: ["Ruídos anormais", "Verificar rotação sob carga"] },
    cpu:   { nome: "Processador e pasta térmica", prev: ["Troca a cada 1-2 anos", "Limpar dissipador"], det: ["Monitorar temperatura", "Quedas de desempenho"] },
    ram:   { nome: "Memória RAM", prev: ["Limpar contatos", "Não misturar frequências"], det: ["Teste de memória", "Travamentos e telas azuis"] },
    gpu:   { nome: "Placa de vídeo", prev: ["Limpar ventoinhas", "Atualizar drivers"], det: ["Temperatura em jogos", "Artefatos na tela"] },
    disco: { nome: "SSD / HD", prev: ["Backup regular", "Espaço livre"], det: ["Saúde do disco (SMART)", "Lentidão e ruídos"] },
    psu:   { nome: "Fonte", prev: ["Limpar poeira", "Usar filtro de linha"], det: ["Desligamentos", "Cheiro de queimado"] }
  };

  const lista = $("#parts"), info = $("#info"), stage = $("#stage");
  if(!lista || !stage) return;
  
  lista.innerHTML = Object.entries(PARTES).map(([k, p]) => `<button type="button" data-k="${k}" aria-pressed="false">${esc(p.nome)}</button>`).join("");

  let destacar = () => {};
  function mostrar(k) {
    const p = PARTES[k]; if (!p) return;
    info.innerHTML = `<h3>${esc(p.nome)}</h3><p class="tag t1">Preventiva</p><ul>${p.prev.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="tag t2">Detectiva</p><ul>${p.det.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    $$("#parts button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === k)); destacar(k);
  }
  lista.addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (b) mostrar(b.dataset.k); });

  if (typeof THREE === "undefined") { stage.innerHTML = '<p style="padding:24px; color:#6B7280;">Visualizador 3D não carregado.</p>'; return; }
  
  let renderer; 
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { stage.innerHTML = '<p style="padding:24px; color:#6B7280;">WebGL não suportado.</p>'; return; }
  
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); 
  stage.appendChild(renderer.domElement); 
  renderer.domElement.style.touchAction = "pan-y";

  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, .1, 100); 
  cam.position.set(0, 1, 16);

  // ================= ILUMINAÇÃO MELHORADA =================
  scene.add(new THREE.AmbientLight(0xffffff, 0.6)); // Luz base mais suave
  const dl1 = new THREE.DirectionalLight(0xffffff, 1.2); dl1.position.set(5, 10, 7); scene.add(dl1);
  const dl2 = new THREE.DirectionalLight(0xffffff, 0.5); dl2.position.set(-5, 5, -5); scene.add(dl2); // Luz de preenchimento
  const pl = new THREE.PointLight(0x8fd21f, 1.5, 20); pl.position.set(-3, 2, 5); scene.add(pl);

  const pc = new THREE.Group(); scene.add(pc); 
  const hit = [], porParte = {}, fans = [];

  // ================= MATERIAIS PREMIUM (Metais e Plásticos) =================
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x4a5056, roughness: 0.3, metalness: 0.9 }); // Metal claro
  const matDark = new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: 0.5, metalness: 0.7 }); // Plástico escuro
  const matGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0, clearcoat: 1, side: THREE.DoubleSide }); // Vidro
  const matGreen = new THREE.MeshStandardMaterial({ color: 0x8fd21f, emissive: 0x8fd21f, emissiveIntensity: 0.8 }); // LED Verde
  const matLED = new THREE.MeshBasicMaterial({ color: 0xffffff }); // LED Branco

  const caixa = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  
  function marcar(k, obj) { 
    obj.traverse(o => { if (o.isMesh) { o.userData.k = k; hit.push(o); (porParte[k] = porParte[k] || []).push(o); } }); 
    pc.add(obj); 
  }

  // Função para criar ventoinhas detalhadas
  function fan(r, axisX) { 
    const g = new THREE.Group(), blades = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * .08, 16, 48), matMetal)); // Aro externo
    for (let i = 0; i < 9; i++) { 
      const b = new THREE.Mesh(new THREE.BoxGeometry(r * .9, r * .25, .02), new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.4, metalness: 0.5 })); 
      const a = i / 9 * Math.PI * 2; 
      b.position.set(Math.cos(a) * r * .5, Math.sin(a) * r * .5, 0); 
      b.rotation.z = a + .35; blades.add(b); 
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * .3, r * .3, .06, 24), matDark); 
    const led = new THREE.Mesh(new THREE.CylinderGeometry(r * .15, r * .15, .07, 16), matLED); 
    hub.rotation.x = Math.PI / 2; led.rotation.x = Math.PI / 2;
    blades.add(hub, led); g.add(blades); fans.push(blades); 
    if (axisX) g.rotation.y = Math.PI / 2; 
    return g; 
  }

  const W = 4.2, H = 7.0, D = 3.0;

  // Gabinete de Vidro e Estrutura
  pc.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: 0x8fd21f, transparent: true, opacity: .5 })));
  pc.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), matGlass));
  
  // Base e topo do gabinete
  pc.add(caixa(W, .2, D, matDark, 0, H/2, 0));
  pc.add(caixa(W, .2, D, matDark, 0, -H/2, 0));

  // Placa-mãe
  pc.add(caixa(.15, 5.8, 2.35, matDark, -1.9, .1, -.1));

  // Processador (CPU)
  const cpuG = new THREE.Group(); 
  cpuG.add(caixa(.8, 1.2, 1.2, matMetal, -1.0, 1.5, .3)); 
  const wf = fan(.6, true); wf.position.set(-.5, 1.5, .3); cpuG.add(wf);
  marcar("cpu", cpuG);

  // Memória RAM
  const ramG = new THREE.Group(); 
  [-.55, -.95, -1.35].forEach(z => { 
    ramG.add(caixa(.15, 1.3, .2, matMetal, -1.2, 1.6, z)); 
    ramG.add(caixa(.16, .1, .22, matGreen, -1.2, 2.15, z)); // LED verde na RAM
  }); 
  marcar("ram", ramG);

  // Placa de Vídeo (GPU)
  const gpuG = new THREE.Group(); 
  gpuG.add(caixa(1.2, .8, 4.2, matDark, -1.0, -.8, .3)); 
  gpuG.add(caixa(1.2, .2, 4.2, matMetal, -1.0, -.3, .3)); // Detalhe superior
  [-.8, 1.2].forEach(z => { const f = fan(.6, true); f.position.set(-.4, -.8, z); gpuG.add(f); }); 
  marcar("gpu", gpuG);

  // Ventoinhas do Gabinete
  const fanG = new THREE.Group(); 
  [[1.8, 1.45], [-.2, 1.45], [-2.1, 1.45]].forEach(([y, z]) => { const f = fan(.62, false); f.position.set(.4, y, z); fanG.add(f); }); 
  marcar("fans", fanG);

  // Fonte (PSU)
  marcar("psu", caixa(2.8, 1.3, 3.0, matDark, 0, -2.6, -1.0));

  // SSD
  const ssdG = new THREE.Group(); 
  ssdG.add(caixa(.7, 1.2, .25, matMetal, 1.1, .8, -2.2)); 
  ssdG.add(caixa(.71, .1, .26, matGreen, 1.1, 1.3, -2.2)); 
  marcar("disco", ssdG);

  // ================= INTERATIVIDADE =================
  let rotY = -1.0, rotX = .1, vel = 0, arrasta = false, lx = 0, ly = 0, moveu = 0, parado = 0, visivel = true; 
  const el = renderer.domElement, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  const reduz = matchMedia("(prefers-reduced-motion:reduce)").matches;

  el.addEventListener("pointerdown", e => { arrasta = true; lx = e.clientX; ly = e.clientY; moveu = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", e => { if (!arrasta) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moveu += Math.abs(dx) + Math.abs(dy); rotY += dx * .012; vel = dx * .012; if (e.pointerType === "mouse") rotX = Math.max(-.7, Math.min(.7, rotX + dy * .008)); parado = 0; });
  el.addEventListener("pointerup", e => { arrasta = false; if (moveu < 6) { const r = el.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, cam); const h = ray.intersectObjects(hit, false)[0]; if (h) mostrar(h.object.userData.k); } });
  el.addEventListener("pointercancel", () => arrasta = false);

  // Ajusta o tamanho do renderizador quando a janela muda
  const ro = new ResizeObserver(() => { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }); ro.observe(stage);
  
  // Pausa a animação se não estiver visível na tela
  new IntersectionObserver(es => visivel = es[0].isIntersecting).observe(stage);
  
  const rel = new THREE.Clock();
  (function loop() { 
    requestAnimationFrame(loop); if (!visivel) return; const t = rel.getElapsedTime();
    
    // Movimento suave
    if (!arrasta) { rotY += vel; vel *= .93; parado += 1 / 60; if (!reduz && parado > 2) rotY += .005; }
    pc.rotation.set(rotX, rotY, 0); 
    
    // Rotação das ventoinhas
    if (!reduz) fans.forEach((f, i) => f.rotation.z -= .1 + i * .005);
    
    renderer.render(scene, cam); 
  })();

  // Inicializa mostrando o processador
  mostrar("cpu");
};
