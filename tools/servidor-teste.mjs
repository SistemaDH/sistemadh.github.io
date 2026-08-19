/**
 * servidor-teste.mjs
 * ---------------------------------------------------------------------------
 * Sobe um servidor local que:
 *   • serve os arquivos estáticos do projeto (como o GitHub Pages faria);
 *   • responde /exec executando o Code.gs REAL dentro das imitações do
 *     Apps Script (ver apps-script-mock.mjs).
 *
 * Uso: node tools/servidor-teste.mjs [porta]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarAmbiente } from './apps-script-mock.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

export function criarServidor({ porta = 0, semarcar = false } = {}) {
  const ambiente = criarAmbiente({ pastaBackend: path.join(RAIZ, 'backend') });

  // Prepara o sistema como no primeiro uso real.
  ambiente.contexto.setup();
  ambiente.contexto.definirCodigoMestre('mestre-teste');

  const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/exec') {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, cabecalhosCors());
        res.end();
        return;
      }
      let corpo = '';
      req.on('data', (p) => { corpo += p; });
      req.on('end', () => {
        let saida;
        try {
          if (req.method === 'POST') {
            saida = ambiente.contexto.doPost({ postData: { contents: corpo } });
          } else {
            const parametro = Object.fromEntries(url.searchParams.entries());
            saida = ambiente.contexto.doGet({ parameter: parametro });
          }
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json', ...cabecalhosCors() });
          res.end(JSON.stringify({ ok: false, erro: { codigo: 'INTERNO', mensagem: String(e) } }));
          return;
        }
        res.writeHead(200, {
          'Content-Type': saida.getMimeType() === 'text/javascript'
            ? 'text/javascript; charset=utf-8'
            : 'application/json; charset=utf-8',
          ...cabecalhosCors()
        });
        res.end(saida.getContent());
      });
      return;
    }

    // Arquivos estáticos
    let caminho = decodeURIComponent(url.pathname);
    if (caminho === '/' || caminho === '') caminho = '/index.html';
    const alvo = path.join(RAIZ, caminho);
    if (!alvo.startsWith(RAIZ)) {
      res.writeHead(403).end('proibido');
      return;
    }
    fs.readFile(alvo, (erro, conteudo) => {
      if (erro) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('não encontrado');
        return;
      }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'application/octet-stream' });
      res.end(conteudo);
    });
  });

  return new Promise((resolve) => {
    servidor.listen(porta, () => {
      const endereco = servidor.address();
      if (!semarcar) console.log(`Servidor de teste em http://localhost:${endereco.port}`);
      resolve({ servidor, porta: endereco.port, ambiente });
    });
  });
}

function cabecalhosCors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };
}

// Execução direta: node tools/servidor-teste.mjs [porta]
if (process.argv[1] && process.argv[1].endsWith('servidor-teste.mjs')) {
  criarServidor({ porta: Number(process.argv[2]) || 8099 });
}
