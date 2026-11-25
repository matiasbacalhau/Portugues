import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkExercise } from '../js/core/checks/index.js';
import { makeCard } from '../js/core/cards.js';

const lexicon = JSON.parse(readFileSync(new URL('../data/lexicon.json', import.meta.url)));
const L = [
  {lemma: 'chave', pos: 'noun', article: 'a', es: 'llave', field: 'pousada'},
  {lemma: 'personagem', pos: 'noun', article: 'o', es: 'personaje (varón)', field: 'cultura'},
  {lemma: 'personagem', pos: 'noun', article: 'a', es: 'personaje (mujer)', field: 'cultura'},
  {lemma: 'cama', pos: 'noun', article: 'a', es: 'cama', field: 'pousada'},
  {lemma: 'quarto', pos: 'noun', article: 'o', es: 'cuarto', field: 'pousada'},
  {lemma: 'mesa', pos: 'noun', article: 'a', es: 'mesa', field: 'casa'},
  {lemma: 'andar', pos: 'verb', es: 'caminar', field: 'verbos'},
];
const ctx = {curriculum: {tags: {}}, lexicon: L};
const seeded = () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const card = (lemma, rung, mode = 'read') => makeCard(L.find((w) => w.lemma === lemma), {rung, mode, lexicon: L, rng: seeded()});
const run = (ex, answer) => checkExercise(ex, answer, ctx).then(([r]) => r);

test('makeCard: forma del ejercicio', () => {
  const ex = card('chave', 1, 'listen');
  assert.equal(ex.id, 'card:chave:1:listen');
  assert.deepEqual([ex.type, ex.review, ex.vocab], ['card', true, {lemma: 'chave', rung: 1, mode: 'listen'}]);
  assert.equal(card('chave', 2).options, undefined);
});

test('makeCard nivel 1: 4 opciones distintas, una correcta, determinista', () => {
  const ex = card('chave', 1);
  assert.equal(new Set(ex.options.map((o) => o.text)).size, 4);
  assert.equal(ex.options.filter((o) => o.correct).length, 1);
  assert.equal(ex.options.find((o) => o.correct).text, 'llave');
  assert.deepEqual(card('chave', 1).options, ex.options);
});

test('makeCard nivel 1: el mismo campo va primero y con el léxico real hay 4 distintas', () => {
  const ex = card('chave', 1);
  assert.deepEqual(ex.options.map((o) => o.text).filter((t) => ['cama', 'cuarto'].includes(t)).sort(), ['cama', 'cuarto']);
  const real = lexicon.find((w) => w.lemma === 'chave');
  const r = makeCard(real, {rung: 1, mode: 'read', lexicon, rng: Math.random});
  assert.equal(new Set(r.options.map((o) => o.text)).size, 4);
  assert.equal(r.options.filter((o) => o.correct).length, 1);
});

test('nivel 1: índice correcto e incorrecto, sin tag', async () => {
  const ex = card('chave', 1);
  const good = ex.options.findIndex((o) => o.correct);
  const ok = await run(ex, good);
  assert.deepEqual([ok.key, ok.ok, ok.tag, ok.review], [ex.id, true, null, false]);
  const bad = await run(ex, (good + 1) % 4);
  assert.deepEqual([bad.ok, bad.tag], [false, null]);
  assert.ok(!bad.rule.includes('llave'));
});

test('nivel 2: acepta a chave y a Chave (con aviso), rechaza o chave', async () => {
  const ex = card('chave', 2);
  assert.deepEqual([(await run(ex, 'a chave')).ok, (await run(ex, 'a chave')).notice], [true, null]);
  const up = await run(ex, 'a Chave');
  assert.deepEqual([up.ok, up.notice], [true, 'ojo: mayúscula']);
  const bad = await run(ex, 'o chave');
  assert.deepEqual([bad.ok, bad.tag], [false, null]);
  assert.ok(!/chave/.test(bad.rule) && !/(^|\s)a(\s|$)/.test(bad.rule.replace(/\*/g, '')));
});

test('nivel 2: un lema con o y a acepta las dos; el verbo, el infinitivo', async () => {
  const p = card('personagem', 2);
  assert.ok((await run(p, 'o personagem')).ok && (await run(p, 'a personagem')).ok);
  assert.ok(!(await run(p, 'os personagem')).ok);
  const verb = card('andar', 2);
  assert.ok((await run(verb, 'andar')).ok);
  assert.ok(!(await run(verb, 'anda')).ok);
});

test('nivel 2: un sustantivo sin artículo en el léxico (países) acepta el lema solo', async () => {
  const w = lexicon.find((x) => x.lemma === 'Portugal');
  assert.equal(w.article, null);
  const ex = makeCard(w, {rung: 2, mode: 'read', lexicon, rng: seeded()});
  const r = (answer) => checkExercise(ex, answer, {curriculum: {tags: {}}, lexicon}).then(([x]) => x);
  assert.ok((await r('Portugal')).ok);
  assert.ok(!(await r('o Portugal')).ok);
});

test('UI: sin síntesis de voz el modo listen no agrega nodos null', async () => {
  // DOM mínimo: alcanza para que h() arme elementos y registre los hijos que recibe append.
  const mk = (tag) => ({tag, children: [], append(...c) { this.children.push(...c); }, setAttribute() {}, addEventListener() {}, querySelectorAll: () => []});
  globalThis.document = {createElement: mk};
  globalThis.window = {};
  const {render} = await import('../js/exercises/card.js');
  const el = mk('div');
  render(card('chave', 1, 'listen'), el, {submit() {}});
  assert.ok(el.children.length > 0 && el.children.every((c) => c !== null && typeof c === 'object'));
  delete globalThis.document; delete globalThis.window;
});
