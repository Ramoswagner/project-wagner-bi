// ═══════════════════════════════════════════════════════════════
//  CORE — Project Wagner BI  (v2)
//  O que mudou vs v1:
//    - parseDateStr robusta (DD/MM/YYYY, YYYY-MM-DD, fallback)
//    - countUp() para animação dos KPIs
//    - Earned Value: ev, cpi, eac calculados em processData
//    - calcHealthScore / renderHealthScore (ring SVG)
//    - respMap agrupado por responsável → exposto em lastData
//    - terminoTexto / terminoSubTexto projetado
//    - localStorage key: ppbi_v4
//  NÃO altere para adicionar gráficos. Use charts/*.js.
// ═══════════════════════════════════════════════════════════════

// ── ESTADO GLOBAL ───────────────────────────────────────────────
window.projectInfo = { nome: 'Project Wagner BI', responsavel: '', instituicao: '' };
window.lastData = {
  totalPrev: 0, totalReal: 0, avgProg: 0,
  emDia: 0, atrasados: 0, naoIniciados: 0,
  total: 0, concluidas: 0, emAndamento: 0,
  sobreOrcamento: 0, destaque: '', usedPct: 0, varPct: 0,
  rows: [], respMap: {},
  ev: 0, cpi: 0, eac: 0,
  healthScore: 0, terminoTexto: '—', terminoSubTexto: ''
};

let _savedUrl           = '';
let _autoRefreshEnabled = true;
let _refreshIntervalSec = 300;
let _refreshTimer       = null;
let _isRefreshing       = false;

// ── UTILITÁRIOS ──────────────────────────────────────────────────
window.fmoney = v =>
  'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

window.parseDateStr = s => {
  if (!s || s === '—' || s === '-' || s.trim() === '' || s === 'undefined') return null;
  const p = s.trim().split('/');
  if (p.length === 3 && p[2].length === 4)
    return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  const q = s.trim().split('-');
  if (q.length === 3) return new Date(q[0], q[1] - 1, q[2]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
};
window.parseDate = window.parseDateStr; // alias backward-compat

window.parseCSV = text => {
  const lines = []; let line = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if      (c === '"' && !inQ)             { inQ = true; }
    else if (c === '"' && inQ && n === '"') { field += '"'; i++; }
    else if (c === '"' && inQ)              { inQ = false; }
    else if (c === ',' && !inQ)             { line.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !inQ) {
      if (c === '\r' && n === '\n') i++;
      if (field || line.length) { line.push(field); lines.push(line); }
      line = []; field = '';
    }
    else { field += c; }
  }
  if (field || line.length) { line.push(field); lines.push(line); }
  return lines;
};

window.showToast = (msg, type = 'success') => {
  const colors = { success: '#27AE60', error: '#E74C3C', info: '#0B1E33', warning: '#F39C12' };
  const icons  = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const t = document.createElement('div');
  t.className = 'toast'; t.style.background = colors[type];
  t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideOutRight 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3500);
};

// ── COUNT-UP ─────────────────────────────────────────────────────
window.countUp = (el, endVal, duration = 900, formatter) => {
  if (!el) return;
  const t0 = performance.now();
  el.classList.add('animating');
  (function step(now) {
    const p    = Math.min((now - t0) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = formatter ? formatter(Math.floor(ease * endVal)) : Math.floor(ease * endVal);
    if (p < 1) requestAnimationFrame(step);
    else { el.textContent = formatter ? formatter(endVal) : endVal; el.classList.remove('animating'); }
  })(t0);
};

// ── HEALTH SCORE ─────────────────────────────────────────────────
window.calcHealthScore = d => {
  if (!d.total) return 0;
  const budgetScore   = Math.max(0, 100 - Math.abs(parseFloat(d.varPct || 0)) * 2);
  const scheduleScore = d.total > 0 ? (d.emDia / d.total) * 100 : 100;
  const progressScore = d.avgProg || 0;
  return Math.round(budgetScore * 0.4 + scheduleScore * 0.4 + progressScore * 0.2);
};

window.renderHealthScore = score => {
  const fillEl   = document.getElementById('healthRingFill');
  const valEl    = document.getElementById('healthScoreVal');
  const statusEl = document.getElementById('healthStatus');
  if (!fillEl || !valEl || !statusEl) return;
  const circ      = 2 * Math.PI * 60;
  const color     = score >= 70 ? '#27AE60' : score >= 40 ? '#F39C12' : '#E74C3C';
  const statusTxt = score >= 70 ? '✓ Ótimo'  : score >= 40 ? '⚠ Atenção' : '✕ Crítico';
  const statusBg  = score >= 70 ? '#E8F5E9'  : score >= 40 ? '#FFF8E1'   : '#FFEBEE';
  const statusCol = score >= 70 ? '#2E7D32'  : score >= 40 ? '#E65100'   : '#C62828';
  fillEl.style.stroke = color;
  fillEl.style.strokeDasharray = circ;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fillEl.style.strokeDashoffset = circ - (score / 100) * circ;
  }));
  let cur = 0;
  const t = setInterval(() => {
    cur = Math.min(cur + 2, score);
    valEl.textContent = cur; valEl.style.color = color;
    if (cur >= score) clearInterval(t);
  }, 18);
  statusEl.textContent = statusTxt;
  statusEl.style.background = statusBg;
  statusEl.style.color = statusCol;
};

// ── CONFIG ────────────────────────────────────────────────────────
function getConfig()  { try { return JSON.parse(localStorage.getItem('ppbi_v4')) || {}; } catch { return {}; } }
function saveConfig() { localStorage.setItem('ppbi_v4', JSON.stringify({ url: _savedUrl, autoRefresh: _autoRefreshEnabled, interval: _refreshIntervalSec })); }

// ── ONBOARDING ────────────────────────────────────────────────────
window.switchTab = id => {
  document.querySelectorAll('.modal-tab').forEach((t, i) =>
    t.classList.toggle('active', ['tab-connect','tab-tutorial','tab-estrutura'][i] === id));
  document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(id).classList.add('active');
};
window.validateUrl = val => {
  const w = document.getElementById('urlWrapper'), m = document.getElementById('urlValidationMsg'), b = document.getElementById('btnConnect');
  if (!val) { w.className = 'url-input-wrapper'; m.innerHTML = ''; b.disabled = true; return; }
  const ok   = val.includes('docs.google.com/spreadsheets') && val.includes('output=csv') && (val.includes('/pub?') || val.includes('pub?'));
  const isGS = val.includes('docs.google.com/spreadsheets');
  if (ok)        { w.className = 'url-input-wrapper valid';   b.disabled = false; m.className = 'url-validation-msg success'; m.innerHTML = '<i class="fas fa-check-circle"></i> URL válida!'; }
  else if (isGS) { w.className = 'url-input-wrapper invalid'; b.disabled = true;  m.className = 'url-validation-msg error';   m.innerHTML = '<i class="fas fa-exclamation-circle"></i> Use o link de "Publicar na web" com formato CSV.'; }
  else if (val.length > 10) { w.className = 'url-input-wrapper invalid'; b.disabled = true; m.className = 'url-validation-msg error'; m.innerHTML = '<i class="fas fa-exclamation-circle"></i> Link inválido.'; }
};
window.connectAndLoad  = () => { const url = document.getElementById('urlInput').value.trim(); if (!url) return; _savedUrl = url; saveConfig(); closeOnboarding(); fetchData(false); startAutoRefresh(); };
window.useSampleData   = () => { closeOnboarding(); loadSampleData(); showToast('Dados de exemplo carregados!','info'); };
window.closeOnboarding = () => document.getElementById('onboarding-overlay').classList.add('hidden');
window.openOnboarding  = () => { document.getElementById('urlInput').value = _savedUrl; validateUrl(_savedUrl); switchTab('tab-connect'); document.getElementById('onboarding-overlay').classList.remove('hidden'); };

// ── REFRESH ───────────────────────────────────────────────────────
window.toggleAutoRefresh = () => { _autoRefreshEnabled = document.getElementById('autoRefreshToggle').checked; _autoRefreshEnabled ? startAutoRefresh() : stopAutoRefresh(); updateDot(_autoRefreshEnabled && !!_savedUrl); saveConfig(); };
window.changeInterval    = () => { _refreshIntervalSec = parseInt(document.getElementById('refreshInterval').value); if (_autoRefreshEnabled) startAutoRefresh(); saveConfig(); };
window.refreshNow        = () => fetchData(false);
function startAutoRefresh() { stopAutoRefresh(); if (_autoRefreshEnabled && _savedUrl) _refreshTimer = setInterval(() => fetchData(true), _refreshIntervalSec * 1000); }
function stopAutoRefresh()  { if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; } }
function updateDot(active)  {
  const d = document.getElementById('statusDot'); if (!d) return;
  d.className = 'pulse-dot' + (active ? '' : ' inactive');
  document.getElementById('refreshStatus').textContent = active ? 'Ao vivo' : _savedUrl ? 'Pausado' : 'Desconectado';
}

// ── FETCH ─────────────────────────────────────────────────────────
async function fetchData(silent = false) {
  if (!_savedUrl || _isRefreshing) return;
  _isRefreshing = true;
  document.getElementById('refreshIcon').classList.add('fa-spin');
  try {
    const r = await fetch(_savedUrl + (_savedUrl.includes('?') ? '&' : '?') + '_t=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const csv = await r.text();
    extractProjectInfo(csv);
    processData(csv);
    document.getElementById('lastUpdateText').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR');
    updateDot(_autoRefreshEnabled);
    if (!silent) showToast('Dados atualizados!', 'success');
  } catch (e) {
    updateDot(false);
    const dot = document.getElementById('statusDot'); if (dot) dot.style.background = 'var(--danger)';
    document.getElementById('refreshStatus').textContent = 'Erro';
    if (!silent) showToast('Erro ao buscar dados. Verifique a URL.', 'error');
  } finally {
    _isRefreshing = false;
    document.getElementById('refreshIcon').classList.remove('fa-spin');
  }
}

function extractProjectInfo(csv) {
  const rows = parseCSV(csv); if (!rows || rows.length < 2) return;
  const linha = rows[1]; if (!linha || linha.length < 3) return;
  const nome = (linha[0]||'').trim(), responsavel = (linha[1]||'').trim(), instituicao = (linha[2]||'').trim();
  if (nome && nome !== 'Nome do Projeto') {
    window.projectInfo = { nome: nome||window.projectInfo.nome, responsavel, instituicao };
    if (window.projectInfo.nome) document.getElementById('projectTitle').textContent = window.projectInfo.nome;
    const partes = []; if (responsavel) partes.push(responsavel); if (instituicao) partes.push(instituicao);
    document.getElementById('projectSubtitle').textContent = partes.length > 0 ? partes.join(' · ') : 'Auto-Refresh · Analytics em tempo real';
  }
}

// ── PROCESS DATA ──────────────────────────────────────────────────
function processData(csv) {
  const rows     = parseCSV(csv);
  const dataRows = rows.slice(1).filter(r => r.length >= 13 && r[3] && r[3].trim() !== '');
  let totalPrev = 0, totalReal = 0, ev = 0, progSum = 0, emAndamento = 0, concluidas = 0;
  let emDia = 0, atrasados = 0, naoIniciados = 0, sobreOrcamento = 0;
  let destaque = { nome: '', prog: 0 };
  let tableHtml = '', actRows = [];
  const respMap = {};

  dataRows.forEach(cols => {
    const id   = cols[3]||'—', atv  = cols[4]||'—', resp = cols[5]||'—';
    const inP  = cols[6]||'—', fimP = cols[7]||'—', inR  = cols[8]||'—', fimR = cols[9]||'—';
    const cP   = parseFloat((cols[10]||'0').replace(',','.'))||0;
    const cR   = parseFloat((cols[11]||'0').replace(',','.'))||0;
    const prog = Math.min(100, Math.max(0, parseInt(cols[12])||0));
    totalPrev += cP; totalReal += cR; ev += cP * (prog/100);
    if (cR > cP) sobreOrcamento++;
    if (prog > 0 && prog < 100) { progSum += prog; emAndamento++; }
    if (prog === 100) concluidas++;
    if (prog > destaque.prog) destaque = { nome: atv, prog };
    if (!respMap[resp]) respMap[resp] = { sum: 0, count: 0 };
    respMap[resp].sum += prog; respMap[resp].count++;
    let sc = '', st = '', si = '';
    if (prog === 0)   { naoIniciados++; sc='status-nao-iniciado'; st='Não iniciado'; si='fa-hourglass-start'; }
    else if (prog === 100) { emDia++;  sc='status-concluido';     st='Concluído';    si='fa-check-circle'; }
    else { const df = parseDateStr(fimP); if (df && new Date()>df) { atrasados++; sc='status-atrasado';  st='Atrasado'; si='fa-exclamation-circle'; } else { emDia++; sc='status-em-dia'; st='Em dia'; si='fa-clock'; } }
    actRows.push({id,atv,resp,inP,fimP,inR,fimR,cP,cR,prog,st});
    tableHtml += `<tr><td><strong style="color:var(--gray-600)">${id}</strong></td><td><strong>${atv}</strong></td><td>${resp}</td><td>${inP}</td><td>${fimP}</td><td>${inR}</td><td>${fimR}</td><td>${fmoney(cP)}</td><td class="${cR>cP?'over-budget':''}">${fmoney(cR)}</td><td><div class="progress-bar"><div class="progress-track"><div class="progress-fill" style="width:${prog}%"></div></div><span style="font-size:12px;font-weight:600;min-width:28px">${prog}%</span></div></td><td><span class="status-badge ${sc}"><i class="fas ${si}"></i> ${st}</span></td></tr>`;
  });

  document.getElementById('tableBody').innerHTML = tableHtml || `<tr><td colspan="11"><div class="empty-state"><i class="fas fa-inbox"></i><h3>Nenhuma atividade</h3><p>Verifique se os dados começam na linha 2</p></div></td></tr>`;

  const avg     = emAndamento > 0 ? Math.round(progSum/emAndamento) : 0;
  const varPct  = totalPrev > 0 ? parseFloat(((totalReal-totalPrev)/totalPrev*100).toFixed(1)) : 0;
  const usedPct = totalPrev > 0 ? parseFloat(((totalReal/totalPrev)*100).toFixed(1)) : 0;
  const cpi     = totalReal > 0 ? parseFloat((ev/totalReal).toFixed(2)) : 0;
  const eac     = cpi > 0 ? parseFloat((totalPrev/cpi).toFixed(0)) : totalPrev;

  // Término projetado
  let terminoTexto = '—', terminoSubTexto = '';
  if (actRows.length > 0 && avg > 0 && emAndamento > 0) {
    const datas = actRows.map(r => parseDateStr(r.fimP)).filter(Boolean);
    if (datas.length > 0) {
      const ultimaData = new Date(Math.max(...datas.map(d => d.getTime())));
      const restante   = 100 - avg;
      if (restante > 0) {
        const dias      = Math.round((restante/avg)*30);
        const projetado = new Date(Date.now() + dias*864e5);
        terminoTexto    = projetado.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
        const diff      = Math.round((projetado - ultimaData)/864e5);
        terminoSubTexto = diff > 0 ? `${diff} dias além do planejado` : diff < 0 ? `${Math.abs(diff)} dias antes` : 'Dentro do prazo';
      }
    }
  }

  const healthScore = calcHealthScore({ total: dataRows.length, varPct, emDia, avgProg: avg });

  // DOM — KPIs com count-up
  countUp(document.getElementById('totalPrevisto'),  totalPrev, 900, v => 'R$ '+v.toLocaleString('pt-BR'));
  countUp(document.getElementById('totalReal'),       totalReal, 900, v => 'R$ '+v.toLocaleString('pt-BR'));
  countUp(document.getElementById('avgProgress'),     avg,       700, v => v+'%');
  countUp(document.getElementById('totalAtividades'), dataRows.length, 500);
  document.getElementById('atividadesConcluidas').innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> Concluídas: ${concluidas}`;
  document.getElementById('projetosAtivos').innerHTML       = `<i class="fas fa-play-circle" style="color:var(--info)"></i> Em andamento: ${emAndamento}`;
  document.getElementById('variacaoOrcamento').innerHTML    = `<i class="fas fa-arrow-${varPct>0?'up':'down'}" style="color:${varPct>0?'var(--danger)':'var(--success)'}"></i> ${Math.abs(varPct)}% ${varPct>0?'acima do orçamento':'dentro do orçamento'}`;

  // DOM — CPI / EAC / Término
  const cpiEl = document.getElementById('cpiVal');
  if (cpiEl) { cpiEl.textContent = cpi>0?cpi.toFixed(2):'—'; cpiEl.style.color = cpi>=1?'var(--success)':cpi>=0.8?'var(--warning)':'var(--danger)'; }
  const cpiSub = document.getElementById('cpiSub');
  if (cpiSub) cpiSub.textContent = cpi>=1?'Dentro do orçamento ✓':cpi>=0.8?'Leve desvio ⚠':'Acima do orçamento ✕';
  const eacEl = document.getElementById('eacVal');
  if (eacEl) { eacEl.textContent = eac>0?fmoney(Math.round(eac)):'—'; eacEl.style.color = eac<=totalPrev?'var(--success)':'var(--danger)'; }
  const eacSub = document.getElementById('eacSub');
  if (eacSub) eacSub.textContent = eac>totalPrev?`R$ ${Math.round(eac-totalPrev).toLocaleString('pt-BR')} acima do previsto`:'Dentro do orçamento';
  const tEl = document.getElementById('terminoProjetado'); if (tEl) tEl.textContent = terminoTexto;
  const tSub = document.getElementById('terminoSub');      if (tSub) tSub.textContent = terminoSubTexto||'Com base no ritmo atual';

  // Badge por responsável
  const rb = document.getElementById('respBadge');
  if (rb) { const n=Object.keys(respMap).length; rb.textContent=`${n} pessoa${n!==1?'s':''}`; }

  // Badge de risco
  const riskB = document.getElementById('riskBadge');
  if (riskB) {
    const n = actRows.filter(r => r.st === 'Atrasado' || r.cR > r.cP).length;
    riskB.textContent = n > 0 ? `${n} crítica${n !== 1 ? 's' : ''}` : 'Sem riscos';
    riskB.style.background = n > 0 ? 'rgba(198,40,40,0.12)' : '';
    riskB.style.color      = n > 0 ? '#C62828' : '';
  }

  // Insights
  const sg = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  sg('percentualGasto',   usedPct+'% utilizado');
  sg('totalStatus',       `${dataRows.length} atividades`);
  sg('riscosText',        `${sobreOrcamento} acima do orçamento • ${atrasados} atrasados`);
  sg('destaqueText',      destaque.nome?`${destaque.nome} — ${destaque.prog}% concluído`:'—');
  sg('performanceText',   `${(100-parseFloat(usedPct)).toFixed(1)}% do orçamento disponível`);
  sg('urlDisplay',        _savedUrl?_savedUrl.substring(0,36)+'...':'Conectar Planilha');

  // Health Score ring
  renderHealthScore(healthScore);

  // Salva estado global
  window.lastData = { totalPrev, totalReal, avgProg:avg, emDia, atrasados, naoIniciados, total:dataRows.length, concluidas, emAndamento, sobreOrcamento, destaque:destaque.nome, usedPct, varPct, rows:actRows, respMap, ev, cpi, eac, healthScore, terminoTexto, terminoSubTexto };

  // Dispara todos os gráficos
  ChartRegistry.renderAll(window.lastData);
}

// ── EXPORTAR CSV ──────────────────────────────────────────────────
window.exportToCSV = () => {
  const rows = document.getElementById('projectTable').querySelectorAll('tr');
  const csv  = Array.from(rows).map(r => Array.from(r.querySelectorAll('td,th')).map(c => '"'+c.innerText.replace(/"/g,'""')+'"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download = `project-wagner-bi-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('Arquivo exportado!','success');
};

// ── DADOS DE EXEMPLO ──────────────────────────────────────────────
function loadSampleData() {
  window.projectInfo = { nome:'Sistema de Gestão Municipal', responsavel:'Wagner Ramos', instituicao:'Prefeitura de Belo Horizonte' };
  document.getElementById('projectTitle').textContent    = window.projectInfo.nome;
  document.getElementById('projectSubtitle').textContent = `${window.projectInfo.responsavel} · ${window.projectInfo.instituicao}`;
  processData(`ID,Atividade,Responsável,Início Prev.,Término Prev.,Início Real,Término Real,Custo Prev.,Custo Real,Progresso
1,Levantamento de Requisitos,Ana Lima,01/03/2025,15/03/2025,01/03/2025,14/03/2025,5000,4800,100
2,Prototipagem UI,Carlos Mota,16/03/2025,31/03/2025,16/03/2025,,8000,7200,80
3,Desenvolvimento Backend,Fernanda Rocha,01/04/2025,30/04/2025,02/04/2025,,20000,18500,60
4,Desenvolvimento Frontend,Rafael Costa,01/04/2025,30/04/2025,01/04/2025,,15000,16200,55
5,Integração de APIs,Ana Lima,01/05/2025,20/05/2025,,,12000,0,0
6,Testes e QA,Pedro Alves,21/05/2025,10/06/2025,,,8000,0,0
7,Deploy em Produção,Carlos Mota,11/06/2025,20/06/2025,,,5000,0,0
8,Treinamento,Fernanda Rocha,21/06/2025,30/06/2025,,,3000,0,0`);
  document.getElementById('lastUpdateText').textContent = 'Exemplo · '+new Date().toLocaleTimeString('pt-BR');
  document.getElementById('urlDisplay').textContent     = 'Dados de exemplo';
  updateDot(false);
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const c = getConfig();
  if (c.url) {
    _savedUrl = c.url; _autoRefreshEnabled = c.autoRefresh!==false; _refreshIntervalSec = c.interval||300;
    document.getElementById('autoRefreshToggle').checked = _autoRefreshEnabled;
    document.getElementById('refreshInterval').value     = _refreshIntervalSec;
    closeOnboarding(); fetchData(true); startAutoRefresh();
  }
});
