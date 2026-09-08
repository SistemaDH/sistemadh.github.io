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
- 🔧 bônus derivados que o Lote 7 deixou apenas em texto: Guerreiro (+nível no dano físico), Ladino (Ataque Furtivo por patamar), Guardião (Dado de Determinação no dano). Devem receber suporte mecânico sem o app rolar dados.

### Ancestralidades e comunidades

- ⏳ 18 ancestralidades;
- ⏳ 9 comunidades;
- ⏳ custos, usos por descanso/sessão, bônus permanentes e estados derivados.

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
- 🔧 contagem regressiva de longo prazo: errata p.164 manda, em geral, avançar uma vez durante descanso longo; falta um subsistema completo de contagens longas de campanha.

### Morte

- ✅ três movimentos de morte, cicatrizes, inconsciência e encerramento de jornada (Lote 5);
- ⏳ interações de itens/efeitos com movimento de morte e cicatriz.

### Subida de nível / multiclasse

- ⏳ opções por patamar;
- ⏳ limites de PV/Fadiga 12;
- ⏳ aumento de duas Experiências +1 cada conforme errata p.110;
- ⏳ domínio, subclasse e multiclasse.

### Equipamento

- 🔧 Broquel (`Buckler`) está com o texto PT mecânico errado: precisa usar **Pontos de Armadura disponíveis**, conforme errata p.125;
- 🔧 Cadeira de Rodas de Combate do livro não está no catálogo atual;
- 🔧 Chicote (`Whip`) está com tradução mecânica incorreta no catálogo atual: o original manda empurrar adversários de alcance Corpo a Corpo para alcance Próximo; o texto armazenado hoje termina novamente em Corpo a Corpo;
- 🔧 inventário/troca de armas: até duas armas extras e 1 Fadiga para troca em situação perigosa; sem custo em situação calma/preparo durante descanso;
- ⏳ todas as armas principais;
- ⏳ todas as armas secundárias;
- ⏳ todas as armaduras;
- ⏳ características de armas/armaduras e efeitos derivados;
- ⏳ tesouro;
- ⏳ consumíveis.

### Cartas de domínio

- 🔧 Livro de Grynn — Muralha de Chamas precisa dizer **temporária** conforme errata p.333;
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
- ⏳ Habilidade de Esperança do Ladino até próximo descanso;
- ✅ Anéis Brilhantes T1 d10+2;
- ✅ Lança: sem Incômoda e dano corrigido por patamar;
- ✅ Espada Longa: dano corrigido por patamar;
- 🔧 Broquel: texto/efeito PT incorreto no catálogo atual;
- ✅ Garras de Punho T4: uma mão;
- ✅ Musgo Doce: 1d10 PV ou Estresse durante descanso;
- 🔧 avanço de contagem de longo prazo;
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
- ✅ `Combat Wheelchair` / Cadeira de Rodas de Combate não foi encontrada no catálogo atual e deve ser adicionada antes de a seção de equipamento ser considerada completa.
- ✅ `Whip` existe em todos os patamares relevantes, mas a característica `Startling` está traduzida de forma mecanicamente errada: o texto inglês manda mover adversários de Melee para Close; o texto PT atual termina novamente em Corpo a Corpo. Corrigir a tradução em todas as variantes geradas a partir da mesma fonte.
- ✅ O equipamento exclusivo de moldura permanece separado no catálogo, o que evita colisão por nome com equipamento do Capítulo 2 e deve ser preservado.

Este bloco só será marcado como implementado quando a fonte de dados, o gerador correspondente e o arquivo gerado estiverem coerentes, com `conferir-gerados` verde.

---

# Implementação do Lote 8

## Equipamentos — preparação reproduzível

- `tools/auditoria-equipamento.py` contém as correções idempotentes de `Deflecting`/Broquel e `Startling`/Alarmante, com fonte registrada;
- `tools/conferir-equipamento-lote8.py` foi adicionado como teste de aceitação do catálogo estático: ele exige Broquel baseado em **Pontos de Armadura disponíveis** e exige as quatro variantes T1–T4 do Chicote como **Alarmante**, deslocando de Corpo a Corpo para Próximo;
- o conferidor apenas lê o JSON e falha em regressões; ele não corrige dados;
- o frontend lê `data/equipamentos.json` diretamente, portanto não é permitido considerar o backend gerado como suficiente sem materializar as mesmas correções no JSON;
- neste runtime o conferidor ainda **não foi executado**, pois não há checkout local funcional e o repositório não possui GitHub Actions. Não registrar resultado verde até execução real.

Pendentes para fechar esta parte: materializar o JSON, regenerar `backend/44_Equipamento.gs` e executar os conferidores/suítes.
