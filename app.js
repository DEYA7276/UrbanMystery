'use strict';
const $=s=>document.querySelector(s), view=$('#view');let db,cases=[],state={},evidence=[],stream=null,installEvent,routeVersion=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!?¿¡]/g,'');
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('UrbanMystery',1);r.onupgradeneeded=()=>{r.result.createObjectStore('progress',{keyPath:'id'});r.result.createObjectStore('evidence',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function transaction(store,mode,action){return new Promise((resolve,reject)=>{const t=db.transaction(store,mode),r=action(t.objectStore(store));t.oncomplete=()=>resolve(r.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
const all=s=>transaction(s,'readonly',o=>o.getAll()),put=(s,v)=>transaction(s,'readwrite',o=>o.put(v)),del=(s,id)=>transaction(s,'readwrite',o=>o.delete(id));
const count=c=>state[c.id]?.step||0, solved=()=>cases.reduce((n,c)=>n+count(c),0),total=()=>cases.reduce((n,c)=>n+c.puzzles.length,0);
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
function connection(){$('#connection').textContent=navigator.onLine?'● En línea':'● Modo sin conexión';}window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#install').hidden=false;});$('#install').onclick=async()=>{if(installEvent){await installEvent.prompt();await installEvent.userChoice;installEvent=null;$('#install').hidden=true;}};window.addEventListener('appinstalled',()=>{$('#install').hidden=true;installEvent=null;});
function stats(){return `<div class="stats"><div class="card stat"><strong>${cases.filter(c=>count(c)===c.puzzles.length).length}/${cases.length}</strong><p>Casos resueltos</p></div><div class="card stat"><strong>${solved()}/${total()}</strong><p>Enigmas superados</p></div><div class="card stat"><strong>${solved()*100}</strong><p>Puntos de agente</p></div></div>`;}
function home(){view.innerHTML=`<section class="hero"><p class="eyebrow">ACCESO AUTORIZADO · MISIÓN ACTIVA</p><h1>La verdad está<br>entre las <span class="gold">pistas.</span></h1><p>${cases.length} expedientes. ${total()} enigmas. Una oportunidad para demostrar tu instinto de investigador.</p><a class="btn" href="#caso/${(cases.find(c=>count(c)<c.puzzles.length)||cases[0]).id}">Continuar investigación →</a></section>${stats()}<section class="section"><p class="eyebrow">ARCHIVO CENTRAL</p><h2>Expedientes disponibles</h2><div class="grid">${cases.map(c=>`<article class="card case"><div class="art">${c.symbol}</div><div class="content"><span class="tag">CASO ${c.number} · ${c.level}</span><h3>${c.title}</h3><p>${c.story}</p><progress max="${c.puzzles.length}" value="${count(c)}"></progress><p>${count(c)} de ${c.puzzles.length} pistas</p><a class="btn secondary" href="#caso/${c.id}">${count(c)===c.puzzles.length?'Revisar expediente':'Abrir expediente'} →</a></div></article>`).join('')}</div></section>`;}
function puzzleInteraction(p){
 if(p.type==='sequence')return `<p class="interaction-prompt">Toca las evidencias en el orden correcto. Puedes deshacer y volver a empezar.</p><div class="puzzle-options">${p.items.map(x=>`<button type="button" class="puzzle-option" data-sequence="${esc(x.id)}" aria-pressed="false">${esc(x.label)}</button>`).join('')}</div><ol id="sequencePreview" class="sequence-preview" aria-live="polite"></ol><div class="actions"><button type="button" class="secondary" id="undoSequence" disabled>Deshacer último</button><button type="button" class="secondary" id="clearSequence" disabled>Reiniciar orden</button></div>`;
 if(p.type==='inspect')return `<p class="interaction-prompt">Abre cada evidencia para examinarla. Luego elige tu conclusión.</p><div class="evidence-board">${p.evidence.map(x=>`<article class="evidence-item"><button type="button" class="puzzle-option" data-inspect="${esc(x.id)}" aria-expanded="false">${esc(x.title)} <span aria-hidden="true">＋</span></button><p data-observation="${esc(x.id)}" hidden>${esc(x.detail)}</p></article>`).join('')}</div><p id="inspectionStatus" class="interaction-prompt" aria-live="polite">Evidencias examinadas: 0 de ${p.evidence.length}</p><div class="puzzle-options">${p.options.map(x=>`<button type="button" class="puzzle-option answer-option" data-option="${esc(x.value)}" disabled aria-pressed="false">${esc(x.label)}</button>`).join('')}</div>`;
 if(p.type==='choice')return `<p class="interaction-prompt">Elige la conclusión que mejor encaja con las pistas.</p><div class="puzzle-options">${p.options.map(x=>`<button type="button" class="puzzle-option answer-option" data-option="${esc(x.value)}" aria-pressed="false">${esc(x.label)}</button>`).join('')}</div>`;
 if(p.type==='match')return `<p class="interaction-prompt">Selecciona un rastro y luego la prueba que corresponde. Completa todas las conexiones.</p><div class="match-board"><section><h3>Rastros</h3><div class="match-column">${p.leftItems.map(x=>`<button type="button" class="puzzle-option" data-match-left="${esc(x.id)}" aria-pressed="false">${esc(x.label)}</button>`).join('')}</div></section><section><h3>Correspondencias</h3><div class="match-column">${p.rightItems.map(x=>`<button type="button" class="puzzle-option" data-match-right="${esc(x.id)}" aria-pressed="false">${esc(x.label)}</button>`).join('')}</div></section></div><p id="matchStatus" class="interaction-prompt" aria-live="polite">Conexiones correctas: 0 de ${Object.keys(p.matches).length}</p>`;
 if(p.type==='scene')return `<p class="interaction-prompt">Explora el lugar. Algunos objetos esconden otros; vuelve a los que estaban cerrados.</p><div class="scene-board">${p.objects.map(x=>`<article class="scene-object"><button type="button" class="puzzle-option" data-scene="${esc(x.id)}" aria-expanded="false">${esc(x.label)} <span aria-hidden="true">＋</span></button><p data-scene-detail="${esc(x.id)}" hidden>${esc(x.detail)}</p></article>`).join('')}</div><div class="scene-inventory"><strong>${p.objects.some(x=>x.grants)?'Lo que encontraste:':'Pruebas registradas:'}</strong><span id="sceneInventory">Nada todavía</span></div>`;
 return `<label for="answer">Introduce tu respuesta</label><input id="answer" required autocomplete="off" maxlength="100" placeholder="Escribe tu respuesta...">`;
}
function caseView(c){
 const n=count(c),p=c.puzzles[n];
 view.innerHTML=`<section class="section puzzle"><a href="#inicio">← Todos los casos</a><p class="eyebrow">EXPEDIENTE ${c.number} / ${c.level.toUpperCase()}</p><h1>${c.title}</h1><p>${c.story}</p><progress max="${c.puzzles.length}" value="${n}"></progress><p>${n} de ${c.puzzles.length} enigmas superados</p>${p?`<div class="card"><span class="tag">ENIGMA ${n+1}</span><h2>${p.question}</h2><div class="clue">${esc(p.clue)}</div><form id="answerForm">${puzzleInteraction(p)}<div class="actions"><button type="submit" id="verify">${p.type==='match'?'Confirmar conexiones':p.type==='scene'?'Cerrar investigación':'Comprobar deducción'}</button><button type="button" class="secondary" id="hint">Pedir pista</button></div></form><div class="feedback" id="feedback" role="status"></div></div>`:`<div class="card"><p class="eyebrow">✓ CASO CERRADO</p><h2>Misterio resuelto</h2><p>Has obtenido ${c.puzzles.length*100} puntos.</p><a class="btn" href="#inicio">Volver a la central</a></div>`}<h2 class="section">Pistas recuperadas</h2>${c.puzzles.slice(0,n).map((x,i)=>`<div class="card"><span class="tag">PISTA ${i+1}</span><p>${x.reveal}</p></div>`).join('')||'<p>Aún no hay pistas recuperadas.</p>'}</section>`;
 if(!p)return;
 let selectedAnswer=null,selectedItems=[],inspected=new Set(),matchedLeft=new Set(),matchedRight=new Set(),selectedLeft=null,inventory=new Set(),sceneComplete=false;
 const feedback=$('#feedback'),verify=$('#verify');
 if(['inspect','choice','match','scene'].includes(p.type))verify.disabled=true;
 $('#hint').onclick=()=>{feedback.textContent=p.hint;};
 view.querySelectorAll('[data-inspect]').forEach(button=>button.onclick=()=>{
  const id=button.dataset.inspect;
  if(inspected.has(id))return;
  inspected.add(id);button.setAttribute('aria-expanded','true');button.querySelector('span').textContent='−';
  view.querySelectorAll('[data-observation]').forEach(note=>{if(note.dataset.observation===id)note.hidden=false;});
  $('#inspectionStatus').textContent=`Evidencias examinadas: ${inspected.size} de ${p.evidence.length}`;
  if(inspected.size===p.evidence.length)view.querySelectorAll('[data-option]').forEach(option=>option.disabled=false);
 });
 view.querySelectorAll('[data-option]').forEach(button=>button.onclick=()=>{
  selectedAnswer=button.dataset.option;verify.disabled=false;
  view.querySelectorAll('[data-option]').forEach(option=>{option.classList.toggle('selected',option===button);option.setAttribute('aria-pressed',String(option===button));});
 });
 view.querySelectorAll('[data-match-left]').forEach(button=>button.onclick=()=>{
  if(matchedLeft.has(button.dataset.matchLeft))return;
  selectedLeft=button.dataset.matchLeft;
  view.querySelectorAll('[data-match-left]').forEach(option=>{option.classList.toggle('selected',option===button);option.setAttribute('aria-pressed',String(option===button));});
 });
 view.querySelectorAll('[data-match-right]').forEach(button=>button.onclick=()=>{
  if(selectedLeft===null){feedback.textContent='Primero selecciona un rastro.';return;}
  const rightId=button.dataset.matchRight;
  if(matchedRight.has(rightId))return;
  if(p.matches[selectedLeft]!==rightId){
   feedback.textContent='Esa conexión no coincide. Prueba con otra correspondencia.';
   selectedLeft=null;view.querySelectorAll('[data-match-left]').forEach(option=>{option.classList.remove('selected');option.setAttribute('aria-pressed','false');});return;
  }
  matchedLeft.add(selectedLeft);matchedRight.add(rightId);
  view.querySelectorAll('[data-match-left],[data-match-right]').forEach(option=>{
   if(matchedLeft.has(option.dataset.matchLeft)||matchedRight.has(option.dataset.matchRight)){option.disabled=true;option.classList.add('matched');option.setAttribute('aria-pressed','true');}
  });
  selectedLeft=null;feedback.textContent='Conexión correcta.';
  $('#matchStatus').textContent=`Conexiones correctas: ${matchedLeft.size} de ${Object.keys(p.matches).length}`;
  if(matchedLeft.size===Object.keys(p.matches).length)verify.disabled=false;
 });
 view.querySelectorAll('[data-scene]').forEach(button=>button.onclick=()=>{
  const object=p.objects.find(x=>x.id===button.dataset.scene);
  if(object.requiredItem&&!inventory.has(object.requiredItem)){feedback.textContent=object.lockedDetail;return;}
  if(object.requiredInspections&&!object.requiredInspections.every(id=>inspected.has(id))){feedback.textContent=object.lockedDetail;return;}
  if(inspected.has(object.id))return;
  inspected.add(object.id);button.setAttribute('aria-expanded','true');button.querySelector('span').textContent='−';
  view.querySelectorAll('[data-scene-detail]').forEach(detail=>{if(detail.dataset.sceneDetail===object.id)detail.hidden=false;});
  if(object.grants)inventory.add(object.grants.id);
  $('#sceneInventory').textContent=p.objects.filter(x=>inspected.has(x.id)).map(x=>x.grants?x.grants.label:x.label).join(', ')||'Nada todavía';
  feedback.textContent=object.grants?`Encontraste: ${object.grants.label}.`:'Pista registrada.';
  if(object.goal){sceneComplete=true;verify.disabled=false;feedback.textContent='Encontraste el objetivo. Cierra la investigación para guardar el caso.';}
 });
 view.querySelectorAll('[data-sequence]').forEach(button=>button.onclick=()=>{
  if(selectedItems.length>=p.items.length||selectedItems.includes(button.dataset.sequence))return;
  selectedItems.push(button.dataset.sequence);button.disabled=true;button.setAttribute('aria-pressed','true');updateSequence();
 });
 function updateSequence(){
  $('#sequencePreview').innerHTML=selectedItems.map(id=>`<li>${esc(p.items.find(x=>x.id===id).label)}</li>`).join('');
  $('#undoSequence').disabled=selectedItems.length===0;$('#clearSequence').disabled=selectedItems.length===0;
  verify.disabled=selectedItems.length!==p.items.length;
 }
 if(p.type==='sequence'){
  $('#undoSequence').onclick=()=>{const id=selectedItems.pop();const button=view.querySelectorAll('[data-sequence]');button.forEach(x=>{if(x.dataset.sequence===id){x.disabled=false;x.setAttribute('aria-pressed','false');}});updateSequence();};
  $('#clearSequence').onclick=()=>{selectedItems=[];view.querySelectorAll('[data-sequence]').forEach(x=>{x.disabled=false;x.setAttribute('aria-pressed','false');});updateSequence();};
  updateSequence();
 }
 $('#answerForm').onsubmit=async e=>{
  e.preventDefault();
  let valid=false;
  if(p.type==='sequence')valid=selectedItems.join('|')===p.solution.join('|');
  else if(p.type==='match')valid=matchedLeft.size===Object.keys(p.matches).length;
  else if(p.type==='scene')valid=sceneComplete;
  else if(p.type==='inspect'||p.type==='choice')valid=selectedAnswer!==null&&p.answers.some(answer=>normalize(answer)===normalize(selectedAnswer));
  else valid=p.answers.some(answer=>normalize(answer)===normalize($('#answer').value));
  if(!valid){feedback.textContent='Esa conclusión no coincide. Vuelve a revisar las pistas.';return;}
  verify.disabled=true;
  try{const record={id:c.id,step:n+1,updated:new Date().toISOString()};await put('progress',record);state[c.id]=record;if(location.hash===`#caso/${c.id}`)caseView(c);}
  catch(err){feedback.textContent='No se pudo guardar el progreso: '+err.message;verify.disabled=false;}
 };
}
function progressView(){view.innerHTML=`<section class="section"><p class="eyebrow">REGISTRO PERSONAL</p><h1>Mi expediente</h1><p>Tu progreso se conserva en este dispositivo mediante IndexedDB.</p>${stats()}${cases.map(c=>`<div class="card section"><h3>${c.title}</h3><progress value="${count(c)}" max="${c.puzzles.length}"></progress><p>${count(c)===c.puzzles.length?'Caso cerrado':`${count(c)} pistas recuperadas`}</p><a href="#caso/${c.id}">Consultar expediente →</a></div>`).join('')}<button class="secondary" id="reset">Reiniciar progreso</button></section>`;$('#reset').onclick=async()=>{if(!confirm('¿Reiniciar todos los casos? Las evidencias se conservarán.'))return;await transaction('progress','readwrite',o=>o.clear());state={};progressView();};}
function evidenceView(){const version=routeVersion;view.innerHTML=`<section class="section"><p class="eyebrow">LABORATORIO DE CAMPO</p><h1>Mis evidencias</h1><p>Registra una pista real de tu entorno. La foto y las coordenadas se guardan únicamente en este dispositivo. No se requieren para resolver los casos.</p><div class="card"><form id="evidenceForm"><label for="note">Descripción de la pista</label><textarea id="note" maxlength="500" required placeholder="Describe tu hallazgo..."></textarea><div class="actions"><button type="button" class="secondary" id="camera">◉ Abrir cámara</button><button type="button" class="secondary" id="geo">◎ Registrar ubicación</button></div><p id="apiStatus" class="feedback" role="status"></p><video id="video" autoplay playsinline muted hidden></video><button type="button" id="snap" hidden>Capturar foto</button><img id="preview" class="photo" hidden alt="Evidencia capturada"><p id="coords"></p><button type="submit">Guardar evidencia</button></form></div><h2 class="section">Archivo de campo</h2><div class="grid">${evidence.map(x=>`<article class="card">${x.photo?`<img class="photo" src="${esc(x.photo)}" alt="Evidencia">`:''}<p class="tag">${esc(new Date(x.date).toLocaleString('es-MX'))}</p><p>${esc(x.note)}</p>${x.coords?`<p>Lat. ${x.coords.lat.toFixed(5)} · Lon. ${x.coords.lon.toFixed(5)}</p>`:''}<button class="secondary" data-delete="${esc(x.id)}">Eliminar</button></article>`).join('')||'<p>No hay evidencias registradas.</p>'}</div></section>`;let photo=null,coords=null;const status=$('#apiStatus');$('#camera').onclick=async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Cámara no disponible; utiliza HTTPS o localhost.');stopCamera();const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(version!==routeVersion){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;$('#video').srcObject=stream;$('#video').hidden=false;$('#snap').hidden=false;status.textContent='Cámara activa.';}catch(e){status.textContent='No se pudo abrir la cámara: '+e.message;}};$('#snap').onclick=()=>{const v=$('#video');if(!v.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=Math.min(v.videoWidth,960);canvas.height=Math.round(v.videoHeight*canvas.width/v.videoWidth);canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);photo=canvas.toDataURL('image/jpeg',.8);$('#preview').src=photo;$('#preview').hidden=false;v.hidden=true;$('#snap').hidden=true;stopCamera();status.textContent='Fotografía capturada.';};$('#geo').onclick=()=>{if(!navigator.geolocation){status.textContent='Geolocalización no disponible.';return;}status.textContent='Solicitando ubicación…';navigator.geolocation.getCurrentPosition(p=>{if(version!==routeVersion)return;coords={lat:p.coords.latitude,lon:p.coords.longitude};$('#coords').textContent=`Latitud ${coords.lat.toFixed(5)} · Longitud ${coords.lon.toFixed(5)}`;status.textContent='Ubicación obtenida.';},e=>{status.textContent='No se obtuvo ubicación: '+e.message;},{timeout:15000,maximumAge:0});};$('#evidenceForm').onsubmit=async e=>{e.preventDefault();try{const x={id:crypto.randomUUID(),note:$('#note').value.trim(),date:new Date().toISOString(),photo,coords};if(!x.note)return;await put('evidence',x);evidence.unshift(x);render();}catch(err){status.textContent='Error al guardar: '+err.message;}};view.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{await del('evidence',b.dataset.delete);evidence=evidence.filter(x=>x.id!==b.dataset.delete);render();});}
function render(){routeVersion++;stopCamera();const route=location.hash.slice(1)||'inicio';document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash===`#${route}`||a.hash==='#inicio'&&route.startsWith('caso/')));if(route==='evidencias')evidenceView();else if(route==='progreso')progressView();else if(route.startsWith('caso/')){const c=cases.find(x=>x.id===route.split('/')[1]);c?caseView(c):home();}else home();window.scrollTo(0,0);}
async function init(){try{db=await openDB();const r=await fetch('./data/cases.json');if(!r.ok)throw Error('No se pudieron cargar los casos');cases=await r.json();state=Object.fromEntries((await all('progress')).map(x=>[x.id,x]));evidence=(await all('evidence')).sort((a,b)=>b.date.localeCompare(a.date));window.addEventListener('hashchange',render);render();}catch(e){view.textContent='No se pudo iniciar la aplicación. Abre el proyecto mediante un servidor local o HTTPS. '+e.message;}}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(e=>console.error('Service Worker:',e));init();
