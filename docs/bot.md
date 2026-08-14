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
- **Injeta a adrenalina** quando o que está ao alcance do braço custaria mais
  que uma fração do hp efetivo — `custo do corpo a corpo ≥ hp efetivo ×
  RAGE_AT × ganância`. Mesma frase do livro com o contexto trocado: lá é o
  que a descida ainda deve, aqui é a briga que está acontecendo. Preço em hp
  pelo `duelCost`, e não massa de ameaça crua: as unidades da massa são
  `hp × dano`, então um piso fixo aterroriza no andar 1 e é rotina no 9. Sem
  teto, pela mesma razão do livro.
- **Só conta criatura ADJACENTE, e isso é definição, não ajuste.** O
  contador da fúria cai a cada turno que passa, andar incluído
  (`rules.md` §5), então injetar contra algo que ainda precisa ser alcançado
  gasta o item na caminhada. Não existe tabuleiro onde enfurecer contra o
  vazio esteja certo. Antes disso ele somava toda criatura dentro do próprio
  raio: medido em 150 runs, 40% das injeções não tinham ninguém do lado e um
  quarto tinha a mais próxima a seis ou mais tiles.
- **Ele usa a fração de ANDARES restantes, o livro usa a de AMEAÇA** — e a
  diferença foi medida, não argumentada: a ameaça é concentrada no fim, então
  a fração dela fica ~0,95 do andar 1 ao 5, justo onde o andar da injeção
  precisava se separar. **Tem um limite estrutural:** o bot recusa luta que
  custe mais que `fightMargin` do que ele tem, então custo acima de uma barra
  só acontece em emboscada — e emboscada não é mais funda que o resto. Daí
  para cima a exigência só fica rara, não mais profunda.
- **E o que desperdiça a seringa hoje não é o gatilho, é o que vem depois.**
  Com o sensor corrigido, 41 de 95 injeções ainda não dão um golpe — e 89 dos
  turnos perdidos são o herói **andando embora** da criatura em que acabou de
  injetar. Ele precifica o tile de uma criatura colada pela mordida cheia
  dela, então qualquer coisa quieta a uma dúzia de passos fica mais barata
  que a briga na cara dele. É o B26 visto pelo outro lado, e nenhum ajuste do
  `RAGE_AT` alcança isso.
- **Nunca começa luta** cujo custo esperado passe de `fightMargin` do hp
  efetivo (hp + armadura). Uma criatura que já persegue paga só a
  caminhada — o duelo dela acontece de qualquer jeito.
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
- **Explora** enquanto o escuro ainda pode dever algo (as contagens são
  concedidas — `rules.md` §7), escolhendo a fronteira pela **rota já
  precificada** e recusando a que tenha mais perigo no caminho do que o
  apetite permite — a mesma barra da aposta lateral. **Sai** pelo buraco
  quando nada mais vale.
- **Mantém o objetivo atual** a menos que um novo seja claramente mais
  barato (histerese), para não vacilar entre dois quase-iguais.

## Herói é configuração

`makeBot(options)` aceita `hero`, um override de `DEFAULT_HERO`
(`src/bot/config.js`). Um traço por objetivo:

Os **cinco** tracos que o jogador mexe — Coragem, Ganancia, Risco, Cautela,
Vigilancia —
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
| `riskAppetite` | sobreviver | **quanto custo incerto ele aceita pagar**, como múltiplo da barra que ele já aplica a uma luta comum — o guardião de um baú ou item, e o perigo no caminho até o escuro. Mesma família da coragem, população diferente: a coragem é a atitude perante a incerteza sobre criatura **à vista**, esta sobre o que ele **não viu** |
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
