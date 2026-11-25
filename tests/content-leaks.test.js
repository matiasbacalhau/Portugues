// Regla 3 sobre el contenido real: ninguna explicación que ve el usuario tras un error (la regla del ítem, la de sus
// errores anotados o la del tag) contiene una respuesta aceptada de ese ítem como palabra entera. En portugués las
// respuestas son cortas (*é*, *na*, *do*) y es fácil que se cuelen en una frase de la regla.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { countItems } from '../js/core/checks/index.js';
import { itemInfo } from '../js/core/runner.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const curriculum = read('curriculum.json');
const units = readdirSync(new URL('../data/levels/a1/', import.meta.url)).map((f) => read(`levels/a1/${f}`));

const lower = (s) => String(s ?? '').toLocaleLowerCase('pt-BR').normalize('NFC');
const words = (s) => new Set(lower(s).match(/[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*/gu) ?? []);
// Lo citado entre asteriscos (*é*, *na*) es una forma que la regla muestra: nunca puede ser la respuesta.
const cited = (s) => new Set([...String(s ?? '').matchAll(/\*([^*]+)\*/g)].map((m) => lower(m[1]).trim()));
// Palabras que además son la prosa misma de la regla: como palabra suelta no cuentan (sí citadas).
const PROSE = {es: new Set(['a', 'o', 'e', 'de', 'no', 'da', 'en', 'la', 'es']), pt: new Set(['a', 'o', 'e', 'de', 'em', 'um', 'uma', 'os', 'as'])};
const leaks = (rule, answer, lang) => {
  const a = lower(answer).trim();
  if (cited(rule).has(a)) return true;
  const aw = [...words(a)];
  if (aw.length > 1) return lower(rule).includes(a);
  return words(rule).has(a) && !PROSE[lang].has(a);
};

// Las reglas que puede ver el usuario al fallar el ítem n del ejercicio.
function rulesOf(ex, n) {
  const sub = ex.type === 'situation' ? ex.gaps[n] : ex.type === 'reading' ? ex.questions[n]
    : ex.type === 'detective' && n > 0 ? ex.apply[n - 1] : ex;
  const tag = sub.tag ?? ex.tag;
  const t = curriculum.tags[tag] ?? {};
  const out = [[t.rule, 'es'], [t.rule_pt, 'pt'], [ex.rule, 'es'], [ex.rule_pt, 'pt']];
  for (const e of sub.errors ?? []) out.push([e.rule, 'es'], [e.rule_pt, 'pt']);
  for (const o of sub.options ?? []) if (!o.correct) out.push([o.rule, 'es'], [o.rule_pt, 'pt']);
  return out.filter(([r]) => r);
}

test('ninguna regla del contenido contiene una respuesta aceptada de su ítem', () => {
  const found = [];
  for (const u of units) for (const topic of u.topics) for (const step of topic.steps ?? []) for (const ex of step.exercises ?? []) {
    if (ex.type === 'writing-guided' || ex.type === 'writing-free' || ex.type === 'pares') continue;
    for (let n = 0; n < countItems(ex); n++) {
      // La regla del detective (ítem 0) es elegir una explicación: su "respuesta" es texto en español, no una forma.
      if (ex.type === 'detective' && n === 0) continue;
      const {answers} = itemInfo(ex, `${ex.id}#${n}`);
      for (const [rule, lang] of rulesOf(ex, n)) for (const a of answers ?? []) {
        if (typeof a === 'string' && leaks(rule, a, lang)) found.push(`${ex.id}#${n}: «${a}» en «${rule}»`);
      }
    }
  }
  assert.deepEqual(found, []);
});

// Lo mismo con lo que el usuario ve antes de responder: la consigna, el contexto y la escena (en portugués).
test('ninguna consigna ni contexto en portugués contiene una respuesta aceptada de su ítem', () => {
  const found = [];
  for (const u of units) for (const topic of u.topics) for (const step of topic.steps ?? []) for (const ex of step.exercises ?? []) {
    if (ex.type === 'writing-guided' || ex.type === 'writing-free' || ex.type === 'pares') continue;
    const shown = [ex.prompt, ex.context, ex.scene?.context, step.scene?.context].filter(Boolean);
    for (let n = 0; n < countItems(ex); n++) {
      if (ex.type === 'detective' && n === 0) continue;
      const {answers} = itemInfo(ex, `${ex.id}#${n}`);
      for (const text of shown) for (const a of answers ?? []) {
        if (typeof a === 'string' && leaks(text, a, 'pt')) found.push(`${ex.id}#${n}: «${a}» en «${text}»`);
      }
    }
  }
  assert.deepEqual(found, []);
});
