// ═══════════════════════════════════════════════════════════════
//  MÓDULO: Gantt (Planejado vs Real)
//  Slots HTML: #ganttInner (aba Cronograma) + #tableBodyGantt
//  Não usa ChartRegistry (não é um <canvas>).
//  É chamado via ChartRegistry com canvasId fictício 'ganttInner'
//  mas renderiza HTML diretamente no container.
// ═══════════════════════════════════════════════════════════════
(function () {

  ChartRegistry.register({
    id: 'gantt',
    canvasId: 'ganttInner',   // usado só para verificar existência do slot

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

    // Coleta todas as datas para calcular escala
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

    // Margens laterais de 7 dias
    minD = new Date(minD.getTime() - 7 * 864e5);
    maxD = new Date(maxD.getTime() + 7 * 864e5);
    const totalMs  = maxD - minD;
    const toP      = d => ((d - minD) / totalMs * 100);
    const today    = new Date();
    const todayP   = toP(today);

    // Cabeçalho de meses
    const months = [];
    let cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
    while (cur <= maxD) {
      months.push({ label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), p: toP(cur) });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    let headerHtml = '<div class="gantt-time-header"><div style="width:180px;flex-shrink:0;border-right:1px solid var(--gray-200)"></div>';
    if (months.length > 1) {
      for (let i = 0; i < months.length; i++) {
        const nextP = i < months.length - 1 ? months[i + 1].p : 100;
        const w     = Math.max(0, nextP - months[i].p);
        headerHtml += `<div class="gantt-month" style="flex:${w} 0 0%">${months[i].label}</div>`;
      }
    }
    headerHtml += '</div>';

    // Label "HOJE" acima do header
    const todayLabel = todayP >= 0 && todayP <= 100
      ? `<div style="position:relative;height:0;overflow:visible;padding-left:180px"><div style="position:absolute;left:calc(180px + ${todayP}%);top:-24px;font-size:9px;font-weight:700;color:var(--danger);white-space:nowrap;transform:translateX(-50%)">HOJE</div></div>`
      : '';

    // Linhas de atividade
    let rowsHtml = '';
    rows.forEach(r => {
      const plannedStart = window.parseDateStr(r.inP);
      const plannedEnd   = window.parseDateStr(r.fimP);
      const realStart    = window.parseDateStr(r.inR);
      const realEnd      = window.parseDateStr(r.fimR) || (r.prog > 0 && r.prog < 100 ? new Date() : null);

      let bars = '';

      // Barra planejada
      if (plannedStart && plannedEnd) {
        const left  = Math.max(0, toP(plannedStart));
        const width = Math.max(0.4, toP(plannedEnd) - left);
        bars += `<div class="gantt-bar gantt-bar-planned" style="left:${left}%;width:${width}%;background:rgba(11,30,51,0.20);border:1.5px solid rgba(11,30,51,0.40)" title="Previsto: ${r.inP} → ${r.fimP}"></div>`;
      }

      // Barra real
      if (realStart) {
        const rEnd  = realEnd || today;
        const left  = Math.max(0, toP(realStart));
        const width = Math.max(0.4, toP(rEnd) - left);
        const isLate = plannedEnd && rEnd > plannedEnd;
        const color  = r.prog === 100 ? '#1565C0' : isLate ? '#C62828' : '#0B1E33';
        bars += `<div class="gantt-bar gantt-bar-real" style="left:${left}%;width:${width}%;background:${color};opacity:0.88" title="Real: ${r.inR} → ${r.fimR || 'em andamento'}"></div>`;
      }

      // Linha de hoje
      if (todayP >= 0 && todayP <= 100) {
        bars += `<div class="gantt-today-line" style="left:${todayP}%"></div>`;
      }

      const stColor = r.st === 'Concluído' ? '#1565C0' : r.st === 'Atrasado' ? '#C62828' : r.st === 'Em dia' ? '#2E7D32' : '#E65100';
      rowsHtml += `<div class="gantt-row">
        <div class="gantt-row-label" title="${r.atv}">${r.atv}<small style="color:${stColor}">${r.resp} · ${r.st}</small></div>
        <div class="gantt-bars-area">${bars}</div>
      </div>`;
    });

    container.innerHTML = headerHtml + todayLabel + rowsHtml;
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
