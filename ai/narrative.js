// ═══════════════════════════════════════════════════════════════
//  NARRATIVE ENGINE — Project Wagner BI
//  Análise executiva 100% local. Zero API. Zero custo.
//  Funciona offline, pode ser compartilhado livremente.
//
//  Como funciona:
//    Lê window.lastData + window.projectInfo e monta um parágrafo
//    executivo real combinando métricas, limiares, variações e
//    vocabulário gerencial rotativo. Cada chamada gera um texto
//    diferente, contextualizado com os dados reais do projeto.
// ═══════════════════════════════════════════════════════════════

// ── VOCABULÁRIO ROTATIVO ──────────────────────────────────────
// Arrays de sinônimos que variam a cada chamada para o texto
// nunca parecer repetitivo.

const V = {
  abertura: [
    'd', // será preenchido dinamicamente
  ],
  conectivo_adicao: ['Além disso,', 'Adicionalmente,', 'Complementarmente,', 'Cabe destacar que', 'Importa registrar que'],
  conectivo_contraste: ['No entanto,', 'Todavia,', 'Em contrapartida,', 'Por outro lado,', 'Contudo,'],
  conectivo_conclusao: ['Diante desse cenário,', 'Nesse contexto,', 'À luz dos indicadores,', 'Com base nessa análise,', 'Considerando o conjunto dos dados,'],
  recomendacao_prefixo: [
    'recomenda-se',
    'sugere-se',
    'é prioritário',
    'a ação imediata indicada é',
    'o próximo passo crítico é',
  ],
  projeto_sinonimo: ['projeto', 'iniciativa', 'empreendimento', 'programa'],
  equipe_sinonimo: ['equipe', 'time', 'grupo de trabalho'],
  // saúde ótima
  saude_otima: [
    'apresenta indicadores sólidos em todas as dimensões monitoradas',
    'demonstra maturidade de execução acima do esperado para esta fase',
    'mantém desempenho consistente com os objetivos estratégicos definidos',
    'está em trajetória favorável, com métricas alinhadas ao plano-base',
  ],
  // saúde média
  saude_media: [
    'apresenta desempenho parcialmente alinhado ao plano-base',
    'registra sinais mistos que merecem atenção da gestão',
    'está em zona de atenção, com indicadores que demandam acompanhamento próximo',
    'exige monitoramento reforçado para evitar escalada dos desvios identificados',
  ],
  // saúde crítica
  saude_critica: [
    'encontra-se em situação crítica, com múltiplos indicadores fora dos limites aceitáveis',
    'está em zona de risco elevado, exigindo intervenção imediata da liderança',
    'apresenta desvios significativos que comprometem a entrega dentro dos parâmetros acordados',
    'demanda ação corretiva urgente para reversão do quadro atual',
  ],
};

// Seleciona item aleatório de um array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Formata moeda sem decimais (para narrativa)
function fm(v) {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

// ── ENGINE PRINCIPAL ──────────────────────────────────────────
function buildNarrative(d, pi) {
  const nome      = pi.nome        || 'Projeto';
  const resp      = pi.responsavel || null;
  const inst      = pi.instituicao || null;
  const proj      = pick(V.projeto_sinonimo);
  const equipe    = pick(V.equipe_sinonimo);

  const hs        = d.healthScore  || 0;
  const cpi       = d.cpi          || 0;
  const eac       = d.eac          || 0;
  const varPct    = parseFloat(d.varPct  || 0);
  const avg       = d.avgProg       || 0;
  const total     = d.total         || 0;
  const concl     = d.concluidas    || 0;
  const atras     = d.atrasados     || 0;
  const sobreOrc  = d.sobreOrcamento || 0;
  const naoInic   = d.naoIniciados  || 0;
  const emAndamento = d.emAndamento || 0;
  const termino   = d.terminoTexto  || '—';
  const termSub   = d.terminoSubTexto || '';

  const paragrafos = [];

  // ── PARÁGRAFO 1: Abertura contextualizada ──────────────────
  // Varia o sujeito de abertura com base em quem está disponível
  const contexto = inst
    ? `O ${proj} **${nome}**, sob responsabilidade de ${resp || 'equipe designada'} em parceria com ${inst},`
    : resp
    ? `O ${proj} **${nome}**, conduzido por ${resp},`
    : `O ${proj} **${nome}**`;

  const statusSaude = hs >= 70
    ? pick(V.saude_otima)
    : hs >= 40
    ? pick(V.saude_media)
    : pick(V.saude_critica);

  paragrafos.push(`${contexto} ${statusSaude}, registrando Health Score de **${hs}/100**.`);

  // ── PARÁGRAFO 2: Financeiro + EV ──────────────────────────
  let financeiro = '';
  if (cpi > 0 && d.totalPrev > 0) {
    const cpiTexto = cpi >= 1.05
      ? `com eficiência orçamentária acima do planejado (CPI ${cpi.toFixed(2)})`
      : cpi >= 0.95
      ? `com execução orçamentária dentro dos parâmetros esperados (CPI ${cpi.toFixed(2)})`
      : cpi >= 0.80
      ? `com leve desvio orçamentário negativo (CPI ${cpi.toFixed(2)})`
      : `com desvio orçamentário preocupante (CPI ${cpi.toFixed(2)}, abaixo do limiar aceitável de 0,80)`;

    const eacComparacao = eac > d.totalPrev
      ? `A Estimativa ao Término aponta para ${fm(eac)}, **${fm(eac - d.totalPrev)} acima do orçamento base**.`
      : eac < d.totalPrev
      ? `A Estimativa ao Término (${fm(eac)}) está ${fm(d.totalPrev - eac)} abaixo do orçamento aprovado — sinal positivo de eficiência.`
      : `A Estimativa ao Término converge com o orçamento aprovado (${fm(eac)}).`;

    financeiro = `Do ponto de vista financeiro, o ${proj} está ${cpiTexto}. ${eacComparacao}`;
  } else if (d.totalPrev > 0) {
    const usedPct = d.usedPct || 0;
    financeiro = `Do ponto de vista financeiro, ${fm(d.totalReal)} foram realizados de um orçamento de ${fm(d.totalPrev)} (${usedPct}% executado).`;
  }
  if (financeiro) paragrafos.push(financeiro);

  // ── PARÁGRAFO 3: Prazo + progresso ────────────────────────
  let prazo = '';
  const conclPct = total > 0 ? Math.round((concl / total) * 100) : 0;

  if (total > 0) {
    // Abertura sobre progresso geral
    const progressoBase = avg >= 70
      ? `Com **${avg}% de progresso médio** e **${concl} de ${total} atividades concluídas** (${conclPct}%),`
      : avg >= 40
      ? `Com progresso médio de **${avg}%** e **${concl}/${total} atividades concluídas**,`
      : `Com apenas **${avg}% de progresso médio** e ${concl} atividade${concl !== 1 ? 's' : ''} concluída${concl !== 1 ? 's' : ''} de ${total},`;

    // Situação dos prazos
    let situacaoPrazo = '';
    if (atras === 0 && naoInic === 0) {
      situacaoPrazo = `todas as atividades em andamento estão dentro do prazo.`;
    } else if (atras === 0 && naoInic > 0) {
      situacaoPrazo = `os prazos estão sob controle, porém **${naoInic} atividade${naoInic !== 1 ? 's' : ''} ainda não foi${naoInic !== 1 ? 'ram' : ''} iniciada${naoInic !== 1 ? 's' : ''}**.`;
    } else if (atras > 0 && naoInic === 0) {
      situacaoPrazo = `**${atras} atividade${atras !== 1 ? 's' : ''} apresenta${atras !== 1 ? 'm' : ''} atraso**, exigindo atenção imediata da gestão.`;
    } else {
      situacaoPrazo = `**${atras} atividade${atras !== 1 ? 's' : ''} está${atras !== 1 ? 'ão' : ''} atrasada${atras !== 1 ? 's' : ''}** e ${naoInic} ainda não foi${naoInic !== 1 ? 'ram' : ''} iniciada${naoInic !== 1 ? 's' : ''}.`;
    }

    prazo = `${progressoBase} ${situacaoPrazo}`;

    // Adiciona término projetado se disponível
    if (termino !== '—') {
      const termSubFmt = termSub ? ` (${termSub})` : '';
      prazo += ` O término projetado é **${termino}**${termSubFmt}.`;
    }
  }
  if (prazo) paragrafos.push(prazo);

  // ── PARÁGRAFO 4: Riscos específicos ───────────────────────
  const riscos = [];
  if (sobreOrc > 0) {
    riscos.push(`${sobreOrc} atividade${sobreOrc !== 1 ? 's' : ''} com custo real acima do previsto`);
  }
  if (atras > 1) {
    riscos.push(`concentração de ${atras} atividades em atraso simultâneo`);
  }
  if (cpi > 0 && cpi < 0.80) {
    riscos.push(`CPI abaixo de 0,80, indicando ineficiência sistêmica na execução`);
  }
  if (naoInic > 0 && avg < 50) {
    riscos.push(`${naoInic} atividade${naoInic !== 1 ? 's' : ''} não iniciada${naoInic !== 1 ? 's' : ''} com progresso geral baixo`);
  }

  if (riscos.length > 0) {
    const add = pick(V.conectivo_adicao);
    paragrafos.push(`${add} os principais riscos identificados incluem: ${riscos.join('; ')}.`);
  }

  // ── PARÁGRAFO 5: Recomendação ──────────────────────────────
  let recomendacao = '';
  const conc = pick(V.conectivo_conclusao);
  const rec  = pick(V.recomendacao_prefixo);

  if (hs < 40 || (cpi > 0 && cpi < 0.80) || atras > 2) {
    // Crítico
    recomendacao = `${conc} ${rec} a realização imediata de uma reunião de crise com as partes interessadas, revisão do escopo e renegociação das estimativas de custo e prazo antes que os desvios se tornem irrecuperáveis.`;
  } else if (atras > 0 || sobreOrc > 0 || (cpi > 0 && cpi < 0.95)) {
    // Atenção
    const foco = atras > 0 && sobreOrc > 0
      ? `priorizar o desbloqueio das atividades atrasadas e implementar controle mais rigoroso dos custos nas frentes com desvio`
      : atras > 0
      ? `mobilizar esforços para recuperação das ${atras} atividade${atras !== 1 ? 's' : ''} em atraso, revisando alocação de recursos e identificando dependências críticas`
      : `revisar o planejamento de custos das atividades com desvio orçamentário, aplicando análise de causa-raiz para conter o avanço do CPI negativo`;
    recomendacao = `${conc} ${rec} ${foco}.`;
  } else if (naoInic > 0) {
    // Bom mas com pendências
    recomendacao = `${conc} ${rec} formalizar o início das ${naoInic} atividade${naoInic !== 1 ? 's' : ''} pendentes, garantindo que os responsáveis tenham clareza sobre escopo, prazos e recursos antes do kick-off.`;
  } else {
    // Ótimo
    recomendacao = `${conc} ${rec} manter o padrão de execução atual, documentar as boas práticas adotadas pela ${equipe} e iniciar o planejamento das próximas fases com base nas lições aprendidas.`;
  }
  paragrafos.push(recomendacao);

  // ── MONTA TEXTO FINAL ──────────────────────────────────────
  // Une os parágrafos e converte **negrito** em marcação visual
  return paragrafos.join(' ');
}

// ── TYPEWRITER COM SUPORTE A NEGRITO ──────────────────────────
// Converte **texto** → <strong>texto</strong> e exibe char a char
function typewriterRich(el, rawText, speed = 14) {
  // Converte markdown simples para HTML
  const html = rawText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  el.className  = 'ai-body';
  el.innerHTML  = '';

  // Renderiza o HTML mas anima char a char via texto plano
  // Para manter a simplicidade, insere o HTML de uma vez e
  // aplica um reveal gradual via clip-path animado
  el.innerHTML  = html;
  el.style.clipPath = 'inset(0 100% 0 0)';
  el.style.transition = 'none';

  // Conta caracteres visíveis para calcular duração
  const plain   = rawText.replace(/\*\*/g, '');
  const totalMs = plain.length * speed;

  requestAnimationFrame(() => {
    el.style.transition  = `clip-path ${totalMs}ms steps(${plain.length}, end)`;
    el.style.clipPath    = 'inset(0 0% 0 0)';
  });

  // Remove transição após completar
  setTimeout(() => {
    el.style.transition = '';
    el.style.clipPath   = '';
  }, totalMs + 100);
}

// ── INTERFACE PÚBLICA ──────────────────────────────────────────
window.generateAINarrative = function () {
  const d    = window.lastData;
  const pi   = window.projectInfo;
  const card = document.getElementById('aiNarrativeCard');
  const body = document.getElementById('aiBody');

  if (!d || !d.total) {
    window.showToast('Carregue dados antes de gerar análise', 'warning');
    return;
  }

  // Estado de carregamento (simula "pensando" por 1.2s para dar peso)
  card.classList.add('visible');
  body.className = 'ai-body loading';
  body.innerHTML = `<div class="ai-dots"><span></span><span></span><span></span></div>&nbsp; Analisando indicadores do projeto...`;

  setTimeout(() => {
    const texto = buildNarrative(d, pi);
    typewriterRich(body, texto, 12);
  }, 1200);
};

window.closeAINarrative = function () {
  document.getElementById('aiNarrativeCard').classList.remove('visible');
};
