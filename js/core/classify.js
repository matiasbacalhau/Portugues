// Nivel 3 de la cascada de corrección: cuando una respuesta escrita no coincide con ninguna aceptada ni con un error
// anotado, decide QUÉ TIPO de error es para elegir la devolución. Nunca dice cuál es la forma correcta (regla 3).
// Tipos: 'spelling' (letra de más o de menos), 'accent' (la tilde cambia la palabra: esta/está), 'content' (el dato o la
// palabra no corresponde: otro nombre, otro lugar), 'grammar-tag' (forma del tema del ejercicio), 'grammar-other'
// (forma de otro tema) y 'unknown': se abstiene cuando no puede decidir, y la app muestra un mensaje neutro.
import { present, PERSONS } from './morph.js';

const lower = (s) => String(s).toLocaleLowerCase('pt-BR').normalize('NFC');
const fold = (s) => lower(s).normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
const tokens = (s) => [...String(s).normalize('NFC').matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map((m) => ({w: m[0], offset: m.index, length: m[0].length}));

const ART = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas']);
const CONTR = new Set(['no', 'na', 'nos', 'nas', 'num', 'numa', 'do', 'da', 'dos', 'das', 'dum', 'duma', 'pelo', 'pela', 'pelos', 'pelas',
  'ao', 'à', 'aos', 'às', 'em', 'de', 'por']);
const PRON = new Set(['eu', 'você', 'ele', 'ela', 'nós', 'vocês', 'eles', 'elas', 'gente']);

// Índice por léxico (se arma una vez): forma conjugada → lema, y los lemas (para no tomar *Brasil* por un nombre propio).
const indexes = new WeakMap();
function indexOf(lexicon) {
  if (!indexes.has(lexicon)) {
    const verbs = new Map();
    for (const v of lexicon.filter((w) => w.pos === 'verb')) for (const p of PERSONS) for (const f of present(v, p)) verbs.set(lower(f), v.lemma);
    const words = new Set(lexicon.flatMap((w) => [w.lemma, w.plural].filter(Boolean).map(lower)));
    indexes.set(lexicon, {verbs, words});
  }
  return indexes.get(lexicon);
}

// Familia gramatical de una palabra: los verbos *ser* y *estar* aparte, porque tienen tags propios.
function familyOf(w, idx) {
  const x = lower(w);
  if (idx.verbs.has(x)) return ['ser', 'estar'].includes(idx.verbs.get(x)) ? `verb:${idx.verbs.get(x)}` : 'verb';
  if (ART.has(x) || CONTR.has(x)) return 'det';
  if (PRON.has(x)) return 'pron';
  return null;
}
const sameGroup = (a, b) => a === b || (a?.startsWith('verb') && b?.startsWith('verb'));

// Las familias de palabras que evalúa cada tag.
export function tagFamilies(tag = '') {
  if (/^a1\.(genero|contr)\./.test(tag)) return ['det'];
  if (tag === 'a1.ser.presente') return ['verb:ser'];
  if (tag === 'a1.estar.presente') return ['verb:estar'];
  if (tag === 'a1.ser.estar') return ['verb:ser', 'verb:estar'];
  if (/^a1\.presente\./.test(tag)) return ['verb', 'verb:ser', 'verb:estar'];
  if (tag === 'a1.pron.sujeito') return ['pron'];
  return [];
}

// Nombre propio: mayúscula y no es palabra del léxico ni de una familia gramatical (*Lea*, *Rosario*; no *Brasil*, no *Ela*).
const isName = (w, idx) => /^\p{Lu}/u.test(w) && !idx.words.has(lower(w)) && !familyOf(w, idx);

// En Brasil el artículo ante nombre de persona es opcional: "O Leo mora…" acepta también "Leo mora…".
// Solo se agrega la variante sin artículo; un artículo del otro género (*A Leo*) sigue siendo error.
export function nameArticleVariants(accepted, lexicon) {
  const idx = indexOf(lexicon);
  const out = [];
  for (const a of accepted) {
    if (typeof a !== 'string') continue;
    // Cada artículo ante nombre se puede omitir por separado ("Mia e a Lea", "A Mia e Lea", "Mia e Lea").
    const spots = [...a.matchAll(/(^|\s)(o|a|O|A) (?=(\p{Lu}[\p{L}\p{M}]*))/gu)].filter((m) => isName(m[3], idx)).slice(0, 3);
    for (let mask = 1; mask < 1 << spots.length; mask++) {
      let v = a;
      for (let k = spots.length - 1; k >= 0; k--) {
        if (!(mask & (1 << k))) continue;
        const m = spots[k];
        v = v.slice(0, m.index) + m[1] + v.slice(m.index + m[0].length);
      }
      v = v.trim();
      if (v) out.push(v.charAt(0).toLocaleUpperCase('pt-BR') + v.slice(1));
    }
  }
  return out;
}

function lev(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

// Diferencias palabra a palabra (subsecuencia común más larga): pares {a: token de la respuesta | null, t: palabra | null}.
function diff(a, t) {
  const eq = (x, y) => lower(x) === lower(y);
  const L = Array.from({length: a.length + 1}, () => new Array(t.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = t.length - 1; j >= 0; j--) L[i][j] = eq(a[i].w, t[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = [];
  let i = 0, j = 0, extra = [], missing = [];
  const flush = () => {
    for (let k = 0; k < Math.max(extra.length, missing.length); k++) ops.push({a: extra[k] ?? null, t: missing[k] ?? null});
    extra = []; missing = [];
  };
  while (i < a.length || j < t.length) {
    if (i < a.length && j < t.length && eq(a[i].w, t[j])) { flush(); i++; j++; }
    else if (j < t.length && (i >= a.length || L[i][j + 1] >= L[i + 1][j])) missing.push(t[j++]);
    else extra.push(a[i++]);
  }
  flush();
  return {ops, score: L[0][0]};
}

// Casi la misma palabra: una o dos letras de diferencia según el largo (*Chiile*, *gossto*), pero no *Lea*/*Mia*.
const near = (w, t) => {
  const x = fold(w), y = fold(t);
  return lev(x, y) <= (Math.min(x.length, y.length) >= 5 ? 2 : 1);
};
// Cambia la terminación (*estam* por *estão*, *falan* por *falam*): eso es conjugar, no tipear.
const endingChanged = (w, t) => fold(w).slice(-2) !== fold(t).slice(-2);

function kindOf({a, t}, tag, idx) {
  const w = a?.w ?? null;
  if (w && t && fold(w) === fold(t)) return 'accent';
  const fw = w && familyOf(w, idx), ft = t && familyOf(t, idx);
  const fams = tagFamilies(tag);
  const inTag = (f) => f && fams.includes(f);
  // Una palabra inexistente casi igual a la esperada: tipeo, salvo que cambie la terminación de una forma del tema.
  if (w && t && !fw && !idx.words.has(lower(w)) && near(w, t)) return inTag(ft) && endingChanged(w, t) ? 'grammar-tag' : 'spelling';
  if ((w && isName(w, idx)) || (t && isName(t, idx))) return 'content';
  // Forma gramatical cambiada, sobrante o faltante (artículo, contracción, verbo, pronombre).
  if ((fw || ft) && (!w || !t || sameGroup(fw, ft))) return inTag(fw) || inTag(ft) ? 'grammar-tag' : 'grammar-other';
  return 'content';
}

// Un error de gramática que señaló la revisión con IA (la cita): ¿es del tema del tag o de otro? Sin cita, o con un tag
// sin familias conocidas, se toma como del tema.
export function grammarScope(quote, tag, lexicon = []) {
  const idx = indexOf(lexicon);
  const fams = tagFamilies(tag);
  const found = tokens(quote ?? '').map((x) => familyOf(x.w, idx)).filter(Boolean);
  if (!found.length || !fams.length) return 'grammar-tag';
  return found.some((f) => fams.includes(f)) ? 'grammar-tag' : 'grammar-other';
}

// accepted: respuestas aceptadas; opts: {tag, reading, lexicon}. Devuelve {type, wrong: [{offset, length}]}.
export function classifyMiss(answer, accepted, {tag, reading = false, lexicon = []} = {}) {
  const idx = indexOf(lexicon);
  const a = tokens(answer);
  const targets = accepted.filter((x) => typeof x === 'string');
  if (!a.length || !targets.length) return {type: 'unknown', wrong: []};
  const best = targets.map((x) => diff(a, tokens(x).map((y) => y.w))).sort((x, y) => y.score - x.score)[0];
  const wrong = best.ops.filter((o) => o.a).map((o) => ({offset: o.a.offset, length: o.a.length}));
  // Demasiado distinta de toda respuesta aceptada: no hay base para afirmar un tipo.
  if (!best.ops.length || best.ops.length > 3) return {type: 'unknown', wrong};
  const kinds = new Set(best.ops.map((o) => kindOf(o, tag, idx)));
  // Un tag sin familias conocidas no puede afirmar "es de otro tema": muestra su propia regla.
  if (!tagFamilies(tag).length && kinds.delete('grammar-other')) kinds.add('grammar-tag');
  // En un hueco (una palabra contra una palabra) lo escrito es justo lo evaluado: otra palabra es error del tema.
  if (!reading && a.length === 1 && best.ops.length === 1 && kinds.delete('content')) kinds.add('grammar-tag');
  const main = ['grammar-tag', 'grammar-other', 'content'].filter((k) => kinds.has(k));
  let type;
  if (!main.length) type = kinds.has('spelling') ? 'spelling' : 'accent';
  else if (main.length === 1) type = main[0];
  else if (kinds.has('content')) type = reading ? 'content' : 'unknown'; // gramática y contenido a la vez
  else type = 'grammar-tag'; // del tema y de otro tema: manda el del tema
  return {type, wrong};
}
