import 'dotenv/config';
import { loadConfig } from './config.js';
import { buildContainer } from './container.js';
import { createApp } from './app.js';

const config = loadConfig();
const app = createApp(buildContainer(config));

if (config.isProduction) app.set('trust proxy', 1);

app.listen(config.port, () => {
  console.log(`Servidor rodando na porta: ${config.port}`);
});
