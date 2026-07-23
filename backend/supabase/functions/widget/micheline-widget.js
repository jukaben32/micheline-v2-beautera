(function(){
  try{
    var doc=new DOMParser().parseFromString(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Widget Micheline Nail Bar</title>
<style>
  /* ===== Estilos del widget (autónomo, no choca con tu landing) ===== */
  #micheline-widget * { box-sizing: border-box; font-family: 'IBM Plex Mono', ui-monospace, monospace; }
  #micheline-widget {
    position: fixed; right: 20px; bottom: 20px; z-index: 99999;
    --accent: #d4a3a3; --accent-dark: #b07d7d; --ink: #2b2323; --bg: #fffaf8;
  }
  #mw-toggle {
    width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
    color: #fff; font-size: 26px; box-shadow: 0 8px 24px rgba(176,125,125,.5);
    transition: transform .2s;
  }
  #mw-toggle:hover { transform: scale(1.08); }
  #mw-panel {
    position: absolute; bottom: 76px; right: 0; width: 360px; max-width: 92vw;
    background: var(--bg); border-radius: 18px; overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,.25); display: none; flex-direction: column;
    max-height: 78vh;
  }
  #mw-panel.open { display: flex; }
  #mw-header {
    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
    color: #fff; padding: 16px; text-align: center;
  }
  #mw-header h3 { margin: 0; font-size: 16px; letter-spacing: .5px; }
  #mw-header p { margin: 4px 0 0; font-size: 11px; opacity: .85; }
  #mw-tabs { display: flex; border-bottom: 1px solid #eee; }
  #mw-tabs button {
    flex: 1; padding: 10px; border: none; background: #fff; cursor: pointer;
    font-size: 12px; color: var(--ink); border-bottom: 2px solid transparent;
  }
  #mw-tabs button.active { border-bottom-color: var(--accent); font-weight: bold; }
  #mw-body { padding: 14px; overflow-y: auto; flex: 1; }
  .mw-view { display: none; }
  .mw-view.active { display: block; }

  /* Reserva */
  .mw-label { font-size: 11px; color: #888; margin: 10px 0 4px; }
  .mw-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .mw-chip {
    padding: 7px 11px; border: 1px solid #e0d4d4; border-radius: 20px; cursor: pointer;
    font-size: 12px; background: #fff; color: var(--ink); transition: .15s;
  }
  .mw-chip:hover { border-color: var(--accent); }
  .mw-chip.sel { background: var(--accent); color: #fff; border-color: var(--accent); }
  .mw-chip small { opacity: .7; }
  select, input {
    width: 100%; padding: 9px; border: 1px solid #e0d4d4; border-radius: 10px;
    font-size: 13px; margin-top: 4px; background: #fff; color: var(--ink);
  }
  .mw-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 6px; }
  .mw-slot {
    padding: 8px 0; text-align: center; border: 1px solid #e0d4d4; border-radius: 8px;
    font-size: 12px; cursor: pointer; background: #fff;
  }
  .mw-slot:hover { border-color: var(--accent); }
  .mw-slot.sel { background: var(--accent); color: #fff; }
  .mw-slot.empty { color: #ccc; cursor: default; border-style: dashed; }
  .mw-btn {
    width: 100%; margin-top: 14px; padding: 12px; border: none; border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent-dark));
    color: #fff; font-size: 14px; cursor: pointer; font-weight: bold;
  }
  .mw-btn:disabled { opacity: .5; cursor: default; }
  .mw-msg { font-size: 12px; padding: 10px; border-radius: 10px; margin-top: 10px; }
  .mw-ok { background: #e7f6ec; color: #1c7a3f; }
  .mw-err { background: #fdeaea; color: #b32626; }

  /* Chat */
  #mw-chat { display: flex; flex-direction: column; height: 320px; }
  #mw-messages { flex: 1; overflow-y: auto; padding: 4px; }
  .mw-bubble { max-width: 85%; padding: 8px 11px; border-radius: 12px; font-size: 12.5px; margin: 5px 0; line-height: 1.4; white-space: pre-wrap; }
  .mw-bot { background: #f3ecec; color: var(--ink); align-self: flex-start; border-bottom-left-radius: 2px; }
  .mw-user { background: var(--accent); color: #fff; align-self: flex-end; border-bottom-right-radius: 2px; }
  #mw-input { display: flex; gap: 6px; margin-top: 8px; }
  #mw-input input { margin: 0; }
  #mw-input button {
    padding: 0 14px; border: none; border-radius: 10px; background: var(--accent-dark);
    color: #fff; cursor: pointer; font-size: 13px;
  }
  #mw-voice { background: #141413 !important; }
  #mw-voice.recording { background: #ff4444 !important; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
  .mw-thinking { font-style: italic; opacity: .6; font-size: 12px; }
</style>
</head>
<body>
<!-- ===== MARCA DE MONTAJE DEL WIDGET =====
     Pega este bloque justo antes de </body> en tu index.html.
     Luego añade: <script src="https://kpszlnymywgudutqlgqa.supabase.co/storage/v1/object/public/widget/micheline-widget.js"></script> -->
<div id="micheline-widget">
  <div id="mw-panel">
    <div id="mw-header">
      <h3>Micheline Nail Bar</h3>
      <p>Reserva tu momento de belleza 💅</p>
    </div>
    <div id="mw-tabs">
      <button data-tab="book" class="active">📅 Reservar</button>
      <button data-tab="info">💬 Info</button>
    </div>
    <div id="mw-body">
      <!-- VISTA RESERVAR -->
      <div class="mw-view active" id="view-book">
        <div class="mw-label">1. Servicio</div>
        <div class="mw-row" id="mw-services"></div>
        <div class="mw-label">2. Estilista</div>
        <div class="mw-row" id="mw-stylists"></div>
        <div class="mw-label">3. Fecha</div>
        <input type="date" id="mw-date" />
        <div class="mw-label">4. Horario disponible</div>
        <div class="mw-slots" id="mw-slots"></div>
        <button class="mw-btn" id="mw-confirm" disabled>Confirmar reserva</button>
        <div id="mw-result"></div>
      </div>
      <!-- VISTA INFO/CHAT -->
      <div class="mw-view" id="view-info">
        <div id="mw-chat">
          <div id="mw-messages">
            <div class="mw-bubble mw-bot">¡Hola! Soy la asistente de Micheline 💅 Pregúntame por precios, servicios, estilistas u horarios.</div>
          </div>
          <div id="mw-input">
            <input type="text" id="mw-text" placeholder="Escribe tu mensaje..." />
            <button id="mw-voice" onmousedown="startVoiceW()" onmouseup="stopVoiceW()" ontouchstart="startVoiceW()" ontouchend="stopVoiceW()">🎤</button>
            <button id="mw-send">➤</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <button id="mw-toggle">💅</button>
</div>

<script>
(function () {
  'use strict';

  // ===== CONFIG =====
  const SUPABASE_URL = 'https://kpszlnymywgudutqlgqa.supabase.co';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwc3psbnlteXdndWR1dHFsZ3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDgwMTksImV4cCI6MjA5ODkyNDAxOX0.zljEdqznFgdUNRKpib3h1_SzamrQRI3h0iIULTgEFdY';

  // ===== GLOBAL STATE =====
  const state = {
    service: null,
    stylist: null,
    date: null,
    time: null,
    client: { name: '', phone: '', email: '' },
    history: [],
    isRecording: false,
    voiceRecorder: null,
    // UI state
    activeTab: 'book',
    ui: {
      services: [],
      stylists: [],
    }
  };

  // ===== UTILS =====
  function emitError(container, msg) {
    const el = document.createElement('div');
    el.className = 'mw-msg mw-err';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function showLoading(messagesContainer) {
    const loader = document.createElement('div');
    loader.className = 'mw-bubble mw-bot mw-thinking';
    const texts = ['Procesando tu solicitud...', 'Buscando disponibilidad…', 'Generando respuesta...', 'Casi listo...'];
    let idx = 0;
    loader.textContent = texts[idx];
    messagesContainer.appendChild(loader);
    const pulse = setInterval(() => {
      loader.textContent = texts[idx = (idx + 1) % texts.length];
    }, 1000);
    setTimeout(() => {
      clearInterval(pulse);
      loader.remove();
    }, 2000);
    return { removeLoader: () => clearInterval(pulse) };
  }

  // ===== SUPABASE HELPERS =====
  async function fetchSupabase(path, options = {}) {
    const url = `${SUPABASE_URL}${path}`;
    const headers = {
      'apikey': ANON,
      'Authorization': 'Bearer ' + ANON,
      'Content-Type': 'application/json',
      ...options.headers
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ===== SERVICES & STYLISTS =====
  async function loadData() {
    try {
      const [servicios, estilistas] = await Promise.all([
        fetchSupabase('/rest/v1/services?select=id,name,price,duration_min&is_active=eq.true&order=price'),
        fetchSupabase('/rest/v1/stylists?select=id,full_name,specialty&is_active=eq.true'),
      ]);
      state.ui.services = servicios;
      state.ui.stylists = estilistas;
      renderServices();
      renderStylists();
      setDateToday();
    } catch (e) {
      console.error('loadData error', e);
      emitError(document.getElementById('mw-result'), 'No se pudo cargar la información');
    }
  }

  function renderServices() {
    const box = document.getElementById('mw-services');
    clearElement(box);
    state.ui.services.forEach(s => {
      const chip = document.createElement('div');
      chip.className = 'mw-chip';
      chip.innerHTML = `${s.name}<br><small>$${s.price}</small>`;
      chip.onclick = () => selectService(s, chip, box);
      box.appendChild(chip);
    });
  }

  function selectService(service, chipEl, box) {
    document.querySelectorAll('#mw-services .mw-chip').forEach(c => c.classList.remove('sel'));
    chipEl.classList.add('sel');
    state.service = service;
    clearSlots();
  }

  function renderStylists() {
    const box = document.getElementById('mw-stylists');
    clearElement(box);
    // Any stylist option
    const any = document.createElement('div');
    any.className = 'mw-chip';
    any.textContent = 'Cualquiera disponible';
    any.onclick = () => selectStylist(null, any, box);
    box.appendChild(any);
    state.ui.stylists.forEach(e => {
      const chip = document.createElement('div');
      chip.className = 'mw-chip';
      chip.textContent = e.full_name;
      chip.onclick = () => selectStylist(e, chip, box);
      box.appendChild(chip);
    });
  }

  function selectStylist(stylist, chipEl, box) {
    document.querySelectorAll('#mw-stylists .mw-chip').forEach(c => c.classList.remove('sel'));
    chipEl.classList.add('sel');
    state.stylist = stylist;
    clearSlots();
  }

  function setDateToday() {
    const d = document.getElementById('mw-date');
    const today = new Date().toISOString().split('T')[0];
    d.min = today;
    d.value = state.date || today;
    if (!state.date) state.date = d.value;
    d.onchange = () => {
      state.date = d.value;
      state.time = null;
      loadSlots();
    };
  }

  // ===== SLOTS =====
  async function loadSlots() {
    const box = document.getElementById('mw-slots');
    clearElement(box);
    if (!state.stylist || !state.date) {
      box.innerHTML = '<div class="mw-slot empty">Elige estilista y fecha</div>';
      return;
    }
    try {
      const { slots } = await fetchSupabase('/functions/v1/get-availability', {
        method: 'POST',
        body: JSON.stringify({ stylist_id: state.stylist.id, date: state.date })
      });
      if (!slots || slots.length === 0) {
        box.innerHTML = '<div class="mw-slot empty">Sin huecos</div>';
        return;
      }
      slots.forEach(t => {
        const s = document.createElement('div');
        s.className = 'mw-slot';
        s.textContent = t;
        s.onclick = () => selectSlot(t, s, box);
        box.appendChild(s);
      });
    } catch (e) {
      console.error('loadSlots error', e);
      clearElement(box);
      box.innerHTML = '<div class="mw-slot empty">Error cargando horarios</div>';
    }
  }

  function selectSlot(time, slotEl, box) {
    document.querySelectorAll('#mw-slots .mw-slot').forEach(s => s.classList.remove('sel'));
    slotEl.classList.add('sel');
    state.time = time;
    updateConfirm();
  }

  function clearSlots() {
    document.getElementById('mw-slots').innerHTML = '<div class="mw-slot empty">Elige estilista y fecha</div>';
    state.time = null;
    updateConfirm();
  }

  function updateConfirm() {
    const btn = document.getElementById('mw-confirm');
    const ready = state.service && state.stylist && state.date && state.time;
    btn.disabled = !ready;
    btn.textContent = ready ? 'Confirmar reserva' : 'Selecciona todos los campos';
  }

  // ===== CHAT =====
  const messagesContainer = document.getElementById('mw-messages');
  const inputText = document.getElementById('mw-text');

  async function sendMessage() {
    const text = inputText.value.trim();
    if (!text) return;

    // Render user bubble
    appendBubble(text, 'user');
    inputText.value = '';

    // Show typing indicator
    const loader = showLoading(messagesContainer);

    try {
      const { reply } = await fetchSupabase('/functions/v1/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, history: state.history })
      });

      // Remove loader
      document.querySelector('.mw-thinking')?.remove();

      // Render bot response
      appendBubble(reply, 'bot');

      // Update history
      state.history.push(
        { role: 'user', content: text },
        { role: 'assistant', content: reply }
      );
    } catch (e) {
      console.error('Chat error', e);
      document.querySelector('.mw-thinking')?.remove();
      emitError(messagesContainer, 'Error en el chat: ' + e.message);
    }
  }

  function appendBubble(text, who) {
    const bubble = document.createElement('div');
    bubble.className = `mw-bubble ${who === 'user' ? 'mw-user' : 'mw-bot'}`;
    bubble.textContent = text;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ===== VOICE =====
  function initVoice() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      state.voiceRecorder = new SR();
      state.voiceRecorder.lang = 'es-ES';
      state.voiceRecorder.continuous = false;
      state.voiceRecorder.interimResults = false;

      state.voiceRecorder.onresult = e => {
        inputText.value = e.results[0][0].transcript;
        sendMessage();
        stopRecording();
      };
      state.voiceRecorder.onerror = e => {
        console.error('Voz error', e);
        stopRecording();
        alert('Error en reconocimiento de voz');
      };
      state.voiceRecorder.onend = () => stopRecording();
    }
  }

  function toggleRecording() {
    if (!state.voiceRecorder) return alert('Tu navegador no soporta reconocimiento de voz');

    if (state.isRecording) {
      // Paused (explicit stop)
      state.voiceRecorder.stop();
    } else {
      // Start
      state.isRecording = true;
      document.getElementById('mw-voice').classList.add('recording');
      try {
        state.voiceRecorder.start();
      } catch (e) {
        console.error('Start error', e);
        stopRecording();
      }
    }
  }

  function stopRecording() {
    if (state.isRecording) {
      state.voiceRecorder?.stop();
      state.isRecording = false;
      document.getElementById('mw-voice').classList.remove('recording');
    }
  }

  // ===== BOOKING =====
  document.getElementById('mw-confirm').onclick = async () => {
    const name = prompt('Tu nombre:');
    if (!name) return;
    const phone = prompt('Tu teléfono (whatsapp):');
    if (!phone) return;
    const email = prompt('Tu email (opcional, para confirmación):') || '';

    state.client = { name, phone, email };

    if (!state.service || !state.stylist) {
      emitError(document.getElementById('mw-result'), 'Selecciona servicio y estilista');
      return;
    }

    const resultBox = document.getElementById('mw-result');
    clearElement(resultBox);

    try {
      const { appointment_id } = await fetchSupabase('/functions/v1/create-booking', {
        method: 'POST',
        body: JSON.stringify({
          stylist_id: state.stylist.id,
          service_id: state.service.id,
          date: state.date,
          time: state.time,
          client_name: name,
          client_phone: phone,
          client_email: email
        })
      });

      // Payment step
      const methodPrompt = `¿Cómo pagas?
1 = Tarjeta (CardNET)
2 = Transferencia bancaria
Escribe 1 o 2:`;
      const method = prompt(methodPrompt);
      if (!method) return;

      if (method === '1' || /tarj/i.test(method)) {
        const { pay_url, error } = await fetchSupabase('/functions/v1/create-payment', {
          method: 'POST',
          body: JSON.stringify({
            appointment_id,
            method: 'cardnet',
            client_name: name,
            client_email: email
          })
        });
        if (pay_url) {
          appendResult('💳 Redirigiendo a pagar con tarjeta…');
          setTimeout(() => window.open(pay_url, '_blank'), 400);
        } else {
          emitError(resultBox, '❌ ' + (error || 'No se pudo generar pago con tarjeta'));
        }
      } else if (method === '2' || /trans/i.test(method)) {
        const { bank, error } = await fetchSupabase('/functions/v1/create-payment', {
          method: 'POST',
          body: JSON.stringify({
            appointment_id,
            method: 'transferencia',
            client_name: name,
            client_email: email
          })
        });
        if (bank) {
          appendResult(`🏦 Transfiere a:<br><b>${bank.bank}</b><br>` +
                        `Titular: ${bank.holder}<br>Cuenta: ${bank.account}<br>` +
                        `Envía el comprobante por WhatsApp y te confirmamos 💅`);
        } else {
          emitError(resultBox, '❌ ' + (error || 'No se pudo obtener datos de transferencia'));
        }
      } else {
        appendResult('✅ Reserva registrada. Te confirmaremos pronto 💅');
      }

      // WhatsApp notification
      const waUrl = `https://wa.me/18096277471?text=${encodeURIComponent(
        `Nueva reserva: ${name} ${state.date} ${state.time}`
      )}`;
      setTimeout(() => window.open(waUrl, '_blank'), 600);

    } catch (e) {
      console.error('Booking error', e);
      emitError(resultBox, '❌ ' + e.message);
    }
  };

  function appendResult(html) {
    const box = document.getElementById('mw-result');
    const div = document.createElement('div');
    div.className = 'mw-msg mw-ok';
    div.innerHTML = html;
    box.appendChild(div);
  }

  // ===== TABS =====
  document.querySelectorAll('#mw-tabs button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#mw-tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.mw-view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + btn.dataset.tab).classList.add('active');
      state.activeTab = btn.dataset.tab;
    };
  });

  // ===== INITIALIZATION =====
  (function init() {
    // toggle panel
    const panel = document.getElementById('mw-panel');
    document.getElementById('mw-toggle').onclick = () => panel.classList.toggle('open');

    // bind chat actions
    document.getElementById('mw-send').onclick = sendMessage;
    inputText.onkeydown = e => { if (e.key === 'Enter') sendMessage(); };

    // voice (mousedown/up for desktop, touch for mobile)
    const voiceBtn = document.getElementById('mw-voice');
    voiceBtn.onmousedown = () => toggleRecording();
    voiceBtn.onmouseup = () => stopRecording();
    voiceBtn.ontouchstart = e => { e.preventDefault(); toggleRecording(); };
    voiceBtn.ontouchend = e => { e.preventDefault(); stopRecording(); };

    // start
    initVoice();
    loadData();
  })();
})();
</script>
</body>
</html>
`,'text/html');
    var widget=doc.getElementById('micheline-widget');
    if(!widget){console.error('Micheline widget: no encontrado');return;}
    document.body.appendChild(document.importNode(widget,true));
    var sc=doc.querySelector('#micheline-widget script');
    if(sc){var n=document.createElement('script');n.textContent=sc.textContent;document.body.appendChild(n);}
  }catch(e){console.error('Micheline widget error:',e);}
})();
