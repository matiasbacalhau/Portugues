// h('button', { class: 'x', onclick: fn }, 'texto') → elemento. Los hijos null/false se ignoran.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...children.flat().filter(c => c != null && c !== false));
  return el;
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// Texto del contenido con *énfasis* → nodos (texto y <em>).
// Consigna en portugués con el original en español a un toque (inmersión, nivel 2).
// Sin texto devuelve un fragmento vacío: los ejercicios usan el.append, que escribiría "undefined".
export const inSpanish = text => (text
  ? h('details', { class: 'rule-accordion es-hint' },
    h('summary', { lang: 'pt-BR' }, 'Em espanhol'), h('p', { class: 'muted', lang: 'es' }, rich(text)))
  : document.createDocumentFragment());

export const rich = text => String(text ?? '').split(/\*([^*]+)\*/).map((part, i) => (i % 2 ? h('em', {}, part) : part));

// Modo claro (por defecto) u oscuro, elegido en Ajustes.
export function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1e1b17' : '#f4f0e9');
}
