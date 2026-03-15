// ═══════════════════════════════════════════════════════════════
//  ATIVIDADES EM RISCO — Mini-tabela HTML
//  Slot: div#riskTable  (não é canvas — renderiza HTML)
//  Mostra até 5 atividades mais críticas:
//    atrasadas com custo acima do previsto primeiro,
//    depois só atrasadas, depois só acima do orçamento.
// ═══════════════════════════════════════════════════════════════
(function () {

  ChartRegistry.register({
    id: 'risktable',
    canvasId: 'riskTable',   // id do container div

    render(data) {
      const el = document.getElementById('riskTable');
      if (!el) return;

      const rows = data.rows || [];
      if (rows.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:24px 0;color:var(--gray-400);font-size:13px"><i class="fas fa-shield-check" style="font-size:22px;display:block;margin-bottom:8px"></i>Nenhum risco identificado</div>';
        return;
      }

      // Score de criticidade: ambos = 3, só atrasado = 2, só custo = 1
      const scored = rows
        .filter(r => r.st === 'Atrasado' || r.cR > r.cP)
        .map(r => {
          const isLate  = r.st === 'Atrasado';
          const isOver  = r.cR > r.cP;
          const score   = (isLate ? 2 : 0) + (isOver ? 1 : 0);
          const overpct = r.cP > 0 ? Math.round((r.cR - r.cP) / r.cP * 100) : 0;
          return { ...r, score, isLate, isOver, overpct };
        })
        .sort((a, b) => b.score - a.score || b.overpct - a.overpct)
        .slice(0, 5);

      if (scored.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:24px 0;color:var(--gray-400);font-size:13px"><i class="fas fa-shield-check" style="font-size:22px;display:block;margin-bottom:8px"></i>Sem riscos críticos</div>';
        return;
      }

      const rows_html = scored.map(r => {
        // Tags de risco
        const tags = [];
        if (r.isLate) tags.push('<span style="background:#FFEBEE;color:#C62828;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">Atrasado</span>');
        if (r.isOver) tags.push(`<span style="background:#FFF3E0;color:#E65100;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap">+${r.overpct}% custo</span>`);

        // Ícone de severidade
        const icon = r.score === 3
          ? '<i class="fas fa-circle-exclamation" style="color:#C62828;font-size:13px"></i>'
          : r.isLate
          ? '<i class="fas fa-clock" style="color:#E65100;font-size:13px"></i>'
          : '<i class="fas fa-coins" style="color:#F39C12;font-size:13px"></i>';

        return `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--gray-100)">
          <div style="padding-top:2px;flex-shrink:0">${icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${r.atv}">${r.atv}</div>
            <div style="font-size:11px;color:var(--gray-500);margin-top:2px">${r.resp} · Prog. ${r.prog}%</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0">${tags.join('')}</div>
        </div>`;
      }).join('');

      const totalRiscos = rows.filter(r => r.st === 'Atrasado' || r.cR > r.cP).length;
      const maisTexto = totalRiscos > 5
        ? `<div style="text-align:center;font-size:11px;color:var(--gray-400);padding-top:8px">+${totalRiscos - 5} mais na tabela abaixo</div>`
        : '';

      el.innerHTML = `<div style="border-top:1px solid var(--gray-100)">${rows_html}</div>${maisTexto}`;
    },

    destroy() {}
  });
})();
