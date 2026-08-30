"""
Peças compartilhadas dos verbetes.

Um VERBETE é a explicação curta de uma palavra de mecânica, com o número da
página do livro do lado. Ele existe porque o app fala a língua das cartas e a
mesa lê o livro da Jambô: "Severo" e "grave" são a mesma coisa, e ninguém
deveria precisar descobrir isso no meio da cena.

Campos:
  id           chave estável; é o que o "veja" aponta
  termo        o nome canônico, do jeito que o app escreve
  variantes    outras grafias que também viram gatilho no texto
  categoria    para agrupar na busca
  pagina       página do livro (edição Jambô, 1ª ed., 368p)
  ancora       frase que TEM de estar naquela página do PDF —
               é o que o tools/conferir-paginas.py confere
  resumo       uma frase; é o que aparece antes de tudo
  explicacao   linhas curtas
  quadro       opcional: {'tipo': 'tabela'|'lista'|'formula', ...}
  veja         ids de outros verbetes
  errata       opcional: o que a errata de 9/9/2025 mudou
"""


def tabela(colunas, linhas, titulo=''):
    return {'tipo': 'tabela', 'titulo': titulo, 'colunas': colunas, 'linhas': linhas}


def lista(itens, titulo=''):
    return {'tipo': 'lista', 'titulo': titulo, 'itens': itens}


def formula(texto, nota=''):
    return {'tipo': 'formula', 'texto': texto, 'nota': nota}
