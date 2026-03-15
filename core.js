// ═══════════════════════════════════════════════════════════════
//  CORE — Project Wagner BI
//  Estado global, fetch, processData, utilitários.
//  NÃO altere este arquivo para adicionar gráficos ou mudar
//  o relatório. Use charts/*.js e report/presentation.js.
// ═══════════════════════════════════════════════════════════════

// ── ESTADO GLOBAL ───────────────────────────────────────────────
window.projectInfo = { nome: 'Project Wagner BI', responsavel: '', instituicao: '' };
window.lastData    = {
  totalPrev: 0, totalReal: 0, avgProg: 0,
  emDia: 0, atrasados: 0, naoIniciados: 0,
  total: 0, concluidas: 0, emAndamento: 0,
  sobreOrcamento: 0, destaque: '', usedPct: 0, varPct: 0, rows: []
};

let _savedUrl          = '';
let _autoRefreshEnabled = true;
let _refreshIntervalSec = 300;
let _refreshTimer       = null;
let _isRefreshing       = false;

// ── UTILITÁRIOS (exportados para uso em outros módulos) ─────────
window.fmoney = v => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

window.parseDate = s => {
  if (!s || s === '—' || s === '-') return null;
  const p = s.split('/');
  if (p.length === 3) return new Date(p[2], p[1] - 1, p[0]);
  const q = s.split('-');
  if (q.length === 3) return new Date(q[0], q[1] - 1, q[2]);
  return new Date(s);
};

window.parseCSV = text => {
  const lines = []; let line = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if      (c === '"' && !inQ)          { inQ = true; }
    else if (c === '"' && inQ && n==='"') { field += '"'; i++; }
    else if (c === '"' && inQ)           { inQ = false; }
    else if (c === ',' && !inQ)          { line.push(field); field = ''; }
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
  t.className   = 'toast';
  t.style.background = colors[type];
  t.innerHTML   = `<i class="fas ${icons[type]}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 3500);
};

// ── CONFIG (localStorage) ────────────────────────────────────────
function getConfig() { try { return JSON.parse(localStorage.getItem('ppbi_v3')) || {}; } catch { return {}; } }
function saveConfig() { localStorage.setItem('ppbi_v3', JSON.stringify({ url: _savedUrl, autoRefresh: _autoRefreshEnabled, interval: _refreshIntervalSec })); }

// ── ONBOARDING ───────────────────────────────────────────────────
window.switchTab = id => {
  document.querySelectorAll('.modal-tab').forEach((t, i) => t.classList.toggle('active', ['tab-connect', 'tab-tutorial', 'tab-estrutura'][i] === id));
  document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(id).classList.add('active');
};

window.validateUrl = val => {
  const w = document.getElementById('urlWrapper');
  const m = document.getElementById('urlValidationMsg');
  const b = document.getElementById('btnConnect');
  if (!val) { w.className = 'url-input-wrapper'; m.innerHTML = ''; b.disabled = true; return; }
  const ok  = val.includes('docs.google.com/spreadsheets') && val.includes('output=csv') && (val.includes('/pub?') || val.includes('pub?'));
  const isGS = val.includes('docs.google.com/spreadsheets');
  if (ok) {
    w.className = 'url-input-wrapper valid'; b.disabled = false;
    m.className = 'url-validation-msg success';
    m.innerHTML = '<i class="fas fa-check-circle"></i> URL válida! Pronto para conectar.';
  } else if (isGS) {
    w.className = 'url-input-wrapper invalid'; b.disabled = true;
    m.className = 'url-validation-msg error';
    m.innerHTML = '<i class="fas fa-exclamation-circle"></i> Use o link de "Publicar na web" com formato CSV.';
  } else if (val.length > 10) {
    w.className = 'url-input-wrapper invalid'; b.disabled = true;
    m.className = 'url-validation-msg error';
    m.innerHTML = '<i class="fas fa-exclamation-circle"></i> Link inválido. Use o link do Google Sheets publicado como CSV.';
  }
};

window.connectAndLoad = () => {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return;
  _savedUrl = url; saveConfig(); closeOnboarding(); fetchData(false); startAutoRefresh();
};

window.useSampleData  = () => { closeOnboarding(); loadSampleData(); showToast('Dados de exemplo carregados!', 'info'); };
window.closeOnboarding = () => document.getElementById('onboarding-overlay').classList.add('hidden');
window.openOnboarding  = () => {
  document.getElementById('urlInput').value = _savedUrl;
  validateUrl(_savedUrl);
  switchTab('tab-connect');
  document.getElementById('onboarding-overlay').classList.remove('hidden');
};

// ── REFRESH ──────────────────────────────────────────────────────
window.toggleAutoRefresh = () => {
  _autoRefreshEnabled = document.getElementById('autoRefreshToggle').checked;
  _autoRefreshEnabled ? startAutoRefresh() : stopAutoRefresh();
  updateDot(_autoRefreshEnabled && !!_savedUrl);
  saveConfig();
};

window.changeInterval = () => {
  _refreshIntervalSec = parseInt(document.getElementById('refreshInterval').value);
  if (_autoRefreshEnabled) startAutoRefresh();
  saveConfig();
};

window.refreshNow = () => fetchData(false);

function startAutoRefresh() {
  stopAutoRefresh();
  if (_autoRefreshEnabled && _savedUrl) _refreshTimer = setInterval(() => fetchData(true), _refreshIntervalSec * 1000);
}
function stopAutoRefresh() {
  if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
}
function updateDot(active) {
  const d = document.getElementById('statusDot');
  d.className = 'pulse-dot' + (active ? '' : ' inactive');
  document.getElementById('refreshStatus').textContent = active ? 'Ao vivo' : _savedUrl ? 'Pausado' : 'Desconectado';
}

// ── FETCH ────────────────────────────────────────────────────────
async function fetchData(silent = false) {
  if (!_savedUrl || _isRefreshing) return;
  _isRefreshing = true;
  document.getElementById('refreshIcon').classList.add('fa-spin');
  try {
    const url = _savedUrl + (_savedUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
    const r   = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const csvText = await r.text();
    extractProjectInfoFromSheet(csvText);
    processData(csvText);
    document.getElementById('lastUpdateText').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR');
    updateDot(_autoRefreshEnabled);
    if (!silent) showToast('Dados atualizados!', 'success');
  } catch (e) {
    updateDot(false);
    document.getElementById('statusDot').style.background = 'var(--danger)';
    document.getElementById('refreshStatus').textContent  = 'Erro';
    if (!silent) showToast('Erro ao buscar dados. Verifique a URL.', 'error');
  } finally {
    _isRefreshing = false;
    document.getElementById('refreshIcon').classList.remove('fa-spin');
  }
}

function extractProjectInfoFromSheet(csv) {
  const rows = parseCSV(csv);
  if (!rows || rows.length < 2) return;
  const ld = rows[1];
  if (!ld || ld.length < 3) return;
  const nome        = ld[0] ? ld[0].trim() : '';
  const responsavel = ld[1] ? ld[1].trim() : '';
  const instituicao = ld[2] ? ld[2].trim() : '';
  if (nome && nome !== 'Nome do Projeto' && nome !== 'nome do projeto') {
    window.projectInfo = {
      nome:        nome        || window.projectInfo.nome,
      responsavel: responsavel || window.projectInfo.responsavel,
      instituicao: instituicao || window.projectInfo.instituicao
    };
    if (window.projectInfo.nome) document.getElementById('projectTitle').textContent = window.projectInfo.nome;
    const partes = [];
    if (window.projectInfo.responsavel) partes.push(window.projectInfo.responsavel);
    if (window.projectInfo.instituicao) partes.push(window.projectInfo.instituicao);
    document.getElementById('projectSubtitle').textContent = partes.length > 0 ? partes.join(' · ') : 'Auto-Refresh · Analytics em tempo real';
  }
}

// ── PROCESS DATA ─────────────────────────────────────────────────
function processData(csv) {
  const rows     = parseCSV(csv);
  const dataRows = rows.slice(1).filter(r => r.length >= 13 && r[3] && r[3].trim() !== '');

  let totalPrev = 0, totalReal = 0, progSum = 0, emAndamento = 0, concluidas = 0;
  let emDia = 0, atrasados = 0, naoIniciados = 0, sobreOrcamento = 0;
  let destaque = { nome: '', prog: 0 };
  let tableHtml = '', actRows = [];

  dataRows.forEach(cols => {
    const id   = cols[3]  || '—';
    const atv  = cols[4]  || '—';
    const resp = cols[5]  || '—';
    const inP  = cols[6]  || '—';
    const fimP = cols[7]  || '—';
    const inR  = cols[8]  || '—';
    const fimR = cols[9]  || '—';
    const cP   = parseFloat((cols[10] || '0').replace(',', '.')) || 0;
    const cR   = parseFloat((cols[11] || '0').replace(',', '.')) || 0;
    const prog = Math.min(100, Math.max(0, parseInt(cols[12]) || 0));

    totalPrev += cP; totalReal += cR;
    if (cR > cP) sobreOrcamento++;
    if (prog > 0 && prog < 100) { progSum += prog; emAndamento++; }
    if (prog === 100) concluidas++;
    if (prog > destaque.prog) destaque = { nome: atv, prog };

    let sc = '', st = '', si = '';
    if (prog === 0) {
      naoIniciados++; sc = 'status-nao-iniciado'; st = 'Não iniciado'; si = 'fa-hourglass-start';
    } else if (prog === 100) {
      emDia++; sc = 'status-concluido'; st = 'Concluído'; si = 'fa-check-circle';
    } else {
      const df = parseDate(fimP);
      if (df && new Date() > df) { atrasados++; sc = 'status-atrasado';  st = 'Atrasado'; si = 'fa-exclamation-circle'; }
      else                       { emDia++;     sc = 'status-em-dia';    st = 'Em dia';   si = 'fa-clock'; }
    }

    actRows.push({ id, atv, resp, inP, fimP, inR, fimR, cP, cR, prog, st });
    tableHtml += `<tr>
      <td><strong style="color:var(--gray-600)">${id}</strong></td>
      <td><strong>${atv}</strong></td>
      <td>${resp}</td>
      <td>${inP}</td><td>${fimP}</td><td>${inR}</td><td>${fimR}</td>
      <td>${fmoney(cP)}</td>
      <td class="${cR > cP ? 'over-budget' : ''}">${fmoney(cR)}</td>
      <td><div class="progress-bar"><div class="progress-track"><div class="progress-fill" style="width:${prog}%"></div></div><span style="font-size:12px;font-weight:600;min-width:28px">${prog}%</span></div></td>
      <td><span class="status-badge ${sc}"><i class="fas ${si}"></i> ${st}</span></td>
    </tr>`;
  });

  document.getElementById('tableBody').innerHTML = tableHtml || `<tr><td colspan="11"><div class="empty-state"><i class="fas fa-inbox"></i><h3>Nenhuma atividade</h3><p>Verifique se os dados começam na linha 2</p></div></td></tr>`;

  const avg     = emAndamento > 0 ? Math.round(progSum / emAndamento) : 0;
  const varPct  = totalPrev > 0 ? ((totalReal - totalPrev) / totalPrev * 100).toFixed(1) : 0;
  const usedPct = totalPrev > 0 ? ((totalReal / totalPrev) * 100).toFixed(1) : 0;

  // Atualiza KPIs no DOM
  document.getElementById('totalPrevisto').textContent = fmoney(totalPrev);
  document.getElementById('totalReal').textContent     = fmoney(totalReal);
  document.getElementById('avgProgress').textContent   = avg + '%';
  document.getElementById('totalAtividades').textContent = dataRows.length;
  document.getElementById('atividadesConcluidas').innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> Concluídas: ${concluidas}`;
  document.getElementById('projetosAtivos').innerHTML       = `<i class="fas fa-play-circle" style="color:var(--info)"></i> Em andamento: ${emAndamento}`;
  document.getElementById('variacaoOrcamento').innerHTML    = `<i class="fas fa-arrow-${varPct > 0 ? 'up' : 'down'}" style="color:${varPct > 0 ? 'var(--danger)' : 'var(--success)'}"></i> ${Math.abs(varPct)}% ${varPct > 0 ? 'acima do orçamento' : 'dentro do orçamento'}`;

  // Insights
  document.getElementById('riscosText').textContent     = `${sobreOrcamento} acima do orçamento • ${atrasados} atrasados`;
  document.getElementById('destaqueText').textContent   = destaque.nome ? `${destaque.nome} — ${destaque.prog}% concluído` : '—';
  document.getElementById('performanceText').textContent = `${(100 - parseFloat(usedPct)).toFixed(1)}% do orçamento disponível`;
  document.getElementById('urlDisplay').textContent     = _savedUrl ? _savedUrl.substring(0, 36) + '...' : 'Conectar Planilha';

  // Salva estado global
  window.lastData = {
    totalPrev, totalReal, avgProg: avg,
    emDia, atrasados, naoIniciados,
    total: dataRows.length, concluidas, emAndamento, sobreOrcamento,
    destaque: destaque.nome, usedPct, varPct, rows: actRows
  };

  // Renderiza todos os gráficos registrados
  ChartRegistry.renderAll(window.lastData);
}

// ── EXPORTAR CSV ─────────────────────────────────────────────────
window.exportToCSV = () => {
  const rows = document.getElementById('projectTable').querySelectorAll('tr');
  const csv  = Array.from(rows)
    .map(r => Array.from(r.querySelectorAll('td,th')).map(c => '"' + c.innerText.replace(/"/g, '""') + '"').join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `project-wagner-bi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  showToast('Arquivo exportado!', 'success');
};

// ── DADOS DE EXEMPLO ─────────────────────────────────────────────
function loadSampleData() {
  window.projectInfo = { nome: 'Sistema de Gestão Municipal', responsavel: 'Ana Lima', instituicao: 'Prefeitura de Belo Horizonte' };
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
  document.getElementById('lastUpdateText').textContent = 'Dados de exemplo · ' + new Date().toLocaleTimeString('pt-BR');
  document.getElementById('urlDisplay').textContent     = 'Dados de exemplo';
  updateDot(false);
}

// ── INICIALIZAÇÃO ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const c = getConfig();
  if (c.url) {
    _savedUrl           = c.url;
    _autoRefreshEnabled = c.autoRefresh !== false;
    _refreshIntervalSec = c.interval || 300;
    document.getElementById('autoRefreshToggle').checked = _autoRefreshEnabled;
    document.getElementById('refreshInterval').value     = _refreshIntervalSec;
    closeOnboarding();
    fetchData(true);
    startAutoRefresh();
  }
});
