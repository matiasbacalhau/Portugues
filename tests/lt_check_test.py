import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from lt_check import batches, is_error, locate, split_multi  # noqa: E402

TEXTS = [{'where': 'a: text', 'text': 'Ich habe ein Hund.'},
         {'where': 'b: text', 'text': 'Das ist gut.'},
         {'where': 'c: text', 'text': 'Wir gehen.'}]


class LtCheckTest(unittest.TestCase):
    def test_batches_de_a_50(self):
        items = [{'where': str(i), 'text': 't'} for i in range(120)]
        self.assertEqual([len(b) for b in batches(items)], [50, 50, 20])

    def test_split_multi(self):
        items = [{'where': 'a', 'text': 'x', 'multi': True}, {'where': 'b', 'text': 'y'}]
        multi, single = split_multi(items)
        self.assertEqual(([t['where'] for t in multi], [t['where'] for t in single]), (['a'], ['b']))

    def test_locate_reparte_offsets(self):
        joined = '\n\n'.join(t['text'] for t in TEXTS)
        second = joined.index('Das')
        matches = [{'offset': 4, 'length': 4, 'rule': {'id': 'R1'}, 'message': 'm1'},
                   {'offset': second + 4, 'length': 3, 'rule': {'id': 'R2'}, 'message': 'm2'},
                   {'offset': joined.index('Wir'), 'length': 3, 'rule': {'id': 'R3'}, 'message': 'm3'}]
        got = [(t['where'], m['rule']['id']) for t, m in locate(TEXTS, matches)]
        self.assertEqual(got, [('a: text', 'R1'), ('b: text', 'R2'), ('c: text', 'R3')])

    def test_match_en_el_separador_va_al_texto_anterior(self):
        joined = '\n\n'.join(t['text'] for t in TEXTS)
        m = {'offset': len(TEXTS[0]['text']) + 1, 'length': 1, 'rule': {'id': 'X'}, 'message': ''}
        self.assertEqual(locate(TEXTS, [m])[0][0]['where'], 'a: text')

    def test_is_error_sigue_el_criterio_de_la_app(self):
        lt_map = {'notice_categories': ['REDUNDANCY'], 'accepted_words': ['Lea']}
        def m(rule, cat='TYPOS'):
            return {'rule': {'id': rule, 'category': {'id': cat}}}
        self.assertFalse(is_error('lea', 'A Lea mora aqui.', m('MORFOLOGIK_RULE_PT_BR'), lt_map))
        self.assertTrue(is_error('bonitta', 'Uma casa bonitta.', m('MORFOLOGIK_RULE_PT_BR'), lt_map))
        self.assertFalse(is_error('muito boa', 'A cama é muito boa.', m('X', 'REDUNDANCY'), lt_map))
        self.assertFalse(is_error('pão', 'pão', m('UPPERCASE_SENTENCE_START', 'CASING'), lt_map))
        self.assertTrue(is_error('eu', 'eu moro aqui.', m('UPPERCASE_SENTENCE_START', 'CASING'), lt_map))


if __name__ == '__main__':
    unittest.main()
