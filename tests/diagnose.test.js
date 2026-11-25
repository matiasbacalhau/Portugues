import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose } from '../js/core/diagnose.js';

// Hueco de artículo (tema 2): sin prep es el artículo solo; con prep, la contracción.
const art = (gender, extra = {}) => ({tag: `a1.genero.${{m: 'masc', f: 'fem'}[gender]}`,
  dims: {gender, number: 'sg', det: 'def'}, noun: 'leite', ...extra});
const contr = (gender, prep = 'em', extra = {}) => ({tag: `a1.contr.${prep}`,
  dims: {gender, number: 'sg', det: 'def', prep}, noun: 'geladeira', ...extra});
const noLeak = (d, forms) => forms.forEach((f) => {
  assert.doesNotMatch(d.rule, new RegExp(`(^|[^\\p{L}])${f}([^\\p{L}]|$)`, 'u'), `rule filtra ${f}`);
  assert.doesNotMatch(d.rule_pt, new RegExp(`(^|[^\\p{L}])${f}([^\\p{L}]|$)`, 'u'), `rule_pt filtra ${f}`);
});

test('género equivocado en el artículo: nombra el género, sin la forma', () => {
  const d = diagnose(art('m'), 'a');
  assert.equal(d.rule, '*leite* no es femenino en portugués: revisá el género.');
  assert.equal(d.rule_pt, 'Preste atenção ao gênero: *leite* não é feminino.');
  assert.equal(d.prereq, null);
});

test('género equivocado en la contracción: nombra el género y apunta al prerrequisito', () => {
  const d = diagnose(contr('f'), 'no');
  assert.match(d.rule, /\*geladeira\* no es masculino/);
  noLeak(d, ['na']);
  assert.equal(d.prereq, 'a1.genero.fem');
});

test('contracción separada (em a, de o): dice que se junta, sin la forma', () => {
  const d = diagnose(contr('f'), 'em a');
  assert.match(d.rule, /se contrae en una sola palabra/);
  noLeak(d, ['na']);
  const e = diagnose(contr('m', 'de', {noun: 'quarto'}), 'de o');
  assert.match(e.rule, /\*de\* \+ artículo/);
  noLeak(e, ['do']);
});

test('artículo sin la preposición: dice qué preposición falta, sin la forma', () => {
  const d = diagnose(contr('f'), 'a');
  assert.match(d.rule, /Falta la preposición \*em\*/);
  noLeak(d, ['na']);
});

test('número equivocado: nombra el número', () => {
  const d = diagnose(contr('f'), 'nas');
  assert.match(d.rule, /revisá el número/);
  noLeak(d, ['na']);
});

test('ninguna celda: la rule del tag', () => {
  const tags = {'a1.genero.masc': {rule: 'La regla del tag.', rule_pt: 'A regra.'}};
  assert.deepEqual(diagnose(art('m'), 'xyz', tags), {rule: 'La regla del tag.', rule_pt: 'A regra.', prereq: null});
  assert.equal(diagnose(art('m'), 'xyz').rule, 'Repasá la regla de este tema.');
});

const morar = {lemma: 'morar', pos: 'verb'};
const ser = {lemma: 'ser', pos: 'verb', irregular: {eu: 'sou', ele: 'é', nos: 'somos', eles: 'são'}};
const verbItem = (person, verb = 'morar') => ({tag: 'a1.presente.regular', dims: {person}, verb});

test('verbo conjugado: si escribió la forma de otra persona, nombra esa persona sin revelar la forma esperada', () => {
  const d = diagnose(verbItem('eu'), 'mora', {}, [morar]);
  assert.match(d.rule, /\*você\*, \*ele\*, \*ela\* y \*a gente\*/);
  noLeak(d, ['moro']);
  const e = diagnose(verbItem('ele', 'ser'), 'são', {}, [ser]);
  assert.match(e.rule, /\*vocês\*, \*eles\* y \*elas\*/);
  noLeak(e, ['é']);
  assert.match(diagnose(verbItem('nos'), 'moro', {}, [morar]).rule_pt, /Forma de \*eu\*/);
});

test('verbo: una forma que no es de ninguna persona cae en la regla del tag', () => {
  const tags = {'a1.presente.regular': {rule: 'Regla.', rule_pt: 'Regra.'}};
  assert.equal(diagnose(verbItem('eu'), 'moran', tags, [morar]).rule, 'Regla.');
  assert.equal(diagnose(verbItem('eu'), 'mora', tags, []).rule, 'Regla.');
});
