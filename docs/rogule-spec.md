# Especificação de regras do Rogule (Fase 0)

Engenharia reversa de <https://github.com/chr15m/rogule.com> (ClojureScript),
commit `HEAD` em 2026-08-05. Este documento é a fonte da verdade para a
reimplementação em `rogulidle`.

Referências de arquivo abaixo apontam para o source original.

---

## 0. Licença — leia antes de escrever código

O Rogule é **AGPL-3.0** (`LICENSE.md`). Consequências práticas:

- Um port derivado deste código precisa ser AGPL-3.0.
- A cláusula de rede da AGPL vale para jogos servidos por HTTP: se o
  rogulidle for publicado na web, o código-fonte completo tem que ser
  oferecido a quem joga.
- Regras e mecânicas de jogo em si não são protegidas por copyright — só a
  expressão em código. Mas este documento foi escrito lendo o source, então
  a implementação que sair dele é razoavelmente tratável como derivada.

Recomendação: licenciar o rogulidle como AGPL-3.0 e creditar o original.
Custo zero para um projeto pessoal e elimina a dúvida.

---

## 1. Constantes globais

| Constante | Valor | Origem |
|---|---|---|
| Tamanho do mapa | **32 × 32** | `ui.cljs:26` |
| Raio de visão | 9 | `ui.cljs:27` |
| Raio de nitidez total | 7 | `ui.cljs:29` |
| Viewport renderizado | **18 × 18** | `ui.cljs:148-152` |
| HP inicial do jogador | `[10, 10]` | `generator.cljs:216` |
| XP inicial do jogador | 3 | `generator.cljs:26` |
| Itens cobertos por mapa | 15 | `generator.cljs:326` |
| Monstros por mapa | 5 | `generator.cljs:326` |
| Taxa de regeneração | 100 | `engine.cljs:27` |

> **O grid 18×18 é o viewport, não o mapa.** O mapa é 32×32 e a câmera é
> centrada no jogador. Tiles com distância² > 81 são renderizados com
> opacidade 0; entre 49 e 81, opacidade 0.75. A opacidade é recalculada a
> cada frame a partir da posição atual — **não existe memória de fog**, um
> tile já visto volta a ficar escuro ao se afastar. Ver §10.1.

---

## 2. Geração do mapa

`generator.cljs:141` — `make-digger-map`.

Usa `ROT.Map.Digger` (rot-js) 32×32, com `corridorLength: [1, 5]` e o resto
nos defaults do rot-js. Semeado com `ROT.RNG.setSeed(djb2a("map-<seed>-32-32"))`.

Tipos de tile derivados:

- `:room` — todos os tiles dentro do retângulo de cada sala (`_x1.._x2`, `_y1.._y2`)
- `:door` — posições em `room._doors`
- `:corridor` — tiles cavados que não pertencem a nenhuma sala
- `:room-wall` / `:corridor-wall` — tiles não-cavados adjacentes (vizinhança 8) a sala/corredor

`floor-tiles` = união de todos os cinco. Tiles ausentes do mapa são "vazio"
(nem chão, nem parede desenhada).

**Passabilidade do jogador** (`engine.cljs:321`): `:room`, `:door`, `:corridor`.
Parede e vazio bloqueiam.

**Pathfinding**: `ROT.Path.AStar` com `topology: 4` (`map.cljs:58`).
Movimento é 4-direcional. Sem diagonais em lugar nenhum.

### Ordem de povoamento (`generator.cljs:292`)

Importa, porque cada passo remove tiles do pool livre:

1. **Jogador** — posição uniforme entre os tiles `:room ∪ :corridor`.
2. **`paths-to-rooms`** — para cada sala, A* do jogador até o centro da sala.
   Lista ordenada por `(juxt :path count)` — ver quirk §9.1.
3. **Santuário** ⛩ — no `:center-pos` do **último** elemento de `paths-to-rooms`.
4. **15 itens cobertos** — ver §4.
5. **5 monstros** — ver §3.

### Métrica de dificuldade posicional

`map.cljs:68` — `pos-to-difficulty`:

```
difficulty(pos) = len(A*(player, pos)) / len(path do último elemento de paths-to-rooms)
```

Aproximadamente "quão longe do spawn, normalizado". Usada para escalar
monstros e — invertida — a chance de loot.

---

## 3. Monstros

`generator.cljs:76` — `monster-table`, 11 entradas, índice 0..10.

| # | Nome | Emoji | `activation` | `xp` | `hp` |
|---|---|---|---|---|---|
| 0 | the rat | 🐀 | 3 | 1 | 2 |
| 1 | the bat | 🦇 | 10 | 2 | 3 |
| 2 | the ghost | 👻 | 10 | 3 | 3 |
| 3 | the boar | 🐗 | 15 | 3 | 4 |
| 4 | the wolf | 🐺 | 20 | 4 | 5 |
| 5 | the ogre | 👹 | 10 | 4 | 7 |
| 6 | the zombie | 🧟 | 5 | 5 | 9 |
| 7 | the vampire | 🧛 | 15 | 6 | 8 |
| 8 | the genie | 🧞 | 20 | 6 | 10 |
| 9 | the dragon | 🐉 | 10 | 8 | 15 |
| 10 | the t-rex | 🦖 | 15 | 10 | 12 |

**O número exibido acima do emoji é o `xp`** (`ui.cljs:64`). O texto de ajuda
do jogo o descreve como "o dano máximo que ele pode causar" — na prática o
dano rolado é `0..xp-1` (§5), então o rótulo é aproximado.

Note que `activation` **não** correlaciona com força: a rat (mais fraca) tem
raio 3, o zombie (forte) tem 5, o genie tem 20. É o raio de perseguição.

### Colocação (`generator.cljs:259`)

```
pos        = uniforme entre os tiles livres restantes
difficulty = min(1, pos_to_difficulty(pos) * 0.75)
index      = floor(difficulty * 10)
```

Sub-tabela ponderada em volta de `index`:

| deslocamento | peso |
|---|---|
| `index` | 6 |
| `index + 1` (clamp 10) | 2 |
| `index - 1` (clamp 0) | 2 |
| `index + 2` (clamp 10) | 1 |
| `index - 2` (clamp 0) | 1 |

Ver quirk §9.2 sobre o comportamento nas bordas.

**Drop**: 50% de chance (`Math.random() > 0.5`) de o monstro carregar um item
de `forage-items` (§4), sorteado pela mesma tabela ponderada. O drop segue o
monstro enquanto ele anda (`engine.cljs:88`) e cai no chão quando ele morre.

---

## 4. Itens

### `forage-items` (`generator.cljs:28`)

Sorteados por `get-random-entity-by-value` (`map.cljs:90`), com **peso =
1/value** — ou seja, `value` alto significa item *raro*.

| Item | Emoji | `value` | peso | prob. | Efeito |
|---|---|---|---|---|---|
| chestnut | 🌰 | 1 | 1.000 | 32.9% | nenhum (colecionável) |
| mushroom | 🍄 | 2 | 0.500 | 16.4% | nenhum (colecionável) |
| health | 🥃 | 2 | 0.500 | 16.4% | **+3 HP**, até o máximo |
| shield | 🛡️ | 3 | 0.333 | 11.0% | **+1 armadura** |
| dagger | 🗡️ | 3 | 0.333 | 11.0% | **+1 dano** |
| axe | 🪓 | 4 | 0.250 | 8.2% | **+2 dano** |
| gem-stone | 💎 | 8 | 0.125 | 4.1% | nenhum (colecionável) |

Soma dos pesos: 3.0417.

> **Só ~30% do loot afeta combate** (shield/dagger/axe) e ~16% cura. Mais da
> metade é pontuação pura. Isso é decisivo para a regra "buscar recursos
> antes de engajar" do bot: o valor esperado de abrir uma cobertura é baixo.

Armadura e dano são **aditivos e sem limite** — o inventário acumula. Dois
machados = +4 de dano.

### `item-covers` (`generator.cljs:65`)

🪴 potted plant, 🪨 rock, 🪵 wood block. Escolhidos **uniformemente**
(`rand-nth`), sem peso.

### Colocação de itens cobertos (`generator.cljs:232`)

```
sala       = uniforme entre paths-to-rooms
pos        = uniforme entre os tiles livres daquela sala
difficulty = pos_to_difficulty(pos) * 0.9
conteúdo   = forage-item sorteado, SE Math.random() > difficulty; senão vazio
```

> **A chance de loot é invertida em relação à distância**: quanto mais longe
> do spawn a cobertura estiver, *menor* a chance de ter algo dentro.
> Coberturas perto do jogador são as boas. Contraintuitivo, mas é o que o
> código faz. Ver §9.3.

Coberturas só aparecem **dentro de salas**, nunca em corredores.

---

## 5. Combate

`engine.cljs:250` — `combat [*state their-id my-id]`. O golpe vai
**them → me**: `their-id` é quem se moveu (atacante), `my-id` é quem ocupava
o tile (defensor).

```
hit       = 1 com prob. 5/6, 0 com prob. 1/6      ; getItem([0,1,1,1,1,1])
roll      = inteiro uniforme em 0 .. (atacante.xp - 1)
weapons   = soma de :dmg do inventário do atacante
armour    = soma de :armour do inventário do defensor
dano      = max(0, (roll + weapons - armour) * hit)
hp_novo   = max(0, defensor.hp - dano)
morreu    = hp_novo == 0
```

Pontos que mudam a estratégia do bot:

- **Não há contra-ataque.** Só quem se move ataca. O duelo é estritamente
  alternado: jogador ataca no turno dele, monstro ataca no turno dele.
- **`xp` é a estatística de dano de ambos os lados.** O jogador começa com
  xp 3, rolando 0..2. Um t-rex (xp 10) rola 0..9.
- **O roll pode ser 0.** Mesmo acertando (`hit = 1`), um atacante com xp 1
  (rat) sempre causa 0. E monstros **nunca** ganham bônus de arma: o cálculo
  lê `:inventory`, que monstros não possuem — o item que carregam fica em
  `:drop`, que não entra na conta. Logo **a rat 🐀 é permanentemente
  inofensiva**: kill grátis, sem custo de HP, e vale 1/2 de um ponto de xp.
- **Armadura subtrai antes do clamp**, então armadura ≥ xp-1 do monstro
  torna o jogador imune àquele monstro.
- Dano esperado por golpe do atacante = `(5/6) * E[max(0, roll + weapons - armour)]`.

### Ganho de XP

`engine.cljs:271` — a cada **2 kills** do jogador, `xp += 1`. A contagem é
`(mod (count kills) 2) == 0` avaliada logo após o kill.

### Regeneração

`engine.cljs:112` — um contador `hp-inc` incrementa a cada turno gasto; ao
atingir `rejuvination-rate` (100), o jogador ganha **+1 HP** e o contador
zera. Só conta enquanto o HP não estiver cheio.

> +1 HP a cada 100 turnos é desprezível na escala de uma run. Para o bot,
> tratar como ruído — não vale a pena "farmar" turnos para curar.

### Morte

O morto vira 💀 na camada `:floor`, perde as fns `:update` e `:encounter`
(vira cenário inerte), e seu `:drop` cai no chão.

---

## 6. Loop de turno

`engine.cljs:365` — `process-arrow-key!`.

```
1. reset-combat-list
2. move-to(:player, nova_pos)      ; nova_pos = nil quando é descanso
3. se (sem outcome) E (player.moved):
     moves += 1
     restore-player-health
     update-monsters                ; todos os monstros agem, em ordem de :entities
     expire-messages
```

### `move-to` (`engine.cljs:60`) — resolução de uma ação

Ordem importa:

1. Se `nova_pos` é nil → descanso, `moved = true`, nada mais acontece.
2. **Dispara a `:encounter` de todas as entidades no tile de destino**, em
   sequência, acumulando `item-blocks?`.
3. Decide:
   - `item-blocks? = true` → o jogador **não se move**, mas `moved = true`
     (o turno passa). É o caso de combate e de destampar cobertura.
   - senão, tile passável → jogador se move, `moved = true`.
   - senão (parede) → `moved = false`.

> **Andar contra uma parede não consome turno.** Os monstros não agem.
> Inofensivo, mas o bot nunca deve escolher essa ação — é um no-op puro.

### Tabela de `item-blocks?` por encontro

| Encontro | fn | bloqueia? | efeito |
|---|---|---|---|
| Monstro | `combat` | **sim** | jogador ataca, fica no lugar |
| 🪴🪨🪵 cobertura | `uncover-item` | **sim** | cobertura some, drop (se houver) vira item de chão |
| Item de chão | `add-item-to-inventory` | não | entra no inventário, jogador ocupa o tile |
| 🥃 health | `increase-hp` | não | +3 HP e some — **mas se o HP estiver cheio, não é consumido e continua no mapa** |
| ⛩ santuário | `finish-game` | **sim** | fim de jogo, `:ascended` |

> **Uma cobertura custa 2 turnos**: um para destampar, outro para andar em
> cima e pegar o drop. Com 15 coberturas e ~50% delas vazias, o custo de
> "limpar o mapa" é alto. O bot precisa precificar isso.

---

## 7. IA dos monstros

`engine.cljs:343` — `chase-player`, chamada uma vez por monstro por turno.

```
passable = tiles :room/:door/:corridor
           E não ocupados por outra entidade :occupy
           (exceto o próprio monstro e o jogador)
path     = A*(monstro, jogador, passable, topology 4)
se len(path) < monstro.activation  E  uniform() < 0.9:
    move_to(path[1])
```

- `len(path)` inclui as duas pontas. Monstro adjacente ao jogador → `path`
  tem 2 elementos. Então `activation` é efetivamente "persegue se estiver a
  menos de `activation - 1` passos".
- **10% de chance de não se mover** a cada turno, por monstro. Isso é ruído
  irredutível na previsão do bot.
- Monstros **não se empilham** — cada um bloqueia o caminho do outro. Isso é
  o que torna corredores defensáveis: um corredor de largura 1 força duelos
  1×1, exatamente a regra 2 da estratégia.
- O jogador **não** é obstáculo no pathfinding do monstro; andar em cima do
  jogador é o ataque.
- Se não existir caminho, `path` é vazio → o monstro descansa.
- Monstros nunca fogem, nunca pegam itens, não têm inventário
  (logo: `weapons = 0`, `armour = 0`, salvo o drop que carregam, que **não**
  entra no cálculo — `:drop` não é `:inventory`).

---

## 8. Condições de fim

- **Vitória** (`:ascended`): entrar no tile do santuário ⛩.
- **Derrota** (`:died`): HP do jogador chega a 0.
- **Não há limite de turnos.** Não há limite de tempo dentro da run.
- Não há requisito de matar monstros nem de coletar itens para vencer — o
  santuário está disponível desde o turno 1. Coletáveis e kills só entram no
  placar compartilhado.

---

## 9. Quirks do original (decidir: replicar ou corrigir)

### 9.1 Ordenação de `paths-to-rooms` — santuário mal posicionado

`generator.cljs:310`: `(sort-by (juxt :path count) ...)`.

`(juxt :path count)` devolve `[o-vetor-do-caminho, 3]` — `count` conta as
chaves do mapa `{:center-pos :room :path}`, sempre 3. O resultado é uma
ordenação **lexicográfica pelas coordenadas do caminho**, não pelo
comprimento. Quase certamente a intenção era `(comp count :path)`.

Consequências: o santuário **não** fica necessariamente na sala mais
distante, e `pos-to-difficulty` normaliza por um denominador arbitrário — o
que distorce toda a curva de dificuldade de monstros e loot.

**Recomendação: corrigir.** Ordenar por comprimento real do caminho.

### 9.2 Colisão de chaves na sub-tabela de monstros

`generator.cljs:267`: nas bordas (`index` 0, 1, 9, 10), os clamps fazem
chaves distintas colapsarem na mesma. Num mapa construído em ordem de
inserção, a última escrita vence — em `index = 0`, o peso 6 é sobrescrito
pelo `index-2` clampado, virando 1. O monstro "alvo" fica *menos* provável
que o vizinho.

**Recomendação: corrigir**, somando pesos em vez de sobrescrever.

### 9.3 Loot invertido pela distância

`generator.cljs:237-243`: `item` só existe se `Math.random() > difficulty`,
onde `difficulty` cresce com a distância. Coberturas longe do spawn são as
mais prováveis de estarem vazias.

Pode ser intencional (evita que o jogador seja recompensado por avançar em
território perigoso) ou um sinal invertido. Combinado com 9.1, a curva toda
é suspeita.

**Recomendação: inverter** (loot melhor mais longe), e tratar como parâmetro
de balanceamento na Fase 4.

### 9.4 RNG fragmentado

O original mistura três fontes:

- `ROT.RNG` — semeado explicitamente para o digger
- `combat-dice` = `ROT.RNG.clone()` capturado no load do namespace, **nunca
  re-semeado** — o combate não é reprodutível a partir do seed
- `Math.random` / `rand-nth` — funciona só porque `seedrandom(..., {global: true})`
  monkey-patcha o `Math.random` global em `reset-game!` (`ui.cljs:312`)

**Recomendação: um único PRNG explícito**, passado adiante, com streams
nomeados separados (`map`, `spawn`, `combat`) derivados do seed raiz. Sem
isso, não dá para reproduzir a run que o bot jogou mal.

### 9.5 Somas com `nil`

`get-weapons-dmg` faz `(apply + (map :dmg inventory))` — itens sem `:dmg`
produzem `nil`, e a soma só funciona porque em JS `null + 1 === 1`. Na
reimplementação, tratar ausente como 0 explicitamente.

---

## 10. Decisões em aberto para o rogulidle

### 10.1 Fog of war — **decidido: fog real com memória**

Decisão do dono em 2026-08-05: o bot **não** é onisciente. Ele decide com o
que está na tela mais uma memória do que já viu.

Consequências arquiteturais — ver §12 para o modelo completo.

### 10.2 Contagens de povoamento

5 monstros e 15 coberturas num mapa 32×32 é **muito esparso** — a maior
parte da run é caminhada vazia. A meta que você descreveu ("eliminar todas
as criaturas antes do portal") são só 5 kills.

Para um idle assistível, subir monstros e/ou reduzir o mapa provavelmente é
necessário. Fica como parâmetro para a Fase 4.

### 10.3 Escopo do "idêntico"

O que precisa bater com o original: tabelas, matemática de combate, ordem de
turno, IA dos monstros. O que não precisa: as três quirks acima, o RNG
fragmentado, o fluxo diário/localStorage/share.

---

## 11. Mapa de portabilidade

| Original | rogulidle |
|---|---|
| `map.cljs` | geometria de tiles, A*, helpers de RNG |
| `generator.cljs` | tabelas + geração de nível |
| `engine.cljs` | `step(state, action)`, combate, IA dos monstros |
| `ui.cljs` | render do viewport + loop de espectador |
| `emoji.cljs`, `loader.clj`, `twemojis.cljc` | descartar — usar emoji Unicode direto |
| `server.cljs`, `util.cljs` | descartar — sem daily, sem share |

Dependências a substituir: `rot-js` (Digger + A* + RNG ponderado) e
`seedrandom`. O A* com topology 4 e a tabela ponderada são triviais de
reescrever; o `Map.Digger` é a única peça não-trivial — vale usar o `rot-js`
direto via npm, que é MIT.

---

## 12. Modelo de observação (consequência da decisão §10.1)

Com fog real, o motor deixa de ter uma única representação de estado. Passa
a ter duas, e o `step()` precisa expor as duas separadamente:

- **`GameState`** — a verdade. Mapa completo, todas as entidades. Só o motor
  e o renderizador de debug enxergam.
- **`Observation`** — o que o jogador percebe neste turno.
- **`Belief`** — a memória acumulada do bot, construída dobrando cada
  `Observation` sobre a anterior. É a **única** entrada do bot.

Contrato: `step(GameState, action) → { GameState, Observation }` e
`fold(Belief, Observation) → Belief`. Se o bot tocar em `GameState`, o fog
virou decoração — vale um teste que garanta isso.

### 12.1 Visibilidade é por distância, não por linha de visão

O original calcula opacidade puramente de `distance²` até o jogador
(`ui.cljs:153`). **Não há raycasting: o jogador enxerga através de paredes**
dentro do raio 9.

Isso não é um bug a corrigir — é o que torna as regras 1 e 3 jogáveis.
Escolher entre "a sala com o rat" e "a sala com o ghost" exige enxergar o
conteúdo das duas antes de entrar. Com linha de visão real, o bot só
descobriria o que há numa sala depois de cruzar a porta, e as duas regras
degeneram em tentativa e erro.

**Recomendação: manter visibilidade por distância.** Fiel ao original e
estrategicamente mais rico.

### 12.2 O que persiste na memória

| Categoria | Persiste? | Observação |
|---|---|---|
| Tiles (chão/parede/porta) | **sim, permanente** | estáticos |
| 🪴🪨🪵 coberturas | **sim, permanente** | estáticas até serem destampadas |
| Itens de chão, ⛩ santuário, 💀 corpos | **sim, permanente** | estáticos |
| **Monstros** | **não — envelhece** | movem-se; ver abaixo |

Monstro é o único caso difícil. A memória guarda
`{ tipo, xp, hp_visto, ultima_pos, turno_visto }`. Fora do raio de visão a
posição é uma hipótese que envelhece — e como monstros só se movem quando o
jogador está dentro do `activation` deles (§7), o envelhecimento não é
uniforme:

- Se `dist(jogador, ultima_pos) ≥ activation`, o monstro está **parado por
  construção**. A memória continua exata por tempo indefinido.
- Caso contrário, ele está perseguindo, e a incerteza cresce ~1 tile por
  turno (com 10% de chance de não andar).

Ou seja, a memória do bot é confiável exatamente nas regiões que ele evita —
o que é conveniente, e é a base da formalização da regra 1 em
`docs/bot-strategy.md`.

### 12.3 Exploração passa a ser obrigatória

Sem onisciência, o santuário pode simplesmente não ter sido visto ainda. O
bot precisa de um tipo de objetivo novo — **fronteira**: tiles conhecidos e
passáveis adjacentes a tiles desconhecidos. Sem isso a run trava.

Custo real desta decisão: uma camada a mais na seleção de alvos (Fase 3) e
um `Belief` a mais para testar (Fase 1). Não é gratuito, mas é o que dá
sentido a "assistir" — um bot onisciente não hesita, e hesitação é metade da
graça de olhar.

---

## 13. Divergências deliberadas do original

Diferente de §9, que lista prováveis bugs a corrigir. Aqui são mudanças de
regra conscientes.

### 13.1 Não existe regeneração passiva

**Problema no original.** `restore-player-health` (`engine.cljs:112`) dá +1
HP a cada 100 turnos gastos, sem limite, e monstros são estáticos fora do
`activation` (§7). Logo existe sempre uma zona onde o jogador cura de graça
e para sempre. Sem limite de turnos (§8), o HP máximo efetivo é infinito.

Para um humano isso é só tedioso, e a etiqueta da mesa resolve. Para um bot
que maximiza vitória, é a jogada ótima — ele acampa antes de cada duelo, o
HP para de significar qualquer coisa e a run vira mecânica.

**Regra nova.** Não há regeneração passiva nenhuma. Esperar não cura.

**A única fonte de HP é a poção 🥃**, que só cai de criatura (§13.3). Curar
deixa de ser algo que o tempo dá e passa a ser algo que se conquista.

Tentamos primeiro um teto por run — `ceil(20% × hp_máximo)`, com o contador
avançando em todo turno para não ser contornado andando em círculos. Ele
funcionava, mas era maquinário para um recurso que a gente não queria que
existisse. Remover é mais simples e não deixa nada para explorar.

**Consequência:** HP vira estritamente não-renovável a não ser por loot. A
ordem dos duelos deixa de ser otimização de margem e passa a determinar se
a run termina, e a resposta a HP baixo passa a ser jogar melhor — escolher
duelo mais barato, buscar escudo antes — em vez de esperar.

### 13.2 Armadura é uma segunda barra, não redução de dano

**Problema no original.** `dano = max(0, roll + armas − armadura)` (§5). Como
o roll de um monstro vai até `xp−1`, uma armadura `A` **zera completamente**
todo monstro com `xp ≤ A+1`. Não é uma inclinação, é um degrau: cada ponto
apaga uma faixa inteira da tabela de uma vez, e depois de ~5 pontos não
sobra nada para anular.

Numa run de um andar isso é uma reviravolta boa. Numa descida de dez andares
é o que impede a dificuldade de subir: medido, o herói chegava ao andar 3
com armadura suficiente para ser intocável, e terminava os dez andares com
HP cheio. Nenhuma curva de dificuldade alcança um alvo invulnerável.

**Regra nova.** Armadura sai da fórmula de dano e vira uma **segunda barra**
que absorve o golpe antes do HP:

```
dano = (roll + armas) × acerto          // o defensor saiu da conta

gasta-se a armadura primeiro, o que sobrar desce no HP
```

O HP máximo **nunca se move** — fica em `PLAYER_HP`. Um escudo recarrega a
barra de armadura em `armour: 3`, e essa armadura é **consumida**.

**Quatro consequências, e a primeira é a que mais importa:**

1. **Armadura vira fluxo, não estoque.** Quinze escudos ao longo de dez
   andares não deixam o herói permanentemente mais resistente — eles são
   gastos e precisam ser repostos. É a única mudança testada nesta série
   que ataca o acúmulo na raiz em vez de reduzir a taxa dele.
2. **`hpMax` volta a ser constante.** Todo código que assume "o máximo é 10"
   volta a estar correto sozinho — inclusive o `hpMax: PLAYER_HP` fixo do
   analisador, que numa versão de HP-extra teria virado bug silencioso.
3. **Nada fica inofensivo.** Só um monstro de xp 1 causa zero, por ter um
   dado de uma face só. O teto de poder some por construção.
4. **O modelo do bot encolhe.** O dano de um monstro não depende mais do
   equipamento do herói, então `duelCost` para de reprecificar tudo a cada
   escudo. Uma variável a menos.

**Descartado:** armadura como HP máximo extra numa poça só. Chegou a ser
implementada. Era ligeiramente menos código no combate, mas fazia `hpMax`
variar — quebrando a invariante do item 2 — e, pior, mantinha o escudo como
ganho **permanente**, que é exatamente o acúmulo que a gente queria conter.

**A calibração inteira fica inválida** com esta mudança, incluindo a curva
de vitória por dial em `docs/balance.md`. Espere o começo mais difícil: um
escudo não torna mais morcegos inofensivos.

### 13.3 Consequência de design

Com o teto, **HP vira recurso não-renovável**. Toda a estratégia do bot se
reorganiza em volta disso: a ordem dos duelos deixa de ser otimização de
margem e passa a determinar se a run termina. Ver `bot-strategy.md` §5.

### 13.4 HP máximo cresce com as mortes (M6)

**Não existe no original.** Rogule nunca move `PLAYER_HP` — é constante do
início ao fim, e §13.2 tinha acabado de restaurar essa invariante depois do
experimento de "armadura como HP extra" que a quebrava.

**Reabrimos a invariante de propósito.** Medido (`docs/observed-ruler.md`):
o *buffer* (`hp efetivo ÷ golpe médio do andar`) **cai** ao longo da
descida — o herói termina absorvendo uma fração dos golpes que absorvia no
começo, enquanto o desafio sobe. Todo o programa de variância planejado
depois disto (M2–M5) acrescenta uma cauda letal, e uma cauda letal contra um
buffer que cai não é tensão — é morte súbita sem arco.

**Regra nova.** A cada `HP_GRANT_PER_KILLS` mortes, `hp_máximo` **e** `hp`
atual sobem `HP_GRANT_AMOUNT`. Mesma cadência do ganho de xp original
(`KILLS_PER_XP`), mesmo lugar no código — "matar deixa mais forte" já era o
idioma de progressão do jogo; isto é a metade defensiva dele.

**As duas barras, não só o teto — e isso não é detalhe.** Não há
regeneração (§13.1). Um herói que ganha teto sem ganhar HP atual chega a
cada andar exatamente tão machucado quanto antes, e o buffer *medido* (que
lê o herói na chegada, não o teto teórico) mal se move. Por isso isto é, em
parte, um mecanismo de cura — que §13.1 removeu de propósito. A diferença é
a mesma razão que motivou aquela remoção: o original curava com **tempo**,
então um bot podia acampar numa zona fria e encher para sempre — "maquinário
guardando um recurso que a gente não queria que existisse". Cura ganha por
**morte** não pode ser acampada: o suprimento é finito, fixado na geração, e
gastá-lo custa a luta. Mesmo recurso, sem exploit, sem precisar de teto.

**Medido, e a tensão é real.** Buffer sobe de ×0,846/andar (desligado) para
×0,910/andar (padrão, `per=2, amount=1`) nos andares 1–6 — melhora real
(z≈2,1) mas **ainda cai**. E `finishes` — a fração de runs em que o bot
alcança o fundo — quase dobra no mesmo intervalo: 30,7% → 56,7% em seeds
pareadas (n=150). Testado um intervalo de taxas (0,125 a 0,5 hp/morte):
**nenhuma** melhora o buffer sem também inflar `finishes`. Reduzir a taxa
protege `finishes` só um pouco e não compra buffer de volta — na taxa mais
baixa o buffer não se move de forma nenhuma (z≈0,3) e `finishes` já está em
44,7%. Tabela completa em `docs/backlog.md`, item M6.

**Estado atual: construído, `HP_FROM_KILLS = false`.** O mecanismo funciona e
não está retratado; o que foi revertido é a adoção. Foi ligado brevemente
enquanto o M7 seria o próximo trabalho, para servir de linha de base a ele.
Com a ordem alterada por decisão do dono, o que a mudança compra (+0,095 de
buffer) não justifica o que custa (26 pontos de `finishes`, fora da faixa) —
sobretudo porque a meta que ele não atingiu foi depois **retirada**.

**A meta de buffer ~×1,16 não existe mais.** Ela era um número do DCSS
derivado para um jogador real, aplicado a uma leitura de sonda, e a medição
I5 mostrou duas coisas que a derrubam. Buffer é na verdade **duas
grandezas** — capacidade (o que o herói acumula descendo) e atrito (quanto o
andar toma de volta) — e a taxa medida depende da sonda: a mesma concessão
de ~+42 hp lê ×1,011/andar sobre a base de 400 hp da sonda e ~×1,20 sobre os
10 hp de um herói real. Uma grandeza que se move vinte vezes conforme uma
opção do instrumento não sustenta barra absoluta.

O critério que substitui é comparativo: capacidade sobe, atrito é reportado
ao lado com o viés de sobrevivência declarado, e buffer só é citado junto da
janela de andares em que foi ajustado — o sinal dele se inverte entre 1–6 e
1–10, e o I5 mostrou que essa inversão é **seleção por sobrevivência**, não
o jogo ficando tolerante. Ver `docs/backlog.md`, "Targets for objective 1".

### 13.5 Criaturas nascem em grupos, com um tipo compartilhado (M7)

**Não existe no original.** Rogule posiciona cada criatura de forma
independente — uma posição e um tipo por sorteio, sem relação com as
vizinhas.

**Problema no original.** A dificuldade cresce quase inteiramente pela
CONTAGEM de criaturas por andar, e o CV de uma soma de `n` sorteios
independentes cai com `1/√n` — quanto mais criaturas, mais previsível fica
o andar, mesmo que cada criatura continue tão variável quanto antes. Nada
que mude uma criatura por vez resolve um problema que é sobre o número
delas.

**Regra nova.** Atrás de uma flag (`DIFFICULTY_REBALANCED`, desligada por
padrão): o motor sorteia uma zona e uma âncora por CLUSTER, não por
criatura; um único tier é sorteado para o cluster inteiro a partir da
profundidade da âncora; e as posições do grupo saem de uma busca (BFS) que
respeita a mesma zona (espinha/lateral) da âncora. `CLUSTER_SIZE = 1`
reproduz exatamente o sorteio antigo, criatura por criatura, sorteio por
sorteio — é para isso que a flag desligada resolve. Junto do clustering,
dois outros diais se movem para manter o mesmo orçamento de desafio
(`docs/backlog.md`, M7): a contagem cresce mais devagar (1,3 → 1,15/andar) e
a força passa a crescer onde antes era plana (1,0 → 1,07/andar, expoente
2,356 sobre a tabela de monstros).

**Consequência.** Um cluster é sempre um único tipo de criatura — "grupo de
ratos", não um bicho aleatório ao lado de outro — o que aproxima o sorteio
de um único draw em vez de `k` independentes, cortando a diluição do CV sem
esvaziar o andar. Testado e descartado no meio do trabalho: agrupar só por
posição, com cada criatura ainda sorteando seu próprio tipo, não move o CV
nada (medido 0,945 contra uma base de 0,944) — a proximidade sozinha não
compra nada; o grupo precisa ser um tipo só.

**Estado atual: ADOTADO, `DIFFICULTY_REBALANCED = true`.** Ver
`docs/backlog.md` M7 para os números medidos (Review 2) — CV subiu de 0,941
para 0,986 por andar (~3σ, dentro de 1σ da meta de ≥1,00), challenge/power e
finishes dentro das faixas, e um teto estrutural em torno do `CLUSTER_SIZE`
então em 6: com a contagem já mais lenta, o andar 10 chegava a apenas 7
criaturas, então um cluster de 6 já era quase o andar inteiro e não sobrava
o que agrupar. **M12 depois mudou os dois números** (contagem 1,15→1,22,
`CLUSTER_SIZE` 6→10) para encher os andares de volta — mesma regra, números
diferentes; ver `docs/backlog.md` M12, não uma nova divergência. Registrado
também no Review 2: o desafio leu inalterado na sonda (1,341 → 1,337)
enquanto `finishes` do bot real caiu 11,3 pontos — a sonda subestima o
efeito do agrupamento contra um jogador competente, então "desafio se
manteve" descreve o instrumento, não uma alegação de que a
dificuldade não mudou.

**Correção (M10).** Com andares pequenos e `CLUSTER_SIZE` grande, um único
cluster passou a poder conter o andar inteiro — e então uma única decisão
de zona decidia tudo, sem chance de correção, o que empurrou floor 7 para
97% de massa na espinha (teto era 95%). A âncora e o tier continuam sendo
sorteados uma vez por cluster; o que mudou é que a cota (`spineMass`/
`sideMass`) agora é reconferida a cada MEMBRO adicionado, não só uma vez
por cluster — assim que adicionar o próximo membro contrariaria a cota, o
resto das posições daquele cluster é abandonado e a próxima iteração
decide a zona de novo, do zero, para o que sobrou. Nenhum sorteio extra é
gasto nisso — é a mesma aritmética que já decidia a zona entre clusters,
só reaplicada com mais frequência. Ver `docs/backlog.md` M10.

### 13.6 Um golpe raro pode vir de fora da profundidade (M3)

**Não existe no original.** Em Rogule o teto de força de um andar
(`difficultyScale`) é o único limite de qual criatura pode aparecer em
qualquer ponto do andar — não há chance de nada além desse teto.

**Problema no original.** Mesmo com o M7 adotado, o teto por andar nunca
alcança o topo real da tabela dentro da descida — `saturatedAt` no ritmo
adotado fica bem abaixo de 1,0 até o andar 10 — então o golpe mais forte
possível fica congelado bem abaixo do `t-rex`. O M7 elevou a letalidade por
DESGASTE (mais criaturas agindo juntas), não por um golpe único maior — essa
é a lacuna que o M3 existe para preencher.

**Regra nova.** Atrás de uma flag (`OUT_OF_DEPTH_TAIL`, desligada por
padrão): depois que o andar termina de ser povoado, um sorteio RARO e
INDEPENDENTE do sorteio de tier por cluster — cuja chance é zero no andar 1
e cresce com a profundidade, sempre limitada bem abaixo da certeza (ver
`docs/balance.md`) — pode substituir UMA criatura já posicionada por outra
sorteada perto do topo real da tabela, mantendo a mesma posição, zona e
loot. Substituir em vez de adicionar mantém a contagem do andar (e portanto
a dificuldade mediana) intocada; só o golpe daquela vítima muda.

**Consequência.** `PLAYER_HP` é 10, sem regeneração (§13.1), e dano é
`0..xp−1` — um `t-rex` (xp 10) pode tirar quase a barra inteira num só
golpe. Isso tem que continuar sendo um choque raro, não uma rotina: por
isso a chance fica sempre pequena e cresce devagar com a profundidade, em
vez de um salto abrupto em algum andar fixo.

**Estado atual: construído, `OUT_OF_DEPTH_TAIL = false`.** Com a flag
desligada nada muda: a chance é sempre zero e nenhum sorteio extra é feito
(um sorteio que nunca dispara ainda consumiria um valor do stream de RNG, o
que empurraria toda geração depois dele). Ver `docs/backlog.md` M3 para o
que foi medido.

### 13.7 O piso do tier sobe com a profundidade (M13)

**Não existe no original.** Em Rogule (e no motor antes deste item) o tier
de uma criatura é `min(1, profundidade_no_mapa × difficultyScale)` —
`profundidade_no_mapa` é posição DENTRO do andar, não o número do andar, e
perto da entrada ela é ~0 em qualquer andar. Um ladrilho perto da entrada
sorteia um rato no andar 10 tão facilmente quanto no andar 1.

**Problema no original.** O teto por andar (`difficultyScale`) sobe com a
profundidade, mas nunca existiu um PISO — só o teto varia, o chão sempre foi
zero. E rato não é ameaça nenhuma: `xp 1` dá um dano `0..0`, exatamente
zero; `threat.js` e `duelCost` já tratam rato como zero. É cenário que só
custa turno.

**Regra nova.** Sem flag, ligado sem condição (é conserto estrutural, não
ajuste fino). `tierFloorShare(andar)` cresce de 0 (andar 1, sem piso — a
entrada continua território de rato) até no máximo metade do ÍNDICE do
teto daquele andar. O piso é uma FRAÇÃO do índice do teto, não um valor
absoluto — isso garante `piso ≤ teto` por construção em qualquer
profundidade, sem precisar de nenhum clamp extra.

**A correção que a implementação exigiu.** A primeira versão limitava o
ÍNDICE CENTRAL antes do sorteio: `índice = max(piso, sorteio_normal)`.
Medido (não assumido) que isso ainda deixava ratos passarem — o espalhamento
de `monsterWeightsAround` (quirk §9.2) alcança o slot 0 a partir de um
centro até 2 acima dele. Corrigido sorteando do centro normal como antes e
limitando o SLOT FINAL sorteado: `slot = max(piso, sorteio_normal)`. É essa
troca — limitar o resultado, não o centro — que de fato exclui o rato a
partir de certo andar.

**Estado atual: construído e ligado, sem flag.** Medido: piso atinge índice
1 (exclui rato) a partir do andar 5; tier mais baixo visto sobe 1 → 1 → 2 →
3 → 3 nos andares 1, 3, 5, 7, 10. Ver `docs/backlog.md` M13.

### 13.8 Um guardião protege o santuário (M14)

**Não existe no original.** Em Rogule nada guarda a saída — chegar ao
santuário é só o momento em que o andar para de ser perigoso, não um
obstáculo em si.

**Regra nova.** Sem flag, ligado sem condição. Depois de todo o resto do
andar estar povoado (inclusive o sorteio raro do M3), exatamente UMA
criatura fica adjacente ao santuário, com tier no topo do que aquele andar
alcança — ou acima, se alguma outra criatura do andar (por exemplo um
sorteio do M3) já tiver ficado mais forte. Substitui um membro já existente
do elenco em vez de adicionar corpo: se já havia uma criatura adjacente,
essa vira o guardião; senão, a mais próxima é realocada para lá. Se por
acaso mais de uma criatura já estava adjacente (elenco grande o bastante,
depois do M12), as extras são movidas para qualquer outro ladrilho livre —
exatamente uma, nunca mais.

**Consequência.** O `ceilingIndex` sozinho não bastava para garantir "no
mínimo tão forte quanto qualquer outra criatura do andar" — o sorteio raro
do M3 pode passar do teto normal do andar. Por isso o guardião usa
`max(ceilingIndex, maior índice já colocado no andar)`, calculado depois de
todo o resto (inclusive o M3) já ter decidido, não assumido de antemão.

**Estado atual: construído e ligado, sem flag.** Verificado em 750
combinações de andar/seed (andares 1, 3, 5, 7, 10 — 150 seeds cada):
sempre exatamente um guardião, sempre no topo ou acima de todo o resto do
elenco. Ver `docs/backlog.md` M14.

### 13.9 Baú perto de criatura, espinha incluída (M15)

**Não existe no original.** Em Rogule uma sala guarda um baú e nada mais —
a maior parte do andar é caminhada, e pegar um item que não custa nada não
é decisão nenhuma.

**Regra nova.** Sem flag, ligado sem condição. Depois de tudo mais decidido
(inclusive o guardião do santuário, M14), todo baú sem uma criatura viva a
`CHEST_GUARD_RADIUS` ladrilhos ganha uma: a criatura já existente mais
próxima é realocada para perto do baú. Nunca cruza a linha espinha/lateral
(a mesma que M10 e "andares pequenos ficam só na espinha" protegem) — o
alvo tem que estar na MESMA zona do baú, e só uma criatura já daquela zona
pode ser movida; sem candidato dos dois lados, o baú fica sem guarda em vez
de forçar a travessia. Nunca move o guardião do santuário (M14) — esse é
território de outro item.

**Consequência, medida, não escondida.** `SIDE_CHEST_BIAS` já concentra a
maioria dos baús em salas laterais, que o povoamento comum já guarda — o
trabalho real é na espinha. Cobertura sobe com a profundidade em vez de
ficar plana como a spec original esperava: andar 1 ~56%, andar 3 ~64%,
andar 5 ~79%, andar 7 ~99%, andar 10 ~99% (`CHEST_GUARD_RADIUS = 8`,
varrido contra 4/6/10/12). O andar 1 nunca alcança "alto" nesse raio —
tem só 2-3 criaturas contra 6 baús fixos, e o orçamento de contagem é do
M12, não deste item; aumentar o raio ajuda um pouco mas não resolve, é
falta de criatura, não de alcance.

**Estado atual: construído e ligado, sem flag.** Ver `docs/backlog.md`
M15.

### 13.10 Salas maiores, corredores mais curtos (M16)

**Existe no original, com números diferentes.** `CORRIDOR_LENGTH` era
FAITHFUL (`[1, 5]`, `generator.cljs:146`) e passa a ser divergência
deliberada: `[1, 3]`. Tamanho de sala nunca foi escolhido — `mapgen.js`
não passava `roomWidth` nem `roomHeight` para o Digger do ROT, então os
padrões do próprio ROT (`[3,9]` × `[3,5]`) valiam sem ninguém ter decidido
isso.

**Problema no original.** O andar lia como corredores com salas penduradas,
não salas com corredores entre elas. I2 também achou que agrupamento
(M7) só vira alavanca de verdade onde o mapa impede o bot de escapar — num
corredor ele recua e luta um de cada vez, desfazendo por geometria o
mecanismo que o M7 depende de manter.

**Regra nova.** Sem flag, ligado sem condição. `ROOM_WIDTH = [5, 9]`,
`ROOM_HEIGHT = [4, 7]` (novos, `balance.js`), `CORRIDOR_LENGTH = [1, 3]`
(era `[1, 5]`). `MAP_DUG_PERCENTAGE` ficou em 0,15 — não precisou se mover
com o resto, verificado por medição, não assumido de antemão.

**A restrição que importava: espinha não podia sair da faixa.** M10
consertou espinha/lateral recentemente, e salas maiores empurram na
direção contrária, do aviso do próprio `map-design.md` sobre o 0,2
original do ROT ("normalmente havia vários caminhos equivalentes"). Varrido
contra a preocupação: medido que salas maiores por si só EMPURRAM a
espinha para cima (mais previsível, menos guerra), não para baixo — o
risco citado no item não se confirmou nessa direção. O que de fato reduz a
espinha é `dugPercentage` mais alto, não o tamanho das salas.

**Um bug achado pelo próprio conjunto de testes, não escondido.** Duas
falhas do M3 apareceram ao trocar o mapa: `M14` recalculava o índice do
guardião como `max(ceilingIndex, maior índice de TODOS OS OUTROS)`, o que
sub-repetidamente apagava o sorteio raro do M3 sempre que a vítima do M3
acabava virando o próprio guardião — o M14 rodava depois do M3 e baixava o
tier de volta ao teto comum. Corrigido: o cálculo agora inclui o índice
ATUAL do próprio guardião, não só o dos outros, então nunca rebaixa o que
já estava lá. Bug pré-existente do M14, só exposto pela mudança de mapa
deste item — corrigido aqui porque foi aqui que apareceu.

**Estado atual: construído e ligado, sem flag.** Medido, n=100/config: área
média de sala 21,9 → 35,8 (+64%), comprimento médio de corredor 2,69 →
1,91 (−29%). Espinha em faixa em todo andar onde o split é tentado (andar
4 em diante, `MIN_ROSTER_FOR_SIDE`). Ver `docs/backlog.md` M16.
