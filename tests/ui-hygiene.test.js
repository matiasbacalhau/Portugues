import { test } from 'node:test';
import assert from 'node:assert/strict';

function mockDom() {
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
  globalThis.document = { createElement: mk, createDocumentFragment: () => mk('#fragment') };
  globalThis.window = {};
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

test('pares UI: sin speechSynthesis no renderiza botones de audio rotos', async () => {
  const { mk, restore } = mockDom();
  try {
    const { render } = await import('../js/exercises/pares.js');
    const el = mk('div');
    const ex = { id: 'p1', type: 'pares', tag: 'a1.som.nasal', pair: [{ pt: 'pão', es: 'pan' }, { pt: 'pau', es: 'palo' }] };
    render(ex, el, { submit() {} });
    const flat = JSON.stringify(el);
    assert.ok(!flat.includes('🔊'), 'sin speechSynthesis no debe mostrar 🔊');
  } finally {
    restore();
  }
});
