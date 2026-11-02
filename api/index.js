// Função serverless da Vercel: todas as rotas /api/* caem aqui (ver vercel.json).
// A instância é criada uma vez por função e reaproveitada entre requisições.
import { loadConfig } from '../server/src/config.js';
import { buildContainer } from '../server/src/container.js';
import { createApp } from '../server/src/app.js';

export default createApp(buildContainer(loadConfig()));
