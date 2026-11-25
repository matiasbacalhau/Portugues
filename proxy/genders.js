// El género de un sustantivo conocido sale del léxico de la app, no del modelo (que a veces lo confunde con el español:
// "o ponte" porque en español es "el puente"). El modelo dice dónde está el error; el léxico decide el género.
const GENDER = {o: 'MASC', a: 'FEM'};
const KINDS = ['ART'];

// lexicon: data/lexicon.json. Devuelve {singular: Map forma → MASC|FEM} con lema y plural (el plural tiene el género del lema).
// Una forma con dos géneros (o/a cabeça…) queda fuera: ahí no hay una respuesta única.
export function nounIndex(lexicon) {
  const seen = new Map();
  const put = (form, g) => seen.set(form, seen.has(form) && seen.get(form) !== g ? null : g);
  for (const w of lexicon) {
    if (w.pos !== 'noun' || !GENDER[w.article]) continue;
    put(w.lemma, GENDER[w.article]);
    if (w.plural) put(w.plural, GENDER[w.article]);
  }
  return {singular: new Map([...seen].filter(([, g]) => g))};
}

// error: {quote, occurrence, category, noun}. Solo cambia categorías ART_<género>.
export function recategorize(error, nouns) {
  const [kind, gender] = String(error.category).split('_');
  if (!nouns || !KINDS.includes(kind) || !['MASC', 'FEM'].includes(gender)) return error;
  const noun = String(error.noun ?? '').trim().split(/\s+/).pop()?.toLowerCase();
  const g = nouns.singular.get(noun);
  return g ? {...error, category: `${kind}_${g}`} : error;
}
