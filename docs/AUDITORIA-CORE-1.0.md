# Auditoria Core 1.0 — Livro PT-BR + Errata

> Lote 8. Fonte de regra: `DH-DigitalRegras.pdf` (Jambô, edição brasileira) + `Daggerheart-Erratas.pdf` (Darrington Press, 09/09/2025). O SRD 2.0 **não** faz parte deste lote.

## Objetivo

Fechar o conteúdo mecânico do livro básico em 100% e automatizar tudo que possa ser determinado pelo sistema. A única exceção deliberada é **rolar dados**: o usuário informa o resultado quando uma regra exige uma rolagem, e o sistema aplica custos, limites, duração e consequências automaticamente.

## Legenda

- ✅ conferido e correto no sistema atual;
- 🔧 divergência/lacuna confirmada, entra no Lote 8;
- 🎲 a rolagem permanece manual, mas o resultado e as consequências devem ser automatizados;
- 📝 regra narrativa/decisão de ficção, sem automação útil;
- ⏳ ainda não auditado.

## Regra de auditoria

Nenhuma seção será marcada como fechada por amostragem. Para cada mecânica relevante, conferir:

1. texto do livro;
2. errata aplicável;
3. dados expostos no app;
4. validação/derivados no motor;
5. custo e reset de recursos;
6. persistência;
7. interface que permita usar a regra;
8. teste automatizado quando houver comportamento determinístico.

Arquivos `backend/*.gs` gerados só podem ser alterados junto do gerador correspondente. Antes do deploy, `tools/conferir-gerados.mjs` deve permanecer verde.

---

# Estado da auditoria

## Introdução e regras gerais

- ⏳ Regra de Ouro / rulings over rules — narrativa, confirmar apenas que o app não tenta impedir decisões do Mestre que pertencem à ficção.
- ⏳ materiais, dados, marcadores, cartas e fichas.

## Capítulo 1 — Preparando-se para Aventuras

### Criação de personagem

- ⏳ classe/subclasse;
- ⏳ ancestralidade/comunidade;
- ⏳ distribuição +2,+1,+1,0,0,-1;
- ⏳ Evasão/PV/Fadiga/Esperança iniciais;
- ⏳ equipamento inicial;
- ⏳ origem;
- ⏳ duas Experiências +2;
- ⏳ duas cartas de domínio nível 1;
- ⏳ vínculos.

### Domínios, mão e reserva

- ⏳ nove domínios do Core;
- ⏳ aquisição por nível;
- ⏳ mão máxima 5;
- ⏳ reserva;
- ⏳ custo de troca/recordar;
- ⏳ troca gratuita no descanso.

### Classes e subclasses

- ⏳ 9 classes;
- ⏳ 18 subclasses;
- ✅ bônus derivados de dano de Guerreiro, Ladino e Guardião automatizados no Lote 8; o app monta os dados/bônus e **não rola**.

### Ancestralidades e comunidades

- ⏳ 18 ancestralidades;
- ⏳ 9 comunidades;
- ✅ bônus permanentes/derivados puros de ancestralidades automatizados no checkpoint de modificadores;
- ⏳ características ativas, custos, usos por descanso/sessão e estados que exigem escolha/resultado informado.

---

## Capítulo 2 — Jogando Aventuras

### Mecânicas fundamentais

- ⏳ Dados de Dualidade, sucesso/falha, Esperança/Medo e crítico;
- ⏳ Evasão;
- ⏳ PV e limiares;
- ⏳ Fadiga;
- ⏳ testes e reações;
- ⏳ vantagem/desvantagem;
- ⏳ dano físico/mágico/direto/resistência;
- ⏳ condições;
- ⏳ alcance/movimento/alvos/grupos/cobertura/visão;
- ⏳ ouro.

### Descanso

- ⏳ descanso curto/longo;
- ⏳ movimentos disponíveis e limites;
- ⏳ resets por descanso;
- ✅ Clank Eficiente: um único movimento de descanso longo substitui um de curto (Lote 4, já testado);
- ✅ contagem regressiva de longo prazo: o subsistema já existia; a suíte confirma que não anda por teste/descanso curto e avança uma vez no descanso longo conforme errata p.164.

### Morte

- ✅ três movimentos de morte, cicatrizes, inconsciência e encerramento de jornada (Lote 5);
- ⏳ interações de itens/efeitos com movimento de morte e cicatriz.

### Subida de nível / multiclasse

- ⏳ opções por patamar;
- ⏳ limites de PV/Fadiga 12;
- ⏳ aumento de duas Experiências +1 cada conforme errata p.110;
- ⏳ domínio, subclasse e multiclasse.

### Equipamento

- ✅ Broquel (`Buckler`) corrigido para usar **Pontos de Armadura disponíveis**, conforme errata p.125;
- ✅ Cadeira de Rodas de Combate: **12 armas principais** (leve, pesada e arcana × T1–T4) materializadas e validadas, pp.122–123;
- ✅ Chicote (`Whip`) corrigido: Alarmante empurra adversários de Corpo a Corpo para Próximo;
- ✅ inventário/troca de armas: até duas armas extras; troca perigosa custa 1 Fadiga e troca calma/preparo durante descanso custa 0; operação atômica e validada no servidor;
- ⏳ todas as armas principais;
- ⏳ todas as armas secundárias;
- ⏳ todas as armaduras;
- ✅ efeitos **passivos/derivados** de armas, secundárias e armaduras estruturados e aplicados pelo servidor;
- ⏳ características **ativas** de equipamento, custos, estados e efeitos que dependem de resultado de dado informado;
- ⏳ tesouro;
- ⏳ consumíveis.

### Cartas de domínio

- ✅ Livro de Grynn — Muralha de Chamas diz **temporária** conforme errata p.333; conferidor permanente adicionado.
- ⏳ 189 cartas, incluindo custos, duração, estado, usos por descanso/sessão e efeitos determinísticos.

---

## Capítulo 3 — Conduzindo Aventuras

- ⏳ testes e movimentos do Mestre;
- ⏳ Medo;
- ⏳ dificuldades;
- ⏳ testes de adversários;
- ⏳ contagens regressivas de ação, consequências, ciclo e longo prazo;
- ⏳ ouro/equipamento/tesouro do Mestre;
- ⏳ mecânicas opcionais;
- ⏳ condução de sessão/campanha quando houver estado mecânico persistente.

---

## Capítulo 4 — Adversários e Ambientes

- ⏳ catálogo completo de adversários;
- ⏳ estatísticas e habilidades;
- ⏳ tipos (Lacaio, Horda, Solo etc.);
- ⏳ Medo/Estresse/Relentless/foco;
- ⏳ catálogo completo de ambientes;
- ⏳ características e ações de ambiente;
- ⏳ todas as entradas mecânicas da errata (Glass Snake, Flickerfly etc.).

---

## Capítulo 5 — Cenários de Campanha

- ⏳ O Surto Selvagem;
- ⏳ Cinco Estandartes em Chamas;
- ⏳ Festim das Feras;
- ⏳ Era da Umbra;
- ⏳ Placa-Mãe;
- ⏳ Colosso das Terras Áridas;
- ⏳ regras, moedas, equipamentos, fichas auxiliares e subsistemas de cada moldura.

---

## Errata 09/09/2025 — itens mecânicos/clareza que afetam o sistema

- ✅ Besta Poderosa: Força +3 / Evasão +1;
- ✅ Serpente Atacante: dano físico direto;
- ✅ Híbrida Lendária: tipo físico;
- ✅ companheiro do Caçador: físico ou mágico;
- ✅ Camuflado do Ladino alinhado no Lote 7;
- ✅ Habilidade de Esperança do Ladino: 3 Esperanças, +2 Evasão até o próximo ataque que acertar; se isso não ocorrer, até o próximo descanso. Estado/custo/reset automatizados no run `34280954705`;
- ✅ Anéis Brilhantes T1 d10+2;
- ✅ Lança: sem Incômoda e dano corrigido por patamar;
- ✅ Espada Longa: dano corrigido por patamar;
- ✅ Broquel: texto/efeito PT corrigido e validado;
- ✅ Garras de Punho T4: uma mão;
- ✅ Musgo Doce: 1d10 PV ou Estresse durante descanso;
- ✅ avanço de contagem de longo prazo conforme errata p.164;
- ⏳ Cobra-de-Vidro;
- ⏳ Oscilume Adulto — Sopro Alucinógeno como reação;
- ⏳ Marreta — Enorme penaliza Evasão;
- ⏳ Revólver do Colosso — d8;
- ⏳ Turbilhão;
- ⏳ Eu Vi Chegando;
- ⏳ Golpe Estilhaçante;
- ⏳ Livro de Grynn — Deflexão Arcana e Muralha temporária;
- ⏳ demais entradas de clareza que alterem texto mecânico exibido.

---

# Blocos de auditoria fechados

## Parte 1 — inconsistências confirmadas de equipamento

Fechado em 08/09/2026 como bloco de auditoria, ainda sem implantação. Conferência feita contra as fontes declaradas do Lote 8 e o catálogo atual em `data/equipamentos.json`.

- ✅ `Buckler` existe no catálogo como `Broquel`, mas a mecânica PT exibida precisa ser corrigida para referenciar **Pontos de Armadura disponíveis**, conforme errata.
- ✅ `Combat Wheelchair` / Cadeira de Rodas de Combate não foi encontrada no catálogo atual. O livro traz **12 entradas**: leve, pesada e arcana, cada uma em T1–T4. Todas são armas principais.
- ✅ Modelos leves: Agilidade, Corpo a Corpo, uma mão, `Veloz`; dano d8 / d8+3 / d8+6 / d8+9 físico.
- ✅ Modelos pesados: Força, Corpo a Corpo, duas mãos, `Pesada` (−1 Evasão); dano d12+3 / +6 / +9 / +12 físico.
- ✅ Modelos arcanos: Conjuração, Distante, uma mão, `Confiável`; o livro PT-BR p.123 imprime d6 / +3 / +6 / +9 **físico**. A errata não altera essa linha, então o Lote 8 mantém físico; a divergência com SRD 2.0 fica para o lote de SRD 2.0.
- ✅ `Whip` existe em todos os patamares relevantes, mas a característica `Startling` está traduzida de forma mecanicamente errada: o texto inglês manda mover adversários de Melee para Close; o texto PT atual termina novamente em Corpo a Corpo. Corrigir a tradução em todas as variantes geradas a partir da mesma fonte.
- ✅ O equipamento exclusivo de moldura permanece separado no catálogo, o que evita colisão por nome com equipamento do Capítulo 2 e deve ser preservado.

Este bloco só será marcado como implementado quando a fonte de dados, o gerador correspondente e o arquivo gerado estiverem coerentes, com `conferir-gerados` verde.

---

# Implementação do Lote 8

## Equipamentos — preparação reproduzível

- `tools/auditoria-equipamento.py` contém as correções idempotentes de `Deflecting`/Broquel e `Startling`/Alarmante, com fonte registrada;
- `tools/lote8-adicionar-cadeiras.py` adiciona idempotentemente as 12 Cadeiras de Rodas de Combate conforme pp.122–123; commit de criação `914ddb5749d64baf183c44013f7e0e894b131e62`;
- `tools/conferir-equipamento-lote8.py` exige Broquel, quatro Chicotes e agora também as 12 cadeiras com categoria, patamar, atributo, alcance, dano, empunhadura e característica corretos; atualização `9b11980233987c49fac2bda583709008000edb51`;
- o conferidor também protege deliberadamente o dano físico dos quatro modelos arcanos enquanto o escopo for Core PT-BR + errata;
- o frontend lê `data/equipamentos.json` diretamente, portanto não é permitido considerar o backend gerado como suficiente sem materializar as mesmas correções no JSON;
- neste runtime os scripts ainda **não foram executados**, pois não há checkout local funcional e o repositório não possui GitHub Actions. Não registrar resultado verde até execução real.

Pendentes para fechar esta parte: executar os preparadores, materializar o JSON, regenerar `backend/44_Equipamento.gs` e executar os conferidores/suítes.

## Checkpoint de implementação — equipamento Core validado

Em 08/09/2026, o bloco Broquel + Chicote + 12 Cadeiras de Rodas de Combate foi materializado no catálogo e no backend gerado no commit `0630ad5`. Validação real via GitHub Actions run `34272839636`: backend 454/454, E2E 98/98, 14 geradores consistentes e CSS limpo. O bloco de catálogo passa de “preparado” para **implementado e validado na branch**, ainda não implantado em produção.

## Checkpoint — reserva/troca, contagem longa, Grynn e dano de classe

- ✅ Reserva/troca de armas validada no run `34275324930`: 462/462 backend, 99/99 E2E, 14 geradores, CSS limpo.
- ✅ Contagem de longo prazo reclassificada de lacuna para já implementada/correta conforme errata p.164.
- ✅ Livro de Grynn/Muralha de Chamas corrigido e validado no run `34276060393`.
- ✅ Bônus de dano de Guerreiro/Ladino/Guardião automatizados no commit `bf534a17ad81c6f96d3af6ea09778dc782f60847`; run `34279545273`: 466/466 backend, 100/100 E2E, 14 geradores, CSS limpo.
- ✅ Esquiva de Ladino automatizada no commit `6f720f5`; run `34280954705`: 471/471 backend, 100/100 E2E, 14 geradores, CSS limpo.
- ✅ Modificadores derivados/passivos do Core: commit `e4618015b6494de1f3e72ca5617538cec4ccefc0`; run `34286551186`: **480/480 backend**, **101/101 E2E**, **14 geradores**, CSS limpo e proteção de concorrência aprovada. Foram estruturados 4 efeitos de ancestralidade, 9 de subclasse e 69 de equipamento; reserva não concede benefício, traços-base são preservados e condicionais de cena não são aplicados cegamente.
- ⏳ Próximo bloco: características ativas determinísticas de ancestralidade, subclasse e equipamento — custo, estado, reset e entrada manual de resultado de dado quando aplicável.

