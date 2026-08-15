# Como o DCSS gera andares — e o que dá para roubar

**Status: leitura, não plano.** Nada aqui está agendado nem construído. É o
registro de uma pesquisa feita depois de o dono testar muitas configurações
do gerador atual e não gostar de nenhuma.

Lido do fonte em `github.com/crawl/crawl` (branch `master`), em
`crawl-ref/source/dat/des/builder/` e `crawl-ref/source/dgn-delve.cc`.
**O que está entre aspas é do fonte; o resto é leitura minha e pode estar
errado nos detalhes.** Não li o `dungeon.cc` inteiro.

---

## O achado, antes dos algoritmos

**O DCSS não tem um gerador com parâmetros. Tem um catálogo de geradores
diferentes, e sorteia um por andar.**

São vinte e quatro arquivos em `builder/`, e os `layout_*` sozinhos definem
dezenas de formas distintas. Cada uma declara onde pode aparecer e com que
peso:

```
DEPTH: D, Elf, Snake, Crypt, Pan
WEIGHT: 15 (D), 10 (Elf), 15 (Snake), 10 (Crypt)
```

Isso reenquadra a frustração que motivou a pesquisa. **Nenhum valor de
nenhum dial do rogulidle produz variedade de FORMA**, porque só existe uma
forma — o ROT Digger acreta peças a partir de uma sala inicial, e é tudo o
que ele sabe fazer. Ajustar os números muda a densidade daquela forma, não a
forma.

O DCSS resolve isso tendo várias. É a lição principal do arquivo, e vale
mais que qualquer algoritmo específico abaixo.

---

## As famílias de layout

Agrupadas por ideia, não por arquivo.

### 1. Escavação orgânica — `delve`

O primitivo mais interessante do lote, e o único implementado em C++
(`dgn-delve.cc`) em vez de Lua. Vários layouts são só chamadas diferentes
para ele.

O comentário do cabeçalho, na íntegra:

> "ngb_min, ngb_max: the minimum and maximum number of neighbouring floor
> cells that a wall cell must have to become a floor cell. 1 <= ngb_min <= 3;
> ngb_min <= ngb_max <= 8; connchance: the chance (in percent) that a new
> connection is allowed; cellnum: the maximum number of floor cells that will
> be generated."

Como funciona: mantém uma fila de células de PAREDE que fazem fronteira com
o chão já escavado. Tira uma por vez e decide se vira chão, por duas regras:

- **quantos vizinhos já são chão** — precisa cair entre `ngb_min` e
  `ngb_max`. É isso que controla se o resultado é um túnel fino serpenteando
  ou uma caverna gorda.
- **conectividade** — recusa a célula se ela juntaria dois grupos de chão
  hoje separados, a menos que um sorteio contra `connchance` permita. Com
  `connchance: 0` o resultado é uma **árvore**: um caminho só entre dois
  pontos quaisquer, sem atalho. Subindo, aparecem ciclos.

Escava até atingir `cellnum` células. Se travar antes, re-semeia e tenta de
novo, até 50 vezes.

**`connchance` é o botão que o rogulidle nunca teve.** É controle direto
sobre "quantos caminhos alternativos existem", que é exatamente a quantidade
que o `map-design.md` chama de propriedade 2 e que hoje só dá para
influenciar de lado, mexendo em quanto se escava.

### 2. Salas num esqueleto geométrico — `geoelf`

Três variantes, e a terceira é literalmente o que o dono descreveu sem saber
que existia:

- **`layout_geoelf_grid`** — "A grid of rooms, inspired by layout_roguey.
  There are no missing rooms because they mess up the corridors between rooms
  and can disconnect the map". Grade 5×5 ou 4×4, sala em cada célula com
  deslocamento aleatório pequeno, ligadas às vizinhas em horizontal, vertical
  e diagonal.
- **`layout_geoelf_diagonals`** — "A grid of rooms, with most connection
  along the diagonals." Grade 7×7 mas só as casas de um tabuleiro de damas.
- **`layout_geoelf_octagon`** — **"A large central room, with 2 rings of
  other rooms around it."** Anéis octogonais concêntricos, de 2 a 4. Liga o
  centro ao anel 1, o anel 1 em volta de si mesmo, e o anel 1 ao anel 2.

A mecânica comum: **as posições das salas não são sorteadas, são calculadas
a partir de um esqueleto** — grade, tabuleiro, anéis — e só o tamanho e um
deslocamento pequeno são aleatórios. A conexão é por adjacência no
esqueleto, não por busca.

É o oposto do Digger, e é por isso que sai com forma reconhecível.

### 3. Laços entrelaçados — `layout_loops`

"a series of interlocking looped paths", com corredores que mudam de direção
o tempo todo. Recursivo: desenha um laço grande no centro, pega as quinas
dele, desenha laços menores centrados nessas quinas, repete com as quinas que
sobraram. Depois enfia salas nas interseções.

Três variantes: anel, cruz e quatro cantos independentes.

Honestamente: bonito e caro. É o mais complexo do arquivo e o que menos
resolve o problema do rogulidle.

### 4. Cruz com braços diferentes — `layout_twisted_cross`

Vale destacar porque é o padrão de composição, não um layout: divide o mapa
em quatro quadrantes, sorteia **um tipo de braço diferente para cada um**, e
liga tudo numa câmara central em cruz. Os seis tipos de braço vão de
`delve(3,3)` a um corredor reto com uma sala no fim.

Um andar, quatro texturas. É catálogo aplicado dentro de um mapa só.

### 5. Os outros, em uma linha cada

- **`layout_rooms`** — salas retangulares, octogonais ou circulares ligadas
  por `join_the_dots`. O mais comum da Masmorra principal (peso 15).
- **`layout_roguey`** — grade de salas com labirinto entre elas (peso 25 em
  D:9+, o maior que vi).
- **`layout_caves` / `layout_cellular`** — cavernas por autômato celular.
- **`layout_regular_city`** / **`layout_subdivisions`** — grade de caixas e
  subdivisão recursiva do espaço. O segundo é BSP, que é o algoritmo do
  artigo do varav.in.
- **`layout_forbidden_donut`, `layout_cross`, `layout_big_octagon`** —
  formas únicas e simples, cada uma com peso baixo. Existem para o andar
  ocasionalmente não parecer com nada.

---

## O que roubar, em ordem

### Primeiro: a ideia do catálogo

Escrever **um segundo layout** e sortear entre ele e o Digger. Não
substituir. É o que transforma "o mapa é sempre igual" num problema
resolvido em vez de num dial a mais.

O terceiro layout custa muito menos que o segundo, porque a máquina de
escolher já vai existir.

### Segundo: `geoelf_octagon`, portado

É o mais próximo do que o dono pediu e o mais barato de escrever: posições
calculadas de um centro, sem busca, sem biblioteca. Não precisa de nenhum
primitivo novo — o rogulidle já sabe escrever retângulo de sala e corredor
em `map.tiles` (é o que `vault.js` faz).

E ele conserta uma coisa de graça: **a espinha passa a ser desenhada em vez
de descoberta.** Hoje `spine.js` roda um A* num mapa que não foi feito para
ter rota obrigatória, e lê o que sair. Num octógono o centro é o início, um
anel externo é a saída, e o que não está no caminho é opcional por
construção — que é o desenho que o `map-design.md` descreve e o gerador
nunca soube produzir.

### Terceiro: `delve`, se quiser textura de caverna

Umas 60 linhas, e dá um andar que não se parece nada com os dois anteriores.
O `connchance` é o botão de "quantos caminhos alternativos", que hoje não
existe.

### O que NÃO roubar

- **A DSL `.des`.** É C++ mais Lua mais uma linguagem própria. Num projeto
  de JavaScript sem build, portar isso é o rabo abanando o cachorro.
- **`layout_loops`.** Complexidade alta, ganho baixo para este jogo.
- **Vaults como catálogo.** O `vault.js` já faz a versão de uma sala, e um
  catálogo de salas autorais é uma frente inteira. Depois, se as formas
  novas agradarem.

---

## Uma coisa estrutural, separada dos layouts

O construtor do DCSS **valida a conectividade depois de montar, e VETA o
andar inteiro se estiver errado** — descarta e reconstrói do zero. Errar e
recomeçar é parte normal do algoritmo, não um caso de erro.

O rogulidle não tem isso e até hoje não precisou: o Digger sai conexo por
construção (medido — zero salas ilhadas em 3.000 andares). **Um layout
escrito à mão não tem essa garantia de graça.** Se algum dos portes acima
for feito, a validação de conectividade vem junto, ou vira o primeiro bug.
