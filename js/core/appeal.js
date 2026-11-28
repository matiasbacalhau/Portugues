// Nivel 4 de la cascada: la revisión con IA a pedido del usuario ("Revisar com IA"), una por ítem.
// Arma lo que ve el juez (proxy/judge.js) y convierte su veredicto en un resultado. Nunca muestra texto del modelo:
// el veredicto elige una de las devoluciones de la app y la cita solo sirve para subrayar.
import { itemInfo } from './runner.js';
import { feedbackFor } from './checks/common.js';
import { grammarScope } from './classify.js';

// El ejercicio como lo vio el usuario: consigna, contexto, texto y la pregunta o el hueco del ítem.
export function appealContext(ex, key) {
  const n = Number(String(key).split('#')[1] ?? 0);
  const lines = [];
  const add = (label, text) => { if (text) lines.push(`${label}: ${String(text).trim()}`); };
  add('Instruction', ex.prompt);
  add('Context', ex.context ?? ex.scene?.context);
  if (ex.type === 'translate') add(`Translate from ${ex.from === 'en' ? 'English' : 'Spanish'}`, ex.source);
  if (ex.type === 'transform') { add('Sentence', ex.source); add('Change', ex.instruction); }
  if (ex.type === 'reading') { add('Text', ex.text); add('Question', ex.questions[n]?.prompt); }
  if (ex.type === 'gap') add('Sentence with a blank', ex.text);
  if (ex.type === 'situation') {
    ex.bubbles.forEach((b) => add(b.who === 'me' ? 'Learner' : 'Other person', b.text));
    add('Blank to fill', `(${n + 1})`);
  }
  if (ex.type === 'detective') add('Sentence with a blank', ex.apply[n - 1]?.text);
  return lines.join('\n');
}

export const appealExpected = (ex, key) => (itemInfo(ex, key).answers ?? []).filter((a) => typeof a === 'string');

export const canAppeal = (ex, key) => appealExpected(ex, key).length > 0 && appealContext(ex, key) !== '';

// prev: el resultado local; verdict: {verdict, quote}; ctx: {curriculum, lexicon}. Devuelve el resultado revisado.
export function applyVerdict(ex, prev, {verdict, quote}, ctx) {
  const reading = ex.type === 'reading';
  const base = {...prev, appealed: true, judge: verdict};
  delete base.wrong;
  if (verdict === 'correct') {
    return {...base, ok: true, rule: null, rule_pt: null, errorType: undefined, notice: 'Revisado con IA: tu respuesta está bien.'};
  }
  const type = verdict === 'grammar' ? grammarScope(quote, prev.tag, ctx.lexicon ?? []) : verdict;
  const info = ctx.curriculum.tags[prev.tag] ?? {};
  const givenNfc = String(prev.given ?? '').normalize('NFC');
  const quoteNfc = quote ? String(quote).normalize('NFC') : '';
  const at = quoteNfc ? givenNfc.indexOf(quoteNfc) : -1;
  return {
    ...base,
    given: givenNfc,
    ok: false,
    ...feedbackFor(type, info, {reading}),
    errorType: type,
    ...(at >= 0 ? {wrong: [{offset: at, length: quoteNfc.length}]} : {}),
  };
}
