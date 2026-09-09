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
  "codex-livro-de-ava": {"custo":{},"opcoes":[{"id":"armadura-de-tava","rotulo":"Armadura de Tava · 1 Esperança","custo":{"esperanca":1},"estado":{"chave":"estado:carta:codex:armadura-de-tava","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Armadura de Tava sustentada","rotuloEncerrar":"Encerrar Armadura de Tava","avisoEncerrar":"Armadura de Tava deixou de estar sustentada."},"lembrete":"O alvo tocado recebe +1 na Pontuação de Armadura até o próximo descanso dele ou até você lançar Armadura de Tava novamente."}],"rotuloAtivar":"Usar Livro de Ava"},
  "codex-livro-de-illiat": {"custo":{},"opcoes":[{"id":"barragem-arcana","rotulo":"Barragem Arcana","entradaQuantidade":{"campo":"esperancasGastas","rotulo":"Esperanças gastas","minimo":1,"maximo":6,"custoPorUnidade":{"esperanca":1},"ajuda":"Escolha quantas Esperanças gastar. Depois role essa mesma quantidade de d6 fora do app."},"marcaUso":{"chave":"uso:carta:codex:barragem-arcana","maximo":1},"lembrete":"Role 1d6 por Esperança gasta e cause o total como dano mágico ao alvo em alcance Próximo."},{"id":"telepatia","rotulo":"Telepatia · 1 Esperança","custo":{"esperanca":1},"estado":{"chave":"estado:carta:codex:telepatia","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Telepatia ativa","rotuloEncerrar":"Encerrar Telepatia","avisoEncerrar":"A conexão telepática foi encerrada."},"lembrete":"A comunicação mental com o alvo visível fica aberta até seu próximo descanso ou até você lançar Telepatia novamente."}],"rotuloAtivar":"Usar Livro de Illiat"},
  "codex-livro-de-sitil": {"custo":{},"opcoes":[{"id":"paralelo","rotulo":"Paralelo · 2 Esperanças","custo":{"esperanca":2},"estado":{"chave":"estado:carta:codex:paralelo","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Paralelo sustentado","rotuloEncerrar":"Consumir/encerrar Paralelo","avisoEncerrar":"Paralelo foi consumido ou encerrado."},"lembrete":"No próximo ataque do alvo, ele pode atingir um alvo adicional que a jogada também acertaria. Só mantenha Paralelo em uma criatura por vez."}],"rotuloAtivar":"Usar Livro de Sitil"},
  "codex-livro-de-vagras": {"custo":{},"opcoes":[{"id":"tranca-runica","rotulo":"Sucesso: Tranca Rúnica","marcaUso":{"chave":"uso:carta:codex:tranca-runica","maximo":1},"lembrete":"O objeto tocado fica trancado para todas as criaturas exceto as escolhidas."},{"id":"porta-arcana","rotulo":"Sucesso: Porta Arcana · 1 Esperança","custo":{"esperanca":1},"lembrete":"Crie o portal até um ponto visível em alcance Distante; ele se fecha depois de uma criatura atravessar."}],"rotuloAtivar":"Usar Livro de Vagras"},
  "codex-livro-de-korvax": {"custo":{},"opcoes":[{"id":"retratar","rotulo":"Retratar · 1 Esperança","custo":{"esperanca":1},"lembrete":"O alvo Corpo a Corpo faz Reação (15); em falha, esquece o último minuto da conversa."},{"id":"circulo-runico","rotulo":"Círculo Rúnico · 1 Estresse","custo":{"estresse":1},"estado":{"chave":"estado:carta:codex:circulo-runico","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Círculo Rúnico ativo","rotuloEncerrar":"Encerrar Círculo Rúnico","avisoEncerrar":"Círculo Rúnico encerrado."},"lembrete":"Adversários Corpo a Corpo ou que entrarem no alcance sofrem 2d12+4 mágico e são empurrados para Muito Próximo."}],"rotuloAtivar":"Usar Livro de Korvax"},
  "codex-livro-de-exota": {"custo":{},"opcoes":[{"id":"repudiar","rotulo":"Sucesso: Repudiar","marcaUso":{"chave":"uso:carta:codex:repudiar","maximo":1},"lembrete":"A Reação com Conjuração teve sucesso: cancele o efeito mágico e suas consequências."},{"id":"criar-construto","rotulo":"Criar Construto · 1 Esperança","custo":{"esperanca":1},"estado":{"chave":"estado:carta:codex:construto","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Construto ativo","rotuloEncerrar":"Desfazer Construto","avisoEncerrar":"O construto foi desfeito."},"lembrete":"Mantenha apenas um construto. Ele usa sua Evasão e atributos; ataques causam 2d10+3 físico e ele se desfaz ao sofrer dano."}],"rotuloAtivar":"Usar Livro de Exota"},
  "codex-livro-de-grynn": {"custo":{},"opcoes":[{"id":"deflexao-arcana","rotulo":"Deflexão Arcana · 1 Esperança","custo":{"esperanca":1},"marcaUso":{"chave":"uso:carta:codex:deflexao-arcana","maximo":1},"lembrete":"Anule o dano do ataque que mira você ou um aliado em alcance Muito Próximo."}],"rotuloAtivar":"Usar Livro de Grynn"},
  "codex-manifestar-muralha": {"custo":{"esperanca":1},"marcaUso":{"chave":"uso:carta:codex:manifestar-muralha","maximo":1},"estado":{"chave":"estado:carta:codex:manifestar-muralha","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Manifestar Muralha ativa","rotuloEncerrar":"Encerrar Manifestar Muralha","avisoEncerrar":"Manifestar Muralha foi encerrada."},"rotuloAtivar":"Sucesso: Manifestar Muralha · 1 Esperança","lembrete":"Crie a muralha entre dois pontos em alcance Longo. Ela dura até seu próximo descanso ou até ser encerrada/reconjurada."},
  "codex-banir": {"custo":{},"marcaUso":{"chave":"uso:carta:codex:banir","maximo":1},"rotuloAtivar":"Falha do alvo: Banir","lembrete":"Use depois da falha na reação do alvo. Ele é banido; em jogadas com Medo a Dificuldade cai em 1 e ele tenta retornar."},
  "codex-livro-de-homet": {"custo":{},"opcoes":[{"id":"passar-atraves","rotulo":"Sucesso: Passar Através","marcaUso":{"chave":"uso:carta:codex:passar-atraves","maximo":1},"lembrete":"Você e as criaturas tocando em você podem atravessar a parede ou porta em alcance Próximo."},{"id":"portao-dimensional","rotulo":"Sucesso: Portão Dimensional","marcaUso":{"chave":"uso:carta:codex:portao-dimensional","maximo":1},"lembrete":"Abra o portal para uma dimensão/plano já visitado; ele dura até seu próximo descanso."}],"rotuloAtivar":"Usar Livro de Homet"},
  "codex-tocado-pelo-codice": {"custo":{},"exigeCartasAtivasDominio":{"dominio":"CODEX","quantidade":4},"opcoes":[{"id":"proficiencia-conjuracao","rotulo":"Somar Proficiência · 1 Estresse","custo":{"estresse":1},"bonusProficienciaConjuracaoAtual":true,"lembrete":"Some sua Proficiência atual à Jogada de Conjuração que você está fazendo."},{"id":"troca-sem-custo","rotulo":"Trocar com o cofre · sem Custo de Retorno","marcaUso":{"chave":"uso:carta:codex:tocado-pelo-codice:troca","maximo":1},"trocaComCofreSemCusto":true,"lembrete":"Tocado pelo Códice vai para o cofre e a carta escolhida entra na mão sem pagar Custo de Retorno."}],"rotuloAtivar":"Usar Tocado pelo Códice"},
  "codex-livro-de-vyola": {"custo":{"esperanca":1},"marcaUso":{"chave":"uso:carta:codex:clareza-compartilhada","maximo":1},"estado":{"chave":"estado:carta:codex:clareza-compartilhada","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Clareza Compartilhada ativa","rotuloEncerrar":"Encerrar Clareza Compartilhada","avisoEncerrar":"Clareza Compartilhada foi encerrada."},"rotuloAtivar":"Clareza Compartilhada · 1 Esperança","lembrete":"Escolha duas criaturas voluntárias. Até o próximo descanso delas, quando uma marcar Estresse, elas escolhem qual das duas marca."},
  "codex-refugio-seguro": {"custo":{"esperanca":2},"estado":{"chave":"estado:carta:codex:refugio-seguro","valor":1,"permiteEncerrarManual":true,"movimentosAdicionaisNoDescanso":1,"rotuloAtivo":"Dentro do Refúgio Seguro","rotuloEncerrar":"Sair/encerrar Refúgio Seguro","avisoEncerrar":"Refúgio Seguro deixou de conceder o movimento adicional."},"rotuloAtivar":"Invocar Refúgio Seguro · 2 Esperanças","lembrete":"Enquanto descansar no seu próprio Refúgio Seguro, você recebe um movimento de inatividade adicional."},
  "codex-onda-de-desintegracao": {"custo":{},"entradaQuantidade":{"campo":"alvosEscolhidos","rotulo":"Alvos escolhidos","minimo":1,"maximo":12,"custoPorUnidade":{"estresse":1},"ajuda":"Informe quantos adversários elegíveis você escolheu. O app marca 1 Estresse por alvo."},"quantidadeLigadaAoEstresse":true,"marcaUso":{"chave":"uso:carta:codex:onda-de-desintegracao","maximo":1},"rotuloAtivar":"Sucesso: desintegrar alvos","lembrete":"Os alvos escolhidos entre os elegíveis são mortos e não podem voltar à vida; remova-os/derrote-os na cena pelo fluxo do Mestre."},
  "codex-livro-de-yarrow": {"custo":{"esperanca":5},"estado":{"chave":"estado:carta:codex:imunidade-magica","valor":1,"permiteEncerrarManual":true,"imunidadeDano":"magico","rotuloAtivo":"Imunidade Mágica ativa","rotuloEncerrar":"Encerrar Imunidade Mágica","avisoEncerrar":"Imunidade Mágica foi encerrada."},"rotuloAtivar":"Imunidade Mágica · 5 Esperanças","lembrete":"Até seu próximo descanso, dano mágico contra você é anulado pelo resolvedor da ficha."},
  "codex-uniao-transcendente": {"custo":{"esperanca":5},"entradaQuantidade":{"campo":"criaturasConectadas","rotulo":"Criaturas conectadas","minimo":2,"maximo":12,"ajuda":"Informe quantas criaturas voluntárias foram conectadas (mínimo 2)."},"marcaUso":{"chave":"uso:carta:codex:uniao-transcendente","maximo":1},"estado":{"chave":"estado:carta:codex:uniao-transcendente","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"União Transcendente ativa","rotuloEncerrar":"Encerrar União Transcendente","avisoEncerrar":"União Transcendente foi encerrada."},"rotuloAtivar":"Conectar criaturas · 5 Esperanças","lembrete":"Até o próximo descanso, quando uma criatura conectada for marcar Estresse ou PV, o grupo conectado escolhe quem marca."},
  "grace-encantar": {"custo":{"estresse":1},"marcaUso":{"chave":"uso:carta:grace:encantar","maximo":1},"rotuloAtivar":"Sucesso: forçar Estresse · 1 Estresse · 1/descanso","lembrete":"O alvo Encantado também marca 1 Estresse na mesa. A condição e o recurso do alvo não são gravados nesta ficha."},
  "grace-enganador-habil": {"custo":{"esperanca":1},"rotuloAtivar":"Usar Enganador Hábil · 1 Esperança","lembrete":"Faça com vantagem a jogada usada para enganar ou fazer alguém acreditar na mentira."},
  "grace-encrenqueiro": {"custo":{},"marcaUso":{"chave":"uso:carta:grace:encrenqueiro","maximo":1},"rotuloAtivar":"Sucesso: usar Encrenqueiro · 1/descanso","lembrete":"Role fora do app uma quantidade de d4 igual à Proficiência. O alvo marca Estresse igual ao maior resultado."},
  "grace-brilho-hipnotico": {"custo":{},"marcaUso":{"chave":"uso:carta:grace:brilho-hipnotico","maximo":1},"rotuloAtivar":"Sucesso: usar Brilho Hipnótico · 1/descanso","lembrete":"Cada alvo acertado marca 1 Estresse e fica temporariamente Atordoado na mesa."},
  "grace-invisibilidade": {"custo":{"estresse":1},"rotuloAtivar":"Sucesso: iniciar Invisibilidade · 1 Estresse","lembrete":"Coloque no contador de Invisibilidade marcadores iguais ao atributo de Conjuração. Gaste 1 por ação; ao gastar o último, encerre a condição no alvo."},
  "grace-discurso-acalmante": {"custo":{},"efeitoRecurso":{"chave":"pontosDeVidaMarcados","delta":-2},"rotuloAtivar":"Após cuidar de aliado: recuperar 2 PV","lembrete":"Use somente após Cuidar de Ferimentos em outro personagem durante descanso curto. Esse personagem também recupera 1 PV adicional."},
  "grace-pelos-seus-olhos": {"custo":{},"estado":{"chave":"estado:carta:grace:pelos-seus-olhos","valor":1,"permiteEncerrarManual":true,"encerraAoConjurarOutroFeitico":true,"rotuloAtivo":"Pelos Seus Olhos ativo","rotuloEncerrar":"Encerrar Pelos Seus Olhos","avisoEncerrar":"Pelos Seus Olhos encerrado."},"rotuloAtivar":"Ativar Pelos Seus Olhos","lembrete":"Escolha um alvo Muito Longo e registre-o na mesa. Encerra no próximo descanso ou ao conjurar outro feitiço."},
  "grace-mergulhador-de-pensamentos": {"custo":{"esperanca":1},"rotuloAtivar":"Ler pensamentos superficiais · 1 Esperança","lembrete":"Escolha um alvo Longo. Para pensamentos profundos, faça a Jogada de Conjuração fora do app; este botão representa apenas a leitura superficial."},
  "grace-nunca-ofuscado": {"custo":{"estresse":1},"entradaQuantidade":{"campo":"pontosDeVidaPerdidos","rotulo":"PV perdidos neste ataque","minimo":1,"maximo":12,"ajuda":"Informe quantos PV você marcou pelo ataque; a mesma quantidade deve ser adicionada ao contador Nunca Ofuscado."},"rotuloAtivar":"Registrar Nunca Ofuscado · 1 Estresse","lembrete":"Adicione ao contador Nunca Ofuscado marcadores iguais aos PV informados. No próximo ataque bem-sucedido, +5 de dano por marcador e depois zere o contador."},
  "grace-share-the-burden": {"custo":{},"marcaUso":{"chave":"uso:carta:grace:partilhar-o-fardo","maximo":1},"rotuloAtivar":"Registrar Partilhar o Fardo · 1/descanso","lembrete":"Transfira na mesa qualquer quantidade de Estresse do aliado voluntário Corpo a Corpo para você e ganhe 1 Esperança por Estresse transferido."},
  "grace-carisma-infinito": {"custo":{"esperanca":1},"rotuloAtivar":"Rerrolar Dado de Dualidade · 1 Esperança","lembrete":"Use somente após uma jogada para obter favor, mentir ou persuadir; rerrole o Dado de Esperança OU o Dado de Medo fora do app."},
  "grace-enfeiticar-em-massa": {"custo":{"estresse":1},"rotuloAtivar":"Encerrar Enfeitiçar em Massa · 1 Estresse","lembrete":"Use apenas enquanto o feitiço estiver ativo: todos os alvos Encantados marcam 1 Estresse e o feitiço termina."},
  "grace-projecao-astral": {"custo":{"estresse":1},"marcaUso":{"chave":"uso:carta:grace:projecao-astral","maximo":1},"estado":{"chave":"estado:carta:grace:projecao-astral","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Projeção Astral ativa","rotuloEncerrar":"Encerrar Projeção Astral","avisoEncerrar":"Projeção Astral encerrada."},"rotuloAtivar":"Criar Projeção Astral · 1 Estresse · 1/descanso longo","lembrete":"A projeção pode aparecer em qualquer lugar já visitado. Encerre manualmente se ela sofrer dano; qualquer descanso também encerra."},
  "grace-imitador": {"custo":{},"entradaQuantidade":{"campo":"nivelCartaCopiada","rotulo":"Nível da carta copiada","minimo":1,"maximo":8,"custoEsperancaFormula":"metade-arredonda-cima","ajuda":"O custo é metade do nível da carta, arredondado para cima."},"marcaUso":{"chave":"uso:carta:grace:imitador","maximo":1},"estado":{"chave":"estado:carta:grace:imitador","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Imitador ativo","rotuloEncerrar":"Encerrar Imitador","avisoEncerrar":"Imitador encerrado."},"rotuloAtivar":"Imitar carta · 1/descanso longo","lembrete":"Use a característica da carta escolhida até seu próximo descanso ou até o dono colocá-la no cofre."},
  "grace-notorio": {"custo":{"estresse":1},"rotuloAtivar":"Usar notoriedade · +10 · 1 Estresse","lembrete":"Receba +10 na jogada que usa sua notoriedade. Comida e bebida são gratuitas; para elas, acrescente o item à mochila sem compra paga."},
  "grace-reprise": {"custo":{},"moveParaCofre":true,"rotuloAtivar":"Sucesso com Medo: mover Reprise ao cofre","lembrete":"Use este botão somente após um sucesso com Medo. O dano repetido é igual ao dano que o aliado acabou de causar."},
  "midnight-chuva-de-laminas": {"custo":{"esperanca":1},"rotuloAtivar":"Conjurar Chuva de Lâminas · 1 Esperança","lembrete":"Após pagar, faça a Jogada de Conjuração fora do app. Dano: d8+2 mágico usando Proficiência; +1d8 contra cada alvo Vulnerável atingido."},
  "midnight-disfarce-incrivel": {"custo":{"estresse":1},"rotuloAtivar":"Iniciar Disfarce Incrível · 1 Estresse","lembrete":"Depois de pagar, coloque no contador Disfarce Incrível marcadores iguais ao traço de Conjuração. Gaste 1 por ação; o disfarce termina após a ação que gastar o último."},
  "midnight-espirito-da-meia-noite": {"custo":{"esperanca":1},"estado":{"chave":"estado:carta:midnight:espirito-da-meia-noite","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Espírito da Meia-Noite ativo","rotuloEncerrar":"Dissipar Espírito da Meia-Noite","avisoEncerrar":"Espírito da Meia-Noite dissipado."},"rotuloAtivar":"Invocar Espírito da Meia-Noite · 1 Esperança","lembrete":"Só um espírito por vez. Se atacar, faça a Jogada de Conjuração e o dano fora do app e depois dissipe o espírito; qualquer descanso também encerra."},
  "midnight-estrangulamento": {"custo":{"estresse":1},"rotuloAtivar":"Aplicar Estrangulamento · 1 Estresse","lembrete":"Use apenas estando atrás de uma criatura do seu tamanho. O alvo fica temporariamente Vulnerável e ataques contra ele causam +2d6 de dano enquanto essa condição vier do Estrangulamento."},
  "midnight-veu-da-noite": {"custo":{},"estado":{"chave":"estado:carta:midnight:veu-da-noite","valor":1,"permiteEncerrarManual":true,"encerraAoConjurarOutroFeitico":true,"rotuloAtivo":"Véu da Noite ativo","rotuloEncerrar":"Encerrar Véu da Noite","avisoEncerrar":"Véu da Noite encerrado."},"rotuloAtivar":"Sucesso: criar Véu da Noite","lembrete":"Use após sucesso na Jogada de Conjuração 13. Posicione a cortina na mesa; ela dura até você conjurar outra magia."},
  "midnight-expert-em-furtividade": {"custo":{"estresse":1},"rotuloAtivar":"Trocar Medo por Esperança · 1 Estresse","lembrete":"Use somente após você ou um aliado Próximo rolar com Medo ao tentar mover-se despercebido em uma área perigosa; trate o resultado como rolado com Esperança."},
  "midnight-glifo-do-crepusculo": {"custo":{"esperanca":1},"rotuloAtivar":"Sucesso: conjurar Glifo do Crepúsculo · 1 Esperança","lembrete":"Use após acertar a Jogada de Conjuração. Reduza temporariamente a Dificuldade do alvo em seu Conhecimento, com mínimo de 1."},
  "midnight-retirada-fantasma": {"custo":{},"opcoes":[{"id":"ativar","rotulo":"Ativar ponto de retorno","custo":{"esperanca":1},"lembrete":"Registre na mesa o local atual como ponto da Retirada Fantasma."},{"id":"retornar","rotulo":"Retornar ao ponto","custo":{"esperanca":1},"lembrete":"Use somente com Retirada Fantasma já ativa e antes do próximo descanso; reapareça no ponto registrado e encerre a magia."}],"rotuloAtivar":"Usar Retirada Fantasma","lembrete":"A posição do ponto de retorno permanece na mesa; cada uma das duas etapas custa 1 Esperança."},
  "midnight-silencio": {"custo":{"esperanca":1},"rotuloAtivar":"Sucesso: conjurar Silêncio · 1 Esperança","lembrete":"Use após sucesso contra um alvo Próximo. A área Muito Próxima ao alvo fica Silenciada até um dos gatilhos descritos na carta."},
  "midnight-disfarce-em-massa": {"custo":{"estresse":1},"estado":{"chave":"carta:midnight-disfarce-em-massa","valor":8,"permiteEncerrarManual":true,"rotuloAtivo":"Disfarce em Massa ativo","rotuloEncerrar":"Encerrar Disfarce em Massa","avisoEncerrar":"Disfarce em Massa encerrado."},"rotuloAtivar":"Criar Disfarce em Massa · 1 Estresse","lembrete":"A Contagem Regressiva começa em 8. Reduza-a quando a consequência definida pelo Mestre ocorrer; em 0, o disfarce termina."},
  "midnight-sussurros-sombrios": {"custo":{"estresse":1},"rotuloAtivar":"Sondar pelos Sussurros · 1 Estresse","lembrete":"Use para a parte de sondagem após existir contato físico com o alvo. Faça a Jogada de Conjuração fora do app e, em sucesso, faça uma das quatro perguntas ao Mestre."},
  "midnight-esquiva-desaparecente": {"custo":{"esperanca":1},"estado":{"chave":"estado:carta:midnight:esquiva-desaparecente","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Esquiva Desaparecente ativa","rotuloEncerrar":"Encerrar após a próxima ação","avisoEncerrar":"Esquiva Desaparecente encerrada."},"rotuloAtivar":"Ataque físico falhou: desaparecer · 1 Esperança","lembrete":"Teleporte para Próximo do atacante e fique Oculto até sua próxima jogada de ação; depois encerre este estado."},
  "midnight-tocado-pela-meia-noite": {"custo":{"estresse":1},"exigeCartasAtivasDominio":{"dominio":"MIDNIGHT","quantidade":4},"rotuloAtivar":"Somar Dado de Medo ao dano · 1 Estresse","lembrete":"Use após um ataque bem-sucedido com 4+ cartas de Meia-Noite ativas; some ao dano o resultado do seu Dado de Medo rolado fora do app."},
  "midnight-terror-noturno": {"custo":{},"marcaUso":{"chave":"uso:carta:midnight:terror-noturno","maximo":1},"rotuloAtivar":"Registrar Terror Noturno · 1/descanso longo","lembrete":"Resolva Reações 16 e Medo do Mestre na mesa. Alvos que falham ficam Aterrorizados/Vulneráveis e recebem o dano dos d6 rolados fora do app."},
  "midnight-eclipse": {"custo":{},"marcaUso":{"chave":"uso:carta:midnight:eclipse","maximo":1},"estado":{"chave":"estado:carta:midnight:eclipse","valor":1,"permiteEncerrarManual":true,"rotuloAtivo":"Eclipse ativo","rotuloEncerrar":"Encerrar Eclipse","avisoEncerrar":"Eclipse encerrado."},"rotuloAtivar":"Sucesso: ativar Eclipse · 1/descanso longo","lembrete":"Use após sucesso na Jogada de Magia 16. Encerre quando o Mestre gastar 1 Medo em seu turno ou quando você sofrer dano Grave."},
  "midnight-espectro-da-escuridao": {"custo":{"estresse":1},"estado":{"chave":"estado:carta:midnight:espectro-da-escuridao","valor":1,"permiteEncerrarManual":true,"imunidadeDano":"fisico","rotuloAtivo":"Espectro da Escuridão ativo","rotuloEncerrar":"Encerrar forma Espectral","avisoEncerrar":"Forma Espectral encerrada."},"rotuloAtivar":"Tornar-se Espectral · 1 Estresse","lembrete":"Enquanto ativo, dano físico é anulado pelo app. Encerre após uma jogada de ação que tenha outra criatura como alvo."},
  "splendor-farol-brilhante": {"custo":{"esperanca":1},"rotuloAtivar":"Sucesso: Farol Brilhante · 1 Esperança","lembrete":"Depois do sucesso, role o dano fora do app e deixe o alvo temporariamente Vulnerável e brilhando. O efeito no alvo é resolvido na mesa."},
  "splendor-reforco": {"custo":{},"marcaUso":{"chave":"uso:carta:splendor:reforco","maximo":1},"rotuloAtivar":"Usar Reforço · 1/descanso","lembrete":"O aliado refaz a jogada na mesa antes de as consequências serem aplicadas."},
  "splendor-toque-curativo": {"custo":{},"opcoes":[{"id":"normal","rotulo":"Toque Curativo · 2 Esperanças","custo":{"esperanca":2},"lembrete":"Passe alguns minutos tratando a criatura tocada; ela recupera 1 PV ou limpa 1 Estresse na mesa."},{"id":"vinculo","rotulo":"Vínculo profundo · 2 Esperanças · 1/descanso longo","custo":{"esperanca":2},"marcaUso":{"chave":"uso:carta:splendor:toque-curativo-vinculo","maximo":1},"lembrete":"Depois de revelar algo sobre si ou descobrir algo sobre o alvo, ele recupera 2 PV ou limpa 2 Estresses na mesa."}],"rotuloAtivar":"Usar Toque Curativo"},
  "splendor-maos-curativas": {"custo":{},"opcoes":[{"id":"sucesso","rotulo":"Sucesso · marcar 1 Estresse","custo":{"estresse":1},"lembrete":"A criatura em Corpo a Corpo recupera 2 PV ou limpa 2 Estresses. Ela não pode receber Mãos Curativas de você outra vez até o próximo descanso longo."},{"id":"falha","rotulo":"Falha · marcar 1 Estresse","custo":{"estresse":1},"lembrete":"Mesmo na falha, a criatura recupera 1 PV ou limpa 1 Estresse. Ela não pode receber Mãos Curativas de você outra vez até o próximo descanso longo."}],"rotuloAtivar":"Resolver Mãos Curativas"},
  "splendor-segundo-folego": {"custo":{},"marcaUso":{"chave":"uso:carta:splendor:segundo-folego","maximo":1},"opcoes":[{"id":"pv","rotulo":"Recuperar 1 PV","efeitoRecurso":{"chave":"pontosDeVidaMarcados","delta":-1},"lembrete":"Depois do ataque bem-sucedido, recupere 1 PV. Se foi sucesso com Esperança, um aliado Próximo também pode recuperar 1 PV ou limpar 3 Estresses na mesa."},{"id":"estresse","rotulo":"Limpar 3 Estresses","efeitoRecurso":{"chave":"estresseMarcado","delta":-3},"lembrete":"Depois do ataque bem-sucedido, limpe 3 Estresses. Se foi sucesso com Esperança, um aliado Próximo também pode recuperar 1 PV ou limpar 3 Estresses na mesa."}],"rotuloAtivar":"Usar Segundo Fôlego · 1/descanso"},
  "splendor-adivinhacao": {"custo":{"esperanca":3},"marcaUso":{"chave":"uso:carta:splendor:adivinhacao","maximo":1},"rotuloAtivar":"Usar Adivinhação · 3 Esperanças","lembrete":"Faça uma pergunta de sim ou não sobre um evento no futuro próximo; o Mestre responde de forma verdadeira."},
  "splendor-guardiao-da-vida": {"custo":{"esperanca":3},"rotuloAtivar":"Conjurar Guardião da Vida · 3 Esperanças","lembrete":"Escolha um aliado Próximo e registre o sigilo na mesa. No próximo movimento de morte dele, ele recupera 1 PV em vez de fazer o movimento; o sigilo então termina."},
  "splendor-golpe-divino": {"custo":{"esperanca":3},"marcaUso":{"chave":"uso:carta:splendor:golpe-divino","maximo":1},"estado":{"chave":"estado:carta:splendor:golpe-divino","valor":1,"rotuloAtivo":"Golpe Divino carregado","rotuloEncerrar":"Consumir Golpe Divino","avisoEncerrar":"Golpe Divino consumido no próximo ataque de arma bem-sucedido."},"rotuloAtivar":"Carregar Golpe Divino · 3 Esperanças","lembrete":"No próximo ataque de arma bem-sucedido, dobre o resultado da rolagem de dano e trate o ataque como dano mágico; depois encerre a carga."},
  "splendor-moldar-material": {"custo":{"esperanca":1},"rotuloAtivar":"Moldar material · 1 Esperança","lembrete":"Molde apenas material natural tocado, em uma área não maior que você e Próxima ao ponto de contato."},
  "splendor-zona-de-protecao": {"custo":{},"marcaUso":{"chave":"uso:carta:splendor:zona-de-protecao","maximo":1},"estado":{"chave":"carta:splendor-zona-de-protecao","valor":1,"rotuloAtivo":"Zona de Proteção ativa","rotuloEncerrar":"Encerrar Zona de Proteção","avisoEncerrar":"Zona de Proteção encerrada."},"rotuloAtivar":"Sucesso: criar Zona de Proteção · 1/descanso longo","lembrete":"Comece o d6 em 1. Quando um aliado na zona sofrer dano, reduza pelo valor atual e depois aumente o dado em 1; ao passar de 6, encerre."},
  "splendor-golpe-curativo": {"custo":{"esperanca":2},"rotuloAtivar":"Após causar dano: curar aliado · 2 Esperanças","lembrete":"Um aliado Próximo recupera 1 PV. A cura é aplicada na ficha do alvo/na mesa."},
  "splendor-tocado-do-esplendor": {"custo":{},"exigeCartasAtivasDominio":{"dominio":"SPLENDOR","quantidade":4},"marcaUso":{"chave":"uso:carta:splendor:tocado-do-esplendor","maximo":1},"rotuloAtivar":"Registrar substituição de PV · 1/descanso longo","lembrete":"Substitua todos os PV exigidos por esse dano pela mesma quantidade de Fadiga OU Esperança. Ajuste as trilhas conforme a opção escolhida."},
  "splendor-aura-de-escudo": {"custo":{"estresse":1},"estado":{"chave":"estado:carta:splendor:aura-de-escudo","valor":1,"rotuloAtivo":"Aura de Escudo mantida","rotuloEncerrar":"Encerrar Aura de Escudo","avisoEncerrar":"Aura de Escudo encerrada."},"rotuloAtivar":"Conjurar Aura de Escudo · 1 Estresse","lembrete":"Registre na mesa qual criatura Muito Próxima é o alvo. Só uma criatura pode ter sua aura por vez."},
  "splendor-luz-ofuscante": {"custo":{},"entradaQuantidade":{"campo":"esperancasGastas","rotulo":"Esperanças / alvos escolhidos","minimo":1,"maximo":6,"custoPorUnidade":{"esperanca":1},"ajuda":"Informe quantos alvos atingidos você quer forçar a fazer o jogada de reação; gaste 1 Esperança por alvo."},"rotuloAtivar":"Sucesso: resolver Luz Ofuscante","lembrete":"Cada alvo escolhido faz Reação 14. Sucesso: 3d20+3 mágico. Falha: 4d20+5 mágico e Atordoado temporariamente."},
  "splendor-aura-avassaladora": {"custo":{"esperanca":2},"estado":{"chave":"estado:carta:splendor:aura-avassaladora","valor":1,"rotuloAtivo":"Aura Avassaladora ativa","rotuloEncerrar":"Encerrar Aura Avassaladora","avisoEncerrar":"Aura Avassaladora encerrada."},"rotuloAtivar":"Sucesso: ativar Aura Avassaladora · 2 Esperanças","lembrete":"Até o próximo descanso longo, sua Presença é igual ao atributo de Conjuração; adversários marcam 1 Fadiga ao escolher você como alvo de ataque."},
  "splendor-raio-da-salvacao": {"custo":{},"entradaQuantidade":{"campo":"estressesMarcados","rotulo":"Estresses a marcar / PV totais","minimo":1,"maximo":12,"custoPorUnidade":{"estresse":1},"ajuda":"Cada Estresse efetivamente marcado gera 1 PV de cura para distribuir entre os aliados elegíveis."},"quantidadeLigadaAoEstresse":true,"rotuloAtivar":"Sucesso: canalizar Raio da Salvação","lembrete":"Distribua entre os aliados em linha e alcance Distante PV totais iguais ao Estresse efetivamente marcado."},
  "splendor-revigoramento": {"custo":{},"entradaQuantidade":{"campo":"esperancasGastas","rotulo":"Esperanças / d6 a rolar","minimo":1,"maximo":6,"custoPorUnidade":{"esperanca":1},"ajuda":"Gaste qualquer quantidade de Esperança e role o mesmo número de d6 fora do app."},"rotuloAtivar":"Usar Revigoramento","lembrete":"Role 1d6 por Esperança gasta. Se qualquer dado resultar em 6, a habilidade limitada escolhida pode ser usada novamente."},
};

/** Regras estruturais especiais de cartas de domínio. */
const REGRAS_ESPECIAIS_CARTAS_DOMINIO = {
  "grace-notorio": {"loadout":{"naoContaNoLimite":true,"naoPodeIrAoCofre":true},"compra":{"descontoBolsas":1,"minimoPunhados":1,"comidaBebidaGratis":true}},
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
  "grace-tocado-pela-graca": {"exigeCartasAtivasDominio":{"dominio":"GRACE","quantidade":4},"podeMarcarArmaduraEmVezDeEstresse":true,"podeTrocarPvDoAlvoPorEstresse":true},
  "midnight-tocado-pela-meia-noite": {"exigeCartasAtivasDominio":{"dominio":"MIDNIGHT","quantidade":4},"podeConverterMedoMestreEmEsperancaComEsperancaZero":true,"podeSomarDadoMedoAoDanoPorEstresse":true},
  "splendor-tocado-do-esplendor": {"bonusLimiarGrave":3,"exigeCartasAtivasDominio":{"dominio":"SPLENDOR","quantidade":4}},
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

/** Regras estruturais especiais publicadas pelo catálogo. */
function regraEspecialDaCarta_(idOuNome) {
  if (typeof REGRAS_ESPECIAIS_CARTAS_DOMINIO === 'undefined') return {};
  const c = acharCarta_(idOuNome);
  return c ? (REGRAS_ESPECIAIS_CARTAS_DOMINIO[c.id] || {}) : {};
}

function cartaContaNoLimite_(idOuNome) {
  const e = regraEspecialDaCarta_(idOuNome);
  return !((e.loadout || {}).naoContaNoLimite === true);
}

function cartaPodeIrAoCofre_(idOuNome) {
  const e = regraEspecialDaCarta_(idOuNome);
  return !((e.loadout || {}).naoPodeIrAoCofre === true);
}

function quantidadeCartasQueContamNoLimite_(lista) {
  let n = 0;
  (lista || []).forEach(function (x) {
    const bruto = (x && typeof x === 'object') ? (x.id || x.nome) : x;
    if (cartaContaNoLimite_(bruto)) n++;
  });
  return n;
}

function regraCompraDasCartasAtivas_(ficha) {
  const ativas = (((ficha || {}).cartas || {}).ativas || []);
  for (let i = 0; i < ativas.length; i++) {
    const bruto = (ativas[i] && typeof ativas[i] === 'object') ? (ativas[i].id || ativas[i].nome) : ativas[i];
    const e = regraEspecialDaCarta_(bruto);
    if (e.compra) return e.compra;
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
      if (ondeEsta === 'cofre' && !cartaPodeIrAoCofre_(r.carta.id)) {
        erros.push('"' + r.carta.nome + '" não pode ser colocada no cofre.');
        return;
      }
      vistas[r.carta.id] = ondeEsta;
    });
  };
  conferir(ativas, 'ativa');
  conferir(cofre, 'cofre');
  const ativasQueContam = quantidadeCartasQueContamNoLimite_(ativas || []);
  if (ativasQueContam > MAX_CARTAS_ATIVAS) {
    erros.push('São no máximo ' + MAX_CARTAS_ATIVAS + ' cartas ativas que contam no limite; o resto vai para o cofre.');
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
