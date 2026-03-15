// ═══════════════════════════════════════════════════════════════
//  AI NARRATIVE — Project Wagner BI
//  Arquivo: ai/narrative.js
//
//  O que faz:
//    - Sobrescreve o stub window.generateAINarrative do index.html
//    - Chama a Anthropic API com os dados de window.lastData
//    - Exibe a análise com efeito typewriter no card #aiNarrativeCard
//
//  Para personalizar o prompt, edite apenas a constante PROMPT_TEMPLATE.
//  Não é necessário tocar em nenhum outro arquivo.
// ═══════════════════════════════════════════════════════════════

// ── PROMPT (edite aqui para mudar o estilo da análise) ─────────
function buildPrompt(d, pi) {
  return `Você é um PMO sênior analisando o status de um projeto. Com base nos dados abaixo, escreva um resumo executivo em português, em 3 a 4 frases curtas e diretas. Use tom profissional de relatório gerencial. Não use bullet points nem listas. Seja específico com os números fornecidos. Finalize com uma recomendação de ação prioritária.

Projeto: ${pi.nome}
Responsável: ${pi.responsavel || '—'}
Instituição: ${pi.instituicao || '—'}
Health Score: ${d.healthScore}/100
Orçamento previsto: R$ ${Math.round(d.totalPrev).toLocaleString('pt-BR')}
Custo real: R$ ${Math.round(d.totalReal).toLocaleString('pt-BR')}
Variação orçamentária: ${d.varPct}%
CPI: ${d.cpi > 0 ? d.cpi.toFixed(2) : '—'}
EAC: R$ ${Math.round(d.eac).toLocaleString('pt-BR')}
Término projetado: ${d.terminoTexto}
Progresso médio: ${d.avgProg}%
Total de atividades: ${d.total}
Concluídas: ${d.concluidas}
Em andamento: ${d.emAndamento}
Não iniciadas: ${d.naoIniciados}
Atrasadas: ${d.atrasados}
Atividades acima do orçamento: ${d.sobreOrcamento}
Destaque: ${d.destaque || 'nenhum'}`;
}

// ── IMPLEMENTAÇÃO ───────────────────────────────────────────────
window.generateAINarrative = async function () {
  const d   = window.lastData;
  const pi  = window.projectInfo;
  const card = document.getElementById('aiNarrativeCard');
  const body = document.getElementById('aiBody');

  if (!d || !d.total) {
    window.showToast('Carregue dados antes de gerar análise', 'warning');
    return;
  }

  // Exibe card e estado de loading
  card.classList.add('visible');
  body.className = 'ai-body loading';
  body.innerHTML = `<div class="ai-dots"><span></span><span></span><span></span></div> Analisando dados do projeto com IA...`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: buildPrompt(d, pi) }]
      })
    });

    if (!resp.ok) throw new Error('API HTTP ' + resp.status);

    const data = await resp.json();
    const text = data.content?.find(b => b.type === 'text')?.text
      || 'Não foi possível gerar análise.';

    typewriter(body, text);

  } catch (e) {
    body.className = 'ai-body';
    body.innerHTML = `<span style="color:var(--danger)"><i class="fas fa-exclamation-circle"></i> Erro ao conectar com a IA. Verifique a conexão e tente novamente.</span>`;
    console.error('[AI Narrative]', e);
  }
};

window.closeAINarrative = function () {
  document.getElementById('aiNarrativeCard').classList.remove('visible');
};

// ── EFEITO TYPEWRITER ──────────────────────────────────────────
function typewriter(el, text, speed = 18) {
  el.className = 'ai-body';
  el.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    if (i < text.length) {
      el.textContent += text[i];
      i++;
    } else {
      clearInterval(timer);
    }
  }, speed);
}
