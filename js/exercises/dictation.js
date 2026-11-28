// dictation: se oye una frase y se escribe. answer = string. La frase suena solo al tocar 🔊 (a 0,8×) o "1×";
// el texto original aparece recién en el feedback (grupo.js).
import { h } from '../ui/dom.js';
import { answerInput, speakerIcon } from '../ui/inputs.js';
import * as tts from '../services/tts.js';
import { onceButton, onEnter } from './common.js';

export function render(ex, el, { submit, onNoAudio }) {
  // speak() rechaza si otra frase la interrumpe: no es un error para el usuario.
  const play = (rate) => () => tts.speak(ex.text, { rate }).catch(() => {});
  const input = answerInput({ label: 'O que você ouviu' });
  const btn = onceButton('Verificar', () => submit(input.value()), () => input.value().trim() !== '');
  input.addEventListener('input', btn.refresh);
  onEnter(input, () => btn.click());
  el.append(
    h('p', { class: 'muted' }, 'Ouça e escreva a frase.'),
    h('p', { class: 'listen-row' },
      h('button', { type: 'button', class: 'listen', 'aria-label': 'Ouvir mais devagar', lang: 'pt-BR', onclick: play(0.8) }, speakerIcon()),
      h('button', { type: 'button', class: 'secondary small', 'aria-label': 'Velocidade normal', lang: 'pt-BR', onclick: play(1) }, '1×'),
    ),
    input, btn,
    h('button', { type: 'button', class: 'secondary no-audio', onclick: () => onNoAudio?.() }, 'Sem áudio agora'),
  );
}
