import { h } from './dom.js';
import * as tts from '../services/tts.js';

let seq = 0;

const KEYS = ['ã', 'õ', 'á', 'é', 'ê', 'ó', 'ô', 'ç', 'à', 'í', 'ú', 'â'];

// Campo de respuesta con fila de teclas con tildes y ç. Las teclas insertan en el cursor y no le sacan el foco al campo.
export function answerInput({ multiline = false, label, lang = 'pt-BR' } = {}) {
  const id = `answer-${++seq}`;
  const field = h(multiline ? 'textarea' : 'input', {
    id, lang, autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off', type: multiline ? null : 'text',
  });
  const insert = ch => {
    const { selectionStart: a, selectionEnd: b } = field;
    field.setRangeText(ch, a, b, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.focus();
  };
  const keys = KEYS.map(ch => h('button', {
    type: 'button', 'aria-label': ch,
    onmousedown: e => e.preventDefault(),
    onpointerdown: e => e.preventDefault(),
    onclick: () => insert(ch),
  }, ch));
  const root = h('div', { class: 'answer' }, label && h('label', { for: id }, label), field, h('div', { class: 'umlauts' }, keys));
  root.value = () => field.value.normalize('NFC');
  root.focus = () => field.focus();
  return root;
}

// Ícono SVG de parlante en currentColor (evita el emoji del sistema, gate 30a).
export function speakerIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const svg = el('svg', {
    viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  });
  svg.append(
    el('path', { d: 'M11 5L6 9H2v6h4l5 4V5z' }),
    el('path', { d: 'M15.5 8.5a5 5 0 0 1 0 7' }),
    el('path', { d: 'M18.5 5.5a9 9 0 0 1 0 13' }),
  );
  return svg;
}

// Botón de escucha que lee `text` con la voz de portugués predeterminada (en iOS, forzar una voz de la lista falla).
// Sin síntesis de voz no se muestra. Con el iPhone en silencio no suena: no hay forma de detectarlo.
export function listenButton(text) {
  if (!tts.supported()) return null;
  // speak() rechaza si otra frase la interrumpe: no es un error para el usuario.
  return h('button', { type: 'button', class: 'listen', 'aria-label': 'Escuchar', lang: 'es', onclick: () => tts.speak(text, { rate: 0.9 }).catch(() => {}) }, speakerIcon());
}
