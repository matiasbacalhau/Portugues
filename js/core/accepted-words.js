// Palabras y nombres propios que no deben marcarse como error ortográfico en las escrituras.
// Insensible a mayúsculas/minúsculas y tildes/diacríticos.

export const DEFAULT_ACCEPTED_WORDS = [
  // Nombres del curso y nombres comunes
  'Agustin', 'Agustín', 'Ana', 'Andrea', 'Anna', 'Bruno', 'Camila', 'Carlos', 'Daniel', 'David', 'Diego',
  'Elena', 'Fernando', 'Gabriel', 'Joaquin', 'Joaquín', 'João', 'Juan', 'Julian', 'Julián', 'Laura', 'Leo', 'Lucas',
  'Lucia', 'Lucía', 'Manuel', 'Maria', 'María', 'Martin', 'Martín', 'Mateo', 'Matias', 'Matías', 'Mia', 'Nicolas',
  'Nicolás', 'Paula', 'Pedro', 'Rafa', 'Santiago', 'Sofia', 'Sofía', 'Tiago', 'Tom', 'Valentina',
  // Ciudades y países (LATAM, España, Brasil y Portugal)
  'Argentina', 'Asunción', 'Asuncion', 'Barcelona', 'Belo Horizonte', 'Bogotá', 'Bogota', 'Bolivia', 'Brasília',
  'Buenos Aires', 'Caracas', 'Chile', 'Colombia', 'Cordoba', 'Córdoba', 'Curitiba', 'Florianópolis',
  'Fortaleza', 'La Paz', 'Lima', 'Lisboa', 'Madrid', 'Manaus', 'Medellín', 'Medellin', 'Mendoza', 'México', 'Mexico',
  'Montevideo', 'Niterói', 'Perú', 'Peru', 'Porto Alegre', 'Quito', 'Recife', 'Rio', 'Rosario', 'Salvador',
  'Santiago', 'São Paulo', 'Sevilla', 'Valencia', 'Valparaíso', 'Valparaiso', 'Venezuela',
];

// Artículos, preposiciones o formas sin tilde que nunca deben extraerse como tokens sueltos al partir nombres compuestos
// ("La Plata" → acepta "Plata", no "la"; "São Paulo" → acepta "Paulo", no "sao").
const MULTI_WORD_STOP = new Set([
  'a', 'o', 'as', 'os', 'e', 'y', 'de', 'da', 'do', 'das', 'dos', 'del',
  'el', 'la', 'las', 'los', 'en', 'em', 'sao', 'san', 'santa',
]);

export function normalizeAcceptedWord(w) {
  return String(w ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function buildAcceptedWordsSet(customWords = [], defaultWords = DEFAULT_ACCEPTED_WORDS) {
  const set = new Set();
  const add = (w) => {
    if (!w) return;
    const parts = String(w).trim().split(/[\s,]+/).filter(Boolean);
    for (const part of parts) {
      const norm = normalizeAcceptedWord(part);
      if (!norm) continue;
      if (parts.length > 1 && MULTI_WORD_STOP.has(norm)) continue;
      set.add(norm);
    }
  };
  for (const w of defaultWords ?? []) add(w);
  for (const w of customWords ?? []) add(w);
  return set;
}

export function isAcceptedWord(word, acceptedSet) {
  const norm = normalizeAcceptedWord(word);
  return norm ? acceptedSet.has(norm) : false;
}
