import { test } from 'node:test';
import assert from 'node:assert/strict';

function mockDom(win = {}) {
  const mk = (tag) => {
    const node = {
      tag,
      attrs: {},
      children: [],
      value: '',
      append(...c) { this.children.push(...c); },
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener() {},
      querySelectorAll: () => [],
    };
    return node;
  };
  globalThis.document = {
    createElement: mk,
    createElementNS: (_ns, tag) => mk(tag),
    createDocumentFragment: () => mk('#fragment'),
  };
  globalThis.window = win;
  return { mk, restore() { delete globalThis.document; delete globalThis.window; } };
}

test('answerInput: pone lang="pt-BR" en el campo y normaliza value() a NFC', async () => {
  const { restore } = mockDom();
  try {
    const { answerInput } = await import('../js/ui/inputs.js');
    const root = answerInput({ label: 'Sua resposta' });
    const field = root.children.find((c) => c.tag === 'input');
    assert.equal(field.attrs.lang, 'pt-BR');
    field.value = 'você'.normalize('NFD');
    assert.equal(root.value(), 'você'.normalize('NFC'));
  } finally {
    restore();
  }
});

test('listenButton: usa SVG accesible (aria-hidden) en vez de emoji 🔊', async () => {
  const { restore } = mockDom({ speechSynthesis: {} });
  try {
    const { listenButton } = await import('../js/ui/inputs.js');
    const btn = listenButton('Bom dia');
    const flat = JSON.stringify(btn);
    assert.ok(!flat.includes('🔊'), 'no debe usar emoji 🔊');
    const svg = btn.children.find((c) => c?.tag === 'svg');
    assert.ok(svg, 'debe contener un <svg>');
    assert.equal(svg.attrs['aria-hidden'], 'true');
  } finally {
    restore();
  }
});

test('pares UI: sin speechSynthesis no renderiza botones de audio rotos', async () => {
  const { mk, restore } = mockDom();
  try {
    const { render } = await import('../js/exercises/pares.js');
    const el = mk('div');
    const ex = { id: 'p1', type: 'pares', tag: 'a1.som.nasal', pair: [{ pt: 'pão', es: 'pan' }, { pt: 'pau', es: 'palo' }] };
    render(ex, el, { submit() {} });
    const flat = JSON.stringify(el);
    assert.ok(!flat.includes('"class":"listen"'), 'sin speechSynthesis no debe mostrar botón listen');
  } finally {
    restore();
  }
});
