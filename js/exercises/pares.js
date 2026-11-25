// pares (pares mínimos): suena una de dos palabras que se diferencian en un solo sonido (pão / pau) y se elige cuál fue.
// La que suena se sortea al mostrar el ejercicio. answer = {said, picked} (índices de ex.pair).
// Nunca se muestra cuál sonó antes de responder; tras un error, solo la regla del sonido (grupo.js).
import { h, rich } from '../ui/dom.js';
import * as tts from '../services/tts.js';

export function render(ex, el, { submit, onNoAudio }) {
  const said = Math.random() < 0.5 ? 0 : 1;
  const text = ex.frame ? ex.frame.replace('___', ex.pair[said].pt) : ex.pair[said].pt;
  // speak() rechaza si otra frase la interrumpe: no es un error para el usuario.
  const play = (rate) => () => tts.speak(text, { rate }).catch(() => {});
  let sent = false;
  const pick = i => {
    if (sent) return;
    sent = true;
    el.querySelectorAll('button.option').forEach(b => { b.disabled = true; });
    submit({ said, picked: i });
  };
  el.append(
    h('p', {}, rich(ex.prompt ?? 'Ouça e escolha a palavra que você ouviu.')),
    h('p', { class: 'listen-row' },
      h('button', { type: 'button', class: 'listen', 'aria-label': 'Ouvir mais devagar', lang: 'pt-BR', onclick: play(0.8) }, '🔊'),
      h('button', { type: 'button', class: 'secondary small', 'aria-label': 'Velocidade normal', lang: 'pt-BR', onclick: play(1) }, '1×'),
    ),
    ...ex.pair.map((p, i) => h('button', { type: 'button', class: 'secondary option', lang: 'pt-BR', onclick: () => pick(i) },
      p.pt, p.es && h('span', { class: 'muted', lang: 'es' }, ` (${p.es})`))),
    h('button', { type: 'button', class: 'secondary no-audio', onclick: () => onNoAudio?.() }, 'Sem áudio agora'),
  );
}
