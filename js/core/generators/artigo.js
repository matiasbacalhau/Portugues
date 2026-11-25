// Generador de huecos de artículo: una instancia por lema que cabe en la ranura.
// Sin `prep`, el hueco es el artículo solo y el tag es `<tag_prefix>.masc|fem` (lo evaluado es el género).
// Con `prep`, el hueco es la contracción (*no*, *da*, *pelo*…) y el tag es `<tag_prefix>.<prep>`.
import { article } from '../morph.js';

const GENDER = {o: 'm', a: 'f'};
const SUFFIX = {m: 'masc', f: 'fem'};

function fits(slot, w, number) {
  if (!GENDER[w.article]) return false;
  if (w.pos !== slot.pos || !slot.fields.includes(w.field)) return false;
  if (number === 'pl') return w.plural != null;
  return !slot.countable || w.plural != null;
}

function build(template, w) {
  const gender = GENDER[w.article];
  const number = template.number ?? 'sg';
  const noun = number === 'pl' ? w.plural : w.lemma;
  return {
    id: `${template.id}:${w.lemma}`,
    type: 'gap',
    tag: `${template.tag_prefix}.${template.prep ?? SUFFIX[gender]}`,
    context: template.context,
    context_es: template.context_es,
    text: template.text.replace('{noun}', noun),
    answers: article(template.det, gender, number, template.prep ?? null),
    dims: {gender, number, det: template.det, ...(template.prep ? {prep: template.prep} : {})},
    noun: w.lemma,
    verb: template.verb,
    generated: true,
  };
}

export function instances(template, lexicon) {
  const number = template.number ?? 'sg';
  return lexicon.filter(w => fits(template.slot, w, number)).map(w => build(template, w));
}
