// entry.js
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * Este archivo sirve como punto de entrada para entornos de producción como cPanel.
 * Utiliza el cargador de 'tsx' para permitir que Node.js ejecute archivos TypeScript (.ts) directamente.
 */

try {
  // Método moderno para Node.js 20.6.0+ o 18.19.0+
  register('tsx', pathToFileURL('./'));
} catch (e) {
  // Compatibilidad para versiones anteriores que usaban el flag --loader
  console.warn("Advertencia: Usando fallback para cargador de módulos. Se recomienda Node.js 20+");
  // @ts-ignore
  import('tsx/esm');
}

// Carga el servidor principal
import('./server/index.ts');
