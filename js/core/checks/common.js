// Piezas compartidas por los checks: armado del Result y evaluación de respuestas escritas.
import { matchAnswer, wrongWords } from '../normalize.js';
import { classifyMiss, nameArticleVariants } from '../classify.js';
import { diagnose } from '../diagnose.js';

export const tagInfo = (ctx, tag) => ctx.curriculum.tags[tag] ?? {};

export function result(key, tag, ok, {rule = null, rule_pt = null, notice = null, prereq = null, ...extra} = {}) {
  return {key, tag, ok, rule: ok ? null : rule, rule_pt: ok ? null : rule_pt, notice, prereq, review: false, ...extra};
}

// Los tipos multi-ítem siempre usan `id#n`, aun con un solo ítem.
export const keyFor = (ex, n) => `${ex.id}#${n}`;

export const EVALUATED_OK = 'Lo que practica este ejercicio está bien: el error está en lo subrayado, que es de otro tema.';
export const EVALUATED_OK_PT = 'O tema deste exercício está certo: o erro está na parte sublinhada.';

// Devolución de cada tipo de error que no es de gramática (classify.js). Nombran el tipo, nunca la respuesta (regla 3).
export const TYPED = {
  spelling: {rule: 'Hay una palabra mal escrita: revisá lo subrayado.', rule_pt: 'Tem uma palavra escrita errado: confira a parte sublinhada.'},
  accent: {rule: 'Con esa tilde (o sin ella) es otra palabra: revisá lo subrayado.', rule_pt: 'Com esse acento (ou sem ele) é outra palavra: confira a parte sublinhada.'},
  content: {rule: 'La gramática está bien, pero lo subrayado no corresponde con lo que se pide.', rule_pt: 'A gramática está certa, mas a parte sublinhada não corresponde ao que se pede.'},
  reading: {rule: 'La gramática está bien, pero la respuesta no coincide con lo que dice el texto: volvé a leerlo.', rule_pt: 'A gramática está certa, mas a resposta não bate com o texto: releia.'},
  unknown: {rule: 'Tu respuesta no coincide con lo esperado: revisá lo subrayado.', rule_pt: 'A resposta não coincide com o esperado: confira a parte sublinhada.'},
};

// La devolución de un tipo de error: la regla del tema solo para un error del tema (y esos son los únicos que bajan el
// mastery del tag y muestran su ejemplo; ver mastery.js y runner.exampleFor).
export function feedbackFor(type, info, {reading = false} = {}) {
  if (type === 'grammar-tag') return {rule: info.rule, rule_pt: info.rule_pt};
  if (type === 'grammar-other') return {rule: EVALUATED_OK, rule_pt: EVALUATED_OK_PT};
  return TYPED[type === 'content' && reading ? 'reading' : type] ?? TYPED.unknown;
}

// item: ejercicio o hueco con {tag, answers, errors?, dims?, generated?}; opts.reading: pregunta de lectura.
// Cascada: 1) respuesta aceptada (con tolerancias y artículo opcional ante nombre), 2) error anotado, 3) clasificador
// local del tipo de error, que se abstiene ('unknown') cuando no puede decidir. El 4) es la revisión con IA, a pedido.
export function checkWritten(key, item, answer, ctx, {reading = false} = {}) {
  const info = tagInfo(ctx, item.tag);
  const opts = {orthographic: !!info.orthographic};
  const accepted = opts.orthographic ? item.answers : [...item.answers, ...nameArticleVariants(item.answers, ctx.lexicon ?? [])];
  const m = matchAnswer(answer, accepted, opts);
  if (m.ok) return result(key, item.tag, true, {notice: m.notice});
  if (item.generated) {
    const d = diagnose(item, answer, ctx.curriculum.tags, ctx.lexicon);
    return result(key, item.tag, false, {...d, given: String(answer)});
  }
  const hit = (item.errors ?? []).find((e) => matchAnswer(answer, [e.answer], opts).ok);
  // En una frase, además de la regla, las palabras que difieren: así se ve también un segundo error.
  if (hit) {
    const wrong = wrongWords(String(answer), accepted, opts);
    return result(key, item.tag, false, {rule: hit.rule, rule_pt: hit.rule_pt ?? info.rule_pt, given: String(answer), ...(wrong.length ? {wrong} : {})});
  }
  const cls = classifyMiss(String(answer), accepted, {tag: item.tag, reading, lexicon: ctx.lexicon ?? []});
  const wrong = cls.wrong.length ? cls.wrong : wrongWords(String(answer), accepted, opts);
  // `given`: el texto tal como llegó, para el registro local (así se puede ver por qué una respuesta no se aceptó).
  return result(key, item.tag, false, {
    ...feedbackFor(cls.type, info, {reading}),
    errorType: cls.type,
    given: String(answer),
    ...(wrong.length ? {wrong} : {}),
  });
}

// options: [{text, correct?, rule?}]; answer: índice elegido.
export function checkOption(key, tag, options, answer, ctx) {
  const opt = options[answer];
  if (opt?.correct) return result(key, tag, true);
  // Una opción de contenido (`content: true`: otro dato del texto, otro lugar) no es un error del tema.
  return result(key, tag, false, {
    rule: opt?.rule ?? tagInfo(ctx, tag).rule,
    rule_pt: opt?.rule_pt ?? tagInfo(ctx, tag).rule_pt,
    ...(opt?.content ? {errorType: 'content'} : {}),
  });
}
