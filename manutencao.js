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
  if(!lista) return;
  
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
  cam.position.set(0, .5, 15);

  // Iluminação para fundo claro
  scene.add(new THREE.AmbientLight(0xffffff, .8)); 
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(5, 10, 7); scene.add(dl);
  const pl = new THREE.PointLight(0x8fd21f, 2, 20); pl.position.set(-3, 2, 5); scene.add(pl);

  const pc = new THREE.Group(); scene.add(pc); 
  const hit = [], porParte = {}, fans = [];

  // Materiais
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: .4, metalness: .8 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x121518, roughness: .6, metalness: .5 });
  const matGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, roughness: 0.1, metalness: 0.1, clearcoat: 1, side: THREE.DoubleSide });
  const matGreen = new THREE.MeshStandardMaterial({ color: 0x8fd21f, emissive: 0x8fd21f, emissiveIntensity: 0.6 });

  const caixa = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  
  function marcar(k, obj) { 
    obj.traverse(o => { if (o.isMesh) { o.userData.k = k; hit.push(o); (porParte[k] = porParte[k] || []).push(o); } }); 
    pc.add(obj); 
  }

  function fan(r, axisX) { 
    const g = new THREE.Group(), blades = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * .06, 12, 32), matDark));
    for (let i = 0; i < 7; i++) { 
      const b = new THREE.Mesh(new THREE.BoxGeometry(r * .85, r * .35, .02), new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: .2, metalness: .9 })); 
      const a = i / 7 * Math.PI * 2; 
      b.position.set(Math.cos(a) * r * .5, Math.sin(a) * r * .5, 0); 
      b.rotation.z = a + .35; blades.add(b); 
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * .25, r * .25, .05, 16), matGreen); 
    hub.rotation.x = Math.PI / 2; blades.add(hub); g.add(blades); fans.push(blades); 
    if (axisX) g.rotation.y = Math.PI / 2; 
    return g; 
  }

  const W = 2.8, H = 5.4, D = 5.2;

  // Gabinete
  pc.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: 0x8fd21f, transparent: true, opacity: .6 })));
  pc.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), matGlass));
  
  // Placa-mãe
  pc.add(caixa(.1, 4.6, 4.4, matDark, -1.3, .2, .2));

  // CPU
  const cpuG = new THREE.Group(); 
  cpuG.add(caixa(.7, 1.1, 1.1, matMetal, -.9, 1.3, .3)); 
  const wf = fan(.5, true); wf.position.set(-.5, 1.3, .3); cpuG.add(wf);
  marcar("cpu", cpuG);

  // RAM
  const ramG = new THREE.Group(); 
  [-1.1, -1.5, -1.9].forEach(z => { 
    ramG.add(caixa(.15, 1.1, .2, matDark, -1.1, 1.4, z)); 
    ramG.add(caixa(.16, .1, .22, matGreen, -1.1, 1.9, z)); 
  }); 
  marcar("ram", ramG);

  // GPU
  const gpuG = new THREE.Group(); 
  gpuG.add(caixa(.8, .7, 3.8, matMetal, -.9, -.7, .3)); 
  [-.7, 1.1].forEach(z => { const f = fan(.55, true); f.position.set(-.5, -.7, z); gpuG.add(f); }); 
  marcar("gpu", gpuG);

  // Fans do Gabinete
  const fanG = new THREE.Group(); 
  [[1.3, 2.6], [-.7, 2.6], [1.3, 0.8]].forEach(([y, z]) => { const f = fan(1.0, false); f.position.set(.3, y, z); fanG.add(f); }); 
  marcar("fans", fanG);

  // Fonte
  marcar("psu", caixa(2.4, 1.1, 2.8, matDark, 0, -2.4, -.9));

  // SSD
  const ssdG = new THREE.Group(); 
  ssdG.add(caixa(.6, 1.1, .2, matMetal, .9, .6, -2.0)); 
  ssdG.add(caixa(.61, .1, .21, matGreen, .9, 1.0, -2.0)); 
  marcar("disco", ssdG);

  // Interatividade
  let rotY = -1.2, rotX = .15, vel = 0, arrasta = false, lx = 0, ly = 0, moveu = 0, parado = 0, visivel = true; 
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
