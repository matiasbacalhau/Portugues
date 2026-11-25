// Instancias de una plantilla según su generador (`kind`); sin `kind`, la plantilla es de artículos.
import { instances as artigo } from './artigo.js';
import { instances as presente } from './presente.js';

export const instancesOf = (template, lexicon) => (template.kind === 'presente' ? presente(template, lexicon) : artigo(template, lexicon));
