// ═══════════════════════════════════════════════════════════════
//  CUSTO POR RESPONSÁVEL — Previsto × Real (barras agrupadas)
//  Canvas: #costRespChart
//  Revela quem está gerando os maiores desvios financeiros.
// ═══════════════════════════════════════════════════════════════
(function () {
  let _instance = null;

  ChartRegistry.register({
    id: 'costbyresp',
    canvasId: 'costRespChart',

    render(data) {
      const canvas = document.getElementById('costRespChart');
      if (!canvas) return;
      if (_instance) { _instance.destroy(); _instance = null; }

      const rows = data.rows || [];
      if (rows.length === 0) return;

      // Agrupa custo por responsável
      const map = {};
      rows.forEach(r => {
        if (!map[r.resp]) map[r.resp] = { prev: 0, real: 0 };
        map[r.resp].prev += r.cP || 0;
        map[r.resp].real += r.cR || 0;
      });

      const names   = Object.keys(map);
      const prevArr = names.map(n => Math.round(map[n].prev));
      const realArr = names.map(n => Math.round(map[n].real));

      // Cores da barra real: verde se dentro, vermelho se acima
      const realColors = names.map((n, i) =>
        realArr[i] > prevArr[i]
          ? 'rgba(198,40,40,0.82)'
          : 'rgba(46,125,50,0.82)'
      );

      _instance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: names,
          datasets: [
            {
              label: 'Previsto',
              data: prevArr,
              backgroundColor: 'rgba(11,30,51,0.18)',
              borderColor: 'rgba(11,30,51,0.45)',
              borderWidth: 1.5,
              borderRadius: 5,
              borderSkipped: false,
            },
            {
              label: 'Real',
              data: realArr,
              backgroundColor: realColors,
              borderColor: realColors.map(c => c.replace('0.82', '1')),
              borderWidth: 1.5,
              borderRadius: 5,
              borderSkipped: false,
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
              labels: { font: { family: 'Inter', size: 12 }, padding: 14, usePointStyle: true, pointStyleWidth: 10 }
            },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${window.fmoney(ctx.raw)}`
              }
            }
          },
          scales: {
            x: { ticks: { font: { family: 'Inter', size: 11 } }, grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: {
                font: { family: 'Inter', size: 11 },
                callback: v => {
                  if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(0) + 'k';
                  return 'R$ ' + v;
                }
              },
              grid: { color: 'rgba(0,0,0,0.04)' }
            }
          }
        }
      });
    },

    destroy() { if (_instance) { _instance.destroy(); _instance = null; } }
  });
})();
