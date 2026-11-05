#!/usr/bin/env node
// Último passo do deploy (vercel-build): manda o aviso de Natal, se for a hora (ver
// avisoDeNatalLiberado). Nunca derruba o deploy: se algo falhar, só registra no log.
import 'dotenv/config';
import { loadConfig } from '../server/src/config.js';
import { buildContainer } from '../server/src/container.js';
import { avisoDeNatalLiberado } from '../server/src/services/avisoDeNatalService.js';

try {
  if (!avisoDeNatalLiberado(process.env)) {
    console.log('Aviso de Natal: fora da época (só sai em dezembro no site de verdade).');
  } else {
    const enviados = await buildContainer(loadConfig()).avisoDeNatal();
    console.log(`Aviso de Natal: enviado para ${enviados} ${enviados === 1 ? 'pessoa' : 'pessoas'}.`);
  }
} catch (err) {
  console.warn(`Aviso de Natal não enviado: ${err?.message}`);
}
process.exit(0);
