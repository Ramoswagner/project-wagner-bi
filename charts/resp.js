// ═══════════════════════════════════════════════════════════════
//  GRÁFICO: Progresso por Responsável (barras horizontais)
//  Canvas: #respChart   Badge: #respBadge
//  Recebe data.respMap = { "Ana Lima": {sum:180, count:2}, ... }
// ═══════════════════════════════════════════════════════════════
(function () {
  let _instance = null;

  ChartRegistry.register({
    id: 'resp',
    canvasId: 'respChart',

    render(data) {
      const canvas = document.getElementById('respChart');
      if (!canvas) return;
      if (_instance) { _instance.destroy(); _instance = null; }

      const map    = data.respMap || {};
      const names  = Object.keys(map);
      if (names.length === 0) return;

      const avgs   = names.map(n => Math.round(map[n].sum / map[n].count));
      const colors = avgs.map(v =>
        v >= 70 ? 'rgba(46,125,50,0.85)'
        : v >= 40 ? 'rgba(230,81,0,0.85)'
        : 'rgba(198,40,40,0.85)'
      );

      _instance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: names,
          datasets: [{
            data: avgs,
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('0.85','1')),
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: c => ` ${c.raw}% progresso médio` } }
          },
          scales: {
            x: { beginAtZero: true, max: 100, ticks: { font: { family: 'Inter', size: 11 }, callback: v => v + '%' } },
            y: { ticks: { font: { family: 'Inter', size: 12 } } }
          }
        }
      });
    },

    destroy() { if (_instance) { _instance.destroy(); _instance = null; } }
  });
})();
