// ═══════════════════════════════════════════════════════════════
//  CHART REGISTRY — Project Wagner BI
//  Cada gráfico se registra aqui. O core chama renderAll(data).
//  Para adicionar um novo gráfico: crie charts/novo.js e importe
//  no index.html. Não altere este arquivo nem o core.js.
// ═══════════════════════════════════════════════════════════════

window.ChartRegistry = {
  _charts: [],

  /**
   * Registra um módulo de gráfico.
   * @param {Object} chart
   * @param {string} chart.id        - identificador único
   * @param {string} chart.canvasId  - id do <canvas> no HTML
   * @param {Function} chart.render  - function(data) — recebe lastData
   * @param {Function} [chart.destroy] - opcional: chamado antes de re-render
   */
  register(chart) {
    this._charts.push(chart);
  },

  /** Chamado pelo core.js após processData() */
  renderAll(data) {
    this._charts.forEach(c => {
      const canvas = document.getElementById(c.canvasId);
      if (!canvas) return; // slot não existe no HTML atual — ignora silenciosamente
      c.render(data);
    });
  },

  /** Destrói todos os gráficos (usado no refresh) */
  destroyAll() {
    this._charts.forEach(c => {
      if (typeof c.destroy === 'function') c.destroy();
    });
  }
};
