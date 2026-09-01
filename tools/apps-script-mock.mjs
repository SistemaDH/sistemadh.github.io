/**
 * apps-script-mock.mjs
 * ---------------------------------------------------------------------------
 * Roda os arquivos .gs REAIS do backend dentro do Node, com imitações das
 * APIs do Google Apps Script (planilha em memória, propriedades, cache, trava).
 *
 * Importante: nada do backend é reescrito aqui. Se o teste passa, é o mesmo
 * código que vai para o Apps Script que passou.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

/* -------------------------------------------------------------------------- */
/*  Planilha em memória                                                       */
/* -------------------------------------------------------------------------- */

class FakeRange {
  constructor(sheet, linha, coluna, nLinhas, nColunas) {
    this.sheet = sheet;
    this.linha = linha;
    this.coluna = coluna;
    this.nLinhas = nLinhas;
    this.nColunas = nColunas;
  }
  getValues() {
    const saida = [];
    for (let i = 0; i < this.nLinhas; i++) {
      const linha = this.sheet.dados[this.linha - 1 + i] || [];
      const out = [];
      for (let j = 0; j < this.nColunas; j++) {
        const v = linha[this.coluna - 1 + j];
        out.push(v === undefined ? '' : v);
      }
      saida.push(out);
    }
    return saida;
  }
  setValues(valores) {
    valores.forEach((linha, i) => {
      const alvo = this.sheet.garantirLinha(this.linha - 1 + i);
      linha.forEach((v, j) => { alvo[this.coluna - 1 + j] = v; });
    });
    return this;
  }
  setValue(valor) {
    const alvo = this.sheet.garantirLinha(this.linha - 1);
    alvo[this.coluna - 1] = valor;
    return this;
  }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setNumberFormat() { return this; }
}

let proximoSheetId = 1;

class FakeSheet {
  constructor(nome) {
    this.nome = nome;
    this.dados = [];
    this.id = proximoSheetId++;
    this.oculta = false;
  }
  garantirLinha(indice) {
    while (this.dados.length <= indice) this.dados.push([]);
    return this.dados[indice];
  }
  getName() { return this.nome; }
  setName(n) { this.nome = n; return this; }
  getSheetId() { return this.id; }
  hideSheet() { this.oculta = true; return this; }
  showSheet() { this.oculta = false; return this; }
  getLastRow() {
    let ultima = 0;
    this.dados.forEach((linha, i) => {
      if (linha && linha.some((c) => c !== '' && c !== null && c !== undefined)) ultima = i + 1;
    });
    return ultima;
  }
  getLastColumn() {
    let maior = 0;
    this.dados.forEach((linha) => {
      if (!linha) return;
      for (let j = linha.length - 1; j >= 0; j--) {
        const c = linha[j];
        if (c !== '' && c !== null && c !== undefined) { maior = Math.max(maior, j + 1); break; }
      }
    });
    return maior;
  }
  getRange(linha, coluna, nLinhas = 1, nColunas = 1) {
    return new FakeRange(this, linha, coluna, nLinhas, nColunas);
  }
  appendRow(valores) {
    this.dados[this.getLastRow()] = valores.slice();
    return this;
  }
  deleteRow(numero) { this.dados.splice(numero - 1, 1); return this; }
  deleteRows(numero, quantas) { this.dados.splice(numero - 1, quantas); return this; }
  setFrozenRows() { return this; }
  setColumnWidth() { return this; }
  clear() { this.dados = []; return this; }
}

class FakeSpreadsheet {
  constructor(id = 'planilha-de-teste') {
    this.id = id;
    this.abas = [];
  }
  getId() { return this.id; }
  getSheets() { return this.abas.slice(); }
  getSheetByName(nome) { return this.abas.find((s) => s.nome === nome) || null; }
  insertSheet(nome) {
    const s = new FakeSheet(nome || `Página${this.abas.length + 1}`);
    this.abas.push(s);
    return s;
  }
  deleteSheet(sheet) {
    this.abas = this.abas.filter((s) => s !== sheet);
    return this;
  }
}

/* -------------------------------------------------------------------------- */
/*  Ambiente Apps Script                                                      */
/* -------------------------------------------------------------------------- */

export function criarAmbiente({ pastaBackend }) {
  const planilha = new FakeSpreadsheet();
  const propriedades = new Map();
  const cache = new Map();
  const registros = [];
  /* O Drive de mentira. A pasta da mesa já existe; o resto nasce nos testes. */
  const drive = {
    pastas: new Map([['18hB6LvfFLH4M3eOworv40oWFZIlumIus', true]]),
    arquivos: new Map(),
    ordem: [],
    contador: 0
  };

  const contexto = {
    console,
    JSON,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Error,
    isFinite,
    isNaN,
    parseInt,
    parseFloat,
    RegExp,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,

    SpreadsheetApp: {
      getActive: () => planilha,
      openById: () => planilha
    },

    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (propriedades.has(k) ? propriedades.get(k) : null),
        setProperty: (k, v) => { propriedades.set(k, String(v)); },
        setProperties: (obj) => { Object.entries(obj).forEach(([k, v]) => propriedades.set(k, String(v))); },
        deleteProperty: (k) => { propriedades.delete(k); }
      })
    },

    CacheService: {
      getScriptCache: () => ({
        get: (k) => {
          const item = cache.get(k);
          if (!item) return null;
          if (item.expiraEm < Date.now()) { cache.delete(k); return null; }
          return item.valor;
        },
        put: (k, v, segundos) => cache.set(k, { valor: String(v), expiraEm: Date.now() + segundos * 1000 }),
        remove: (k) => cache.delete(k)
      })
    },

    /*
     * DRIVE DE MENTIRA — o suficiente para o endpoint da foto.
     *
     * Guarda os arquivos num Map e registra o que foi para a lixeira e com que
     * permissão cada um ficou. Os testes leem `drive` para conferir as duas
     * coisas que importam e que nenhum outro teste alcança: a foto antiga vai
     * mesmo para o lixo DEPOIS de a nova ser gravada, e o arquivo nasce
     * visível para a mesa.
     */
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', PRIVATE: 'PRIVATE' },
      Permission: { VIEW: 'VIEW', EDIT: 'EDIT' },
      getFolderById: (idPasta) => {
        if (!drive.pastas.has(idPasta)) {
          const e = new Error('No item with the given ID could be found: ' + idPasta);
          throw e;
        }
        return {
          getId: () => idPasta,
          createFile: (blob) => {
            const idArquivo = 'arq' + String(++drive.contador).padStart(30, '0');
            const registro = {
              id: idArquivo, pasta: idPasta, nome: blob.getName(),
              tipo: blob.getContentType(), bytes: blob.getBytes(),
              lixeira: false, acesso: 'PRIVATE'
            };
            drive.arquivos.set(idArquivo, registro);
            drive.ordem.push(idArquivo);
            return {
              getId: () => idArquivo,
              getName: () => registro.nome,
              setSharing: (acesso) => { registro.acesso = acesso; return this; },
              setTrashed: (v) => { registro.lixeira = Boolean(v); }
            };
          }
        };
      },
      getFileById: (idArquivo) => {
        const registro = drive.arquivos.get(idArquivo);
        if (!registro) throw new Error('No item with the given ID could be found: ' + idArquivo);
        return {
          getId: () => idArquivo,
          getName: () => registro.nome,
          setSharing: (acesso) => { registro.acesso = acesso; },
          setTrashed: (v) => { registro.lixeira = Boolean(v); }
        };
      }
    },

    LockService: {
      getScriptLock: () => ({ waitLock: () => true, releaseLock: () => true })
    },

    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      getUuid: () => crypto.randomUUID(),
      computeDigest: (_algoritmo, texto) => {
        const buf = crypto.createHash('sha256').update(String(texto), 'utf8').digest();
        // O Apps Script devolve bytes com sinal (-128..127).
        return Array.from(buf).map((b) => (b > 127 ? b - 256 : b));
      },
      base64Decode: (texto) => {
        const buf = Buffer.from(String(texto), 'base64');
        // O Apps Script devolve bytes com sinal, como no computeDigest.
        return Array.from(buf).map((b) => (b > 127 ? b - 256 : b));
      },
      newBlob: (bytes, tipo, nome) => ({
        _bytes: bytes, _tipo: tipo, _nome: nome,
        getBytes() { return this._bytes; },
        getContentType() { return this._tipo; },
        getName() { return this._nome; }
      }),
      formatDate: (data, _tz, formato) => {
        const p = (n, casas = 2) => String(n).padStart(casas, '0');
        return formato
          .replace('yyyy', data.getFullYear())
          .replace('MM', p(data.getMonth() + 1))
          .replace('dd', p(data.getDate()))
          .replace('HH', p(data.getHours()))
          .replace('mm', p(data.getMinutes()));
      }
    },

    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },

    Logger: { log: (msg) => registros.push(String(msg)) },

    ContentService: {
      MimeType: { JSON: 'application/json', JAVASCRIPT: 'text/javascript' },
      createTextOutput: (texto) => ({
        _texto: texto,
        _mime: 'text/plain',
        setMimeType(m) { this._mime = m; return this; },
        getContent() { return this._texto; },
        getMimeType() { return this._mime; }
      })
    }
  };

  contexto.globalThis = contexto;
  vm.createContext(contexto);

  const arquivos = fs.readdirSync(pastaBackend)
    .filter((f) => f.endsWith('.gs'))
    .sort();

  arquivos.forEach((arquivo) => {
    const codigo = fs.readFileSync(path.join(pastaBackend, arquivo), 'utf8');
    vm.runInContext(codigo, contexto, { filename: arquivo });
  });

  /**
   * Lê constantes do backend.
   * `const`/`let` no topo de um script do vm vivem no escopo léxico do contexto
   * e NÃO viram propriedades do objeto sandbox — por isso `contexto.ABAS` é
   * undefined e é preciso avaliar a expressão dentro do contexto.
   */
  const avaliar = (expressao) => vm.runInContext(expressao, contexto);

  return { contexto, avaliar, planilha, propriedades, registros, arquivos, drive };
}
