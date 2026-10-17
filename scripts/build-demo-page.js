#!/usr/bin/env node
// Depois de `vite build --mode demo`, gera dist-demo/tunetalk-demo.html: o conteúdo do index.html
// sem <!doctype>/<html>/<head>/<body>, formato usado para publicar a demo como Artifact.
import fs from 'node:fs';

const html = fs.readFileSync('dist-demo/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const page = `${head.replace(/\s*<meta charset[^>]*>|\s*<meta name="viewport"[^>]*>/g, '').trim()}\n${body.trim()}\n`;

fs.writeFileSync('dist-demo/tunetalk-demo.html', page);
console.log('dist-demo/tunetalk-demo.html gerado');
