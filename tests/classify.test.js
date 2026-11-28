// Cascada de corrección: el tipo de error elige la devolución (classify.js), solo un error del tema baja el mastery y
// muestra el ejemplo, y la revisión con IA rehace la devolución con su veredicto (appeal.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyMiss, nameArticleVariants, grammarScope } from '../js/core/classify.js';
import { checkWritten, TYPED, EVALUATED_OK } from '../js/core/checks/common.js';
import { applyResult } from '../js/core/mastery.js';
import { exampleFor } from '../js/core/runner.js';
import { appealContext, appealExpected, applyVerdict, canAppeal } from '../js/core/appeal.js';

const lexicon = JSON.parse(readFileSync(new URL('../data/lexicon.json', import.meta.url)));
const type = (answer, accepted, tag, reading = false) => classifyMiss(answer, accepted, {tag, reading, lexicon}).type;
const tags = {
  'a1.presente.regular': {rule: 'Regla presente.', rule_pt: 'Regra presente.'},
  'a1.estar.presente': {rule: 'Regla estar.', rule_pt: 'Regra estar.'},
  'a1.contr.de': {rule: 'Regla de.', rule_pt: 'Regra de.', examples: [{pt: 'A Mia é do Chile.', es: 'x'}]},
};
const ctx = {curriculum: {tags}, lexicon};

test('artículo ante nombre de persona: opcional, por separado; nunca ante país', () => {
  assert.deepEqual(nameArticleVariants(['O Leo mora em Rosario.'], lexicon), ['Leo mora em Rosario.']);
  assert.deepEqual(nameArticleVariants(['A Mia e a Lea estudam.'], lexicon).sort(), ['A Mia e Lea estudam.', 'Mia e Lea estudam.', 'Mia e a Lea estudam.'].sort());
  assert.deepEqual(nameArticleVariants(['O Brasil é grande.'], lexicon), []);
  // Reporte real: "Leo mora em Rosario" se acepta.
  const q = {tag: 'a1.presente.regular', answers: ['O Leo mora em Rosario']};
  assert.equal(checkWritten('k', q, 'Leo mora em Rosario', ctx).ok, true);
  // Un artículo del otro género no es omisión: sigue siendo error.
  assert.equal(checkWritten('k', q, 'A Leo mora em Rosario', ctx).ok, false);
});

test('tipos: ortografía, tilde que cambia la palabra, contenido, gramática del tema y de otro tema', () => {
  assert.equal(type('Ela é do Chiile.', ['Ela é do Chile.'], 'a1.ser.presente'), 'spelling');
  assert.equal(type('Eu gossto muito do Rio.', ['Eu gosto muito do Rio.'], 'a1.presente.regular'), 'spelling');
  assert.equal(type('Eles estam aqui.', ['Eles estão aqui.'], 'a1.estar.presente'), 'grammar-tag'); // cambia la terminación: conjuga
  assert.equal(type('A senhora esta no quarto 3.', ['A senhora está no quarto 3.'], 'a1.estar.presente'), 'accent');
  assert.equal(type('A sobremesa é da Mia', ['A sobremesa é da Lea'], 'a1.contr.de', true), 'content'); // reporte real
  assert.equal(type('Eles falam espanhol.', ['Eles falam inglês.'], 'a1.presente.regular'), 'content');
  assert.equal(type('Nós está na cozinha.', ['Nós estamos na cozinha.'], 'a1.estar.presente'), 'grammar-tag');
  assert.equal(type('Nós estamos no cozinha.', ['Nós estamos na cozinha.'], 'a1.estar.presente'), 'grammar-other');
  assert.equal(type('Eu moro no Rio.', ['Eu sou de Portugal e tenho dois cachorros.'], 'a1.ser.presente'), 'unknown'); // muy distinta
});

test('devolución por tipo: nunca la regla del tema si el error no es del tema', () => {
  const q = {tag: 'a1.contr.de', answers: ['A sobremesa é da Lea']};
  const r = checkWritten('k', q, 'A sobremesa é da Mia', ctx, {reading: true});
  assert.deepEqual([r.errorType, r.rule], ['content', TYPED.reading.rule]);
  assert.deepEqual(r.wrong, [{offset: 17, length: 3}]);
  const s = checkWritten('k', {tag: 'a1.presente.regular', answers: ['Eu moro em Rosario']}, 'Eu moro em Rossario', ctx);
  assert.deepEqual([s.errorType, s.rule], ['spelling', TYPED.spelling.rule]);
  const g = checkWritten('k', {tag: 'a1.presente.regular', answers: ['Eles moram aqui']}, 'Eles mora aqui', ctx);
  assert.deepEqual([g.errorType, g.rule], ['grammar-tag', 'Regla presente.']);
  const o = checkWritten('k', {tag: 'a1.estar.presente', answers: ['Nós estamos na cozinha']}, 'Nós estamos no cozinha', ctx);
  assert.equal(o.rule, EVALUATED_OK);
});

test('mastery y ejemplo: solo un error del tema cuenta', () => {
  const empty = {tags: {}, pairs: {}};
  const base = {tag: 'a1.contr.de', type: 'reading', ok: false, exerciseId: 'x'};
  assert.deepEqual(applyResult(empty, {...base, errorType: 'content'}, {now: 1}), empty);
  assert.deepEqual(applyResult(empty, {...base, errorType: 'spelling'}, {now: 1}), empty);
  assert.notDeepEqual(applyResult(empty, {...base, errorType: 'grammar-tag'}, {now: 1}), empty);
  assert.notDeepEqual(applyResult(empty, base, {now: 1}), empty); // sin tipo (opciones, generados): como antes
  const ex = {id: 'r', type: 'gap', tag: 'a1.contr.de', text: '___', answers: ['da']};
  const res = {key: 'r', ok: false, tag: 'a1.contr.de'};
  const opts = {results: [res], answer: 'x', curriculum: {tags}, rng: () => 0};
  assert.equal(exampleFor(ex, {...res, errorType: 'content'}, opts), null);
  assert.ok(exampleFor(ex, {...res, errorType: 'grammar-tag'}, opts));
});

test('revisión con IA: contexto del ítem, veredicto correcto acepta, gramática ubica el tema y subraya la cita', () => {
  const ex = {id: 'tf', type: 'transform', tag: 'a1.presente.regular', source: 'Eu moro em Rosario.', instruction: 'Agora com *ele*.', answers: ['Ele mora em Rosario.']};
  assert.match(appealContext(ex, 'tf'), /Sentence: Eu moro em Rosario\.\nChange: Agora com \*ele\*\./);
  assert.deepEqual(appealExpected(ex, 'tf'), ['Ele mora em Rosario.']);
  const prev = checkWritten('tf', ex, 'Ele moram em Rosario.', ctx);
  const ok = applyVerdict(ex, prev, {verdict: 'correct', quote: ''}, ctx);
  assert.deepEqual([ok.ok, ok.rule, ok.appealed, ok.wrong], [true, null, true, undefined]);
  const g = applyVerdict(ex, prev, {verdict: 'grammar', quote: 'moram'}, ctx);
  assert.deepEqual([g.ok, g.errorType, g.rule, g.wrong], [false, 'grammar-tag', 'Regla presente.', [{offset: 4, length: 5}]]);
  assert.equal(grammarScope('no', 'a1.presente.regular', lexicon), 'grammar-other');
  const c = applyVerdict({...ex, type: 'reading'}, prev, {verdict: 'content', quote: 'Rosario'}, ctx);
  assert.deepEqual([c.errorType, c.rule], ['content', TYPED.reading.rule]);
  // card y dictation no son apelables al juez (no tienen expected/context de juez).
  assert.equal(canAppeal(ex, 'tf'), true);
  assert.equal(canAppeal({id: 'card:chave:2:read', type: 'card', rung: 2}, 'card:chave:2:read'), false);
  assert.equal(canAppeal({id: 'dict:0', type: 'dictation', text: 'Eu moro no Brasil.'}, 'dict:0'), false);
  // NFD en given + NFC en quote: el subrayado igual encuentra la cita.
  const nfdPrev = {...prev, given: 'Você esta\u0301 aqui.'};
  const nfdRes = applyVerdict(ex, nfdPrev, {verdict: 'grammar', quote: 'está'}, ctx);
  assert.deepEqual(nfdRes.wrong, [{offset: 5, length: 4}]);
});
