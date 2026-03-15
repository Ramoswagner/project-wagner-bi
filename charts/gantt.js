// ═══════════════════════════════════════════════════════════════
//  MÓDULO: Gantt (Planejado vs Real) — estilo MS Project
//  Cabeçalho duplo: Meses (linha 1) + Semanas (linha 2)
//  Linha de Hoje: posicionada pelo dia exato (meia-noite)
//  Slots: #ganttInner + #tableBodyGantt
// ═══════════════════════════════════════════════════════════════
(function () {

  const LABEL_W = 200; // px largura da coluna de labels

  ChartRegistry.register({
    id: 'gantt',
    canvasId: 'ganttInner',

    render(data) {
      renderGantt(data.rows || []);
      renderGanttTable(data.rows || []);
    },

    destroy() {}
  });

  // ── UTILS ─────────────────────────────────────────────────────
  // Retorna segunda-feira da semana que contém a data d
  function weekStart(d) {
    const day = new Date(d);
    const dow = day.getDay(); // 0=dom
    const diff = (dow === 0) ? -6 : 1 - dow;
    day.setDate(day.getDate() + diff);
    day.setHours(0, 0, 0, 0);
    return day;
  }

  // Número ISO da semana do ano
  function isoWeek(d) {
    const tmp = new Date(d);
    tmp.setHours(0, 0, 0, 0);
    tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7);
    const w1 = new Date(tmp.getFullYear(), 0, 4);
    return 1 + Math.round(((tmp - w1) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7);
  }

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

    // Normaliza para meia-noite e adiciona margens
    minD = weekStart(new Date(minD.getTime() - 7 * 864e5)); // início da semana - 1 semana
    maxD = new Date(maxD);
    maxD.setHours(0, 0, 0, 0);
    maxD = new Date(maxD.getTime() + 14 * 864e5); // + 2 semanas

    const totalMs = maxD - minD;

    // Hoje normalizado para meia-noite (posição exata no dia)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // toP: data → percentual 0..100 dentro da área de barras
    const toP = d => {
      const norm = new Date(d);
      norm.setHours(0, 0, 0, 0);
      return (norm - minD) / totalMs * 100;
    };

    const todayP = toP(today);

    // ── Linha 1: MESES ────────────────────────────────────────
    const months = [];
    let cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
    while (cur <= maxD) {
      months.push({
        label: cur.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
               .replace(' de ', ' '),
        pStart: toP(cur),
        d: new Date(cur)
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    let monthRow = `<div style="display:flex;padding-left:${LABEL_W}px;border-bottom:1px solid var(--gray-200);background:var(--primary);position:relative">`;
    for (let i = 0; i < months.length; i++) {
      const pEnd = i < months.length - 1 ? months[i + 1].pStart : 100;
      const w    = Math.max(0, pEnd - months[i].pStart);
      monthRow  += `<div style="flex:${w} 0 0%;text-align:center;font-size:11px;font-weight:700;color:rgba(255,255,255,0.90);padding:5px 2px;border-left:1px solid rgba(255,255,255,0.15);white-space:nowrap;overflow:hidden;letter-spacing:0.3px">${months[i].label}</div>`;
    }
    monthRow += '</div>';

    // ── Linha 2: SEMANAS (com badge HOJE embutido) ────────────
    const weeks = [];
    let wCur = new Date(weekStart(minD));
    while (wCur <= maxD) {
      weeks.push({
        num:    isoWeek(wCur),
        pStart: toP(wCur),
        d:      new Date(wCur)
      });
      wCur = new Date(wCur.getTime() + 7 * 864e5);
    }

    // Badge "HOJE" dentro da linha de semanas (não externo — evita overflow-clip)
    const todayBadgeHtml = todayP >= 0 && todayP <= 100
      ? `<div style="position:absolute;left:calc(${LABEL_W}px + ${todayP}%);top:0;bottom:0;pointer-events:none;z-index:2">
           <div style="position:absolute;top:50%;left:0;transform:translate(-50%,-50%);background:#E74C3C;color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;white-space:nowrap">HOJE</div>
         </div>`
      : '';

    let weekRow = `<div style="display:flex;padding-left:${LABEL_W}px;border-bottom:2px solid var(--gray-200);background:#f0f2f7;position:relative">`;
    weekRow += todayBadgeHtml;
    for (let i = 0; i < weeks.length; i++) {
      const pEnd = i < weeks.length - 1 ? weeks[i + 1].pStart : 100;
      const w    = Math.max(0, pEnd - weeks[i].pStart);
      const dd   = weeks[i].d;
      const dayLabel = dd.getDate() + '/' + (dd.getMonth() + 1);
      weekRow   += `<div style="flex:${w} 0 0%;text-align:center;font-size:9.5px;font-weight:600;color:var(--gray-600);padding:3px 1px;border-left:1px solid var(--gray-200);white-space:nowrap;overflow:hidden" title="Semana ${weeks[i].num} · ${dayLabel}">S${weeks[i].num}</div>`;
    }
    weekRow += '</div>';

    // ── Linhas de atividade ───────────────────────────────────
    let rowsHtml = '';
    rows.forEach((r, idx) => {
      const plannedStart = window.parseDateStr(r.inP);
      const plannedEnd   = window.parseDateStr(r.fimP);
      const realStart    = window.parseDateStr(r.inR);
      const realEnd      = window.parseDateStr(r.fimR) || (r.prog > 0 && r.prog < 100 ? today : null);

      let bars = '';

      // Barra planejada
      if (plannedStart && plannedEnd) {
        const left  = Math.max(0, toP(plannedStart));
        const width = Math.max(0.4, toP(plannedEnd) - left);
        bars += `<div class="gantt-bar gantt-bar-planned" style="left:${left}%;width:${width}%;background:rgba(11,30,51,0.15);border:1.5px solid rgba(11,30,51,0.35)" title="Previsto: ${r.inP} → ${r.fimP}"></div>`;
      }

      // Barra real
      if (realStart) {
        const rEnd  = realEnd || today;
        const left  = Math.max(0, toP(realStart));
        const width = Math.max(0.4, toP(rEnd) - left);
        const isLate = plannedEnd && rEnd > plannedEnd;
        const color  = r.prog === 100 ? '#1565C0' : isLate ? '#C62828' : '#0B1E33';
        bars += `<div class="gantt-bar gantt-bar-real" style="left:${left}%;width:${width}%;background:${color};opacity:0.88" title="Real: ${r.inR} → ${r.fimR || 'em andamento'} · ${r.prog}%"></div>`;
      }

      // Linha de hoje (dentro de cada barra)
      if (todayP >= 0 && todayP <= 100) {
        bars += `<div class="gantt-today-line" style="left:${todayP}%"></div>`;
      }

      // Zebra
      const rowBg = idx % 2 === 0 ? '' : 'background:rgba(0,0,0,0.018)';
      const stColor = r.st === 'Concluído' ? '#1565C0' : r.st === 'Atrasado' ? '#C62828' : r.st === 'Em dia' ? '#2E7D32' : '#E65100';

      rowsHtml += `<div class="gantt-row" style="${rowBg}">
        <div class="gantt-row-label" style="width:${LABEL_W}px" title="${r.atv}">
          ${r.atv}
          <small style="color:${stColor}">${r.resp} · ${r.st}</small>
        </div>
        <div class="gantt-bars-area">${bars}</div>
      </div>`;
    });

    container.innerHTML = monthRow + weekRow + rowsHtml;
  }

  // ── TABELA COMPACTA NA ABA GANTT ────────────────────────────
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
        <td>${r.inR}</td><td>${r.fimR}</td>
        <td><div class="progress-bar"><div class="progress-track"><div class="progress-fill" style="width:${r.prog}%"></div></div><span style="font-size:12px;font-weight:600;min-width:28px">${r.prog}%</span></div></td>
        <td><span class="status-badge ${sc}"><i class="fas ${si}"></i> ${r.st}</span></td>
      </tr>`;
    }).join('');
  }

})();
