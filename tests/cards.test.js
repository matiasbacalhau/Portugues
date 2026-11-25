import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickCards, makeCard, cardReveal, withoutAudio } from '../js/core/cards.js';
import { addWords } from '../js/core/srs.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const lexicon = load('lexicon.json');
const templates = load('templates.json');
const curriculum = load('curriculum.json');

const T0 = Date.UTC(2026, 10, 5);
const seeded = (s = 7) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const known = (m) => ({m, n: 3, last: T0});
const mastery = (tags) => ({tags: Object.fromEntries(Object.entries(tags).map(([t, m]) => [t, known(m)])), pairs: {}});
const topic = {topic: 't', tags: ['a1.ser.presente'], hides: []};

// Lemas en la SRS, cada uno agregado un minuto después del anterior (el primero es el más atrasado); `rung` opcional.
function srsOf(lemmas, extra = {}) {
  let srs = {};
  lemmas.forEach((l, i) => { srs = addWords(srs, [l], T0 + i * 60_000); });
  for (const [l, e] of Object.entries(extra)) srs[l] = {...srs[l], ...e};
  return srs;
}
const NOW = T0 + 86_400_000;
const opts = (o = {}) => ({now: NOW, rng: seeded(), lexicon, templates, topic, groupExercises: [], mastery: mastery({}), curriculum, audio: true, ...o});
const presente = {'a1.pron.sujeito': 0.8, 'a1.presente.regular': 0.5};
const genero = mastery({'a1.genero.masc': 0.5, 'a1.genero.fem': 0.5});

test('pickCards: sin vencidas, ninguna; con 5 vencidas, las 3 más atrasadas', () => {
  assert.deepEqual(pickCards(srsOf(['cama']), opts({now: T0 - 1})), []);
  const srs = srsOf(['cama', 'quarto', 'chave', 'chuveiro', 'hóspede']);
  const out = pickCards(srs, opts());
  assert.deepEqual(out.map((e) => e.vocab.lemma), ['cama', 'quarto', 'chave']);
  assert.ok(out.every((e) => e.type === 'card' && e.review && e.rung === 1));
});

test('pickCards: tema con hides article → ningún sustantivo; sí verbos', () => {
  const srs = srsOf(['cama', 'morar', 'quarto']);
  const out = pickCards(srs, opts({topic: {...topic, hides: ['article']}}));
  assert.deepEqual(out.map((e) => e.vocab.lemma), ['morar']);
});

test('pickCards: un lema que evalúa otro ítem del grupo queda afuera (noun o respuesta)', () => {
  const srs = srsOf(['cama', 'quarto', 'chuveiro']);
  const groupExercises = [
    {id: 'g1', type: 'gap', tag: 'a1.genero.fem', noun: 'cama', answers: ['a']},
    {id: 's1', type: 'situation', gaps: [{tag: 'x', answers: ['o chuveiro']}]},
  ];
  const out = pickCards(srs, opts({groupExercises}));
  assert.deepEqual(out.map((e) => e.vocab.lemma), ['quarto']);
});

test('pickCards nivel 3 de un sustantivo: plantilla del tema si hay; si no, la genérica (card_only)', () => {
  // colher (cozinha) entra en una plantilla de artículo; pousada solo en la genérica.
  const srs = srsOf(['colher', 'pousada'], {colher: {rung: 3}, pousada: {rung: 3}});
  const out = pickCards(srs, opts({mastery: genero}));
  assert.deepEqual(pickCards(srs, opts()), []);
  assert.equal(out.length, 2);
  for (const e of out) {
    assert.equal(e.type, 'gap');
    assert.equal(e.tag, 'a1.genero.fem');
    assert.equal(e.review, true);
    assert.ok(e.id.startsWith('card3:'));
    assert.deepEqual(e.vocab, {lemma: e.noun, rung: 3, mode: 'read'});
    assert.deepEqual(e.answers, ['a']);
  }
  assert.ok(!out[0].id.includes('tpl-art-olha'));
  assert.match(out[1].text, /^Olha só: aqui está ___ pousada!$/);
});

test('pickCards nivel 3: si el tag es del tema del grupo, no entra; un tag bloqueado tampoco', () => {
  const srs = srsOf(['pousada'], {pousada: {rung: 3}});
  assert.equal(pickCards(srs, opts({mastery: genero})).length, 1);
  assert.deepEqual(pickCards(srs, opts({mastery: genero, topic: {...topic, tags: ['a1.genero.fem']}})), []);
  // sofá entra en la plantilla de contracción (a1.contr.em, bloqueada sin el género) y en la de artículo.
  const sofa = srsOf(['sofá'], {'sofá': {rung: 3}});
  const tags = Array.from({length: 30}, (_, s) => pickCards(sofa, opts({mastery: genero, rng: seeded(s * 7919 + 13)}))[0].tag);
  assert.ok(tags.every((t) => t === 'a1.genero.masc'));
  const open = mastery({'a1.genero.masc': 0.8, 'a1.genero.fem': 0.8, 'a1.contr.em': 0.3});
  const all = Array.from({length: 30}, (_, s) => pickCards(sofa, opts({mastery: open, rng: seeded(s * 7919 + 13)}))[0].tag);
  assert.ok(all.includes('a1.contr.em'));
});

test('pickCards nivel 3 de un verbo: hueco con present() si el presente está desbloqueado; si no, tarjeta de nivel 2', () => {
  const srs = srsOf(['morar'], {morar: {rung: 3}});
  const [gap] = pickCards(srs, opts({mastery: mastery(presente)}));
  assert.equal(gap.type, 'gap');
  assert.equal(gap.generated, true);
  assert.equal(gap.tag, 'a1.presente.regular');
  assert.match(gap.text, /^(Eu|Você|Nós|Vocês) ___ \(morar\) …$/);
  assert.ok(['moro', 'mora', 'moramos', 'moram'].includes(gap.answers[0]));
  assert.deepEqual(gap.vocab, {lemma: 'morar', rung: 3, mode: 'read'});
  const [card] = pickCards(srs, opts());
  assert.deepEqual([card.type, card.rung, card.vocab.rung], ['card', 2, 2]);
});

test('pickCards: sin audio nunca escuchando; con audio, solo en niveles con la escucha habilitada', () => {
  const unlocked = {listenUnlocked: {1: true, 2: true}};
  const srs = srsOf(['cama', 'quarto', 'chave'], {cama: unlocked, quarto: {...unlocked, rung: 2}});
  const modes = (audio) => Array.from({length: 40}, (_, s) => pickCards(srs, opts({audio, rng: seeded(s * 7919 + 13)}))).flat();
  assert.ok(modes(false).every((e) => e.vocab.mode === 'read'));
  const withAudio = modes(true);
  assert.ok(withAudio.some((e) => e.vocab.mode === 'listen'));
  assert.ok(withAudio.some((e) => e.vocab.lemma === 'cama' && e.vocab.mode === 'read'));
  assert.ok(withAudio.filter((e) => e.vocab.lemma === 'chave').every((e) => e.vocab.mode === 'read'));
});

test('pickCards nivel 3 de un verbo: un sujeto por forma; la de vocês/eles sale con "Vocês"', () => {
  const srs = srsOf(['morar'], {morar: {rung: 3}});
  const gaps = Array.from({length: 60}, (_, s) => pickCards(srs, opts({mastery: mastery(presente), rng: seeded(s * 7919 + 13)}))[0]);
  const plural = gaps.find((g) => g.dims.person === 'eles');
  assert.ok(plural);
  assert.equal(plural.text, 'Vocês ___ (morar) …');
  assert.deepEqual(plural.answers, ['moram']);
  assert.deepEqual(gaps.find((g) => g.dims.person === 'ele').answers, ['mora']);
});

test('pickCards nivel 3 de ser: tag a1.ser.presente, que queda afuera en los grupos de ese tema', () => {
  const srs = srsOf(['ser'], {ser: {rung: 3}});
  const m = mastery({...presente, 'a1.ser.presente': 0.5});
  const [gap] = pickCards(srs, opts({mastery: m, topic: {...topic, tags: []}}));
  assert.equal(gap.tag, 'a1.ser.presente');
  assert.deepEqual(pickCards(srs, opts({mastery: m, topic: {...topic, tags: ['a1.ser.presente']}})), []);
});

test('pickCards: un verbo cuya forma conjugada evalúa otro ítem del grupo queda afuera', () => {
  const srs = srsOf(['ser', 'morar']);
  const groupExercises = [{id: 'g1', type: 'gap', tag: 'a1.ser.presente', answers: ['sou']}];
  assert.deepEqual(pickCards(srs, opts({groupExercises})).map((e) => e.vocab.lemma), ['morar']);
  const mora = [{id: 's1', type: 'situation', gaps: [{tag: 'x', answers: ['mora']}]}];
  assert.deepEqual(pickCards(srs, opts({groupExercises: mora})).map((e) => e.vocab.lemma), ['ser']);
});

test('pickCards: una palabra del glosario no sale, ni en el dictado de nivel 3 de otra palabra', () => {
  const srs = srsOf(['cama', 'quarto', 'chuveiro']);
  assert.deepEqual(pickCards(srs, opts({glossary: ['cama']})).map((e) => e.vocab.lemma), ['quarto', 'chuveiro']);
  const s3 = srsOf(['chuveiro'], {chuveiro: {rung: 3, listenUnlocked: {3: true}}});
  const pool = [{text: 'A cama e o chuveiro.', lemmas: ['cama', 'chuveiro']}];
  for (let s = 1; s < 20; s++) {
    const [ex] = pickCards(s3, opts({glossary: ['cama'], pool, rng: seeded(s)}));
    assert.notEqual(ex?.type, 'dictation');
  }
});

test('makeCard nivel 1: un sustantivo nunca lleva distractores de verbos si hay sustantivos de sobra', () => {
  const posOf = new Map();
  for (const w of lexicon) posOf.set(w.es, [...(posOf.get(w.es) ?? []), w.pos]);
  const nouns = lexicon.filter((w) => w.pos === 'noun');
  for (const word of nouns) {
    for (let s = 1; s < 6; s++) {
      const ex = makeCard(word, {rung: 1, mode: 'read', lexicon, rng: seeded(s)});
      for (const o of ex.options.filter((x) => !x.correct)) assert.ok(posOf.get(o.text).includes('noun'), `${word.lemma}: ${o.text}`);
    }
  }
});

test('cardReveal: imagen y etiqueta solo tras acertar, en los dos niveles', () => {
  const noun = {lemma: 'chave', article: 'a', es: 'llave', pos: 'noun', image: '1F511'};
  const verb = {lemma: 'morar', es: 'vivir', pos: 'verb'};
  const ok = [{ok: true}];
  const bad = [{ok: false}];
  assert.deepEqual(cardReveal({type: 'card', rung: 1, word: noun}, ok), {picture: true, pt: 'a chave', label: 'a chave · llave'});
  assert.deepEqual(cardReveal({type: 'card', rung: 2, word: noun}, ok), {picture: true, pt: 'a chave', label: 'a chave · llave'});
  assert.deepEqual(cardReveal({type: 'card', rung: 1, word: verb}, ok), {picture: true, pt: 'morar', label: 'morar · vivir'});
  for (const rung of [1, 2]) assert.deepEqual(cardReveal({type: 'card', rung, word: noun}, bad), {picture: false, pt: null, label: null});
});

test('withoutAudio: la situación de escucha se saltea (null), como el dictado', () => {
  assert.equal(withoutAudio({id: 's', type: 'situation', listen: true}, {lexicon}), null);
  const seen = {id: 's', type: 'situation'};
  assert.equal(withoutAudio(seen, {lexicon}), seen);
});
