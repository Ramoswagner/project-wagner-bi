// ═══════════════════════════════════════════════════════════════
//  GRÁFICO: Saúde Financeira (Donut)
//  Canvas: #financeChart
//  Para editar o visual deste gráfico, edite apenas este arquivo.
// ═══════════════════════════════════════════════════════════════

(function () {
  let _instance = null;

  ChartRegistry.register({
    id: 'finance',
    canvasId: 'financeChart',

    render(data) {
      const ctx = document.getElementById('financeChart').getContext('2d');
      if (_instance) { _instance.destroy(); _instance = null; }

      const prev = data.totalPrev;
      const real = data.totalReal;

      _instance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Custo Real', 'Saldo Disponível'],
          datasets: [{
            data: [real, Math.max(0, prev - real)],
            backgroundColor: ['rgba(11,30,51,0.85)', 'rgba(196,163,90,0.18)'],
            borderColor:     ['rgba(11,30,51,1)',    'rgba(196,163,90,0.4)'],
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          cutout: '72%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { family: 'Inter', size: 12 }, padding: 14 }
            },
            tooltip: {
              callbacks: {
                label: c => `${c.label}: ${window.fmoney(c.raw)}`
              }
            }
          }
        }
      });

      // Atualiza o badge do card
      const badge = document.getElementById('percentualGasto');
      if (badge) {
        const usedPct = prev > 0 ? ((real / prev) * 100).toFixed(1) : 0;
        badge.textContent = usedPct + '% utilizado';
      }
    },

    destroy() {
      if (_instance) { _instance.destroy(); _instance = null; }
    }
  });
})();
