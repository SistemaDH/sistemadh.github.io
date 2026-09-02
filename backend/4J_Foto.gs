/**
 * ============================================================================
 *  4J_Foto.gs — a FOTO do personagem, guardada no Drive da mesa.
 * ============================================================================
 *
 *  ESCRITO À MÃO. Não sai de gerador nenhum.
 *
 *  POR QUE ISTO EXISTE COMO ENDPOINT, e não como mais um campo da ficha:
 *
 *  A ficha inteira vive em UMA célula da planilha, com teto de 45.000
 *  caracteres (LIMITE_DADOS_CHARS), e o sanitizador apara qualquer string em
 *  5.000 (LIMITES.TAMANHO_TEXTO). Uma foto em base64 não cabe lá — nem perto.
 *  Então a imagem vai para o Drive e a ficha guarda só o ID do arquivo, que
 *  são 33 caracteres.
 *
 *  O QUE A FICHA GUARDA É UM ID, NUNCA UMA URL. É a regra de segurança desta
 *  parte: um campo de URL na ficha deixaria qualquer um apontar a foto para um
 *  servidor de fora, e todo mundo que abrisse a ficha entregaria o IP para
 *  aquele servidor sem saber. Guardando o id, a única origem possível é o
 *  Drive da mesa, e quem monta o endereço é a tela.
 *
 *  A pasta é a mesma para a mesa inteira. O id dela vem da propriedade de
 *  script PASTA_FOTOS quando existe, e do padrão abaixo quando não existe —
 *  assim trocar de pasta é trabalho de quem mantém, sem mexer no código.
 */

const FOTO = {
  /** Teto do arquivo JÁ DECODIFICADO. O recorte no navegador entrega ~80 KB. */
  BYTES_MAX: 1024 * 1024,

  /** Só os dois que o navegador produz no `canvas.toBlob`. */
  TIPOS: ['image/jpeg', 'image/png'],

  /** A pasta da mesa da Vanessa, com acesso liberado. */
  PASTA_PADRAO: '18hB6LvfFLH4M3eOworv40oWFZIlumIus'
};

/**
 * Um id de arquivo do Drive, ou vazio.
 *
 * A checagem é estreita de propósito: só letras, números, hífen e sublinhado.
 * Isso é o que impede um "id" com barra ou dois-pontos de virar caminho ou
 * esquema de URL quando a tela montar o endereço da miniatura.
 */
function idDoDrive_(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(s)) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'Identificador de arquivo do Drive inválido.');
  }
  return s;
}

function pastaDasFotos_() {
  const guardada = PropertiesService.getScriptProperties().getProperty(PROP.PASTA_FOTOS);
  const id = idDoDrive_(guardada || FOTO.PASTA_PADRAO);
  try {
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw erroApi_(ERRO.INTERNO,
      'A pasta de fotos do Drive não abriu. Confira a propriedade PASTA_FOTOS e ' +
      'se o Apps Script foi autorizado a usar o Drive.');
  }
}

/**
 * Manda a foto para a lixeira, sem deixar o pedido inteiro cair por causa
 * disso.
 *
 * Uma foto órfã na pasta é um incômodo; uma ficha que não conseguiu trocar de
 * foto porque a antiga não pôde ser apagada é um bug na cara do jogador. Entre
 * os dois, o incômodo.
 */
function descartarFoto_(id) {
  if (!id) return false;
  try {
    DriveApp.getFileById(id).setTrashed(true);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Guarda a imagem e devolve o personagem já com o id gravado.
 *
 * A ORDEM É A REGRA: escreve o arquivo novo → grava o id na ficha → só então
 * manda o antigo para a lixeira. Apagando antes, uma gravação que falhasse
 * deixaria a ficha apontando para um arquivo no lixo — e a foto sumiria da
 * tela sem ninguém ter pedido.
 */
function guardarFoto_(jogador, personagemId, conteudoBase64, tipo) {
  const mime = String(tipo || '').toLowerCase();
  if (FOTO.TIPOS.indexOf(mime) === -1) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'A foto precisa ser JPEG ou PNG (veio "' + mime + '").');
  }

  const base64 = String(conteudoBase64 || '').replace(/^data:[^,]+,/, '').trim();
  if (!base64) throw erroApi_(ERRO.DADOS_INVALIDOS, 'Nenhuma imagem veio no pedido.');

  // Conta os bytes ANTES de decodificar: base64 cresce 4 para cada 3 bytes, e
  // decodificar 40 MB para depois recusar seria pagar o preço à toa.
  const bytesAprox = Math.floor(base64.length * 3 / 4);
  if (bytesAprox > FOTO.BYTES_MAX) {
    throw erroApi_(ERRO.DADOS_INVALIDOS,
      'A foto passou de ' + Math.round(FOTO.BYTES_MAX / 1024) + ' KB. ' +
      'Recorte de novo — o app manda a imagem já reduzida.');
  }

  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (e) {
    throw erroApi_(ERRO.DADOS_INVALIDOS, 'A imagem chegou corrompida.');
  }

  const extensao = (mime === 'image/png') ? 'png' : 'jpg';
  const nomeArquivo = 'foto-' + String(personagemId) + '-' + Utilities.getUuid() + '.' + extensao;
  const blob = Utilities.newBlob(bytes, mime, nomeArquivo);

  const arquivo = pastaDasFotos_().createFile(blob);
  /*
   * Sem isto a foto aparece para quem subiu e para mais ninguém: a tela dos
   * outros jogadores pede a miniatura sem estar logada como o dono do script.
   */
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const novoId = arquivo.getId();

  let antigo = '';
  const r = mutarPersonagem_(jogador, personagemId, null, function (ficha) {
    ficha.identidade = ficha.identidade || {};
    antigo = String(ficha.identidade.foto || '');
    ficha.identidade.foto = novoId;
    return { ficha: ficha, evento: 'foto-trocada' };
  });

  if (antigo && antigo !== novoId) descartarFoto_(antigo);
  return { personagem: r.personagem, foto: novoId };
}

/** Tira a foto da ficha e manda o arquivo para a lixeira. */
function removerFoto_(jogador, personagemId) {
  let antigo = '';
  const r = mutarPersonagem_(jogador, personagemId, null, function (ficha) {
    ficha.identidade = ficha.identidade || {};
    antigo = String(ficha.identidade.foto || '');
    ficha.identidade.foto = '';
    return { ficha: ficha, evento: 'foto-removida' };
  });
  if (antigo) descartarFoto_(antigo);
  return { personagem: r.personagem, foto: '' };
}

/* ==========================================================================
 *  FAXINA DAS FOTOS ÓRFÃS
 * ==========================================================================
 *
 *  POR QUE ELAS EXISTEM
 *
 *  Excluir uma ficha aqui é ARQUIVAR: `excluirPersonagem_` marca a linha e
 *  `restaurarPersonagem_` a traz de volta. Apagar a foto junto quebraria a
 *  restauração — a ficha voltaria sem rosto. Então a imagem fica no Drive sem
 *  ninguém mais citando, e trocar de foto também deixa rastro quando o
 *  descarte da antiga falha (`descartarFoto_` engole o erro de propósito).
 *
 *  Isto é UMA FUNÇÃO DE MANUTENÇÃO, chamada à mão pelo editor do Apps Script.
 *  Não entra no caminho de nenhum jogador, por dois motivos: ela lê a ficha de
 *  todo mundo (caro) e ela APAGA (perigoso). As duas coisas juntas não podem
 *  morar num botão que alguém encosta sem querer.
 *
 *  Uso:
 *    faxinaDeFotos()                       → só lista o que sobraria
 *    faxinaDeFotos('APAGAR FOTOS ÓRFÃS')   → manda para a lixeira do Drive
 */

/** Os ids de foto citados por alguma ficha — inclusive as ARQUIVADAS. */
function fotosEmUso_() {
  const emUso = {};
  const linhas = lerTudo_(ABAS.PERSONAGENS);
  for (let i = 0; i < linhas.length; i++) {
    /*
     * A ficha excluída CONTA. Ela é arquivo, não lixo: `restaurarPersonagem_`
     * existe, e uma foto apagada aqui voltaria como um retrato vazio.
     */
    let ficha = null;
    try {
      ficha = JSON.parse(linhas[i].dados || '{}');
    } catch (e) {
      /*
       * Ficha que não abre é o caso mais perigoso da faxina: não dá para saber
       * que foto ela cita, e apagar por não saber é apagar no escuro. Ela vira
       * um aviso e a faxina inteira para.
       */
      return { erro: 'A ficha da linha ' + linhas[i]._linha + ' não abre como JSON. ' +
                     'Enquanto ela não abrir, a faxina não roda: seria apagar às cegas.' };
    }
    const id = String(((ficha || {}).identidade || {}).foto || '');
    if (id) emUso[id] = true;
  }
  return { emUso: emUso };
}

function faxinaDeFotos(confirmacao) {
  const usadas = fotosEmUso_();
  if (usadas.erro) {
    Logger.log(usadas.erro);
    return usadas.erro;
  }

  const pasta = pastaDasFotos_();
  const arquivos = pasta.getFiles();
  const orfas = [];
  let vistos = 0;

  while (arquivos.hasNext()) {
    const arq = arquivos.next();
    vistos++;
    if (arq.isTrashed()) continue;
    /*
     * Só mexe no que ESTE app criou. A pasta é do Drive da mesa e pode ter
     * qualquer outra coisa dentro; o prefixo `foto-` é a assinatura de
     * `guardarFoto_`, e o que não a tem não é nosso para apagar.
     */
    if (arq.getName().indexOf('foto-') !== 0) continue;
    if (usadas.emUso[arq.getId()]) continue;
    orfas.push({ id: arq.getId(), nome: arq.getName(), quando: arq.getDateCreated() });
  }

  const resumo = vistos + ' arquivo(s) na pasta · ' +
                 Object.keys(usadas.emUso).length + ' foto(s) em uso · ' +
                 orfas.length + ' órfã(s).';

  if (confirmacao !== 'APAGAR FOTOS ÓRFÃS') {
    const lista = orfas.map(function (o) { return '  ' + o.nome + '  (' + o.quando + ')'; });
    const texto = [
      resumo,
      'Nada foi apagado. Para apagar de verdade:',
      "  faxinaDeFotos('APAGAR FOTOS ÓRFÃS')"
    ].concat(lista).join('\n');
    Logger.log(texto);
    return texto;
  }

  let apagadas = 0;
  for (let i = 0; i < orfas.length; i++) {
    if (descartarFoto_(orfas[i].id)) apagadas++;
  }
  const fim = resumo + ' ' + apagadas + ' mandada(s) para a lixeira do Drive — ' +
              'de onde dá para recuperar por 30 dias, se der arrependimento.';
  Logger.log(fim);
  return fim;
}
