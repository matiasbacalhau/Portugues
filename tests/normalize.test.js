import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchAnswer, clean, wrongWords, closestAnswer } from '../js/core/normalize.js';

const lax = {orthographic: false};
const strict = {orthographic: true};

test('exacto', () => assert.deepEqual(matchAnswer('no', ['no'], lax), {ok: true, notice: null}));
test('variantes del teclado iOS', () => {
  assert.equal(matchAnswer('  Eu  estou  cansado. ', ['eu estou cansado'], lax).ok, true);
  assert.equal(matchAnswer('Tudo bem?', ['Tudo bem?'], lax).ok, true);
});
test('clean: comillas tipográficas y puntuación final', () =>
  assert.equal(clean(' “Oi”  gente! '), '"Oi" gente'));
test('mayúscula inicial no ortográfica: ok sin aviso', () =>
  assert.deepEqual(matchAnswer('Na', ['na'], lax), {ok: true, notice: null}));
test('sin ç no ortográfico: ok con aviso', () =>
  assert.deepEqual(matchAnswer('recepcao', ['recepção'], lax), {ok: true, notice: 'ojo: ç'}));
test('sin tilde no ortográfico: ok con aviso de la tilde que falta', () => {
  assert.equal(matchAnswer('cafe', ['café'], lax).notice, 'ojo: é');
  assert.equal(matchAnswer('estao', ['estão'], lax).notice, 'ojo: ã');
  assert.equal(matchAnswer('voce', ['você'], lax).notice, 'ojo: ê');
});
test('sin tilde, si queda otra palabra, no se acepta nunca: é ≠ e, está ≠ esta, avó ≠ avô', () => {
  assert.equal(matchAnswer('e', ['é'], lax).ok, false);
  assert.equal(matchAnswer('esta', ['está'], lax).ok, false);
  assert.equal(matchAnswer('Ele esta na praia', ['Ele está na praia'], lax).ok, false);
  assert.equal(matchAnswer('avô', ['avó'], lax).ok, false);
  assert.equal(matchAnswer('nos', ['nós'], lax).ok, false);
  assert.equal(matchAnswer('a', ['à'], lax).ok, false);
});
test('tag ortográfico exige tilde, ç y mayúscula', () => {
  assert.equal(matchAnswer('recepcao', ['recepção'], strict).ok, false);
  assert.equal(matchAnswer('cafe', ['café'], strict).ok, false);
});
test('nunca borra el rasgo evaluado: no ≠ na', () => assert.equal(matchAnswer('no', ['na'], lax).ok, false));
test('ortográfico: palabra suelta exige mayúscula inicial', () =>
  assert.equal(matchAnswer('brasil', ['Brasil'], strict).ok, false));
test('ortográfico: frase tolera mayúscula de inicio de oración', () =>
  assert.equal(matchAnswer('eu moro no Brasil', ['Eu moro no Brasil'], strict).ok, true));

const words = (text, ws) => ws.map(w => text.slice(w.offset, w.offset + w.length));
test('wrongWords: subraya las palabras que no están en la respuesta más parecida', () => {
  const t = 'A senhora estão em o quarto 3.';
  assert.deepEqual(words(t, wrongWords(t, ['A senhora está no quarto 3.', 'A senhora fica no quarto 3.'], lax)), ['estão', 'em', 'o']);
});
test('wrongWords: el orden cuenta (otra posición es otra palabra)', () => {
  const t = 'Eu no quarto estou.';
  assert.deepEqual(words(t, wrongWords(t, ['Eu estou no quarto.'], lax)), ['estou']);
});
test('wrongWords: tolera mayúscula, puntuación y, si el tag no es ortográfico, tildes', () => {
  const t = 'o leite esta na geladeira';
  // *esta* sin tilde es otra palabra: se subraya aun sin ser ortográfico.
  assert.deepEqual(words(t, wrongWords(t, ['O leite está na geladeira.'], lax)), ['esta']);
  const u = 'a recepcao fica no terreo';
  assert.deepEqual(words(u, wrongWords(u, ['A recepção fica no térreo.'], lax)), []);
  assert.deepEqual(words(u, wrongWords(u, ['A recepção fica no térreo.'], strict)), ['recepcao', 'terreo']);
});
test('wrongWords: una palabra suelta no se subraya', () =>
  assert.deepEqual(wrongWords('a', ['o'], lax), []));

// Una tilde puede llegar como una letra (é) o como e + acento combinante; se ven igual y tienen que contar igual.
const NFD = s => s.normalize('NFD');
test('tildes descompuestas (NFD) cuentan igual que las compuestas', () => {
  assert.deepEqual(matchAnswer(NFD('A recepção é no térreo'), ['A recepção é no térreo'], strict), {ok: true, notice: null});
  assert.equal(matchAnswer('você', [NFD('você')], strict).ok, true);
});
test('wrongWords: con tildes descompuestas no subraya de más y los offsets caen en el texto escrito', () => {
  const t = NFD('A recepção é grande');
  assert.deepEqual(words(t, wrongWords(t, ['A recepção é pequena'], strict)), [NFD('grande')]);
});

test('closestAnswer: la respuesta aceptada más parecida', () =>
  assert.equal(closestAnswer('A senhora estão no quarto 3.', ['No quarto 3 está a senhora.', 'A senhora está no quarto 3.'], lax), 'A senhora está no quarto 3.'));
