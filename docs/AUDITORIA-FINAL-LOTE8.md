# Varredura final do Lote 8 — inventário de revisão

> Gerado por `tools/auditar-pendencias-lote8.py` na branch de trabalho.
> “Candidato” significa **precisa ser revisado**, não “bug confirmado”.

## Resumo numérico

- Classes/subclasses: **99 características**; **25** candidatas sem sinal de automação.
- Comunidades: **9 características**; **0** candidatas sem sinal de automação.
- Cartas de domínio: **189 cartas**; **161** candidatas sem sinal de automação específica; **17** já têm contador/estado parcial.
- Características de armas/armaduras/molduras: **203 ocorrências**; **87** ocorrências candidatas ativas/condicionais.
- Loot/consumíveis com texto mecânico detectado: **81**.
- Marcadores documentais no HANDOFF (“próximo”, “pendente”, “aberto” etc.): **12** linhas, incluindo histórico já resolvido.

### Distribuição — classes/subclasses

- candidato sem sinal de automação: **25**
- estruturada/contador: **54**
- predominantemente narrativo/sem gatilho detectado: **7**
- referência específica no motor: **13**

### Distribuição — comunidades

- estruturada/contador: **9**

### Distribuição — cartas

- candidato sem sinal de automação específica: **161**
- contador/estado estruturado (efeito completo ainda deve ser conferido): **17**
- referência específica no motor: **11**

### Distribuição — equipamento

- candidato ativo/condicional sem estrutura: **87**
- efeito derivado estruturado: **69**
- referência específica no motor: **28**
- sem gatilho mecânico detectado: **19**

## Candidatos — classes e subclasses

| Classe | Subclasse | Estágio | Característica | Trecho |
|---|---|---|---|---|
| Guardião | Vingança | especializacao | Ato de Retaliação | Quando um adversário causar dano a um aliado em alcance Corpo a Corpo, você ganha +1 de bônus na sua Proficiência para o próximo ataque bem-sucedido contra esse adversár… |
| Guerreiro |  | Classe | Ataque de Oportunidade | Se um adversário Corpo a Corpo tentar sair desse alcance, faça uma jogada de reação usando um traço à sua escolha contra a Dificuldade dele. Em um sucesso, escolha um ef… |
| Guerreiro | Chamada dos Bravos | fundacao | Coragem | Quando você falhar em uma jogada com Medo, ganha 1 Esperança. |
| Guerreiro | Chamada dos Bravos | especializacao | Superação do Desafio | Você é vigilante diante do perigo crescente. Enquanto tiver 2 ou menos Pontos de Vida não marcados, pode rolar um d20 como seu Dado de Esperança. |
| Guerreiro | Chamada dos Bravos | maestria | Camaradagem | Sua coragem inabalável é um ponto de união para seus aliados. Você pode iniciar uma Jogada em Equipe mais 1 vez por sessão. Além disso, quando um aliado iniciar uma Joga… |
| Guerreiro | Chamada do Matador | maestria | Preparação Marcial | Você é um guerreiro inspirador para todos que viajam com você. Seu grupo ganha acesso ao movimento de tempo livre Preparação Marcial. Para usar esse movimento durante um… |
| Ladino | Caminhante Noturno | fundacao | Passo Sombrio | Você pode se mover de sombra em sombra. Quando se mover para uma área de escuridão ou uma sombra projetada por outra criatura ou objeto, pode marcar 1 Estresse para desa… |
| Ladino | Caminhante Noturno | especializacao | Nuvem Sombria | Faça uma Jogada de Magia (15). Em caso de sucesso, crie uma nuvem sombria temporária que cobre qualquer área em alcance Próximo. Quem estiver dentro dessa nuvem não pode… |
| Ladino | Caminhante Noturno | maestria | Ato de Desaparecimento | Marque 1 Estresse para ficar Encoberto a qualquer momento. Enquanto estiver Encoberto por essa habilidade, você automaticamente remove a condição Imobilizado, se estiver… |
| Mago | Escola do Conhecimento | fundacao | Preparado | Pegue uma carta de domínio adicional de seu nível ou inferior de um domínio ao qual você tenha acesso. |
| Mago | Escola do Conhecimento | especializacao | Realizado | Pegue uma carta de domínio adicional de seu nível ou inferior de um domínio ao qual você tenha acesso. |
| Mago | Escola do Conhecimento | maestria | Brilhante | Pegue uma carta de domínio adicional de seu nível ou inferior de um domínio ao qual você tenha acesso. |
| Mago | Escola do Conhecimento | maestria | Especialização Apurada | Quando usar uma Experiência, role um d6. Com um resultado de 5 ou mais, você pode usá-la sem gastar Esperança. |
| Mago | Escola da Guerra | fundacao | Enfrente Seu Medo | Quando você acertar uma jogada de ataque com Medo, cause 1d10 de dano mágico extra. |
| Mago | Escola da Guerra | especializacao | Movido pelo Medo | O dano mágico extra da sua habilidade Enfrente Seu Medo aumenta para 2d10. |
| Mago | Escola da Guerra | maestria | Prosperar no Caos | Quando você acertar um ataque, pode marcar 1 Estresse após rolar o dano para forçar o alvo a marcar um Ponto de Vida adicional. |
| Caçador | Laço Bestial | especializacao | Vínculo de Batalha | Quando um adversário atacar você enquanto estiver dentro do alcance Corpo a Corpo do seu companheiro, você ganha +2 de bônus em sua Evasão contra esse ataque. |
| Caçador | Explorador | fundacao | Predador Implacável | Quando fizer uma jogada de dano, você pode marcar 1 Estresse para ganhar +1 de bônus na sua Proficiência. Além disso, quando causar dano Severo a um adversário, ele deve… |
| Caçador | Explorador | especializacao | Predador Elusivo | Quando seu Foco fizer um ataque contra você, você ganha +2 de bônus na sua Evasão contra esse ataque. |
| Caçador | Explorador | maestria | Predador de Topo | Antes de fazer uma jogada de ataque contra seu Foco, você pode gastar 1 Esperança. Em um ataque bem-sucedido, você remove 1 Medo da reserva de Medo do Mestre. |
| Serafim | Portador Divino | fundacao | Arma Espiritual | Quando você estiver com uma arma equipada com alcance Corpo a Corpo ou Muito Próximo, ela pode voar de sua mão para atacar um adversário em alcance Próximo e depois reto… |
| Serafim | Portador Divino | maestria | Ressonância Sagrada | Quando você rolar dano para a habilidade Arma Espiritual, se algum dos resultados dos dados for igual, dobre o valor de cada dado correspondente. Por exemplo, se você ro… |
| Serafim | Sentinela Alado | fundacao | Asas de Luz | Você pode voar. Enquanto estiver voando, pode fazer o seguinte: • Marque 1 Estresse para pegar e carregar outra criatura disposta de tamanho aproximado ao seu ou menor. … |
| Serafim | Sentinela Alado | especializacao | Vulto Etéreo | Seu vulto sobrenatural inspira admiração e medo. Enquanto estiver voando, você tem vantagem em Jogadas de Presença. Quando tiver sucesso com Esperança em uma Jogada de P… |
| Serafim | Sentinela Alado | maestria | Poder dos Deuses | Enquanto estiver voando, você causa 1d12 de dano extra em vez de 1d8 com sua habilidade Asas de Luz. |

## Candidatos — comunidades

| Comunidade | Característica | Trecho |
|---|---|---|

## Candidatos — cartas de domínio sem sinal de automação específica

| Domínio | Nível | Carta | Dependências | Trecho |
|---|---:|---|---|---|
| Arcana | 1 | Andar na Parede | esperanca | Gaste uma Esperança para permitir que uma criatura que você possa tocar escale paredes e tetos tão facilmente quanto anda no chão. Isso dura até o final da cena ou até v… |
| Arcana | 1 | Talismã Rúnico | esperanca | Você tem um amuleto profundamente pessoal que pode ser imbuído com magia protetora e mantido como um talismã por você ou um aliado. Descreva o que ele é e por que é impo… |
| Arcana | 2 | Aperto de Cinzas | condicoes | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Corpo a Corpo. Em caso de sucesso, o alvo entra instantaneamente em chamas, sofre 1d20+3 de dano mágico e … |
| Arcana | 2 | Olho Flutuante | esperanca | Gaste uma Esperança para criar uma única e pequena orbe flutuante que você pode mover para qualquer lugar dentro do alcance Muito Distante. Enquanto este feitiço estiver… |
| Arcana | 3 | Contra-Feitiço | cofre_e_loadout | Você pode interromper um efeito mágico em andamento fazendo uma jogada de reação usando seu atributo Conjuração. Em caso de sucesso, o efeito é interrompido e quaisquer … |
| Arcana | 4 | Desaparecer | esperanca | Faça uma Jogada de Conjuração (12). Em caso de sucesso, gaste uma Esperança para se teleportar para outro ponto que você possa ver dentro do alcance Distante. Se houver … |
| Arcana | 4 | Explosão de Preservação |  | Faça uma Jogada de Conjuração contra todos os alvos dentro do alcance Corpo a Corpo. Os alvos contra os quais você obtiver sucesso são forçados para o alcance Distante e… |
| Arcana | 5 | Premonição | descansos | Você pode canalizar energia arcana para ter visões do futuro. Uma vez por descanso longo, imediatamente após o Mestre narrar as consequências de uma jogada que você fez,… |
| Arcana | 5 | Relâmpago em Cadeia | estresse | Marque 2 Estresse para fazer uma Jogada de Conjuração, desencadeando relâmpagos em todos os alvos dentro do alcance Próximo. Os alvos contra os quais você obtiver sucess… |
| Arcana | 6 | Andarilho do Abismo |  | Faça uma Jogada de Conjuração (15). Em caso de sucesso, você coloca uma marcação arcana no chão onde você está atualmente. Na próxima vez que você conjurar com sucesso A… |
| Arcana | 6 | Telecinese | proficiencia | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Distante. Em caso de sucesso, você pode usar sua mente para movê-lo para qualquer lugar dentro do alcance … |
| Arcana | 7 | Explosão de Camuflagem | condicoes, esperanca | Quando você fizer uma Jogada de Conjuração bem-sucedida para conjurar um feitiço diferente, pode gastar uma Esperança para ficar Camuflado. Enquanto estiver Camuflado, v… |
| Arcana | 7 | Tocado pela Arcana | descansos, medo, esperanca, cofre_e_loadout | Quando 4 ou mais das cartas de domínio no seu equipamento forem do domínio Arcana, ganhe os seguintes benefícios: +1 de bônus nas suas Jogadas de Conjuração Uma vez por … |
| Arcana | 8 | Aura Confusa | descansos, estresse | Faça uma Jogada de Conjuração (14). Uma vez por descanso longo, em caso de sucesso, você cria uma camada de ilusão sobre seu corpo que dificulta saber exatamente onde vo… |
| Arcana | 8 | Reflexo Arcano | esperanca | Quando você for receber dano mágico, pode gastar qualquer número de Esperança para rolar essa quantidade de d6. Se algum deles resultar em 6, o ataque é refletido de vol… |
| Arcana | 9 | Projeção Sensorial | descansos | Uma vez por descanso, faça uma Jogada de Conjuração (15). Em caso de sucesso, você entra em uma visão que permite ver e ouvir claramente qualquer lugar onde já esteve, c… |
| Arcana | 9 | Terremoto | descansos | Faça uma Jogada de Conjuração (16). Uma vez por descanso, em caso de sucesso, todos os alvos dentro do alcance Muito Distante que não estiverem voando devem fazer uma Jo… |
| Arcana | 10 | Ajustar a Realidade | esperanca | Depois que você ou um aliado disposto fizer qualquer jogada, você pode gastar 5 de Esperança para mudar o resultado numérico dessa jogada para um resultado de sua escolh… |
| Arcana | 10 | Queda do Céu | estresse | Faça uma Jogada de Conjuração contra todos os adversários dentro do alcance Distante. Marque qualquer número de Estresse para fazer fragmentos de arcana choverem de cima… |
| Lâmina | 1 | Levantar-Se | limiares, estresse | Quando você sofrer dano Severo, pode marcar um Estresse para reduzir a severidade em um nível. |
| Lâmina | 1 | Não Foi Suficiente |  | Quando você rolar seus dados de dano, pode rerrolar quaisquer 1 ou 2. |
| Lâmina | 2 | Imprudente | estresse, vantagem | Marque um Estresse para ganhar vantagem em um ataque. |
| Lâmina | 2 | Laço de Soldado | descansos, esperanca | Uma vez por descanso longo, quando você elogiar alguém ou perguntar sobre algo em que essa pessoa é boa, vocês dois podem ganhar 3 de Esperança. |
| Lâmina | 3 | Confusão | descansos | Uma vez por descanso, quando uma criatura dentro do alcance Corpo a Corpo for causar dano em você, você pode evitar o ataque e se mover com segurança para fora do alcanc… |
| Lâmina | 3 | Lutador Versátil | estresse | Você pode usar um atributo diferente para uma arma equipada, em vez do atributo que a arma exige. Quando causar dano, pode marcar um Estresse para usar o resultado máxim… |
| Lâmina | 4 | Armadura Fortificada | limiares | Enquanto você estiver usando armadura, ganhe +2 de bônus em seus limiares de dano. |
| Lâmina | 4 | Foco Mortal | descansos, proficiencia | Uma vez por descanso, você pode concentrar toda sua atenção em um alvo de sua escolha. Até atacar outra criatura, derrotar o alvo ou a batalha terminar, ganhe +1 de bônu… |
| Lâmina | 5 | Vantagem do Campeão | armadura, esperanca, pontos_de_vida, criticos | Quando você obtiver um sucesso crítico em um ataque, pode gastar até 3 de Esperança e escolher uma das seguintes opções para cada Esperança gasta: • Você limpa um Ponto … |
| Lâmina | 6 | Endurecido pela Batalha | descansos, esperanca, pontos_de_vida, movimento_de_morte | Uma vez por descanso longo, quando você for fazer um Movimento de Morte, pode gastar uma Esperança para limpar um Ponto de Vida no lugar. |
| Lâmina | 6 | Fúria Crescente | estresse | Antes de fazer um ataque, você pode marcar um Estresse para ganhar um bônus na sua rolagem de dano igual ao dobro do seu atributo Força. Você pode usar Fúria Crescente d… |
| Lâmina | 7 | Golpe Raso | proficiencia, estresse | Quando você falhar em um ataque, pode marcar um Estresse para causar dano de arma usando metade da sua Proficiência. |
| Lâmina | 7 | Tocado pela Lâmina | limiares, cofre_e_loadout | Quando 4 ou mais das cartas de domínio no seu equipamento forem do domínio Lâmina, ganhe os seguintes benefícios: • +2 de bônus nas suas jogadas de ataque • +4 de bônus … |
| Lâmina | 8 | Frenesi | armadura, limiares, descansos | Uma vez por descanso longo, você pode entrar em Frenesi até que não haja mais adversários à vista. Enquanto estiver em Frenesi, você não pode usar Espaços de Armadura, e… |
| Lâmina | 8 | Grito de Batalha | descansos, medo, esperanca, estresse, vantagem | Uma vez por descanso longo, enquanto você avança para o perigo, pode emitir um chamado inspirador que motiva seus aliados. Todos os aliados que puderem ouvi-lo limpam um… |
| Lâmina | 9 | Golpe do Ceifador | descansos, esperanca, pontos_de_vida | Uma vez por descanso longo, gaste uma Esperança para fazer uma jogada de ataque. O Mestre indica contra quais alvos dentro do alcance a jogada teria sucesso. Escolha um … |
| Lâmina | 9 | Sangue e Glória | esperanca, estresse, criticos | Quando você obtiver um sucesso crítico em um ataque com arma, ganhe uma Esperança adicional ou limpe um Estresse adicional. Além disso, quando causar dano suficiente par… |
| Lâmina | 10 | Massacre | limiares, estresse, pontos_de_vida | Quando você fizer um ataque bem-sucedido com sua arma, você nunca causará dano abaixo do limiar de dano Maior do alvo (o alvo sempre marca no mínimo 2 Pontos de Vida). A… |
| Lâmina | 10 | Monstro de Batalha | estresse, pontos_de_vida | Quando você fizer um ataque bem-sucedido contra um adversário, pode marcar 4 de Estresse para forçar o alvo a marcar um número de Pontos de Vida igual ao número de Ponto… |
| Osso | 1 | Eu Vi Chegando | estresse | Quando você for alvo de um ataque feito de fora do alcance Corpo a Corpo, você pode marcar Estresse para rolar um D4 e receber um bônus à sua Evasão igual ao resultado c… |
| Osso | 1 | Intocável |  | você recebe um bônus na sua evasão igual à metade do seu atributo de agilidade. |
| Osso | 1 | Manobras Ágeis | descansos, estresse | Uma vez por descanso, marque 1 Estresse para disparar até qualquer ponto dentro do alcance Longo sem precisar fazer uma jogada de Agilidade para chegar lá. Se terminar e… |
| Osso | 2 | Ferocidade | esperanca, pontos_de_vida | quando você faz um adversário marcar 1 ou mais pontos de vida, pode gastar 2 esperança para aumentar sua evasão em um valor igual aos pontos de vida que ele marcou. esse… |
| Osso | 3 | Tático | experiencias, esperanca, jogada_em_equipe, vantagem | Quando você ajudar um aliado, ele pode gastar uma Esperança para adicionar uma de suas Experiências à jogada, junto com seu dado de vantagem. Ao fazer uma Jogada em Equi… |
| Osso | 4 | Impulso | estresse, vantagem | Marque um Estresse para se lançar a partir de um aliado disposto dentro do alcance Próximo, arremesse-se no ar e faça um ataque aéreo contra um alvo dentro do alcance Di… |
| Osso | 4 | Redirecionar | proficiencia, estresse | Quando um ataque feito contra você de além do alcance Corpo a Corpo falhar, role um número de d6 igual à sua Proficiência. Se algum resultar em 6, você pode marcar um Es… |
| Osso | 5 | Conheça Teu Inimigo | limiares, experiencias, medo, esperanca, estresse, pontos_de_vida, cofre_e_loadout | Ao observar uma criatura, você pode fazer uma Jogada de Instinto contra ela. Em caso de sucesso, gaste uma Esperança e pergunte ao GM um dos seguintes conjuntos de infor… |
| Osso | 5 | Golpe Assinatura | descansos, esperanca, estresse | Dê um nome e descreva seu golpe característico de combate. Uma vez por descanso, ao realizar esse golpe assinatura como parte de uma ação que você está executando, você … |
| Osso | 6 | Recuperação | descansos, esperanca | Durante um descanso curto, você pode escolher uma ação de descanso de descanso longo em vez disso. Você pode gastar uma Esperança para permitir que um aliado faça o mesm… |
| Osso | 6 | Resposta Rápida | estresse | Quando um ataque feito contra você em Alcance Corpo a Corpo falha, você pode marcar um Estresse e aproveitar a oportunidade para causar o dano da arma de uma de suas arm… |
| Osso | 7 | Precisão Cruel |  | Quando você realiza um ataque bem-sucedido com uma arma, ganha um bônus na sua rolagem de dano igual à sua Destreza ou Agilidade. |
| Osso | 7 | Tocado pelo Osso | descansos, esperanca, cofre_e_loadout | Quando 4 ou mais das cartas de domínio no seu loadout forem do domínio Osso, você recebe os seguintes benefícios: • +1 de bônus em Agilidade • Uma vez por descanso, você… |
| Osso | 8 | Dominar | esperanca | Realize uma Jogada de Agilidade contra todos os alvos dentro do alcance Próximo. Você pode gastar 1 Esperança para mover os alvos nos quais teve sucesso, assim como quai… |
| Osso | 8 | Golpe Arrasador | estresse | Quando você realiza um ataque bem-sucedido, pode marcar 1 Estresse para fazer com que o próximo ataque bem-sucedido contra o mesmo alvo cause 2d12 de dano adicional. |
| Osso | 9 | Golpe Estilhaçante | descansos, esperanca | Gaste 1 ponto de Esperança e faça um ataque contra todos os adversários dentro do alcance da sua arma. Uma vez por descanso longo, se tiver sucesso contra qualquer um do… |
| Osso | 9 | Na Beira | limiares, pontos_de_vida | Enquanto você tiver 2 ou menos Pontos de Vida desmarcados, você não sofre dano Menor. |
| Osso | 10 | Corrida da Morte | proficiencia, esperanca | Gaste 3 esperança para correr em linha reta pelo campo de batalha até um ponto dentro do alcance distante, fazendo um ataque contra todos os adversários dentro do alcanc… |
| Osso | 10 | Passo Ágil | esperanca, estresse | Quando um ataque feito contra você falhar, limpe um Estresse. Se não puder limpar um Estresse, ganhe uma Esperança. |
| Códice | 1 | Livro de Ava | armadura, proficiencia, esperanca | **Impulso Poderoso:** Faça uma jogada de Spellcast contra um alvo dentro do alcance Corpo a Corpo. Em caso de sucesso, ele é lançado para trás até o alcance Distante e s… |
| Códice | 1 | Livro de Illiat | condicoes, descansos, medo, esperanca | **Sono:** Faça uma jogada de Spellcast contra um alvo dentro do alcance Muito Próximo. Em caso de sucesso, ele fica Adormecido até sofrer dano ou até o GM gastar um Medo… |
| Códice | 1 | Livro de Tyfar | estresse | **Chama Selvagem:** Faça uma jogada de Spellcast contra até três adversários dentro do alcance Corpo a Corpo. Alvos contra os quais você tiver sucesso recebem 2d6 de dan… |
| Códice | 2 | Livro de Sitil | esperanca | **Ajustar Aparência:** Você muda magicamente sua aparência e roupas para evitar ser reconhecido. **Paralelo:** Gaste 2 Esperança para lançar este feitiço em você mesmo o… |
| Códice | 2 | Livro de Vagras | condicoes, descansos, esperanca | **Tranca Rúnica:** Faça uma jogada de Spellcast (15) em um objeto que você esteja tocando e que possa ser fechado (como uma fechadura, baú ou caixa). Uma vez por descans… |
| Códice | 3 | Livro de Korvax | esperanca, estresse | **Levitação:** Faça uma jogada de Spellcast para levantar temporariamente um alvo que você possa ver no ar e movê-lo dentro do alcance Próximo de sua posição atual. **Re… |
| Códice | 3 | Livro de Norai | condicoes, proficiencia, estresse | **Vínculo Místico:** Faça uma jogada de Spellcast contra um alvo dentro do alcance Distante. Em caso de sucesso, ele fica temporariamente Restrito e deve marcar um Estre… |
| Códice | 4 | Livro de Exota | descansos, esperanca, cofre_e_loadout | **Repudiar:** Você pode interromper um efeito mágico que esteja ocorrendo. Faça uma jogada de Reação usando seu atributo de Spellcast. Uma vez por descanso, em caso de s… |
| Códice | 4 | Livro de Grynn | descansos, esperanca | **Deflexão Arcana:** Uma vez por descanso longo, gaste 1 Esperança para anular o dano de um ataque que esteja mirando em você ou em um aliado a Alcance Muito Próximo. **… |
| Códice | 5 | Manifestar Muralha | descansos, esperanca | Faça uma jogada de Spellcast (15). Uma vez por descanso, ao ter sucesso, gaste 1 Esperança para criar uma muralha mágica temporária entre dois pontos dentro de Alcance L… |
| Códice | 6 | Banir |  | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Próximo. Em um sucesso, role um número de d20 igual ao seu traço de Conjuração. O alvo deve fazer uma joga… |
| Códice | 7 | Livro de Homet | descansos | **Passar Através:** Faça uma Jogada de Conjuração (13). Uma vez por descanso, em caso de sucesso, você e todas as criaturas tocando em você podem passar por uma parede o… |
| Códice | 7 | Tocado pelo Códice | descansos, proficiencia, estresse, cofre_e_loadout | Quando 4 ou mais das cartas de domínio no seu conjunto forem do domínio Códice, você recebe os seguintes benefícios: Você pode marcar 1 Estresse para adicionar sua Profi… |
| Códice | 8 | Livro de Vyola | descansos, esperanca, estresse | **Mergulho na Memória:** Faça uma Jogada de Conjuração contra um alvo dentro do alcance Longo. Em um sucesso, penetre na mente do alvo e pergunte ao Mestre uma questão. … |
| Códice | 8 | Refúgio Seguro | condicoes, descansos, esperanca | Quando você tiver alguns minutos de calma para se concentrar, pode gastar 2 Esperança para invocar seu Refúgio Seguro, um grande lar interdimensional onde você e seus al… |
| Códice | 9 | Onda de Desintegração | descansos, estresse | Faça uma Jogada de Conjuração (18). Uma vez por descanso longo, em um sucesso, o Mestre informa quais adversários dentro do alcance Longo têm Dificuldade 18 ou menor. Ma… |
| Códice | 10 | Livro de Yarrow | esperanca | **Manipulador do Tempo:** Faça uma Jogada de Conjuração (18). Em um sucesso, o tempo desacelera temporariamente até parar para todos dentro do alcance Longo, exceto para… |
| Códice | 10 | União Transcendente | descansos, esperanca, estresse, pontos_de_vida | Uma vez por descanso longo, gaste 5 Esperança para lançar esta magia em duas ou mais criaturas voluntárias. Até seu próximo descanso, quando uma criatura conectada por e… |
| Graça | 1 | Enganador Hábil | esperanca, vantagem | Gaste 1 Esperança para ganhar vantagem em uma jogada para enganar ou ludibriar alguém a acreditar em uma mentira que você conta. |
| Graça | 2 | Encrenqueiro | descansos, proficiencia, estresse | Quando você provoca um alvo dentro do alcance Longo, faça uma Jogada de Presença contra ele. Uma vez por descanso, em um sucesso, role um número de d4 igual à sua Profic… |
| Graça | 2 | Não Conte Mentiras | estresse | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Muito Próximo. Em um sucesso, ele não pode mentir para você enquanto permanecer dentro do alcance Próximo,… |
| Graça | 3 | Brilho Hipnótico | condicoes, descansos, estresse | Faça uma Jogada de Conjuração contra todos os adversários à sua frente dentro do alcance Próximo. Uma vez por descanso, em um sucesso, crie uma ilusão de cores e luzes p… |
| Graça | 4 | Discurso Acalmante | descansos, pontos_de_vida | Durante um descanso curto, quando você dedicar um tempo para confortar outro personagem enquanto usa o movimento de inatividade Cuidar de Ferimentos nele, remova 1 Ponto… |
| Graça | 4 | Pelos Seus Olhos |  | Escolha um alvo dentro do alcance Muito Longo. Você pode ver através dos olhos e ouvir pelos ouvidos dele. Pode alternar livremente entre usar seus próprios sentidos ou … |
| Graça | 5 | Mergulhador de Pensamentos | condicoes, medo, esperanca | Você pode espiar a mente dos outros. Gaste 1 Esperança para ler os pensamentos superficiais e vagos de um alvo dentro do alcance Longo. Faça uma Jogada de Conjuração con… |
| Graça | 5 | Palavras de Discórdia | estresse | Sussurre palavras de discórdia para um adversário dentro do alcance de Corpo a Corpo e faça uma Jogada de Conjuração (13). Em um sucesso, o alvo deve marcar 1 Estresse e… |
| Graça | 6 | Partilhar o Fardo | descansos, esperanca, estresse | Uma vez por descanso, assuma o Estresse de uma criatura voluntária dentro do alcance de Corpo a Corpo. O alvo descreve o conhecimento íntimo ou emoções que vazam telepat… |
| Graça | 7 | Carisma Infinito | medo, esperanca | Após fazer uma jogada de ação para persuadir, mentir ou conquistar favor, você pode gastar 1 Esperança para rerrolar o dado de Esperança ou Medo. |
| Graça | 7 | Tocado pela Graça | armadura, estresse, pontos_de_vida, cofre_e_loadout | Quando 4 ou mais das cartas de domínio no seu conjunto forem do domínio Graça, você recebe os seguintes benefícios: • Você pode marcar 1 Espaço de Armadura em vez de mar… |
| Graça | 8 | Enfeitiçar em Massa | condicoes, estresse | Faça uma Jogada de Conjuração contra todos os alvos dentro do alcance Longo. Os alvos que você acertar ficam temporariamente Encantados. Enquanto Encantados, a atenção d… |
| Graça | 8 | Projeção Astral | descansos, estresse | Uma vez por descanso longo, marque 1 Estresse para criar uma cópia projetada de si mesmo que pode aparecer em qualquer lugar onde você já esteve. Você pode ver e ouvir a… |
| Graça | 9 | Imitador | descansos, esperanca, cofre_e_loadout | Uma vez por descanso longo, esta carta pode imitar as características de outra carta de domínio de nível 8 ou inferior no conjunto de outro jogador. Gaste Esperança igua… |
| Graça | 10 | Notório | estresse, cofre_e_loadout | As pessoas sabem quem você é e o que você fez, e te tratam diferente por isso. Quando usar sua notoriedade para conseguir o que quer, pode marcar 1 Estresse antes de rol… |
| Graça | 10 | Reprise | medo, cofre_e_loadout | Quando um aliado dentro do alcance Próximo causar dano a um adversário, você pode fazer uma Jogada de Conjuração contra o mesmo alvo. Em um sucesso, você causa o mesmo d… |
| Meia-Noite | 1 | Abrir e Puxar | vantagem | Você tem vantagem em jogadas de ação para arrombar fechaduras não mágicas, desarmar armadilhas não mágicas ou roubar itens de um alvo (seja furtivamente ou pela força). |
| Meia-Noite | 1 | Chuva de Lâminas | condicoes, proficiencia, esperanca | Gaste 1 Esperança para fazer uma Jogada de Conjuração e conjurar lâminas arremessáveis que atingem todos os alvos dentro do alcance Muito Próximo. Alvos que você acertar… |
| Meia-Noite | 2 | Espírito da Meia-Noite | esperanca | Gaste 1 Esperança para invocar um espírito do tamanho de um humanoide que pode se mover ou carregar coisas para você até seu próximo descanso. Você também pode enviá-lo … |
| Meia-Noite | 2 | Vincular Sombras | condicoes | Faça uma Jogada de Conjuração contra todos os adversários dentro do alcance Muito Próximo. Os alvos que você acertar ficam temporariamente Imobilizados, enquanto suas so… |
| Meia-Noite | 3 | Estrangulamento | condicoes, estresse | Quando você se posiciona atrás de uma criatura do seu tamanho, pode marcar 1 Estresse para agarrá-la em um estrangulamento, tornando-a temporariamente Vulnerável. Quando… |
| Meia-Noite | 3 | Véu da Noite | condicoes, vantagem | Faça uma Jogada de Conjuração (13). Em um sucesso, você cria uma cortina temporária de escuridão entre dois pontos dentro do alcance Longo. Apenas você pode ver através … |
| Meia-Noite | 4 | Expert em Furtividade | medo, esperanca, estresse | Quando você rolar com Medo ao tentar se mover despercebido por uma área perigosa, pode marcar 1 Estresse para rolar com Esperança em vez disso. Se um aliado dentro do al… |
| Meia-Noite | 4 | Glifo do Crepúsculo | esperanca | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Muito Próximo. Em um sucesso, gaste 1 Esperança para conjurar um glifo negro no corpo dele que expõe seus … |
| Meia-Noite | 5 | Retirada Fantasma | esperanca | Gaste 1 Esperança para ativar Retirada Fantasma onde você está. Gaste outra Esperança a qualquer momento antes do seu próximo descanso para desaparecer do local onde est… |
| Meia-Noite | 5 | Silêncio | condicoes, limiares, medo, esperanca | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Próximo. Em um sucesso, gaste 1 Esperança para conjurar uma magia supressora ao redor do alvo que abrange … |
| Meia-Noite | 6 | Sussurros Sombrios | medo, estresse | Você pode falar na mente de qualquer pessoa com quem tenha feito contato físico. Uma vez aberto o canal, ela pode responder em sua mente. Além disso, você pode marcar 1 … |
| Meia-Noite | 7 | Esquiva Desaparecente | condicoes, esperanca | Quando um ataque físico contra você falhar, pode gastar 1 Esperança para se envolver em sombras, tornando-se Oculto e teleportando para um ponto dentro do alcance Próxim… |
| Meia-Noite | 7 | Tocado pela Meia-Noite | descansos, medo, esperanca, estresse, cofre_e_loadout | Quando 4 ou mais das cartas de domínio no seu conjunto forem do domínio Meia-Noite, você recebe os seguintes benefícios: Uma vez por descanso, quando você estiver com 0 … |
| Meia-Noite | 8 | Caçador das Sombras | vantagem | Sua habilidade é aprimorada sob o manto da sombra. Enquanto estiver envolto em pouca luz ou escuridão, você ganha +1 em Esquiva e realiza jogadas de ataque com vantagem. |
| Meia-Noite | 9 | Terror Noturno | condicoes, descansos, medo | Uma vez por descanso longo, escolha alvos dentro do alcance Muito Próximo para perceber você como um horror aterrorizante. Os alvos devem ter sucesso em uma Jogada de Re… |
| Meia-Noite | 10 | Eclipse | limiares, descansos, medo, esperanca, estresse, vantagem | Faça uma Jogada de Magia (16). Uma vez por descanso longo, em caso de sucesso, mergulhe toda a área dentro do alcance Distante em completa escuridão que apenas você e se… |
| Meia-Noite | 10 | Espectro da Escuridão | condicoes, estresse | Marque um Estresse para se tornar Espectral até fazer uma jogada de ação que tenha como alvo outra criatura. Enquanto estiver Espectral, você é imune a dano físico e pod… |
| Sábio | 1 | Emaranhado Cruel | esperanca | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Distante. Em um sucesso, raízes e vinhas saem do chão, causando 1d8 + 1 de dano físico e Imobilizando temp… |
| Sábio | 1 | Língua da Natureza | medo, esperanca | Você pode falar a linguagem do mundo natural. Quando quiser conversar com plantas e animais ao seu redor, faça uma Jogada de Instinto (12). Em um sucesso, eles lhe darão… |
| Sábio | 1 | Rastreador Habilidoso | esperanca | Quando estiver rastreando uma criatura específica ou grupo de criaturas com base em sinais de sua passagem, você pode gastar qualquer quantidade de Esperança e fazer ao … |
| Sábio | 2 | Conjurar Enxame | limiares, esperanca, estresse | Besouros Blindados Tekaira: Marque 1 Estresse para conjurar besouros blindados que o cercam. Quando você sofrer dano, reduza a severidade em um nível. Pode gastar 1 Espe… |
| Sábio | 2 | Familiar Natural | esperanca, estresse | Gaste 1 Esperança para invocar um pequeno espírito da natureza ou animalzinho da floresta ao seu lado até seu próximo descanso, até você lançar Familiar Natural novament… |
| Sábio | 3 | Caule Imponente | descansos, proficiencia, estresse | Uma vez por descanso, você pode conjurar um caule grosso e retorcido dentro do alcance Próximo que pode ser facilmente escalado. Sua altura pode crescer até o alcance Di… |
| Sábio | 4 | Aperto da Morte | estresse | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Próximo e escolha uma das opções a seguir: Puxe o alvo para o alcance Corpo a Corpo ou puxe-se para o alca… |
| Sábio | 4 | Campo de Cura | descansos, esperanca, pontos_de_vida | Uma vez por descanso longo, você pode conjurar um campo de plantas curativas ao seu redor. Em toda a área dentro do alcance Próximo de você, a natureza vibra, permitindo… |
| Sábio | 6 | Coletor | descansos, esperanca, estresse, pontos_de_vida | Como um movimento de inatividade adicional que você pode escolher, role d6 para ver o que você coleta. Trabalhe com o Mestre para descrever e adicionar ao seu inventário… |
| Sábio | 6 | Montarias Conjuradas | descansos, esperanca | Gaste qualquer quantidade de Esperança para conjurar esse mesmo número de montarias mágicas (como cavalos, camelos ou elefantes) que você e seus aliados podem montar até… |
| Sábio | 7 | Tocado pelo Saber | descansos, cofre_e_loadout | Quando 4 ou mais cartas de domínio em seu conjunto forem do domínio Sábio, ganhe os seguintes benefícios: Enquanto estiver em um ambiente natural, você ganha +2 de bônus… |
| Sábio | 8 | Barreira Rejuvenescedora | descansos, pontos_de_vida | Faça uma Jogada de Conjuração (15). Uma vez por descanso, em um sucesso, crie uma barreira temporária de energia protetora ao seu redor em alcance Muito Próximo. Você e … |
| Sábio | 8 | Espíritos da Floresta | armadura, esperanca | Faça uma Jogada de Conjuração (13). Em um sucesso, gaste qualquer quantidade de Esperança para criar o mesmo número de pequenas fadas da floresta que aparecem em pontos … |
| Sábio | 9 | Domínio das Plantas | descansos | Faça uma Jogada de Conjuração (18). Uma vez por descanso longo, em sucesso, você remodela o mundo natural, alterando a vegetação ao seu redor em qualquer ponto dentro do… |
| Sábio | 10 | Força da Natureza | condicoes, armadura, esperanca, estresse | Marque 1 Estresse para se transformar em um poderoso espírito da natureza, ganhando os seguintes benefícios: Quando tiver sucesso em uma jogada de ataque ou Conjuração, … |
| Sábio | 10 | Tempestade | medo, vantagem | Escolha uma das seguintes tempestades e faça uma Jogada de Conjuração contra todos os alvos dentro do alcance Distante. Os alvos que você acertar sofrem os efeitos até q… |
| Esplendor | 1 | Farol Brilhante | condicoes, proficiencia, esperanca | Faça uma Jogada de Conjuração contra um alvo dentro do alcance Longínquo. Em um sucesso, gaste 1 Esperança para enviar um raio de luz cintilante em direção a ele, causan… |
| Esplendor | 1 | Toque Curativo | descansos, esperanca, estresse, pontos_de_vida | Você coloca suas mãos sobre uma criatura e canaliza magia de cura para fechar suas feridas. Quando pode dedicar alguns minutos para focar no alvo que está ajudando, pode… |
| Esplendor | 2 | Mãos Curativas | descansos, estresse, pontos_de_vida | Faça uma Jogada de Conjuração (13) e escolha uma criatura que não seja você, dentro de alcance Corpo a Corpo. Em caso de sucesso, marque um Estresse para remover 2 ponto… |
| Esplendor | 2 | Palavras Finais | medo, esperanca | Você pode infundir um cadáver com um momento de vida para falar com ele. Faça uma Jogada de Conjuração (13). Em um sucesso com Esperança, o cadáver responde até três per… |
| Esplendor | 3 | Segundo Fôlego | descansos, esperanca, estresse, pontos_de_vida | Uma vez por descanso, quando você for bem-sucedido em um ataque contra um adversário, pode remover 3 de estresse ou 1 ponto de vida. Com um sucesso com Esperança, você t… |
| Esplendor | 3 | Voz da Razão | proficiencia, estresse, vantagem | Você fala com um poder e autoridade incomparáveis. Você tem vantagem em jogadas de ação para diminuir situações violentas ou convencer alguém a seguir sua liderança. Alé… |
| Esplendor | 4 | Adivinhação | descansos, esperanca | Uma vez por descanso longo, gaste 3 de Esperança para se conectar às forças além e fazer uma pergunta de "sim ou não" sobre um evento, pessoa, lugar ou situação no futur… |
| Esplendor | 4 | Guardião da Vida | descansos, esperanca, pontos_de_vida, movimento_de_morte | Gaste 3 de Esperança e escolha um aliado dentro de alcance Próximo. Ele fica marcado com um sigilo brilhante de proteção. Quando esse aliado for sofrer uma ação de morte… |
| Esplendor | 5 | Golpe Divino | descansos, esperanca | Uma vez por descanso, gaste 3 de Esperança para carregar seu poderoso golpe. No seu próximo ataque bem-sucedido com uma arma, dobre o resultado da sua jogada de dano. Es… |
| Esplendor | 5 | Moldar Material | esperanca | Gaste 1 de Esperança para moldar uma seção de material natural que você esteja tocando (como pedra, gelo ou madeira) para o seu propósito. A área do material não pode se… |
| Esplendor | 7 | Golpe Curativo | esperanca, pontos_de_vida | Quando você causar dano a um adversário, pode gastar 2 de Esperança para remover 1 ponto de vida de um aliado dentro de alcance Próximo. |
| Esplendor | 7 | Tocado do Esplendor | limiares, descansos, esperanca, estresse, pontos_de_vida, cofre_e_loadout | Quando 4 ou mais das cartas de domínio em seu conjunto forem do domínio Esplendor, você ganha os seguintes benefícios: • Bônus de +3 no seu limiar de dano Severo • Uma v… |
| Esplendor | 8 | Aura de Escudo | armadura, limiares, estresse, pontos_de_vida | Marque um Estresse para conjurar uma aura protetora em um alvo dentro do alcance Muito Próximo. Quando o alvo marcar um Espaço de Armadura, ele reduz a severidade do ata… |
| Esplendor | 8 | Luz Ofuscante | condicoes, esperanca | Faça uma Jogada de Conjuração para liberar poderosos raios de luz solar ardente contra todos os adversários à sua frente dentro do alcance Longínquo. Em caso de sucesso,… |
| Esplendor | 9 | Aura Avassaladora | descansos, esperanca, estresse | Faça uma Jogada de Conjuração (15) para fortalecer magicamente sua aura. Em caso de sucesso, gaste 2 de Esperança para que sua Presença seja igual ao seu traço de Conjur… |
| Esplendor | 9 | Raio da Salvação | estresse, pontos_de_vida | Faça uma Jogada de Conjuração (16). Em caso de sucesso, marque qualquer número de Estresses para escolher uma linha de aliados dentro do alcance Longe. Você pode curar p… |
| Esplendor | 10 | Revigoramento | descansos, esperanca | Quando você ou um aliado dentro do alcance Próximo usar uma habilidade que possui limite de exaustão (como "uma vez por descanso" ou "uma vez por sessão"), você pode gas… |
| Valor | 1 | Empurrão Forte | condicoes, esperanca | Faça um ataque com sua arma principal contra um alvo dentro do alcance Corpo a Corpo. Em um sucesso, você causa dano e empurra o alvo para o alcance Próximo. Em um suces… |
| Valor | 1 | Eu Sou Seu Escudo | armadura, estresse | Quando um aliado dentro do alcance Muito Próximo for atingir por dano, você pode marcar 1 Estresse para se colocar no lugar e tornar-se o alvo do ataque. Ao receber o da… |
| Valor | 1 | Pele Dura | limiares | Quando você opta por não equipar armadura, sua Pontuação base de Armadura é 3 + sua Força e você usa os seguintes limiares de dano base: • Nível 1: 9/19 • Nível 2: 11/24… |
| Valor | 2 | Presença Audaz | descansos, esperanca | Quando fizer uma Jogada de Presença, você pode gastar 1 Esperança para adicionar sua Força à rolagem. Além disso, uma vez por descanso, quando for receber uma condição, … |
| Valor | 2 | Quebrador Corporal |  | Você usa toda a força do seu corpo na luta. Em um ataque bem-sucedido com uma arma de alcance Corpo a Corpo, ganhe um bônus na jogada de dano igual à sua Força. |
| Valor | 3 | Apoie-Se em Mim | descansos, estresse | Uma vez por descanso longo, quando você consola ou inspira um aliado que falhou em uma jogada de ação, vocês dois podem limpar 2 Estresses. |
| Valor | 3 | Inspiração Crítica | descansos, esperanca, estresse, criticos | Uma vez por descanso, quando você obtém um sucesso crítico em um ataque, todos os aliados dentro do alcance Muito Próximo podem limpar 1 Estresse ou ganhar 1 Esperança. |
| Valor | 4 | Provocação | estresse, vantagem | Descreva como você provoca um alvo dentro do alcance Próximo, então faça uma Jogada de Presença contra ele. Em sucesso, o alvo deve marcar 1 Estresse, e na próxima vez q… |
| Valor | 4 | Tanque de Suporte | medo, esperanca | Quando um aliado dentro do alcance Próximo falhar em uma rolagem, você pode gastar 2 Esperança para permitir que ele refaça o dado de Esperança ou de Medo. |
| Valor | 5 | Armadureiro | armadura, descansos | Enquanto estiver usando armadura, ganhe +1 de bônus na sua Pontuação de Armadura. Durante um descanso, ao escolher reparar sua armadura como movimento de inatividade, se… |
| Valor | 5 | Golpe Estimulante | descansos, estresse, pontos_de_vida, criticos | Uma vez por descanso, quando você obtém um sucesso crítico em um ataque, você e todos os aliados que puderem vê-lo ou ouvi-lo podem curar 1 Ponto de Vida ou d4 Estresses. |
| Valor | 6 | Erga-Se | limiares, proficiencia, estresse, pontos_de_vida | Ganhe um bônus no seu limiar de dano Severo igual à sua Proficiência. Quando marcar 1 ou mais Pontos de Vida de um ataque, limpe 1 Estresse. |
| Valor | 7 | Deixe Passar | limiares, estresse, cofre_e_loadout | Quando for receber dano, você pode marcar 1 Estresse para reduzir a severidade do dano em um limiar. Ao fazer isso, role d6. Com resultado 3 ou menos, coloque esta carta… |
| Valor | 7 | Tocado pelo Valor | armadura, pontos_de_vida, cofre_e_loadout | Quando 4 ou mais cartas de domínio em seu equipamento forem do domínio Valor, ganhe os seguintes benefícios: • +1 de bônus na sua Pontuação de Armadura • Quando você mar… |
| Valor | 8 | Golpe no Chão | esperanca | Gaste 2 Esperança para golpear o chão onde você está e faça uma Jogada de Força contra todos os alvos dentro do alcance Muito Próximo. Os alvos que você acertar são lanç… |
| Valor | 8 | Surto Total | descansos, estresse | Uma vez por descanso longo, marque 3 Estresses para levar seu corpo ao limite. Ganhe +2 de bônus em todas as suas características até seu próximo descanso. |
| Valor | 9 | Liderar pelo Exemplo | esperanca, estresse | Quando você causa dano a um adversário, pode marcar 1 Estresse e descrever como incentiva seus aliados. O próximo personagem jogador que atacar esse adversário pode limp… |
| Valor | 9 | Mantenha a Posição | condicoes, medo, esperanca | Descreva a postura defensiva que você assume e gaste 1 Esperança. Se o adversário se mover para o alcance Muito Próximo, ele é puxado para o alcance Corpo a Corpo e Rest… |
| Valor | 10 | Armadura Inabalável | armadura, limiares, proficiencia | Quando você for marcar um Espaço de Armadura, role um número de d6 igual à sua Proficiência. Se algum resultar em 6, reduza a severidade em um limiar sem marcar um Espaç… |
| Valor | 10 | Inquebrável | pontos_de_vida, cofre_e_loadout, movimento_de_morte | Quando você marcar seu último Ponto de Vida, ao invés de fazer um movimento de morte, role um d6 e cure um número de Pontos de Vida igual ao resultado. Depois, coloque e… |

## Candidatos — características de equipamento

| Característica | Ocorrências | Exemplos | Regra |
|---|---:|---|---|
| Alarmante | 4 | Chicote, Chicote aprimorado, Chicote avançado, Chicote lendário | Alarmante: marque 1 Estresse para estalar o chicote e forçar todos os adversários em alcance Corpo a Corpo a recuar para um ponto em alcance Próximo. |
| Alarmante | 1 | Chicote de festival (Festim das Feras) | Alarmante: marque 1 Estresse para forçar os adversários Corpo a Corpo a recuar para um ponto em alcance Próximo |
| Aparar | 1 | Adaga de proteção | Aparar: Quando você for atacado, role os dados de dano dessa arma. Se algum dos dados de dano do atacante tiver rolado o mesmo valor que os seus dados, os resultados cor… |
| Assustador | 2 | Alabarda forjada em aço, Adaga Devoradora | Assustador: Em um ataque bem-sucedido, o alvo deve marcar um Estresse. |
| Brutal | 3 | Lâminas de Punho, Lâminas de Garra, Arco de Sangue Yutari | Brutal: Quando rolar o valor máximo em um dado de dano, role um dado de dano adicional. |
| Busca da verdade | 1 | Armadura de Opala Veritas | Busca da verdade: Essa armadura brilha quando outra criatura dentro dela se aproxima. O intervalo conta [...] |
| Comprimento | 1 | Arma de Haste Estendida | Comprimento: o ataque desta arma atinge todos os adversários em uma linha reta dentro do alcance |
| De outro mundo | 1 | Lâmina Fantasma | De outro mundo: ao acertar um ataque, você pode causar dano físico ou mágico |
| Desafetação | 1 | Broquel | Desafetação: Quando for atacado, você pode marcar 1 Ponto de Armadura para receber um bônus de Evasão igual aos seus Pontos de Armadura disponíveis contra esse ataque. |
| Deslocamento | 1 | Armadura flutuante de Runetan | Deslocamento: Quando for alvo de um ataque, você pode marcar um slot de armadura para dar desvantagem à rolagem de ataque contra você. |
| Direcionado | 1 | Cutelo Meridiano | Direcionado: se não houver nenhuma criatura Próxima do alvo, sua jogada de ataque contra ele é feita com vantagem |
| Distorção Temporal | 2 | Pingente Widogast, Varinha de Essek | Distorção Temporal: você escolhe o alvo do seu ataque após fazer sua jogada |
| Dobrado | 1 | Garras de Punho | Dobrado: ao fazer um ataque com sua arma principal, você pode causar dano a outro alvo dentro do alcance corpo a corpo. |
| Doloroso | 3 | Runas da Ruína, Cajado de sangue, Runas de Fortificação | Doloroso: Toda vez que marcar um slot de armadura, você deve marcar um estresse. |
| Egoísta | 1 | Foice de Midas | Egoísta: gaste um punhado de ouro para receber um bônus de +1 na sua Proficiência em uma jogada de dano |
| Enganchado | 4 | Arpéu, Arpéu Aprimorado, Arpéu Avançado, Arpéu Lendário | Enganchado: Em um ataque bem-sucedido, você pode puxar o alvo para o alcance corpo a corpo. |
| Eruptivo | 1 | Martelo de Exota | Eruptivo: Em um ataque bem-sucedido contra um alvo dentro do alcance Corpo a Corpo, todos os outros adversários dentro do alcance Muito Próximo devem ser bem-sucedidos e… |
| Espalha-chumbo | 4 | Escopeta (Colosso das Terras Áridas), Escopeta (Colosso das Terras Áridas), Escopeta (Colosso das Terras Áridas), Escopeta (Colosso das Terras Áridas) | Espalha-chumbo: um ataque com esta arma tem como alvo todas as criaturas na sua frente no alcance |
| Esperançoso | 1 | Armadura Rosewild | Esperançoso: Quando você gastaria uma Esperança, pode marcar um slot de armadura. |
| Fortificado | 1 | Armadura Fortificada Completa | Fortificado: Ao marcar um slot de armadura, você reduz a gravidade de um ataque em dois limiares em vez de um. |
| Físico | 1 | Armadura Bladefare | Físico: Não é possível marcar um slot de armadura para reduzir o dano mágico. |
| Gancho | 1 | Cabo de reboque (Festim das Feras) | Gancho: ao acertar um ataque, você pode puxar o alvo para seu alcance Corpo a Corpo. |
| Impenetrável | 1 | Armadura de Escamas de Dragão | Impenetrável: Uma vez por descanso curto, quando você marcaria seu último golpe Ponto, em vez disso, você pode marcar um Estresse. |
| Perfeccionista | 1 | Arco dourado | Perfeccionista: se rolar 1 em um dado de dano, este dado causa 6 pontos de dano |
| Persuasão | 1 | Varinha do Fascínio | Persuasão: Antes de fazer uma rolagem de presença, você pode marcar um estresse para ganhar um bônus de +2 no resultado. |
| Queimadura | 2 | Bastão de Fogo, Armadura de Brasa | Queimadura: Quando um adversário o ataca dentro do alcance Corpo a Corpo, ele marca um Estresse. |
| Recarga | 5 | Trabuco, Revólver de Pólvora Negra, Canhão de mão, Rifle de Ilmari | Recarga: Depois de fazer um ataque, role um d6. No caso de um resultado de 1, você deve marcar um estresse para recarregar antes de atirar novamente. |
| Repelente | 1 | Manopla de impacto | Repelente: ao acertar um ataque, você pode gastar 1 de Esperança para empurrar o alvo para um ponto em alcance Distante |
| Retorno | 5 | Lâmina de retorno, Lâmina de retorno aprimorada, Lâmina de retorno avançada, Lâmina lendária que retorna | Retorno: Quando essa arma é lançada dentro de seu alcance, ela aparece em sua mão imediatamente após o ataque. |
| Revigorante | 1 | Cetro de Elias | Revigorante: Em um ataque bem-sucedido, role um d4. Se o resultado for 4, elimine um Estresse. |
| Rápido | 6 | Florete, Florete Aprimorado, Chicote com lâminas, Florete Avançado | Rápido: ao fazer um ataque, você pode marcar um Estresse para atingir outra criatura dentro do alcance. |
| Seis balas | 4 | Revólver (Colosso das Terras Áridas), Revólver (Colosso das Terras Áridas), Revólver (Colosso das Terras Áridas), Revólver (Colosso das Terras Áridas) | Seis balas: coloque 6 Marcadores de Bala na sua ficha. Gaste 1 Marcador de Bala para fazer um ataque. Você pode marcar 1 Estresse para recuperar Marcadores gastos. |
| Serra | 1 | Punhal Curvo | Serra: se rolar 1 em um dado de dano, este dado causa 8 pontos de dano |
| Silencioso | 1 | Armadura macia Tyris | Silencioso: você ganha um bônus de +2 nas rolagens que fizer para se mover silenciosamente. |
| Sorvedouras | 1 | Manoplas de Sifão | Sorvedouras: ao acertar um ataque, role 1d6. Se rolar 6, recupere 1 Ponto de Vida ou limpe 1 Estresse |
| Temporal | 1 | Corrente de seda Dunamis | Temporal: Marque um slot de armadura para rolar um d4 e adicione o resultado como um bônus à sua Evasão contra um ataque recebido. |
| Tiro rápido | 4 | Revólver pequeno (Colosso das Terras Áridas), Revólver pequeno (Colosso das Terras Áridas), Revólver pequeno (Colosso das Terras Áridas), Revólver pequeno (Colosso das Terras Áridas) | Tiro rápido: gaste 2 Esperança para receber um bônus de +4 no dano da arma principal. |
| Veloz | 1 | Foice de mão (Festim das Feras) | Veloz: ao fazer um ataque, marque 1 Estresse para atingir outra criatura no alcance |
| Veloz | 4 | Cadeira de rodas leve, Cadeira de rodas leve aprimorada, Cadeira de rodas leve avançada, Cadeira de rodas leve lendária | Veloz: ao fazer um ataque, marque 1 Ponto de Fadiga para atingir outra criatura no alcance. |
| Versátil | 7 | Arco com Espigões, Cetro, Cetro aprimorado, Espada de Conjuração | Versátil: essa arma também pode ser usada com estas estatísticas - Conhecimento, Distante, d6+3. |
| Versátil | 1 | Pipa encantada (Festim das Feras) | Versátil: também pode ser usada com estas estatísticas — Presença, Corpo a Corpo e d10. |
| Vitalizante | 1 | Punhal Abençoado | Vitalizante: em descansos, recupere automaticamente 1 Ponto de Vida |
| Égide | 1 | Armadura de Corrente Elundriana | Égide: reduza sua Armadura do dano mágico sofrido antes de compará-lo com seus limiares de dano |

## Loot/consumíveis mecânicos detectados

| Tipo | Item | Estado | Trecho |
|---|---|---|---|
| loot | Saco de Dormir Premium | candidato mecânico | Durante o tempo de inatividade, você limpa automaticamente um estresse. |
| loot | Aljava de carga | candidato mecânico | Quando for bem-sucedido em um ataque com uma flecha armazenada nessa aljava, ganhe um bônus na rolagem de dano igual ao seu nível atual. |
| loot | Pedra Glamour | candidato mecânico | Ative essa pedra do tamanho de um seixo para memorizar a aparência de alguém que você pode ver. Gaste uma Hope para recriar magicamente essa aparência em você como uma i… |
| loot | Flechas Perfurantes | candidato mecânico | Três vezes por descanso, quando for bem-sucedido em um ataque com uma dessas flechas, você pode adicionar sua Proficiência a Você a rolagem de dano. |
| loot | Pedra da Resiliência | candidato mecânico | Incruste esta pedra em uma armadura que ainda não tenha uma característica; ela recebe a característica abaixo. Resiliente: antes de marcar seu último Ponto de Armadura,… |
| loot | Chave-Mestra | candidato mecânico | Ao usar essa chave para abrir uma porta trancada, você ganha vantagem na rolagem de finesse. |
| loot | Prisma Arcano | candidato mecânico | Posicione esse prisma em um local de sua escolha e ative-o. Todos os aliados dentro do alcance próximo dele ganham um bônus de +1 em seus lançamentos de feitiço. Enquant… |
| loot | Receita de Poção de Estamina Menor | candidato mecânico | Como um movimento de inatividade, você pode usar o osso de uma criatura para criar uma Poção de resistência menor. |
| loot | Receita de Poção de Saúde Menor | candidato mecânico | Como movimento de inatividade, você pode usar um frasco de sangue para criar uma Poção de Saúde Menor. |
| loot | Espírito Corretor | candidato mecânico | Esse pequeno duende fica na curva de seu canal auditivo e sussurra conselhos úteis durante o combate. Uma vez por descanso curto, você pode ganhar vantagem em uma rolage… |
| loot | Guardião do Saber | candidato mecânico | Você pode armazenar o nome e os detalhes de até três criaturas hostis dentro desse livro. Você ganha um bônus de +1 nas rolagens de ação contra essas criaturas. |
| loot | Frasco de Darksmoke Receita | candidato mecânico | Como movimento de inatividade, você pode marcar um Stress para criar um Vial of Darksmoke. |
| loot | Pedra de sangue | candidato mecânico | Você pode anexar essa pedra a uma arma que ainda não tenha uma característica. A arma ganha a seguinte característica. Brutal: Quando rolar o valor máximo em um dado de … |
| loot | Pedra Maior | candidato mecânico | Você pode anexar essa pedra a uma arma que ainda não tenha uma característica. A arma ganha a seguinte característica. Poderoso: Em um ataque bem-sucedido, role um dado … |
| loot | Planador | candidato mecânico | Enquanto estiver caindo, você pode marcar um Stress para acionar esse pequeno paraquedas e deslizar com segurança até o chão. |
| loot | Anel do Silêncio | candidato mecânico | Gaste uma Esperança para ativar esse anel. Seus passos são silenciosos até o próximo descanso. |
| loot | Pingente Calmante | candidato mecânico | Quando for marcar seu último estresse, role um d6. Se o resultado for 5 ou mais, não o marque. |
| loot | Saco de Ficklesand | candidato mecânico | Você pode convencer esse pequeno saco de areia a ficar muito mais pesado ou mais leve com um Rolamento de Presença bem-sucedido (10). Além disso, com uma rolagem bem-suc… |
| loot | Anel de Resistência | candidato mecânico | Uma vez por descanso longo, você pode ativar esse anel após um ataque bem-sucedido contra você para reduzir o dano pela metade. |
| loot | Caixa de muitos produtos | candidato mecânico | Uma vez por descanso longo, você pode abrir essa pequena caixa e rolar um d12. Se o resultado for de 1 a 6, ela estará vazia. Em um resultado de 7 a 10, ela contém um co… |
| loot | Amuleto do Alcance | candidato mecânico | Você pode anexar este amuleto a uma arma de alcance Corpo a Corpo. 3 vezes por descanso, você pode ativar este amuleto para atacar um alvo Próximo. |
| loot | Semente de Portal | candidato mecânico | Plante esta semente no chão para que um portal surja no local em 24h. Você pode usá-lo para viajar até qualquer outro lugar onde tenha plantado uma Semente de Portal. Um… |
| loot | Corrente do Paragon | candidato mecânico | Como movimento de tempo de inatividade, você pode meditar em um ideal ou princípio que lhe seja caro e concentrar sua vontade nessa corrente. Uma vez por descanso longo,… |
| loot | Amuleto Elusivo | candidato mecânico | Uma vez por descanso longo, você pode ativar esse amuleto para ficar oculto até se mover. Enquanto estiver oculto dessa forma, você permanecerá invisível mesmo que um ad… |
| loot | Medalhão Hopekeeper | candidato mecânico | Durante um descanso longo, se você tiver 6 de Esperança, poderá gastar uma Esperança para imbuir esse medalhão com sua determinação abundante. Quando tiver 0 de Esperanç… |
| loot | Relíquia de Encantamento | candidato mecânico | Você ganha um bônus de +1 na sua Presença. Você só pode carregar uma relíquia. |
| loot | Relíquia da Iluminação | candidato mecânico | Você ganha um bônus de +1 no seu Conhecimento. Você só pode carregar uma relíquia. |
| loot | Relíquia de afiação | candidato mecânico | Você ganha um bônus de +1 em uma Experiência de sua escolha. Você só pode carregar uma relíquia. |
| loot | Pingente Flickerfly | candidato mecânico | Enquanto você estiver portando esse pingente, suas armas com alcance corpo a corpo que causam dano físico terão um brilho de véu e poderão atacar alvos a uma distância m… |
| loot | Receita de Mythic Dust | candidato mecânico | Como movimento de inatividade, você pode usar um punhado de pó de ouro fino para criar Pó Mítico. |
| loot | Fragmento de memória | candidato mecânico | Uma vez por descanso longo, você pode gastar 2 de Esperança para chamar um card de domínio do seu cofre em vez de pagar seu Custo de Chamada. |
| loot | Anel de determinação inquebrável | candidato mecânico | Uma vez por sessão, quando o GM gasta um Medo, você pode gastar 4 de Esperança para cancelar os efeitos desse Medo gasto. |
| loot | Cinturão da unidade | candidato mecânico | Uma vez por sessão, você pode gastar 5 de Esperança para liderar um Tag Team Roll com três PCs em vez de dois. |
| consumiveis | Poção da passada | candidato mecânico | Você ganha um bônus de +1 na sua próxima rolagem de agilidade. |
| consumiveis | Poção de reforço | candidato mecânico | Você ganha um bônus de +1 na sua próxima rolagem de força. |
| consumiveis | Poção de controle | candidato mecânico | Você ganha um bônus de +1 na sua próxima rolagem de finesse. |
| consumiveis | Poção de sintonização | candidato mecânico | Você ganha um bônus de +1 na sua próxima rolagem de instinto. |
| consumiveis | Poção de Encantamento | candidato mecânico | Você ganha um bônus de +1 na sua próxima rolagem de presença. |
| consumiveis | Poção de Iluminação | candidato mecânico | Você ganha um bônus de +1 na sua próxima rolagem de conhecimento. |
| consumiveis | Poção de resistência menor | referência específica no motor | Limpar 1d4 de estresse. |
| consumiveis | Veneno de Grindletooth | candidato mecânico | Você pode aplicar esse veneno a uma arma que causa dano físico para adicionar um d6 à sua próxima rolagem de dano com essa arma. |
| consumiveis | Folhas de Varik | candidato mecânico | Você pode comer essas folhas emparelhadas para ganhar imediatamente 2 de Esperança. |
| consumiveis | Fragmento Arcano Instável | candidato mecânico | Você pode fazer uma rolagem de Finesse para arremessar esse fragmento em um grupo de adversários dentro do alcance de Longe. Os alvos contra os quais você for bem-sucedi… |
| consumiveis | Poção da Estabilidade | candidato mecânico | Você pode beber desta poção para fazer um movimento de descanso adicional. |
| consumiveis | Veneno de Grindletooth Aprimorado | candidato mecânico | Você pode aplicar esse veneno a uma arma que causa dano físico para adicionar um d8 à sua próxima rolagem de dano com essa arma. |
| consumiveis | Argila transformadora | candidato mecânico | Você pode gastar uma Esperança para usar essa argila, alterando seu rosto o suficiente para torná-lo irreconhecível até o próximo descanso. |
| consumiveis | Frasco de Darksmoke | candidato mecânico | Quando um adversário o atacar, use esse frasco e role um número de d6s igual à sua Agilidade. Adicione o resultado mais alto à sua Evasão contra o ataque. |
| consumiveis | Raiz de salto | candidato mecânico | Coma essa raiz para saltar até o alcance distante uma vez sem precisar rolar. |
| consumiveis | Pó do Estalo | candidato mecânico | Marque 1 Estresse para recuperar 1 Ponto de Vida. |
| consumiveis | Poção de resistência | referência específica no motor | Elimina 1d4+1 de estresse. |
| consumiveis | Costurador de Armadura | candidato mecânico | Você pode usar esse grampeador para gastar qualquer número de Hope e limpe isso Muitos slots de armadura. |
| consumiveis | Fragmento Arcano Aprimorado | candidato mecânico | Você pode fazer uma rolagem de Finesse para arremessar esse fragmento em um grupo de adversários dentro do alcance de Longe. Os alvos contra os quais você for bem-sucedi… |
| consumiveis | Poção da Passada Maior | candidato mecânico | Você ganha um bônus de +1 na sua Agilidade até o próximo descanso. |
| consumiveis | Poção de reforço maior | candidato mecânico | Você ganha um bônus de +1 na sua Força até o próximo descanso. |
| consumiveis | Poção de Controle Maior | candidato mecânico | Você ganha um bônus de +1 na sua Finesse até o próximo descanso. |
| consumiveis | Poção de sintonização maior | candidato mecânico | Você ganha um bônus de +1 no seu Instinto até o próximo descanso. |
| consumiveis | Poção de Encantamento Maior | candidato mecânico | Você ganha um bônus de +1 na sua Presença até o próximo descanso. |
| consumiveis | Poção de Iluminação Maior | candidato mecânico | Você ganha um bônus de +1 em Conhecimento até o seu próximo descanso. |
| consumiveis | Sangue do Yorgi | candidato mecânico | Você pode beber esse sangue para desaparecer de onde você está e imediatamente reaparece em um ponto que você pode ver dentro do alcance de Very Far. |
| consumiveis | Saliva de Redthorn | candidato mecânico | Você pode aplicar essa saliva em uma arma que causa dano físico para adicionar um d12 para sua próxima rolagem de dano com essa arma. |
| consumiveis | Pedra de Canalização | candidato mecânico | Você pode usar essa pedra para fazer um feitiço ou grimório de seu cofre, use-o uma vez e devolva-o ao seu cofre. |
| consumiveis | Poeira Mítica | candidato mecânico | Você pode aplicar esse pó a uma arma que causa dano mágico para adicionar um d12 à sua próxima rolagem de dano com essa arma. |
| consumiveis | Sinalizador de Hopehold | candidato mecânico | Quando você usa esse sinalizador, os aliados dentro do alcance próximo rolam um d6 quando gastam uma Esperança. Com um resultado 6, eles ganham o efeito dessa Esperança … |
| consumiveis | Fragmento Arcano Maior | candidato mecânico | Você pode fazer uma rolagem de finesse para arremessar este fragmento em um grupo de adversários dentro do alcance distante. Os alvos contra os quais você for bem-sucedi… |
| consumiveis | Círculo do Vazio | candidato mecânico | Marque uma Stress para criar um vazio que se estende até o alcance distante. Nenhuma magia pode ser lançada dentro do vazio, e as criaturas dentro do vazio são imunes a … |
| consumiveis | Seiva da árvore do sol | candidato mecânico | Consuma essa seiva para rolar um d6. Com um resultado de 5-6, elimine 2 HP. Com um resultado de 2-4, elimine 3 de estresse. Em um resultado de 1, veja através do véu da … |
| consumiveis | Veneno de Dripfang | candidato mecânico | Uma criatura que consome esse veneno sofre 8d10 de dano mágico direto. |
| consumiveis | Poção de Resistência Maior | candidato mecânico | Limpar 1d4+2 de estresse. |
| consumiveis | Broto de Asas | candidato mecânico | Você ganha asas mágicas que lhe permitem voar por um número de minutos igual ao seu nível. |
| consumiveis | Frasco de vozes perdidas | candidato mecânico | Você pode abrir esse frasco para liberar um eco ensurdecedor de vozes por um número de minutos igual ao seu Instinto. As criaturas dentro do alcance distante que não est… |
| consumiveis | Chá de Flor-de-Dragão | candidato mecânico | Você pode beber esse chá para liberar um ataque de fôlego ardente. Crie um instinto Jogue contra todos os adversários na frente você a curta distância. Os alvos contra o… |
| consumiveis | Semente de ponte | candidato mecânico | Vinhas grossas crescem a partir de sua localização até um ponto de sua escolha dentro do alcance de Far, permitindo que você suba ou atravesse por elas. As vinhas se dis… |
| consumiveis | Seiva do sono | candidato mecânico | Você pode beber essa poção para adormecer para uma noite inteira de descanso. Você limpa todos os Estresse ao acordar. |
| consumiveis | Ceia de Xúria | candidato mecânico | Você pode comer esta refeição para recuperar todos os seus Pontos de Vida e seu Estresse, além de receber 1d4 de Esperança. |
| consumiveis | Poção de encolhimento | candidato mecânico | Você pode beber essa poção para reduzir seu tamanho pela metade até escolher abandonar essa forma ou até seu próximo descanso. Enquanto estiver nessa forma, você tem um … |
| consumiveis | Poção de crescimento | candidato mecânico | Você pode beber essa poção para dobrar seu tamanho até escolher abandonar essa forma ou até seu próximo descanso. Enquanto estiver nessa forma, você tem um bônus de +2 p… |
| consumiveis | Pedra do Conhecimento | candidato mecânico | Se você morrer com esta pedra nas mãos, um aliado pode escolher uma das cartas em sua mão e colocá-la na própria mão ou cofre. Após isso, a pedra se esfarela. |
| consumiveis | Musgo Doce | referência específica no motor | Você pode consumir esse musgo durante um descanso para limpar 1d10 PV ou 1d10 de Estresse. |
| consumiveis | Orbe Ofuscante | candidato mecânico | Você pode ativar esse orbe para criar um flash de luz brilhante. Todos os alvos dentro da área de alcance tornam-se vulneráveis até marcarem HP. |
| consumiveis | Espelho de Marigold | candidato mecânico | Quando você sofre dano, pode gastar uma Esperança para anular esse dano, após o que o espelho se estilhaça. |
| consumiveis | Gota Estelar | candidato mecânico | Você pode usar esta gota estelar para invocar uma tempestade de cometas, que causam 8d20 de dano físico a todos os alvos em alcance Muito Distante. |

## Marcadores do HANDOFF para triagem

Estas linhas misturam histórico resolvido e trabalho ainda aberto; servem para não esquecer nada.

- L24: ## Lote 8 — em andamento: fechamento integral do Core 1.0
- L94: - Chicote / `Whip`: livro PT-BR p.125 — `Startling`, traduzido no livro como **Alarmante**, empurra adversários de Corpo a Corpo para **Próximo**.
- L193: Portanto este ponto saiu da lista de implementação pendente e passou a **conferido/correto**.
- L221: Fontes: livro básico PT-BR p.46 e errata oficial de 09/09/2025 p.42. A errata acrescenta que, se nenhum ataque acertar antes, o bônus termina no próximo descanso.
- L258: Próximo bloco de auditoria/implementação: **características ativas determinísticas** de ancestralidades, subclasses e equipamentos — custos, estados, duração/reset e consequências de resultado de dado informado pelo usuário. Efeitos puramente narrativos/posicionais serão classificados explicitamente em vez de automatizados à força.
- L312: Próximo subbloco: **Retração (Galapa)** integrada a este mesmo fluxo de dano; depois Asas, criação/sessão/descanso e perfis de ataque das ancestralidades restantes.
- L330: Próximo bloco: perfis/efeitos determinísticos de ancestralidade (Sopro Elemental, Alcance, Linguarudo e Garras Retráteis), seguido por integrações de criação/descanso/sessão (Projeto Intencional, Transe Celestial e Talismã da Sorte) e pela interceptação de Fadiga de Inabalável.
- L334: Auditoria e implementação em andamento. Nenhum deploy/merge do Lote 8 foi feito. Não alterar o pin da `engine-api` até o lote estar revisado e testado.
- L382: Ponto ainda aberto de regra: com Evolução, o Estresse adicional das híbridas continua sendo cobrado. A decisão está centralizada em `custoDeEntrarNaForma_`.
- L435: Lote 8 em andamento: fechar integralmente livro básico + errata e automatizar todas as mecânicas determinísticas possíveis, preservando apenas rolagens de dados como entrada manual.
- L466: Com este checkpoint, Broquel/Deflecting, Chicote/Alarmante e as 12 Cadeiras de Rodas de Combate estão materializados e validados na branch. O próximo bloco é armas de reserva/troca de armas. Ainda não houve deploy, PR ou mudança de `ENGINE_COMMIT` do Lote 8.
- L472: O bloco de ancestralidades do Lote 8 está fechado. O último efeito pendente, **Inabalável (Firbolg, p.60)**, foi materializado no commit funcional `8213957` e validado no GitHub Actions run `34316593882`:

## Regra para a próxima etapa

1. Revisar primeiro comunidades e subclasses, porque são conjuntos pequenos e claramente ligados à ficha.
2. Depois revisar cartas de domínio por domínio, classificando cada efeito como automático, manual com entrada de dado, ou puramente ficcional/posicional.
3. Revisar características ativas/condicionais de equipamento e efeitos de consumíveis.
4. Só chamar o Core de fechado quando os candidatos tiverem classificação explícita e os determinísticos tiverem teste.
