// pares: answer = {said, picked}. Bien si eligió la palabra que sonó. Tras un error, la regla del sonido (del ejercicio o
// del tag), que explica la diferencia entre las dos sin decir cuál sonó (regla 3).
import { result, tagInfo } from './common.js';

export async function check(ex, answer, ctx) {
  const ok = Number.isInteger(answer?.said) && answer.said === answer.picked;
  const info = tagInfo(ctx, ex.tag);
  return [result(ex.id, ex.tag, ok, {rule: ex.rule ?? info.rule, rule_pt: ex.rule_pt ?? info.rule_pt})];
}
