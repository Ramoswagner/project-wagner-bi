// ═══════════════════════════════════════════════════════════════
//  CURVA S — Custo Acumulado Planejado × Realizado
//  Canvas: #curvasChart  (ocupa largura total — chart-col-3)
//
//  Lógica de construção:
//    Para cada atividade, distribui o custo previsto uniformemente
//    ao longo de seus meses planejados (inP → fimP).
//    Faz o mesmo com o custo real (inR → fimR ou hoje).
//    Acumula mês a mês para gerar o perfil em S.
// ═══════════════════════════════════════════════════════════════
(function () {
  let _instance = null;

  ChartRegistry.register({
    id: 'curvas',
    canvasId: 'curvasChart',

    render(data) {
      const canvas = document.getElementById('curvasChart');
      if (!canvas) return;
      if (_instance) { _instance.destroy(); _instance = null; }

      const rows = data.rows || [];
      if (rows.length === 0) return;

      // ── Constrói mapa mensal ──────────────────────────────────
      const buckets = {};   // { 'YYYY-MM': { prev: 0, real: 0 } }

      const addToBuckets = (key, start, end, cost) => {
        if (!start || !end || cost <= 0) return;
        if (end < start) end = new Date(start.getTime() + 30 * 864e5);
        // Meses entre start e end
        const months = [];
        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cur <= endMonth) {
          const k = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0');
          months.push(k);
          cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }
        const perMonth = cost / months.length;
        months.forEach(m => {
          if (!buckets[m]) buckets[m] = { prev: 0, real: 0 };
          buckets[m][key] += perMonth;
        });
      };

      const today = new Date();

      rows.forEach(r => {
        const pStart = window.parseDateStr(r.inP);
        const pEnd   = window.parseDateStr(r.fimP);
        const rStart = window.parseDateStr(r.inR);
        const rEnd   = window.parseDateStr(r.fimR) || (r.prog > 0 ? today : null);

        addToBuckets('prev', pStart, pEnd, r.cP);
        addToBuckets('real', rStart, rEnd, r.cR);
      });

      if (Object.keys(buckets).length === 0) return;

      // ── Ordena meses e acumula ────────────────────────────────
      const sortedMonths = Object.keys(buckets).sort();
      let cumPrev = 0, cumReal = 0;
      const labels = [], dataPrev = [], dataReal = [];

      sortedMonths.forEach(m => {
        cumPrev += buckets[m].prev || 0;
        cumReal += buckets[m].real || 0;
        // Formata label: "mar/25"
        const [y, mo] = m.split('-');
        const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
        labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        dataPrev.push(Math.round(cumPrev));
        dataReal.push(Math.round(cumReal));
      });

      // ── Plugin: linha vertical "Hoje" ─────────────────────────
      const now2 = new Date();
      const todayKey2 = now2.getFullYear() + '-' + String(now2.getMonth() + 1).padStart(2, '0');
      const todayIdx2 = sortedMonths.indexOf(todayKey2);

      const todayLinePlugin = {
        id: 'todayLine',
        afterDraw(chart) {
          if (todayIdx2 < 0) return;
          const meta = chart.getDatasetMeta(0);
          if (!meta.data[todayIdx2]) return;
          const x   = meta.data[todayIdx2].x;
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
          // Label "Hoje"
          ctx2.setLineDash([]);
          ctx2.fillStyle    = '#E74C3C';
          ctx2.font         = '600 10px Inter, sans-serif';
          ctx2.textAlign    = 'center';
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
              label: 'Planejado acumulado',
              data: dataPrev,
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
              label: 'Realizado acumulado',
              data: dataReal,
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
              labels: { font: { family: 'Inter', size: 12 }, padding: 18, usePointStyle: true, pointStyleWidth: 10 }
            },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${window.fmoney(ctx.raw)}`
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
                callback: v => {
                  if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M';
                  if (v >= 1000)    return 'R$ ' + (v / 1000).toFixed(0) + 'k';
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
