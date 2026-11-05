# O inferno, o scroll de portal e os chefes — estudo antes do código

Escrito em 2026-11-03 e **revisado com o dono em 2026-11-04**. É a fonte da
frente D do `plano-2026-11.md`. **Nada aqui está construído.** Quando uma
etapa for, o doc que a descreve (`rules.md`, `bot.md`, `balance.md`) muda no
mesmo commit e a etapa ganha "FEITO" na tabela do fim.

Número que aparece aqui é palpite de desenho; vira linha de `balance.md`
quando construído.

## De onde este desenho vem

O inferno não nasceu agora. O que já estava escrito, e o que cada parte
reaproveita:

| doc | o que ele já dizia | o que fica |
|---|---|---|
| U11 (`candidates.md`) | 20 andares, Balrog no fundo, chefes de barreira, cada chefe paga um desbloqueio situacional, seed do dia, placar de configurações | quase tudo — é o esqueleto |
| U11, "The Balrog is a design problem" | o bot recusa a luta mortal em vez de perdê-la; a saída é o truque da velocidade ou "um andar cuja única saída é através dele" | é o problema central dos chefes, §3 |
| M44 (`decisions.md`) | `speed` é a única propriedade que mexe no custo real sem mexer no preço; o bot não pode precificá-la | o primeiro molde de chefe |
| A bola de neve (`decisions.md`, "Measurement") | o que foge ao infinito é a ARMADURA que os baús reabastecem; o conserto é "um jeito de perder que a armadura não responde" | o segundo molde de chefe |
| `items.md` | 🌀 teleporte, 🔮 barreira, 🍀 sorte, 🥾 botas, 🏹 arco, e os atributos Magnitude / Foco / Persistência | o catálogo de desbloqueios |
| `fuga.md` | a fuga 🌀 está CONSTRUÍDA e fora da prateleira, esperando um preço | o primeiro item do inferno, pronto |
| stamina (`decisions.md`, 2026-08-19) | o orçamento é por travessia, e o andar mais caro do arco decide o clear | a curva de 20 andares mexe nisso |
| U14 + `masmorras-plano.md`, decisão 3 | o inferno pode tirar uma masmorra da seed do dia | a identidade de cada dia |
| `dials.md`, diretriz 4 | "o debuff diário do inferno" muda a resposta certa de dia para dia | é a masmorra do dia |
| `trade-offs.md` | o portal como "gastar o ingresso agora × esperar uma pilha melhor" | o scroll com substituição |
| U12 | recibo `{nome, data, config, seed}`, data UTC | o placar, por último |

## O desenho, em sete frases

1. O inferno abre no primeiro clear (o feito `bottom`), e só se entra com
   scroll — não há descida grátis.
2. No fim de um clear, ANTES da loja, uma escolha: **📜 scroll com todas as
   moedas** ou **usar a loja**.
3. Offline, um interruptor do jogador decide se a compra automática sempre
   leva o scroll ou nunca leva.
4. Cabem 3 scrolls, que não expiram; cheio, um clear que paga mais que o
   scroll mais fraco o substitui.
5. São **20 andares**, com chefes de barreira, e o **Balrog** no 20 quase
   impossível de alcançar. O placar é até onde se chegou.
6. **Cada chefe derrubado desbloqueia algo novo — itens ou classes.** A
   moeda infernal, que é o que o inferno paga, desbloqueia itens na loja do
   inferno.
7. Enquanto a escada de classes está aberta, desce-se com a classe da
   escada; fechada, o setup é livre. A seed é a do dia, igual para todos.

---

## 1. A forma: 20 andares

**A curva de hoje continuada, sem conteúdo novo.** "Uma dificuldade mais
dura é um modelo entregue a `makeFloorPlan`" é regra dura do `CLAUDE.md`. O
andar 1 do inferno é o andar 11 da curva: os campos `*Start`
(`tierFloorStart`, `tierSlackStart`, `outOfDepthChanceStart`,
`spreadStart`, em `balance.md`) existem para uma curva re-ancorada
continuar de onde parou. A run já sabe ter N andares (`options.levels`,
`src/sim/dungeon.js`), então 20 é valor, não código.

**Extenso de propósito** (dono, 2026-11-04): o inferno é a descida que o
jogador abriu à mão e quer ver longe. O custo é tempo de tela, aceito.

**A tabela de criaturas tem fim.** No andar 10 de hoje todo bicho já sai do
topo da tabela (`dungeons.js` registra o limite). A curva continuada passa do
fim em poucos andares, e daí em diante "mais difícil" só pode vir de três
lugares: **mais criaturas, a cauda fora de profundidade, e os chefes.** Os
chefes, portanto, não são enfeite — a partir do meio do inferno eles SÃO a
curva.

**A estamina morde aqui.** O orçamento é por travessia e o andar mais caro
decide quem passa (`decisions.md`, 2026-08-19). Um andar de inferno cheio de
criaturas do topo pode custar mais turnos que o orçamento, e aí a descida
acaba por cansaço, o final mais chato que existe. O modelo do inferno pode
ter um orçamento próprio — é um campo, não regra nova — e a D1 existe para
assistir isso antes de qualquer chefe.

**A masmorra do dia por cima** (`dungeonModel`): o dia é "Tumba 🐉💎🌑" ou
"Minas 🐺📦☀️", tirado da seed. É o "debuff diário" que `dials.md` pedia,
na forma que o U14 já calibrou — redistribui, não endurece. O jogador sabe o
tipo antes de escolher herói e item, e não sabe o mapa (pilar 1 de
`trade-offs.md`).

**O Butcher sai do inferno** (`vaultLevel` é campo do modelo; 0 desliga):
quem fica no lugar dele são os vaults e os chefes do §1b.

## 1b. Os quatro círculos, o bestiário e o salão final (dono, 2026-11-04)

**Quatro círculos de cinco andares**, com nomes dos infernos do DCSS (mesma
fonte de nomes do U14). Estrutura FIXA — aprende-se o caminho como se
aprende o porco no 4 —, e a masmorra do dia (§1) muda criaturas, baús e luz
por cima dela.

| círculo | andares | nome | tema do mapa | clima | vault (opcional) | chefe (obrigatório) |
|---|---|---|---|---|---|---|
| 1 | 1–5 | **Gehena** | caverna | fogo, aberto | andar 3 | andar 5 · 🐎 o Pesadelo |
| 2 | 6–10 | **Tártaro** | cripta | mortos, câmaras em fila | andar 8 | andar 10 · 💀 o Ceifador |
| 3 | 11–15 | **Cócito** | grade | gelo, salas com loops, dá para ser cercado | andar 13 | andar 15 · 🐕 Cérbero |
| 4 | 16–20 | **Dis** | central com anéis, cor mudando a cada andar | cidade de ferro, geométrica | andar 18 | andar 20 · o Balrog, no Salão |

**Por que um bestiário próprio.** No andar 10 de hoje a força já chega ao
teto (`strength` 1 no `dial-overrides.json`), então o inferno com a tabela de
sempre seria todo vampiro, gênio, dragão e t-rex — e um t-rex não é
inferno (dono). Cada círculo tem as suas criaturas.

**Cada criatura é feita só do que o motor já tem**: vida, mordida (xp),
raio de ativação, e o bando que acorda junto (frente A). Cada uma tem de ser
reconhecível em trinta segundos de tela.

| círculo | criatura | o que a distingue | o que pergunta ao build |
|---|---|---|---|
| Gehena | 👿 diabrete | fraco, bando grande, acorda de longe | aguenta ser caçado? |
| Gehena | 🦎 salamandra | média em tudo | a régua do círculo |
| Gehena | 🦂 escorpião | pouca vida, mordida enorme | mata antes de apanhar? |
| Tártaro | 💀 esqueleto | muita vida, mordida fraca, dorme | tem tempo para gastar? |
| Tártaro | 🧟 morto-vivo (o de sempre) | lento de acordar, duro | — |
| Tártaro | 🐍 serpente | raio curto, mordida alta | passar perto custa caro |
| Cócito | 🕷️ aranha | bando de 3, acorda junto | a matilha do círculo |
| Cócito | 👺 demônio | forte, sozinho | duelo pesado |
| Dis | 😈 demônio maior | topo de tudo | — |
| Dis | 🐲 serpe | topo, acorda de longe | — |

**Velocidade só em chefe e ocupante de vault.** O bot não a precifica
(M44); numa criatura comum ela seria armadilha invisível em todo andar.

**Os vaults: o prêmio é a resposta ao chefe do círculo, anunciado à vista**
(como o machado do porco). Entrar é apostar vida agora para chegar ao chefe
com a resposta; passar reto é chegar sem ela. O vault dá uma cópia para esta
descida; o chefe derrubado desbloqueia a mesma resposta para sempre (§3).
Andar 3: 🌀 fuga; andar 8: 🥃 poções (não escudos — o Ceifador atravessa
armadura); andar 13: ⛓️ mangual; andar 18: um de cada. Ocupantes no molde do
Butcher, cada um mais forte que o anterior. Risco já conhecido: o vault do
porco é encarado ~99% das vezes (`vault-irrecusavel.md`) — prêmio fixo pode
virar pedágio em vez de escolha.

**O andar do chefe tem poucas criaturas além dele** (~3): o andar é o
chefe, e a estamina não acaba antes da luta.

### O círculo 4 é Zot

Lido no código do DCSS (`dat/des/branches/zot.des`,
`dat/des/builder/layout_halls.des`, 2026-11-04):

- **Zot 1–4 não têm mapa fixo.** Cada andar sorteia um gerador geométrico e
  simétrico — octógonos concêntricos, "cebola" (anéis um dentro do outro
  com brechas), círculo torcido, catedral da simetria, rede de corredores
  retos. O lugar parece CONSTRUÍDO, o contrário da caverna do começo. Cada
  andar recebe salas temáticas de monstros, e **a cor muda a cada andar**
  (cinza → branco → azul → azul-claro → magenta).
- **Zot:5 é um mapa só, fixo: o Salão de Zot.** Uma entrada, pela escada,
  embaixo; duas alas laterais com guardas; a câmara central com o Orbe,
  cercada de armadilhas; em volta, a catedral em layout polar, simétrica em
  torno do salão. Os desenvolvedores recusaram variações dele de propósito
  (Mantis 6139): um salão só é o que torna o fim reconhecível.

**No nosso motor, quase de graça:**
- o tema **central** já tem `hubRings` — com 2–3 anéis vira os octógonos
  concêntricos e a cebola; o **anel** é a versão de um anel só;
- `src/ui/depth-theme.js` já troca a cor das paredes por profundidade —
  estender o degradê para Dis (🟥 → 🟪, um tom por andar; 🟪 precisa entrar
  em `tiles.js`);
- **o andar 20 é o Salão do Balrog, carimbado** como o vault: uma entrada,
  duas alas com guardas, a câmara central com o Balrog em cima do buraco. O
  carimbo determinístico já existe; falta um carimbo maior, com essa forma.

### O que isto custa em código

- **Um bestiário por modelo.** Hoje há uma tabela (`MONSTER_TABLE`); o
  inferno precisa da dele.
- **O bot tem de conhecer o bestiário do inferno.** Ele chuta a vida pela
  média da tabela para aquele xp (`expectedHpFor`); sem as linhas novas,
  chuta errado.
- **Vários vaults por descida.** Hoje o motor põe um só (`VAULT_LEVEL`).
- **Cada emoji novo entra em `src/ui/tiles.js`**, ou a criatura aparece
  como casa vazia, sem erro nenhum (aconteceu com o porco).
- Vida e mordida saem da arena da A1 (`src/analysis/bosses.js`).

## 2. O scroll de portal

**Uma escolha antes da loja, não um item da prateleira** (dono,
2026-11-04). A prateleira tem preço fixo (`rules.md` §9) e "o saldo
inteiro" não é preço. No fim de um clear:

> 📜 **Scroll com todas as moedas** (N) — ou — 🛒 **Usar a loja**

Scroll fecha a loja sem comprar; loja segue como hoje. Nada no meio — o
clear inteiro vira inferno ou inteiro vira equipamento (pilar 3).

**Offline: um interruptor do jogador**, no bloco Loja do Lab: "na compra
automática, sempre levar o scroll" — ligado ou desligado. Ligado, todo clear
sem ninguém olhando vira scroll (até encher, com a substituição abaixo);
desligado, vira equipamento como hoje. É a decisão de antes de sair, que
`objectives.md` chama de a mais pesada do jogo, num botão só.

**Estoque de 3, sem prazo, com substituição.** Cheio, um clear que paga MAIS
que o scroll mais fraco o troca; um que paga menos ou igual vai para a loja.
Uma função pura (`addScroll(lista, moedas)`) decide, para o teste e o
instrumento de cadeia poderem perguntar sem tocar em armazenamento. Mora numa
fatia nova do save, `scrolls`, como a `wallet`: o motor nunca a lê.

**O freio, dito com honestidade:** o scroll leva as MOEDAS, e a run seguinte
não compra nada. Os itens que o herói terminou carregando ficam com ele
(`rules.md` §9), e a pilha de uma sequência de vitórias é feita disso. É
parcial de propósito — o freio de verdade da pilha é o segundo molde de
chefe, §3.

## 3. Os chefes — o diferencial do inferno

### O problema que todo chefe tem de resolver primeiro

**O bot recusa a luta que acha mortal, em vez de perdê-la** (M44: entrar e
sobreviver são o mesmo número). Um chefe que ele pode recusar vira um chefe
que ele contorna; um chefe que ele não pode contornar — que guarda o buraco
— vira um andar em que ele fica parado até a estamina acabar.

**A saída é uma regra do bot, e ela vem antes do primeiro chefe:** quando o
buraco é conhecido, o guardião dele foi recusado, e não sobrou nada a fazer,
**ele luta mesmo assim.** Esperar o relógio nunca é sobreviver — é a mesma
frase que `bot.md` já usa para "nunca fica parado". Com isso o chefe vira o
que o U11 pede: "um andar cuja única saída é através dele".

### O molde: um chefe é um Butcher com uma pergunta diferente

O Butcher funciona porque tem **uma propriedade que o bot não precifica** (a
velocidade) e um prêmio **anunciado** (o machado à vista). Todo chefe do
inferno é esse molde — criatura fora da tabela, não sorteada, carimbada pelo
modelo no andar dele, guardando o buraco — e cada um muda **qual** pergunta
faz ao build. Um jeito diferente de perder por chefe é o que
`objectives.md` pede ao poder permanente: o desbloqueio de cada um responde
à pergunta DELE, e é inútil contra os outros.

### Proposta de elenco (desenho, para o dono decidir)

| andar | chefe | a pergunta | de onde vem | desbloqueia (proposta) |
|---|---|---|---|---|
| 5 | 🐎 **o Pesadelo** (o Veloz) | dá para sair de uma luta? | speed 2, como o Butcher, com mais vida — M44 | 🌀 **fuga**, já construída e fora da prateleira (`fuga.md`) |
| 10 | 💀 **o Ceifador** (atravessa a armadura) | e se a pilha de escudos não valer nada? | golpe que vai direto ao hp — "um jeito de perder que a armadura não responde", o conserto que a bola de neve pedia | 🔮 **barreira** (`items.md`: imune por dois turnos) |
| 15 | 🐕 **Cérbero** (a Matilha-chefe) | e se vierem três de uma vez? | três cabeças = três cães que acordam juntos (M6, frente A) | uma **classe nova** — feita para multidão |
| 20 | **o Balrog** | tudo junto | veloz + atravessa armadura + guarda o fim | o feito máximo; não paga poder, paga o nome no placar |

**Por que esta ordem:** cada chefe ensina uma coisa que o seguinte cobra. O
Veloz pede fuga; o 10 pune quem confiou só em escudo; o 15 pune quem só
duela; o Balrog cobra os três. O espaçamento de 5 andares é o U11
("certos andares levantam a dificuldade bruscamente") e responde o risco que
`idle-retention.md` nomeou: entre dois chefes não pode haver "nada novo à
vista" — cinco andares é uma descida curta até o próximo marco.

**O Balrog é "quase impossível de alcançar"** (dono) por construção: chegar
nele exige passar por três chefes numa descida só, numa tentativa paga por
uma vitória. Ninguém precisa afinar a força dele para isso; o caminho já é o
filtro.

**Os desbloqueios são permanentes e situacionais** — a condição de
`objectives.md`. Um item que só vale contra um tipo de ameaça é um jeito
diferente de perder, não uma chance menor. **E todo desbloqueio chega com o
bot sabendo usá-lo** (U14: se o bot não extrai, a atribuição quebra). A fuga
já tem gatilho no bot; a barreira e a classe nova precisam do delas.

**Classe nova desbloqueada por chefe entra onde?** Duas opções: como mais um
nível da escada (joga-se obrigado até o feito dela), ou direto livre.
Recomendado: **mais um nível da escada** — mantém uma regra só para "como uma
classe chega".

## 4. A moeda infernal

**O que ela é** (dono, 2026-11-01 e 2026-11-04): cada travessia concluída no
inferno paga moeda pela mesma taxa de sempre, e essa moeda vira moeda
infernal, guardada.

**Para que serve: DESBLOQUEAR itens na loja do inferno.** Ela não compra o
item para uma descida — abre o item na prateleira, de vez. Comprá-lo para
uma descida é com o saldo do scroll, como qualquer compra. Assim ficam três
economias, cada uma com uma função:

| moeda | vem de | serve para |
|---|---|---|
| moeda da run | toda run | loja entre runs, ou o scroll |
| saldo do scroll | um clear | a loja da preparação do inferno |
| moeda infernal | andares do inferno concluídos | desbloquear itens na loja do inferno |

E os chefes desbloqueiam por marco, a moeda infernal por acúmulo: o ciclo
médio e o ciclo longo de `objectives.md`.

**Por que isso não é "perder mil vezes vira vitória":**
- toda descida foi paga por um clear — sem vitória não há inferno;
- andar não concluído não paga (`rules.md` §9);
- o que ela compra é **um desbloqueio, uma vez por item**, de um item
  situacional — "um ganho que sobe a chance uma vez e não pode ser ganho de
  novo não acumula" (`objectives.md`).

**O catálogo de onde tirar os itens já existe:** `items.md` tem 🍀 sorte,
🥾 botas e 🏹 arco (o arco só é equilibrável por causa da estamina, que já
existe), e os atributos Magnitude / Foco / Persistência — "Profundo" e
"Caminho de casa" só existem porque a run tem duas metades. A regra de
`items.md` vale: **a loja não vende o que um herói já é** (item de visão é
um Papazito pior).

**"Ou outra coisa"** (dono): a mesma moeda pode abrir outras coisas que não
são item — uma masmorra escolhida em vez da do dia, por exemplo. Fica
registrado como possibilidade, sem desenho.

## 5. A seed, as descidas e o resultado

**A seed do dia:** função pura da data UTC passada pelo gerador
(`src/sim/rng.js`) — a PÁGINA lê a data, o motor só vê um número. UTC para
dois amigos em fusos diferentes jogarem o mesmo mapa (U12).

**Dois scrolls no mesmo dia caem no mesmo mapa.** É a revanche: o mesmo
inferno com outra preparação, a comparação mais limpa que o jogo pode
oferecer — `Attributable` de graça.

**O setup:** enquanto a escada de classes está aberta, desce-se com a classe
do nível atual; fechada, qualquer herói, qualquer item do slot (dono,
2026-11-04). Mais a loja com o saldo do scroll.

**O resultado:** o andar mais fundo do inferno, os chefes derrubados, a
moeda infernal ganha — com o recorde do dia e o de sempre guardados. O cartão
"enquanto você estava fora" ganha os scrolls guardados.

**O recibo** `{data, seed do dia, herói, item, compras, config}` reproduz a
descida inteira. É o que o placar (U12) submete, e o feito de cada chefe
usa o mesmo mecanismo de recibo de `achievements.js`.

## 6. Onde isto esbarra nas frentes A e B

Nenhuma das duas está no main (2026-11-04).

| arquivo | quem mexe | o que o inferno faz nele | quando |
|---|---|---|---|
| `src/sim/dungeons.js`, `spawn.js`, `monsters.js` | A (bando que acorda junto) | a masmorra do dia; a Matilha-chefe usa o bando da A | D2, D8 — depois de A no main |
| `src/ui/spectator.js` | B | a escolha scroll/loja no fim do clear; a descida no loop | D3 — depois de B no main |
| `src/ui/achievements.js`, `roster.js` | B | o portão `bottom`; o herói forçado pela escada; feitos de chefe | D4 — depois de B |
| `src/ui/dials.js` | B (em conflito com o main) | o interruptor offline; o botão de descer no Lab | D1, D3 |
| `src/bot/bot.js` | ninguém hoje | "luta como último recurso" | D6 |
| `dial-overrides.json` | A e B | **não mexer**: o modelo do inferno mora em código | — |

**Começa já, sem esperar ninguém:** D1 (modelo, `src/sim/` puro) e D6 (a
regra do bot). O resto espera A e B no main.

## 7. As etapas

Cada uma pequena, verificável sozinha, atrás de interruptor desligado.
Desligado = jogo de hoje, provado pelo hash.

| etapa | o que entrega | verificar como | espera |
|---|---|---|---|
| **D1** | o modelo: 20 andares, os temas dos quatro círculos, sem Butcher, com a tabela de sempre. Botão "descer no inferno" no Lab (dev) e `?dev=1&hold=` para assistir com uma pilha | assistir; ver onde a estamina morde | nada |
| **D1b** | o bestiário por modelo, e Gehena com as suas três criaturas (emoji em `tiles.js`, valores pela arena da A1, o bot conhecendo as linhas novas) | assistir o círculo 1 | D1 |
| **D1c** | os outros três bestiários, um círculo por commit; o degradê de cor de Dis | assistir cada círculo | D1b |
| **D2** | a seed do dia (pura, UTC) e a masmorra do dia tirada dela | teste: mesma data, mesma seed; o Lab mostra "hoje: Tumba" | A no main |
| **D3** | o scroll: a escolha antes da loja, a fatia `scrolls`, `addScroll` com estoque 3 e substituição, o interruptor offline | teste da função pura; `?dev=1` forçando um clear | B no main |
| **D4** | o portal: botão com scroll guardado e `bottom` ganho; preparação (herói da escada ou livre, loja com o saldo do scroll); o scroll é gasto | assistir do clique ao fim | D1, D3 |
| **D5** | resultado e recorde local; scrolls no cartão de volta | ver o recorde depois de duas descidas | D4 |
| **D6** | a regra do bot: luta o guardião recusado do buraco quando não sobrou nada | teste da regra no motor de sempre (desligada fora do inferno) | nada |
| **D7** | o primeiro chefe, o Veloz, no andar 5, e o feito dele desbloqueando a fuga 🌀 | assistir o chefe; recibo destrava | D1, D6 |
| **D8** | os outros chefes, um por commit, cada um com o desbloqueio e o bot sabendo usar o que ele abre; o Balrog no Salão carimbado do andar 20 | assistir cada um | D7 (e A, para Cérbero) |
| **D8b** | os vaults dos andares 3, 8, 13 e 18 (o motor aceitando vários), prêmio anunciado = a resposta ao chefe do círculo | assistir quem entra e quem passa reto | D7 |
| **D9** | a moeda infernal e a loja do inferno com desbloqueios | a carteira sobe; um item abre | D4 |
| **D10** | o item do slot na preparação | escolher e ver na descida | frente C |
| **D11** | o placar no serviço de save, com recibo | outra máquina reproduz a descida de um amigo | D5 |

## Perguntas para o dono

1. O elenco de chefes da §3 e o bestiário do §1b — nomes, emojis, papéis.
2. Classe desbloqueada por chefe entra como nível da escada ou livre?
3. Os itens que a moeda infernal desbloqueia: começar pelo catálogo de
   `items.md` (🍀 🥾 🏹)?
