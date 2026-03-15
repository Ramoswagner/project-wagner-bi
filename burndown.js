// ═══════════════════════════════════════════════════════════════
//  GRÁFICO: Progresso por Responsável (Barras horizontais)
//  Canvas: #burndownChart
//  Slot HTML necessário: <canvas id="burndownChart"></canvas>
//  dentro de um card com id="card-burndown".
//
//  Este é um exemplo de gráfico adicionado sem tocar no core.js.
//  Para criar o próximo gráfico, copie este arquivo e mude:
//    - id, canvasId
//    - a lógica dentro de render(data)
// ═══════════════════════════════════════════════════════════════

(function () {
  let _instance = null;

  ChartRegistry.register({
    id: 'burndown',
    canvasId: 'burndownChart',

    render(data) {
      const canvas = document.getElementById('burndownChart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (_instance) { _instance.destroy(); _instance = null; }

      // Agrupa progresso médio por responsável
      const byResp = {};
      data.rows.forEach(r => {
        if (!byResp[r.resp]) byResp[r.resp] = { sum: 0, count: 0 };
        byResp[r.resp].sum   += r.prog;
        byResp[r.resp].count += 1;
      });

      const labels = Object.keys(byResp);
      const values = labels.map(k => Math.round(byResp[k].sum / byResp[k].count));

      // Cores: verde se ≥70%, amarelo se ≥40%, vermelho se <40%
      const colors = values.map(v =>
        v >= 70 ? 'rgba(46,125,50,0.85)'
        : v >= 40 ? 'rgba(230,81,0,0.85)'
        : 'rgba(198,40,40,0.85)'
      );

      _instance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Progresso médio (%)',
            data: values,
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('0.85', '1')),
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          indexAxis: 'y',   // barras horizontais
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: c => ` ${c.raw}% de progresso médio` }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              ticks: { font: { family: 'Inter', size: 11 }, callback: v => v + '%' }
            },
            y: { ticks: { font: { family: 'Inter', size: 12 } } }
          }
        }
      });
    },

    destroy() {
      if (_instance) { _instance.destroy(); _instance = null; }
    }
  });
})();
