// Piezas compartidas por los checks: armado del Result y evaluación de respuestas escritas.
import { matchAnswer, wrongWords, closestAnswer, keyWords } from '../normalize.js';
import { diagnose } from '../diagnose.js';

export const tagInfo = (ctx, tag) => ctx.curriculum.tags[tag] ?? {};

export function result(key, tag, ok, {rule = null, rule_pt = null, notice = null, prereq = null, ...extra} = {}) {
  return {key, tag, ok, rule: ok ? null : rule, rule_pt: ok ? null : rule_pt, notice, prereq, review: false, ...extra};
}

// Los tipos multi-ítem siempre usan `id#n`, aun con un solo ítem.
export const keyFor = (ex, n) => `${ex.id}#${n}`;

// Las palabras que evalúa cada tag, cuando lo evaluado es una palabra (no el orden, como en las W-Fragen).
const KEY_WORDS = {
  'a1.ser.presente': ['sou', 'é', 'somos', 'são'],
  'a1.estar.presente': ['estou', 'está', 'estamos', 'estão'],
  'a1.ser.estar': ['sou', 'é', 'somos', 'são', 'estou', 'está', 'estamos', 'estão'],
  'a1.pron.sujeito': ['eu', 'você', 'ele', 'ela', 'nós', 'vocês', 'eles', 'elas', 'gente'],
};
const ARTICLES = ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas'];
const CONTRACTIONS = ['no', 'na', 'nos', 'nas', 'num', 'numa', 'do', 'da', 'dos', 'das', 'dum', 'duma', 'pelo', 'pela', 'pelos', 'pelas',
  'ao', 'à', 'aos', 'às', 'em', 'de', 'por'];
const keyWordsOf = tag => KEY_WORDS[tag] ?? (/^a1\.genero\./.test(tag ?? '') ? ARTICLES
  : /^a1\.contr\./.test(tag ?? '') ? [...ARTICLES, ...CONTRACTIONS] : null);
export const EVALUATED_OK = 'Lo que practica este ejercicio está bien: el error está en lo subrayado, que es de otro tema.';
export const EVALUATED_OK_PT = 'O tema deste exercício está certo: o erro está na parte sublinhada.';

// item: ejercicio o hueco con {tag, answers, errors?, dims?, generated?}.
export function checkWritten(key, item, answer, ctx) {
  const info = tagInfo(ctx, item.tag);
  const m = matchAnswer(answer, item.answers, {orthographic: !!info.orthographic});
  if (m.ok) return result(key, item.tag, true, {notice: m.notice});
  if (item.generated) {
    const d = diagnose(item, answer, ctx.curriculum.tags, ctx.lexicon);
    return result(key, item.tag, false, {...d, given: String(answer)});
  }
  const hit = (item.errors ?? []).find((e) => matchAnswer(answer, [e.answer], {orthographic: !!info.orthographic}).ok);
  // En una frase, además de la regla, las palabras que difieren: así se ve también un segundo error.
  const opts = {orthographic: !!info.orthographic};
  const wrong = wrongWords(String(answer), item.answers, opts);
  // Si las palabras que evalúa el tag coinciden con la respuesta más parecida, el error es de otro tema: la regla
  // del tag no lo explica.
  const words = keyWordsOf(item.tag);
  const elsewhere = !hit && wrong.length && words && (() => {
    const set = new Set(words);
    return keyWords(String(answer), set).join(' ') === keyWords(closestAnswer(String(answer), item.answers, opts), set).join(' ');
  })();
  // `given`: el texto tal como llegó, para el registro local (así se puede ver por qué una respuesta no se aceptó).
  return result(key, item.tag, false, {
    rule: hit?.rule ?? (elsewhere ? EVALUATED_OK : info.rule),
    rule_pt: hit?.rule_pt ?? (elsewhere ? EVALUATED_OK_PT : info.rule_pt),
    given: String(answer),
    ...(wrong.length ? {wrong} : {}),
  });
}

// options: [{text, correct?, rule?}]; answer: índice elegido.
export function checkOption(key, tag, options, answer, ctx) {
  const opt = options[answer];
  if (opt?.correct) return result(key, tag, true);
  return result(key, tag, false, {
    rule: opt?.rule ?? tagInfo(ctx, tag).rule,
    rule_pt: opt?.rule_pt ?? tagInfo(ctx, tag).rule_pt,
  });
}
