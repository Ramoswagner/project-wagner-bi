// ═══════════════════════════════════════════════════════════════
//  ATIVIDADES — Planejado Concluir × Concluído
//  Canvas: #atividadesChart  (ocupa largura total — chart-col-3)
//
//  Lógica:
//    Planejado: acumula 1 por atividade no mês do seu fimP
//    Concluído:  acumula 1 por atividade no mês em que prog===100
//                usando fimR se disponível, senão fimP como proxy
//  Resultado: curva em S de conclusões planejadas vs reais.
// ═══════════════════════════════════════════════════════════════
(function () {
  let _instance = null;

  ChartRegistry.register({
    id: 'atividades',
    canvasId: 'atividadesChart',

    render(data) {
      const canvas = document.getElementById('atividadesChart');
      if (!canvas) return;
      if (_instance) { _instance.destroy(); _instance = null; }

      const rows = data.rows || [];
      if (rows.length === 0) return;

      // ── Monta buckets mensais ─────────────────────────────────
      const planned  = {};  // { 'YYYY-MM': count }
      const done     = {};

      const monthKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

      rows.forEach(r => {
        // Planejado concluir: usa fimP
        const pEnd = window.parseDateStr(r.fimP);
        if (pEnd) {
          const k = monthKey(pEnd);
          planned[k] = (planned[k] || 0) + 1;
        }

        // Concluído: prog === 100
        if (r.prog === 100) {
          // Prefere fimR (data real), senão usa fimP como proxy
          const rEnd = window.parseDateStr(r.fimR) || window.parseDateStr(r.fimP);
          if (rEnd) {
            const k = monthKey(rEnd);
            done[k] = (done[k] || 0) + 1;
          }
        }
      });

      // ── Une meses e ordena ────────────────────────────────────
      const allMonths = [...new Set([
        ...Object.keys(planned),
        ...Object.keys(done)
      ])].sort();

      if (allMonths.length === 0) return;

      // ── Acumula mês a mês ─────────────────────────────────────
      let cumPlanned = 0, cumDone = 0;
      const labels = [], dataPlanned = [], dataDone = [];

      allMonths.forEach(m => {
        cumPlanned += planned[m] || 0;
        cumDone    += done[m]    || 0;

        const [y, mo] = m.split('-');
        const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
        labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        dataPlanned.push(cumPlanned);
        dataDone.push(cumDone);
      });

      // ── Plugin: linha vertical "Hoje" ─────────────────────────
      const todayLabel = new Date().toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      const todayLinePlugin = {
        id: 'todayLineAtv',
        afterDraw(chart) {
          const idx = chart.data.labels.indexOf(todayLabel);
          if (idx < 0) return;
          const meta = chart.getDatasetMeta(0);
          if (!meta.data[idx]) return;
          const x    = meta.data[idx].x;
          const ctx2 = chart.ctx;
          const { top, bottom } = chart.chartArea;
          ctx2.save();
          ctx2.beginPath();
          ctx2.setLineDash([5, 4]);
          ctx2.strokeStyle = 'rgba(231,76,60,0.75)';
          ctx2.lineWidth   = 1.5;
          ctx2.moveTo(x, top);
          ctx2.lineTo(x, bottom);
          ctx2.stroke();
          ctx2.setLineDash([]);
          ctx2.fillStyle = '#E74C3C';
          ctx2.font      = '600 10px Inter, sans-serif';
          ctx2.textAlign = 'center';
          ctx2.fillText('Hoje', x, top - 4);
          ctx2.restore();
        }
      };

      // ── Chart.js ──────────────────────────────────────────────
      _instance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        plugins: [todayLinePlugin],
        data: {
          labels,
          datasets: [
            {
              label: 'Planejado concluir',
              data: dataPlanned,
              borderColor: 'rgba(11,30,51,0.55)',
              backgroundColor: 'rgba(11,30,51,0.07)',
              borderWidth: 2,
              borderDash: [6, 4],
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: 'rgba(11,30,51,0.55)',
            },
            {
              label: 'Concluído',
              data: dataDone,
              borderColor: '#C4A35A',
              backgroundColor: 'rgba(196,163,90,0.15)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#C4A35A',
              pointBorderColor: '#fff',
              pointBorderWidth: 1.5,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { family: 'Inter', size: 12 },
                padding: 18,
                usePointStyle: true,
                pointStyleWidth: 10
              }
            },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const total = rows.length;
                  const pct   = total > 0 ? Math.round(ctx.raw / total * 100) : 0;
                  return ` ${ctx.dataset.label}: ${ctx.raw} atividade${ctx.raw !== 1 ? 's' : ''} (${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { font: { family: 'Inter', size: 11 }, maxRotation: 45 },
              grid: { color: 'rgba(0,0,0,0.04)' }
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: { family: 'Inter', size: 11 },
                stepSize: 1,
                callback: v => Number.isInteger(v) ? v : ''
              },
              grid: { color: 'rgba(0,0,0,0.04)' },
              max: rows.length + 1
            }
          }
        }
      });
    },

    destroy() { if (_instance) { _instance.destroy(); _instance = null; } }
  });
})();
