# O inferno e o scroll de portal — estudo antes do código

Escrito em 2026-11-03, antes de qualquer linha da frente D
(`plano-2026-11.md`). O desenho do dono está lá; este arquivo responde o
que o desenho deixou aberto, com uma recomendação por pergunta, e refina as
etapas. **Nada aqui está construído.** Quando uma etapa for, o doc que a
descreve (`rules.md`, `bot.md`, `balance.md`) muda no mesmo commit e a etapa
ganha "FEITO" no plano.

Nenhum número mora aqui como valor: onde aparece um, é palpite de desenho
que vira linha de `balance.md` quando construído.

## O desenho, em seis frases

1. O inferno abre no primeiro clear (o feito `bottom`).
2. Um clear permite comprar um 📜 **scroll de portal**, que absorve TODAS as
   moedas daquele clear; a run seguinte não compra nada.
3. Cabem no máximo 3 scrolls, que não expiram. Cheio, um clear que paga mais
   que o scroll mais fraco o substitui.
4. Abrir o portal é ação manual. Antes de descer: herói, item do slot e a
   loja com o saldo do scroll.
5. A seed do inferno é a do dia, igual para todos (data UTC).
6. O que o inferno paga vira **moeda infernal**, que compra só itens
   exclusivos do inferno.

---

## 1. A forma do inferno

**Recomendação: dez andares, a mesma máquina de run, um MODELO próprio — e
nada de chefe impossível na primeira versão.**

**Por que dez, e não os vinte do U11.** A run já sabe ter N andares
(`options.levels` em `src/sim/dungeon.js`), então vinte não custa código —
custa TEMPO de assistir, e o orçamento de turnos é por travessia. Vinte
andares de uma descida que o jogador ABRIU À MÃO e quer ver é meia hora de
tela. Dez mantém a descida do tamanho de uma run normal; "até onde você
chegou" continua sendo o placar. O número de andares fica num campo do
modelo, então dobrar depois é mudança de valor.

**Por que um modelo, e não conteúdo.** "Uma dificuldade mais dura é um
modelo entregue a `makeFloorPlan`" é regra dura do `CLAUDE.md`. O inferno é
a curva de hoje CONTINUADA: os campos `*Start` (`tierFloorStart`,
`tierSlackStart`, `outOfDepthChanceStart`, `spreadStart` — `balance.md`)
existem exatamente para uma curva re-ancorada no meio continuar de onde
parou em vez de recomeçar do zero. O andar 1 do inferno é o andar 11 da
curva. Zero criatura nova, zero tile novo.

**E por cima, a masmorra do dia.** `masmorras-plano.md`, decisão 3: o
inferno pode tirar uma masmorra da seed do dia. É barato — `dungeonModel`
(`src/sim/dungeons.js`) já transforma um modelo no de uma masmorra — e dá ao
dia uma identidade que se lê antes de descer ("hoje é Tumba 🐉💎🌑"). É o
pilar 1 de `trade-offs.md` na medida: o jogador sabe o tipo e não o mapa, e
escolhe herói e item contra isso. **Recomendado, como segunda etapa do
modelo, atrás do seu próprio interruptor.**

**Chefes de barreira — depois, e com uma regra de bot antes.** O vault de
hoje é beco sem saída e lateral: o bot passa reto quando o portão recusa, e
é por isso que ele funciona como aposta. Uma BARREIRA tem de estar na rota.
O único jeito de hoje é o guardião do buraco — e aí a lição do M44
(`decisions.md`) morde: o bot recusa a luta mortal em vez de perdê-la, não
tem como sair do andar sem passar pelo guardião, e a run acaba no orçamento
de turnos, o final mais chato que existe. A barreira só pode ser construída
junto com uma regra do bot: **quando o buraco é conhecido, o guardião dele é
recusado e não sobrou mais nada a fazer, ele luta mesmo assim** — esperar o
relógio nunca é sobreviver (`bot.md`, "Nunca fica parado"). Isso é etapa
própria, depois das que dão para assistir.

**O Balrog fica fora deste plano.** Ele é o mesmo problema da barreira com o
sinal mais forte, e o U11 já registrou que "o objetivo real é até onde se
chegou". Um inferno sem Balrog já tem placar.

**O Butcher do andar 4** sai do inferno por padrão (`vaultLevel` é campo do
modelo; 0 desliga). Um andar de aposta lateral num modo de uma tentativa só
é ruído; a barreira é o que ocupa o lugar dele quando existir.

## 2. O scroll de portal

**Onde ele entra: num prompt próprio da loja do CLEAR, não na prateleira.**
A prateleira tem preços fixos que não escalam com nada (`rules.md` §9), e o
scroll custa "o saldo inteiro", que não é preço. Pô-lo em `SHOP_PRICES`
quebraria a regra e a ordem padrão derivada dos preços (`DEFAULT_ORDER` em
`src/ui/shop.js`). O fluxo é: a run acaba em clear → antes da loja, a tela
pergunta "guardar este clear como scroll (N moedas)?" → sim absorve o saldo
e a loja fecha sem comprar; não segue para a loja de sempre.

**Onde ele mora: uma fatia nova do save** (`src/ui/save.js`), `scrolls`, uma
lista de até 3 entradas `{ coins, run }`. Mesma forma da `wallet`: o motor
nunca a lê; a página a entrega à run do inferno como saldo da loja de
preparação. Viaja para o servidor de save junto com o resto do documento,
sem nada a fazer em `server/save-worker.js`.

**Estoque e substituição são uma função pura** — `addScroll(list, coins)`
devolve a lista nova: abaixo de 3, acrescenta; cheia, troca o mais fraco se
`coins` for MAIOR; senão devolve a mesma lista e diz que recusou (as moedas
vão para a loja, como hoje). Pura para o teste e para o instrumento de
cadeia poderem perguntar sem tocar em armazenamento.

**A gestão offline continua em aberto** (o dono tirou o limiar em
2026-11-03). As duas opções que sobram, e só elas:

| | o que acontece com um clear longe do PC | a favor | contra |
|---|---|---|---|
| **a. nunca automático** | vira equipamento, como hoje; só quem está olhando guarda scroll | zero regra nova; o ciclo médio não é alcançado por ausência (`objectives.md`) | clear é raro e quase sempre acontece com ninguém olhando — o inferno quase nunca abriria |
| **b. um interruptor "guardar clears como scroll"** no bloco Loja do Lab | ligado, todo clear vira scroll (até encher, com substituição) | o jogador decide ANTES de sair, que é a decisão mais pesada do jogo | é o limiar retirado em versão de dois valores — decidir se isso é o que foi retirado |

Até decidir, a primeira versão constrói **(a)**: é a que não acrescenta nada
e a que (b) estende sem refazer.

**O freio, dito com honestidade:** o scroll leva só as MOEDAS do clear. Os
itens que o herói terminou carregando continuam com ele (`rules.md` §9), e
a pilha de uma sequência de vitórias é feita disso. O scroll tira a compra
de uma run, não a pilha. É parcial de propósito.

## 3. A moeda infernal

**O que ela é:** cada travessia concluída no inferno paga moeda pela mesma
taxa de sempre (xp por turno, `COIN_RATE`), e essa moeda vira moeda
infernal, GUARDADA — a única coisa do jogo que se acumula entre descidas.

**O que ela compra: itens que só existem na descida do inferno, gastos no
uso.** Consumíveis do inferno, comprados na loja de preparação, que somem
quando usados ou quando a descida acaba. Nunca entram numa run normal.

**Por que isso fecha o risco que o plano registrou** ("se toda descida
paga, inclusive a que morre cedo, o acúmulo é de derrotas"). Três travas,
nenhuma nova:
- **Toda descida do inferno foi paga por uma vitória.** Sem clear não há
  scroll; sem scroll não há descida. Então "perder mil vezes" no inferno
  exige ter vencido mil vezes antes — a regra de `objectives.md` vale no
  nível do scroll.
- **Andar não concluído não paga** — a regra de sempre (`rules.md` §9).
- **O que ela compra não sai do inferno e é gasto.** Não há poder que
  atravesse para o jogo normal, então não há canal de acúmulo para a run
  que importa para o resto do jogo.

O que fica aberto é QUAIS itens. Regra para eles, a de todo item
permanente-ou-quase: situacional, com trade-off, e o bot sabendo usar
(`trade-offs.md`; U14, "quem extrai o 2X é o bot").

**Carteira com teto?** O U11 pedia teto para impedir farm infinito. Com o
estoque de 3 scrolls e clear raro, o fluxo de entrada já é limitado.
**Recomendação: sem teto na primeira versão; olhar a carteira depois de uma
semana de jogo real.**

## 4. A seed do dia, as descidas e o resultado

**A seed:** uma função pura da data UTC (`hellSeed('2026-11-03')`) passada
pelo gerador do jogo (`src/sim/rng.js`) — nunca o relógio dentro de
`src/sim/`. A PÁGINA lê a data e entrega a seed; o motor só vê um número.
UTC para dois amigos em fusos diferentes jogarem o mesmo mapa (U12).

**Duas descidas no mesmo dia caem no mesmo mapa.** Recomendado: é a
revanche, com outra preparação — o mesmo mapa com outro herói é a
comparação mais limpa que o jogo pode oferecer ("o que mudou foi só a minha
escolha"). Isso é o `Attributable` de `objectives.md` de graça.

**Não existe descida grátis por dia.** Só se entra com scroll. Uma regra só;
o "uma vez por dia" deixa de ser necessário porque o scroll já raciona.

**O resultado:** o andar mais fundo do inferno, mostrado no fim da descida,
com o recorde do dia e o de sempre guardados (fatia nova, mesma forma dos
highscores). O cartão "enquanto você estava fora" (`src/ui/harvest.js`)
ganha uma linha: scrolls guardados e o saldo de cada um.

**O recibo:** `{ data, seed do dia, herói, item, compras, config }`
reproduz a descida inteira, porque a seed é do dia e a preparação é
explícita. É o que o placar (U12) submete, e é quatro quintos do recibo de
feito que já existe (`achievements.js`).

## 5. Onde isto esbarra nas frentes A e B

Nenhuma das duas está no main hoje (2026-11-03).

| arquivo | quem mexe | o que o inferno faz nele | quando |
|---|---|---|---|
| `src/sim/dungeons.js`, `spawn.js`, `monsters.js` | A (bando que acorda junto, M6) | a masmorra do dia no inferno lê `dungeonModel` | D2, depois de A no main |
| `src/ui/spectator.js` | B (escada) | o prompt do scroll no fim de um clear; a run do inferno no loop | D3, depois de B no main |
| `src/ui/achievements.js` | B | o portão do inferno é `bottom` — só leitura | D4 |
| `src/ui/roster.js` | B | a tela de preparação escolhe herói | D4 — **e há uma pergunta:** com a escada ligada o herói é forçado; no inferno vale o herói forçado ou qualquer um já aberto? Recomendado: qualquer um já aberto pela escada |
| `src/ui/dials.js` | B (tem conflito com o main) | botão de descer no inferno no Lab (dev) | D1 |
| `dial-overrides.json` | A e B | **não mexer**: o modelo do inferno mora em código, não no arquivo do jogo enviado | — |

**Ordem que evita conflito:** D1 (o modelo, `src/sim/` puro) e a função da
seed não tocam em nada de A nem de B e podem começar já. O resto espera A e
B no main.

## 6. As etapas, refinadas

Cada uma pequena, verificável sozinha, atrás de interruptor desligado.
Desligado = jogo de hoje, provado pelo hash.

| etapa | o que entrega | verificar como | espera |
|---|---|---|---|
| **D1** | o modelo do inferno: a curva de hoje continuada a partir do andar 11 (campos `*Start`), dez andares, sem Butcher. Um botão "descer no inferno" no Lab (dev) e `?dev=1&hold=` para assistir com uma pilha | assistir uma descida armada; a run reproduz pelo seed | nada |
| **D2** | a seed do dia (`hellSeed`, pura, UTC) e a masmorra do dia tirada dela, atrás de interruptor próprio | teste: mesma data, mesma seed; o Lab mostra "hoje: Tumba" | A no main |
| **D3** | o scroll: o prompt no fim de um clear, a fatia `scrolls`, `addScroll` com estoque 3 e substituição. Gestão offline = (a) | teste da função pura; `?dev=1` forçando um clear | B no main |
| **D4** | o portal: botão visível com scroll guardado e `bottom` ganho; tela de preparação mínima (herói + loja com o saldo do scroll); a descida joga e o scroll é gasto | assistir do clique ao fim | D1, D3 |
| **D5** | resultado e recorde local (do dia e de sempre); linha de scrolls no cartão de volta | ver o recorde depois de duas descidas | D4 |
| **D6** | a moeda infernal: andares do inferno pagam, a carteira guarda, a loja de preparação mostra a prateleira (vazia até existirem itens) | a carteira sobe depois de uma descida | D4 |
| **D7** | o item do slot na tela de preparação | escolher e ver o item na descida | frente C |
| **D8** | a barreira: guardião-chefe do buraco em andares do modelo, junto com a regra "luta como último recurso" no bot | teste da regra + assistir | D4 |
| **D9** | o placar no serviço de save, com recibo | outra máquina reproduz a descida de um amigo | D5 |

**Perguntas para o dono, nesta ordem:**
1. Gestão offline: (a) nunca automático ou (b) interruptor?
2. Com a escada ligada, o inferno aceita qualquer herói já aberto?
3. Dez andares de inferno para começar?
