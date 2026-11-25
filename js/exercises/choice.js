// choice: tocar una opción responde. answer = índice original de la opción.
import { h, rich, inSpanish } from '../ui/dom.js';
import { shuffledIndexes } from './common.js';

export function render(ex, el, { submit }) {
  let sent = false;
  const pick = i => { if (sent) return; sent = true; el.querySelectorAll('button').forEach(b => { b.disabled = true; }); submit(i); };
  el.append(
    h('p', { lang: 'pt-BR' }, rich(ex.prompt)),
    inSpanish(ex.prompt_es),
    ...shuffledIndexes(ex.options.length).map(i => h('button', { type: 'button', class: 'secondary option', onclick: () => pick(i) }, rich(ex.options[i].text))),
  );
}
