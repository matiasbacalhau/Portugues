// Morfología mínima del portugués de Brasil: artículos, contracciones con preposición y presente.

// gender: m | f; number: sg | pl.
const ARTICLES = {
  def: {m: {sg: 'o', pl: 'os'}, f: {sg: 'a', pl: 'as'}},
  indef: {m: {sg: 'um', pl: 'uns'}, f: {sg: 'uma', pl: 'umas'}},
};

// Preposición + artículo. La primera forma es la estándar escrita; las demás también valen.
// *de um* / *em um* son estándar en la escritura; *dum* y *num* son comunes, *num* sobre todo en el habla.
const CONTRACTIONS = {
  de: {o: ['do'], a: ['da'], os: ['dos'], as: ['das'], um: ['de um', 'dum'], uma: ['de uma', 'duma'], uns: ['de uns', 'duns'], umas: ['de umas', 'dumas']},
  em: {o: ['no'], a: ['na'], os: ['nos'], as: ['nas'], um: ['num', 'em um'], uma: ['numa', 'em uma'], uns: ['nuns', 'em uns'], umas: ['numas', 'em umas']},
  por: {o: ['pelo'], a: ['pela'], os: ['pelos'], as: ['pelas'], um: ['por um'], uma: ['por uma'], uns: ['por uns'], umas: ['por umas']},
  a: {o: ['ao'], a: ['à'], os: ['aos'], as: ['às'], um: ['a um'], uma: ['a uma'], uns: ['a uns'], umas: ['a umas']},
};

export const PREPS = Object.keys(CONTRACTIONS);

// Formas válidas del artículo (con la preposición ya contraída si hay `prep`).
export function article(det, gender, number = 'sg', prep = null) {
  const art = ARTICLES[det]?.[gender]?.[number];
  if (!art) return [];
  return prep ? [...(CONTRACTIONS[prep]?.[art] ?? [])] : [art];
}

// Todas las celdas que producen `form` ("no", "da", "de a"…). `split`: la preposición escrita sin contraer.
export function findArticle(form) {
  const f = String(form).trim().toLowerCase().replace(/\s+/g, ' ');
  const cells = [];
  for (const [det, genders] of Object.entries(ARTICLES))
    for (const [gender, numbers] of Object.entries(genders))
      for (const [number, art] of Object.entries(numbers)) {
        if (f === art) cells.push({det, gender, number, prep: null});
        for (const prep of PREPS) {
          if (CONTRACTIONS[prep][art].includes(f)) cells.push({det, gender, number, prep});
          else if (f === `${prep} ${art}`) cells.push({det, gender, number, prep, split: true});
        }
      }
  return cells;
}

// Personas del presente en Brasil: *você*, *ele*, *ela* y *a gente* comparten forma (ele); *vocês*, *eles*, *elas* también (eles).
export const PERSONS = ['eu', 'ele', 'nos', 'eles'];
const ENDINGS = {
  ar: {eu: 'o', ele: 'a', nos: 'amos', eles: 'am'},
  er: {eu: 'o', ele: 'e', nos: 'emos', eles: 'em'},
  ir: {eu: 'o', ele: 'e', nos: 'imos', eles: 'em'},
};

// verb: entrada del léxico {lemma, irregular?: {eu, ele, nos, eles}}. Un verbo en -por (*pôr*) va siempre en `irregular`.
export function present(verb, person) {
  const irr = verb.irregular?.[person];
  if (irr !== undefined) return Array.isArray(irr) ? [...irr] : [irr];
  const m = /^(.*)(ar|er|ir)$/.exec(verb.lemma);
  if (!m) return [];
  return [m[1] + ENDINGS[m[2]][person]];
}
