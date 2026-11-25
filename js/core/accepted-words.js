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
  'Buenos Aires', 'Caracas', 'Chile', 'Colombia', 'Cordoba', 'Córdoba', 'Curitiba', 'Ecuador', 'España', 'Florianópolis',
  'Fortaleza', 'La Paz', 'Lima', 'Lisboa', 'Madrid', 'Manaus', 'Medellín', 'Medellin', 'Mendoza', 'México', 'Mexico',
  'Montevideo', 'Niterói', 'Paraguay', 'Perú', 'Peru', 'Porto Alegre', 'Quito', 'Recife', 'Rio', 'Rosario', 'Salvador',
  'Santiago', 'São Paulo', 'Sevilla', 'Uruguay', 'Valencia', 'Valparaíso', 'Valparaiso', 'Venezuela',
];

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
    const parts = String(w).split(/[\s,]+/);
    for (const part of parts) {
      const norm = normalizeAcceptedWord(part);
      if (norm) set.add(norm);
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
