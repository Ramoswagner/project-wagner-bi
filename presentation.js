// ═══════════════════════════════════════════════════════════════
//  RELATÓRIO PDF — Project Wagner BI
//  Edite este arquivo para mudar o visual/conteúdo do relatório.
//  Não é necessário tocar em core.js, index.html ou qualquer
//  outro arquivo para alterar a apresentação.
//
//  Acessa dados via: window.lastData, window.projectInfo
//  Utilitário de moeda: window.fmoney(valor)
//
//  Para adicionar um slide: copie um bloco .slide existente
//  e adicione dentro do template `html` abaixo.
// ═══════════════════════════════════════════════════════════════

window.generatePPTX = function () {
  const d  = window.lastData;
  const pi = window.projectInfo;

  if (!d || !d.total) {
    window.showToast('Carregue dados antes de gerar o relatório', 'warning');
    return;
  }

  window.showToast('Preparando relatório PDF...', 'info');

  const hoje     = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const vpct     = parseFloat(d.varPct);
  const usedN    = parseFloat(d.usedPct);
  const fmoney   = window.fmoney;

  // ── Linhas da tabela de atividades ─────────────────────────
  const maxR = Math.min(d.rows.length, 14);
  let tblRows = '';
  for (let i = 0; i < maxR; i++) {
    const r    = d.rows[i];
    const stBg = r.st === 'Concluído' ? '#e3f2fd' : r.st === 'Em dia' ? '#e8f5e9' : r.st === 'Atrasado' ? '#ffebee' : '#fff8e1';
    const stCl = r.st === 'Concluído' ? '#1565C0' : r.st === 'Em dia' ? '#2E7D32' : r.st === 'Atrasado' ? '#C62828' : '#E65100';
    const stIc = r.st === 'Concluído' ? 'fa-check-circle' : r.st === 'Em dia' ? 'fa-clock' : r.st === 'Atrasado' ? 'fa-exclamation-circle' : 'fa-hourglass-start';
    const cRCl = r.cR > r.cP ? 'color:#C62828;font-weight:700' : '';
    tblRows += `<tr style="background:${i % 2 === 0 ? '#fff' : '#f6f4f0'}">
      <td style="padding:5px 10px;font-size:10.5px;border-bottom:1px solid #e2ddd0">${r.atv}</td>
      <td style="padding:5px 10px;font-size:10.5px;border-bottom:1px solid #e2ddd0;color:#6C757D">${r.resp}</td>
      <td style="padding:5px 10px;font-size:10.5px;border-bottom:1px solid #e2ddd0;text-align:center">${r.fimP}</td>
      <td style="padding:5px 10px;font-size:10.5px;border-bottom:1px solid #e2ddd0;text-align:right">${fmoney(r.cP)}</td>
      <td style="padding:5px 10px;font-size:10.5px;border-bottom:1px solid #e2ddd0;text-align:right;${cRCl}">${fmoney(r.cR)}</td>
      <td style="padding:5px 10px;font-size:10.5px;border-bottom:1px solid #e2ddd0;text-align:center;font-weight:700">${r.prog}%</td>
      <td style="padding:5px 10px;font-size:10.5px;border-bottom:1px solid #e2ddd0">
        <span style="background:${stBg};color:${stCl};padding:2px 9px;border-radius:20px;font-size:9.5px;font-weight:700;display:inline-flex;align-items:center;gap:4px">
          <i class="fas ${stIc}" style="font-size:9px"></i>${r.st}
        </span>
      </td>
    </tr>`;
  }
  if (d.rows.length > 14) {
    tblRows += `<tr><td colspan="7" style="padding:5px 10px;font-size:9px;color:#aaa;font-style:italic;text-align:center">* Exibindo ${maxR} de ${d.rows.length} atividades</td></tr>`;
  }

  // ── Helper: barra de progresso para slide de status ─────────
  const bar = (val, tot, cor) => {
    const pct = tot > 0 ? Math.round(val / tot * 100) : 0;
    return `<div style="display:flex;align-items:center;gap:12px;flex:1">
      <div style="flex:1;height:8px;background:#ddd8ca;border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${cor};border-radius:4px"></div>
      </div>
      <span style="font-size:12px;font-weight:700;color:${cor};min-width:32px;text-align:right">${pct}%</span>
    </div>`;
  };

  // ════════════════════════════════════════════════════════════
  //  TEMPLATE DO RELATÓRIO
  //  Cada .slide = 1 página A4 landscape (297×210mm)
  //  Para adicionar slides: copie um bloco e edite.
  //  Para mudar cores: altere os valores inline ou os :root vars
  //  no <style> abaixo.
  // ════════════════════════════════════════════════════════════
  const html = `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<title>Relatório — ${pi.nome || 'Projeto'}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
/* ── RESET ── */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#e8eaf0;color:#1A1F1E}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}

/* ── SLIDE BASE ── */
.slide{
  width:297mm;height:210mm;position:relative;overflow:hidden;
  page-break-after:always;page-break-inside:avoid;
  background:#fff;margin:0 auto 20px;
  box-shadow:0 4px 40px rgba(0,0,0,.15)
}
.slide:last-child{page-break-after:auto}

@media print{
  body{background:#fff;margin:0}
  .slide{margin:0;box-shadow:none}
  .no-print{display:none!important}
}
@page{size:A4 landscape;margin:0}

/* ── COMPONENTES REUTILIZÁVEIS ── */
/* Faixa de cabeçalho navy (usada em todos os slides exceto capa) */
.hband{
  position:absolute;top:0;left:0;right:0;height:56px;
  background:#0B1E33;display:flex;align-items:center;padding:0 32px;gap:12px
}
.hband-icon{width:32px;height:32px;border-radius:8px;background:rgba(196,163,90,.18);display:flex;align-items:center;justify-content:center;color:#C4A35A;font-size:14px;flex-shrink:0}
.hband h2{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#fff;flex:1;letter-spacing:.03em}
.hband .slide-badge{background:rgba(255,255,255,.10);color:rgba(255,255,255,.65);padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600}

/* Faixa de rodapé */
.slide-foot{
  position:absolute;bottom:0;left:0;right:0;height:32px;
  background:#F5F2EC;border-top:1px solid #ddd8ca;
  display:flex;align-items:center;padding:0 28px;gap:8px
}
.slide-foot .brand{font-size:9.5px;color:#9CA3AF;display:flex;align-items:center;gap:5px}
.slide-foot .brand i{color:#C4A35A;font-size:9px}
.slide-foot .pnum{margin-left:auto;font-size:9.5px;color:#CCC;font-weight:600}

/* Listra gold lateral */
.gold-stripe{position:absolute;left:0;top:0;width:6px;height:100%;background:linear-gradient(180deg,#C4A35A,#A88840)}

/* ── SLIDE 1: CAPA ── */
.capa{background:#0B1E33;display:flex}
.capa-left{
  width:62%;height:100%;
  background:linear-gradient(145deg,#091929 0%,#0B1E33 60%,#0F2A40 100%);
  display:flex;flex-direction:column;justify-content:space-between;
  padding:36px 44px 28px;position:relative;overflow:hidden
}
.capa-left::after{content:'';position:absolute;top:-80px;left:-60px;width:260px;height:260px;background:radial-gradient(circle,rgba(196,163,90,.08) 0%,transparent 70%);border-radius:50%}
.capa-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(196,163,90,.10);border:1px solid rgba(196,163,90,.25);
  color:#C4A35A;padding:6px 16px;border-radius:30px;
  font-size:9.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;
  width:fit-content;position:relative;z-index:1
}
.capa-center{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:center;padding:20px 0}
.capa-label{font-size:10px;font-weight:600;color:rgba(255,255,255,.35);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}
.capa-projeto{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:300;color:#fff;line-height:1.1;margin-bottom:14px;letter-spacing:.02em}
.capa-status-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(39,174,96,.18);border:1px solid rgba(39,174,96,.30);color:#4dd98a;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:600}
.capa-foot{display:flex;align-items:flex-end;justify-content:space-between;position:relative;z-index:1;padding-top:16px;border-top:1px solid rgba(255,255,255,.07)}
.capa-foot-date{display:flex;align-items:center;gap:7px;font-size:10.5px;color:rgba(255,255,255,.35)}
.capa-foot-date i{color:rgba(196,163,90,.55)}
.capa-foot-resp-name{font-size:13px;font-weight:600;color:rgba(255,255,255,.80);display:flex;align-items:center;gap:6px;justify-content:flex-end}
.capa-foot-resp-name i{color:#C4A35A}
.capa-right{
  width:38%;height:100%;
  background:linear-gradient(160deg,#C4A35A 0%,#A88840 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:36px 32px;position:relative;overflow:hidden
}
.capa-right::before{content:'';position:absolute;top:-80px;right:-80px;width:280px;height:280px;background:rgba(255,255,255,.08);border-radius:50%}
.capa-right-icon-wrap{width:70px;height:70px;border-radius:20px;background:rgba(11,30,51,.15);display:flex;align-items:center;justify-content:center;margin-bottom:22px;position:relative;z-index:1}
.capa-right-icon-wrap i{font-size:28px;color:#0B1E33}
.capa-inst{position:relative;z-index:1;text-align:center}
.capa-inst-label{font-size:9.5px;font-weight:600;color:rgba(11,30,51,.50);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px}
.capa-inst-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#0B1E33;line-height:1.25;text-align:center}
.capa-right-brand{position:absolute;bottom:24px;font-size:9px;font-weight:600;color:rgba(11,30,51,.38);letter-spacing:1px;text-transform:uppercase;z-index:1;display:flex;align-items:center;gap:5px}

/* ── SLIDE 2: KPIs ── */
.kpi-slide{background:#F5F2EC;padding-top:56px;padding-bottom:32px}
.kpi-grid-pdf{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:14px 28px 0}
.kpi-box{background:#fff;border-radius:12px;padding:18px 16px 15px;border:1px solid #ddd8ca;position:relative;overflow:hidden}
.kpi-box::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--c)}
.kpi-icon-pdf{width:38px;height:38px;border-radius:10px;background:var(--csoft);display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.kpi-icon-pdf i{font-size:15px;color:var(--c)}
.kpi-val{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1A1F1E;margin-bottom:3px;line-height:1}
.kpi-lbl{font-size:10px;color:#9CA3AF;font-weight:500;line-height:1.3}
.kpi-sub-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px 28px 0}
.kpi-sub{background:#fff;border-radius:10px;border:1px solid #ddd8ca;padding:10px 12px;text-align:center}
.kpi-sub-val{font-size:18px;font-weight:700;margin-bottom:2px;font-family:'Cormorant Garamond',serif}
.kpi-sub-lbl{font-size:9.5px;color:#9CA3AF}
.var-band{margin:10px 28px 0;background:#fff;border-radius:8px;border:1px solid #ddd8ca;padding:9px 16px;display:flex;align-items:center;gap:10px;font-size:11.5px}

/* ── SLIDE 3: STATUS ── */
.status-slide{background:#fff;padding-top:56px;padding-bottom:32px}
.status-list{padding:16px 28px 0;display:flex;flex-direction:column;gap:14px}
.srow{background:#F5F2EC;border-radius:12px;border:1px solid #ddd8ca;border-left:5px solid var(--c);padding:16px 20px;display:flex;align-items:center;gap:20px}
.srow-ico{width:42px;height:42px;border-radius:10px;background:var(--csoft);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.srow-ico i{font-size:16px;color:var(--c)}
.srow-text{width:160px;flex-shrink:0}
.srow-title{font-size:14px;font-weight:700;color:#1A1F1E}
.srow-sub{font-size:11px;color:#9CA3AF;margin-top:2px}

/* ── SLIDE 5: RISCOS ── */
.risk-slide{background:#F5F2EC;padding-top:56px;padding-bottom:32px}
.risk-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 28px 0}
.rbox{background:#fff;border-radius:12px;border:1px solid #ddd8ca;border-top:4px solid var(--c);padding:18px 20px}
.rbox-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.rbox-ico{width:34px;height:34px;border-radius:9px;background:var(--csoft);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rbox-ico i{font-size:14px;color:var(--c)}
.rbox-title{font-size:13px;font-weight:700;color:#1A1F1E}
.rbox-text{font-size:11.5px;color:#6C757D;line-height:1.6;padding-left:44px}

/* ── SLIDE 6: ENCERRAMENTO ── */
.closing{background:#0B1E33;display:flex}
.closing-left{width:58%;display:flex;flex-direction:column;justify-content:center;padding:50px 52px;position:relative;overflow:hidden}
.closing-left::before{content:'';position:absolute;top:-60px;left:-40px;width:220px;height:220px;background:radial-gradient(circle,rgba(196,163,90,.08) 0%,transparent 70%);border-radius:50%}
.closing-obg{font-family:'Cormorant Garamond',serif;font-size:56px;font-weight:300;color:#fff;line-height:1;margin-bottom:16px;position:relative;z-index:1;letter-spacing:.02em}
.closing-sub{font-size:13px;color:rgba(255,255,255,.45);line-height:1.6;max-width:360px;position:relative;z-index:1}
.closing-right{width:42%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;background:rgba(0,0,0,.15);position:relative;overflow:hidden}
.closing-right::before{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;background:rgba(255,255,255,.03);border-radius:50%}
.closing-inst-chip{background:#C4A35A;color:#0B1E33;border-radius:16px;padding:10px 24px;font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;text-align:center;position:relative;z-index:1;max-width:260px;line-height:1.3}
.closing-date{margin-top:18px;font-size:11px;color:rgba(255,255,255,.28);display:flex;align-items:center;gap:6px;position:relative;z-index:1}
.closing-date i{color:rgba(196,163,90,.45)}
.closing-brand{position:absolute;bottom:24px;left:52px;font-size:9px;color:rgba(255,255,255,.18);letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:5px;z-index:1}

/* ── BOTÃO IMPRIMIR ── */
#print-btn{
  position:fixed;bottom:28px;right:28px;
  background:#0B1E33;color:#C4A35A;
  border:1px solid rgba(196,163,90,.4);
  padding:13px 26px;border-radius:50px;
  font-family:'Inter',sans-serif;font-size:14px;font-weight:600;
  cursor:pointer;box-shadow:0 8px 28px rgba(11,30,51,.40);
  display:flex;align-items:center;gap:9px;z-index:9999;transition:all .2s
}
#print-btn:hover{background:#153450;transform:translateY(-2px)}
</style>
</head>
<body>

<!-- ═══════════ SLIDE 1 — CAPA ═══════════ -->
<div class="slide capa">
  <div class="capa-left">
    <div>
      <div class="capa-badge"><i class="fas fa-chart-line"></i>Project Wagner BI · Relatório de Status</div>
    </div>
    <div class="capa-center">
      <div class="capa-label">Projeto</div>
      <div class="capa-projeto">${pi.nome || 'Relatório de Status'}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
        <div class="capa-status-chip"><i class="fas fa-circle-dot"></i>Em andamento</div>
        <span style="font-size:11px;color:rgba(255,255,255,.40)">${d.total} atividades · ${d.concluidas} concluídas</span>
      </div>
    </div>
    <div class="capa-foot">
      <div class="capa-foot-date"><i class="fas fa-calendar-day"></i>${hoje}</div>
      ${pi.responsavel ? `<div><div style="font-size:9px;color:rgba(255,255,255,.28);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">Responsável</div><div class="capa-foot-resp-name"><i class="fas fa-user-tie"></i>${pi.responsavel}</div></div>` : ''}
    </div>
  </div>
  <div class="capa-right">
    <div class="capa-right-icon-wrap"><i class="fas fa-building-columns"></i></div>
    <div class="capa-inst">
      <div class="capa-inst-label">Instituição</div>
      <div class="capa-inst-name">${pi.instituicao || '—'}</div>
    </div>
    <div class="capa-right-brand"><i class="fas fa-chart-mixed"></i>Project Wagner BI</div>
  </div>
</div>

<!-- ═══════════ SLIDE 2 — RESUMO EXECUTIVO ═══════════ -->
<div class="slide kpi-slide">
  <div class="gold-stripe"></div>
  <div class="hband">
    <div class="hband-icon"><i class="fas fa-gauge-high"></i></div>
    <h2>Resumo Executivo</h2>
    <div class="slide-badge"><i class="fas fa-calendar-check"></i> ${hoje}</div>
  </div>
  <div class="kpi-grid-pdf">
    <div class="kpi-box" style="--c:#0B1E33;--csoft:rgba(196,163,90,0.10)">
      <div class="kpi-icon-pdf"><i class="fas fa-coins"></i></div>
      <div class="kpi-val">${fmoney(d.totalPrev)}</div>
      <div class="kpi-lbl">Orçamento Previsto</div>
    </div>
    <div class="kpi-box" style="--c:${vpct > 0 ? '#C62828' : '#2E7D32'};--csoft:${vpct > 0 ? '#FFEBEE' : '#E8F5E9'}">
      <div class="kpi-icon-pdf"><i class="fas fa-sack-dollar"></i></div>
      <div class="kpi-val">${fmoney(d.totalReal)}</div>
      <div class="kpi-lbl">Custo Real Acumulado</div>
    </div>
    <div class="kpi-box" style="--c:#1565C0;--csoft:#E3F2FD">
      <div class="kpi-icon-pdf"><i class="fas fa-chart-pie"></i></div>
      <div class="kpi-val">${d.avgProg}%</div>
      <div class="kpi-lbl">Progresso Médio</div>
    </div>
    <div class="kpi-box" style="--c:#E65100;--csoft:#FFF3E0">
      <div class="kpi-icon-pdf"><i class="fas fa-list-check"></i></div>
      <div class="kpi-val">${d.total}</div>
      <div class="kpi-lbl">Total de Atividades</div>
    </div>
  </div>
  <div class="kpi-sub-row">
    <div class="kpi-sub"><div class="kpi-sub-val" style="color:#2E7D32">${d.concluidas}</div><div class="kpi-sub-lbl">Concluídas</div></div>
    <div class="kpi-sub"><div class="kpi-sub-val" style="color:#1565C0">${d.emAndamento}</div><div class="kpi-sub-lbl">Em andamento</div></div>
    <div class="kpi-sub"><div class="kpi-sub-val" style="color:#E65100">${d.naoIniciados}</div><div class="kpi-sub-lbl">Não iniciadas</div></div>
    <div class="kpi-sub"><div class="kpi-sub-val" style="color:#C62828">${d.sobreOrcamento}</div><div class="kpi-sub-lbl">Acima do orçamento</div></div>
  </div>
  <div class="var-band">
    <i class="fas fa-${vpct > 0 ? 'arrow-trend-up' : 'arrow-trend-down'}" style="color:${vpct > 0 ? '#C62828' : '#2E7D32'}"></i>
    <span style="font-weight:700;color:${vpct > 0 ? '#C62828' : '#2E7D32'}">Variação orçamentária: ${Math.abs(d.varPct)}% ${vpct > 0 ? 'acima' : 'abaixo'} do previsto</span>
    <span style="margin-left:auto;color:#9CA3AF;font-size:10.5px">${usedN}% do orçamento utilizado</span>
  </div>
  <div class="slide-foot"><div class="brand"><i class="fas fa-chart-mixed"></i>Project Wagner BI</div><div class="pnum">2 / 6</div></div>
</div>

<!-- ═══════════ SLIDE 3 — STATUS DOS PRAZOS ═══════════ -->
<div class="slide status-slide">
  <div class="gold-stripe"></div>
  <div class="hband">
    <div class="hband-icon"><i class="fas fa-calendar-xmark"></i></div>
    <h2>Status dos Prazos</h2>
    <div class="slide-badge">${d.total} atividades analisadas</div>
  </div>
  <div class="status-list">
    <div class="srow" style="--c:#2E7D32;--csoft:#E8F5E9">
      <div class="srow-ico"><i class="fas fa-circle-check"></i></div>
      <div class="srow-text"><div class="srow-title">Em Dia</div><div class="srow-sub">${d.emDia} atividade${d.emDia !== 1 ? 's' : ''}</div></div>
      ${bar(d.emDia, d.total, '#2E7D32')}
    </div>
    <div class="srow" style="--c:#C62828;--csoft:#FFEBEE">
      <div class="srow-ico"><i class="fas fa-triangle-exclamation"></i></div>
      <div class="srow-text"><div class="srow-title">Atrasadas</div><div class="srow-sub">${d.atrasados} atividade${d.atrasados !== 1 ? 's' : ''}</div></div>
      ${bar(d.atrasados, d.total, '#C62828')}
    </div>
    <div class="srow" style="--c:#E65100;--csoft:#FFF3E0">
      <div class="srow-ico"><i class="fas fa-hourglass-start"></i></div>
      <div class="srow-text"><div class="srow-title">Não Iniciadas</div><div class="srow-sub">${d.naoIniciados} atividade${d.naoIniciados !== 1 ? 's' : ''}</div></div>
      ${bar(d.naoIniciados, d.total, '#E65100')}
    </div>
  </div>
  <div class="slide-foot"><div class="brand"><i class="fas fa-chart-mixed"></i>Project Wagner BI</div><div class="pnum">3 / 6</div></div>
</div>

<!-- ═══════════ SLIDE 4 — TABELA DE ATIVIDADES ═══════════ -->
<div class="slide" style="background:#fff;padding-top:56px;padding-bottom:32px">
  <div class="gold-stripe"></div>
  <div class="hband">
    <div class="hband-icon"><i class="fas fa-table-list"></i></div>
    <h2>Detalhamento das Atividades</h2>
    <div class="slide-badge">${d.rows.length} registros</div>
  </div>
  <div style="padding:12px 28px 0;overflow:hidden">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#0B1E33">
        <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#fff;text-align:left">Atividade</th>
        <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#fff;text-align:left">Responsável</th>
        <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#fff;text-align:center">Término Prev.</th>
        <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#fff;text-align:right">Custo Prev.</th>
        <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#fff;text-align:right">Custo Real</th>
        <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#fff;text-align:center">%</th>
        <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#fff;text-align:left">Status</th>
      </tr></thead>
      <tbody>${tblRows}</tbody>
    </table>
  </div>
  <div class="slide-foot"><div class="brand"><i class="fas fa-chart-mixed"></i>Project Wagner BI</div><div class="pnum">4 / 6</div></div>
</div>

<!-- ═══════════ SLIDE 5 — RISCOS E INSIGHTS ═══════════ -->
<div class="slide risk-slide">
  <div class="gold-stripe"></div>
  <div class="hband">
    <div class="hband-icon"><i class="fas fa-shield-halved"></i></div>
    <h2>Riscos e Insights</h2>
    <div class="slide-badge">Análise automática</div>
  </div>
  <div class="risk-grid">
    <div class="rbox" style="--c:#C62828;--csoft:#FFEBEE">
      <div class="rbox-head"><div class="rbox-ico"><i class="fas fa-triangle-exclamation"></i></div><div class="rbox-title">Riscos Financeiros</div></div>
      <div class="rbox-text">${d.sobreOrcamento} atividade${d.sobreOrcamento !== 1 ? 's' : ''} com custo real acima do previsto. Revisão orçamentária ${d.sobreOrcamento > 0 ? '<strong>recomendada</strong>' : 'não necessária no momento'}.</div>
    </div>
    <div class="rbox" style="--c:#E65100;--csoft:#FFF3E0">
      <div class="rbox-head"><div class="rbox-ico"><i class="fas fa-calendar-xmark"></i></div><div class="rbox-title">Riscos de Prazo</div></div>
      <div class="rbox-text">${d.atrasados} atividade${d.atrasados !== 1 ? 's' : ''} com prazo vencido e ainda em andamento. ${d.atrasados > 0 ? '<strong>Ação corretiva necessária.</strong>' : 'Cronograma sob controle.'}</div>
    </div>
    <div class="rbox" style="--c:#0B1E33;--csoft:rgba(196,163,90,0.10)">
      <div class="rbox-head"><div class="rbox-ico"><i class="fas fa-trophy"></i></div><div class="rbox-title">Destaque do Período</div></div>
      <div class="rbox-text">${d.destaque ? `Atividade com maior avanço: <strong>${d.destaque}</strong>.` : 'Nenhum destaque identificado neste período.'}</div>
    </div>
    <div class="rbox" style="--c:${vpct > 10 ? '#C62828' : vpct < 0 ? '#2E7D32' : '#1565C0'};--csoft:${vpct > 10 ? '#FFEBEE' : vpct < 0 ? '#E8F5E9' : '#E3F2FD'}">
      <div class="rbox-head"><div class="rbox-ico"><i class="fas fa-lightbulb"></i></div><div class="rbox-title">Performance Orçamentária</div></div>
      <div class="rbox-text">${vpct > 10 ? `Custo <strong>${d.varPct}%</strong> acima — revisão de escopo urgente.` : vpct < 0 ? `Custo <strong>${Math.abs(d.varPct)}%</strong> abaixo — eficiência positiva.` : `Execução dentro dos parâmetros esperados (variação de ${Math.abs(d.varPct)}%).`}</div>
    </div>
  </div>
  <div class="slide-foot"><div class="brand"><i class="fas fa-chart-mixed"></i>Project Wagner BI</div><div class="pnum">5 / 6</div></div>
</div>

<!-- ═══════════ SLIDE 6 — ENCERRAMENTO ═══════════ -->
<div class="slide closing">
  <div class="closing-left">
    <div class="closing-obg">Obrigado.</div>
    <div class="closing-sub">Relatório gerado automaticamente pelo <strong style="color:rgba(255,255,255,.70)">Project Wagner BI</strong>. Os dados refletem o estado da planilha no momento da geração.</div>
    <div class="closing-brand"><i class="fas fa-chart-mixed"></i>Project Wagner BI</div>
  </div>
  <div class="closing-right">
    <div class="closing-inst-chip">${pi.instituicao || 'Project Wagner BI'}</div>
    <div class="closing-date"><i class="fas fa-calendar-day"></i>${hoje}</div>
  </div>
  <div class="gold-stripe"></div>
</div>

<!-- Botão imprimir -->
<button id="print-btn" class="no-print" onclick="window.print()">
  <i class="fas fa-file-pdf"></i>Salvar como PDF
</button>
</body>
</html>`;

  // Abre o relatório em nova janela
  const win = window.open('', '_blank', 'width=1280,height=900');
  if (!win) { window.showToast('Permita pop-ups para gerar o relatório', 'warning'); return; }
  win.document.write(html);
  win.document.close();
  window.showToast('Relatório pronto! Clique em "Salvar como PDF" na nova janela.', 'success');
};
