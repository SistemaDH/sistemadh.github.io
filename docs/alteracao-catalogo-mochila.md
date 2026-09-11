# Catálogo completo da Mochila

Alteração pós-Lote 9 registrada em 11/09/2026.

O botão **Do livro** da aba Mochila deixou de tratar apenas os 120 registros de saque/consumíveis e agora organiza o catálogo em quatro categorias: **Saques**, **Consumíveis**, **Armas** e **Armaduras**.

- Saques e consumíveis continuam entrando em `ficha.inventario` com ID oficial.
- O corte visual antigo de 60 resultados foi removido; cada categoria pode ser percorrida e pesquisada por inteiro.
- Armas usam o fluxo canônico `tipo: arma` e são registradas na reserva, preservando tier, categoria, mãos e demais validações do motor.
- Armaduras substituem a equipada por salvamento completo e validado da ficha, depois de esvaziar a fila de toques e reler a versão atual para preservar concorrência otimista.
- Equipamentos da moldura de campanha ativa também entram no catálogo quando aplicável.
- O modal **Comprar** continua limitado a saque/consumíveis porque a ação transacional de compra atual grava o resultado na mochila; equipamento não é convertido em texto de inventário.
- A listagem de armas e armaduras respeita o patamar liberado pelo nível atual do personagem.

Cobertura E2E adicionada para garantir a presença da **Gota Estelar** (60º consumível), **Espada Larga** e **Armadura de couro**, além do fluxo existente de guardar **Saco de Dormir Premium**.
