import { test } from 'node:test';
import assert from 'node:assert/strict';
import { article, findArticle, present, PERSONS } from '../js/core/morph.js';

test('artículos definidos e indefinidos, singular y plural', () => {
  assert.deepEqual(article('def', 'm'), ['o']);
  assert.deepEqual(article('def', 'f'), ['a']);
  assert.deepEqual(article('def', 'm', 'pl'), ['os']);
  assert.deepEqual(article('def', 'f', 'pl'), ['as']);
  assert.deepEqual(article('indef', 'm'), ['um']);
  assert.deepEqual(article('indef', 'f'), ['uma']);
  assert.deepEqual(article('indef', 'f', 'pl'), ['umas']);
  assert.deepEqual(article('def', 'x'), []);
});

test('contracciones con em, de, por y a', () => {
  assert.deepEqual(article('def', 'm', 'sg', 'em'), ['no']);
  assert.deepEqual(article('def', 'f', 'pl', 'em'), ['nas']);
  assert.deepEqual(article('def', 'f', 'sg', 'de'), ['da']);
  assert.deepEqual(article('def', 'm', 'pl', 'de'), ['dos']);
  assert.deepEqual(article('def', 'm', 'sg', 'por'), ['pelo']);
  assert.deepEqual(article('def', 'f', 'sg', 'a'), ['à']);
  // em + um: las dos formas valen.
  assert.deepEqual(article('indef', 'm', 'sg', 'em'), ['num', 'em um']);
  assert.deepEqual(article('indef', 'f', 'sg', 'de'), ['de uma', 'duma']);
});

test('findArticle: celdas que producen una forma, contraída o separada', () => {
  assert.deepEqual(findArticle('no'), [{det: 'def', gender: 'm', number: 'sg', prep: 'em'}]);
  assert.ok(findArticle('a').some(c => c.det === 'def' && c.gender === 'f' && c.prep === null));
  assert.ok(findArticle('em a').some(c => c.prep === 'em' && c.gender === 'f' && c.split));
  assert.ok(findArticle('de o').some(c => c.prep === 'de' && c.gender === 'm' && c.split));
  assert.deepEqual(findArticle('xyz'), []);
});

const reg = (lemma) => ({lemma});
test('presente regular: -ar, -er, -ir en las cuatro personas de Brasil', () => {
  assert.deepEqual(PERSONS.map(p => present(reg('falar'), p)[0]), ['falo', 'fala', 'falamos', 'falam']);
  assert.deepEqual(PERSONS.map(p => present(reg('comer'), p)[0]), ['como', 'come', 'comemos', 'comem']);
  assert.deepEqual(PERSONS.map(p => present(reg('abrir'), p)[0]), ['abro', 'abre', 'abrimos', 'abrem']);
});

test('irregular: la forma del léxico gana; las demás personas, regulares', () => {
  const ser = {lemma: 'ser', irregular: {eu: 'sou', ele: 'é', nos: 'somos', eles: 'são'}};
  assert.deepEqual(PERSONS.map(p => present(ser, p)[0]), ['sou', 'é', 'somos', 'são']);
  const fazer = {lemma: 'fazer', irregular: {eu: 'faço'}};
  assert.deepEqual(PERSONS.map(p => present(fazer, p)[0]), ['faço', 'faze', 'fazemos', 'fazem']);
  assert.deepEqual(present({lemma: 'x', irregular: {eu: ['a', 'b']}}, 'eu'), ['a', 'b']);
});

test('un lema que no termina en -ar/-er/-ir no da formas', () => assert.deepEqual(present(reg('pôr'), 'eu'), []));
