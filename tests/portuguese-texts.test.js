import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portugueseTexts } from '../tools/portuguese_texts.mjs';

const exercises = [
  {id: 'g1', type: 'gap', text: 'Eu tenho ___ cachorro.', answers: ['um', 'o']},
  {id: 'g2', type: 'gap', text: 'Eu ___ cansado.', answers: ['estou'], lt_ignore: 'fragmento'},
  {id: 's1', type: 'situation', bubbles: [
    {who: 'them', text: 'Como se chama ___ hotel?'}, {who: 'me', text: 'Ele se chama ___.'}],
   gaps: [{answers: ['o']}, {answers: ['Sol']}]},
  {id: 't1', type: 'transform', source: 'Eu vejo o cachorro.', answers: ['Eu vejo ele.', 'Eu não vejo o cachorro.']},
  {id: 'tr1', type: 'translate', from: 'es', source: 'Tengo un perro.', answers: ['Eu tenho um cachorro.']},
  {id: 'o1', type: 'order', chunks: ['a gata', 'dorme', 'muito'], answers: [['a gata', 'dorme', 'muito'], ['muito', 'dorme', 'a gata']]},
  {id: 'c1', type: 'choice', prompt: 'Elegí', options: [{text: 'Eu tenho um cachorro.', correct: true}, {text: 'Eu tenho uma cachorro.'}]},
  {id: 'e1', type: 'spot-error', tokens: ['Eu', 'tenho', 'uma', 'cachorro'], wrong: 2, corrections: ['um'], rule: 'x'},
  {id: 'r1', type: 'reading', title: 'T', text: 'Isto é um texto.', questions: [{prompt: 'Onde a Ana mora?', answers: ['No Rio', 'Rio'], options: [{text: 'Opção errada'}, {text: 'Opção certa', correct: true}]}]},
  {id: 'd1', type: 'detective', sentences: [{pt: 'Eu vejo o cachorro.'}], rules: [{text: 'regla'}], apply: [{text: 'Eu vejo ___ homem.', answers: ['o', 'um']}]},
  {id: 'p1', type: 'pares', pair: [{pt: 'pão'}, {pt: 'pau'}]},
  {id: 'p2', type: 'pares', frame: 'Hoje eu estou ___.', pair: [{pt: 'cansado'}, {pt: 'casado'}]},
  {id: 'w1', type: 'writing-guided', prompt: 'Escribí', tips: ['t'], checklist: ['c'], model: 'Eu me chamo Ana.'},
  {id: 'w2', type: 'writing-free', prompt: 'Escribí', model: 'Eu moro aqui.'},
];

const out = portugueseTexts({
  curriculum: {tags: {'a1.x': {examples: [{pt: 'Eu estou cansado.', es: 'x'}]}}},
  lexicon: [{lemma: 'cachorro', pos: 'noun', article: 'o', plural: 'cachorros', field: 'x'}],
  templates: [{id: 'tpl', tag_prefix: 'a1.genero', det: 'indef', context: 'c',
    text: 'Eu tenho ___ {noun}.', slot: {pos: 'noun', fields: ['x'], countable: true}}],
  units: [{topics: [{topic: 'a1.u1.t1', steps: [{exercises}]}, {topic: 'a1.u1.t2', draft: true, steps: []}]}],
});
const texts = out.map(o => o.text);
const has = (where, text) => assert.ok(out.some(o => o.where === where && o.text === text), `${where}: ${text}`);

test('gap y situation rellenan con la primera respuesta', () => {
  has('g1: text', 'Eu tenho um cachorro.');
  has('s1: bubbles[0]', 'Como se chama o hotel?');
  has('s1: bubbles[1]', 'Ele se chama Sol.');
});
test('respuestas aceptadas y órdenes', () => {
  has('t1: answers[1]', 'Eu não vejo o cachorro.');
  has('tr1: answers[0]', 'Eu tenho um cachorro.');
  has('o1: answers[1]', 'Muito dorme a gata');
  has('d1: apply[0].answers[0]', 'Eu vejo o homem.');
  has('d1: apply[0].answers[1]', 'Eu vejo um homem.');
  has('d1: sentences[0]', 'Eu vejo o cachorro.');
});
test('choice: solo correct; spot-error: solo el texto corregido', () => {
  has('c1: options[0]', 'Eu tenho um cachorro.');
  assert.ok(!texts.includes('Eu tenho uma cachorro.'));
  has('e1: corrected', 'Eu tenho um cachorro');
  assert.ok(!texts.includes('Eu tenho uma cachorro'));
  assert.ok(!texts.includes('Opção errada'));
});
test('pares: las dos palabras, dentro de la frase si hay `frame`', () => {
  has('p1: pair[0]', 'pão');
  has('p1: pair[1]', 'pau');
  has('p2: pair[1]', 'Hoje eu estou casado.');
});
test('reading, escrituras, curriculum, plantillas', () => {
  has('r1: text', 'Isto é um texto.');
  has('r1: questions[0].prompt', 'Onde a Ana mora?');
  has('r1: questions[0].answers[1]', 'Rio');
  has('r1: questions[0].options[1]', 'Opção certa');
  assert.ok(!texts.includes('Opção errada'));
  assert.ok(out.find(o => o.where === 'r1: text').multi);
  assert.ok(out.find(o => o.where === 'w1: model').multi);
  assert.ok(!out.find(o => o.where === 'r1: questions[0].prompt').multi);
  has('w1: model', 'Eu me chamo Ana.');
  has('w2: model', 'Eu moro aqui.');
  has('curriculum a1.x: examples[0]', 'Eu estou cansado.');
  has('tpl:cachorro: text', 'Eu tenho um cachorro.');
});
test('lt_ignore se propaga y nada más lo lleva', () => {
  assert.equal(out.find(o => o.where === 'g2: text').ignore, 'fragmento');
  assert.ok(out.filter(o => o.where !== 'g2: text').every(o => !('ignore' in o)));
});
