import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dictationPool, pickDictation } from '../js/core/dictation.js';
import { checkExercise } from '../js/core/checks/index.js';
import { applyCommit } from '../js/core/runner.js';
import { pickCards } from '../js/core/cards.js';
import { addWords } from '../js/core/srs.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const lexicon = load('lexicon.json');
const templates = load('templates.json');
const curriculum = load('curriculum.json');
const units = {'a1.u01': load('levels/a1/unit-01.json')};

// LCG con la semilla dispersada: así las primeras tiradas de semillas seguidas no quedan todas juntas.
const seeded = (seed = 7) => { let s = Math.imul(seed, 0x9e3779b1) >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const words = (s) => s.match(/[\p{L}\p{N}]+/gu) ?? [];

test('dictationPool: frases de hasta 8 palabras, sin huecos, con los lemas que contienen', () => {
  const pool = dictationPool(units, templates, lexicon);
  assert.ok(pool.length > 50);
  for (const e of pool) {
    assert.ok(!e.text.includes('___'), e.text);
    assert.ok(words(e.text).length <= 8, e.text);
  }
  assert.equal(new Set(pool.map((e) => e.text)).size, pool.length, 'sin repetidas');
  // Respuesta de un transform, frase del detective, burbuja sin hueco e instancia de generador rellenada.
  const texts = pool.map((e) => e.text);
  for (const t of ['O Tom está no beliche de cima.', 'Eu sou o Leo.', 'Você tem protetor de ouvido?', 'Eu estou com muita fome.']) assert.ok(texts.includes(t), t);
  assert.ok(pool.find((e) => e.text === 'Ana, onde está a colher?').lemmas.includes('colher'));
  // El plural también cuenta, sin distinguir mayúsculas.
  const plural = pool.find((e) => /\bcolheres\b/.test(e.text));
  assert.ok(plural.lemmas.includes('colher'), plural.text);
});

test('dictationPool: todas las respuestas aceptadas, ejemplos del currículo y card_only marcadas', () => {
  const pool = dictationPool(units, templates, lexicon, curriculum);
  const texts = pool.map((e) => e.text);
  for (const t of ['O Tom está no beliche de cima.', 'Tom está no beliche de cima.', 'No beliche de cima está o Tom.', 'Você é do Chile?']) assert.ok(texts.includes(t), t);
  assert.equal(new Set(texts).size, texts.length);
  assert.equal(pool.find((e) => e.text === 'Olha só: aqui está a chave!').cardOnly, true);
  assert.ok(!pool.find((e) => e.text === 'Ana, onde está a colher?').cardOnly);
  assert.ok(pool.filter((e) => /^Olha só: aqui está/.test(e.text)).every((e) => e.cardOnly));
});

test('pickDictation: prefiere frases con lemas en nivel 1 o 2; null sin frases', () => {
  const pool = [
    {text: 'Isso é bom.', lemmas: []},
    {text: 'Nós estamos no quarto.', lemmas: ['quarto']},
    {text: 'Aqui está a chave.', lemmas: ['chave']},
  ];
  const srs = {...addWords({}, ['quarto', 'chave'], 0)};
  srs.chave = {...srs.chave, rung: 3};
  for (let s = 1; s < 20; s++) {
    const d = pickDictation(pool, srs, {rng: seeded(s)});
    assert.deepEqual(d, {id: 'dict:1', type: 'dictation', text: 'Nós estamos no quarto.', lemmas: ['quarto'], review: true});
  }
  assert.equal(pickDictation([], srs, {rng: seeded()}), null);
  assert.equal(pickDictation(pool, srs, {rng: seeded(), exclude: () => true}), null);
  // Sin lemas en aprendizaje, cualquiera.
  assert.ok(pickDictation(pool, {}, {rng: seeded()}));
});

const dict = {id: 'dict:3', type: 'dictation', text: 'Nós estamos no quarto.', lemmas: ['quarto'], review: true};
const ctx = {curriculum, lexicon};

test('check dictation: quatro subrayado → lemaOk {quarto: false}, tag null', async () => {
  const [r] = await checkExercise(dict, 'Nós estamos no quatro', ctx);
  assert.equal(r.key, 'dict:3');
  assert.equal(r.tag, null);
  assert.equal(r.ok, false);
  assert.equal(r.given, 'Nós estamos no quatro');
  assert.deepEqual(r.wrong, [{offset: 15, length: 6}]);
  assert.deepEqual(r.lemmaOk, {quarto: false});
});

test('check dictation: acierto (sin mayúsculas, con aviso) y error en otra palabra', async () => {
  const [ok] = await checkExercise(dict, 'nós estamos no quarto', ctx);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.lemmaOk, {quarto: true});
  const [other] = await checkExercise(dict, 'Nós estamo no quarto', ctx);
  assert.equal(other.ok, false);
  assert.deepEqual(other.lemmaOk, {quarto: true});
  // Sin escribir la palabra: no está subrayada, pero tampoco está.
  const [missing] = await checkExercise(dict, 'Nós estamos no', ctx);
  assert.deepEqual(missing.lemmaOk, {quarto: false});
  // El plural cuenta como la palabra.
  const pl = {...dict, text: 'As cadeiras são novas.', lemmas: ['cadeira']};
  assert.deepEqual((await checkExercise(pl, 'As cadeiras sãs novas', ctx))[0].lemmaOk, {cadeira: true});
  // Una forma conjugada de un verbo del léxico también cuenta para su lema en el dictado.
  const pool = dictationPool(units, templates, lexicon);
  assert.ok(pool.find((e) => e.text === 'Eu moro perto da praia.').lemmas.includes('morar'));
  const vb = {...dict, text: 'Você mora aqui?', lemmas: ['morar']};
  assert.deepEqual((await checkExercise(vb, 'Você mora aqui', ctx))[0].lemmaOk, {morar: true});
  assert.deepEqual((await checkExercise(vb, 'Você mra aqui', ctx))[0].lemmaOk, {morar: false});
});

const state = (srs) => ({mastery: {tags: {}, pairs: {}}, log: [], words: {}, progress: {steps: {}}, srs});
const res = (key, ok, lemmaOk) => ({key, tag: null, ok, lemmaOk, ms: 1000, at: 5000});

test('applyCommit: el dictado suelto repasa las vencidas sin cambiar el nivel ni el mastery', () => {
  let srs = addWords({}, ['quarto', 'cama'], 0);
  srs.quarto = {...srs.quarto, rung: 2};
  srs.cama = {...srs.cama, card: {...srs.cama.card, due: 10_000}}; // no vencida
  const ex = {...dict, lemmas: ['quarto', 'cama']};
  const group = {topic: 't', step: 2, exercises: [ex], results: []};
  const out = applyCommit({group, toApply: [res(ex.id, false, {quarto: false, cama: true})], state: state(srs), quarantine: [], now: 5000});
  assert.equal(out.srs.quarto.rung, 2);
  assert.equal(out.srs.quarto.card.reps, 1);
  assert.equal(out.srs.cama.card.reps, 0);
  assert.deepEqual(out.mastery, {tags: {}, pairs: {}});
});

test('applyCommit: el dictado de nivel 3 se juzga por su palabra', () => {
  let srs = addWords({}, ['quarto'], 0);
  srs.quarto = {...srs.quarto, rung: 3};
  const ex = {...dict, vocab: {lemma: 'quarto', rung: 3, mode: 'listen'}};
  const group = {topic: 't', step: 2, exercises: [ex], results: []};
  // La frase falló en otra palabra, pero quarto está bien: no baja.
  const ok = applyCommit({group, toApply: [res(ex.id, false, {quarto: true})], state: state(srs), quarantine: [], now: 5000});
  assert.equal(ok.srs.quarto.rung, 3);
  assert.equal(ok.log.at(-1).ok, true);
  const bad = applyCommit({group, toApply: [res(ex.id, false, {quarto: false})], state: state(srs), quarantine: [], now: 5000});
  assert.equal(bad.srs.quarto.rung, 2);
});

test('pickCards nivel 3 escuchando: dictado con la palabra; sin frase, sale leyendo', () => {
  const T0 = Date.UTC(2026, 10, 5);
  let srs = addWords({}, ['colher'], T0);
  srs.colher = {...srs.colher, rung: 3, listenUnlocked: {3: true}};
  const known = {m: 0.7, n: 3, last: T0};
  const opts = {now: T0 + 86_400_000, lexicon, templates, topic: {topic: 't', tags: ['a1.ser.presente'], hides: []},
    mastery: {tags: {'a1.genero.fem': known, 'a1.genero.masc': known}, pairs: {}}, curriculum, audio: true};
  const pool = dictationPool(units, templates, lexicon);
  const modes = new Set();
  for (let s = 1; s < 30; s++) {
    const [c] = pickCards(srs, {...opts, rng: seeded(s), pool});
    modes.add(c.vocab.mode);
    if (c.vocab.mode === 'listen') {
      assert.equal(c.type, 'dictation');
      assert.ok(c.lemmas.includes('colher'));
      assert.deepEqual(c.vocab, {lemma: 'colher', rung: 3, mode: 'listen'});
      assert.equal(c.review, true);
    }
  }
  assert.deepEqual([...modes].sort(), ['listen', 'read']);
  for (let s = 1; s < 10; s++) assert.equal(pickCards(srs, {...opts, rng: seeded(s), pool: []})[0].vocab.mode, 'read');
  for (let s = 1; s < 10; s++) assert.equal(pickCards(srs, {...opts, rng: seeded(s), pool, audio: false})[0].vocab.mode, 'read');
});

test('check dictation: una sola pista; con palabras subrayadas, sin la regla (la da el subrayado)', async () => {
  const [marked] = await checkExercise(dict, 'Nós estamos no quatro', ctx);
  assert.equal(marked.rule, null);
  const [missing] = await checkExercise(dict, 'Nós estamos', ctx);
  assert.equal(missing.wrong, undefined);
  assert.equal(missing.rule, 'Compará tu frase con la original.');
});
