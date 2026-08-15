# O bot

**O que o bot faz hoje.** Mudou o bot, este arquivo muda no mesmo commit.
O que foi tentado e rejeitado não mora aqui — está em
`docs/project/decisions.md`.

## Os três objetivos, em ordem estrita

1. **Sobreviver ao andar atual.**
2. **Chegar ao próximo andar com o máximo de recursos** — hp, arma,
   armadura, poções, xp.
3. **Gastar o mínimo de passos** que ainda cumpra 1 e 2.

Tudo que o bot faz é um desses três aplicado. A política inteira, em seis
frases:

- **Bebe** uma poção assim que o hp que falta cobre a cura inteira.
- **Lê o livro** quando o hp que falta passa de uma fração da barra **e**
  nada acordado o alcança nos cinco turnos parados (`rules.md` §5). A segunda
  metade é exata, não chute: criatura fora do raio de ativação não anda, e
  herói parado não acorda ninguém novo — então só chegam as que já estavam
  vindo. Isso só fecha para quem enxerga o andar inteiro, que é o mesmo herói
  que carrega o livro.
- **A exigência é um produto de três termos:** `READ_AT × ganância ×
  ameaça-à-frente`, com teto. `READ_AT` é a exigência quando a descida
  INTEIRA ainda está pela frente — quase morte, por desenho — e a fração de
  ameaça restante (`src/sim/difficulty.js`) a afrouxa conforme o que sobra
  encolhe. Sai da curva de dificuldade, não de um número de andar escolhido
  a dedo: mexer na curva reajusta o livro de graça. **Sem teto, de
  propósito** — o produto passa de uma barra inteira nos andares rasos com
  ganância alta, e uma exigência que ninguém alcança é justamente o que
  impede o avarento de ler cedo. O andar em que o livro se torna possível
  sobe 1, 1, 1, 4, 8, 9 pelas seis faixas; nas duas últimas ele quase nunca
  chega a ler, e isso é o preço de guardar tanto.
- **A fração é a Ganância**, e é ela que decide QUANDO. O livro cura o que
  falta, então "vale a pena" precisa de uma fração para ser teste — e ganância
  já significa "quanto uma coisa vale para este herói" no resto do bot, então
  ela serve de **preço de reserva** em vez de um segundo dial fazendo o mesmo
  trabalho. Medido nas seis faixas: o esbanjador lê no andar 1 com a barra
  quase cheia, o avarento espera até um ponto da morte — e **morre com o livro
  fechado em 80% das runs**, porque só se lê com o tile calmo e chega-se ao
  último ponto justamente apanhando. Isso é o traço, não um defeito, mas é o
  que faz a faixa mais alta quase apagá-lo.
- **Profundidade não é monótona nisso**, e o pico interior da Ganância já
  existia antes do livro (M47) — as duas coisas se somam na mesma leitura e
  não dá para separá-las por esta tabela.
- **Injeta a adrenalina** quando a fúria transforma uma luta que ele RECUSA
  numa que ele aceita. Pergunta de sim ou não, sem fração nenhuma: precifica a
  mesma criatura duas vezes — como ele está e como ele estaria — e gasta o item
  quando a segunda leitura passa na barra em que a primeira falhou.
- **Só criatura ADJACENTE**, porque o contador da fúria cai a cada turno que
  passa, andar incluído (`rules.md` §5): injetar contra algo que ainda precisa
  ser alcançado gasta o item na caminhada.
- **O que isso substituiu era autocontraditório.** A regra antiga disparava
  quando o corpo a corpo custava MAIS que uma fração do hp efetivo — que é o
  mesmo teste que o portão usa para RECUSAR essa luta. Medido: em 30 de 84
  injeções o portão recusava toda criatura adjacente com a fúria já ligada. O
  item era gasto exatamente onde o bot ia embora.
- **E a ganância voltou como preço de reserva, não como limiar.** A condição
  diz que o item nunca é desperdiçado; a ganância diz se ESTA luta vale gastá-lo.
  A exigência é escrita contra a barra que o herói já carrega — o duelo sóbrio
  precisa custar pelo menos `barra × ganância` — então nenhum número novo
  aparece. Um avarento espera um resgate de quase duas barras; um perdulário
  aceita o primeiro que aparecer.
- **A metade de baixo do dial não faz nada, e isso é a regra, não defeito.** A
  condição já exige que o duelo sóbrio passe de uma barra, então qualquer
  exigência abaixo de uma barra está satisfeita antes de ser feita. Ninguém pode
  ser mais perdulário que "gasta sempre que ajudaria" — esse É o piso.
- **A escada que isso comprou é outra, e vale dizer qual.** O `RAGE_AT` antigo
  movia o ANDAR da injeção; o preço de reserva move a QUANTIDADE, com o andar
  mediano parado em 4.
- **O turno que o item custa é cobrado de quem o gasta.** Injetar é uma ação: o
  herói não golpeia nesse turno e a criatura ao lado golpeia, então a manobra
  abre com um golpe de graça que o `duelCost` não enxerga — ele precifica o
  duelo do primeiro golpe em diante. Medido: 22 de 63 injeções eram o último ato
  do herói, com 1 de hp mediano, sem armadura e sem golpe nenhum. A leitura
  enfurecida agora carrega esse golpe contra a mesma barra, e o que isso apaga é
  o negócio que nunca pagou — a fúria corta os turnos pela metade, então um duelo
  sóbrio de dois turnos vira um enfurecido de um, poupando um golpe e custando
  um. O item só vale um turno quando poupa mais de um.
- **E isso encurtou o alcance útil do dial de ganância**, o que é honesto dizer:
  "pagável enfurecido" limita o resgate a uma barra, então o custo sóbrio que a
  virada consegue salvar mora entre uma e cerca de duas barras — cobrar o golpe
  da injeção come o topo dessa faixa. Pelas seis bandas as injeções passaram a
  23, 30, 34, 20, 5 e 0: acima de `1.16` o avarento praticamente não usa mais a
  seringa. Em troca ela deixou de ser desperdiçada — 1,05 golpe por injeção
  virou 1,39, e a fração de turnos de fúria que viram golpe ficou plana em ~51%
  em vez de subir com a avareza, porque o desperdício que a ganância removia o
  preço do turno já removeu.
- **Nunca começa luta** cujo custo esperado passe de `fightMargin` do hp
  efetivo (hp + armadura). Uma criatura que já persegue paga só a
  caminhada — o duelo dela acontece de qualquer jeito — **e paga metade
  dela**: o herói fecha um tile por turno e ela também, então uma distância
  `d` some em `d/2` turnos. É aritmética que o bot errava, não dial novo.
- Entre tudo que vale ter — item solto, baú, luta pagável — **pega sempre o
  mais barato em hp**, caminhada e perigo incluídos.
- **Baú que ele sabe estar vazio sai da conta.** Só um herói enxerga o
  conteúdo antes de abrir (`rules.md` §7); para todos os outros o campo nem
  existe no Belief e nada muda. É filtro, não avaliação — não tem dial, e
  não depende do termo de recompensa, que hoje está desligado. O que ele
  deixa de fazer é **andar até** o baú vazio; um que esteja na rota continua
  sendo aberto, porque baú barra o tile e quem passa por cima abre
  (`rules.md` §6). Desviar sairia mais caro em turnos do que os dois que a
  abertura custa.
- **Loot guardado é a aposta:** um baú ou item é ignorado quando o guardião
  custa mais do que o apetite permite. O custo de um guardião se divide entre
  tudo que ele guarda — uma sala de tesouro é `n × valor − 1 × duelo`, não a
  mesma conta feita `n` vezes.
- **A caminhada também se divide, e faltava.** O duelo era rateado e o `walk`
  não, então uma sala de seis baús do outro lado do andar era julgada como se
  o herói fosse até lá seis vezes. O agrupamento é definido **pelo
  guardião** — o que aquele mesmo bicho cobre, contado uma vez só — porque é o
  único agrupamento que o bot já calcula. Agrupamento **sem** guardião
  continua invisível, e consertar isso exige um raio que ninguém tem valor
  para ainda.
- **Guardião que a rota atravessa não é cobrado de novo.** Desde o B26 o tile
  de uma criatura custa o duelo dela, então quando o caminho mais barato até o
  loot passa POR CIMA do guardião ele já foi pago na caminhada — cobrá-lo
  também como guardião põe a mesma luta duas vezes no preço.
- **Guardião é toda criatura cujo raio de perseguição cobre o loot** — "pisar
  ali acordaria isso". Não é proximidade em abstrato: um bicho de raio largo
  guarda de longe, um de raio curto só o que está encostado. Antes exigia
  também ser criatura lateral, e isso caiu junto com o rótulo (`rules.md`
  §7). Ficou mais honesto: um bicho da espinha que por acaso cobre um baú
  também precisa ser resolvido, e a regra antiga precificava esse guardião em
  zero.
- **A luta tem UMA barra, para toda criatura.** Havia uma barra própria para
  criatura lateral, e ela não custava nada para sair: no valor que ship
  (`sideAppetite` 1) as duas barras são o mesmo número, então o teste
  comparava um número contra ele mesmo.
- **Desconta o prêmio que consegue ver.** Uma criatura que anuncia o próprio
  drop (`rules.md` §7 — só o ocupante do vault) é precificada pelo duelo
  MENOS o que o drop vale, e uma arma vale o duelo que ela pouparia contra o
  que já está à vista. O desconto vale para escolher alvo, nunca para a
  barra de sobrevivência: prêmio bom não deixa luta mais barata em hp.
- **A incerteza custa, e é cobrada no OBJETIVO, uma vez.** Ela é quanto a mais
  do mapa o alvo destrava em relação a onde o herói está — o que a viagem
  abre. Um alvo cujo viewport não alcança nada de novo é grátis; a fronteira,
  que fica na beira do desconhecido por definição, é quem mais paga, e é esse
  o contrapeso da cautela sobre explorar.
- **Não no preço do tile, e as duas tentativas que falharam ficam escritas.**
  A forma absoluta — "quanto escuro há perto daqui" — põe ~0,7 em quase todo
  tile, afoga o termo de criatura e derruba a profundidade de 4,00 para 2,78.
  A forma delta por tile parece certa e **conta duplicado**: o Dijkstra soma
  os preços ao longo da rota, e o delta do tile 2 já contém o do tile 1, então
  uma caminhada de dez passos paga ~0,55 onde o destino custa 0,105. Vira uma
  sobretaxa por passo — um segundo `stepCost` disfarçado — cobrada até sobre
  chão já visto, e como o `walk` está no preço de todo candidato, a cautela
  passava a comer a ganância: o raio de saque ia de ~15 tiles na cautela baixa
  para ~6 na alta, e um baú SEM guardião num andar calmo era recusado.
- **E a incerteza fica FORA do portão da fronteira.** Aquele portão recusa
  fronteira cujo caminho tem perigo demais; se a incerteza contar como
  perigo, ele recusa a fronteira por ela ser desconhecida — que é o que uma
  fronteira é. O círculo custou 17% das runs ao orçamento de turnos até o fio
  da lesma pegá-lo.
- **A fronteira é candidata, não plano B.** Ela entra na mesma lista que
  criatura, item e baú, pelo preço da rota, e ganha ou perde por ele. Antes
  ficava num `else` — "só explora quando nada visível vale a pena" — o que
  fazia o bot alternar em blocos: limpar tudo à vista, varrer, limpar de novo.
  Agora os dois se misturam.
- **E a barra do V5 continua.** Tirá-la foi tentado e o teste pegou: uma
  fronteira **não tem contra o que perder**. Competir por preço só recusa
  quando existe algo mais barato, e com toda luta recusada a lista fica
  vazia — então o escuro venceria a qualquer preço, que é o defeito medido de
  volta com outro nome. Ela é filtrada pela mesma barra da aposta lateral, e
  o que a §5 comprou foi a outra metade: quando HÁ outros candidatos, a
  fronteira disputa com eles. **Sai** pelo buraco quando nada mais vale.
- **Se refugia** quando não sobrou nada: lista vazia, buraco desconhecido, e
  ele **exposto**. O refúgio é um tile já visto de exposição zero — e isso é
  prova, não estimativa, porque criatura fora do próprio raio não anda
  (`rules.md` §3) e tile no escuro nunca é zero desde que o escuro custa. É o
  primeiro objetivo do bot que significa **"para longe daqui"**; todos os
  outros são coisas para ir buscar.
- **E ele não é candidato na lista, de propósito.** Um refúgio não produz
  nada, então seria barato SEMPRE — um tile seguro costuma estar a um passo —
  e um herói que pudesse escolhê-lo por preço se esconderia o resto da run.
  Só vale já estando exposto: parado num lugar seguro não há do que fugir.
- **Mantém o objetivo atual** a menos que um novo seja claramente mais
  barato (histerese), para não vacilar entre dois quase-iguais.

## Herói é configuração

`makeBot(options)` aceita `hero`, um override de `DEFAULT_HERO`
(`src/bot/config.js`). Um traço por objetivo:

Os **tres** tracos que o jogador mexe — Coragem, Ganancia, Cautela —
aparecem no Lab com a **mesma forma**: um
vies de ±80% em torno de um centro calibrado, em **seis faixas nomeadas**
(muito baixo ate muito alto). Seis, numero par, para nao haver meio onde
estacionar.

**O centro nao esta entre as seis, e ninguem joga nele.** As duas faixas de
dentro o cercam (-16% e +16%), mas **cada visitante recebe uma faixa
SORTEADA em cada dial** na primeira sessao, guardada dali em diante. Nao
existe mais estado "intocado": o que o slider mostra e o que a run recebe,
sempre.

Consequencia que precisa ser dita: **as medicoes descrevem o centro
calibrado, nao a sessao de quem assiste.** Tripwire, sweep e tudo em
`decisions.md` foram tirados no centro; o bot que a maioria ve e um vies
aleatorio em torno dele.

**So a Ganancia tem centro calculado:** ela multiplica o valor esperado de um
bau, que sai da chance de loot e da tabela de itens sozinho. Os outros dois
tem por centro o valor que shipa.

**E so a Ganancia tem pico interior.** Cautela sobe e depois achata — a
metade de baixo custa profundidade, a de cima empata com o centro —, entao
nela a escolha deliberada e DESCER. Coragem move quais lutas sao aceitas
muito mais do que move a profundidade.

**`stepCost` saiu do painel** (B24, 0.1 fixo): varrido em 18 configuracoes a
n=150, tudo entre 0.08 e 0.9 mede igual. O mecanismo fica porque em 0 andar
e gratis e o bot vaga um andar por 1500 turnos — precisa estar acima de
~0.08, mas nao e uma escolha.

| traço | objetivo | o que faz |
|---|---|---|
| `bravery` | sobreviver | quanto ele SUBESTIMA a vida de uma criatura. Ele nunca vê vida (`rules.md` §7), só o xp, então precifica pela média do bestiário para aquele xp — e a coragem desconta essa média, espelhada em torno do centro: um entalhe acima (1,16) é ler tudo como tendo 16% menos vida. Não é aceitar odds piores, é **acreditar que morre mais rápido** — certo sobre o lobo, fatal sobre o ogro, ambos xp 4 |
| `fightMargin` | sobreviver | fração do hp efetivo que uma luta pode custar. **Deixou de ser dial** — é constante decidida; dois dials puxando a mesma decisão de pontas opostas era a confusão que o M47 desfez |
| `sideAppetite` | chegar rico | **quanto uma coisa vale para este herói.** Multiplica o valor esperado de um baú, e decide quão tarde livro e seringa são gastos. As duas direções são opostas de propósito: valorizar muito é **adquirir mais e consumir menos** |
| `riskAppetite` | sobreviver | **constante decidida em 1, nao e faixa.** Quanto custo incerto ele aceita pagar, como múltiplo da barra que ele já aplica a uma luta comum — o guardião de um baú ou item, e o perigo no caminho até o escuro. Mesma família da coragem, população diferente: a coragem é a atitude perante a incerteza sobre criatura **à vista**, esta sobre o que ele **não viu** |
| `stepCost` | poucos passos | quanto vale um passo em hp. **Nao e bem pressa:** o preco do tile e `stepCost + perigo`, entao valor alto torna o perigo desprezivel na comparacao e a rota vira distancia pura. Medido, 0 quebra o bot (vaga 1500 turnos porque andar e gratis) e de 0,01 a 0,2 nada muda |

Um herói covarde, ganancioso ou apressado é **outro objeto de config, nunca
outro código**.

**O elenco existe** e mora em `src/sim/heroes.js` — um objeto por herói,
com o que ele enxerga, o que um item vale na mão dele, o que um andar
concluído lhe compra, e os overrides de `DEFAULT_HERO` acima. Quem joga é
escolhido na página (`src/ui/roster.js`) e persiste entre sessões; o
mecanismo continua provado por teste (`test/tests.js`).

**São dois eixos independentes, e vale não confundir:** o herói decide o que
o bot SABE e o que ele CARREGA; os três dials decidem como ele valora o que
sabe. Qualquer herói pode ser covarde ou ganancioso.

## Como um turno é decidido

1. **Campo de perigo**: cada tile dentro do raio de perseguição de uma
   criatura custa a mordida esperada dela, decaindo com a distância
   (`DANGER_FALLOFF`); tile alcançável por duas de uma vez leva
   `CROWD_PENALTY`.
2. **Dijkstra** sobre o Belief, preço = `stepCost` + perigo. O buraco é
   **sumidouro**: entra-se, não se sai — pisar nele encerra o andar, então
   rota "através" dele não existe a preço nenhum.
3. **Candidatos**: criaturas pagáveis (custo do duelo vem de `duelCost`),
   itens com efeito, baús — laterais filtrados pelo apetite, com o custo do
   guardião que a visita acordaria somado ao preço.

   **`duelCost` não lê `velocidade`, de propósito.** Uma criatura que age
   duas vezes por turno custa cerca do dobro do que ele paga por ela. Não é
   descuido: entrar numa luta e sobreviver a ela são o mesmo número — o
   portão é `duelCost ≤ barra` e a sobrevivência é ~`duelCost / hp efetivo`
   — então tudo que deixa uma luta mais mortal faz o bot **recusá-la** em
   vez de perdê-la. Medido sobre todos os pares (vida, xp) de mesmo
   `duelCost`, a taxa de vitória é plana. Velocidade é a única propriedade
   achada que move o custo real sem mover o preço, e o vault depende disso.
   O campo **viaja no Belief** e poderia ser lido; nada o lê. Corrigir isso
   é um ato deliberado, não uma faxina — `decisions.md`, M44.

   **`duelCost` desconta os golpes que o próprio bot já deu.** O Belief soma
   por criatura quanto ele tirou dela (`rules.md` §7), então o palpite cai
   durante o duelo e terminar algo meio morto é precificado como meio. É o
   que faz o portão poder virar no meio da briga, para os dois lados.
   Zerado o desconto com a criatura ainda de pé, ele **palpita de novo do
   zero** — precificar o resto em zero deixava o bot mais confiante
   exatamente onde tinha se provado errado.

   **O tile de uma criatura viva custa o DUELO dela** (B26). Entrar nele
   ataca e o herói não sai do lugar (`rules.md` §6), então cobrar um
   `stepCost` era precificar um movimento que o motor não permite. Custa o
   duelo e **só** o duelo — a ameaça por turno do campo de perigo são os
   mesmos golpes contados de novo. Bloquear o tile em vez de precificá-lo
   também funciona e foi medido, mas quebra o V5: a fronteira atrás de um
   guardião vira inalcançável em vez de cara.

   **Consequência que não estava no plano:** um perseguidor adjacente passa a
   custar exatamente **zero** — a rota até ele *é* o duelo, e o duelo dele
   não é cobrado porque acontece de qualquer jeito. Ele vira sempre a coisa
   mais barata do tabuleiro, então o bot **termina a briga** em vez de sair
   de perto. Medido em 120 runs: recuos caem de 71 para 17 duelos, ataques
   sobem, profundidade e mortes iguais.
4. **O mais barato vence**, com histerese. Vazio o conjunto: fronteira (se
   o escuro deve algo), senão buraco.
5. **Nunca fica parado.** Se o apetite recusou toda fronteira e nenhum
   buraco é conhecido, ele vai mesmo assim para a fronteira mais barata
   das recusadas. `rest` passa o turno sem mudar nada — criatura fora do
   raio de perseguição não se move — então um turno sem objetivo se repete
   idêntico até o andar estourar o orçamento. Parar nunca é sobreviver.

## O que ele conhece

Só `Observation`/`Belief` (`rules.md` §7). Tile nunca visto conta como
andável — otimismo deliberado que é como ele explora. As contagens de
criaturas e baús do andar são concedidas e viajam nas opções do
`makeBot`, junto com as configurações de geração.

## O que ele não faz, de propósito

- **Não persegue moeda** (objetivo #2 do produto): nenhum termo de moeda
  existe. Um bot que arrisca a run por moeda faz uma troca estritamente
  ruim — moeda só é ganha em conclusão.
- **Não olha o relógio**: o orçamento de turnos (`TURN_BUDGET`) é do motor.
  O traço `stepCost` é o quanto o herói se importa com tempo.
- **Não simula à frente.** A busca tática de 1 turno, a dominância de
  planos, as fases de ativação e o preço de turno foram medidos, alguns
  ajudavam pouco, nenhum era explicável do sofá — `decisions.md` tem os
  números de cada um.
