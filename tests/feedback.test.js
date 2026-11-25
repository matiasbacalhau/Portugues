import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickExample, pickCuriosity } from '../js/core/feedback.js';

const real = JSON.parse(readFileSync(new URL('../data/curriculum.json', import.meta.url)));
const cur = {tags: {
  t: {examples: [{pt: 'A', es: 'a', dims: {gender: 'm'}}, {pt: 'B', es: 'b', dims: {gender: 'f'}}, {pt: 'C', es: 'c', dims: {gender: 'n'}}],
      curiosities: ['del tag']},
  solo: {examples: [{pt: 'A', es: 'a', dims: {gender: 'm'}}]},
}};

test('pickExample nunca devuelve un ejemplo con la dimensión evaluada', () => {
  for (const r of [0, 0.4, 0.99]) assert.notEqual(pickExample('t', {gender: 'm'}, cur, () => r).pt, 'A');
  for (let i = 0; i < 20; i++) {
    const ex = pickExample('a1.genero.masc', {gender: 'm'}, real, Math.random);
    const src = real.tags['a1.genero.masc'].examples.find((e) => e.pt === ex.pt);
    assert.notEqual(src.dims.gender, 'm');
  }
});

test('pickExample devuelve null si no hay ninguno distinto', () => {
  assert.equal(pickExample('solo', {gender: 'm'}, cur, () => 0), null);
  assert.equal(pickExample('inexistente', {gender: 'm'}, cur, () => 0), null);
});

test('pickCuriosity: null con rng alto; ejercicio antes que tag', () => {
  assert.equal(pickCuriosity({}, 't', cur, () => 0.9), null);
  assert.equal(pickCuriosity({}, 't', cur, () => 0.1), 'del tag');
  assert.equal(pickCuriosity({curiosities: ['del ejercicio']}, 't', cur, () => 0.1), 'del ejercicio');
  assert.equal(pickCuriosity({}, 'solo', cur, () => 0.1), null);
});

test('pickExample sin dims del ítem: no falla y vale cualquier ejemplo', () => {
  for (const d of [undefined, {}]) assert.deepEqual(pickExample('t', d, cur, () => 0), {pt: 'A', es: 'a'});
});

test('pickExample con dims: excluye ejemplos que no tienen esas claves', () => {
  const c = {tags: {x: {examples: [{pt: 'sin', es: 's'}, {pt: 'otro', es: 'o', dims: {kase: 'nom'}}, {pt: 'ok', es: 'k', dims: {gender: 'f'}}]}}};
  for (const r of [0, 0.5, 0.99]) assert.equal(pickExample('x', {gender: 'm'}, c, () => r).pt, 'ok');
});

test('pickExample compara solo las claves compartidas (gap generado con number y det)', () => {
  const dims = {gender: 'm', number: 'sg', det: 'indef'};
  for (let i = 0; i < 20; i++) {
    const ex = pickExample('a1.genero.masc', dims, real, Math.random);
    assert.ok(ex, 'hay ejemplo');
    const src = real.tags['a1.genero.masc'].examples.find((e) => e.pt === ex.pt);
    assert.notEqual(src.dims.gender, 'm');
  }
  const c = {tags: {x: {examples: [{pt: 'ajeno', es: 'a', dims: {person: 'ich'}}, {pt: 'igual', es: 'i', dims: {gender: 'm', kase: 'nom'}},
    {pt: 'ok', es: 'k', dims: {gender: 'f'}}]}}};
  for (const r of [0, 0.5, 0.99]) assert.equal(pickExample('x', dims, c, () => r).pt, 'ok');
  const sinCompartidas = {tags: {x: {examples: [{pt: 'ajeno', es: 'a', dims: {person: 'ich'}}]}}};
  assert.equal(pickExample('x', dims, sinCompartidas, () => 0), null);
});
