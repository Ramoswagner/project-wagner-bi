// ═══════════════════════════════════════════════════════════════
//  MÓDULO: Gantt (Planejado vs Real) — estilo MS Project
//  Cabeçalho duplo:
//    Linha 1 — Meses (span proporcional)
//    Linha 2 — Dias da semana: Seg Ter Qua Qui Sex Sáb Dom
//  Linha de Hoje: posicionada pelo dia exato (meia-noite)
//  Escala: cada dia ocupa a mesma largura (pixels por dia)
//  Slots: #ganttInner + #tableBodyGantt
// ═══════════════════════════════════════════════════════════════
(function () {

  const LABEL_W  = 200;    // px — largura da coluna de labels
  const PX_DAY   = 28;     // px — largura de cada dia
  const ROW_H    = 52;     // px — altura de cada linha de atividade
  const HDR_H1   = 26;     // px — altura header linha 1 (meses)
  const HDR_H2   = 22;     // px — altura header linha 2 (dias)

  const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const DIAS_ABBR = ['D','S','T','Q','Q','S','S']; // 1 char p/ dias muito estreitos

  // Normaliza data para meia-noite local
  function midnight(d) {
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    return n;
  }

  // Dias entre duas datas (inteiros)
  function daysBetween(a, b) {
    return Math.round((midnight(b) - midnight(a)) / 864e5);
  }

  ChartRegistry.register({
    id: 'gantt',
    canvasId: 'ganttInner',

    render(data) {
      renderGantt(data.rows || []);
      renderGanttTable(data.rows || []);
    },

    destroy() {}
  });

  // ── GANTT PRINCIPAL ──────────────────────────────────────────
  function renderGantt(rows) {
    const container = document.getElementById('ganttInner');
    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML = '<div class="gantt-empty"><i class="fas fa-inbox" style="font-size:32px;color:var(--gray-300);display:block;margin-bottom:10px"></i>Nenhuma atividade para exibir</div>';
      return;
    }

    // ── Coleta datas extremas ─────────────────────────────────
    let minD = null, maxD = null;
    rows.forEach(r => {
      [r.inP, r.fimP, r.inR, r.fimR].forEach(ds => {
        const d = window.parseDateStr(ds);
        if (!d) return;
        if (!minD || d < minD) minD = new Date(d);
        if (!maxD || d > maxD) maxD = new Date(d);
      });
    });

    if (!minD) {
      container.innerHTML = '<div class="gantt-empty">Sem datas nas atividades. Verifique as colunas G–J da planilha.</div>';
      return;
    }

    // Ancora minD na segunda-feira da semana anterior
    minD = midnight(minD);
    while (minD.getDay() !== 1) minD = new Date(minD.getTime() - 864e5); // recua até seg
    minD = new Date(minD.getTime() - 7 * 864e5); // mais 1 semana de margem

    maxD = midnight(maxD);
    maxD = new Date(maxD.getTime() + 14 * 864e5); // + 2 semanas de margem

    const totalDays = daysBetween(minD, maxD);
    const today     = midnight(new Date());

    // Converte data → pixels a partir de LABEL_W
    const toX = d => daysBetween(minD, midnight(d)) * PX_DAY;
    const todayX = toX(today);
    const totalW  = LABEL_W + totalDays * PX_DAY;

    // ── LINHA 1: MESES ─────────────────────────────────────────
    let monthHtml = `<div style="display:flex;min-width:${totalW}px;height:${HDR_H1}px;background:#0B1E33;position:sticky;top:0;z-index:4">
      <div style="width:${LABEL_W}px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.15)"></div>
      <div style="position:relative;flex:1">`;

    // Itera meses dentro do span
    let mCur = new Date(minD.getFullYear(), minD.getMonth(), 1);
    while (mCur <= maxD) {
      const mStart = mCur < minD ? minD : mCur;
      const mEnd   = new Date(mCur.getFullYear(), mCur.getMonth() + 1, 0); // último dia do mês
      const mEndClipped = mEnd > maxD ? maxD : mEnd;
      const x    = toX(mStart);
      const wPx  = daysBetween(mStart, mEndClipped) * PX_DAY + PX_DAY; // +1 dia inclusivo
      const label = mCur.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace(' de ','·');
      monthHtml += `<div style="position:absolute;left:${x}px;width:${wPx}px;height:${HDR_H1}px;display:flex;align-items:center;padding:0 6px;border-left:1px solid rgba(255,255,255,0.12);font-size:11px;font-weight:700;color:rgba(255,255,255,0.90);overflow:hidden;white-space:nowrap;letter-spacing:0.3px">${label}</div>`;
      mCur = new Date(mCur.getFullYear(), mCur.getMonth() + 1, 1);
    }
    monthHtml += '</div></div>';

    // ── LINHA 2: DIAS DA SEMANA ────────────────────────────────
    let dayHtml = `<div style="display:flex;min-width:${totalW}px;height:${HDR_H2}px;background:#f0f2f7;border-bottom:2px solid #ccd0de;position:sticky;top:${HDR_H1}px;z-index:3">
      <div style="width:${LABEL_W}px;flex-shrink:0;border-right:1px solid #ccd0de"></div>
      <div style="position:relative;flex:1">`;

    // Badge HOJE dentro do header dias
    if (todayX >= 0 && todayX <= totalDays * PX_DAY) {
      const cx = todayX + PX_DAY / 2;
      dayHtml += `<div style="position:absolute;left:${cx}px;top:0;bottom:0;z-index:2;pointer-events:none">
        <div style="position:absolute;top:50%;left:0;transform:translate(-50%,-50%);background:#E74C3C;color:white;font-size:8.5px;font-weight:700;padding:1px 4px;border-radius:3px;white-space:nowrap;z-index:10">HOJE</div>
      </div>`;
    }

    // Cada dia
    let dCur = new Date(minD);
    for (let di = 0; di < totalDays; di++) {
      const dow   = dCur.getDay(); // 0=dom
      const x     = di * PX_DAY;
      const isSat = dow === 6;
      const isSun = dow === 0;
      const isWknd = isSat || isSun;
      const isToday = daysBetween(minD, dCur) === daysBetween(minD, today);

      // Fundo: weekend mais escuro, hoje em vermelho suave
      const bg = isToday
        ? 'rgba(231,76,60,0.12)'
        : isWknd
        ? 'rgba(0,0,0,0.06)'
        : 'transparent';

      // Borda esquerda: segunda-feira marca início de semana
      const borderL = dow === 1 ? '1.5px solid #aab0c4' : '1px solid #dde0ea';

      dayHtml += `<div style="position:absolute;left:${x}px;width:${PX_DAY}px;height:${HDR_H2}px;background:${bg};border-left:${borderL};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:${isToday?'700':'600'};color:${isToday?'#C62828':isWknd?'#9CA3AF':'#6C757D'};overflow:hidden" title="${dCur.toLocaleDateString('pt-BR')}">${DIAS[dow].slice(0,3)}</div>`;

      dCur = new Date(dCur.getTime() + 864e5);
    }
    dayHtml += '</div></div>';

    // ── LINHAS DE ATIVIDADE ────────────────────────────────────
    let rowsHtml = '';
    rows.forEach((r, idx) => {
      const pStart = window.parseDateStr(r.inP);
      const pEnd   = window.parseDateStr(r.fimP);
      const rStart = window.parseDateStr(r.inR);
      const rEnd   = window.parseDateStr(r.fimR) || (r.prog > 0 && r.prog < 100 ? today : null);

      let bars = '';

      // Faixas de fim de semana na área de barras
      let bgStripes = '';
      let dCurBg = new Date(minD);
      for (let di = 0; di < totalDays; di++) {
        const dow = dCurBg.getDay();
        if (dow === 0 || dow === 6) {
          bgStripes += `<div style="position:absolute;left:${di*PX_DAY}px;width:${PX_DAY}px;top:0;bottom:0;background:rgba(0,0,0,0.035)"></div>`;
        }
        // Separador de semana (segunda-feira)
        if (dow === 1) {
          bgStripes += `<div style="position:absolute;left:${di*PX_DAY}px;width:1px;top:0;bottom:0;background:rgba(0,0,0,0.08)"></div>`;
        }
        dCurBg = new Date(dCurBg.getTime() + 864e5);
      }

      // Barra planejada
      if (pStart && pEnd) {
        const left  = Math.max(0, toX(pStart));
        const right = toX(new Date(pEnd.getTime() + 864e5)); // inclusivo
        const w     = Math.max(PX_DAY * 0.5, right - left);
        bars += `<div class="gantt-bar gantt-bar-planned" style="left:${left}px;width:${w}px;background:rgba(11,30,51,0.15);border:1.5px solid rgba(11,30,51,0.35)" title="Previsto: ${r.inP} → ${r.fimP}"></div>`;
      }

      // Barra real
      if (rStart) {
        const rEndD  = rEnd || today;
        const left   = Math.max(0, toX(rStart));
        const right  = toX(new Date(rEndD.getTime() + 864e5));
        const w      = Math.max(PX_DAY * 0.5, right - left);
        const isLate = pEnd && rEndD > pEnd;
        const color  = r.prog === 100 ? '#1565C0' : isLate ? '#C62828' : '#0B1E33';
        bars += `<div class="gantt-bar gantt-bar-real" style="left:${left}px;width:${w}px;background:${color};opacity:0.88" title="Real: ${r.inR} → ${r.fimR||'em andamento'} · ${r.prog}%"></div>`;
      }

      // Linha de hoje
      if (todayX >= 0 && todayX <= totalDays * PX_DAY) {
        bars += `<div style="position:absolute;left:${todayX + PX_DAY/2}px;top:0;bottom:0;width:2px;background:#E74C3C;opacity:0.7;z-index:2"></div>`;
      }

      const rowBg    = idx % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.018)';
      const stColor  = r.st === 'Concluído' ? '#1565C0' : r.st === 'Atrasado' ? '#C62828' : r.st === 'Em dia' ? '#2E7D32' : '#E65100';

      rowsHtml += `<div style="display:flex;min-width:${totalW}px;height:${ROW_H}px;background:${rowBg};border-bottom:1px solid #f0f2f5">
        <div style="width:${LABEL_W}px;flex-shrink:0;padding:8px 12px;font-size:12px;font-weight:500;color:#2D3433;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-right:1px solid #e0e4ec;display:flex;flex-direction:column;justify-content:center" title="${r.atv}">
          ${r.atv}
          <small style="font-size:10.5px;color:${stColor};font-weight:600;margin-top:2px">${r.resp} · ${r.st}</small>
        </div>
        <div style="position:relative;flex:1;height:${ROW_H}px;overflow:hidden">
          ${bgStripes}${bars}
        </div>
      </div>`;
    });

    container.innerHTML = monthHtml + dayHtml + rowsHtml;
  }

  // ── TABELA COMPACTA NA ABA GANTT ─────────────────────────────
  function renderGanttTable(rows) {
    const tbody = document.getElementById('tableBodyGantt');
    if (!tbody) return;
    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="padding:30px"><i class="fas fa-inbox"></i><h3>Nenhuma atividade</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const sc = r.st === 'Concluído' ? 'status-concluido' : r.st === 'Atrasado' ? 'status-atrasado' : r.st === 'Em dia' ? 'status-em-dia' : 'status-nao-iniciado';
      const si = r.st === 'Concluído' ? 'fa-check-circle' : r.st === 'Atrasado' ? 'fa-exclamation-circle' : r.st === 'Em dia' ? 'fa-clock' : 'fa-hourglass-start';
      return `<tr>
        <td><strong>${r.atv}</strong></td>
        <td>${r.resp}</td>
        <td>${r.inP}</td><td>${r.fimP}</td>
        <td>${r.inR||'—'}</td><td>${r.fimR||'—'}</td>
        <td><div class="progress-bar"><div class="progress-track"><div class="progress-fill" style="width:${r.prog}%"></div></div><span style="font-size:12px;font-weight:600;min-width:28px">${r.prog}%</span></div></td>
        <td><span class="status-badge ${sc}"><i class="fas ${si}"></i> ${r.st}</span></td>
      </tr>`;
    }).join('');
  }

})();
