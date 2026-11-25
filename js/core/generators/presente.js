// Generador de huecos de presente: una instancia por sujeto. El verbo sale del léxico (`template.verb`) y se nombra
// en el contexto, nunca en la frase (la frase rellena va al dictado y a LanguageTool).
// Los sujetos cubren las 4 formas de Brasil: *você*, *ele/ela* y *a gente* van con la misma; *vocês* y *eles* también.
import { present } from '../morph.js';

export const SUBJECTS = [
  {pt: 'Eu', person: 'eu'}, {pt: 'Você', person: 'ele'}, {pt: 'A Lea', person: 'ele'}, {pt: 'A gente', person: 'ele'},
  {pt: 'Nós', person: 'nos'}, {pt: 'Vocês', person: 'eles'}, {pt: 'O Tom e a Mia', person: 'eles'},
];

export function instances(template, lexicon = []) {
  const verb = lexicon.find(w => w.pos === 'verb' && w.lemma === template.verb);
  if (!verb) return [];
  return SUBJECTS.map(s => ({
    id: `${template.id}:${s.person}:${s.pt.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'gap',
    tag: template.tag_prefix,
    context: `${template.context} Verbo: *${verb.lemma}*.`,
    context_es: template.context_es && `${template.context_es} Verbo: *${verb.lemma}*.`,
    text: template.text.replace('{subject}', s.pt),
    answers: present(verb, s.person),
    dims: {person: s.person},
    verb: verb.lemma,
    generated: true,
  }));
}
