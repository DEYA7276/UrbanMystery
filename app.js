'use strict';
const $=s=>document.querySelector(s), view=$('#view');
let db,cases=[],state={},evidence=[],stream=null,installEvent,routeVersion=0,activeKeyHandler=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!?¿¡]/g,'');

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
  $('#connection').textContent=navigator.onLine?'● En línea':'● Modo sin conexión';
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
    <div class="card stat"><strong>${solved()}/${total()}</strong><p>Enigmas superados</p></div>
    <div class="card stat"><strong>+${auraPoints()}</strong><p>Aura 2026 acumulada ✨</p></div>
  </div>`;
}

function home(){
  cleanupKeyHandler();
  view.innerHTML=`<section class="hero">
    <p class="eyebrow">ACCESO AUTORIZADO · PROTOCOLO RESOLUTIVO 2026</p>
    <h1>La verdad está<br>entre las <span class="gold">migajas y el aura.</span></h1>
    <p>${cases.length} expedientes legendarios. ${total()} enigmas interactivos. Laberintos, misterios ocultos y el lore más puro de Neza y el cerro.</p>
    <a class="btn" href="#caso/${(cases.find(c=>count(c)<c.puzzles.length)||cases[0]).id}">Continuar investigación →</a>
  </section>
  ${stats()}
  <section class="section">
    <p class="eyebrow">ARCHIVO CENTRAL</p>
    <h2>Expedientes disponibles</h2>
    <div class="grid">${cases.map(c=>`
      <article class="card case">
        <div class="art">${c.symbol}</div>
        <div class="content">
          <span class="tag">CASO ${c.number} · ${c.level.toUpperCase()}</span>
          <h3>${c.title}</h3>
          <p>${c.story}</p>
          <progress max="${c.puzzles.length}" value="${count(c)}"></progress>
          <p>${count(c)} de ${c.puzzles.length} pistas completadas</p>
          <a class="btn secondary" href="#caso/${c.id}">${count(c)===c.puzzles.length?'Revisar expediente':'Abrir expediente'} →</a>
        </div>
      </article>`).join('')}
    </div>
  </section>`;
}

function puzzleInteraction(p){
  if(p.type==='maze'){
    return `<div class="maze-container">
      <div class="aura-header">
        <span class="aura-badge">✨ Aura en juego: +10,000</span>
        <span class="crumbs-badge">🍞 Migajas recogidas: <span id="mazeCrumbs">0</span>/${p.requiredCrumbs||0}</span>
      </div>
      <p class="interaction-prompt">Supera el laberinto. Usa las flechas en pantalla o el teclado (Flechas / WASD) para guiar tu ficha hasta la meta.</p>
      <div class="maze-board" id="mazeBoard"></div>
      <div class="maze-controls">
        <span class="maze-help">Controles de movimiento:</span>
        <div class="dpad">
          <button type="button" class="dpad-btn up" data-dir="up" aria-label="Arriba">▲</button>
          <button type="button" class="dpad-btn left" data-dir="left" aria-label="Izquierda">◀</button>
          <div class="dpad-center">🕹️</div>
          <button type="button" class="dpad-btn right" data-dir="right" aria-label="Derecha">▶</button>
          <button type="button" class="dpad-btn down" data-dir="down" aria-label="Abajo">▼</button>
        </div>
      </div>
      <p id="mazeStatus" class="feedback" role="status">Llega a la meta sin dejar ni las migajas.</p>
    </div>`;
  }
  if(p.type==='hidden'){
    return `<div class="hidden-container">
      <div class="aura-header">
        <span class="aura-badge">✨ Aura de búsqueda: +5,000</span>
        <span class="crumbs-badge">🎯 Hallazgos: <span id="hiddenCount">0</span>/${p.targets.length}</span>
      </div>
      <div class="hidden-targets-box">
        <strong>Pistas a encontrar en la página:</strong>
        <div class="hidden-checklist" id="hiddenChecklist">
          ${p.targets.map(t=>`<div class="target-item" id="target-${esc(t.id)}"><span>⬜</span> ${esc(t.label)}</div>`).join('')}
        </div>
      </div>
      <p class="interaction-prompt">Inspecciona la escena haciendo clic en los escondites. ¡Cuidado con las trampas que te quitan aura!</p>
      <div class="hidden-scene-grid">
        ${p.spots.map(s=>`<button type="button" class="hidden-card" data-spot="${esc(s.id)}"><span class="hidden-card-title">${esc(s.label)} <span>🔍</span></span><span class="hidden-card-desc">Toca para inspeccionar</span></button>`).join('')}
      </div>
      <p id="hiddenStatus" class="feedback" role="status">Haz clic en los rincones sospechosos.</p>
    </div>`;
  }
  if(p.type==='radar'){
    return `<div class="radar-container">
      <div class="aura-header">
        <span class="aura-badge">✨ Señal de Las Pérdidas: +50,000 Aura</span>
      </div>
      <div class="radio-box">
        <div class="radio-display">
          <div class="radio-freq"><span id="freqDisplay">92.0</span> <small>MHz</small></div>
          <div class="signal-meter" id="signalMeter">
            <span class="meter-bar" id="bar1"></span>
            <span class="meter-bar" id="bar2"></span>
            <span class="meter-bar" id="bar3"></span>
            <span class="meter-bar" id="bar4"></span>
            <span class="meter-bar" id="bar5"></span>
          </div>
        </div>
        <div class="radio-audio-text" id="radioAudioText">${esc(p.quotes.far)}</div>
        <div class="radio-controls">
          <button type="button" class="radio-btn" id="freqDownFast">- 1.0</button>
          <button type="button" class="radio-btn" id="freqDown">- 0.1</button>
          <input type="range" id="freqSlider" min="88.0" max="108.0" step="0.1" value="92.0">
          <button type="button" class="radio-btn" id="freqUp">+ 0.1</button>
          <button type="button" class="radio-btn" id="freqUpFast">+ 1.0</button>
        </div>
      </div>
      <p id="radarStatus" class="interaction-prompt">Ajusta la frecuencia para sintonizar el grito en el cerro.</p>
    </div>`;
  }
  if(p.type==='lock'){
    const count = p.dials || 4;
    return `<div class="lock-container">
      <div class="aura-header">
        <span class="aura-badge">✨ Candado de Alta Seguridad: +15,000 Aura</span>
      </div>
      <p class="interaction-prompt">Usa las flechas para girar cada rueda y alinear la combinación correcta.</p>
      <div class="lock-dial-box">
        ${Array.from({length:count},(_,i)=>`
          <div class="dial-column">
            <button type="button" class="dial-arrow" data-dial-idx="${i}" data-dial-dir="1" aria-label="Aumentar">▲</button>
            <div class="dial-digit" id="dialVal${i}">0</div>
            <button type="button" class="dial-arrow" data-dial-idx="${i}" data-dial-dir="-1" aria-label="Disminuir">▼</button>
          </div>
        `).join('')}
      </div>
      <div class="lock-status-indicator" id="lockIndicator">🔒 Candado cerrado</div>
      <p id="lockStatus" class="feedback" role="status">Ingresa la clave correcta para abrir.</p>
    </div>`;
  }
  if(p.type==='sequence'){
    return `<p class="interaction-prompt">Toca los acontecimientos en el orden cronológico exacto:</p>
      <div class="puzzle-options">${p.items.map(x=>`<button type="button" class="puzzle-option" data-sequence="${esc(x.id)}" aria-pressed="false">${esc(x.label)}</button>`).join('')}</div>
      <ol id="sequencePreview" class="sequence-preview" aria-live="polite"></ol>
      <div class="actions">
        <button type="button" class="secondary" id="undoSequence" disabled>Deshacer último</button>
        <button type="button" class="secondary" id="clearSequence" disabled>Reiniciar orden</button>
      </div>`;
  }
  if(p.type==='inspect'){
    return `<p class="interaction-prompt">Abre cada evidencia para examinarla. Luego elige tu conclusión resolutiva.</p>
      <div class="evidence-board">${p.evidence.map(x=>`<article class="evidence-item"><button type="button" class="puzzle-option" data-inspect="${esc(x.id)}" aria-expanded="false">${esc(x.title)} <span aria-hidden="true">＋</span></button><p data-observation="${esc(x.id)}" hidden>${esc(x.detail)}</p></article>`).join('')}</div>
      <p id="inspectionStatus" class="interaction-prompt" aria-live="polite">Evidencias examinadas: 0 de ${p.evidence.length}</p>
      <div class="puzzle-options">${p.options.map(x=>`<button type="button" class="puzzle-option answer-option" data-option="${esc(x.value)}" disabled aria-pressed="false">${esc(x.label)}</button>`).join('')}</div>`;
  }
  if(p.type==='choice'){
    return `<p class="interaction-prompt">Elige la opción que demuestre tu nivel máximo de aura:</p>
      <div class="puzzle-options">${p.options.map(x=>`<button type="button" class="puzzle-option answer-option" data-option="${esc(x.value)}" aria-pressed="false">${esc(x.label)}</button>`).join('')}</div>`;
  }
  if(p.type==='match'){
    return `<p class="interaction-prompt">Selecciona un elemento de la izquierda y luego su correspondencia a la derecha.</p>
      <div class="match-board">
        <section><h3>Rastros</h3><div class="match-column">${p.leftItems.map(x=>`<button type="button" class="puzzle-option" data-match-left="${esc(x.id)}" aria-pressed="false">${esc(x.label)}</button>`).join('')}</div></section>
        <section><h3>Correspondencias</h3><div class="match-column">${p.rightItems.map(x=>`<button type="button" class="puzzle-option" data-match-right="${esc(x.id)}" aria-pressed="false">${esc(x.label)}</button>`).join('')}</div></section>
      </div>
      <p id="matchStatus" class="interaction-prompt" aria-live="polite">Conexiones correctas: 0 de ${Object.keys(p.matches).length}</p>`;
  }
  if(p.type==='scene'){
    return `<p class="interaction-prompt">Explora los rincones del lugar. Algunos objetos esconden llaves o herramientas para abrir otros.</p>
      <div class="scene-board">${p.objects.map(x=>`<article class="scene-object"><button type="button" class="puzzle-option" data-scene="${esc(x.id)}" aria-expanded="false">${esc(x.label)} <span aria-hidden="true">＋</span></button><p data-scene-detail="${esc(x.id)}" hidden>${esc(x.detail)}</p></article>`).join('')}</div>
      <div class="scene-inventory"><strong>${p.objects.some(x=>x.grants)?'Inventario de campo:':'Pruebas registradas:'}</strong><span id="sceneInventory">Nada todavía</span></div>`;
  }
  return `<label for="answer">Introduce tu respuesta</label><input id="answer" required autocomplete="off" maxlength="100" placeholder="Escribe tu deducción...">`;
}

function caseView(c){
  cleanupKeyHandler();
  const n=count(c), p=c.puzzles[n];
  view.innerHTML=`<section class="section puzzle">
    <a href="#inicio">← Todos los casos</a>
    <p class="eyebrow">EXPEDIENTE ${c.number} / ${c.level.toUpperCase()} · PROTOCOLO 2026</p>
    <h1>${c.title}</h1>
    <p>${c.story}</p>
    <progress max="${c.puzzles.length}" value="${n}"></progress>
    <p>${n} de ${c.puzzles.length} enigmas superados · Nivel de Aura: +${n*5000} ✨</p>
    ${p?`
      <div class="card">
        <span class="tag">ENIGMA ${n+1} · MODO INTERACTIVO</span>
        <h2>${p.question}</h2>
        <div class="clue">${esc(p.clue)}</div>
        <form id="answerForm">
          ${puzzleInteraction(p)}
          <div class="actions">
            <button type="submit" id="verify">${p.type==='match'?'Confirmar conexiones':p.type==='scene'?'Cerrar investigación':p.type==='maze'?'Comprobar llegada':p.type==='hidden'?'Validar hallazgos':'Comprobar deducción'}</button>
            <button type="button" class="secondary" id="hint">Pedir pista de Aura</button>
          </div>
        </form>
        <div class="feedback" id="feedback" role="status"></div>
      </div>`:`
      <div class="card">
        <p class="eyebrow">✓ CASO RESUELTO CON ÉXITO</p>
        <h2>¡Devoraste y no dejaste ni las migajas!</h2>
        <p>Has obtenido +${c.puzzles.length*5000} puntos de Aura resolutiva. El caso ${c.title} queda archivado en la historia.</p>
        <a class="btn" href="#inicio">Volver a la central</a>
      </div>`}
    <h2 class="section">Pistas recuperadas del expediente</h2>
    ${c.puzzles.slice(0,n).map((x,i)=>`
      <div class="card" style="margin-bottom:12px">
        <span class="tag">PISTA ${i+1} · REVELACIÓN</span>
        <p>${x.reveal}</p>
      </div>`).join('')||'<p>Aún no hay pistas recuperadas en este caso.</p>'}
  </section>`;

  if(!p) return;

  const feedback=$('#feedback'), verify=$('#verify');
  let selectedAnswer=null, selectedItems=[], inspected=new Set(), matchedLeft=new Set(), matchedRight=new Set(), selectedLeft=null, inventory=new Set(), sceneComplete=false;
  let mazeComplete=false, hiddenComplete=false, radarComplete=false, lockComplete=false;

  if(['inspect','choice','match','scene','maze','hidden','radar','lock'].includes(p.type)){
    verify.disabled=true;
  }

  $('#hint').onclick=()=>{
    feedback.textContent='💡 Pista de Aura: ' + p.hint;
  };

  /* 1. MAZE INTERACTION */
  if(p.type==='maze'){
    const rawGrid=p.grid.map(row=>row.trim().split(/\s+/));
    const rows=rawGrid.length, cols=rawGrid[0].length;
    let grid=rawGrid.map(row=>[...row]);
    let playerPos={r:0,c:0}, crumbsCollected=0;
    const requiredCrumbs=p.requiredCrumbs||0;

    for(let r=0;r<rows;r++){
      for(let cIdx=0;cIdx<cols;cIdx++){
        if(grid[r][cIdx]==='S'){playerPos={r,c:cIdx};grid[r][cIdx]='.';}
      }
    }

    const mazeBoard=$('#mazeBoard');
    mazeBoard.style.gridTemplateColumns=`repeat(${cols}, 1fr)`;

    function renderMaze(){
      let html='';
      for(let r=0;r<rows;r++){
        for(let cIdx=0;cIdx<cols;cIdx++){
          const isPlayer=r===playerPos.r && cIdx===playerPos.c;
          const val=grid[r][cIdx];
          if(isPlayer){
            html+=`<div class="tile player">${p.playerIcon||'🕵️'}</div>`;
          }else if(val==='#'){
            html+=`<div class="tile wall">🧱</div>`;
          }else if(val==='M'){
            html+=`<div class="tile crumb">🍞</div>`;
          }else if(val==='G'){
            html+=`<div class="tile goal">${p.goalIcon||'🎯'}</div>`;
          }else{
            html+=`<div class="tile path"></div>`;
          }
        }
      }
      mazeBoard.innerHTML=html;
      $('#mazeCrumbs').textContent=crumbsCollected;
    }

    function move(dr,dc){
      if(mazeComplete) return;
      const nr=playerPos.r+dr, nc=playerPos.c+dc;
      if(nr<0||nr>=rows||nc<0||nc>=cols) return;
      if(grid[nr][nc]==='#') return;

      playerPos={r:nr,c:nc};
      if(grid[nr][nc]==='M'){
        grid[nr][nc]='.';
        crumbsCollected++;
        feedback.textContent=`🍞 ¡Recogiste una migaja! (${crumbsCollected}/${requiredCrumbs}) +1000 Aura`;
      }

      if(grid[nr][nc]==='G'){
        if(crumbsCollected>=requiredCrumbs){
          mazeComplete=true;
          verify.disabled=false;
          $('#mazeStatus').textContent='🏆 ¡Llegaste a la meta! Devoraste el laberinto. Pulsa "Comprobar llegada".';
          feedback.textContent='¡Victoria épica! +10,000 Aura.';
        }else{
          feedback.textContent=`⚠️ Te faltan migajas. Recoge ${requiredCrumbs-crumbsCollected} migaja(s) más para completar la misión.`;
        }
      }
      renderMaze();
    }

    renderMaze();

    view.querySelectorAll('[data-dir]').forEach(btn=>{
      btn.onclick=()=>{
        const dir=btn.dataset.dir;
        if(dir==='up') move(-1,0);
        else if(dir==='down') move(1,0);
        else if(dir==='left') move(0,-1);
        else if(dir==='right') move(0,1);
      };
    });

    activeKeyHandler=e=>{
      if(['ArrowUp','KeyW'].includes(e.code)){e.preventDefault();move(-1,0);}
      else if(['ArrowDown','KeyS'].includes(e.code)){e.preventDefault();move(1,0);}
      else if(['ArrowLeft','KeyA'].includes(e.code)){e.preventDefault();move(0,-1);}
      else if(['ArrowRight','KeyD'].includes(e.code)){e.preventDefault();move(0,1);}
    };
    window.addEventListener('keydown',activeKeyHandler);
  }

  /* 2. HIDDEN OBJECTS INTERACTION */
  if(p.type==='hidden'){
    const foundTargets=new Set();
    const countEl=$('#hiddenCount');
    const statusEl=$('#hiddenStatus');

    view.querySelectorAll('[data-spot]').forEach(card=>{
      card.onclick=()=>{
        const spotId=card.dataset.spot;
        const spot=p.spots.find(s=>s.id===spotId);
        if(!spot) return;

        if(spot.finds){
          if(!foundTargets.has(spot.finds)){
            foundTargets.add(spot.finds);
            card.classList.add('found');
            card.innerHTML=`<span class="hidden-card-title">✅ ¡ENCONTRADO!</span><span class="hidden-card-desc">${esc(spot.detail)}</span>`;
            card.disabled=true;

            const targetItem=$(`#target-${spot.finds}`);
            if(targetItem){
              targetItem.classList.add('done');
              targetItem.querySelector('span').textContent='✅';
            }

            countEl.textContent=foundTargets.size;
            statusEl.textContent=spot.detail;

            if(foundTargets.size===p.targets.length){
              hiddenComplete=true;
              verify.disabled=false;
              feedback.textContent='🎉 ¡Encontraste todos los objetos ocultos en la página! No dejaste ni las migajas (+5,000 Aura).';
            }
          }
        }else if(spot.decoy){
          card.classList.add('decoy');
          statusEl.textContent=spot.decoy;
          feedback.textContent=spot.decoy;
        }
      };
    });
  }

  /* 3. RADAR / FREQUENCY TUNER */
  if(p.type==='radar'){
    let currentFreq=92.0;
    const targetFreq=p.targetFreq;
    const freqDisplay=$('#freqDisplay'), slider=$('#freqSlider'), audioText=$('#radioAudioText'), status=$('#radarStatus');
    const bars=[$('#bar1'),$('#bar2'),$('#bar3'),$('#bar4'),$('#bar5')];

    function updateFreq(val){
      currentFreq=Math.round(val*10)/10;
      slider.value=currentFreq;
      freqDisplay.textContent=currentFreq.toFixed(1);

      const diff=Math.abs(currentFreq-targetFreq);
      bars.forEach(b=>b.classList.remove('active'));

      if(diff<0.15){
        bars.forEach(b=>b.classList.add('active'));
        audioText.textContent=p.quotes.locked;
        audioText.style.borderColor='var(--neon-green)';
        status.textContent='¡SEÑAL SINTONIZADA AL 100%! +50,000 Aura asegurada.';
        radarComplete=true;
        verify.disabled=false;
      }else if(diff<0.8){
        bars.slice(0,3).forEach(b=>b.classList.add('active'));
        audioText.textContent=p.quotes.close;
        audioText.style.borderColor='var(--gold)';
        status.textContent='¡Casi lo tienes! El audio se está aclarando.';
        radarComplete=false;
        verify.disabled=true;
      }else{
        bars[0].classList.add('active');
        audioText.textContent=p.quotes.far;
        audioText.style.borderColor='var(--line)';
        status.textContent='Demasiada estática. Sigue ajustando la perilla.';
        radarComplete=false;
        verify.disabled=true;
      }
    }

    slider.oninput=()=>updateFreq(parseFloat(slider.value));
    $('#freqDown').onclick=()=>updateFreq(currentFreq-0.1);
    $('#freqUp').onclick=()=>updateFreq(currentFreq+0.1);
    $('#freqDownFast').onclick=()=>updateFreq(currentFreq-1.0);
    $('#freqUpFast').onclick=()=>updateFreq(currentFreq+1.0);
    updateFreq(92.0);
  }

  /* 4. LOCK / SAFE COMBINATION */
  if(p.type==='lock'){
    const dialsCount=p.dials||4;
    const digits=new Array(dialsCount).fill(0);
    const indicator=$('#lockIndicator');

    function checkLock(){
      const code=digits.join('');
      if(code===String(p.solution)){
        lockComplete=true;
        verify.disabled=false;
        indicator.textContent='🔓 ¡CANDADO DESBLOQUEADO!';
        indicator.classList.add('unlocked');
        feedback.textContent='¡CLIC! Combinación exacta. Abriste la caja con +15,000 de Aura.';
      }else{
        lockComplete=false;
        verify.disabled=true;
        indicator.textContent='🔒 Candado cerrado';
        indicator.classList.remove('unlocked');
      }
    }

    view.querySelectorAll('[data-dial-idx]').forEach(btn=>{
      btn.onclick=()=>{
        const idx=parseInt(btn.dataset.dialIdx,10);
        const dir=parseInt(btn.dataset.dialDir,10);
        digits[idx]=(digits[idx]+dir+10)%10;
        $(`#dialVal${idx}`).textContent=digits[idx];
        checkLock();
      };
    });
  }

  /* 5. INSPECT */
  view.querySelectorAll('[data-inspect]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.inspect;
    if(inspected.has(id)) return;
    inspected.add(id);
    button.setAttribute('aria-expanded','true');
    button.querySelector('span').textContent='−';
    view.querySelectorAll('[data-observation]').forEach(note=>{
      if(note.dataset.observation===id) note.hidden=false;
    });
    $('#inspectionStatus').textContent=`Evidencias examinadas: ${inspected.size} de ${p.evidence.length}`;
    if(inspected.size===p.evidence.length){
      view.querySelectorAll('[data-option]').forEach(opt=>opt.disabled=false);
      feedback.textContent='Examinaste todas las pistas. Elige tu deducción resolutiva.';
    }
  });

  /* 6. CHOICE */
  view.querySelectorAll('[data-option]').forEach(button=>button.onclick=()=>{
    selectedAnswer=button.dataset.option;
    verify.disabled=false;
    view.querySelectorAll('[data-option]').forEach(option=>{
      option.classList.toggle('selected',option===button);
      option.setAttribute('aria-pressed',String(option===button));
    });
  });

  /* 7. MATCH */
  view.querySelectorAll('[data-match-left]').forEach(button=>button.onclick=()=>{
    if(matchedLeft.has(button.dataset.matchLeft)) return;
    selectedLeft=button.dataset.matchLeft;
    view.querySelectorAll('[data-match-left]').forEach(option=>{
      option.classList.toggle('selected',option===button);
      option.setAttribute('aria-pressed',String(option===button));
    });
  });

  view.querySelectorAll('[data-match-right]').forEach(button=>button.onclick=()=>{
    if(selectedLeft===null){feedback.textContent='Primero selecciona un rastro de la izquierda.';return;}
    const rightId=button.dataset.matchRight;
    if(matchedRight.has(rightId)) return;
    if(p.matches[selectedLeft]!==rightId){
      feedback.textContent='Esa correspondencia no encaja. Perdiste -100 de Aura. ¡Intenta de nuevo!';
      selectedLeft=null;
      view.querySelectorAll('[data-match-left]').forEach(option=>{
        option.classList.remove('selected');
        option.setAttribute('aria-pressed','false');
      });
      return;
    }
    matchedLeft.add(selectedLeft);
    matchedRight.add(rightId);
    view.querySelectorAll('[data-match-left],[data-match-right]').forEach(option=>{
      if(matchedLeft.has(option.dataset.matchLeft)||matchedRight.has(option.dataset.matchRight)){
        option.disabled=true;
        option.classList.add('matched');
        option.setAttribute('aria-pressed','true');
      }
    });
    selectedLeft=null;
    feedback.textContent='¡Conexión correcta! +2000 Aura.';
    $('#matchStatus').textContent=`Conexiones correctas: ${matchedLeft.size} de ${Object.keys(p.matches).length}`;
    if(matchedLeft.size===Object.keys(p.matches).length) verify.disabled=false;
  });

  /* 8. SCENE */
  view.querySelectorAll('[data-scene]').forEach(button=>button.onclick=()=>{
    const object=p.objects.find(x=>x.id===button.dataset.scene);
    if(object.requiredItem&&!inventory.has(object.requiredItem)){
      feedback.textContent=object.lockedDetail;
      return;
    }
    if(object.requiredInspections&&!object.requiredInspections.every(id=>inspected.has(id))){
      feedback.textContent=object.lockedDetail;
      return;
    }
    if(inspected.has(object.id)) return;
    inspected.add(object.id);
    button.setAttribute('aria-expanded','true');
    button.querySelector('span').textContent='−';
    view.querySelectorAll('[data-scene-detail]').forEach(detail=>{
      if(detail.dataset.sceneDetail===object.id) detail.hidden=false;
    });
    if(object.grants) inventory.add(object.grants.id);
    $('#sceneInventory').textContent=p.objects.filter(x=>inspected.has(x.id)).map(x=>x.grants?x.grants.label:x.label).join(', ')||'Nada todavía';
    feedback.textContent=object.grants?`Encontraste: ${object.grants.label} (+2000 Aura).`:'Pista registrada en el expediente.';
    if(object.goal){
      sceneComplete=true;
      verify.disabled=false;
      feedback.textContent='¡Objetivo cumplido! Cierra la investigación para registrar tu triunfo.';
    }
  });

  /* 9. SEQUENCE */
  view.querySelectorAll('[data-sequence]').forEach(button=>button.onclick=()=>{
    if(selectedItems.length>=p.items.length||selectedItems.includes(button.dataset.sequence)) return;
    selectedItems.push(button.dataset.sequence);
    button.disabled=true;
    button.setAttribute('aria-pressed','true');
    updateSequence();
  });

  function updateSequence(){
    $('#sequencePreview').innerHTML=selectedItems.map(id=>`<li>${esc(p.items.find(x=>x.id===id).label)}</li>`).join('');
    $('#undoSequence').disabled=selectedItems.length===0;
    $('#clearSequence').disabled=selectedItems.length===0;
    verify.disabled=selectedItems.length!==p.items.length;
  }

  if(p.type==='sequence'){
    $('#undoSequence').onclick=()=>{
      const id=selectedItems.pop();
      view.querySelectorAll('[data-sequence]').forEach(x=>{
        if(x.dataset.sequence===id){x.disabled=false;x.setAttribute('aria-pressed','false');}
      });
      updateSequence();
    };
    $('#clearSequence').onclick=()=>{
      selectedItems=[];
      view.querySelectorAll('[data-sequence]').forEach(x=>{
        x.disabled=false;x.setAttribute('aria-pressed','false');
      });
      updateSequence();
    };
    updateSequence();
  }

  /* SUBMIT VERIFICATION */
  $('#answerForm').onsubmit=async e=>{
    e.preventDefault();
    let valid=false;
    if(p.type==='maze') valid=mazeComplete;
    else if(p.type==='hidden') valid=hiddenComplete;
    else if(p.type==='radar') valid=radarComplete;
    else if(p.type==='lock') valid=lockComplete;
    else if(p.type==='sequence') valid=selectedItems.join('|')===p.solution.join('|');
    else if(p.type==='match') valid=matchedLeft.size===Object.keys(p.matches).length;
    else if(p.type==='scene') valid=sceneComplete;
    else if(p.type==='inspect'||p.type==='choice') valid=selectedAnswer!==null&&p.answers.some(a=>normalize(a)===normalize(selectedAnswer));
    else valid=p.answers.some(a=>normalize(a)===normalize($('#answer').value));

    if(!valid){
      feedback.textContent='⚠️ Deducción incorrecta (-10,000 de Aura). Revisa las evidencias y devora de nuevo.';
      return;
    }

    verify.disabled=true;
    try{
      const record={id:c.id,step:n+1,updated:new Date().toISOString()};
      await put('progress',record);
      state[c.id]=record;
      if(location.hash===`#caso/${c.id}`) caseView(c);
    }catch(err){
      feedback.textContent='No se pudo guardar el progreso: '+err.message;
      verify.disabled=false;
    }
  };
}

function progressView(){
  cleanupKeyHandler();
  view.innerHTML=`<section class="section">
    <p class="eyebrow">REGISTRO DE AGENTE · AURA 2026</p>
    <h1>Mi expediente</h1>
    <p>Tu progreso e insignias se conservan en este dispositivo mediante IndexedDB.</p>
    ${stats()}
    ${cases.map(c=>`<div class="card section">
      <h3>${c.title}</h3>
      <progress value="${count(c)}" max="${c.puzzles.length}"></progress>
      <p>${count(c)===c.puzzles.length?'✨ Caso resuelto · Devoraste al 100%':`${count(c)} de ${c.puzzles.length} pistas recuperadas`}</p>
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
        <textarea id="note" maxlength="500" required placeholder="Describe la evidencia encontrada..."></textarea>
        <div class="actions">
          <button type="button" class="secondary" id="camera">◉ Abrir cámara</button>
          <button type="button" class="secondary" id="geo">◎ Registrar ubicación</button>
        </div>
        <p id="apiStatus" class="feedback" role="status"></p>
        <video id="video" autoplay playsinline muted hidden></video>
        <button type="button" id="snap" hidden>Capturar foto</button>
        <img id="preview" class="photo" hidden alt="Evidencia capturada">
        <p id="coords"></p>
        <button type="submit">Guardar evidencia</button>
      </form>
    </div>
    <h2 class="section">Archivo de campo</h2>
    <div class="grid">${evidence.map(x=>`
      <article class="card">
        ${x.photo?`<img class="photo" src="${esc(x.photo)}" alt="Evidencia">`:''}
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
    const r=await fetch('./data/cases.json');
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

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e=>console.error('Service Worker:',e));
init();
