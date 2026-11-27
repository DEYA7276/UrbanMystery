'use strict';
const $=s=>document.querySelector(s), view=$('#view');
let db,cases=[],state={},evidence=[],stream=null,installEvent,routeVersion=0,activeKeyHandler=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!?¿¡]/g,'');

/* Clean Vector SVG Icons (No Emojis) */
const SVG_ICONS = {
  player: '<svg class="icon-svg player-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  trap: '<svg class="icon-svg trap-svg" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 4.5l8.5 14.5h-17L12 6.5zm-1 6h2v4h-2zm0 5h2v2h-2z" fill="currentColor"/></svg>',
  key: '<svg class="icon-svg key-svg" viewBox="0 0 24 24"><circle cx="7" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M11 12h9v3h-3v2h-2v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  door: '<svg class="icon-svg door-svg" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><path d="M10 7h4v4h-4z" fill="currentColor"/></svg>',
  item: '<svg class="icon-svg item-svg" viewBox="0 0 24 24"><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  goal: '<svg class="icon-svg goal-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="9 8 16 12 9 16 9 8" fill="currentColor"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24"><path d="M12 5l-7 7h4v7h6v-7h4z" fill="currentColor"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24"><path d="M12 19l7-7h-4V5h-6v7H5z" fill="currentColor"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24"><path d="M5 12l7-7v4h7v6h-7v4z" fill="currentColor"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24"><path d="M19 12l-7-7v4H5v6h7v4z" fill="currentColor"/></svg>'
};

function openDB(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open('UrbanMystery',1);
    r.onupgradeneeded=()=>{
      r.result.createObjectStore('progress',{keyPath:'id'});
      r.result.createObjectStore('evidence',{keyPath:'id'});
    };
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
}

function transaction(store,mode,action){
  return new Promise((resolve,reject)=>{
    const t=db.transaction(store,mode),r=action(t.objectStore(store));
    t.oncomplete=()=>resolve(r.result);
    t.onerror=()=>reject(t.error);
    t.onabort=()=>reject(t.error);
  });
}

const all=s=>transaction(s,'readonly',o=>o.getAll()),
      put=(s,v)=>transaction(s,'readwrite',o=>o.put(v)),
      del=(s,id)=>transaction(s,'readwrite',o=>o.delete(id));

const count=c=>state[c.id]?.step||0,
      solved=()=>cases.reduce((n,c)=>n+count(c),0),
      total=()=>cases.reduce((n,c)=>n+c.puzzles.length,0),
      auraPoints=()=>solved()*5000;

function stopCamera(){
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
}

function cleanupKeyHandler(){
  if(activeKeyHandler){
    window.removeEventListener('keydown',activeKeyHandler);
    activeKeyHandler=null;
  }
}

function connection(){
  $('#connection').textContent=navigator.onLine?'[EN LINEA]':'[OFFLINE]';
}
window.addEventListener('online',connection);
window.addEventListener('offline',connection);
connection();

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  installEvent=e;
  $('#install').hidden=false;
});
$('#install').onclick=async()=>{
  if(installEvent){
    await installEvent.prompt();
    await installEvent.userChoice;
    installEvent=null;
    $('#install').hidden=true;
  }
};
window.addEventListener('appinstalled',()=>{$('#install').hidden=true;installEvent=null;});

function stats(){
  return `<div class="stats">
    <div class="card stat"><strong>${cases.filter(c=>count(c)===c.puzzles.length).length}/${cases.length}</strong><p>Casos resueltos</p></div>
    <div class="card stat"><strong>${solved()}/${total()}</strong><p>Sectores superados</p></div>
    <div class="card stat"><strong>+${auraPoints()}</strong><p>Puntos de Aura 2026</p></div>
  </div>`;
}

function home(){
  cleanupKeyHandler();
  view.innerHTML=`<section class="hero">
    <p class="eyebrow">DIVISIÓN TÁCTICA · PROTOCOLO DE INVESTIGACIÓN</p>
    <h1>La verdad está<br>entre las <span class="gold">pistas y las trampas.</span></h1>
    <p>${cases.length} expedientes tácticos. ${total()} laberintos con trampas, niebla de exploración, compuertas blindadas y lore urbano auténtico.</p>
    <a class="btn" href="#caso/${(cases.find(c=>count(c)<c.puzzles.length)||cases[0]).id}">Iniciar sector activo →</a>
  </section>
  ${stats()}
  <section class="section">
    <p class="eyebrow">ARCHIVO CENTRAL</p>
    <h2>Expedientes clasificados</h2>
    <div class="grid">${cases.map(c=>`
      <article class="card case">
        <div class="art">${c.symbol}</div>
        <div class="content">
          <span class="tag">EXPEDIENTE ${c.number} · ${c.level.toUpperCase()}</span>
          <h3>${c.title}</h3>
          <p>${c.story}</p>
          <progress max="${c.puzzles.length}" value="${count(c)}"></progress>
          <p>${count(c)} de ${c.puzzles.length} sectores completados</p>
          <a class="btn secondary" href="#caso/${c.id}">${count(c)===c.puzzles.length?'Revisar expediente':'Infiltrar sector'} →</a>
        </div>
      </article>`).join('')}
    </div>
  </section>`;
}

function caseView(c){
  cleanupKeyHandler();
  const n=count(c), p=c.puzzles[n];

  view.innerHTML=`<section class="section puzzle">
    <a href="#inicio">← Central de casos</a>
    <p class="eyebrow">EXPEDIENTE ${c.number} / ${c.level.toUpperCase()} · FASE ${n+1}</p>
    <h1>${c.title}</h1>
    <p>${c.story}</p>
    <progress max="${c.puzzles.length}" value="${n}"></progress>
    <p>${n} de ${c.puzzles.length} sectores superados · Nivel de Aura: +${n*5000}</p>
    ${p?`
      <div class="card">
        <span class="tag">SECTOR TÁCTICO ${n+1} · LABERINTO Y TRAMPAS</span>
        <h2>${p.question}</h2>
        <div class="clue">${esc(p.clue)}</div>
        <form id="answerForm">
          <div class="tactical-hud">
            <div class="aura-container">
              <div class="aura-label">
                <span>RESERVA DE AURA</span>
                <span id="auraPercent">100%</span>
              </div>
              <div class="aura-meter-track">
                <div class="aura-meter-fill" id="auraBar" style="width:100%"></div>
              </div>
            </div>
            <div class="hud-badge" id="keyBadge">
              <span>TARJETA:</span> <strong id="keyStatus">0</strong>
            </div>
            <div class="hud-badge" id="itemsBadge">
              <span>OBJETIVOS:</span> <strong id="itemStatus">0/${p.requiredItems}</strong>
            </div>
          </div>
          <div class="maze-wrapper" id="mazeWrapper">
            <div class="maze-board" id="mazeBoard"></div>
          </div>
          <div class="maze-controls-row">
            <div class="dpad">
              <button type="button" class="dpad-btn up" data-dir="up" aria-label="Arriba">${SVG_ICONS.arrowUp}</button>
              <button type="button" class="dpad-btn left" data-dir="left" aria-label="Izquierda">${SVG_ICONS.arrowLeft}</button>
              <div class="dpad-center">PAD</div>
              <button type="button" class="dpad-btn right" data-dir="right" aria-label="Derecha">${SVG_ICONS.arrowRight}</button>
              <button type="button" class="dpad-btn down" data-dir="down" aria-label="Abajo">${SVG_ICONS.arrowDown}</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <span class="maze-hint-text">Controles: Flechas o WASD / Pantalla táctil</span>
              <button type="button" class="btn-tactical-reset" id="resetMaze">Reiniciar sector</button>
            </div>
          </div>
          <div class="feedback" id="feedback" role="status"></div>
          <div class="actions">
            <button type="submit" id="verify" disabled>Confirmar extracción ◈</button>
            <button type="button" class="secondary" id="hint">Pista táctica</button>
          </div>
        </form>
      </div>`:`
      <div class="card">
        <p class="eyebrow">✓ CASO RESUELTO</p>
        <h2>Expediente completado</h2>
        <p>Has superado todos los sectores tácticos y asegurado las evidencias del caso ${c.title}. Puntos obtenidos: +${c.puzzles.length*5000} Aura.</p>
        <a class="btn" href="#inicio">Volver a la central</a>
      </div>`}
    <h2 class="section">Registros recuperados del sector</h2>
    ${c.puzzles.slice(0,n).map((x,i)=>`
      <div class="card" style="margin-bottom:12px">
        <span class="tag">SECTOR ${i+1} · REVELACIÓN</span>
        <p>${x.reveal}</p>
      </div>`).join('')||'<p>Aún no hay registros en este expediente.</p>'}
  </section>`;

  if(!p) return;

  const feedback=$('#feedback'), verify=$('#verify'), mazeWrapper=$('#mazeWrapper');
  const auraBar=$('#auraBar'), auraPercent=$('#auraPercent');
  const keyBadge=$('#keyBadge'), keyStatus=$('#keyStatus');
  const itemsBadge=$('#itemsBadge'), itemStatus=$('#itemStatus');

  $('#hint').onclick=()=>{
    feedback.className='feedback';
    feedback.textContent='Pista táctica: ' + p.hint;
  };

  /* Tactical Maze State */
  const rawGrid = p.grid.map(row => row.trim().split(/\s+/));
  const rows = rawGrid.length, cols = rawGrid[0].length;
  let grid = rawGrid.map(row => [...row]);
  let playerPos = { r: 0, c: 0 }, startPos = { r: 0, c: 0 };
  let aura = 100, keys = 0, items = 0;
  let mazeComplete = false;
  const discovered = new Set();

  for(let r=0; r<rows; r++){
    for(let cIdx=0; cIdx<cols; cIdx++){
      if(grid[r][cIdx]==='S'){
        startPos = { r, c: cIdx };
        playerPos = { r, c: cIdx };
        grid[r][cIdx] = '.';
      }
    }
  }

  const mazeBoard = $('#mazeBoard');
  mazeBoard.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  function updateHUD(){
    auraPercent.textContent = `${aura}%`;
    auraBar.style.width = `${aura}%`;
    auraBar.classList.toggle('warning', aura <= 50 && aura > 25);
    auraBar.classList.toggle('danger', aura <= 25);

    keyStatus.textContent = keys;
    keyBadge.classList.toggle('has-key', keys > 0);

    itemStatus.textContent = `${items}/${p.requiredItems}`;
    itemsBadge.classList.toggle('done', items >= p.requiredItems);
  }

  function renderMaze(){
    let html = '';
    const fog = Boolean(p.fog);

    // Update discovered tiles if fog is active
    if(fog){
      for(let r=0; r<rows; r++){
        for(let cIdx=0; cIdx<cols; cIdx++){
          const dist = Math.hypot(r - playerPos.r, cIdx - playerPos.c);
          if(dist <= 2.2){
            discovered.add(`${r},${cIdx}`);
          }
        }
      }
    }

    for(let r=0; r<rows; r++){
      for(let cIdx=0; cIdx<cols; cIdx++){
        const isPlayer = r === playerPos.r && cIdx === playerPos.c;
        const val = grid[r][cIdx];
        const dist = Math.hypot(r - playerPos.r, cIdx - playerPos.c);
        let fogClass = 'fog-visible';

        if(fog){
          if(dist <= 2.2){
            fogClass = 'fog-visible';
          }else if(discovered.has(`${r},${cIdx}`)){
            fogClass = 'fog-dim';
          }else{
            fogClass = 'fog-hidden';
          }
        }

        if(isPlayer){
          html += `<div class="tile player ${fogClass}">${SVG_ICONS.player}</div>`;
        }else if(val === '#'){
          html += `<div class="tile wall ${fogClass}"></div>`;
        }else if(val === 'T'){
          html += `<div class="tile trap ${fogClass}">${SVG_ICONS.trap}</div>`;
        }else if(val === 'K'){
          html += `<div class="tile key ${fogClass}">${SVG_ICONS.key}</div>`;
        }else if(val === 'D'){
          html += `<div class="tile door ${fogClass}">${SVG_ICONS.door}</div>`;
        }else if(val === 'C'){
          html += `<div class="tile item ${fogClass}">${SVG_ICONS.item}</div>`;
        }else if(val === 'G'){
          html += `<div class="tile goal ${fogClass}">${SVG_ICONS.goal}</div>`;
        }else{
          html += `<div class="tile path ${fogClass}"></div>`;
        }
      }
    }
    mazeBoard.innerHTML = html;
    updateHUD();
  }

  function resetSector(){
    grid = rawGrid.map(row => [...row]);
    for(let r=0; r<rows; r++){
      for(let cIdx=0; cIdx<cols; cIdx++){
        if(grid[r][cIdx]==='S') grid[r][cIdx] = '.';
      }
    }
    playerPos = { ...startPos };
    aura = 100;
    keys = 0;
    items = 0;
    mazeComplete = false;
    verify.disabled = true;
    discovered.clear();
    feedback.className = 'feedback';
    feedback.textContent = 'Sector reiniciado desde el punto de infiltración.';
    renderMaze();
  }

  $('#resetMaze').onclick = resetSector;

  function move(dr, dc){
    if(mazeComplete) return;
    const nr = playerPos.r + dr, nc = playerPos.c + dc;
    if(nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;

    const targetVal = grid[nr][nc];
    if(targetVal === '#') return; // Wall

    // Check locked door
    if(targetVal === 'D'){
      if(keys > 0){
        keys--;
        grid[nr][nc] = '.';
        feedback.className = 'feedback success';
        feedback.textContent = 'Compuerta de seguridad desbloqueada.';
      }else{
        feedback.className = 'feedback danger';
        feedback.textContent = 'Compuerta blindada bloqueada. Necesitas la tarjeta magnética [K].';
        return;
      }
    }

    playerPos = { r: nr, c: nc };

    // Stepped on Trap
    if(targetVal === 'T'){
      aura = Math.max(0, aura - 25);
      mazeWrapper.classList.remove('shake');
      void mazeWrapper.offsetWidth; // trigger reflow
      mazeWrapper.classList.add('shake');

      if(aura <= 0){
        feedback.className = 'feedback danger';
        feedback.textContent = '¡ALERTA MÁXIMA! Reserva de aura agotada por trampas. Reiniciando sector...';
        setTimeout(resetSector, 600);
        return;
      }else{
        feedback.className = 'feedback danger';
        feedback.textContent = `¡ALERTA DE TRAMPA! Impacto de sensor. Aura restante: ${aura}%.`;
      }
    }

    // Stepped on Key
    if(targetVal === 'K'){
      keys++;
      grid[nr][nc] = '.';
      feedback.className = 'feedback success';
      feedback.textContent = 'Tarjeta magnética asegurada. Compuerta [D] habilitada.';
    }

    // Stepped on Clue Item
    if(targetVal === 'C'){
      items++;
      grid[nr][nc] = '.';
      feedback.className = 'feedback success';
      feedback.textContent = `Objetivo asegurado (${items}/${p.requiredItems}).`;
    }

    // Stepped on Goal
    if(targetVal === 'G'){
      if(items >= p.requiredItems){
        mazeComplete = true;
        verify.disabled = false;
        feedback.className = 'feedback success';
        feedback.textContent = '¡Sector despejado! Objetivos a salvo. Pulsa "Confirmar extracción ◈" para continuar.';
      }else{
        feedback.className = 'feedback danger';
        feedback.textContent = `Aún requieres recuperar ${p.requiredItems - items} objetivo(s) antes de la extracción.`;
      }
    }

    renderMaze();
  }

  renderMaze();

  view.querySelectorAll('[data-dir]').forEach(btn => {
    btn.onclick = () => {
      const dir = btn.dataset.dir;
      if(dir === 'up') move(-1, 0);
      else if(dir === 'down') move(1, 0);
      else if(dir === 'left') move(0, -1);
      else if(dir === 'right') move(0, 1);
    };
  });

  activeKeyHandler = e => {
    if(['ArrowUp','KeyW'].includes(e.code)){ e.preventDefault(); move(-1, 0); }
    else if(['ArrowDown','KeyS'].includes(e.code)){ e.preventDefault(); move(1, 0); }
    else if(['ArrowLeft','KeyA'].includes(e.code)){ e.preventDefault(); move(0, -1); }
    else if(['ArrowRight','KeyD'].includes(e.code)){ e.preventDefault(); move(0, 1); }
  };
  window.addEventListener('keydown', activeKeyHandler);

  $('#answerForm').onsubmit = async e => {
    e.preventDefault();
    if(!mazeComplete){
      feedback.className = 'feedback danger';
      feedback.textContent = 'Debes completar el recorrido y alcanzar la meta antes de continuar.';
      return;
    }

    verify.disabled = true;
    try{
      const record = { id: c.id, step: n + 1, updated: new Date().toISOString() };
      await put('progress', record);
      state[c.id] = record;
      if(location.hash === `#caso/${c.id}`) caseView(c);
    }catch(err){
      feedback.className = 'feedback danger';
      feedback.textContent = 'Error al registrar progreso: ' + err.message;
      verify.disabled = false;
    }
  };
}

function progressView(){
  cleanupKeyHandler();
  view.innerHTML=`<section class="section">
    <p class="eyebrow">REGISTRO DE AGENTE · SECTORES Y AURA</p>
    <h1>Mi expediente</h1>
    <p>Tu progreso e insignias se conservan en este dispositivo mediante IndexedDB.</p>
    ${stats()}
    ${cases.map(c=>`<div class="card section">
      <h3>${c.title}</h3>
      <progress value="${count(c)}" max="${c.puzzles.length}"></progress>
      <p>${count(c)===c.puzzles.length?'Expediente completado al 100%':`${count(c)} de ${c.puzzles.length} sectores superados`}</p>
      <a href="#caso/${c.id}">Consultar expediente →</a>
    </div>`).join('')}
    <button class="secondary" id="reset">Reiniciar progreso</button>
  </section>`;

  $('#reset').onclick=async()=>{
    if(!confirm('¿Reiniciar todos los casos? Tus evidencias de campo se conservarán.')) return;
    await transaction('progress','readwrite',o=>o.clear());
    state={};
    progressView();
  };
}

function evidenceView(){
  cleanupKeyHandler();
  const version=routeVersion;
  view.innerHTML=`<section class="section">
    <p class="eyebrow">LABORATORIO DE CAMPO</p>
    <h1>Mis evidencias</h1>
    <p>Registra una pista real de tu entorno. La foto y las coordenadas se guardan únicamente en este dispositivo.</p>
    <div class="card">
      <form id="evidenceForm">
        <label for="note">Descripción del hallazgo</label>
        <textarea id="note" maxlength="500" required placeholder="Describe la evidencia encontrada..." style="width:100%;background:#0e1715;border:1px solid var(--line-bright);border-radius:6px;padding:12px;color:var(--text);margin:8px 0 14px"></textarea>
        <div class="actions">
          <button type="button" class="secondary" id="camera">◉ Abrir cámara</button>
          <button type="button" class="secondary" id="geo">◎ Registrar ubicación</button>
        </div>
        <p id="apiStatus" class="feedback" role="status"></p>
        <video id="video" autoplay playsinline muted hidden style="width:100%;max-height:300px;border-radius:8px"></video>
        <button type="button" id="snap" hidden>Capturar foto</button>
        <img id="preview" class="photo" hidden alt="Evidencia capturada" style="width:100%;max-height:240px;object-fit:contain;border-radius:8px">
        <p id="coords"></p>
        <button type="submit">Guardar evidencia</button>
      </form>
    </div>
    <h2 class="section">Archivo de campo</h2>
    <div class="grid">${evidence.map(x=>`
      <article class="card">
        ${x.photo?`<img class="photo" src="${esc(x.photo)}" alt="Evidencia" style="width:100%;max-height:200px;object-fit:contain;border-radius:6px">`:''}
        <p class="tag">${esc(new Date(x.date).toLocaleString('es-MX'))}</p>
        <p>${esc(x.note)}</p>
        ${x.coords?`<p>Lat. ${x.coords.lat.toFixed(5)} · Lon. ${x.coords.lon.toFixed(5)}</p>`:''}
        <button class="secondary" data-delete="${esc(x.id)}">Eliminar</button>
      </article>`).join('')||'<p>No hay evidencias registradas todavía.</p>'}
    </div>
  </section>`;

  let photo=null,coords=null;
  const status=$('#apiStatus');

  $('#camera').onclick=async()=>{
    try{
      if(!navigator.mediaDevices?.getUserMedia) throw Error('Cámara no disponible; utiliza HTTPS o localhost.');
      stopCamera();
      const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if(version!==routeVersion){acquired.getTracks().forEach(t=>t.stop());return;}
      stream=acquired;
      $('#video').srcObject=stream;
      $('#video').hidden=false;
      $('#snap').hidden=false;
      status.textContent='Cámara activa.';
    }catch(e){
      status.textContent='No se pudo abrir la cámara: '+e.message;
    }
  };

  $('#snap').onclick=()=>{
    const v=$('#video');
    if(!v.videoWidth) return;
    const canvas=document.createElement('canvas');
    canvas.width=Math.min(v.videoWidth,960);
    canvas.height=Math.round(v.videoHeight*canvas.width/v.videoWidth);
    canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);
    photo=canvas.toDataURL('image/jpeg',.8);
    $('#preview').src=photo;
    $('#preview').hidden=false;
    v.hidden=true;
    $('#snap').hidden=true;
    stopCamera();
    status.textContent='Fotografía capturada con éxito.';
  };

  $('#geo').onclick=()=>{
    if(!navigator.geolocation){status.textContent='Geolocalización no disponible.';return;}
    status.textContent='Solicitando ubicación…';
    navigator.geolocation.getCurrentPosition(p=>{
      if(version!==routeVersion) return;
      coords={lat:p.coords.latitude,lon:p.coords.longitude};
      $('#coords').textContent=`Latitud ${coords.lat.toFixed(5)} · Longitud ${coords.lon.toFixed(5)}`;
      status.textContent='Ubicación registrada.';
    },e=>{
      status.textContent='No se obtuvo ubicación: '+e.message;
    },{timeout:15000,maximumAge:0});
  };

  $('#evidenceForm').onsubmit=async e=>{
    e.preventDefault();
    try{
      const x={id:crypto.randomUUID(),note:$('#note').value.trim(),date:new Date().toISOString(),photo,coords};
      if(!x.note) return;
      await put('evidence',x);
      evidence.unshift(x);
      render();
    }catch(err){
      status.textContent='Error al guardar: '+err.message;
    }
  };

  view.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
    await del('evidence',b.dataset.delete);
    evidence=evidence.filter(x=>x.id!==b.dataset.delete);
    render();
  });
}

function render(){
  routeVersion++;
  stopCamera();
  cleanupKeyHandler();
  const route=location.hash.slice(1)||'inicio';
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash===`#${route}`||a.hash==='#inicio'&&route.startsWith('caso/')));
  if(route==='evidencias') evidenceView();
  else if(route==='progreso') progressView();
  else if(route.startsWith('caso/')){
    const c=cases.find(x=>x.id===route.split('/')[1]);
    c?caseView(c):home();
  }else home();
  window.scrollTo(0,0);
}

async function init(){
  try{
    db=await openDB();
    const r=await fetch('./data/cases.json?t='+Date.now());
    if(!r.ok) throw Error('No se pudieron cargar los casos');
    cases=await r.json();
    state=Object.fromEntries((await all('progress')).map(x=>[x.id,x]));
    evidence=(await all('evidence')).sort((a,b)=>b.date.localeCompare(a.date));
    window.addEventListener('hashchange',render);
    render();
  }catch(e){
    view.textContent='No se pudo iniciar la aplicación. Abre el proyecto mediante un servidor local o HTTPS. '+e.message;
  }
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    reg.update();
  }).catch(e=>console.error('Service Worker:',e));
}
init();
