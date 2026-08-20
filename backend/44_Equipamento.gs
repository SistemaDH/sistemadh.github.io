/**
 * ============================================================================
 *  Arquivo: 44_Equipamento.gs
 *  Armas, armaduras e itens — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-44-equipamento.mjs a partir de data/equipamentos.json.
 *  NÃO edite à mão.
 *
 *  FONTES (decisão da mesa, 19/08/2026):
 *   • NÚMEROS (dano, alcance, limiares, pontuação): SRD oficial, que já vem
 *     com as erratas aplicadas. O livro em pt-BR está numa versão ANTERIOR à
 *     errata — Espada Longa, Lança e Anéis Brilhantes têm números velhos lá.
 *   • NOMES em português: o livro, quando legível e correto; corrigidos por
 *     nós quando o livro errou. Toda correção está em
 *     data/equipamentos-correcoes.json.
 *
 *  Regras do livro usadas aqui:
 *   • Carga: o personagem tem 2 mãos. Uma arma de duas mãos ocupa as duas,
 *     então não sobra mão para arma secundária (livro, p.113).
 *   • Nível da tabela: Nível 1 = personagem nível 1; Nível 2 = níveis 2 a 4;
 *     Nível 3 = níveis 5 a 7; Nível 4 = níveis 8 a 10.
 * ============================================================================
 */

/** Até que nível de personagem cada tabela de equipamento vale. */
const TIER_POR_NIVEL = [null, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];

/** Quantas mãos o personagem tem. */
const MAOS_DISPONIVEIS = 2;

/** Armas primárias e secundárias. */
const ARMAS = [
  {"id":"primaria-t1-espada-larga","nome":"Espada Larga","cat":"primaria","tier":1,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8 phy","maos":"Uma mão","carac":"Confiável"},
  {"id":"primaria-t1-espada-longa","nome":"Espada longa","cat":"primaria","tier":1,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d10+3 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t1-machado-de-batalha","nome":"Machado de batalha","cat":"primaria","tier":1,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+3 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t1-espada-grande","nome":"Espada Grande","cat":"primaria","tier":1,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+3 phy","maos":"Duas mãos","carac":"Enorme"},
  {"id":"primaria-t1-maca","nome":"Maça","cat":"primaria","tier":1,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+1 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t1-martelo-de-guerra","nome":"Martelo de guerra","cat":"primaria","tier":1,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d12+3 phy","maos":"Duas mãos","carac":"Pesado"},
  {"id":"primaria-t1-adaga","nome":"Adaga","cat":"primaria","tier":1,"tabela":"Física","atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+1 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t1-bordao","nome":"Bordão","cat":"primaria","tier":1,"tabela":"Física","atributo":"Instinto","alcance":"Corpo a Corpo","dano":"d10+3 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t1-cutelo","nome":"Cutelo","cat":"primaria","tier":1,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8+1 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t1-florete","nome":"Florete","cat":"primaria","tier":1,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8 phy","maos":"Uma mão","carac":"Rápido"},
  {"id":"primaria-t1-alabarda","nome":"Alabarda","cat":"primaria","tier":1,"tabela":"Física","atributo":"Força","alcance":"Muito Próximo","dano":"d10+2 phy","maos":"Duas mãos","carac":"Incômoda"},
  {"id":"primaria-t1-lanca","nome":"Lança","cat":"primaria","tier":1,"tabela":"Física","atributo":"Finesse","alcance":"Muito Próximo","dano":"d8+3 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t1-arco-curto","nome":"Arco curto","cat":"primaria","tier":1,"tabela":"Física","atributo":"Agilidade","alcance":"Distante","dano":"d6+3 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t1-besta","nome":"Besta","cat":"primaria","tier":1,"tabela":"Física","atributo":"Finesse","alcance":"Distante","dano":"d6+1 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t1-arco-longo","nome":"Arco longo","cat":"primaria","tier":1,"tabela":"Física","atributo":"Agilidade","alcance":"Muito Distante","dano":"d8+3 phy","maos":"Duas mãos","carac":"Incômoda"},
  {"id":"primaria-t2-espada-larga-aprimorada","nome":"Espada larga aprimorada","cat":"primaria","tier":2,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8+3 phy","maos":"Uma mão","carac":"Confiável"},
  {"id":"primaria-t2-espada-longa-aprimorada","nome":"Espada longa aprimorada","cat":"primaria","tier":2,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d10+6 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t2-machado-de-batalha-aprimorado","nome":"Machado de batalha aprimorado","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+6 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t2-espada-grande-aprimorada","nome":"Espada Grande Aprimorada","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+6 phy","maos":"Duas mãos","carac":"Enorme"},
  {"id":"primaria-t2-maca-aprimorada","nome":"Maça Aprimorada","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+4 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t2-warhammer-aprimorado","nome":"Martelo de guerra aprimorado","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d12+6 phy","maos":"Duas mãos","carac":"Pesado"},
  {"id":"primaria-t2-adaga-aprimorada","nome":"Adaga aprimorada","cat":"primaria","tier":2,"tabela":"Física","atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+4 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t2-bordao-aprimorado","nome":"Bordão Aprimorado","cat":"primaria","tier":2,"tabela":"Física","atributo":"Instinto","alcance":"Corpo a Corpo","dano":"d10+6 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t2-cutelo-aprimorado","nome":"Cutelo Aprimorado","cat":"primaria","tier":2,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8+4 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t2-florete-aprimorado","nome":"Florete Aprimorado","cat":"primaria","tier":2,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8+3 phy","maos":"Uma mão","carac":"Rápido"},
  {"id":"primaria-t2-alabarda-aprimorada","nome":"Alabarda aprimorada","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Muito Próximo","dano":"d10+5 phy","maos":"Duas mãos","carac":"Incômoda"},
  {"id":"primaria-t2-lanca-aprimorada","nome":"Lança aprimorada","cat":"primaria","tier":2,"tabela":"Física","atributo":"Finesse","alcance":"Muito Próximo","dano":"d8+6 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t2-arco-curto-aprimorado","nome":"Arco curto aprimorado","cat":"primaria","tier":2,"tabela":"Física","atributo":"Agilidade","alcance":"Distante","dano":"d6+6 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t2-besta-aprimorada","nome":"Besta aprimorada","cat":"primaria","tier":2,"tabela":"Física","atributo":"Finesse","alcance":"Distante","dano":"d6+4 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t2-arco-longo-aprimorado","nome":"Arco longo aprimorado","cat":"primaria","tier":2,"tabela":"Física","atributo":"Agilidade","alcance":"Muito Distante","dano":"d8+6 phy","maos":"Duas mãos","carac":"Incômoda"},
  {"id":"primaria-t2-bracamarte-dourado","nome":"Bracamarte Dourado","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+4 phy","maos":"Uma mão","carac":"Poderoso"},
  {"id":"primaria-t2-laminas-de-punho","nome":"Lâminas de Punho","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+6 phy","maos":"Duas mãos","carac":"Brutal"},
  {"id":"primaria-t2-espada-larga-de-urok","nome":"Espada larga de Urok","cat":"primaria","tier":2,"tabela":"Física","atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+3 phy","maos":"Uma mão","carac":"Mortal"},
  {"id":"primaria-t2-chicote-com-laminas","nome":"Chicote com lâminas","cat":"primaria","tier":2,"tabela":"Física","atributo":"Agilidade","alcance":"Muito Próximo","dano":"d8+3 phy","maos":"Uma mão","carac":"Rápido"},
  {"id":"primaria-t2-alabarda-forjada-em-aco","nome":"Alabarda forjada em aço","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Muito Próximo","dano":"d8+4 phy","maos":"Duas mãos","carac":"Assustador"},
  {"id":"primaria-t2-foice-de-guerra","nome":"Foice de Guerra","cat":"primaria","tier":2,"tabela":"Física","atributo":"Finesse","alcance":"Muito Próximo","dano":"d8+5 phy","maos":"Duas mãos","carac":"Confiável"},
  {"id":"primaria-t2-cassetete","nome":"Trabuco","cat":"primaria","tier":2,"tabela":"Física","atributo":"Finesse","alcance":"Próximo","dano":"d8+6 phy","maos":"Duas mãos","carac":"Recarga"},
  {"id":"primaria-t2-grande-arco","nome":"Grande arco","cat":"primaria","tier":2,"tabela":"Física","atributo":"Força","alcance":"Distante","dano":"d6+6 phy","maos":"Duas mãos","carac":"Poderoso"},
  {"id":"primaria-t2-arco-de-pelo-fino","nome":"Arco de pelo fino","cat":"primaria","tier":2,"tabela":"Física","atributo":"Agilidade","alcance":"Muito Distante","dano":"d6+5 phy","maos":"Duas mãos","carac":"Confiável"},
  {"id":"primaria-t3-espada-larga-avancada","nome":"Espada larga avançada","cat":"primaria","tier":3,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8+6 phy","maos":"Uma mão","carac":"Confiável"},
  {"id":"primaria-t3-espada-longa-avancada","nome":"Espada longa avançada","cat":"primaria","tier":3,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d10+9 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t3-machado-de-batalha-avancado","nome":"Machado de batalha avançado","cat":"primaria","tier":3,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+9 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t3-espada-grande-avancada","nome":"Espada Grande Avançada","cat":"primaria","tier":3,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+9 phy","maos":"Duas mãos","carac":"Enorme"},
  {"id":"primaria-t3-maca-avancada","nome":"Maça Avançada","cat":"primaria","tier":3,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+7 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t3-warhammer-avancado","nome":"Warhammer avançado","cat":"primaria","tier":3,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d12+9 phy","maos":"Duas mãos","carac":"Pesado"},
  {"id":"primaria-t3-adaga-avancada","nome":"Adaga avançada","cat":"primaria","tier":3,"tabela":"Física","atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+7 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t3-bordao-avancado","nome":"Bordão Avançado","cat":"primaria","tier":3,"tabela":"Física","atributo":"Instinto","alcance":"Corpo a Corpo","dano":"d10+9 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t3-cutelo-avancado","nome":"Cutelo Avançado","cat":"primaria","tier":3,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8+7 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t3-florete-avancado","nome":"Florete Avançado","cat":"primaria","tier":3,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8+6 phy","maos":"Uma mão","carac":"Rápido"},
  {"id":"primaria-t3-alabarda-avancada","nome":"Alabarda avançada","cat":"primaria","tier":3,"tabela":"Física","atributo":"Força","alcance":"Muito Próximo","dano":"d10+8 phy","maos":"Duas mãos","carac":"Incômoda"},
  {"id":"primaria-t3-lanca-avancada","nome":"Lança avançada","cat":"primaria","tier":3,"tabela":"Física","atributo":"Finesse","alcance":"Muito Próximo","dano":"d8+9 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t3-arco-curto-avancado","nome":"Arco curto avançado","cat":"primaria","tier":3,"tabela":"Física","atributo":"Agilidade","alcance":"Distante","dano":"d6+9 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t3-besta-avancada","nome":"Besta avançada","cat":"primaria","tier":3,"tabela":"Física","atributo":"Finesse","alcance":"Distante","dano":"d6+7 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t3-arco-longo-avancado","nome":"Arco longo avançado","cat":"primaria","tier":3,"tabela":"Física","atributo":"Agilidade","alcance":"Muito Distante","dano":"d8+9 phy","maos":"Duas mãos","carac":"Incômoda"},
  {"id":"primaria-t3-lamina-vagalume","nome":"Lâmina Vagalume","cat":"primaria","tier":3,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8+5 phy","maos":"Uma mão","carac":"Asa Afiada"},
  {"id":"primaria-t3-espada-valente","nome":"Espada Valente","cat":"primaria","tier":3,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d12+7 phy","maos":"Duas mãos","carac":"Corajoso"},
  {"id":"primaria-t3-martelo-da-ira","nome":"Martelo da Ira","cat":"primaria","tier":3,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+7 phy","maos":"Duas mãos","carac":"Devastador"},
  {"id":"primaria-t3-machado-de-labrys","nome":"Machado de Labrys","cat":"primaria","tier":3,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+7 phy","maos":"Duas mãos","carac":"Proteção"},
  {"id":"primaria-t3-meridiano-cutelo","nome":"Cutelo Meridiano","cat":"primaria","tier":3,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d10+5 phy","maos":"Uma mão","carac":"Duelista"},
  {"id":"primaria-t3-sabre-retratil","nome":"Sabre Retrátil","cat":"primaria","tier":3,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d10+7 phy","maos":"Uma mão","carac":"Retrátil"},
  {"id":"primaria-t3-mangual-duplo","nome":"Mangual duplo","cat":"primaria","tier":3,"tabela":"Física","atributo":"Agilidade","alcance":"Muito Próximo","dano":"d10+8 phy","maos":"Duas mãos","carac":"Poderoso"},
  {"id":"primaria-t3-laminas-de-garra","nome":"Lâminas de Garra","cat":"primaria","tier":3,"tabela":"Física","atributo":"Finesse","alcance":"Próximo","dano":"d10+7 phy","maos":"Duas mãos","carac":"Brutal"},
  {"id":"primaria-t3-revolver-de-polvora-negra","nome":"Revólver de Pólvora Negra","cat":"primaria","tier":3,"tabela":"Física","atributo":"Finesse","alcance":"Distante","dano":"d6+8 phy","maos":"Uma mão","carac":"Recarga"},
  {"id":"primaria-t3-arco-com-espigoes","nome":"Arco com Espigões","cat":"primaria","tier":3,"tabela":"Física","atributo":"Agilidade","alcance":"Muito Distante","dano":"d6+7 phy","maos":"Duas mãos","carac":"Versátil"},
  {"id":"primaria-t4-espada-larga-lendaria","nome":"Espada larga lendária","cat":"primaria","tier":4,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8+9 phy","maos":"Uma mão","carac":"Confiável"},
  {"id":"primaria-t4-espada-longa-lendaria","nome":"Espada longa lendária","cat":"primaria","tier":4,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d10+12 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t4-machado-de-batalha-lendario","nome":"Machado de batalha lendário","cat":"primaria","tier":4,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+12 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t4-espada-grande-lendaria","nome":"Espada Grande Lendária","cat":"primaria","tier":4,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+12 phy","maos":"Duas mãos","carac":"Enorme"},
  {"id":"primaria-t4-maca-lendaria","nome":"Maça Lendária","cat":"primaria","tier":4,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+10 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t4-martelo-de-guerra-lendario","nome":"Martelo de guerra lendário","cat":"primaria","tier":4,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d12+12 phy","maos":"Duas mãos","carac":"Pesado"},
  {"id":"primaria-t4-adaga-lendaria","nome":"Adaga Lendária","cat":"primaria","tier":4,"tabela":"Física","atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+10 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t4-bordao-lendario","nome":"Bordão Lendário","cat":"primaria","tier":4,"tabela":"Física","atributo":"Instinto","alcance":"Corpo a Corpo","dano":"d10+12 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t4-cutelo-lendario","nome":"Cutelo Lendário","cat":"primaria","tier":4,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8+10 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t4-florete-lendario","nome":"Florete Lendário","cat":"primaria","tier":4,"tabela":"Física","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8+9 phy","maos":"Uma mão","carac":"Rápido"},
  {"id":"primaria-t4-alabarda-lendaria","nome":"Alabarda lendária","cat":"primaria","tier":4,"tabela":"Física","atributo":"Força","alcance":"Muito Próximo","dano":"d10+11 phy","maos":"Duas mãos","carac":"Incômoda"},
  {"id":"primaria-t4-lanca-lendaria","nome":"Lança lendária","cat":"primaria","tier":4,"tabela":"Física","atributo":"Finesse","alcance":"Muito Próximo","dano":"d8+12 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t4-arco-curto-lendario","nome":"Arco curto lendário","cat":"primaria","tier":4,"tabela":"Física","atributo":"Agilidade","alcance":"Distante","dano":"d6+12 phy","maos":"Duas mãos","carac":null},
  {"id":"primaria-t4-besta-lendaria","nome":"Besta lendária","cat":"primaria","tier":4,"tabela":"Física","atributo":"Finesse","alcance":"Distante","dano":"d6+10 phy","maos":"Uma mão","carac":null},
  {"id":"primaria-t4-arco-longo-lendario","nome":"Arco longo lendário","cat":"primaria","tier":4,"tabela":"Física","atributo":"Agilidade","alcance":"Muito Distante","dano":"d8+12 phy","maos":"Duas mãos","carac":"Incômoda"},
  {"id":"primaria-t4-espada-de-duas-pontas","nome":"Espada de duas pontas","cat":"primaria","tier":4,"tabela":"Física","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d10+9 phy","maos":"Duas mãos","carac":"Rápido"},
  {"id":"primaria-t4-manopla-de-impacto","nome":"Manopla de impacto","cat":"primaria","tier":4,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+11 phy","maos":"Uma mão","carac":"Concussivo"},
  {"id":"primaria-t4-machado-de-marreta","nome":"Machado de marreta","cat":"primaria","tier":4,"tabela":"Física","atributo":"Força","alcance":"Corpo a Corpo","dano":"d12+13 phy","maos":"Duas mãos","carac":"Destrutiva"},
  {"id":"primaria-t4-punhal-curvo","nome":"Punhal Curvo","cat":"primaria","tier":4,"tabela":"Física","atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+9 phy","maos":"Uma mão","carac":"Serrilhada"},
  {"id":"primaria-t4-arma-de-mao-estendida","nome":"Arma de Haste Estendida","cat":"primaria","tier":4,"tabela":"Física","atributo":"Finesse","alcance":"Muito Próximo","dano":"d8+10 phy","maos":"Duas mãos","carac":"Longo"},
  {"id":"primaria-t4-lamina-de-corda-oscilante","nome":"Lâmina de corda oscilante","cat":"primaria","tier":4,"tabela":"Física","atributo":"Presença","alcance":"Próximo","dano":"d8+9 phy","maos":"Duas mãos","carac":"Agarrão"},
  {"id":"primaria-t4-machados-ricochete","nome":"Machados Ricochete","cat":"primaria","tier":4,"tabela":"Física","atributo":"Agilidade","alcance":"Distante","dano":"d6+11 phy","maos":"Duas mãos","carac":"Saltitante"},
  {"id":"primaria-t4-arco-aantari","nome":"Arco Aantari","cat":"primaria","tier":4,"tabela":"Física","atributo":"Finesse","alcance":"Distante","dano":"d6+11 phy","maos":"Duas mãos","carac":"Confiável"},
  {"id":"primaria-t4-canhao-de-mao","nome":"Canhão de mão","cat":"primaria","tier":4,"tabela":"Física","atributo":"Finesse","alcance":"Muito Distante","dano":"d6+12 phy","maos":"Uma mão","carac":"Recarga"},
  {"id":"primaria-t1-manoplas-arcanas","nome":"Manoplas Arcanas","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+3 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t1-machado-sagrado","nome":"Machado sagrado","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+1 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t1-aneis-brilhantes","nome":"Anéis brilhantes","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Agilidade","alcance":"Muito Próximo","dano":"d10+2 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t1-runas-de-mao","nome":"Runas de mão","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Instinto","alcance":"Muito Próximo","dano":"d10 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t1-lamina-de-retorno","nome":"Lâmina de retorno","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Finesse","alcance":"Próximo","dano":"d8 mag","maos":"Uma mão","carac":"Retorno"},
  {"id":"primaria-t1-bastao-curto","nome":"Bastão Curto","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Instinto","alcance":"Próximo","dano":"d8+1 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t1-bastao-duplo","nome":"Bastão Duplo","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Instinto","alcance":"Distante","dano":"d6+3 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t1-cetro","nome":"Cetro","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Presença","alcance":"Distante","dano":"d6 mag","maos":"Duas mãos","carac":"Versátil"},
  {"id":"primaria-t1-varinha-magica","nome":"Varinha mágica","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Distante","dano":"d6+1 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t1-bastao-longo","nome":"Bastão Longo","cat":"primaria","tier":1,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Muito Distante","dano":"d6 mag","maos":"Duas mãos","carac":"Poderoso"},
  {"id":"primaria-t2-manoplas-arcanas-aprimoradas","nome":"Manoplas Arcanas Aprimoradas","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+6 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t2-machado-sagrado-aprimorado","nome":"Machado sagrado aprimorado","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+4 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t2-aneis-brilhantes-aprimorados","nome":"Anéis brilhantes aprimorados","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Agilidade","alcance":"Muito Próximo","dano":"d10+5 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t2-runas-de-mao-aprimoradas","nome":"Runas de mão aprimoradas","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Instinto","alcance":"Muito Próximo","dano":"d10+3 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t2-lamina-de-retorno-aprimorada","nome":"Lâmina de retorno aprimorada","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Finesse","alcance":"Próximo","dano":"d8+3 mag","maos":"Uma mão","carac":"Retorno"},
  {"id":"primaria-t2-bastao-curto-aprimorado","nome":"Bastão Curto Aprimorado","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Instinto","alcance":"Próximo","dano":"d8+4 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t2-bastao-duplo-aprimorado","nome":"Bastão Duplo Aprimorado","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Instinto","alcance":"Distante","dano":"d6+6 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t2-cetro-aprimorado","nome":"Cetro aprimorado","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Presença","alcance":"Distante","dano":"d6+3 mag","maos":"Duas mãos","carac":"Versátil"},
  {"id":"primaria-t2-varinha-aprimorada","nome":"Varinha aprimorada","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Distante","dano":"d6+4 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t2-bastao-longo-aprimorado","nome":"Bastão Longo Aprimorado","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Muito Distante","dano":"d6+3 mag","maos":"Duas mãos","carac":"Poderoso"},
  {"id":"primaria-t2-lamina-ego","nome":"Lâmina Ego","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d12+4 mag","maos":"Uma mão","carac":"Pomposo"},
  {"id":"primaria-t2-espada-de-fundicao","nome":"Espada de Conjuração","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+4 mag","maos":"Duas mãos","carac":"Versátil"},
  {"id":"primaria-t2-adaga-devoradora","nome":"Adaga Devoradora","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+4 mag","maos":"Uma mão","carac":"Assustador"},
  {"id":"primaria-t2-martelo-de-exota","nome":"Martelo de Exota","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Instinto","alcance":"Corpo a Corpo","dano":"d8+6 mag","maos":"Duas mãos","carac":"Eruptivo"},
  {"id":"primaria-t2-arco-de-sangue-yutari","nome":"Arco de Sangue Yutari","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Finesse","alcance":"Distante","dano":"d6+4 mag","maos":"Duas mãos","carac":"Brutal"},
  {"id":"primaria-t2-arco-de-anciao","nome":"Arco de Ancião","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Instinto","alcance":"Distante","dano":"d6+4 mag","maos":"Duas mãos","carac":"Poderoso"},
  {"id":"primaria-t2-cetro-de-elias","nome":"Cetro de Elias","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Presença","alcance":"Distante","dano":"d6+3 mag","maos":"Uma mão","carac":"Revigorante"},
  {"id":"primaria-t2-varinha-de-entusiasmo","nome":"Varinha do Fascínio","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Presença","alcance":"Distante","dano":"d6+4 mag","maos":"Uma mão","carac":"Persuasão"},
  {"id":"primaria-t2-bastao-do-guardiao","nome":"Bastão do Guardião","cat":"primaria","tier":2,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Distante","dano":"d6+4 mag","maos":"Duas mãos","carac":"Confiável"},
  {"id":"primaria-t3-manoplas-arcanas-avancadas","nome":"Manoplas Arcanas Avançadas","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+9 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t3-machado-sagrado-avancado","nome":"Machado sagrado avançado","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+7 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t3-aneis-brilhantes-avancados","nome":"Anéis brilhantes avançados","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Agilidade","alcance":"Muito Próximo","dano":"d10+8 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t3-runas-manuais-avancadas","nome":"Runas manuais avançadas","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Instinto","alcance":"Muito Próximo","dano":"d10+6 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t3-lamina-de-retorno-avancada","nome":"Lâmina de retorno avançada","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Finesse","alcance":"Próximo","dano":"d8+6 mag","maos":"Uma mão","carac":"Retorno"},
  {"id":"primaria-t3-bastao-curto-avancado","nome":"Bastão Curto Avançado","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Instinto","alcance":"Próximo","dano":"d8+7 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t3-bastao-duplo-avancado","nome":"Bastão Duplo Avançado","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Instinto","alcance":"Distante","dano":"d6+9 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t3-avancado-nome-cortado-incompleto","nome":"Avançado (nome cortado/incompleto)","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Presença","alcance":"Distante","dano":"d6+6 mag","maos":"Duas mãos","carac":"Versátil"},
  {"id":"primaria-t3-avancado-cetro","nome":"Avançado cetro","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Distante","dano":"d6+7 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t3-bastao-longo-avancado","nome":"Bastão Longo Avançado","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Muito Distante","dano":"d6+6 mag","maos":"Duas mãos","carac":"Poderoso"},
  {"id":"primaria-t3-machado-de-fortunis","nome":"Machado de Fortunis","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+8 mag","maos":"Duas mãos","carac":"Sortudo"},
  {"id":"primaria-t3-punhal-abencoado","nome":"Punhal Abençoado","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Instinto","alcance":"Corpo a Corpo","dano":"d10+6 mag","maos":"Uma mão","carac":"Curativo"},
  {"id":"primaria-t3-lamina-fantasma","nome":"Lâmina Fantasma","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d10+7 phy or mag","maos":"Uma mão","carac":"Extraterreno"},
  {"id":"primaria-t3-runas-da-ruina","nome":"Runas da Ruína","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Muito Próximo","dano":"d20+4 mag","maos":"Uma mão","carac":"Doloroso"},
  {"id":"primaria-t3-pingente-widogast","nome":"Pingente Widogast","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Próximo","dano":"d10+5 mag","maos":"Uma mão","carac":"Dobra do Tempo"},
  {"id":"primaria-t3-arco-dourado","nome":"Arco dourado","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Finesse","alcance":"Distante","dano":"d6+7 mag","maos":"Duas mãos","carac":"Autocorretiva"},
  {"id":"primaria-t3-bastao-de-fogo","nome":"Bastão de Fogo","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Instinto","alcance":"Distante","dano":"d6+7 mag","maos":"Duas mãos","carac":"Queimadura"},
  {"id":"primaria-t3-orbe-do-mago","nome":"Orbe do Mago","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Distante","dano":"d6+7 mag","maos":"Uma mão","carac":"Poderoso"},
  {"id":"primaria-t3-rifle-de-ilmari","nome":"Rifle de Ilmari","cat":"primaria","tier":3,"tabela":"Mágica","atributo":"Finesse","alcance":"Muito Distante","dano":"d6+6 mag","maos":"Uma mão","carac":"Recarga"},
  {"id":"primaria-t4-manoplas-arcanas-lendarias","nome":"Manoplas Arcanas Lendárias","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+12 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t4-machado-lendario-consagrado","nome":"Machado lendário consagrado","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+10 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t4-aneis-lendarios-que-brilham","nome":"Anéis lendários que brilham","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Agilidade","alcance":"Muito Próximo","dano":"d10+11 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t4-runas-de-mao-lendarias","nome":"Runas de mão lendárias","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Instinto","alcance":"Muito Próximo","dano":"d10+9 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t4-lamina-lendaria-que-retorna","nome":"Lâmina lendária que retorna","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Finesse","alcance":"Próximo","dano":"d8+9 mag","maos":"Uma mão","carac":"Retorno"},
  {"id":"primaria-t4-bastao-curto-lendario","nome":"Bastão Curto Lendário","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Instinto","alcance":"Próximo","dano":"d8+10 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t4-bastao-duplo-lendario","nome":"Bastão Duplo Lendário","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Instinto","alcance":"Distante","dano":"d8+12 mag","maos":"Duas mãos","carac":null},
  {"id":"primaria-t4-cetro-lendario","nome":"Cetro lendário","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Presença","alcance":"Distante","dano":"d6+9 mag","maos":"Duas mãos","carac":"Versátil"},
  {"id":"primaria-t4-varinha-lendaria","nome":"Varinha Lendária","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Distante","dano":"d6+10 mag","maos":"Uma mão","carac":null},
  {"id":"primaria-t4-bastao-longo-lendario","nome":"Bastão Longo Lendário","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Muito Distante","dano":"d6+9 mag","maos":"Duas mãos","carac":"Poderoso"},
  {"id":"primaria-t4-espada-de-luz-e-chama","nome":"Espada de Luz e Chama","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+11 mag","maos":"Duas mãos","carac":"Incandescente"},
  {"id":"primaria-t4-manoplas-de-sifao","nome":"Manoplas de Sifão","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d10+9 mag","maos":"Duas mãos","carac":"Roubo de Vida"},
  {"id":"primaria-t4-foice-de-midas","nome":"Foice de Midas","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Corpo a Corpo","dano":"d10+9 mag","maos":"Duas mãos","carac":"Ganancioso"},
  {"id":"primaria-t4-estilhacos-flutuantes","nome":"Estilhaços Flutuantes","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Instinto","alcance":"Próximo","dano":"d8+9 mag","maos":"Uma mão","carac":"Poderoso"},
  {"id":"primaria-t4-cajado-de-sangue","nome":"Cajado de sangue","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Instinto","alcance":"Distante","dano":"d20+7 mag","maos":"Duas mãos","carac":"Doloroso"},
  {"id":"primaria-t4-arco-de-cardo","nome":"Arco de cardo","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Instinto","alcance":"Distante","dano":"d6+13 mag","maos":"Duas mãos","carac":"Confiável"},
  {"id":"primaria-t4-varinha-de-essek","nome":"Varinha de Essek","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Distante","dano":"d8+13 mag","maos":"Uma mão","carac":"Dobra do Tempo"},
  {"id":"primaria-t4-revolver-magus","nome":"Revólver Magus","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Finesse","alcance":"Muito Distante","dano":"d6+13 mag","maos":"Uma mão","carac":"Recarga"},
  {"id":"primaria-t4-luvas-de-fusao","nome":"Luvas de Fusão","cat":"primaria","tier":4,"tabela":"Mágica","atributo":"Conhecimento","alcance":"Muito Distante","dano":"d6+9 mag","maos":"Duas mãos","carac":"Vinculado"},
  {"id":"secundaria-t1-espada-curta","nome":"Espada curta","cat":"secundaria","tier":1,"tabela":null,"atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8 phy","maos":"Uma mão","carac":"Emparelhado"},
  {"id":"secundaria-t1-escudo-redondo","nome":"Escudo redondo","cat":"secundaria","tier":1,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d4 phy","maos":"Uma mão","carac":"Proteção"},
  {"id":"secundaria-t1-escudo-da-torre","nome":"Escudo da torre","cat":"secundaria","tier":1,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d6 phy","maos":"Uma mão","carac":"Barreira"},
  {"id":"secundaria-t1-punhal-pequeno","nome":"Punhal pequeno","cat":"secundaria","tier":1,"tabela":null,"atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8 phy","maos":"Uma mão","carac":"Emparelhado"},
  {"id":"secundaria-t1-chicote","nome":"Chicote","cat":"secundaria","tier":1,"tabela":null,"atributo":"Presença","alcance":"Muito Próximo","dano":"d6 phy","maos":"Uma mão","carac":"Surpreendente"},
  {"id":"secundaria-t1-arpeu","nome":"Arpéu","cat":"secundaria","tier":1,"tabela":null,"atributo":"Finesse","alcance":"Próximo","dano":"d6 phy","maos":"Uma mão","carac":"Enganchado"},
  {"id":"secundaria-t1-besta-de-mao","nome":"Besta de mão","cat":"secundaria","tier":1,"tabela":null,"atributo":"Finesse","alcance":"Distante","dano":"d6+1 phy","maos":"Uma mão","carac":null},
  {"id":"secundaria-t2-espada-curta-aprimorada","nome":"Espada curta aprimorada","cat":"secundaria","tier":2,"tabela":null,"atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8+2 phy","maos":"Uma mão","carac":"Emparelhado"},
  {"id":"secundaria-t2-escudo-redondo-aprimorado","nome":"Escudo redondo aprimorado","cat":"secundaria","tier":2,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d4+2 phy","maos":"Uma mão","carac":"Proteção"},
  {"id":"secundaria-t2-escudo-de-torre-aprimorado","nome":"Escudo de torre aprimorado","cat":"secundaria","tier":2,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d6+2 phy","maos":"Uma mão","carac":"Barreira"},
  {"id":"secundaria-t2-adaga-pequena-aprimorada","nome":"Punhal pequeno aprimorado","cat":"secundaria","tier":2,"tabela":null,"atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+2 phy","maos":"Uma mão","carac":"Emparelhado"},
  {"id":"secundaria-t2-chicote-aprimorado","nome":"Chicote aprimorado","cat":"secundaria","tier":2,"tabela":null,"atributo":"Presença","alcance":"Muito Próximo","dano":"d6+2 phy","maos":"Uma mão","carac":"Surpreendente"},
  {"id":"secundaria-t2-arpeu-aprimorado","nome":"Arpéu Aprimorado","cat":"secundaria","tier":2,"tabela":null,"atributo":"Finesse","alcance":"Próximo","dano":"d6+2 phy","maos":"Uma mão","carac":"Enganchado"},
  {"id":"secundaria-t2-besta-de-mao-aprimorada","nome":"Besta de mão aprimorada","cat":"secundaria","tier":2,"tabela":null,"atributo":"Finesse","alcance":"Distante","dano":"d6+3 phy","maos":"Uma mão","carac":null},
  {"id":"secundaria-t2-escudo-com-pontas","nome":"Escudo com pontas","cat":"secundaria","tier":2,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d6+2 phy","maos":"Uma mão","carac":"Trabalho em dobro"},
  {"id":"secundaria-t2-adaga-de-protecao","nome":"Adaga de proteção","cat":"secundaria","tier":2,"tabela":null,"atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d6+2 phy","maos":"Uma mão","carac":"Aparar"},
  {"id":"secundaria-t2-machado-de-retorno","nome":"Machado de retorno","cat":"secundaria","tier":2,"tabela":null,"atributo":"Agilidade","alcance":"Próximo","dano":"d6+4 phy","maos":"Uma mão","carac":"Retorno"},
  {"id":"secundaria-t3-espada-curta-avancada","nome":"Espada curta avançada","cat":"secundaria","tier":3,"tabela":null,"atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8+4 phy","maos":"Uma mão","carac":"Emparelhado"},
  {"id":"secundaria-t3-escudo-redondo-avancado","nome":"Escudo redondo avançado","cat":"secundaria","tier":3,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d4+4 phy","maos":"Uma mão","carac":"Proteção"},
  {"id":"secundaria-t3-escudo-de-torre-avancado","nome":"Escudo de torre avançado","cat":"secundaria","tier":3,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d6+4 phy","maos":"Uma mão","carac":"Barreira"},
  {"id":"secundaria-t3-adaga-pequena-avancada","nome":"Adaga pequena avançada","cat":"secundaria","tier":3,"tabela":null,"atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+4 phy","maos":"Uma mão","carac":"Emparelhado"},
  {"id":"secundaria-t3-chicote-avancado","nome":"Chicote avançado","cat":"secundaria","tier":3,"tabela":null,"atributo":"Presença","alcance":"Muito Próximo","dano":"d6+4 phy","maos":"Uma mão","carac":"Surpreendente"},
  {"id":"secundaria-t3-arpeu-avancado","nome":"Arpéu Avançado","cat":"secundaria","tier":3,"tabela":null,"atributo":"Finesse","alcance":"Próximo","dano":"d6+4 phy","maos":"Uma mão","carac":"Enganchado"},
  {"id":"secundaria-t3-besta-de-mao-avancada","nome":"Besta de mão avançada","cat":"secundaria","tier":3,"tabela":null,"atributo":"Finesse","alcance":"Distante","dano":"d6+5 phy","maos":"Uma mão","carac":null},
  {"id":"secundaria-t3-fivela","nome":"Broquel","cat":"secundaria","tier":3,"tabela":null,"atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d4+4 phy","maos":"Uma mão","carac":"Desafetação"},
  {"id":"secundaria-t3-gauntlet-energizado","nome":"Manopla Energizada","cat":"secundaria","tier":3,"tabela":null,"atributo":"Conhecimento","alcance":"Próximo","dano":"d6+4 phy","maos":"Uma mão","carac":"Carregado"},
  {"id":"secundaria-t3-funda-de-mao","nome":"Funda de mão","cat":"secundaria","tier":3,"tabela":null,"atributo":"Finesse","alcance":"Muito Distante","dano":"d6+4 phy","maos":"Uma mão","carac":"Versátil"},
  {"id":"secundaria-t4-espada-curta-lendaria","nome":"Espada curta lendária","cat":"secundaria","tier":4,"tabela":null,"atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8+6 phy","maos":"Uma mão","carac":"Emparelhado"},
  {"id":"secundaria-t4-escudo-redondo-lendario","nome":"Escudo redondo lendário","cat":"secundaria","tier":4,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d4+6 phy","maos":"Uma mão","carac":"Proteção"},
  {"id":"secundaria-t4-escudo-de-torre-lendario","nome":"Escudo de torre lendário","cat":"secundaria","tier":4,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d6+6 phy","maos":"Uma mão","carac":"Barreira"},
  {"id":"secundaria-t4-adaga-pequena-lendaria","nome":"Adaga pequena lendária","cat":"secundaria","tier":4,"tabela":null,"atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+6 phy","maos":"Uma mão","carac":"Emparelhado"},
  {"id":"secundaria-t4-chicote-lendario","nome":"Chicote lendário","cat":"secundaria","tier":4,"tabela":null,"atributo":"Presença","alcance":"Muito Próximo","dano":"d6+6 phy","maos":"Uma mão","carac":"Surpreendente"},
  {"id":"secundaria-t4-arpeu-lendario","nome":"Arpéu Lendário","cat":"secundaria","tier":4,"tabela":null,"atributo":"Finesse","alcance":"Próximo","dano":"d6+6 phy","maos":"Uma mão","carac":"Enganchado"},
  {"id":"secundaria-t4-besta-de-mao-lendaria","nome":"Besta de mão lendária","cat":"secundaria","tier":4,"tabela":null,"atributo":"Finesse","alcance":"Distante","dano":"d6+7 phy","maos":"Uma mão","carac":null},
  {"id":"secundaria-t4-escudo-valente","nome":"Escudo Valente","cat":"secundaria","tier":4,"tabela":null,"atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d4+6 phy","maos":"Uma mão","carac":"Amparo"},
  {"id":"secundaria-t4-garras-de-punho","nome":"Garras de Punho","cat":"secundaria","tier":4,"tabela":null,"atributo":"Força","alcance":"Corpo a Corpo","dano":"d6+8 phy","maos":"Uma mão","carac":"Dobrado"},
  {"id":"secundaria-t4-fragmento-iniciador","nome":"Fragmento Iniciador","cat":"secundaria","tier":4,"tabela":null,"atributo":"Instinto","alcance":"Muito Próximo","dano":"d4 phy","maos":"Uma mão","carac":"Travado"},
];

/** Armaduras. */
const ARMADURAS = [
  {"id":"armadura-t1-armadura-gambeson","nome":"Armadura Gambeson","tier":1,"limiares":"5/11","pontuacao":3,"carac":"Flexível"},
  {"id":"armadura-t1-armadura-de-couro","nome":"Armadura de couro","tier":1,"limiares":"6/13","pontuacao":3,"carac":null},
  {"id":"armadura-t1-armadura-de-cota-de-malha","nome":"Armadura de cota de malha","tier":1,"limiares":"7/15","pontuacao":4,"carac":"Pesado"},
  {"id":"armadura-t1-armadura-de-placa-completa","nome":"Armadura de placa completa","tier":1,"limiares":"8/17","pontuacao":4,"carac":"Muito pesado"},
  {"id":"armadura-t2-armadura-de-gambeson-aprimorada","nome":"Armadura de Gambeson aprimorada","tier":2,"limiares":"7/16","pontuacao":4,"carac":"Flexível"},
  {"id":"armadura-t2-armadura-de-couro-aprimorada","nome":"Armadura de couro aprimorada","tier":2,"limiares":"9/20","pontuacao":4,"carac":null},
  {"id":"armadura-t2-armadura-de-cota-de-malha-aprimorada","nome":"Armadura de cota de malha aprimorada","tier":2,"limiares":"11/24","pontuacao":5,"carac":"Pesado"},
  {"id":"armadura-t2-armadura-de-placa-completa-aprimorada","nome":"Armadura de placa completa aprimorada","tier":2,"limiares":"13/28","pontuacao":5,"carac":"Muito pesado"},
  {"id":"armadura-t2-armadura-de-corrente-elundriana","nome":"Armadura de Corrente Elundriana","tier":2,"limiares":"9/21","pontuacao":4,"carac":"Resguardo"},
  {"id":"armadura-t2-armadura-harrowbone","nome":"Armadura Harrowbone","tier":2,"limiares":"9/21","pontuacao":4,"carac":"Resiliente"},
  {"id":"armadura-t2-armadura-de-peitoral-irontree","nome":"Armadura de peitoral Irontree","tier":2,"limiares":"9/20","pontuacao":4,"carac":"Reforçado"},
  {"id":"armadura-t2-armadura-flutuante-de-runetan","nome":"Armadura flutuante de Runetan","tier":2,"limiares":"9/20","pontuacao":4,"carac":"Deslocamento"},
  {"id":"armadura-t2-armadura-macia-tyris","nome":"Armadura macia Tyris","tier":2,"limiares":"8/18","pontuacao":5,"carac":"Silencioso"},
  {"id":"armadura-t2-armadura-rosewild","nome":"Armadura Rosewild","tier":2,"limiares":"11/23","pontuacao":5,"carac":"Esperançoso"},
  {"id":"armadura-t3-armadura-de-gambeson-avancada","nome":"Armadura de Gambeson Avançada","tier":3,"limiares":"9/23","pontuacao":5,"carac":"Flexível"},
  {"id":"armadura-t3-armadura-de-couro-avancada","nome":"Armadura de couro avançada","tier":3,"limiares":"11/27","pontuacao":5,"carac":null},
  {"id":"armadura-t3-armadura-de-cota-de-malha-avancada","nome":"Armadura de cota de malha avançada","tier":3,"limiares":"13/31","pontuacao":6,"carac":"Pesado"},
  {"id":"armadura-t3-armadura-avancada-de-placa-completa","nome":"Armadura avançada de placa completa","tier":3,"limiares":"15/35","pontuacao":6,"carac":"Muito pesado"},
  {"id":"armadura-t3-armadura-fina-bellamoi","nome":"Armadura Fina Bellamoi","tier":3,"limiares":"11/27","pontuacao":5,"carac":"Dourado"},
  {"id":"armadura-t3-armadura-de-escamas-de-dragao","nome":"Armadura de Escamas de Dragão","tier":3,"limiares":"11/27","pontuacao":5,"carac":"Impenetrável"},
  {"id":"armadura-t3-armadura-de-placas-com-espinhos","nome":"Armadura de Placas com Espinhos","tier":3,"limiares":"10/25","pontuacao":5,"carac":"Afiada"},
  {"id":"armadura-t3-armadura-bladefare","nome":"Armadura Bladefare","tier":3,"limiares":"16/39","pontuacao":6,"carac":"Físico"},
  {"id":"armadura-t3-manto-de-monett","nome":"Manto de Monett","tier":3,"limiares":"16/39","pontuacao":6,"carac":"Magia"},
  {"id":"armadura-t3-runas-de-fortificacao","nome":"Runas de Fortificação","tier":3,"limiares":"17/43","pontuacao":6,"carac":"Doloroso"},
  {"id":"armadura-t4-armadura-de-gambeson-lendaria","nome":"Armadura de Gambeson Lendária","tier":4,"limiares":"11/32","pontuacao":6,"carac":"Flexível"},
  {"id":"armadura-t4-armadura-de-couro-lendaria","nome":"Armadura de couro lendária","tier":4,"limiares":"13/36","pontuacao":6,"carac":null},
  {"id":"armadura-t4-armadura-de-cota-de-malha-lendaria","nome":"Armadura de cota de malha lendária","tier":4,"limiares":"15/40","pontuacao":7,"carac":"Pesado"},
  {"id":"armadura-t4-armadura-lendaria-de-placa-completa","nome":"Armadura lendária de placa completa","tier":4,"limiares":"17/44","pontuacao":7,"carac":"Muito pesado"},
  {"id":"armadura-t4-corrente-de-seda-dunamis","nome":"Corrente de seda Dunamis","tier":4,"limiares":"13/36","pontuacao":7,"carac":"Temporal"},
  {"id":"armadura-t4-armadura-de-canalizacao","nome":"Armadura de canalização","tier":4,"limiares":"13/36","pontuacao":5,"carac":"Canalização"},
  {"id":"armadura-t4-armadura-de-brasa","nome":"Armadura de Brasa","tier":4,"limiares":"13/36","pontuacao":6,"carac":"Queimadura"},
  {"id":"armadura-t4-armadura-fortificada-completa","nome":"Armadura Fortificada Completa","tier":4,"limiares":"15/40","pontuacao":4,"carac":"Fortificado"},
  {"id":"armadura-t4-armadura-de-opala-veritas","nome":"Armadura de Opala Veritas","tier":4,"limiares":"13/36","pontuacao":6,"carac":"Busca da verdade"},
  {"id":"armadura-t4-cota-de-malha-do-salvador","nome":"Cota de malha do salvador","tier":4,"limiares":"18/48","pontuacao":8,"carac":"Difícil"},
];

/** Nomes alternativos: o do livro (às vezes errado) e o original em inglês. */
const EQUIPAMENTO_ALIASES = {
  "primaria-t1-espada-larga": ["Espada Larga","Broadsword"],
  "primaria-t1-espada-longa": ["Espada longa","Longsword"],
  "primaria-t1-machado-de-batalha": ["Machado de batalha","Battleaxe"],
  "primaria-t1-espada-grande": ["Espada Grande","Greatsword","Espada Larga"],
  "primaria-t1-maca": ["Maça","Mace"],
  "primaria-t1-martelo-de-guerra": ["Martelo de guerra","Warhammer"],
  "primaria-t1-adaga": ["Adaga","Dagger"],
  "primaria-t1-bordao": ["Bordão","Quarterstaff","Bastão de quartel"],
  "primaria-t1-cutelo": ["Cutelo","Cutlass","Classe C"],
  "primaria-t1-florete": ["Florete","Rapier"],
  "primaria-t1-alabarda": ["Alabarda","Halberd"],
  "primaria-t1-lanca": ["Lança","Spear"],
  "primaria-t1-arco-curto": ["Arco curto","Shortbow"],
  "primaria-t1-besta": ["Besta","Crossbow"],
  "primaria-t1-arco-longo": ["Arco longo","Longbow"],
  "primaria-t2-espada-larga-aprimorada": ["Espada larga aprimorada","Improved Broadsword"],
  "primaria-t2-espada-longa-aprimorada": ["Espada longa aprimorada","Improved Longsword"],
  "primaria-t2-machado-de-batalha-aprimorado": ["Machado de batalha aprimorado","Improved Battleaxe"],
  "primaria-t2-espada-grande-aprimorada": ["Espada Grande Aprimorada","Improved Greatsword","Espada Larga Aprimorada"],
  "primaria-t2-maca-aprimorada": ["Maça Aprimorada","Improved Mace","Mace aprimorado"],
  "primaria-t2-warhammer-aprimorado": ["Martelo de guerra aprimorado","Improved Warhammer","Warhammer aprimorado"],
  "primaria-t2-adaga-aprimorada": ["Adaga aprimorada","Improved Dagger"],
  "primaria-t2-bordao-aprimorado": ["Bordão Aprimorado","Improved Quarterstaff","Bastão de quartel aprimorado"],
  "primaria-t2-cutelo-aprimorado": ["Cutelo Aprimorado","Improved Cutlass","Cutlass aprimorado"],
  "primaria-t2-florete-aprimorado": ["Florete Aprimorado","Improved Rapier","Rapier aprimorado"],
  "primaria-t2-alabarda-aprimorada": ["Alabarda aprimorada","Improved Halberd"],
  "primaria-t2-lanca-aprimorada": ["Lança aprimorada","Improved Spear"],
  "primaria-t2-arco-curto-aprimorado": ["Arco curto aprimorado","Improved Shortbow"],
  "primaria-t2-besta-aprimorada": ["Besta aprimorada","Improved Crossbow"],
  "primaria-t2-arco-longo-aprimorado": ["Arco longo aprimorado","Improved Longbow"],
  "primaria-t2-bracamarte-dourado": ["Bracamarte Dourado","Gilded Falchion","Falchion dourado"],
  "primaria-t2-laminas-de-punho": ["Lâminas de Punho","Knuckle Blades","Lâminas de articulação"],
  "primaria-t2-espada-larga-de-urok": ["Espada larga de Urok","Urok Broadsword"],
  "primaria-t2-chicote-com-laminas": ["Chicote com lâminas","Bladed Whip"],
  "primaria-t2-alabarda-forjada-em-aco": ["Alabarda forjada em aço","Steelforged Halberd"],
  "primaria-t2-foice-de-guerra": ["Foice de Guerra","War Scythe"],
  "primaria-t2-cassetete": ["Trabuco","Blunderbuss","Cassetete"],
  "primaria-t2-grande-arco": ["Grande arco","Greatbow"],
  "primaria-t2-arco-de-pelo-fino": ["Arco de pelo fino","Finehair Bow"],
  "primaria-t3-espada-larga-avancada": ["Espada larga avançada","Advanced Broadsword"],
  "primaria-t3-espada-longa-avancada": ["Espada longa avançada","Advanced Longsword"],
  "primaria-t3-machado-de-batalha-avancado": ["Machado de batalha avançado","Advanced Battleaxe"],
  "primaria-t3-espada-grande-avancada": ["Espada Grande Avançada","Advanced Greatsword","Espada Larga Avançada"],
  "primaria-t3-maca-avancada": ["Maça Avançada","Advanced Mace","Mace avançado"],
  "primaria-t3-warhammer-avancado": ["Warhammer avançado","Advanced Warhammer"],
  "primaria-t3-adaga-avancada": ["Adaga avançada","Advanced Dagger"],
  "primaria-t3-bordao-avancado": ["Bordão Avançado","Advanced Quarterstaff","Bastão avançado"],
  "primaria-t3-cutelo-avancado": ["Cutelo Avançado","Advanced Cutlass","Cutlass avançado"],
  "primaria-t3-florete-avancado": ["Florete Avançado","Advanced Rapier","Rapier avançado"],
  "primaria-t3-alabarda-avancada": ["Alabarda avançada","Advanced Halberd"],
  "primaria-t3-lanca-avancada": ["Lança avançada","Advanced Spear"],
  "primaria-t3-arco-curto-avancado": ["Arco curto avançado","Advanced Shortbow"],
  "primaria-t3-besta-avancada": ["Besta avançada","Advanced Crossbow"],
  "primaria-t3-arco-longo-avancado": ["Arco longo avançado","Advanced Longbow"],
  "primaria-t3-lamina-vagalume": ["Lâmina Vagalume","Flickerfly Blade","(nome fundido/ilegível - texto da célula mistura 'Lâmina'/'Blakesword'; característica associada é 'Bravura: +1 Evasão, +3 dano Severo')"],
  "primaria-t3-espada-valente": ["Espada Valente","Bravesword","(nome fundido/ilegível - texto da célula mistura 'Lâmina'/'Blakesword'; característica associada é 'Sharpwing (Asa afiada): ganhe bônus... igual à sua Agilidade')"],
  "primaria-t3-martelo-da-ira": ["Martelo da Ira","Hammer of Wrath"],
  "primaria-t3-machado-de-labrys": ["Machado de Labrys","Labrys Axe"],
  "primaria-t3-meridiano-cutelo": ["Cutelo Meridiano","Meridian Cutlass","Meridiano Cutelo"],
  "primaria-t3-sabre-retratil": ["Sabre Retrátil","Retractable Saber","(nome oculto/ilegível - linha sobreposta abaixo de 'Meridiano Cutelo', texto residual 'evitar à detecção')"],
  "primaria-t3-mangual-duplo": ["Mangual duplo","Double Flail"],
  "primaria-t3-laminas-de-garra": ["Lâminas de Garra","Talon Blades","Lâminas Talon"],
  "primaria-t3-revolver-de-polvora-negra": ["Revólver de Pólvora Negra","Black Powder Revolver","(Grovoba)(Blade) Powder (nome fundido, colunas sobrepostas)"],
  "primaria-t3-arco-com-espigoes": ["Arco com Espigões","Spiked Bow","(nome oculto/fundido com a linha anterior, ilegível; imagem legenda 'ARCO COM ESPIGÕES')"],
  "primaria-t4-espada-larga-lendaria": ["Espada larga lendária","Legendary Broadsword"],
  "primaria-t4-espada-longa-lendaria": ["Espada longa lendária","Legendary Longsword"],
  "primaria-t4-machado-de-batalha-lendario": ["Machado de batalha lendário","Legendary Battleaxe"],
  "primaria-t4-espada-grande-lendaria": ["Espada Grande Lendária","Legendary Greatsword","Greatsword lendário"],
  "primaria-t4-maca-lendaria": ["Maça Lendária","Legendary Mace","Maça lendária"],
  "primaria-t4-martelo-de-guerra-lendario": ["Martelo de guerra lendário","Legendary Warhammer"],
  "primaria-t4-adaga-lendaria": ["Adaga Lendária","Legendary Dagger"],
  "primaria-t4-bordao-lendario": ["Bordão Lendário","Legendary Quarterstaff","Lendária Quarterstaff"],
  "primaria-t4-cutelo-lendario": ["Cutelo Lendário","Legendary Cutlass"],
  "primaria-t4-florete-lendario": ["Florete Lendário","Legendary Rapier","Rapier lendário"],
  "primaria-t4-alabarda-lendaria": ["Alabarda lendária","Legendary Halberd"],
  "primaria-t4-lanca-lendaria": ["Lança lendária","Legendary Spear"],
  "primaria-t4-arco-curto-lendario": ["Arco curto lendário","Legendary Shortbow"],
  "primaria-t4-besta-lendaria": ["Besta lendária","Legendary Crossbow"],
  "primaria-t4-arco-longo-lendario": ["Arco longo lendário","Legendary Longbow"],
  "primaria-t4-espada-de-duas-pontas": ["Espada de duas pontas","Dual-Ended Sword"],
  "primaria-t4-manopla-de-impacto": ["Manopla de impacto","Impact Gauntlet"],
  "primaria-t4-machado-de-marreta": ["Machado de marreta","Sledge Axe"],
  "primaria-t4-punhal-curvo": ["Punhal Curvo","Curved Dagger"],
  "primaria-t4-arma-de-mao-estendida": ["Arma de Haste Estendida","Extended Polearm","Arma de mão estendida"],
  "primaria-t4-lamina-de-corda-oscilante": ["Lâmina de corda oscilante","Swinging Ropeblade"],
  "primaria-t4-machados-ricochete": ["Machados Ricochete","Ricochet Axes"],
  "primaria-t4-arco-aantari": ["Arco Aantari","Aantari Bow"],
  "primaria-t4-canhao-de-mao": ["Canhão de mão","Hand Cannon"],
  "primaria-t1-manoplas-arcanas": ["Manoplas Arcanas","Arcane Gauntlets"],
  "primaria-t1-machado-sagrado": ["Machado sagrado","Hallowed Axe","Machado consagrado"],
  "primaria-t1-aneis-brilhantes": ["Anéis brilhantes","Glowing Rings"],
  "primaria-t1-runas-de-mao": ["Runas de mão","Hand Runes"],
  "primaria-t1-lamina-de-retorno": ["Lâmina de retorno","Returning Blade"],
  "primaria-t1-bastao-curto": ["Bastão Curto","Shortstaff","Pessoal de baixa estatura","Cajado curto"],
  "primaria-t1-bastao-duplo": ["Bastão Duplo","Dualstaff"],
  "primaria-t1-cetro": ["Cetro","Scepter"],
  "primaria-t1-varinha-magica": ["Varinha mágica","Wand"],
  "primaria-t1-bastao-longo": ["Bastão Longo","Greatstaff","Cajado grande","Grande Cajado"],
  "primaria-t2-manoplas-arcanas-aprimoradas": ["Manoplas Arcanas Aprimoradas","Improved Arcane Gauntlets"],
  "primaria-t2-machado-sagrado-aprimorado": ["Machado sagrado aprimorado","Improved Hallowed Axe"],
  "primaria-t2-aneis-brilhantes-aprimorados": ["Anéis brilhantes aprimorados","Improved Glowing Rings"],
  "primaria-t2-runas-de-mao-aprimoradas": ["Runas de mão aprimoradas","Improved Hand Runes"],
  "primaria-t2-lamina-de-retorno-aprimorada": ["Lâmina de retorno aprimorada","Improved Returning Blade"],
  "primaria-t2-bastao-curto-aprimorado": ["Bastão Curto Aprimorado","Improved Shortstaff","Equipe reduzida aprimorada"],
  "primaria-t2-bastao-duplo-aprimorado": ["Bastão Duplo Aprimorado","Improved Dualstaff","Dualstaff aprimorado"],
  "primaria-t2-cetro-aprimorado": ["Cetro aprimorado","Improved Scepter"],
  "primaria-t2-varinha-aprimorada": ["Varinha aprimorada","Improved Wand"],
  "primaria-t2-bastao-longo-aprimorado": ["Bastão Longo Aprimorado","Improved Greatstaff","Greatstaff aprimorado"],
  "primaria-t2-lamina-ego": ["Lâmina Ego","Ego Blade"],
  "primaria-t2-espada-de-fundicao": ["Espada de Conjuração","Casting Sword","Espada de fundição"],
  "primaria-t2-adaga-devoradora": ["Adaga Devoradora","Devouring Dagger"],
  "primaria-t2-martelo-de-exota": ["Martelo de Exota","Hammer of Exota"],
  "primaria-t2-arco-de-sangue-yutari": ["Arco de Sangue Yutari","Yutari Bloodbow"],
  "primaria-t2-arco-de-anciao": ["Arco de Ancião","Elder Bow"],
  "primaria-t2-cetro-de-elias": ["Cetro de Elias","Scepter of Elias"],
  "primaria-t2-varinha-de-entusiasmo": ["Varinha do Fascínio","Wand of Enthrallment","Varinha de Entusiasmo"],
  "primaria-t2-bastao-do-guardiao": ["Bastão do Guardião","Keeper's Staff","Equipe do Guardião"],
  "primaria-t3-manoplas-arcanas-avancadas": ["Manoplas Arcanas Avançadas","Advanced Arcane Gauntlets"],
  "primaria-t3-machado-sagrado-avancado": ["Machado sagrado avançado","Advanced Hallowed Axe"],
  "primaria-t3-aneis-brilhantes-avancados": ["Anéis brilhantes avançados","Advanced Glowing Rings"],
  "primaria-t3-runas-manuais-avancadas": ["Runas manuais avançadas","Advanced Hand Runes"],
  "primaria-t3-lamina-de-retorno-avancada": ["Lâmina de retorno avançada","Advanced Returning Blade"],
  "primaria-t3-bastao-curto-avancado": ["Bastão Curto Avançado","Advanced Shortstaff","Equipe avançada de curta"],
  "primaria-t3-bastao-duplo-avancado": ["Bastão Duplo Avançado","Advanced Dualstaff","Duelisfaff avançado"],
  "primaria-t3-avancado-nome-cortado-incompleto": ["Avançado (nome cortado/incompleto)","Advanced Scepter"],
  "primaria-t3-avancado-cetro": ["Avançado cetro","Advanced Wand"],
  "primaria-t3-bastao-longo-avancado": ["Bastão Longo Avançado","Advanced Greatstaff","Avançado (nome cortado/incompleto)"],
  "primaria-t3-machado-de-fortunis": ["Machado de Fortunis","Axe of Fortunis","de Fortunis (nome incompleto, legenda da imagem diz 'MACHADO DE FORTUNIS')"],
  "primaria-t3-punhal-abencoado": ["Punhal Abençoado","Blessed Anlace"],
  "primaria-t3-lamina-fantasma": ["Lâmina Fantasma","Ghostblade"],
  "primaria-t3-runas-da-ruina": ["Runas da Ruína","Runes of Ruination"],
  "primaria-t3-pingente-widogast": ["Pingente Widogast","Widogast Pendant"],
  "primaria-t3-arco-dourado": ["Arco dourado","Gilded Bow"],
  "primaria-t3-bastao-de-fogo": ["Bastão de Fogo","Firestaff","Pessoal de combate"],
  "primaria-t3-orbe-do-mago": ["Orbe do Mago","Mage Orb"],
  "primaria-t3-rifle-de-ilmari": ["Rifle de Ilmari","Ilmari's Rifle"],
  "primaria-t4-manoplas-arcanas-lendarias": ["Manoplas Arcanas Lendárias","Legendary Arcane Gauntlets"],
  "primaria-t4-machado-lendario-consagrado": ["Machado lendário consagrado","Legendary Hallowed Axe"],
  "primaria-t4-aneis-lendarios-que-brilham": ["Anéis lendários que brilham","Legendary Glowing Rings"],
  "primaria-t4-runas-de-mao-lendarias": ["Runas de mão lendárias","Legendary Hand Runes"],
  "primaria-t4-lamina-lendaria-que-retorna": ["Lâmina lendária que retorna","Legendary Returning Blade"],
  "primaria-t4-bastao-curto-lendario": ["Bastão Curto Lendário","Legendary Shortstaff","Shortstaff lendário"],
  "primaria-t4-bastao-duplo-lendario": ["Bastão Duplo Lendário","Legendary Dualstaff","Lendário Dualstaff"],
  "primaria-t4-cetro-lendario": ["Cetro lendário","Legendary Scepter"],
  "primaria-t4-varinha-lendaria": ["Varinha Lendária","Legendary Wand"],
  "primaria-t4-bastao-longo-lendario": ["Bastão Longo Lendário","Legendary Greatstaff","Greatstaff lendário"],
  "primaria-t4-espada-de-luz-e-chama": ["Espada de Luz e Chama","Sword of Light and Flame"],
  "primaria-t4-manoplas-de-sifao": ["Manoplas de Sifão","Siphoning Gauntlets"],
  "primaria-t4-foice-de-midas": ["Foice de Midas","Midas Scythe"],
  "primaria-t4-estilhacos-flutuantes": ["Estilhaços Flutuantes","Floating Bladeshards","Bladeshards flutuantes"],
  "primaria-t4-cajado-de-sangue": ["Cajado de sangue","Bloodstaff"],
  "primaria-t4-arco-de-cardo": ["Arco de cardo","Thistlebow"],
  "primaria-t4-varinha-de-essek": ["Varinha de Essek","Wand of Essek"],
  "primaria-t4-revolver-magus": ["Revólver Magus","Magus Revolver"],
  "primaria-t4-luvas-de-fusao": ["Luvas de Fusão","Fusion Gloves","Luvas Fusion"],
  "secundaria-t1-espada-curta": ["Espada curta","Shortsword"],
  "secundaria-t1-escudo-redondo": ["Escudo redondo","Round Shield"],
  "secundaria-t1-escudo-da-torre": ["Escudo da torre","Tower Shield"],
  "secundaria-t1-punhal-pequeno": ["Punhal pequeno","Small Dagger","Adaga Pequena","Adaga pequena"],
  "secundaria-t1-chicote": ["Chicote","Whip"],
  "secundaria-t1-arpeu": ["Arpéu","Grappler","Garrafa"],
  "secundaria-t1-besta-de-mao": ["Besta de mão","Hand Crossbow"],
  "secundaria-t2-espada-curta-aprimorada": ["Espada curta aprimorada","Improved Shortsword"],
  "secundaria-t2-escudo-redondo-aprimorado": ["Escudo redondo aprimorado","Improved Round Shield"],
  "secundaria-t2-escudo-de-torre-aprimorado": ["Escudo de torre aprimorado","Improved Tower Shield"],
  "secundaria-t2-adaga-pequena-aprimorada": ["Punhal pequeno aprimorado","Improved Small Dagger","Adaga pequena aprimorada"],
  "secundaria-t2-chicote-aprimorado": ["Chicote aprimorado","Improved Whip"],
  "secundaria-t2-arpeu-aprimorado": ["Arpéu Aprimorado","Improved Grappler","Grappler aprimorado"],
  "secundaria-t2-besta-de-mao-aprimorada": ["Besta de mão aprimorada","Improved Hand Crossbow"],
  "secundaria-t2-escudo-com-pontas": ["Escudo com pontas","Spiked Shield"],
  "secundaria-t2-adaga-de-protecao": ["Adaga de proteção","Parrying Dagger"],
  "secundaria-t2-machado-de-retorno": ["Machado de retorno","Returning Axe"],
  "secundaria-t3-espada-curta-avancada": ["Espada curta avançada","Advanced Shortsword"],
  "secundaria-t3-escudo-redondo-avancado": ["Escudo redondo avançado","Advanced Round Shield"],
  "secundaria-t3-escudo-de-torre-avancado": ["Escudo de torre avançado","Advanced Tower Shield"],
  "secundaria-t3-adaga-pequena-avancada": ["Adaga pequena avançada","Advanced Small Dagger"],
  "secundaria-t3-chicote-avancado": ["Chicote avançado","Advanced Whip"],
  "secundaria-t3-arpeu-avancado": ["Arpéu Avançado","Advanced Grappler","Grappler avançado"],
  "secundaria-t3-besta-de-mao-avancada": ["Besta de mão avançada","Advanced Hand Crossbow"],
  "secundaria-t3-fivela": ["Broquel","Buckler","Fivela"],
  "secundaria-t3-gauntlet-energizado": ["Manopla Energizada","Powered Gauntlet","Gauntlet energizado"],
  "secundaria-t3-funda-de-mao": ["Funda de mão","Hand Sling"],
  "secundaria-t4-espada-curta-lendaria": ["Espada curta lendária","Legendary Shortsword"],
  "secundaria-t4-escudo-redondo-lendario": ["Escudo redondo lendário","Legendary Round Shield"],
  "secundaria-t4-escudo-de-torre-lendario": ["Escudo de torre lendário","Legendary Tower Shield"],
  "secundaria-t4-adaga-pequena-lendaria": ["Adaga pequena lendária","Legendary Small Dagger"],
  "secundaria-t4-chicote-lendario": ["Chicote lendário","Legendary Whip"],
  "secundaria-t4-arpeu-lendario": ["Arpéu Lendário","Legendary Grappler","Lutador lendário"],
  "secundaria-t4-besta-de-mao-lendaria": ["Besta de mão lendária","Legendary Hand Crossbow"],
  "secundaria-t4-escudo-valente": ["Escudo Valente","Braveshield","Escudo Braveshield"],
  "secundaria-t4-garras-de-punho": ["Garras de Punho","Knuckle Claws","Garras de articulação"],
  "secundaria-t4-fragmento-iniciador": ["Fragmento Iniciador","Primer Shard","Fragmento de primer"],
  "armadura-t1-armadura-gambeson": ["Armadura Gambeson","Gambeson Armor"],
  "armadura-t1-armadura-de-couro": ["Armadura de couro","Leather Armor"],
  "armadura-t1-armadura-de-cota-de-malha": ["Armadura de cota de malha","Chainmail Armor"],
  "armadura-t1-armadura-de-placa-completa": ["Armadura de placa completa","Full Plate Armor"],
  "armadura-t2-armadura-de-gambeson-aprimorada": ["Armadura de Gambeson aprimorada","Improved Gambeson Armor"],
  "armadura-t2-armadura-de-couro-aprimorada": ["Armadura de couro aprimorada","Improved Leather Armor"],
  "armadura-t2-armadura-de-cota-de-malha-aprimorada": ["Armadura de cota de malha aprimorada","Improved Chainmail Armor"],
  "armadura-t2-armadura-de-placa-completa-aprimorada": ["Armadura de placa completa aprimorada","Improved Full Plate Armor"],
  "armadura-t2-armadura-de-corrente-elundriana": ["Armadura de Corrente Elundriana","Elundrian Chain Armor"],
  "armadura-t2-armadura-harrowbone": ["Armadura Harrowbone","Harrowbone Armor"],
  "armadura-t2-armadura-de-peitoral-irontree": ["Armadura de peitoral Irontree","Irontree Breastplate Armor"],
  "armadura-t2-armadura-flutuante-de-runetan": ["Armadura flutuante de Runetan","Runetan Floating Armor"],
  "armadura-t2-armadura-macia-tyris": ["Armadura macia Tyris","Tyris Soft Armor"],
  "armadura-t2-armadura-rosewild": ["Armadura Rosewild","Rosewild Armor"],
  "armadura-t3-armadura-de-gambeson-avancada": ["Armadura de Gambeson Avançada","Advanced Gambeson Armor"],
  "armadura-t3-armadura-de-couro-avancada": ["Armadura de couro avançada","Advanced Leather Armor"],
  "armadura-t3-armadura-de-cota-de-malha-avancada": ["Armadura de cota de malha avançada","Advanced Chainmail Armor"],
  "armadura-t3-armadura-avancada-de-placa-completa": ["Armadura avançada de placa completa","Advanced Full Plate Armor"],
  "armadura-t3-armadura-fina-bellamoi": ["Armadura Fina Bellamoi","Bellamoi Fine Armor"],
  "armadura-t3-armadura-de-escamas-de-dragao": ["Armadura de Escamas de Dragão","Dragonscale Armor","(Escama de dragão) (Armadura)"],
  "armadura-t3-armadura-de-placas-com-espinhos": ["Armadura de Placas com Espinhos","Spiked Plate Armor","(Spiked) (Plate) (Armadura)"],
  "armadura-t3-armadura-bladefare": ["Armadura Bladefare","Bladefare Armor"],
  "armadura-t3-manto-de-monett": ["Manto de Monett","Monett's Cloak"],
  "armadura-t3-runas-de-fortificacao": ["Runas de Fortificação","Runes of Fortification"],
  "armadura-t4-armadura-de-gambeson-lendaria": ["Armadura de Gambeson Lendária","Legendary Gambeson Armor"],
  "armadura-t4-armadura-de-couro-lendaria": ["Armadura de couro lendária","Legendary Leather Armor"],
  "armadura-t4-armadura-de-cota-de-malha-lendaria": ["Armadura de cota de malha lendária","Legendary Chainmail Armor"],
  "armadura-t4-armadura-lendaria-de-placa-completa": ["Armadura lendária de placa completa","Legendary Full Plate Armor"],
  "armadura-t4-corrente-de-seda-dunamis": ["Corrente de seda Dunamis","Dunamis Silkchain"],
  "armadura-t4-armadura-de-canalizacao": ["Armadura de canalização","Channeling Armor"],
  "armadura-t4-armadura-de-brasa": ["Armadura de Brasa","Emberwoven Armor","Armadura Emberwoven"],
  "armadura-t4-armadura-fortificada-completa": ["Armadura Fortificada Completa","Full Fortified Armor"],
  "armadura-t4-armadura-de-opala-veritas": ["Armadura de Opala Veritas","Veritas Opal Armor","(Veritas) (Opal) (Armor)"],
  "armadura-t4-cota-de-malha-do-salvador": ["Cota de malha do salvador","Savior Chainmail"],
};

/** Itens de saque e consumíveis. `nomes` guarda os sinônimos para a busca. */
const ITENS = [
  {"id":"loot-01","nome":"Saco de Dormir Premium","tipo":"saque","nomes":["Saco de Dormir Premium","Premium Bedroll","Pano de cama premium"]},
  {"id":"loot-02","nome":"Apito Piper","tipo":"saque","nomes":["Apito Piper","Piper Whistle"]},
  {"id":"loot-03","nome":"Aljava de carga","tipo":"saque","nomes":["Aljava de carga","Charging Quiver"]},
  {"id":"loot-04","nome":"Tocha de Alistair","tipo":"saque","nomes":["Tocha de Alistair","Alistair's Torch"]},
  {"id":"loot-05","nome":"Orbes falantes","tipo":"saque","nomes":["Orbes falantes","Speaking Orbs"]},
  {"id":"loot-06","nome":"Algemas","tipo":"saque","nomes":["Algemas","Manacles","Manáculas"]},
  {"id":"loot-07","nome":"Manto Arcano","tipo":"saque","nomes":["Manto Arcano","Arcane Cloak"]},
  {"id":"loot-08","nome":"Rede tecida","tipo":"saque","nomes":["Rede tecida","Woven Net"]},
  {"id":"loot-09","nome":"Jarra de fogo","tipo":"saque","nomes":["Jarra de fogo","Fire Jar"]},
  {"id":"loot-10","nome":"Haste suspensa","tipo":"saque","nomes":["Haste suspensa","Suspended Rod"]},
  {"id":"loot-11","nome":"Pedra Glamour","tipo":"saque","nomes":["Pedra Glamour","Glamour Stone"]},
  {"id":"loot-12","nome":"Baú vazio","tipo":"saque","nomes":["Baú vazio","Empty Chest"]},
  {"id":"loot-13","nome":"Estojo do Companheiro","tipo":"saque","nomes":["Estojo do Companheiro","Companion Case","Estojo complementar"]},
  {"id":"loot-14","nome":"Flechas Perfurantes","tipo":"saque","nomes":["Flechas Perfurantes","Piercing Arrows","(Perfurante) (Flechas)"]},
  {"id":"loot-15","nome":"Valorstone","tipo":"saque","nomes":["Valorstone"]},
  {"id":"loot-16","nome":"Chave-Mestra","tipo":"saque","nomes":["Chave-Mestra","Skeleton Key","Skeleton Key (chave de esqueleto)"]},
  {"id":"loot-17","nome":"Prisma Arcano","tipo":"saque","nomes":["Prisma Arcano","Arcane Prism"]},
  {"id":"loot-18","nome":"Receita de Poção de Estamina Menor","tipo":"saque","nomes":["Receita de Poção de Estamina Menor","Minor Stamina Potion Recipe"]},
  {"id":"loot-19","nome":"Receita de Poção de Saúde Menor","tipo":"saque","nomes":["Receita de Poção de Saúde Menor","Minor Health Potion Recipe"]},
  {"id":"loot-20","nome":"Bússolas de orientação","tipo":"saque","nomes":["Bússolas de orientação","Homing Compasses"]},
  {"id":"loot-21","nome":"Espírito Corretor","tipo":"saque","nomes":["Espírito Corretor","Corrector Sprite"]},
  {"id":"loot-22","nome":"Luvas Gecko","tipo":"saque","nomes":["Luvas Gecko","Gecko Gloves"]},
  {"id":"loot-23","nome":"Guardião do Saber","tipo":"saque","nomes":["Guardião do Saber","Lorekeeper"]},
  {"id":"loot-24","nome":"Frasco de Darksmoke Receita","tipo":"saque","nomes":["Frasco de Darksmoke Receita","Vial of Darksmoke Recipe"]},
  {"id":"loot-25","nome":"Pedra de sangue","tipo":"saque","nomes":["Pedra de sangue","Bloodstone"]},
  {"id":"loot-26","nome":"Pedra Maior","tipo":"saque","nomes":["Pedra Maior","Greatstone"]},
  {"id":"loot-27","nome":"Planador","tipo":"saque","nomes":["Planador","Glider"]},
  {"id":"loot-28","nome":"Anel do Silêncio","tipo":"saque","nomes":["Anel do Silêncio","Ring of Silence"]},
  {"id":"loot-29","nome":"Pingente Calmante","tipo":"saque","nomes":["Pingente Calmante","Calming Pendant","Calmante Pingente"]},
  {"id":"loot-30","nome":"Frasco duplo","tipo":"saque","nomes":["Frasco duplo","Dual Flask"]},
  {"id":"loot-31","nome":"Saco de Ficklesand","tipo":"saque","nomes":["Saco de Ficklesand","Bag of Ficklesand"]},
  {"id":"loot-32","nome":"Anel de Resistência","tipo":"saque","nomes":["Anel de Resistência","Ring of Resistance"]},
  {"id":"loot-33","nome":"Pena de Fênix","tipo":"saque","nomes":["Pena de Fênix","Phoenix Feather"]},
  {"id":"loot-34","nome":"Caixa de muitos produtos","tipo":"saque","nomes":["Caixa de muitos produtos","Box of Many Goods"]},
  {"id":"loot-35","nome":"Charme da lâmina de ar","tipo":"saque","nomes":["Charme da lâmina de ar","Airblade Charm"]},
  {"id":"loot-36","nome":"Portal Seed","tipo":"saque","nomes":["Portal Seed"]},
  {"id":"loot-37","nome":"Corrente do Paragon","tipo":"saque","nomes":["Corrente do Paragon","Paragon's Chain"]},
  {"id":"loot-38","nome":"Amuleto Elusivo","tipo":"saque","nomes":["Amuleto Elusivo","Elusive Amulet"]},
  {"id":"loot-39","nome":"Medalhão Hopekeeper","tipo":"saque","nomes":["Medalhão Hopekeeper","Hopekeeper Locket"]},
  {"id":"loot-40","nome":"Bolsa infinita","tipo":"saque","nomes":["Bolsa infinita","Infinite Bag"]},
  {"id":"loot-41","nome":"Relíquia da Passada","tipo":"saque","nomes":["Relíquia da Passada","Stride Relic","Stride Relic (Relíquia da passada)"]},
  {"id":"loot-42","nome":"Relíquia de reforço","tipo":"saque","nomes":["Relíquia de reforço","Bolster Relic"]},
  {"id":"loot-43","nome":"Relíquia de controle","tipo":"saque","nomes":["Relíquia de controle","Control Relic"]},
  {"id":"loot-44","nome":"Relíquia de sintonia","tipo":"saque","nomes":["Relíquia de sintonia","Attune Relic"]},
  {"id":"loot-45","nome":"Relíquia de Encantamento","tipo":"saque","nomes":["Relíquia de Encantamento","Charm Relic"]},
  {"id":"loot-46","nome":"Relíquia da Iluminação","tipo":"saque","nomes":["Relíquia da Iluminação","Enlighten Relic","Iluminar Relíquia"]},
  {"id":"loot-47","nome":"Relíquia de afiação","tipo":"saque","nomes":["Relíquia de afiação","Honing Relic"]},
  {"id":"loot-48","nome":"Pingente Flickerfly","tipo":"saque","nomes":["Pingente Flickerfly","Flickerfly Pendant"]},
  {"id":"loot-49","nome":"Botas Lakestrider","tipo":"saque","nomes":["Botas Lakestrider","Lakestrider Boots"]},
  {"id":"loot-50","nome":"Companheiro de barro","tipo":"saque","nomes":["Companheiro de barro","Clay Companion"]},
  {"id":"loot-51","nome":"Receita de Mythic Dust","tipo":"saque","nomes":["Receita de Mythic Dust","Mythic Dust Recipe"]},
  {"id":"loot-52","nome":"Fragmento de memória","tipo":"saque","nomes":["Fragmento de memória","Shard of Memory"]},
  {"id":"loot-53","nome":"Gema da Alacridade","tipo":"saque","nomes":["Gema da Alacridade","Gem of Alacrity"]},
  {"id":"loot-54","nome":"Gema do Poder","tipo":"saque","nomes":["Gema do Poder","Gem of Might"]},
  {"id":"loot-55","nome":"Gema de precisão","tipo":"saque","nomes":["Gema de precisão","Gem of Precision"]},
  {"id":"loot-56","nome":"Gema da percepção","tipo":"saque","nomes":["Gema da percepção","Gem of Insight"]},
  {"id":"loot-57","nome":"Gema da Audácia","tipo":"saque","nomes":["Gema da Audácia","Gem of Audacity"]},
  {"id":"loot-58","nome":"Gema da Sagacidade","tipo":"saque","nomes":["Gema da Sagacidade","Gem of Sagacity"]},
  {"id":"loot-59","nome":"Anel de determinação inquebrável","tipo":"saque","nomes":["Anel de determinação inquebrável","Ring of Unbreakable Resolve"]},
  {"id":"loot-60","nome":"Cinturão da unidade","tipo":"saque","nomes":["Cinturão da unidade","Belt of Unity"]},
  {"id":"consumivel-01","nome":"Poção da passada","tipo":"consumivel","nomes":["Poção da passada","Stride Potion"]},
  {"id":"consumivel-02","nome":"Poção de reforço","tipo":"consumivel","nomes":["Poção de reforço","Bolster Potion"]},
  {"id":"consumivel-03","nome":"Poção de controle","tipo":"consumivel","nomes":["Poção de controle","Control Potion"]},
  {"id":"consumivel-04","nome":"Poção de sintonização","tipo":"consumivel","nomes":["Poção de sintonização","Attune Potion"]},
  {"id":"consumivel-05","nome":"Poção de Encantamento","tipo":"consumivel","nomes":["Poção de Encantamento","Charm Potion"]},
  {"id":"consumivel-06","nome":"Poção de Iluminação","tipo":"consumivel","nomes":["Poção de Iluminação","Enlighten Potion"]},
  {"id":"consumivel-07","nome":"Poção de saúde menor","tipo":"consumivel","nomes":["Poção de saúde menor","Minor Health Potion"]},
  {"id":"consumivel-08","nome":"Poção de resistência menor","tipo":"consumivel","nomes":["Poção de resistência menor","Minor Stamina Potion"]},
  {"id":"consumivel-09","nome":"Veneno de Grindletooth","tipo":"consumivel","nomes":["Veneno de Grindletooth","Grindletooth Venom","Veneno de dente-de-leão"]},
  {"id":"consumivel-10","nome":"Folhas de Varik","tipo":"consumivel","nomes":["Folhas de Varik","Varik Leaves"]},
  {"id":"consumivel-11","nome":"Frasco de Moondrip","tipo":"consumivel","nomes":["Frasco de Moondrip","Vial of Moondrip"]},
  {"id":"consumivel-12","nome":"Fragmento Arcano Instável","tipo":"consumivel","nomes":["Fragmento Arcano Instável","Unstable Arcane Shard"]},
  {"id":"consumivel-13","nome":"Poção da estabilidade","tipo":"consumivel","nomes":["Poção da estabilidade","Potion of Stability"]},
  {"id":"consumivel-14","nome":"Veneno de Grindletooth Aprimorado","tipo":"consumivel","nomes":["Veneno de Grindletooth Aprimorado","Improved Grindletooth Venom","Aprimorado Veneno de dente-de-leão"]},
  {"id":"consumivel-15","nome":"Argila transformadora","tipo":"consumivel","nomes":["Argila transformadora","Morphing Clay"]},
  {"id":"consumivel-16","nome":"Frasco de Darksmoke","tipo":"consumivel","nomes":["Frasco de Darksmoke","Vial of Darksmoke"]},
  {"id":"consumivel-17","nome":"Raiz de salto","tipo":"consumivel","nomes":["Raiz de salto","Jumping Root"]},
  {"id":"consumivel-18","nome":"Pó de estalo","tipo":"consumivel","nomes":["Pó de estalo","Snap Powder"]},
  {"id":"consumivel-19","nome":"Poção de saúde","tipo":"consumivel","nomes":["Poção de saúde","Health Potion"]},
  {"id":"consumivel-20","nome":"Poção de resistência","tipo":"consumivel","nomes":["Poção de resistência","Stamina Potion"]},
  {"id":"consumivel-21","nome":"Costurador de Armadura","tipo":"consumivel","nomes":["Costurador de Armadura","Armor Stitcher","Costureira de armaduras"]},
  {"id":"consumivel-22","nome":"Unguento de Guelras","tipo":"consumivel","nomes":["Unguento de Guelras","Gill Salve","Salva de gânglios"]},
  {"id":"consumivel-23","nome":"Pergaminho de replicação","tipo":"consumivel","nomes":["Pergaminho de replicação","Replication Parchment"]},
  {"id":"consumivel-24","nome":"Fragmento Arcano Aprimorado","tipo":"consumivel","nomes":["Fragmento Arcano Aprimorado","Improved Arcane Shard"]},
  {"id":"consumivel-25","nome":"Poção da Passada Maior","tipo":"consumivel","nomes":["Poção da Passada Maior","Major Stride Potion","Poção de impulso maior"]},
  {"id":"consumivel-26","nome":"Poção de reforço maior","tipo":"consumivel","nomes":["Poção de reforço maior","Major Bolster Potion"]},
  {"id":"consumivel-27","nome":"Poção de Controle Maior","tipo":"consumivel","nomes":["Poção de Controle Maior","Major Control Potion"]},
  {"id":"consumivel-28","nome":"Poção de sintonização maior","tipo":"consumivel","nomes":["Poção de sintonização maior","Major Attune Potion"]},
  {"id":"consumivel-29","nome":"Poção de Encantamento Maior","tipo":"consumivel","nomes":["Poção de Encantamento Maior","Major Charm Potion"]},
  {"id":"consumivel-30","nome":"Poção de Iluminação Maior","tipo":"consumivel","nomes":["Poção de Iluminação Maior","Major Enlighten Potion","Maior Poção de iluminação"]},
  {"id":"consumivel-31","nome":"Sangue do Yorgi","tipo":"consumivel","nomes":["Sangue do Yorgi","Blood of the Yorgi"]},
  {"id":"consumivel-32","nome":"Poção secreta da Homet","tipo":"consumivel","nomes":["Poção secreta da Homet","Homet's Secret Potion"]},
  {"id":"consumivel-33","nome":"Saliva de Redthorn","tipo":"consumivel","nomes":["Saliva de Redthorn","Redthorn Saliva"]},
  {"id":"consumivel-34","nome":"Pedra de Canalização","tipo":"consumivel","nomes":["Pedra de Canalização","Channelstone","Pedra de canal"]},
  {"id":"consumivel-35","nome":"Poeira Mítica","tipo":"consumivel","nomes":["Poeira Mítica","Mythic Dust"]},
  {"id":"consumivel-36","nome":"Pasta ácida","tipo":"consumivel","nomes":["Pasta ácida","Acidpaste"]},
  {"id":"consumivel-37","nome":"Sinalizador de Hopehold","tipo":"consumivel","nomes":["Sinalizador de Hopehold","Hopehold Flare"]},
  {"id":"consumivel-38","nome":"Fragmento Arcano Maior","tipo":"consumivel","nomes":["Fragmento Arcano Maior","Major Arcane Shard"]},
  {"id":"consumivel-39","nome":"Osso-Pena","tipo":"consumivel","nomes":["Osso-Pena","Featherbone","Espinha de peixe"]},
  {"id":"consumivel-40","nome":"Círculo do Vazio","tipo":"consumivel","nomes":["Círculo do Vazio","Circle of the Void"]},
  {"id":"consumivel-41","nome":"Seiva da árvore do sol","tipo":"consumivel","nomes":["Seiva da árvore do sol","Sun Tree Sap"]},
  {"id":"consumivel-42","nome":"Veneno de Dripfang","tipo":"consumivel","nomes":["Veneno de Dripfang","Dripfang Poison"]},
  {"id":"consumivel-43","nome":"Poção de Saúde Maior","tipo":"consumivel","nomes":["Poção de Saúde Maior","Major Health Potion"]},
  {"id":"consumivel-44","nome":"Poção de Resistência Maior","tipo":"consumivel","nomes":["Poção de Resistência Maior","Major Stamina Potion","Maior Poção de resistência"]},
  {"id":"consumivel-45","nome":"Almíscar de ogro","tipo":"consumivel","nomes":["Almíscar de ogro","Ogre Musk"]},
  {"id":"consumivel-46","nome":"Broto de Asas","tipo":"consumivel","nomes":["Broto de Asas","Wingsprout"]},
  {"id":"consumivel-47","nome":"Frasco de vozes perdidas","tipo":"consumivel","nomes":["Frasco de vozes perdidas","Jar of Lost Voices"]},
  {"id":"consumivel-48","nome":"Chá de Flor-de-Dragão","tipo":"consumivel","nomes":["Chá de Flor-de-Dragão","Dragonbloom Tea","Flor do Dragão Chá"]},
  {"id":"consumivel-49","nome":"Semente de ponte","tipo":"consumivel","nomes":["Semente de ponte","Bridge Seed"]},
  {"id":"consumivel-50","nome":"Seiva do sono","tipo":"consumivel","nomes":["Seiva do sono","Sleeping Sap"]},
  {"id":"consumivel-51","nome":"Festa de Xuria","tipo":"consumivel","nomes":["Festa de Xuria","Feast of Xuria"]},
  {"id":"consumivel-52","nome":"Mel Aglutinante","tipo":"consumivel","nomes":["Mel Aglutinante","Bonding Honey","Colagem de mel"]},
  {"id":"consumivel-53","nome":"Poção de encolhimento","tipo":"consumivel","nomes":["Poção de encolhimento","Shrinking Potion"]},
  {"id":"consumivel-54","nome":"Poção de crescimento","tipo":"consumivel","nomes":["Poção de crescimento","Growing Potion"]},
  {"id":"consumivel-55","nome":"Pedra do Conhecimento","tipo":"consumivel","nomes":["Pedra do Conhecimento","Knowledge Stone"]},
  {"id":"consumivel-56","nome":"Musgo Doce","tipo":"consumivel","nomes":["Musgo Doce","Sweet Moss"]},
  {"id":"consumivel-57","nome":"Orbe Ofuscante","tipo":"consumivel","nomes":["Orbe Ofuscante","Blinding Orb","Ofuscante Orbe"]},
  {"id":"consumivel-58","nome":"Chá da Morte","tipo":"consumivel","nomes":["Chá da Morte","Death Tea"]},
  {"id":"consumivel-59","nome":"Espelho de Marigold","tipo":"consumivel","nomes":["Espelho de Marigold","Mirror of Marigold"]},
  {"id":"consumivel-60","nome":"Gota de Estrela","tipo":"consumivel","nomes":["Gota de Estrela","Stardrop","Estrógeno"]},
];

/** Equipamento exclusivo das molduras de campanha. */
const EQUIPAMENTO_CAMPANHA = [
  {"id":"campanha-festa-da-besta-beast-feast-cutelo","nome":"Cutelo","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8 phy","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-ancinho-afiado","nome":"Ancinho afiado","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Agilidade","alcance":"Corpo a Corpo","dano":"d8+3 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-machado-de-acougueiro","nome":"Machado de açougueiro","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força","alcance":"Corpo a Corpo","dano":"d12+3 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-frigideira-de-ferro","nome":"Frigideira de ferro","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força","alcance":"Corpo a Corpo","dano":"d8+1 phy","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-forcado","nome":"Forcado","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+3 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-martelo-de-forja","nome":"Martelo de forja","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força","alcance":"Corpo a Corpo","dano":"d10+3 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-faca-de-cozinha","nome":"Faca de cozinha","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Finesse","alcance":"Corpo a Corpo","dano":"d8+1 phy","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-bordao-de-caminhada","nome":"Bordão de Caminhada","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Instinto","alcance":"Corpo a Corpo","dano":"d10+3 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-rolo-de-massa","nome":"Rolo de massa","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8+1 phy","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-foice","nome":"Foice","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Presença","alcance":"Corpo a Corpo","dano":"d8 phy","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-aticador-de-forja","nome":"Atiçador de Forja","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força","alcance":"Muito Próximo","dano":"d8+2 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-foice-de-colheita","nome":"Foice de colheita","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Finesse","alcance":"Muito Próximo","dano":"d8+2 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-vara-de-pesca","nome":"Vara de pesca","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Agilidade","alcance":"Distante","dano":"d6+3 phy","maos":"Com duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-estilingue","nome":"Estilingue","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Finesse","alcance":"Distante","dano":"d6+3 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-lancador-de-fogos-de-artificio","nome":"Lançador de fogos de artifício","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Agilidade","alcance":"Muito Distante","dano":"d6+3 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-martelo-encantado","nome":"Martelo encantado","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força (arma mágica, requer traço de Feitiço)","alcance":"Corpo a Corpo","dano":"d10+1 mag","maos":"Uma mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-esfregao-encantado","nome":"Esfregão encantado","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força (arma mágica, requer traço de Feitiço)","alcance":"Corpo a Corpo","dano":"d10+3 mag","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-tesoura-encantada","nome":"Tesoura Encantada","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Finesse (arma mágica, requer traço de Feitiço)","alcance":"Muito perto","dano":"d10 mag","maos":"Uma mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-vassoura-encantada","nome":"Vassoura encantada","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Instinto (arma mágica, requer traço de Feitiço)","alcance":"Muito Próximo","dano":"d10+2 mag","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-pocoes-explosivas","nome":"Poções explosivas","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Finesse (arma mágica, requer traço de Feitiço)","alcance":"Fechar","dano":"d8 mag","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-isqueiro-encantado-bumerangue-encantado-linhas-da-tabela-sobrepostas-no-pdf","nome":"Isqueiro encantado / Bumerangue encantado (linhas da tabela sobrepostas no PDF)","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Instinto (arma mágica)","alcance":"Fechar / Longe (ambíguo)","dano":"d8 mag / d6+3 mag (ambíguo)","maos":"One-Handed / Duas mãos (ambíguo)","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-enchanted-kite-batedor-de-varinha-equipe-sparkling-longe-linhas-da-tabela-sobrepostas-no-pdf-nome-enchanted-kite-nao-traduzido","nome":"Enchanted Kite / Batedor de varinha / Equipe Sparkling longe (linhas da tabela sobrepostas no PDF, nome 'Enchanted Kite' não traduzido)","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Presença / Conhecimento (ambíguo)","alcance":"Distante / Muito longe (ambíguo)","dano":"d6 mag / d6+1 mag (ambíguo)","maos":"Duas mãos / One-Handed (ambíguo)","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-garfo-grande","nome":"Garfo grande","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Agilidade (arma secundária)","alcance":"Corpo a Corpo","dano":"d8 phy","maos":"Uma mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-escudo-de-tampa-de-barril","nome":"Escudo de Tampa de Barril","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força (arma secundária)","alcance":"Corpo a Corpo","dano":"d4 phy","maos":"Uma mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-escudo-de-mesa","nome":"Escudo de mesa","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Força (arma secundária)","alcance":"Corpo a Corpo","dano":"d6 phy","maos":"One-Handed","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-faca-de-corte","nome":"Faca de corte","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Finesse (arma secundária)","alcance":"Corpo a Corpo","dano":"d8 phy","maos":"Uma mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-chicote-de-festival","nome":"Chicote de Festival","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Presença (arma secundária)","alcance":"Muito Próximo","dano":"d6 phy","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-gancho-de-reboque","nome":"Gancho de reboque","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Finesse (arma secundária)","alcance":"Fechar","dano":"d6 phy","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-lancador-de-sinalizadores","nome":"Lançador de sinalizadores","cat":"arma","moldura":"Festa da Besta (Beast Feast)","atributo":"Finesse (arma secundária)","alcance":"Distante","dano":"d6+1 phy","maos":"One-Handed","limiares":null,"pontuacao":null},
  {"id":"campanha-festa-da-besta-beast-feast-roupas-acolchoadas","nome":"Roupas acolchoadas","cat":"armadura","moldura":"Festa da Besta (Beast Feast)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":"5 / 11","pontuacao":3},
  {"id":"campanha-festa-da-besta-beast-feast-avental-de-couro","nome":"Avental de couro","cat":"armadura","moldura":"Festa da Besta (Beast Feast)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":"6 / 13","pontuacao":3},
  {"id":"campanha-festa-da-besta-beast-feast-armadura-de-casca-de-arvore","nome":"Armadura de casca de árvore","cat":"armadura","moldura":"Festa da Besta (Beast Feast)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":"7 / 15","pontuacao":4},
  {"id":"campanha-festa-da-besta-beast-feast-nome-ilegivel-texto-sobreposto-no-pdf-cozimento-bandeja-e-peitoral-aparecem-misturados-na-mesma-celula","nome":"Nome ilegível - texto sobreposto no PDF ('(Cozimento) (Bandeja)' e 'Peitoral' aparecem misturados na mesma célula)","cat":"armadura","moldura":"Festa da Besta (Beast Feast)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":"8 / 17","pontuacao":4},
  {"id":"campanha-placa-mae-motherboard-ikonis","nome":"Ikonis","cat":"item","moldura":"Placa-mãe (Motherboard)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":null,"pontuacao":null},
  {"id":"campanha-placa-mae-motherboard-quantum","nome":"Quantum","cat":"item","moldura":"Placa-mãe (Motherboard)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":null,"pontuacao":null},
  {"id":"campanha-placa-mae-motherboard-sucata-fragmentos-d6","nome":"Sucata - Fragmentos (d6)","cat":"item","moldura":"Placa-mãe (Motherboard)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":null,"pontuacao":null},
  {"id":"campanha-placa-mae-motherboard-sucata-metais-d8","nome":"Sucata - Metais (d8)","cat":"item","moldura":"Placa-mãe (Motherboard)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":null,"pontuacao":null},
  {"id":"campanha-placa-mae-motherboard-sucata-componentes-d10","nome":"Sucata - Componentes (d10)","cat":"item","moldura":"Placa-mãe (Motherboard)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":null,"pontuacao":null},
  {"id":"campanha-placa-mae-motherboard-reliquias","nome":"Relíquias","cat":"item","moldura":"Placa-mãe (Motherboard)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":null,"pontuacao":null},
  {"id":"campanha-placa-mae-motherboard-corda-de-rede-com-gancho","nome":"Corda de rede (com gancho)","cat":"item","moldura":"Placa-mãe (Motherboard)","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":null,"pontuacao":null},
  {"id":"campanha-colosso-das-terras-secas-terras-aridas-revolver","nome":"Revólver","cat":"arma","moldura":"Colosso das Terras Secas / Terras Áridas","atributo":"Finesse","alcance":"Distante","dano":"Nível 1: d8+1 phy; Nível 2: d8+4 phy; Nível 3: d8+7 phy; Nível 4: d8+10 phy","maos":"Com uma mão","limiares":null,"pontuacao":null},
  {"id":"campanha-colosso-das-terras-secas-terras-aridas-rifle","nome":"Rifle","cat":"arma","moldura":"Colosso das Terras Secas / Terras Áridas","atributo":"Agilidade","alcance":"Muito Distante","dano":"Nível 1: d8+2 phy; Nível 2: d8+5 phy; Nível 3: d8+8 phy; Nível 4: d8+11 phy","maos":"Com duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-colosso-das-terras-secas-terras-aridas-espingarda","nome":"Espingarda","cat":"arma","moldura":"Colosso das Terras Secas / Terras Áridas","atributo":"Força","alcance":"Muito Próximo","dano":"Nível 1: d6+2 phy; Nível 2: d6+5 phy; Nível 3: d6+8 phy; Nível 4: d6+11 phy","maos":"Duas mãos","limiares":null,"pontuacao":null},
  {"id":"campanha-colosso-das-terras-secas-terras-aridas-laco","nome":"Laço","cat":"arma","moldura":"Colosso das Terras Secas / Terras Áridas","atributo":"Agilidade (arma secundária)","alcance":"Muito Próximo","dano":"Nível 1: d4 phy; Nível 2: d4+3 phy; Nível 3: d4+6 phy; Nível 4: d4+9 phy","maos":"Com uma só mão","limiares":null,"pontuacao":null},
  {"id":"campanha-colosso-das-terras-secas-terras-aridas-revolver-pequeno","nome":"Revólver pequeno","cat":"arma","moldura":"Colosso das Terras Secas / Terras Áridas","atributo":"Finesse (arma secundária)","alcance":"Distante","dano":"Nível 1: d6 phy; Nível 2: d6+3 phy; Nível 3: d6+6 phy; Nível 4: d6+9 phy","maos":"Com uma mão","limiares":null,"pontuacao":null},
  {"id":"campanha-colosso-das-terras-secas-terras-aridas-dinamite","nome":"Dinamite","cat":"item","moldura":"Colosso das Terras Secas / Terras Áridas","atributo":null,"alcance":null,"dano":null,"maos":null,"limiares":null,"pontuacao":null},
];

/** Unidades de ouro e a conversão entre elas. */
const OURO_UNIDADES = [{"id":"punhado","nome":"Punhado","plural":"Punhados","equivale":null,"aliases":["punhado","mão cheia","handful"]},{"id":"bolsa","nome":"Bolsa","plural":"Bolsas","equivale":{"unidade":"punhado","quantidade":10},"aliases":["bolsa","bag"]},{"id":"cofre","nome":"Cofre","plural":"Cofres","equivale":{"unidade":"bolsa","quantidade":10},"aliases":["cofre","baú","chest"]}];
/** Quantos punhados vale cada unidade. */
const OURO_EM_PUNHADOS = { punhado: 1, bolsa: 10, cofre: 100 };
/** Teto: não dá para ter mais de 1 cofre (livro/SRD). */
const OURO_MAXIMO_PUNHADOS = 100;

/* ------------------------------------------------------------------------ *
 *  Consultas e validação
 * ------------------------------------------------------------------------ */

/** Nível de tabela permitido para um personagem de determinado nível. */
function tierDoNivel_(nivel) {
  const n = Math.max(1, Math.min(10, Math.floor(Number(nivel) || 1)));
  return TIER_POR_NIVEL[n];
}

function baterNome_(item, alvo) {
  if (chaveTexto_(item.id) === alvo || chaveTexto_(item.nome) === alvo) return true;
  const als = EQUIPAMENTO_ALIASES[item.id];
  if (!als) return false;
  for (let i = 0; i < als.length; i++) {
    if (chaveTexto_(als[i]) === alvo) return true;
  }
  return false;
}

/** Acha uma arma pelo id, pelo nome em português, pelo nome do livro ou pelo inglês. */
function acharArma_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < ARMAS.length; i++) {
    if (baterNome_(ARMAS[i], alvo)) return ARMAS[i];
  }
  return null;
}

/** Acha uma armadura pelo id ou por qualquer um dos nomes. */
function acharArmadura_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < ARMADURAS.length; i++) {
    if (baterNome_(ARMADURAS[i], alvo)) return ARMADURAS[i];
  }
  return null;
}

/** Acha um item de saque ou consumível. */
function acharItem_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < ITENS.length; i++) {
    const it = ITENS[i];
    if (chaveTexto_(it.id) === alvo) return it;
    for (let k = 0; k < it.nomes.length; k++) {
      if (chaveTexto_(it.nomes[k]) === alvo) return it;
    }
  }
  return null;
}

/** Quantas mãos uma arma ocupa. */
function maosDaArma_(arma) {
  return arma && chaveTexto_(arma.maos).indexOf('duas') >= 0 ? 2 : 1;
}

/**
 * Valida o equipamento equipado de um personagem.
 * @param {{primaria?:string, secundaria?:string, armadura?:string}} equipado
 * @param {number} nivelPersonagem
 * @return {{ok:boolean, erros:string[], resolvido:Object}}
 */
function validarEquipamento_(equipado, nivelPersonagem) {
  equipado = equipado || {};
  const erros = [];
  const resolvido = {};
  const tierMax = tierDoNivel_(nivelPersonagem);
  let maosUsadas = 0;

  const conferirArma = function (valor, papel) {
    if (!valor) return null;
    const a = acharArma_(valor);
    if (!a) { erros.push('Arma desconhecida: "' + valor + '".'); return null; }
    if (a.cat !== papel) {
      erros.push('"' + a.nome + '" é uma arma ' +
        (a.cat === 'primaria' ? 'primária' : 'secundária') + ', não pode entrar como ' +
        (papel === 'primaria' ? 'primária' : 'secundária') + '.');
      return null;
    }
    if (a.tier > tierMax) {
      erros.push('"' + a.nome + '" é da tabela de nível ' + a.tier +
        ', acima do que um personagem de nível ' + (Number(nivelPersonagem) || 1) + ' alcança.');
    }
    maosUsadas += maosDaArma_(a);
    return a;
  };

  resolvido.primaria = conferirArma(equipado.primaria, 'primaria');
  resolvido.secundaria = conferirArma(equipado.secundaria, 'secundaria');

  if (maosUsadas > MAOS_DISPONIVEIS) {
    erros.push('Não cabe nas duas mãos: uma arma de duas mãos já ocupa as duas, ' +
               'então não dá para levar uma secundária junto.');
  }

  if (equipado.armadura) {
    const arm = acharArmadura_(equipado.armadura);
    if (!arm) {
      erros.push('Armadura desconhecida: "' + equipado.armadura + '".');
    } else {
      if (arm.tier > tierMax) {
        erros.push('"' + arm.nome + '" é da tabela de nível ' + arm.tier +
          ', acima do que um personagem de nível ' + (Number(nivelPersonagem) || 1) + ' alcança.');
      }
      resolvido.armadura = arm;
    }
  }

  return { ok: erros.length === 0, erros: erros, resolvido: resolvido };
}

/** Acha equipamento exclusivo de moldura de campanha. */
function acharEquipamentoDeCampanha_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  if (!alvo) return null;
  for (let i = 0; i < EQUIPAMENTO_CAMPANHA.length; i++) {
    const e = EQUIPAMENTO_CAMPANHA[i];
    if (chaveTexto_(e.id) === alvo || chaveTexto_(e.nome) === alvo) return e;
  }
  return null;
}

/* ------------------------------------------------------------------------ *
 *  Ouro
 *  10 punhados = 1 bolsa · 10 bolsas = 1 cofre · no máximo 1 cofre.
 * ------------------------------------------------------------------------ */

/** Converte {punhados, bolsas, cofres} no total em punhados. */
function ouroEmPunhados_(ouro) {
  ouro = ouro || {};
  return (Number(ouro.punhados) || 0) * OURO_EM_PUNHADOS.punhado
       + (Number(ouro.bolsas) || 0) * OURO_EM_PUNHADOS.bolsa
       + (Number(ouro.cofres) || 0) * OURO_EM_PUNHADOS.cofre;
}

/**
 * Normaliza um total de punhados na forma da ficha, já subindo de categoria.
 * Ex.: 23 punhados viram { punhados: 3, bolsas: 2, cofres: 0 }.
 */
function ouroNormalizado_(totalPunhados) {
  let t = Math.max(0, Math.floor(Number(totalPunhados) || 0));
  const estourou = t > OURO_MAXIMO_PUNHADOS;
  if (estourou) t = OURO_MAXIMO_PUNHADOS;
  const cofres = Math.floor(t / OURO_EM_PUNHADOS.cofre);
  t -= cofres * OURO_EM_PUNHADOS.cofre;
  const bolsas = Math.floor(t / OURO_EM_PUNHADOS.bolsa);
  const punhados = t - bolsas * OURO_EM_PUNHADOS.bolsa;
  return { punhados: punhados, bolsas: bolsas, cofres: cofres, estourou: estourou };
}

/** Soma (ou subtrai, com delta negativo) ouro, devolvendo a forma normalizada. */
function ajustarOuro_(ouro, deltaEmPunhados) {
  return ouroNormalizado_(ouroEmPunhados_(ouro) + (Number(deltaEmPunhados) || 0));
}

/** Confere se um ouro anotado na ficha é válido. */
function validarOuro_(ouro) {
  ouro = ouro || {};
  const erros = [];
  ['punhados', 'bolsas', 'cofres'].forEach(function (k) {
    const v = Number(ouro[k]);
    if (ouro[k] !== undefined && (!isFinite(v) || v < 0 || Math.floor(v) !== v)) {
      erros.push('O valor de ' + k + ' precisa ser um número inteiro não negativo.');
    }
  });
  if ((Number(ouro.punhados) || 0) > 9) erros.push('A cada 10 punhados, marque 1 bolsa e limpe os punhados.');
  if ((Number(ouro.bolsas) || 0) > 9) erros.push('A cada 10 bolsas, marque 1 cofre e limpe as bolsas.');
  if ((Number(ouro.cofres) || 0) > 1) erros.push('Não dá para ter mais de 1 cofre.');
  return { ok: erros.length === 0, erros: erros };
}

/** Limiares de dano da armadura como números: {maior, severo}. */
function limiaresDaArmadura_(idOuNome) {
  const a = acharArmadura_(idOuNome);
  if (!a || !a.limiares) return null;
  const partes = String(a.limiares).split(/[\/\s]+/).filter(String);
  if (partes.length < 2) return null;
  return { maior: Number(partes[0]), severo: Number(partes[1]) };
}
