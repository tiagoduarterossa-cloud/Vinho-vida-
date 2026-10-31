'use strict';

/* ---------- Constantes ---------- */

const CHAVE = 'vinhovida.v1';
const ANO = new Date().getFullYear();

const TIPOS = {
  tinto: { nome: 'Tinto', cor: '#7b1e30' },
  branco: { nome: 'Branco', cor: '#e3cf7a' },
  rose: { nome: 'Rosé', cor: '#e89aa8' },
  espumante: { nome: 'Espumante', cor: '#d9c98f' },
  fortificado: { nome: 'Porto / Fortificado', cor: '#8a3b12' },
  sobremesa: { nome: 'Sobremesa', cor: '#c98a1b' },
  outro: { nome: 'Outro', cor: '#888888' }
};

const ESCALA = ['', 'Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto'];

const ESTADOS = {
  cedo: 'Ainda cedo',
  pronto: 'No ponto',
  ultimo: 'Último ano',
  passou: 'Passou a janela',
  sem: 'Sem janela'
};

// Regras de harmonização: tipos preferidos (com peso) e corpo ideal (1 a 5)
const PRATOS = [
  { id: 'vermelha', nome: 'Carne vermelha grelhada', tipos: { tinto: 3 }, corpo: [4, 5], taninos: [3, 5] },
  { id: 'assados', nome: 'Assados, caça, cabrito', tipos: { tinto: 3 }, corpo: [4, 5], taninos: [3, 5] },
  { id: 'porco', nome: 'Porco, leitão', tipos: { tinto: 2, espumante: 3, branco: 1 }, corpo: [2, 4] },
  { id: 'aves', nome: 'Aves, carne branca', tipos: { branco: 2, tinto: 2, rose: 1 }, corpo: [2, 3] },
  { id: 'bacalhau', nome: 'Bacalhau, peixe gordo', tipos: { branco: 3, tinto: 1 }, corpo: [3, 4] },
  { id: 'peixe', nome: 'Peixe magro, marisco', tipos: { branco: 3, espumante: 2, rose: 1 }, corpo: [1, 3], acidez: [3, 5] },
  { id: 'massas', nome: 'Massas, pizza, tomate', tipos: { tinto: 2, rose: 2 }, corpo: [2, 3], acidez: [3, 5] },
  { id: 'picante', nome: 'Picante, oriental', tipos: { branco: 2, rose: 2, espumante: 1 }, corpo: [1, 3], docura: [2, 3] },
  { id: 'queijo-curado', nome: 'Queijos curados', tipos: { fortificado: 3, tinto: 2 }, corpo: [3, 5] },
  { id: 'queijo-fresco', nome: 'Queijos frescos, de pasta mole', tipos: { branco: 3, espumante: 2 }, corpo: [2, 3] },
  { id: 'chocolate', nome: 'Chocolate, sobremesas', tipos: { fortificado: 3, sobremesa: 3 }, corpo: [3, 5], docura: [3, 5] },
  { id: 'aperitivo', nome: 'Aperitivo, entradas', tipos: { espumante: 3, branco: 2, rose: 2 }, corpo: [1, 3] }
];

/* ---------- Estado e armazenamento ---------- */

let dados = carregar();
let pratoAtivo = null;

function carregar() {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.vinhos)) return d;
    }
  } catch (e) { console.warn('Erro ao ler dados', e); }
  return { versao: 1, vinhos: [] };
}

function guardar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch (e) {
    aviso('Não foi possível guardar. Exporta uma cópia de segurança já.');
  }
  render();
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Utilitários ---------- */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function euros(v) {
  return (v || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function aviso(texto) {
  const el = $('#aviso');
  el.textContent = texto;
  el.classList.add('mostrar');
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => el.classList.remove('mostrar'), 3000);
}

function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function chaveDuplicado(v) {
  const n = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  return [n(v.produtor), n(v.nome), v.ano || 'nv'].join('|');
}

/* ---------- Lógica de vinho ---------- */

function estado(v) {
  const de = v.beberDe, ate = v.beberAte;
  if (!de && !ate) return 'sem';
  if (de && ANO < de) return 'cedo';
  if (ate && ANO > ate) return 'passou';
  if (ate && ANO === ate) return 'ultimo';
  return 'pronto';
}

const PESO_URGENCIA = { passou: 0, ultimo: 1, pronto: 2, sem: 3, cedo: 4 };

function urgencia(a, b) {
  const d = PESO_URGENCIA[estado(a)] - PESO_URGENCIA[estado(b)];
  if (d) return d;
  return (a.beberAte || 9999) - (b.beberAte || 9999);
}

function valorUnitario(v) {
  return v.valorAtual ?? v.precoCompra ?? 0;
}

// Estimativa grosseira. Serve de ponto de partida, nunca substitui a opinião do produtor ou de um crítico.
function sugerirJanela(v) {
  if (!v.ano) return null;
  const corpo = v.corpo || 3;
  const t = {
    tinto: corpo >= 4 ? [5, 15] : corpo <= 2 ? [1, 4] : [2, 8],
    branco: corpo >= 4 ? [2, 8] : [1, 4],
    rose: [0, 2],
    espumante: [1, 6],
    fortificado: [3, 30],
    sobremesa: [3, 20],
    outro: [1, 5]
  }[v.tipo || 'outro'];
  return { de: v.ano + t[0], ate: v.ano + t[1] };
}

function dentro(valor, intervalo) {
  if (!valor || !intervalo) return 0;
  if (valor >= intervalo[0] && valor <= intervalo[1]) return 1;
  const dist = valor < intervalo[0] ? intervalo[0] - valor : valor - intervalo[1];
  return dist === 1 ? 0.3 : -0.5;
}

function pontuarHarmonizacao(v, prato) {
  let p = (prato.tipos[v.tipo] || 0) * 2;
  if (p === 0) return -Infinity;
  p += dentro(v.corpo, prato.corpo) * 1.5;
  p += dentro(v.taninos, prato.taninos);
  p += dentro(v.acidez, prato.acidez);
  p += dentro(v.docura, prato.docura);
  const e = estado(v);
  if (e === 'ultimo' || e === 'passou') p += 1.5;  // dar saída ao que está a acabar
  if (e === 'pronto') p += 1;
  if (e === 'cedo') p -= 2;
  const texto = (v.harmonizacao || '').toLowerCase();
  if (prato.nome.toLowerCase().split(/[ ,]+/).some(w => w.length > 3 && texto.includes(w))) p += 2;
  return p;
}

/* ---------- Render ---------- */

function cartaoVinho(v, extra = '') {
  const e = estado(v);
  const tipo = TIPOS[v.tipo] || TIPOS.outro;
  const janela = v.beberDe || v.beberAte ? `${v.beberDe || '?'} a ${v.beberAte || '?'}` : '';
  const meta = [
    tipo.nome, v.regiao, v.castas, janela && 'Beber ' + janela, v.local && 'Local: ' + v.local
  ].filter(Boolean).map(esc).join(' · ');
  return `
    <article class="vinho">
      <div class="cor" style="background:${tipo.cor}"></div>
      <div>
        <div class="titulo">${esc(v.nome)} ${v.ano ? esc(v.ano) : 'NV'}
          <span class="etiqueta e-${e}">${ESTADOS[e]}</span>
        </div>
        <div class="meta">${v.produtor ? esc(v.produtor) + ' · ' : ''}${meta}</div>
        <div class="meta">${v.quantidade} garrafa${v.quantidade === 1 ? '' : 's'}${v.pontuacao ? ' · ' + esc(v.pontuacao) + '/5' : ''}${valorUnitario(v) ? ' · ' + euros(valorUnitario(v)) : ''}${extra}</div>
      </div>
      <div class="botoes-vinho">
        ${v.quantidade > 0 ? `<button class="btn pequeno" data-abrir="${v.id}">Abrir</button>` : ''}
        <button class="btn pequeno" data-editar="${v.id}">Editar</button>
      </div>
    </article>`;
}

function listaOuVazio(el, vinhos, vazio, extraFn) {
  el.innerHTML = vinhos.length
    ? vinhos.map(v => cartaoVinho(v, extraFn ? extraFn(v) : '')).join('')
    : `<div class="vazio">${vazio}</div>`;
}

function renderPainel() {
  const emStock = dados.vinhos.filter(v => v.quantidade > 0);
  const garrafas = emStock.reduce((s, v) => s + v.quantidade, 0);
  const valor = emStock.reduce((s, v) => s + v.quantidade * valorUnitario(v), 0);
  const urgentes = emStock.filter(v => ['ultimo', 'passou'].includes(estado(v))).sort(urgencia);
  const prontos = emStock.filter(v => estado(v) === 'pronto').sort(urgencia);
  const semJanela = emStock.filter(v => estado(v) === 'sem').length;
  const semLocal = emStock.filter(v => !v.local).length;

  $('#resumo').innerHTML = [
    [garrafas, 'garrafas'],
    [emStock.length, 'referências'],
    [euros(valor), 'valor estimado'],
    [urgentes.reduce((s, v) => s + v.quantidade, 0), 'a beber este ano'],
    [semJanela, 'sem janela definida'],
    [semLocal, 'sem localização']
  ].map(([n, r]) => `<div class="cartao"><div class="valor">${n}</div><div class="rotulo">${r}</div></div>`).join('');

  listaOuVazio($('#lista-urgente'), urgentes, 'Nada em risco. Bom sinal.');
  listaOuVazio($('#lista-pronto'), prontos.slice(0, 15),
    dados.vinhos.length ? 'Nenhuma garrafa com janela aberta.' : 'Ainda sem garrafas. Adiciona uma ou importa um CSV no separador Dados.');
}

function renderGarrafeira() {
  const texto = $('#f-texto').value.toLowerCase().trim();
  const tipo = $('#f-tipo').value;
  const est = $('#f-estado').value;
  const ordem = $('#f-ordem').value;
  const soStock = $('#f-stock').checked;

  let l = dados.vinhos.filter(v =>
    (!soStock || v.quantidade > 0) &&
    (!tipo || v.tipo === tipo) &&
    (!est || estado(v) === est) &&
    (!texto || [v.nome, v.produtor, v.castas, v.regiao, v.pais, v.local, v.aromas, v.notas, v.ano]
      .join(' ').toLowerCase().includes(texto))
  );

  const ord = {
    urgencia,
    nome: (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'),
    ano: (a, b) => (a.ano || 0) - (b.ano || 0),
    valor: (a, b) => valorUnitario(b) - valorUnitario(a),
    local: (a, b) => (a.local || 'zzz').localeCompare(b.local || 'zzz', 'pt', { numeric: true })
  }[ordem];
  l.sort(ord);
  listaOuVazio($('#lista-garrafeira'), l, 'Nenhum vinho corresponde aos filtros.');
}

function renderHarmonizar() {
  $('#pratos').innerHTML = PRATOS.map(p =>
    `<button class="btn ${pratoAtivo === p.id ? 'ativo' : ''}" data-prato="${p.id}">${esc(p.nome)}</button>`).join('');
  if (!pratoAtivo) {
    $('#sugestoes').innerHTML = '<div class="vazio">Escolhe um prato. As sugestões dão prioridade ao que já está no ponto ou a acabar a janela.</div>';
    return;
  }
  const prato = PRATOS.find(p => p.id === pratoAtivo);
  const sug = dados.vinhos
    .filter(v => v.quantidade > 0)
    .map(v => ({ v, p: pontuarHarmonizacao(v, prato) }))
    .filter(x => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, 8)
    .map(x => x.v);
  listaOuVazio($('#sugestoes'), sug, 'Nada na garrafeira encaixa bem. Preencher tipo e corpo ajuda muito.');
}

function renderHistorico() {
  const eventos = [];
  dados.vinhos.forEach(v => (v.historico || []).forEach(h => eventos.push({ v, h })));
  eventos.sort((a, b) => (b.h.data || '').localeCompare(a.h.data || ''));
  $('#lista-historico').innerHTML = eventos.length ? eventos.map(({ v, h }) => `
    <article class="vinho">
      <div class="cor" style="background:${(TIPOS[v.tipo] || TIPOS.outro).cor}"></div>
      <div>
        <div class="titulo">${esc(v.nome)} ${v.ano ? esc(v.ano) : 'NV'}</div>
        <div class="meta">${esc(h.data)}${h.ocasiao ? ' · ' + esc(h.ocasiao) : ''}${h.companhia ? ' · com ' + esc(h.companhia) : ''}${h.prato ? ' · ' + esc(h.prato) : ''}${h.nota ? ' · ' + esc(h.nota) + '/5' : ''}</div>
        ${h.comentario ? `<div class="meta">${esc(h.comentario)}</div>` : ''}
      </div>
      <div></div>
    </article>`).join('') : '<div class="vazio">Ainda nenhuma garrafa aberta. Usa o botão Abrir para registar.</div>';
}

function render() {
  renderPainel();
  renderGarrafeira();
  renderHarmonizar();
  renderHistorico();
}

/* ---------- Formulário ---------- */

function preencherSelects() {
  const opTipos = Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${t.nome}</option>`).join('');
  $('#form-vinho [name=tipo]').innerHTML = opTipos;
  $('#f-tipo').innerHTML = '<option value="">Todos os tipos</option>' + opTipos;
  const opEscala = ESCALA.map((n, i) => `<option value="${i || ''}">${n || 'Não definido'}</option>`).join('');
  ['corpo', 'taninos', 'acidez', 'docura'].forEach(c => { $(`#form-vinho [name=${c}]`).innerHTML = opEscala; });
}

const CAMPOS_NUM = ['ano', 'quantidade', 'formato', 'precoCompra', 'valorAtual', 'beberDe', 'beberAte', 'corpo', 'taninos', 'acidez', 'docura', 'pontuacao'];

function lerForm(form) {
  const fd = new FormData(form);
  const v = {};
  for (const [k, val] of fd.entries()) v[k] = CAMPOS_NUM.includes(k) ? num(val) : String(val).trim();
  return v;
}

function abrirForm(id) {
  const form = $('#form-vinho');
  form.reset();
  const v = id ? dados.vinhos.find(x => x.id === id) : null;
  $('#form-titulo').textContent = v ? 'Editar garrafa' : 'Nova garrafa';
  $('#btn-apagar').style.display = v ? '' : 'none';
  if (v) {
    for (const el of form.elements) {
      if (el.name && v[el.name] !== undefined && v[el.name] !== null) el.value = v[el.name];
    }
  } else {
    form.elements.id.value = '';
  }
  $('#dlg-vinho').showModal();
}

function guardarForm(e) {
  e.preventDefault();
  const v = lerForm(e.target);
  if (!v.nome) return;
  v.quantidade = v.quantidade ?? 0;
  if (v.beberDe && v.beberAte && v.beberDe > v.beberAte) {
    aviso('A janela está invertida: "beber a partir de" é posterior a "beber até".');
    return;
  }
  const existente = v.id && dados.vinhos.find(x => x.id === v.id);
  if (existente) {
    Object.assign(existente, v);
  } else {
    const dup = dados.vinhos.find(x => chaveDuplicado(x) === chaveDuplicado(v));
    if (dup && confirm(`Já existe "${dup.nome} ${dup.ano || 'NV'}". Somar ${v.quantidade} garrafa(s) a essa entrada?`)) {
      dup.quantidade += v.quantidade;
    } else {
      dados.vinhos.push({ ...v, id: novoId(), criadoEm: hojeISO(), historico: [] });
    }
  }
  $('#dlg-vinho').close();
  guardar();
  aviso('Guardado.');
}

/* ---------- Abrir garrafa ---------- */

function abrirGarrafa(id) {
  const v = dados.vinhos.find(x => x.id === id);
  if (!v) return;
  const form = $('#form-abrir');
  form.reset();
  form.elements.id.value = id;
  form.elements.data.value = hojeISO();
  $('#abrir-nome').textContent = `${v.nome} ${v.ano || 'NV'} (restam ${v.quantidade})`;
  $('#dlg-abrir').showModal();
}

function registarAbertura(e) {
  e.preventDefault();
  const h = lerForm(e.target);
  const v = dados.vinhos.find(x => x.id === h.id);
  if (!v) return;
  delete h.id;
  v.quantidade = Math.max(0, v.quantidade - 1);
  (v.historico = v.historico || []).push(h);
  $('#dlg-abrir').close();
  guardar();
  aviso(v.quantidade ? `Registado. Restam ${v.quantidade}.` : 'Registado. Era a última garrafa.');
}

/* ---------- CSV ---------- */

function parseCSV(texto) {
  texto = texto.replace(/^﻿/, '');
  const primeira = texto.split(/\r?\n/)[0] || '';
  const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';' : ',';
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter(l => l.some(c => c.trim()));
}

// Ordem importa: a primeira regra que corresponder ganha.
const MAPA_COLUNAS = [
  [/scan|link|image|imagem|url|average|média|media/, null],
  [/winery|producer|produtor|weingut|domaine|ch[aâ]teau/, 'produtor'],
  [/^(wine ?name|wine|nome|name|vinho|wein)$/, 'nome'],
  [/vintage|colheita|^ano$|year|jahrgang|mill[eé]sime/, 'ano'],
  [/drink ?(from|start)|beber ?de|beber a partir|trinken ab|apog[eé]e ?d[eé]but/, 'beberDe'],
  [/drink ?(until|to|by|end)|beber ?at[eé]|trinken bis|apog[eé]e ?fin/, 'beberAte'],
  [/sub ?region|appellation|denomina|^region|regi[aã]o|^r[eé]gion/, 'regiao'],
  [/country|pa[ií]s|^land$|pays/, 'pais'],
  [/wine ?type|^type$|^tipo|^color|^colour|^cor$|couleur|farbe/, 'tipo'],
  [/grape|casta|varietal|rebsorte|c[eé]page/, 'castas'],
  [/your rating|my rating|^rating$|pontua|^nota$|^note$|bewertung/, 'pontuacao'],
  [/review|tasting|notas|note|coment|kommentar/, 'notas'],
  [/quantity|^qty|quantidade|bottles|garrafas|stock|anzahl|^count$|nombre/, 'quantidade'],
  [/purchase ?price|^price|pre[cç]o|preis|prix|cost/, 'precoCompra'],
  [/value|valor|wert|valeur/, 'valorAtual'],
  [/location|local|rack|bin|cellar|lagerort|emplacement|prateleira/, 'local'],
  [/pairing|harmoniza|food|accord/, 'harmonizacao']
];

function mapearCabecalho(cab) {
  return cab.map(h => {
    const k = h.toLowerCase().trim();
    for (const [re, campo] of MAPA_COLUNAS) if (re.test(k)) return campo;
    return null;
  });
}

function normalizarTipo(t) {
  const s = String(t || '').toLowerCase();
  if (/spark|espum|champ|sekt|cava|cr[eé]mant|prosecco|mousseux/.test(s)) return 'espumante';
  if (/port|fortif|madeira|generoso|sherry|xerez|jerez|moscatel de set/.test(s)) return 'fortificado';
  if (/dessert|sobremesa|sweet|doce|sauternes|tokaj|late harvest|colheita tardia|süß|liquoreux/.test(s)) return 'sobremesa';
  if (/ros[eé]/.test(s)) return 'rose';
  if (/white|branco|wei(ß|ss)|blanc|bianco|blanco/.test(s)) return 'branco';
  if (/red|tinto|rot|rouge|rosso/.test(s)) return 'tinto';
  return 'outro';
}

function importarCSV(texto) {
  const linhas = parseCSV(texto);
  if (linhas.length < 2) { aviso('Ficheiro vazio ou ilegível.'); return; }
  const mapa = mapearCabecalho(linhas[0]);
  if (!mapa.includes('nome') && !mapa.includes('produtor')) {
    aviso('Não encontrei colunas de nome ou produtor. Confirma o ficheiro.');
    return;
  }
  const indice = new Map(dados.vinhos.map(v => [chaveDuplicado(v), v]));
  let novos = 0, juntos = 0;
  for (const linha of linhas.slice(1)) {
    const v = {};
    mapa.forEach((campo, i) => {
      const val = (linha[i] || '').trim();
      if (!campo || !val || v[campo]) return;
      v[campo] = CAMPOS_NUM.includes(campo) ? num(val) : val;
    });
    if (!v.nome && v.produtor) v.nome = v.produtor;
    if (!v.nome) continue;
    v.tipo = normalizarTipo(v.tipo);
    if (v.pontuacao > 5) v.pontuacao = Math.round(v.pontuacao / 20 * 10) / 10; // escala de 100 pontos
    const temQtd = v.quantidade !== undefined && v.quantidade !== null;
    const k = chaveDuplicado(v);
    const ex = indice.get(k);
    if (ex) {
      // Preenche só o que falta. A quantidade fica com o maior valor, porque as duas apps contam as mesmas garrafas.
      for (const [c, val] of Object.entries(v)) {
        if (c === 'quantidade') continue;
        if ((ex[c] === undefined || ex[c] === null || ex[c] === '' || (c === 'tipo' && ex.tipo === 'outro')) && val) ex[c] = val;
      }
      if (temQtd) ex.quantidade = Math.max(ex.quantidade || 0, v.quantidade);
      juntos++;
    } else {
      const nv = { ...v, quantidade: temQtd ? v.quantidade : 1, id: novoId(), criadoEm: hojeISO(), historico: [] };
      dados.vinhos.push(nv);
      indice.set(k, nv);
      novos++;
    }
  }
  guardar();
  aviso(`${novos} novos, ${juntos} juntos a entradas existentes.`);
}

function exportarCSV() {
  const campos = ['nome', 'produtor', 'ano', 'tipo', 'regiao', 'pais', 'castas', 'quantidade', 'formato', 'local',
    'precoCompra', 'valorAtual', 'beberDe', 'beberAte', 'corpo', 'taninos', 'acidez', 'docura', 'pontuacao',
    'aromas', 'harmonizacao', 'notas'];
  const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const csv = [campos.join(';')]
    .concat(dados.vinhos.map(v => campos.map(c => q(v[c])).join(';')))
    .join('\r\n');
  descarregar('﻿' + csv, `garrafeira-${hojeISO()}.csv`, 'text/csv');
}

function descarregar(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Relatório ---------- */

function relatorio() {
  const emStock = dados.vinhos.filter(v => v.quantidade > 0);
  const grupos = {};
  emStock.forEach(v => {
    const zona = (v.local || 'Sem localização').split(',')[0].trim();
    (grupos[zona] = grupos[zona] || []).push(v);
  });
  const total = emStock.reduce((s, v) => s + v.quantidade * valorUnitario(v), 0);
  const garrafas = emStock.reduce((s, v) => s + v.quantidade, 0);
  const tabelas = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt', { numeric: true })).map(z => `
    <h3>${esc(z)}</h3>
    <table>
      <tr><th>Vinho</th><th>Colheita</th><th>Produtor</th><th>Local</th><th>Qtd</th><th>Beber</th><th>Valor un.</th><th>Subtotal</th></tr>
      ${grupos[z].sort((a, b) => (a.local || '').localeCompare(b.local || '', 'pt', { numeric: true })).map(v => `
        <tr><td>${esc(v.nome)}</td><td>${esc(v.ano || 'NV')}</td><td>${esc(v.produtor)}</td><td>${esc(v.local)}</td>
        <td>${v.quantidade}</td><td>${esc(v.beberDe || '')}${v.beberAte ? '–' + esc(v.beberAte) : ''}</td>
        <td>${euros(valorUnitario(v))}</td><td>${euros(v.quantidade * valorUnitario(v))}</td></tr>`).join('')}
    </table>`).join('');
  $('#relatorio').innerHTML = `
    <h2>Inventário da garrafeira</h2>
    <p>Data: ${hojeISO()} · ${garrafas} garrafas · ${emStock.length} referências · Valor estimado: ${euros(total)}</p>
    <p>Valores baseados no valor atual indicado ou, na falta deste, no preço de compra.</p>
    ${tabelas || '<p>Sem garrafas em stock.</p>'}`;
  window.print();
}

/* ---------- Eventos ---------- */

function ligarEventos() {
  $$('.separadores button').forEach(b => b.addEventListener('click', () => {
    $$('.separadores button').forEach(x => x.classList.toggle('ativo', x === b));
    $$('.tab').forEach(t => t.classList.toggle('ativo', t.id === 'tab-' + b.dataset.tab));
    try { localStorage.setItem(CHAVE + '.tab', b.dataset.tab); } catch (e) { /* irrelevante */ }
  }));

  $('#btn-novo').addEventListener('click', () => abrirForm(null));
  $('#form-vinho').addEventListener('submit', guardarForm);
  $('#btn-cancelar').addEventListener('click', () => $('#dlg-vinho').close());
  $('#btn-apagar').addEventListener('click', () => {
    const id = $('#form-vinho').elements.id.value;
    const v = dados.vinhos.find(x => x.id === id);
    if (v && confirm(`Apagar "${v.nome}" e todo o seu histórico?`)) {
      dados.vinhos = dados.vinhos.filter(x => x.id !== id);
      $('#dlg-vinho').close();
      guardar();
    }
  });
  $('#btn-sugerir-janela').addEventListener('click', () => {
    const form = $('#form-vinho');
    const s = sugerirJanela(lerForm(form));
    if (!s) { aviso('Indica a colheita primeiro.'); return; }
    form.elements.beberDe.value = s.de;
    form.elements.beberAte.value = s.ate;
    aviso('Estimativa genérica pelo tipo e corpo. Confirma com o produtor ou um crítico.');
  });

  $('#form-abrir').addEventListener('submit', registarAbertura);
  $('#btn-abrir-cancelar').addEventListener('click', () => $('#dlg-abrir').close());

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-editar],[data-abrir],[data-prato]');
    if (!t) return;
    if (t.dataset.editar) abrirForm(t.dataset.editar);
    if (t.dataset.abrir) abrirGarrafa(t.dataset.abrir);
    if (t.dataset.prato) { pratoAtivo = pratoAtivo === t.dataset.prato ? null : t.dataset.prato; renderHarmonizar(); }
  });

  ['#f-texto', '#f-tipo', '#f-estado', '#f-ordem', '#f-stock'].forEach(s =>
    $(s).addEventListener('input', renderGarrafeira));

  $('#in-csv').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (f) importarCSV(await f.text());
    e.target.value = '';
  });
  $('#btn-backup').addEventListener('click', () =>
    descarregar(JSON.stringify(dados, null, 2), `vinhovida-copia-${hojeISO()}.json`, 'application/json'));
  $('#in-backup').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.vinhos)) throw new Error('formato');
      if (confirm(`Substituir os dados atuais por ${d.vinhos.length} vinhos da cópia?`)) { dados = d; guardar(); aviso('Cópia restaurada.'); }
    } catch (err) { aviso('Ficheiro de cópia inválido.'); }
  });
  $('#btn-csv').addEventListener('click', exportarCSV);
  $('#btn-relatorio').addEventListener('click', relatorio);
  $('#btn-apagar-tudo').addEventListener('click', () => {
    if (confirm('Apagar TODOS os vinhos e histórico? Exportaste uma cópia?') && confirm('Tens mesmo a certeza?')) {
      dados = { versao: 1, vinhos: [] };
      guardar();
    }
  });
}

/* ---------- Arranque ---------- */

async function pedirArmazenamentoPersistente() {
  const el = $('#estado-armazenamento');
  if (!navigator.storage || !navigator.storage.persist) return;
  try {
    const ok = await navigator.storage.persisted() || await navigator.storage.persist();
    el.textContent = ok
      ? 'Armazenamento persistente ativo: o navegador não apaga os dados por falta de espaço.'
      : 'O navegador pode apagar os dados se faltar espaço. Mais uma razão para exportar cópias.';
  } catch (e) { /* sem suporte */ }
}

preencherSelects();
ligarEventos();
try {
  const tab = localStorage.getItem(CHAVE + '.tab');
  if (tab) { const b = document.querySelector(`.separadores [data-tab="${tab}"]`); if (b) b.click(); }
} catch (e) { /* sem acesso */ }
render();
pedirArmazenamentoPersistente();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
