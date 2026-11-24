// Generador de huecos de *sein* en presente: una instancia por sujeto. Los sujetos evitan *sie*/*Sie* sueltos al
// comienzo de la frase, que serían ambiguos (ella, ellos o usted: dos respuestas posibles).
export const SEIN = {ich: 'bin', du: 'bist', er: 'ist', wir: 'sind', ihr: 'seid', sie: 'sind'};
const SUBJECTS = [
  {pt: 'Ich', person: 'ich'}, {pt: 'Du', person: 'du'}, {pt: 'Tom', person: 'er'},
  {pt: 'Wir', person: 'wir'}, {pt: 'Ihr', person: 'ihr'}, {pt: 'Tom und Lea', person: 'sie'},
];

export function instances(template) {
  return SUBJECTS.map(s => ({
    id: `${template.id}:${s.person}`,
    type: 'gap',
    tag: template.tag_prefix,
    context: template.context,
    text: template.text.replace('{subject}', s.pt),
    answers: [SEIN[s.person]],
    dims: {person: s.person},
    generated: true,
  }));
}
