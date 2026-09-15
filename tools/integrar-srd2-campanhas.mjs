import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpusRaiz = process.env.SRD2_CORPUS_DIR
  ? path.resolve(process.env.SRD2_CORPUS_DIR)
  : (fs.existsSync(path.resolve(raiz, '..', 'srd2-source')) ? path.resolve(raiz, '..', 'srd2-source') : path.resolve(raiz, 'srd2-source'));
const corpus = path.join(corpusRaiz, 'objects', 'rules');
const ler = (p) => JSON.parse(fs.readFileSync(path.join(raiz, p), 'utf8'));

const definicoes = [
  {
    slug:'faction-tracking', termo:'Acompanhamento de facções', categoria:'campanha',
    resumo:'Registra relações, recursos, problemas e objetivos de cada facção, com contagens regressivas que fazem o cenário avançar.',
    explicacao:[
      'A relação entre duas facções vai de −3 a +3: −3 Nêmeses, −2 Opostas, −1 Hostis, 0 Neutras, ambíguas ou indiferentes, +1 Amigáveis, +2 Aliadas e +3 Aliadas próximas.',
      'Cada ficha de facção contém nome, relações, 1–3 recursos, 1–3 problemas, 1–3 objetivos maiores e 1–3 objetivos menores.',
      'A cada semana no jogo, avance uma contagem de cada facção em um passo; a ficção pode fazê-la avançar ou recuar passos adicionais.',
      'Ao disparar, a contagem concede um recurso, remove um problema ou conclui o objetivo; depois, escolha um novo objetivo e abra outra contagem.',
      'Cada facção mantém no máximo uma contagem de objetivo maior e duas menores. Objetivo maior usa Contagem de Objetivo (10); menor usa (4–6), conforme a escala.',
      'Escalone os disparos para que apenas uma ou duas contagens terminem por semana no jogo; as personagens podem ajudar ou impedir esses objetivos.'
    ]
  },
  {
    slug:'fairy-tale-campaigns', termo:'Campanhas de conto de fadas', categoria:'campanha',
    resumo:'Reúne maldições, adversários com múltiplas formas e um processo coletivo para criar a pessoa vilã da campanha.',
    explicacao:[
      'Uma criatura atingida por magia recebe a condição Amaldiçoada. Ela só termina por magia de feitiço, ritual, item, local, acontecimento sobrenatural, poder superior ou uma combinação dessas fontes.',
      'Descobrir a cura pode exigir pesquisa, uma missão ou ajuda de uma personagem do Mestre.',
      'Transformar é uma ação especial que alterna um adversário entre fichas de forma. A ficha principal sempre fornece seus atributos e características; a forma ativa acrescenta os seus.',
      'Salvo indicação diferente, Pontos de Vida e Estresse permanecem marcados na ficha principal durante todas as formas.',
      'Para criar uma pessoa vilã em conjunto, o Mestre prepara cerca de 40 perguntas antes da sessão zero e sorteia aproximadamente 15 antes da criação das personagens.',
      'Em ordem ao redor da mesa, cada participante compra uma pergunta e pode respondê-la, descartá-la e comprar outra, ou passá-la. Perguntas complementares são permitidas; o processo termina quando todas forem respondidas ou descartadas.'
    ]
  },
  {
    slug:'feasts', termo:'Banquetes', categoria:'campanha',
    resumo:'Transforma ingredientes colhidos em uma refeição cuja nota recupera PV, Estresse e Esperança durante o repouso.',
    explicacao:[
      'Cada ingrediente tem de 1 a 3 sabores e intensidade de 1 a 3. Dados: doce d4, salgado d6, amargo d8, azedo d10, saboroso d12 e estranho d20; role tantos dados quanto a intensidade.',
      'A capacidade de ingredientes de uma personagem é igual ao seu maior atributo.',
      'De um animal derrotado, colha ingredientes conforme os PV máximos: 1–4 rende 1; 5–7 rende 2; 8–10 rende 3; 12 ou mais rende 4.',
      'Uma vez por repouso, cada personagem pode gastar 1 Esperança para colher do ambiente. Role o Dado de Esperança: 1–2 doce, 3–4 salgado, 5–6 amargo, 7–8 azedo, 9–10 saboroso, 11–12 estranho, todos com intensidade 1.',
      'Nesta campanha, os movimentos de repouso para limpar Estresse, limpar PV e obter Esperança são substituídos por Preparar um Banquete.',
      'O grupo escolhe uma pessoa chef e reúne todos os dados de sabor dos ingredientes oferecidos. Ela rola a reserva, separa todos os dados com valores iguais e repete; se não houver iguais, descarta um dado. Para quando restar um dado ou todos tiverem sido separados ou descartados.',
      'Cada conjunto de valores iguais vale o próprio resultado. A soma dos conjuntos é a Nota da Refeição.',
      'Cada participante distribui até a Nota entre PV limpos, Estresse limpo e Esperança obtida, respeitando os limites da ficha.',
      'Registre nome, descrição, preparo, ingredientes e Nota no livro de receitas. Ao repetir o mesmo perfil de sabores, acrescente fichas iguais ao patamar do grupo; quando precisaria descartar um dado, a pessoa chef pode remover uma ficha.',
      'Ingredientes especiais são raros e só vêm de adversários Líderes ou Solo; sua característica modifica a refeição conforme descrito pelo ingrediente.',
      'Em um restaurante, durante o repouso, uma personagem pode gastar até 2 punhados de ouro e escolher, por punhado, limpar Estresse, limpar PV ou obter Esperança.'
    ]
  },
  {
    slug:'floating-magic-school-campaigns', termo:'Campanhas de escola mágica flutuante', categoria:'campanha',
    resumo:'Dá a cada personagem um artefato de voo e adapta movimento, atributos e movimentos de morte a uma campanha menos letal.',
    explicacao:[
      'Na criação, cada participante inventa um artefato mágico de voo.',
      'Voando, a personagem segue o movimento normal e alcança alcance Próximo como parte de uma jogada de ação. Para ir além de Próximo, ou quando mover-se for a ação principal, faz uma jogada com um atributo apropriado.',
      'Restrita, Vulnerável, sem o artefato ou após sofrer dano Severo são exemplos de ameaças que o Mestre pode usar para interromper o voo temporariamente.',
      'Qualquer atributo adequado pode conduzir o voo: Agilidade para velocidade e acrobacia; Finesse para precisão; Força para romper obstáculos; Instinto para navegar e perceber perigo; Presença para estilo e distração; Conhecimento para planejar trajetos e tempos.',
      'Em uma campanha menos letal, um movimento de morte que mataria a personagem a envia para a enfermaria por algumas semanas ou para casa por um período prolongado. Ela fica indisponível durante a recuperação, mas não morre.'
    ]
  },
  {
    slug:'grimdark-campaigns', termo:'Campanhas sombrias', categoria:'campanha',
    resumo:'Aplica a corrupção Tocada pelas Sombras e usa Fogueiras e Tochas Sagradas como refúgios.',
    explicacao:[
      'Um adversário Tocado pelas Sombras obtém sucesso crítico em jogadas de ataque com 19–20.',
      'Uma personagem Tocada pelas Sombras recebe bônus de dano igual ao número de Cicatrizes marcadas.',
      'Se ela marcar com uma Cicatriz seu último espaço de Esperança, sucumbe à corrupção e avança para a escuridão em vez de fazer um movimento de morte.',
      'Fogueiras Sagradas precisam receber combustível continuamente e só podem ser reacendidas com uma Tocha Sagrada.',
      'Quando uma Fogueira Sagrada é reacendida, cada personagem presente recebe 3 Esperança. Sua luz repele da vizinhança imediata todos os monstros, exceto os mais poderosos.'
    ]
  },
  {
    slug:'hex-crawl-campaigns', termo:'Campanhas de exploração em hexágonos', categoria:'campanha',
    resumo:'Organiza mapas, dias de viagem, repousos, encontros, desgaste, rotas aquáticas, trilhas de ruína e poderes de habitat.',
    explicacao:[
      'Cada hexágono representa aproximadamente 24 milhas. O grupo avança um hexágono por vez e pode fazer até três repousos curtos na natureza; repousos longos exigem um santuário ou assentamento seguro.',
      'Use dois mapas: o mapa-chave do Mestre guarda habitat, terreno, pontos de interesse e encontros; o mapa do grupo é preenchido conforme os hexágonos são revelados.',
      'Para gerar uma região, role d20 para o habitat, d12 para a quantidade de hexágonos contíguos, d8+d6 para o tipo de encontro, d4 para o terreno e d100 para um rumor.',
      'Habitats no d20: 1 arruinado por magia sombria (role de novo para o habitat), 2 subterrâneo, 3–4 aquático, 5–6 pantanal, 7–8 pradaria, 9–10 tropical, 11–12 floresta, 13–14 árido, 15–16 ondulado, 17–18 montanha, 19 congelado, 20 terras ermas. Um segundo 1 torna a região quase intransponível.',
      'Encontro em d8+d6: 2 combine duas entradas; 3 viajantes; 4 contratempo; 5 adversários poderosos; 6 clima extremo; 7 possíveis adversários; 8 fera territorial; 9 perigo ambiental; 10 PNJs inimigos; 11 local maravilhoso ou perigoso; 12 sorte; 13 assentamento; 14 tesouro.',
      'Terreno d4 determina dias para entrar: 1 ótimo/1 dia, 2 razoável/2 dias, 3 acidentado/3 dias, 4 extremo/4 dias.',
      'Ao entrar em um hexágono, role uma quantidade de d6 igual à classificação do terreno. Qualquer 1 ativa o encontro; sem 1, o Mestre ainda pode gastar Medo. Áreas mais perigosas podem usar d4 e mais seguras, d8.',
      'Fora de lugar seguro, cada repouso curto representa um dia inteiro parado. Depois de três repousos curtos consecutivos, o próximo precisa ser longo.',
      'Regra opcional: ao fim de um repouso, cada personagem recebe Contagem de Resistência (6). Ao entrar na natureza, role o Dado de Esperança: resultado menor ou igual à contagem marca 1 Estresse; resultado maior reduz a contagem. Ao disparar, a personagem fica Vulnerável até o próximo repouso; toda contagem termina no início do repouso.',
      'Em rios navegáveis, ir corrente abaixo reduz o terreno em 1 e subir aumenta em 1. No oceano, d4 define 1 a 4 dias: vento favorável, tempo bom, águas revoltas ou clima extremo.',
      'Na Trilha de Ruína, marque ao fim da sessão uma caixa do patamar do grupo ou inferior; caixas internas só podem ser marcadas depois da caixa que as contém.',
      'Arruinado: em área igualmente corrompida, o adversário obtém crítico em ataques com 18–20.',
      'Ambientomante: marque 1 Estresse para produzir o efeito do habitat. Calor causa reação de Instinto, Estresse e d6 de dano mágico direto; vegetação causa reação de Agilidade, d8 físico e Restrita; vento causa reação de Força, d8 mágico, empurra para Distante e dá desvantagem contra o adversário até ele sofrer dano.',
      'Ambientomante, continuação: gelo ataca alvos à frente em Próximo, causa d10 mágico e Congelada (−1 Proficiência até gastar 1 Esperança); veneno exige reação de Força, causa d6 direto e Enjoada (não recebe Esperança até limpar 1 PV); pedra soma o patamar aos limiares até sofrer dano Severo ou reutilizar; água ataca em Muito Próximo, empurra para Próximo e marca Estresse igual ao patamar.',
      'Quando o dano de Ambientomante usa o patamar, role o dado de dano uma vez por patamar e some os resultados.'
    ]
  },
  {
    slug:'tech-based-campaigns', termo:'Campanhas tecnológicas', categoria:'campanha',
    resumo:'Substitui magia por tecnologia e oferece arma icônica, melhorias, Rede Tecnológica, Créditos, Sucata e fabricação.',
    explicacao:[
      'Dano tecnológico substitui dano mágico; ataques mágicos podem ser descritos como som, luz, nanorrobôs, plasma ou outra tecnologia.',
      'Cada personagem substitui armas primária e secundária por uma Arma Icônica de duas mãos. Escolha atributo, alcance e dano; dê nome e descrição. Vinculada: some seu nível às rolagens de dano.',
      'A Arma Icônica começa com 2 espaços de Melhoria no patamar 1 e recebe mais 1 em cada patamar seguinte. Melhorias instaladas são características de arma.',
      'É possível fabricar qualquer quantidade de Melhorias, mas instalar somente até os espaços disponíveis. Durante o repouso, troque livremente as Melhorias que já possui.',
      'Cada personagem começa com um Conector de Rede Tecnológica. É preciso conectar-se à rede mundial de dados e energia da campanha para fazer movimentos de repouso.',
      'Ouro é substituído por Créditos e todas as personagens começam com 5 Créditos. Conversão: 10 Créditos = 1 punhado, 100 = 1 bolsa e 1.000 = 1 baú de ouro.',
      'Sucata tem três categorias: Fragmentos d6, Metais d8 e Componentes d10. O Mestre define quantos dados de cada categoria cada personagem rola; o resultado identifica a peça na tabela da campanha.',
      'Recompensa sugerida cresce com dificuldade e presença tecnológica: encontro fácil rende de 2 Fragmentos até 2 Fragmentos, 1 Metal e 1 Componente; muito difícil rende de 2 Fragmentos, 2 Metais e 1 Componente até 4 Fragmentos, 3 Metais e 3 Componentes.',
      'Relíquias vêm de adversários tecnológicos importantes, valem 20 Créditos e servem para Melhorias poderosas.',
      'Com um movimento de repouso, gaste a Sucata ou Relíquia exigida para fabricar uma Melhoria cujos pré-requisitos cumpra. Desmontá-la devolve seus componentes.',
      'Uma peça de Sucata custa tantos Créditos quanto o resultado que a encontrou, tanto na compra quanto na venda.',
      'Estoque padrão por comerciante: role 1d10 para cada Fragmento, 1d8 para cada Metal e 1d6 para cada Componente, sob decisão final do Mestre.'
    ]
  },
  {
    slug:'the-witherwild', termo:'A Selva Definhada', categoria:'campanha',
    resumo:'Apresenta a campanha de Fanewick e sua corrupção, que transforma dano Severo em risco de Cicatriz e alimenta o Medo.',
    explicacao:[
      'Adversários e ambientes podem receber o tipo Definhado. Descreva como a corrupção mudou sua aparência e seu modo de agir.',
      'Separe cerca de 20 fichas de Definhamento; elas podem ser as mesmas usadas para Medo.',
      'Sempre que uma personagem sofre dano Severo de um adversário ou ambiente Definhado, coloque 1 ficha de Definhamento em sua ficha e role o Dado de Medo.',
      'Se o resultado for menor ou igual ao número de fichas de Definhamento, a personagem recebe imediatamente 1 Cicatriz, limpa todas essas fichas e descreve a transformação permanente.',
      'Ao fim de cada sessão, remova todas as fichas de Definhamento das personagens e o Mestre recebe a mesma quantidade de Medo.',
      'Se uma personagem morrer enquanto tiver fichas de Definhamento, seu corpo é tomado permanentemente pela Selva Definhada.',
      'O cenário usa semanas inteiras de dia e de noite, a Doença da Serpente, a rara flor Véu-da-Dama carmesim e pequenas divindades encarnadas como motores narrativos; essas distinções não alteram outras regras da ficha.'
    ]
  }
];

const campanhas = definicoes.map((d) => {
  const arquivo = path.join(corpus, `${d.slug}.jsonld`);
  const fonte = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  return {
    id:d.slug, termo:d.termo, resumo:d.resumo, explicacao:d.explicacao,
    resolucao:'manual-assistida', fonteId:`rules/${d.slug}`,
    sourceLocator:fonte.sourceLocator,
    corpusSha256:crypto.createHash('sha256').update(fs.readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n')).digest('hex')
  };
});

fs.writeFileSync(path.join(raiz, 'data/campanhas-srd2.json'), `${JSON.stringify({versao:1,fonte:'Daggerheart SRD 2.0',campanhas}, null, 2)}\n`);

const arquivoVerbetes = path.join(raiz, 'data/verbetes.json');
const verbetes = JSON.parse(fs.readFileSync(arquivoVerbetes, 'utf8'));
const ids = new Set(definicoes.map((d) => d.slug));
verbetes.verbetes = verbetes.verbetes.filter((v) => !ids.has(v.id));
for (const d of definicoes) {
  const c = campanhas.find((item) => item.id === d.slug);
  verbetes.verbetes.push({
    id:d.slug, termo:d.termo, variantes:[], categoria:d.categoria,
    pagina:c.sourceLocator.pdfPageStart, fonteRotulo:'SRD 2.0',
    ancora:c.sourceLocator.heading, resumo:d.resumo, explicacao:d.explicacao,
    veja:[], sourceId:c.fonteId, corpusSha256:c.corpusSha256
  });
}
fs.writeFileSync(arquivoVerbetes, `${JSON.stringify(verbetes, null, 2)}\n`);

const inventario = ler('data/srd2-inventario.json');
const auditoria = ler('data/srd2-regras-auditoria.json');
const registros = inventario.colecoes.flatMap((c) => c.registros);
const auditados = new Map(auditoria.registros.map((r) => [r.idFonte, r]));
for (const c of campanhas) {
  const registro = registros.find((r) => r.id === c.fonteId);
  const auditado = auditados.get(c.fonteId);
  if (!registro || !auditado) throw new Error(`${c.fonteId}: fonte ausente da auditoria`);
  registro.estado = 'mecanica-implementada';
  registro.corpusSha256 = c.corpusSha256;
  auditado.estado = 'implementado-diretamente';
  auditado.artefatos = ['data/campanhas-srd2.json', 'data/verbetes.json', 'js/verbete.js', 'js/telas/regras.js'];
  auditado.verbetes = [c.id];
}
fs.writeFileSync(path.join(raiz, 'data/srd2-inventario.json'), `${JSON.stringify(inventario, null, 2)}\n`);
fs.writeFileSync(path.join(raiz, 'data/srd2-regras-auditoria.json'), `${JSON.stringify(auditoria, null, 2)}\n`);
console.log(`${campanhas.length} módulos de campanha SRD2 integrados em português.`);
