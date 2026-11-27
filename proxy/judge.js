// Modo "juez" (apelación desde la app): decide si una respuesta corta de un ejercicio está bien y, si no, de qué TIPO es
// el error. El modelo nunca devuelve una corrección ni una explicación: solo un veredicto de una lista cerrada y la parte
// equivocada copiada de la respuesta (regla 3: la app no muestra la forma correcta).

export const VERDICTS = ['correct', 'content', 'grammar', 'spelling', 'accent'];
export const LIMITS = {context: 3000, answer: 500, expected: 20, expectedChars: 300};

export function buildJudgePrompt({context, expected, answer}) {
  const system = [
    'You review one short answer that a Spanish-speaking A1 learner of Brazilian Portuguese wrote in an exercise.',
    'You get the exercise (instructions, text, question), the accepted answers and the learner answer.',
    'Pick one verdict:',
    '- correct: it means the same as an accepted answer and it is grammatical Brazilian Portuguese. Ignore capitalization and final punctuation. Leaving out the article before a person\'s name is fine.',
    '- content: it is grammatical, but the information or a word does not match what the exercise asks or what the text says.',
    '- grammar: a grammar mistake (article, gender, contraction, verb form or person, ser/estar, pronoun, word order).',
    '- spelling: a misspelled word that is not another real word.',
    '- accent: a missing or wrong accent mark that turns a word into another word.',
    'If several apply, prefer grammar, then content, then spelling, then accent.',
    'quote: the shortest exact substring of the learner answer that is wrong, copied character by character; an empty string when the verdict is correct.',
    'Never include a correction or an explanation.',
  ].join('\n');
  const user = [
    `<exercise>\n${context}\n</exercise>`,
    `<accepted>\n${expected.join('\n')}\n</accepted>`,
    `<answer>\n${answer}\n</answer>`,
  ].join('\n');
  const schema = {
    type: 'object',
    properties: {verdict: {type: 'string', enum: VERDICTS}, quote: {type: 'string'}},
    required: ['verdict', 'quote'],
    additionalProperties: false,
  };
  return {system, user, schema};
}

// null si el pedido no tiene la forma esperada; si no, el motivo del rechazo ('too_long') o los campos limpios.
export function judgeInput(body) {
  const {context, expected, answer} = body ?? {};
  if (typeof context !== 'string' || typeof answer !== 'string' || !Array.isArray(expected) || !expected.length
    || !expected.every((e) => typeof e === 'string')) return null;
  if (context.length > LIMITS.context || answer.length > LIMITS.answer || expected.length > LIMITS.expected
    || expected.some((e) => e.length > LIMITS.expectedChars)) return 'too_long';
  return {context, expected, answer};
}

// El veredicto del modelo, validado: un veredicto desconocido es un fallo; una cita que no está en la respuesta se descarta.
export function judgeOutput(out, answer) {
  if (!VERDICTS.includes(out?.verdict)) return null;
  const quote = out.verdict !== 'correct' && typeof out.quote === 'string' && out.quote && answer.includes(out.quote) ? out.quote : '';
  return {verdict: out.verdict, quote};
}
