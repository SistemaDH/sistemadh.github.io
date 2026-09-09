/**
 * ============================================================================
 *  Arquivo: 41_Dominios.gs
 *  Domínios e cartas de domínio — ÍNDICE do servidor.
 *
 *  GERADO por tools/gerar-41-dominios.mjs a partir de data/dominios.json e
 *  data/cartas-dominio.json. NÃO edite à mão.
 *
 *  Por que só um índice e não o texto inteiro: o servidor precisa VALIDAR
 *  escolhas (a carta existe? é desse domínio? o nível permite?), não exibir.
 *  O texto completo mora no JSON que o navegador carrega.
 *
 *  Regras do livro usadas aqui:
 *   • Cada domínio tem 21 cartas: 3 de nível 1 e 2 de cada nível de 2 a 10.
 *   • Só é possível escolher cartas de nível igual ou menor ao do personagem.
 *   • O conjunto ativo ("loadout") tem 5 cartas; o excedente vai para o cofre.
 *   • Grimórios são exclusivos do domínio Códice.
 * ============================================================================
 */

/** Quantidade de cartas que podem ficar ativas ao mesmo tempo. */
const MAX_CARTAS_ATIVAS = 5;

/** Nomes de domínio aceitos (as duas traduções do livro e as cartas). */
const DOMINIO_ALIASES = {
  ARCANA: ["ARCANA","Arcano","Arcanos"],
  BLADE: ["BLADE","Lâmina"],
  BONE: ["BONE","Falange","Osso","Ossos"],
  CODEX: ["CODEX","Códice"],
  GRACE: ["Graça","GRACE"],
  MIDNIGHT: ["Meia noite","Meia-Noite","MIDNIGHT"],
  SAGE: ["Sabedoria","Saber","Sábio","SAGE","Sálvia"],
  SPLENDOR: ["Esplendor","SPLENDOR"],
  VALOR: ["VALOR"],
};

/** Dados básicos de cada domínio. */
const DOMINIOS = {
  ARCANA: { nome: "Arcana", cor: "#8a5cf0", classes: ["Druida","Feiticeiro"] },
  BLADE: { nome: "Lâmina", cor: "#c0392b", classes: ["Guardião","Guerreiro"] },
  BONE: { nome: "Osso", cor: "#b9a887", classes: ["Patrulheiro","Guerreiro"] },
  CODEX: { nome: "Códice", cor: "#3f7fd0", classes: ["Bardo","Mago"] },
  GRACE: { nome: "Graça", cor: "#d4519a", classes: ["Bardo","Ladino"] },
  MIDNIGHT: { nome: "Meia-Noite", cor: "#2f3b6e", classes: ["Ladino","Feiticeiro"] },
  SAGE: { nome: "Sábio", cor: "#4c9a5b", classes: ["Druida","Patrulheiro"] },
  SPLENDOR: { nome: "Esplendor", cor: "#e0b13a", classes: ["Seraph","Mago"] },
  VALOR: { nome: "Valor", cor: "#d97e2b", classes: ["Guardião","Seraph"] },
};

/** As 189 cartas: [id, nome, nível, tipo, custo de recordar]. */
const CARTAS_DOMINIO = {
  ARCANA: [
    ["arcana-andar-na-parede", "Andar na Parede", 1, "Feitiço", 1],
    ["arcana-liberar-o-caos", "Liberar o Caos", 1, "Feitiço", 1],
    ["arcana-talisma-runico", "Talismã Rúnico", 1, "Feitiço", 0],
    ["arcana-aperto-de-cinzas", "Aperto de Cinzas", 2, "Feitiço", 1],
    ["arcana-olho-flutuante", "Olho Flutuante", 2, "Feitiço", 0],
    ["arcana-contra-feitico", "Contra-Feitiço", 3, "Feitiço", 2],
    ["arcana-voar", "Voar", 3, "Feitiço", 1],
    ["arcana-desaparecer", "Desaparecer", 4, "Feitiço", 1],
    ["arcana-explosao-de-preservacao", "Explosão de Preservação", 4, "Feitiço", 2],
    ["arcana-premonicao", "Premonição", 5, "Feitiço", 2],
    ["arcana-relampago-em-cadeia", "Relâmpago em Cadeia", 5, "Feitiço", 1],
    ["arcana-andarilho-do-abismo", "Andarilho do Abismo", 6, "Feitiço", 2],
    ["arcana-telecinese", "Telecinese", 6, "Feitiço", 0],
    ["arcana-explosao-de-camuflagem", "Explosão de Camuflagem", 7, "Feitiço", 2],
    ["arcana-tocado-pela-arcana", "Tocado pela Arcana", 7, "Habilidade", 2],
    ["arcana-aura-confusa", "Aura Confusa", 8, "Feitiço", 2],
    ["arcana-reflexo-arcano", "Reflexo Arcano", 8, "Feitiço", 1],
    ["arcana-projecao-sensorial", "Projeção Sensorial", 9, "Feitiço", 0],
    ["arcana-terremoto", "Terremoto", 9, "Feitiço", 2],
    ["arcana-ajustar-a-realidade", "Ajustar a Realidade", 10, "Feitiço", 1],
    ["arcana-queda-do-ceu", "Queda do Céu", 10, "Feitiço", 1],
  ],
  BLADE: [
    ["blade-levantar-se", "Levantar-Se", 1, "Habilidade", 1],
    ["blade-nao-foi-suficiente", "Não Foi Suficiente", 1, "Habilidade", 1],
    ["blade-redemoinho", "Redemoinho", 1, "Habilidade", 0],
    ["blade-imprudente", "Imprudente", 2, "Habilidade", 1],
    ["blade-laco-de-soldado", "Laço de Soldado", 2, "Habilidade", 1],
    ["blade-confusao", "Confusão", 3, "Habilidade", 1],
    ["blade-lutador-versatil", "Lutador Versátil", 3, "Habilidade", 1],
    ["blade-armadura-fortificada", "Armadura Fortificada", 4, "Habilidade", 0],
    ["blade-foco-mortal", "Foco Mortal", 4, "Habilidade", 2],
    ["blade-vantagem-do-campeao", "Vantagem do Campeão", 5, "Habilidade", 1],
    ["blade-vitalidade", "Vitalidade", 5, "Habilidade", 0],
    ["blade-endurecido-pela-batalha", "Endurecido pela Batalha", 6, "Habilidade", 2],
    ["blade-furia-crescente", "Fúria Crescente", 6, "Habilidade", 1],
    ["blade-golpe-raso", "Golpe Raso", 7, "Habilidade", 1],
    ["blade-tocado-pela-lamina", "Tocado pela Lâmina", 7, "Habilidade", 1],
    ["blade-frenesi", "Frenesi", 8, "Habilidade", 3],
    ["blade-grito-de-batalha", "Grito de Batalha", 8, "Habilidade", 2],
    ["blade-golpe-do-ceifador", "Golpe do Ceifador", 9, "Habilidade", 3],
    ["blade-sangue-e-gloria", "Sangue e Glória", 9, "Habilidade", 2],
    ["blade-massacre", "Massacre", 10, "Habilidade", 3],
    ["blade-monstro-de-batalha", "Monstro de Batalha", 10, "Habilidade", 0],
  ],
  BONE: [
    ["bone-eu-vi-chegando", "Eu Vi Chegando", 1, "Habilidade", 1],
    ["bone-intocavel", "Intocável", 1, "Habilidade", 1],
    ["bone-manobras-ageis", "Manobras Ágeis", 1, "Habilidade", 0],
    ["bone-abordagem-estrategica", "Abordagem Estratégica", 2, "Habilidade", 1],
    ["bone-ferocidade", "Ferocidade", 2, "Habilidade", 2],
    ["bone-preparar", "Preparar", 3, "Habilidade", 1],
    ["bone-tatico", "Tático", 3, "Habilidade", 1],
    ["bone-impulso", "Impulso", 4, "Habilidade", 1],
    ["bone-redirecionar", "Redirecionar", 4, "Habilidade", 1],
    ["bone-conheca-teu-inimigo", "Conheça Teu Inimigo", 5, "Habilidade", 1],
    ["bone-golpe-assinatura", "Golpe Assinatura", 5, "Habilidade", 1],
    ["bone-recuperacao", "Recuperação", 6, "Habilidade", 1],
    ["bone-resposta-rapida", "Resposta Rápida", 6, "Habilidade", 0],
    ["bone-precisao-cruel", "Precisão Cruel", 7, "Habilidade", 1],
    ["bone-tocado-pelo-osso", "Tocado pelo Osso", 7, "Habilidade", 2],
    ["bone-dominar", "Dominar", 8, "Habilidade", 1],
    ["bone-golpe-arrasador", "Golpe Arrasador", 8, "Habilidade", 3],
    ["bone-golpe-estilhacante", "Golpe Estilhaçante", 9, "Habilidade", 3],
    ["bone-na-beira", "Na Beira", 9, "Habilidade", 1],
    ["bone-corrida-da-morte", "Corrida da Morte", 10, "Habilidade", 1],
    ["bone-passo-agil", "Passo Ágil", 10, "Habilidade", 2],
  ],
  CODEX: [
    ["codex-livro-de-ava", "Livro de Ava", 1, "Grimório", 2],
    ["codex-livro-de-illiat", "Livro de Illiat", 1, "Grimório", 2],
    ["codex-livro-de-tyfar", "Livro de Tyfar", 1, "Grimório", 2],
    ["codex-livro-de-sitil", "Livro de Sitil", 2, "Grimório", 2],
    ["codex-livro-de-vagras", "Livro de Vagras", 2, "Grimório", 2],
    ["codex-livro-de-korvax", "Livro de Korvax", 3, "Grimório", 2],
    ["codex-livro-de-norai", "Livro de Norai", 3, "Grimório", 2],
    ["codex-livro-de-exota", "Livro de Exota", 4, "Grimório", 3],
    ["codex-livro-de-grynn", "Livro de Grynn", 4, "Grimório", 2],
    ["codex-manifestar-muralha", "Manifestar Muralha", 5, "Feitiço", 2],
    ["codex-teleporte", "Teleporte", 5, "Feitiço", 2],
    ["codex-banir", "Banir", 6, "Feitiço", 0],
    ["codex-simbolo-da-retaliacao", "Símbolo da Retaliação", 6, "Feitiço", 2],
    ["codex-livro-de-homet", "Livro de Homet", 7, "Grimório", 0],
    ["codex-tocado-pelo-codice", "Tocado pelo Códice", 7, "Habilidade", 2],
    ["codex-livro-de-vyola", "Livro de Vyola", 8, "Grimório", 2],
    ["codex-refugio-seguro", "Refúgio Seguro", 8, "Feitiço", 3],
    ["codex-livro-do-ronin", "Livro do Ronin", 9, "Grimório", 4],
    ["codex-onda-de-desintegracao", "Onda de Desintegração", 9, "Feitiço", 4],
    ["codex-livro-de-yarrow", "Livro de Yarrow", 10, "Grimório", 2],
    ["codex-uniao-transcendente", "União Transcendente", 10, "Feitiço", 1],
  ],
  GRACE: [
    ["grace-encantar", "Encantar", 1, "Feitiço", 0],
    ["grace-enganador-habil", "Enganador Hábil", 1, "Habilidade", 0],
    ["grace-palavras-inspiradoras", "Palavras Inspiradoras", 1, "Habilidade", 1],
    ["grace-encrenqueiro", "Encrenqueiro", 2, "Habilidade", 2],
    ["grace-nao-conte-mentiras", "Não Conte Mentiras", 2, "Feitiço", 1],
    ["grace-brilho-hipnotico", "Brilho Hipnótico", 3, "Feitiço", 1],
    ["grace-invisibilidade", "Invisibilidade", 3, "Feitiço", 1],
    ["grace-discurso-acalmante", "Discurso Acalmante", 4, "Habilidade", 1],
    ["grace-pelos-seus-olhos", "Pelos Seus Olhos", 4, "Feitiço", 1],
    ["grace-mergulhador-de-pensamentos", "Mergulhador de Pensamentos", 5, "Feitiço", 2],
    ["grace-words-of-discord", "Palavras de Discórdia", 5, "Feitiço", 1],
    ["grace-nunca-ofuscado", "Nunca Ofuscado", 6, "Habilidade", 2],
    ["grace-share-the-burden", "Partilhar o Fardo", 6, "Feitiço", 0],
    ["grace-carisma-infinito", "Carisma Infinito", 7, "Habilidade", 1],
    ["grace-tocado-pela-graca", "Tocado pela Graça", 7, "Habilidade", 2],
    ["grace-enfeiticar-em-massa", "Enfeitiçar em Massa", 8, "Feitiço", 3],
    ["grace-projecao-astral", "Projeção Astral", 8, "Feitiço", 0],
    ["grace-imitador", "Imitador", 9, "Feitiço", 3],
    ["grace-mestre-do-oficio", "Mestre do Ofício", 9, "Habilidade", 0],
    ["grace-notorio", "Notório", 10, "Habilidade", 0],
    ["grace-reprise", "Reprise", 10, "Feitiço", 1],
  ],
  MIDNIGHT: [
    ["midnight-abrir-e-puxar", "Abrir e Puxar", 1, "Habilidade", 0],
    ["midnight-chuva-de-laminas", "Chuva de Lâminas", 1, "Feitiço", 1],
    ["midnight-disfarce-incrivel", "Disfarce Incrível", 1, "Feitiço", 0],
    ["midnight-espirito-da-meia-noite", "Espírito da Meia-Noite", 2, "Feitiço", 1],
    ["midnight-vincular-sombras", "Vincular Sombras", 2, "Feitiço", 0],
    ["midnight-estrangulamento", "Estrangulamento", 3, "Habilidade", 1],
    ["midnight-veu-da-noite", "Véu da Noite", 3, "Feitiço", 1],
    ["midnight-expert-em-furtividade", "Expert em Furtividade", 4, "Habilidade", 0],
    ["midnight-glifo-do-crepusculo", "Glifo do Crepúsculo", 4, "Feitiço", 1],
    ["midnight-retirada-fantasma", "Retirada Fantasma", 5, "Feitiço", 2],
    ["midnight-silencio", "Silêncio", 5, "Feitiço", 1],
    ["midnight-disfarce-em-massa", "Disfarce em Massa", 6, "Feitiço", 0],
    ["midnight-sussurros-sombrios", "Sussurros Sombrios", 6, "Feitiço", 0],
    ["midnight-esquiva-desaparecente", "Esquiva Desaparecente", 7, "Feitiço", 1],
    ["midnight-tocado-pela-meia-noite", "Tocado pela Meia-Noite", 7, "Habilidade", 2],
    ["midnight-cacador-das-sombras", "Caçador das Sombras", 8, "Habilidade", 2],
    ["midnight-carga-magica", "Carga Mágica", 8, "Feitiço", 1],
    ["midnight-terror-noturno", "Terror Noturno", 9, "Feitiço", 2],
    ["midnight-tributo-do-crepusculo", "Tributo do Crepúsculo", 9, "Habilidade", 1],
    ["midnight-eclipse", "Eclipse", 10, "Feitiço", 2],
    ["midnight-espectro-da-escuridao", "Espectro da Escuridão", 10, "Feitiço", 1],
  ],
  SAGE: [
    ["sage-emaranhado-cruel", "Emaranhado Cruel", 1, "Feitiço", 1],
    ["sage-lingua-da-natureza", "Língua da Natureza", 1, "Habilidade", 0],
    ["sage-rastreador-habilidoso", "Rastreador Habilidoso", 1, "Habilidade", 0],
    ["sage-conjurar-enxame", "Conjurar Enxame", 2, "Feitiço", 1],
    ["sage-familiar-natural", "Familiar Natural", 2, "Feitiço", 1],
    ["sage-caule-imponente", "Caule Imponente", 3, "Feitiço", 1],
    ["sage-projetil-corrosivo", "Projétil Corrosivo", 3, "Feitiço", 1],
    ["sage-aperto-da-morte", "Aperto da Morte", 4, "Feitiço", 1],
    ["sage-campo-de-cura", "Campo de Cura", 4, "Feitiço", 2],
    ["sage-fortaleza-selvagem", "Fortaleza Selvagem", 5, "Feitiço", 1],
    ["sage-pele-espinhosa", "Pele Espinhosa", 5, "Feitiço", 1],
    ["sage-coletor", "Coletor", 6, "Habilidade", 1],
    ["sage-montarias-conjuradas", "Montarias Conjuradas", 6, "Feitiço", 0],
    ["sage-surto-selvagem", "Surto Selvagem", 7, "Feitiço", 2],
    ["sage-tocado-pelo-saber", "Tocado pelo Saber", 7, "Habilidade", 2],
    ["sage-barreira-rejuvenescedora", "Barreira Rejuvenescedora", 8, "Feitiço", 1],
    ["sage-forest-sprites", "Espíritos da Floresta", 8, "Feitiço", 2],
    ["sage-dominio-das-plantas", "Domínio das Plantas", 9, "Feitiço", 1],
    ["sage-templo-das-selvas", "Templo das Selvas", 9, "Habilidade", 2],
    ["sage-forca-da-natureza", "Força da Natureza", 10, "Feitiço", 2],
    ["sage-tempestade", "Tempestade", 10, "Feitiço", 2],
  ],
  SPLENDOR: [
    ["splendor-farol-brilhante", "Farol Brilhante", 1, "Feitiço", 1],
    ["splendor-reforco", "Reforço", 1, "Habilidade", 0],
    ["splendor-toque-curativo", "Toque Curativo", 1, "Feitiço", 1],
    ["splendor-maos-curativas", "Mãos Curativas", 2, "Feitiço", 1],
    ["splendor-palavras-finais", "Palavras Finais", 2, "Feitiço", 1],
    ["splendor-segundo-folego", "Segundo Fôlego", 3, "Habilidade", 2],
    ["splendor-voz-da-razao", "Voz da Razão", 3, "Habilidade", 1],
    ["splendor-adivinhacao", "Adivinhação", 4, "Feitiço", 1],
    ["splendor-guardiao-da-vida", "Guardião da Vida", 4, "Feitiço", 1],
    ["splendor-golpe-divino", "Golpe Divino", 5, "Feitiço", 2],
    ["splendor-moldar-material", "Moldar Material", 5, "Feitiço", 1],
    ["splendor-restauracao", "Restauração", 6, "Feitiço", 2],
    ["splendor-zona-de-protecao", "Zona de Proteção", 6, "Feitiço", 2],
    ["splendor-golpe-curativo", "Golpe Curativo", 7, "Feitiço", 1],
    ["splendor-tocado-do-esplendor", "Tocado do Esplendor", 7, "Habilidade", 2],
    ["splendor-aura-de-escudo", "Aura de Escudo", 8, "Feitiço", 2],
    ["splendor-luz-ofuscante", "Luz Ofuscante", 8, "Feitiço", 2],
    ["splendor-aura-avassaladora", "Aura Avassaladora", 9, "Feitiço", 2],
    ["splendor-raio-da-salvacao", "Raio da Salvação", 9, "Feitiço", 2],
    ["splendor-ressurreicao", "Ressurreição", 10, "Feitiço", 2],
    ["splendor-revigoramento", "Revigoramento", 10, "Feitiço", 3],
  ],
  VALOR: [
    ["valor-empurrao-forte", "Empurrão Forte", 1, "Habilidade", 0],
    ["valor-eu-sou-seu-escudo", "Eu Sou Seu Escudo", 1, "Habilidade", 1],
    ["valor-pele-dura", "Pele Dura", 1, "Habilidade", 0],
    ["valor-presenca-audaz", "Presença Audaz", 2, "Habilidade", 0],
    ["valor-quebrador-corporal", "Quebrador Corporal", 2, "Habilidade", 1],
    ["valor-apoie-se-em-mim", "Apoie-Se em Mim", 3, "Habilidade", 1],
    ["valor-inspiracao-critica", "Inspiração Crítica", 3, "Habilidade", 1],
    ["valor-provocacao", "Provocação", 4, "Habilidade", 1],
    ["valor-tanque-de-suporte", "Tanque de Suporte", 4, "Habilidade", 2],
    ["valor-armadureiro", "Armadureiro", 5, "Habilidade", 1],
    ["valor-golpe-estimulante", "Golpe Estimulante", 5, "Habilidade", 1],
    ["valor-erga-se", "Erga-Se", 6, "Habilidade", 2],
    ["valor-inevitavel", "Inevitável", 6, "Habilidade", 1],
    ["valor-deixe-passar", "Deixe Passar", 7, "Habilidade", 1],
    ["valor-tocado-pelo-valor", "Tocado pelo Valor", 7, "Habilidade", 1],
    ["valor-golpe-no-chao", "Golpe no Chão", 8, "Habilidade", 2],
    ["valor-surto-total", "Surto Total", 8, "Habilidade", 1],
    ["valor-liderar-pelo-exemplo", "Liderar pelo Exemplo", 9, "Habilidade", 3],
    ["valor-mantenha-a-posicao", "Mantenha a Posição", 9, "Habilidade", 1],
    ["valor-armadura-inabalavel", "Armadura Inabalável", 10, "Habilidade", 1],
    ["valor-inquebravel", "Inquebrável", 10, "Habilidade", 4],
  ],
};

/** Usos determinísticos de cartas de domínio. */
const USOS_CARTAS_DOMINIO = {
  "arcana-andar-na-parede": {"custo":{"esperanca":1},"rotuloAtivar":"Conjurar · 1 Esperança","lembrete":"Escolha uma criatura que você possa tocar. Ela escala paredes e tetos até o fim da cena ou até você conjurar Andar na Parede novamente."},
  "arcana-olho-flutuante": {"custo":{"esperanca":1},"rotuloAtivar":"Criar Olho Flutuante · 1 Esperança","estado":{"chave":"estado:carta:arcana:olho-flutuante","valor":1,"rotuloAtivo":"Olho Flutuante ativo","rotuloEncerrar":"Encerrar Olho Flutuante","avisoEncerrar":"Olho Flutuante encerrado."},"lembrete":"Mova a orbe dentro do alcance Muito Distante e alterne livremente entre seus sentidos e a visão dela. Encerre se ela sofrer dano ou sair do alcance."},
  "arcana-contra-feitico": {"custo":{},"rotuloAtivar":"Sucesso: interromper e guardar no cofre","moveParaCofre":true,"lembrete":"Use este botão somente depois de uma jogada de reação de Conjuração bem-sucedida. O efeito mágico é interrompido e suas consequências são evitadas."},
  "arcana-desaparecer": {"custo":{"esperanca":1},"entradaQuantidade":{"campo":"criaturasExtras","rotulo":"Criaturas adicionais","minimo":0,"maximo":5,"custoPorUnidade":{"esperanca":1},"ajuda":"Além de você, cada criatura disposta adicional custa 1 Esperança."},"rotuloAtivar":"Sucesso: teleportar","lembrete":"A Jogada de Conjuração (12), a linha de visão e os alcances são confirmados na mesa."},
  "arcana-premonicao": {"custo":{},"marcaUso":{"chave":"uso:carta:arcana:premonicao","maximo":1},"rotuloAtivar":"Registrar Premonição","lembrete":"Cancele o movimento e as consequências na mesa e faça outro movimento no lugar."},
  "arcana-relampago-em-cadeia": {"custo":{"estresse":2},"rotuloAtivar":"Marcar 2 Estresses e conjurar","lembrete":"O app não rola a Jogada de Conjuração, as Reações nem 2d8+4 de dano."},
  "arcana-explosao-de-camuflagem": {"custo":{"esperanca":1},"condicao":{"chave":"Camuflado","ligar":true},"rotuloAtivar":"Após outro feitiço: Camuflar","lembrete":"Camuflado termina conforme movimento, linha de visão ou ataque descritos na carta."},
  "arcana-tocado-pela-arcana": {"custo":{},"exigeCartasAtivasDominio":{"dominio":"ARCANA","quantidade":4},"marcaUso":{"chave":"uso:carta:arcana:tocado-pela-arcana","maximo":1},"rotuloAtivar":"Trocar Dados de Esperança e Medo","lembrete":"Troque os dois resultados que já foram rolados na mesa; o app não rola dados."},
  "arcana-aura-confusa": {"custo":{},"entradaQuantidade":{"campo":"camadasExtras","rotulo":"Camadas extras","minimo":0,"maximo":12,"custoPorUnidade":{"estresse":1},"ajuda":"A primeira camada é gratuita. Marque 1 Estresse por camada adicional."},"quantidadeLigadaAoEstresse":true,"marcaUso":{"chave":"uso:carta:arcana:aura-confusa","maximo":1},"estado":{"chave":"estado:carta:arcana:aura-confusa:camadas","valorBase":1,"somarQuantidade":true,"permiteEncerrarManual":false,"rotuloAtivo":"Aura Confusa ativa"},"reacaoEstado":{"campo":"dadosAuraConfusa","dado":"d6","lados":6,"sucessoMinimo":5,"rotulo":"Resolver ataque contra você"},"rotuloAtivar":"Sucesso: criar Aura Confusa","lembrete":"Em cada ataque, role 1d6 por camada fora do app. Um 5+ destrói uma camada e faz o ataque falhar; se todos derem 4 ou menos, a aura termina."},
  "arcana-reflexo-arcano": {"custo":{},"entradaQuantidade":{"campo":"esperancasGastas","rotulo":"Esperanças gastas","minimo":1,"maximo":6,"custoPorUnidade":{"esperanca":1},"ajuda":"Escolha quantas Esperanças gastar; role esse mesmo número de d6 na mesa.","dados":{"campo":"dadosReflexoArcano","lados":6,"quantidadePorUnidade":1,"sucessoMinimo":6,"rotulo":"d6 do Reflexo Arcano","mensagemSucesso":"Há um 6: o ataque é refletido no conjurador. Não aplique este dano à sua ficha.","mensagemFalha":"Nenhum 6: o dano mágico segue normalmente."}},"rotuloAtivar":"Reagir a dano mágico","lembrete":"O app não aplica dano ao conjurador: se houver um 6, a mesa aplica nele o mesmo dano que seria recebido."},
  "arcana-projecao-sensorial": {"custo":{},"marcaUso":{"chave":"uso:carta:arcana:projecao-sensorial","maximo":1},"estado":{"chave":"estado:carta:arcana:projecao-sensorial","valor":1,"permiteEncerrarManual":false,"rotuloAtivo":"Em Projeção Sensorial","encerraAoSofrerDano":true,"encerraAoConjurarOutroFeitico":true},"rotuloAtivar":"Sucesso: entrar na visão","lembrete":"A visão termina automaticamente ao sofrer dano ou ao conjurar outro feitiço."},
  "arcana-terremoto": {"custo":{},"marcaUso":{"chave":"uso:carta:arcana:terremoto","maximo":1},"rotuloAtivar":"Registrar Terremoto bem-sucedido","lembrete":"Resolva Reações (18), 3d10+8, Vulnerável temporário e terreno na mesa; o app não rola nem escolhe alvos."},
  "arcana-ajustar-a-realidade": {"custo":{"esperanca":5},"rotuloAtivar":"Ajustar resultado · 5 Esperanças","lembrete":"Escolha na mesa um resultado plausível dentro da faixa dos dados da jogada original."},
  "arcana-queda-do-ceu": {"custo":{},"entradaQuantidade":{"campo":"estressesMarcados","rotulo":"Estresses a marcar","minimo":1,"maximo":12,"custoPorUnidade":{"estresse":1},"ajuda":"Cada Estresse efetivamente marcado acrescenta 1d20+2 de dano aos alvos acertados."},"quantidadeLigadaAoEstresse":true,"rotuloAtivar":"Conjurar Queda do Céu","lembrete":"O app não rola os ataques nem os d20. Use 1d20+2 por Estresse efetivamente marcado."},
  "blade-levantar-se": {"custo":{"estresse":1},"rotuloAtivar":"Dano Severo: reduzir um nível","lembrete":"Reduza o dano Severo para Maior nesta resolução. O app não inventa o gatilho do ataque."},
  "blade-redemoinho": {"custo":{"esperanca":1},"rotuloAtivar":"Sucesso: usar Redemoinho","lembrete":"Use o mesmo ataque contra os outros alvos em Muito Próximo; cada alvo adicional acertado sofre metade do dano."},
  "blade-imprudente": {"custo":{"estresse":1},"rotuloAtivar":"Ganhar vantagem neste ataque","lembrete":"Role este ataque com vantagem fora do app."},
  "blade-laco-de-soldado": {"custo":{},"efeitoRecurso":{"chave":"esperanca","delta":3},"marcaUso":{"chave":"uso:carta:blade:laco-de-soldado","maximo":1},"rotuloAtivar":"Ativar Laço de Soldado","lembrete":"Você ganha até 3 Esperanças pelo teto. O outro personagem também ganha 3 Esperanças; aplique na ficha dele."},
  "blade-confusao": {"custo":{},"marcaUso":{"chave":"uso:carta:blade:confusao","maximo":1},"rotuloAtivar":"Evitar ataque com Confusão","lembrete":"Este ataque é evitado; mova-se com segurança para fora do Corpo a Corpo conforme a ficção."},
  "blade-lutador-versatil": {"custo":{"estresse":1},"rotuloAtivar":"Maximizar um dado de dano","lembrete":"Escolha um dos seus dados de dano e use o resultado máximo dele em vez de rolá-lo."},
  "blade-foco-mortal": {"custo":{},"marcaUso":{"chave":"uso:carta:blade:foco-mortal","maximo":1},"estado":{"chave":"estado:carta:blade:foco-mortal","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Foco Mortal ativo","avisoEncerrar":"Foco Mortal encerrado."},"rotuloAtivar":"Escolher alvo do Foco Mortal","lembrete":"Contra o alvo escolhido, use +1 Proficiência. Encerre ao atacar outra criatura, derrotar o alvo ou terminar a batalha."},
  "blade-vantagem-do-campeao": {"custo":{},"entradaQuantidade":{"campo":"esperancasGastas","rotulo":"Esperanças gastas","minimo":1,"maximo":3,"custoPorUnidade":{"esperanca":1},"ajuda":"Escolha 1 a 3; cada Esperança corresponde a uma opção diferente."},"rotuloAtivar":"Crítico: gastar Esperanças","lembrete":"Para cada Esperança, escolha uma opção diferente: limpar 1 PV, limpar 1 Armadura ou fazer o alvo marcar +1 PV."},
  "blade-endurecido-pela-batalha": {"custo":{"esperanca":1},"efeitoRecurso":{"chave":"pontosDeVidaMarcados","delta":-1},"marcaUso":{"chave":"uso:carta:blade:endurecido-pela-batalha","maximo":1},"rotuloAtivar":"Evitar Movimento de Morte","lembrete":"1 PV foi limpo no lugar de fazer o Movimento de Morte."},
  "blade-furia-crescente": {"custo":{},"entradaQuantidade":{"campo":"usosNesteAtaque","rotulo":"Usos neste ataque","minimo":1,"maximo":2,"custoPorUnidade":{"estresse":1},"ajuda":"Máximo de 2 usos no mesmo ataque."},"rotuloAtivar":"Ativar Fúria Crescente","lembrete":"Some +2×Força ao dano por uso registrado neste ataque."},
  "blade-golpe-raso": {"custo":{"estresse":1},"rotuloAtivar":"Falha: usar Golpe Raso","lembrete":"Cause dano de arma usando metade da sua Proficiência; o app não rola dano."},
  "blade-frenesi": {"custo":{},"marcaUso":{"chave":"uso:carta:blade:frenesi","maximo":1},"estado":{"chave":"estado:carta:blade:frenesi","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Em Frenesi","avisoEncerrar":"Frenesi encerrado."},"rotuloAtivar":"Entrar em Frenesi","lembrete":"Enquanto ativo: +10 dano, +8 Severo e não use Espaços de Armadura."},
  "blade-grito-de-batalha": {"custo":{},"marcaUso":{"chave":"uso:carta:blade:grito-de-batalha","maximo":1},"estado":{"chave":"estado:carta:blade:grito-de-batalha","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Grito de Batalha ativo","avisoEncerrar":"Vantagem de Grito de Batalha encerrada."},"rotuloAtivar":"Emitir Grito de Batalha","lembrete":"Aliados que ouvirem: limpam 1 Estresse, ganham 1 Esperança e têm vantagem em ataques até uma falha com Medo."},
  "blade-golpe-do-ceifador": {"custo":{"esperanca":1},"marcaUso":{"chave":"uso:carta:blade:golpe-do-ceifador","maximo":1},"rotuloAtivar":"Usar Golpe do Ceifador","lembrete":"Após a jogada, escolha entre os alvos indicados pelo Mestre; o escolhido marca 5 PV."},
  "blade-sangue-e-gloria": {"custo":{},"rotuloAtivar":"Registrar Sangue e Glória","lembrete":"Após o gatilho, ganhe 1 Esperança OU limpe 1 Estresse usando a própria trilha."},
  "blade-massacre": {"custo":{"estresse":1},"rotuloAtivar":"Reagir ao ataque em aliado","lembrete":"Force a criatura a fazer Reação (15); em falha, ela marca 1 PV."},
  "blade-monstro-de-batalha": {"custo":{"estresse":4},"rotuloAtivar":"Sucesso: usar Monstro de Batalha","lembrete":"Em vez de rolar dano, o alvo marca PV igual aos PV que você tem marcados."},
  "bone-eu-vi-chegando": {"custo":{"estresse":1},"entradaQuantidade":{"campo":"resultadoD4","rotulo":"Resultado do d4","minimo":1,"maximo":4,"ajuda":"Role 1d4 fora do app; o número informado será o bônus de Evasão contra este ataque."},"rotuloAtivar":"Reagir ao ataque à distância","lembrete":"Use o resultado do d4 informado como bônus de Evasão apenas contra este ataque. A Evasão base não muda."},
  "bone-manobras-ageis": {"custo":{"estresse":1},"marcaUso":{"chave":"uso:carta:bone:manobras-ageis","maximo":1},"rotuloAtivar":"Usar Manobras Ágeis","lembrete":"Mova-se até alcance Longo sem Jogada de Agilidade. Se terminar Corpo a Corpo e atacar imediatamente, use +1 no ataque."},
  "bone-ferocidade": {"custo":{"esperanca":2},"entradaQuantidade":{"campo":"pontosDeVidaMarcados","rotulo":"PV marcados pelo adversário","minimo":1,"maximo":12,"ajuda":"Informe quantos Pontos de Vida o adversário marcou com o dano que disparou Ferocidade."},"estado":{"chave":"estado:carta:bone:ferocidade:evasao","valorBase":0,"somarQuantidade":true,"permiteEncerrarManual":true,"rotuloAtivo":"Ferocidade ativa","avisoEncerrar":"Ferocidade encerrada depois do próximo ataque feito contra você."},"rotuloAtivar":"Ativar Ferocidade · 2 Esperanças","lembrete":"O bônus de Evasão é igual aos PV informados e dura até depois do próximo ataque feito contra você."},
  "bone-preparar": {"custo":{"estresse":1},"efeitoRecurso":{"chave":"armaduraMarcada","delta":1},"rotuloAtivar":"Preparar: marcar Armadura adicional","lembrete":"Use junto da redução de dano que já marcou um Espaço de Armadura; este botão marca o espaço adicional."},
  "bone-impulso": {"custo":{"estresse":1},"rotuloAtivar":"Usar Impulso","lembrete":"Ataque um alvo em alcance Distante com vantagem, some 1d10 ao dano e termine Corpo a Corpo com ele."},
  "bone-redirecionar": {"custo":{"estresse":1},"rotuloAtivar":"6 rolado: redirecionar ataque","lembrete":"Depois de obter ao menos um 6 nos d6 de Proficiência, redirecione o ataque para um adversário em alcance Muito Próximo."},
  "bone-conheca-teu-inimigo": {"custo":{},"opcoes":[{"id":"informacao","rotulo":"Informação · 1 Esperança","custo":{"esperanca":1},"lembrete":"Escolha um dos quatro conjuntos de informações e pergunte ao GM."},{"id":"medo","rotulo":"Remover 1 Medo · 1 Estresse","custo":{"estresse":1},"lembrete":"A Jogada de Instinto teve sucesso; o Mestre remove 1 Medo da Reserva de Medo."},{"id":"ambos","rotulo":"Informação + Medo · 1 Esperança + 1 Estresse","custo":{"esperanca":1,"estresse":1},"lembrete":"Escolha um conjunto de informações e o Mestre remove 1 Medo da Reserva de Medo."}],"rotuloAtivar":"Registrar sucesso de Conheça Teu Inimigo"},
  "bone-golpe-assinatura": {"custo":{},"marcaUso":{"chave":"uso:carta:bone:golpe-assinatura","maximo":1},"opcoes":[{"id":"sucesso","rotulo":"Ação teve sucesso","efeitoRecurso":{"chave":"estresseMarcado","delta":-1},"lembrete":"Sucesso com o Golpe Assinatura: 1 Estresse foi limpo."},{"id":"falha","rotulo":"Ação falhou","lembrete":"O uso foi gasto; nenhuma rolagem adicional é feita pelo app."}],"rotuloAtivar":"Resolver Golpe Assinatura"},
  "bone-recuperacao": {"custo":{"esperanca":1},"rotuloAtivar":"Permitir Recuperação a um aliado","lembrete":"Durante este descanso curto, um aliado pode trocar um de seus movimentos por um movimento de descanso longo."},
  "bone-resposta-rapida": {"custo":{"estresse":1},"rotuloAtivar":"Falha Corpo a Corpo: Resposta Rápida","lembrete":"Cause ao atacante o dano de uma de suas armas ativas; o app não rola o dano."},
  "bone-tocado-pelo-osso": {"custo":{"esperanca":3},"exigeCartasAtivasDominio":{"dominio":"BONE","quantidade":4},"marcaUso":{"chave":"uso:carta:bone:tocado-pelo-osso","maximo":1},"rotuloAtivar":"Fazer o ataque bem-sucedido falhar","lembrete":"O ataque que teve sucesso contra você falha em vez disso."},
  "bone-dominar": {"custo":{"esperanca":1},"rotuloAtivar":"Mover alvos de Dominar","lembrete":"Mova os alvos em que teve sucesso e aliados dispostos para outro ponto dentro do alcance Próximo."},
  "bone-golpe-arrasador": {"custo":{"estresse":1},"estado":{"chave":"estado:carta:bone:golpe-arrasador","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Golpe Arrasador pendente · próximo sucesso no mesmo alvo +2d12","rotuloEncerrar":"Consumir +2d12","avisoEncerrar":"Golpe Arrasador consumido no próximo ataque bem-sucedido contra o mesmo alvo."},"rotuloAtivar":"Sucesso: preparar Golpe Arrasador","lembrete":"No próximo ataque bem-sucedido contra o mesmo alvo, some 2d12 ao dano."},
  "bone-golpe-estilhacante": {"custo":{"esperanca":1},"marcaUso":{"chave":"uso:carta:bone:golpe-estilhacante","maximo":1},"rotuloAtivar":"Usar Golpe Estilhaçante","lembrete":"Ataque todos no alcance da arma. Em qualquer sucesso, role o dano da arma uma vez, distribua-o e acrescente um dado de dano a cada alvo."},
  "bone-corrida-da-morte": {"custo":{"esperanca":3},"rotuloAtivar":"Iniciar Corrida da Morte","lembrete":"Primeiro alvo usa +1 Proficiência no dano; remova um dado da rolagem de dano para cada alvo subsequente e não ataque o mesmo adversário duas vezes."},
  "bone-passo-agil": {"custo":{},"efeitoRecursoCondicional":{"quando":{"chave":"estresseMarcado","maiorQue":0},"entao":{"chave":"estresseMarcado","delta":-1},"senao":{"chave":"esperanca","delta":1}},"rotuloAtivar":"Ataque falhou: Passo Ágil","lembrete":"Limpe 1 Estresse; se não havia Estresse para limpar, ganhe 1 Esperança."},
};

/** Efeitos derivados de cartas de domínio ativas. */
const EFEITOS_DERIVADOS_CARTAS_DOMINIO = {
  "arcana-tocado-pela-arcana": {"bonusConjuracao":1,"exigeCartasAtivasDominio":{"dominio":"ARCANA","quantidade":4}},
  "blade-armadura-fortificada": {"bonusLimiares":2,"exigeArmaduraEquipada":true},
  "blade-tocado-pela-lamina": {"bonusAtaque":2,"bonusLimiarGrave":4,"exigeCartasAtivasDominio":{"dominio":"BLADE","quantidade":4}},
  "blade-frenesi": {"bonusDano":10,"bonusLimiarGrave":8,"exigeEstado":"estado:carta:blade:frenesi"},
  "blade-massacre": {"danoMinimoPvEmSucesso":2},
  "bone-intocavel": {"bonusEvasaoMetadeTraco":"Agilidade","arredondar":"cima"},
  "bone-ferocidade": {"bonusEvasaoEstado":"estado:carta:bone:ferocidade:evasao","exigeEstado":"estado:carta:bone:ferocidade:evasao"},
  "bone-precisao-cruel": {"danoArmaEscolhaTracos":["Finesse","Agilidade"]},
  "bone-tocado-pelo-osso": {"tracos":{"agilidade":1},"exigeCartasAtivasDominio":{"dominio":"BONE","quantidade":4}},
  "bone-na-beira": {"ignoraDanoMenorSePontosDeVidaNaoMarcadosMaximo":2},
};

/**
 * As 5 cartas que mudam alguma coisa PARA SEMPRE.
 *
 * Três mexem na própria ficha (Vitalidade, Mestre do Ofício, Ressurreição) e
 * duas mexem no ALVO (Livro do Ronin, Projétil Corrosivo) — essas viram
 * condição ou observação no adversário, dentro do encontro.
 */
const CARTAS_PERMANENTES = {
  "blade-vitalidade": {"trancaNoCofre":true,"escolher":2,"de":[{"id":"estresse","rotulo":"Um espaço de Estresse","campo":"estresseMaximo","delta":1},{"id":"pv","rotulo":"Um espaço de Ponto de Vida","campo":"pontosDeVidaMaximos","delta":1},{"id":"limiares","rotulo":"+2 de bônus em seus limiares de dano","campo":"limiares","delta":2}],"nota":"O livro manda escolher DOIS dos três, e depois pôr a carta no cofre para sempre."},
  "codex-livro-do-ronin": {"noAlvo":"Enervação Eterna deixa o alvo permanentemente Vulnerável. Isso é uma condição no ADVERSÁRIO: aplique pelo encontro, no cartão dele."},
  "grace-mestre-do-oficio": {"trancaNoCofre":true,"experiencias":[{"id":"duas","rotulo":"+2 em duas Experiências","bonus":2,"quantas":2},{"id":"uma","rotulo":"+3 em uma Experiência","bonus":3,"quantas":1}],"nota":"Escolha um dos dois arranjos; a carta vai para o cofre para sempre."},
  "sage-projetil-corrosivo": {"noAlvo":"Corroído fica no ADVERSÁRIO, não na sua ficha: −1 na Dificuldade dele para cada 2 Estresses gastos. Anote na observação do cartão dele, no encontro."},
  "splendor-ressurreicao": {"trancaNoCofre":true,"manual":true,"nota":"A carta só vai para o cofre se o d6 sair 5 ou menos — quem rola é o jogador, então o app espera ele dizer que aconteceu."},
};

/* ------------------------------------------------------------------------ *
 *  Consultas
 * ------------------------------------------------------------------------ */

/** Normaliza texto: sem acento, sem caixa, sem espaço sobrando. */
function chaveTexto_(txt) {
  return String(txt || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Converte qualquer grafia de domínio no código canônico.
 * "Sálvia", "Sage", "Saber" e "Sábio" viram todos 'SAGE'.
 * @return {string|null}
 */
function normalizarDominio_(nome) {
  const alvo = chaveTexto_(nome);
  if (!alvo) return null;
  const codigos = Object.keys(DOMINIO_ALIASES);
  for (let i = 0; i < codigos.length; i++) {
    const lista = DOMINIO_ALIASES[codigos[i]];
    for (let j = 0; j < lista.length; j++) {
      if (chaveTexto_(lista[j]) === alvo) return codigos[i];
    }
  }
  return null;
}

/** Lista de cartas de um domínio, já como objetos. */
function cartasDoDominio_(dominio) {
  const codigo = normalizarDominio_(dominio);
  if (!codigo || !CARTAS_DOMINIO[codigo]) return [];
  return CARTAS_DOMINIO[codigo].map(function (linha) {
    return { id: linha[0], nome: linha[1], nivel: linha[2], tipo: linha[3], custoRecordar: linha[4], dominio: codigo };
  });
}

/** Acha uma carta pelo id ou pelo nome (em qualquer domínio). */
function acharCarta_(idOuNome) {
  const alvo = chaveTexto_(idOuNome);
  const codigos = Object.keys(CARTAS_DOMINIO);
  for (let i = 0; i < codigos.length; i++) {
    const lista = CARTAS_DOMINIO[codigos[i]];
    for (let j = 0; j < lista.length; j++) {
      if (chaveTexto_(lista[j][0]) === alvo || chaveTexto_(lista[j][1]) === alvo) {
        return { id: lista[j][0], nome: lista[j][1], nivel: lista[j][2],
                 tipo: lista[j][3], custoRecordar: lista[j][4], dominio: codigos[i] };
      }
    }
  }
  return null;
}

/**
 * Valida uma escolha de carta.
 * @param {string} idOuNome
 * @param {string[]} dominiosPermitidos códigos ou nomes dos domínios da classe
 * @param {number} nivelPersonagem
 * @return {{ok:boolean, carta?:Object, erro?:string}}
 */
function validarEscolhaDeCarta_(idOuNome, dominiosPermitidos, nivelPersonagem) {
  const carta = acharCarta_(idOuNome);
  if (!carta) {
    return { ok: false, erro: 'Carta de domínio desconhecida: "' + idOuNome + '".' };
  }
  const permitidos = (dominiosPermitidos || [])
    .map(normalizarDominio_)
    .filter(function (x) { return x; });
  if (permitidos.length && permitidos.indexOf(carta.dominio) === -1) {
    return { ok: false, erro: '"' + carta.nome + '" é do domínio ' + DOMINIOS[carta.dominio].nome +
             ', que não é um dos domínios da sua classe.' };
  }
  const nivel = Number(nivelPersonagem) || 1;
  if (carta.nivel > nivel) {
    return { ok: false, erro: '"' + carta.nome + '" é de nível ' + carta.nivel +
             ' e o personagem está no nível ' + nivel + '.' };
  }
  return { ok: true, carta: carta };
}

/**
 * Valida a lista inteira de cartas de um personagem (ativas + cofre).
 * Não deixa carta repetida nem mais de MAX_CARTAS_ATIVAS ativas.
 */
function validarCartasDoPersonagem_(ativas, cofre, dominiosPermitidos, nivelPersonagem) {
  const vistas = {};
  const erros = [];
  const conferir = function (lista, ondeEsta) {
    (lista || []).forEach(function (item) {
      const r = validarEscolhaDeCarta_(item, dominiosPermitidos, nivelPersonagem);
      if (!r.ok) { erros.push(r.erro); return; }
      if (vistas[r.carta.id]) {
        erros.push('"' + r.carta.nome + '" aparece duas vezes.');
        return;
      }
      vistas[r.carta.id] = ondeEsta;
    });
  };
  conferir(ativas, 'ativa');
  conferir(cofre, 'cofre');
  if ((ativas || []).length > MAX_CARTAS_ATIVAS) {
    erros.push('São no máximo ' + MAX_CARTAS_ATIVAS + ' cartas ativas; o resto vai para o cofre.');
  }
  return { ok: erros.length === 0, erros: erros };
}


/** Bônus de Conjuração vindos de cartas que estão realmente ATIVAS. */
function bonusConjuracaoDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  const ids = Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO);
  let total = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(id); })) continue;
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    const req = e.exigeCartasAtivasDominio || null;
    if (req) {
      let n = 0;
      for (let k = 0; k < ativas.length; k++) {
        const c = acharCarta_(ativas[k]);
        if (c && chaveTexto_(c.dominio) === chaveTexto_(req.dominio)) n++;
      }
      if (n < Math.max(1, Math.trunc(Number(req.quantidade)) || 1)) continue;
    }
    total += Math.trunc(Number(e.bonusConjuracao)) || 0;
  }
  return total;
}


/** Bônus nos dois limiares vindos de cartas ativas. */
function bonusLimiaresDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  let total = 0;
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!e.bonusLimiares) return;
    if (!ativas.some(function (x) { return chaveTexto_(x) === chaveTexto_(id); })) return;
    if (e.exigeArmaduraEquipada === true && !((((ficha || {}).equipamento || {}).armadura))) return;
    total += Math.trunc(Number(e.bonusLimiares)) || 0;
  });
  return total;
}


function requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e) {
  const ativas=(((ficha||{}).cartas||{}).ativas||[]);
  if (!ativas.some(function(x){return chaveTexto_(x)===chaveTexto_(id);})) return false;
  const req=e.exigeCartasAtivasDominio||null;
  if(req){let n=0;for(let i=0;i<ativas.length;i++){const c=acharCarta_(ativas[i]);if(c&&chaveTexto_(c.dominio)===chaveTexto_(req.dominio))n++;}if(n<Math.max(1,Math.trunc(Number(req.quantidade))||1))return false;}
  if(e.exigeEstado){const v=Math.trunc(Number((((ficha||{}).contadores||{})[e.exigeEstado]||{}).valor))||0;if(v<=0)return false;}
  return true;
}
function bonusAtaqueDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusAtaque&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusAtaque))||0;});return t;}
function bonusLimiarGraveDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusLimiarGrave&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusLimiarGrave))||0;});return t;}
function bonusDanoDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.bonusDano&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t+=Math.trunc(Number(e.bonusDano))||0;});return t;}
function danoMinimoPvDeCartas_(ficha){let t=0;if(typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO==='undefined')return 0;Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function(id){const e=EFEITOS_DERIVADOS_CARTAS_DOMINIO[id]||{};if(e.danoMinimoPvEmSucesso&&requisitoDeEfeitoDerivadoDeCartaVale_(ficha,id,e))t=Math.max(t,Math.trunc(Number(e.danoMinimoPvEmSucesso))||0);});return t;}


/** Bônus de Evasão vindos de cartas ativas, fixos ou mantidos em estado. */
function bonusEvasaoDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return 0;
  let total = 0;
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e)) return;
    if (e.bonusEvasao) total += Math.trunc(Number(e.bonusEvasao)) || 0;
    if (e.bonusEvasaoMetadeTraco) {
      const valor = (typeof valorDoTraco_ === 'function') ? valorDoTraco_(ficha, e.bonusEvasaoMetadeTraco) : 0;
      // Regra geral do Core: números inteiros e arredondamento para cima.
      total += Math.ceil((Number(valor) || 0) / 2);
    }
    if (e.bonusEvasaoEstado) {
      const item = (((ficha || {}).contadores || {})[e.bonusEvasaoEstado]) || {};
      total += Math.max(0, Math.trunc(Number(item.valor)) || 0);
    }
  });
  return total;
}


/** Efeitos derivados das cartas que estão realmente ativas e cumprem requisitos. */
function efeitosDerivadosAtivosDeCartas_(ficha) {
  if (typeof EFEITOS_DERIVADOS_CARTAS_DOMINIO === 'undefined') return [];
  const saida = [];
  Object.keys(EFEITOS_DERIVADOS_CARTAS_DOMINIO).forEach(function (id) {
    const e = EFEITOS_DERIVADOS_CARTAS_DOMINIO[id] || {};
    if (!requisitoDeEfeitoDerivadoDeCartaVale_(ficha, id, e)) return;
    const c = (typeof acharCarta_ === 'function') ? acharCarta_(id) : null;
    saida.push({ id: id, nome: c ? c.nome : id, efeito: e });
  });
  return saida;
}

/** Limite de PV desmarcados para ignorar dano Menor, ou null quando não há regra. */
function limiteDePvParaIgnorarDanoMenorDeCartas_(ficha) {
  const lista = efeitosDerivadosAtivosDeCartas_(ficha);
  let limite = null;
  for (let i = 0; i < lista.length; i++) {
    const v = lista[i].efeito && lista[i].efeito.ignoraDanoMenorSePontosDeVidaNaoMarcadosMaximo;
    if (v === undefined || v === null) continue;
    const n = Math.max(0, Math.trunc(Number(v)) || 0);
    limite = limite === null ? n : Math.max(limite, n);
  }
  return limite;
}
