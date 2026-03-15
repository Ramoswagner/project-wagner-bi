// ═══════════════════════════════════════════════════════════════
//  GRÁFICO: Status dos Prazos (Barras)
//  Canvas: #statusChart
//  Para editar o visual deste gráfico, edite apenas este arquivo.
// ═══════════════════════════════════════════════════════════════

(function () {
  let _instance = null;

  ChartRegistry.register({
    id: 'status',
    canvasId: 'statusChart',

    render(data) {
      const ctx = document.getElementById('statusChart').getContext('2d');
      if (_instance) { _instance.destroy(); _instance = null; }

      const { emDia, atrasados, naoIniciados, total } = data;

      _instance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Em dia', 'Atrasados', 'Não iniciados'],
          datasets: [{
            data: [emDia, atrasados, naoIniciados],
            backgroundColor: [
              'rgba(46,125,50,0.85)',
              'rgba(198,40,40,0.85)',
              'rgba(230,81,0,0.85)'
            ],
            borderColor: [
              'rgba(46,125,50,1)',
              'rgba(198,40,40,1)',
              'rgba(230,81,0,1)'
            ],
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Inter' } } },
            x: { ticks: { font: { family: 'Inter', size: 12 } } }
          }
        }
      });

      // Atualiza o badge do card
      const badge = document.getElementById('totalStatus');
      if (badge) badge.textContent = `${total} atividades`;
    },

    destroy() {
      if (_instance) { _instance.destroy(); _instance = null; }
    }
  });
})();
