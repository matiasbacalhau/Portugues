// Diagnóstico de un hueco generado (artículo, contracción o verbo en presente). El texto nombra la regla y nunca la
// forma esperada.
import { findArticle, present, PERSONS } from './morph.js';

const PERSON_NAME = {
  eu: '*eu*',
  ele: '*você*, *ele*, *ela* y *a gente*',
  nos: '*nós*',
  eles: '*vocês*, *eles* y *elas*',
};
const PERSON_NAME_PT = {eu: '*eu*', ele: '*você*, *ele*, *ela* e *a gente*', nos: '*nós*', eles: '*vocês*, *eles* e *elas*'};

const fallback = (item, tags) => ({
  rule: tags[item.tag]?.rule ?? 'Repasá la regla de este tema.',
  rule_pt: tags[item.tag]?.rule_pt ?? 'Revise a regra deste tema.',
  prereq: null,
});

// Si escribió la forma de otra persona, nombra esa persona (lo que escribió), no la forma que va.
function diagnoseVerb(item, answer, tags, lexicon = []) {
  const given = String(answer).trim().toLowerCase();
  const word = item.word ?? lexicon.find(w => w.pos === 'verb' && w.lemma === item.verb);
  if (!word) return fallback(item, tags);
  const persons = PERSONS.filter(p => p !== item.dims.person && present(word, p).map(f => f.toLowerCase()).includes(given));
  if (!persons.length) return fallback(item, tags);
  return {
    rule: `Esa forma es la de ${persons.map(p => PERSON_NAME[p]).join(', ')}: fijate quién es el sujeto.`,
    rule_pt: `Forma de ${persons.map(p => PERSON_NAME_PT[p]).join(', ')}: confira o sujeito.`,
    prereq: null,
  };
}

const GENDER_NAME = {m: 'masculino', f: 'femenino'};
const GENDER_NAME_PT = {m: 'masculino', f: 'feminino'};
const SUFFIX = {m: 'masc', f: 'fem'};

// item: {tag, dims: {gender, number, det, prep?}, noun}; tags: curriculum.tags (para la regla del tag).
export function diagnose(item, answer, tags = {}, lexicon = []) {
  if (item.dims?.person) return diagnoseVerb(item, answer, tags, lexicon);
  const {gender, number = 'sg', det, prep = null} = item.dims;
  const cells = findArticle(answer).filter(c => c.det === det);
  // Escribió la preposición y el artículo separados (*em o*, *de a*): en portugués se juntan.
  if (prep && cells.some(c => c.split && c.prep === prep && c.gender === gender && c.number === number))
    return {
      rule: `*${prep}* + artículo se contrae en una sola palabra: no se escriben separados.`,
      rule_pt: `*${prep}* + artigo vira uma palavra só: não se escrevem separados.`,
      prereq: null,
    };
  // Puso el artículo solo, sin la preposición que pide la frase.
  if (prep && cells.some(c => c.prep === null && c.gender === gender && c.number === number))
    return {
      rule: `Falta la preposición *${prep}*: va unida al artículo.`,
      rule_pt: `Falta a preposição *${prep}*: ela se junta ao artigo.`,
      prereq: null,
    };
  const wrong = cells.find(c => (c.prep ?? null) === prep && !c.split && (c.gender !== gender || c.number !== number));
  if (wrong) {
    if (wrong.number !== number)
      return {
        rule: `*${item.noun}* no está en ${wrong.number === 'pl' ? 'plural' : 'singular'} acá: revisá el número.`,
        rule_pt: `Preste atenção ao número: aqui não é ${wrong.number === 'pl' ? 'plural' : 'singular'}.`,
        prereq: null,
      };
    return {
      rule: `*${item.noun}* no es ${GENDER_NAME[wrong.gender]} en portugués: revisá el género.`,
      rule_pt: `Preste atenção ao gênero: *${item.noun}* não é ${GENDER_NAME_PT[wrong.gender]}.`,
      prereq: prep ? `a1.genero.${SUFFIX[gender]}` : null,
    };
  }
  return fallback(item, tags);
}
