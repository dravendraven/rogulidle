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
