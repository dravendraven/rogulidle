# Rota e valor: como o bot precifica o tabuleiro

**Onze peças desenhadas numa sessão com o dono.** Dez entraram e uma foi
**descartada por medição** (§4). A fila acabou; o que sobrou é um defeito
achado no caminho, na última seção.

Cada peça é construível e observável sozinha. A numeração é a da conversa,
para que ela mape no documento; a ordem em que foram construídas está no fim
e não é a mesma.

Começou como "cautela" e cresceu. O assunto real é maior: **como o bot
precifica cada tile e cada coisa que vale a pena pegar**, e por que quase
tudo isso hoje é dito duas vezes ou nenhuma.

A última seção lista **o que foi descartado e por quê**. Ler antes de
reintroduzir qualquer coisa que pareça uma boa ideia.

## O problema

O bot tem três dials e todos respondem à mesma pergunta: *o que vale a pena
pegar*. Nenhum responde *por onde ir*. A rota é decidida por um único número
(`stepCost`) varrido em 18 configurações a n=150, plano de 0,08 a 0,9 — virou
constante por isso.

O resultado é um herói cuja personalidade só aparece na escolha de alvo. Ele
nunca *parece* cauteloso, porque cautela não é uma coisa que ele tem.

E isto é um jogo de assistir. "O herói parece cauteloso" é resultado legítimo
mesmo com profundidade idêntica — a medição certa não é o andar médio, é se
um espectador consegue dizer qual dial está alto só olhando.

## Os quatro dials, quando tudo estiver pronto

| dial | pergunta | população |
|---|---|---|
| coragem | quanto essa criatura aguenta? | o que ele **vê** |
| apetite ao risco | quanta incerteza eu aceito? | o que ele **não vê** |
| ganância | quanto isso vale para mim? | recompensa |
| **cautela** | quanto custa um turno exposto? | o caminho |

Só a cautela é dial novo. O apetite ao risco sai de dentro da ganância (§7) e
a coragem já existe.

**Coragem e apetite ao risco são a mesma família e populações diferentes**, e
isso precisa ficar escrito ou daqui a três sessões alguém funde os dois. A
coragem é a atitude perante a incerteza sobre uma criatura à vista; o apetite
ao risco é a atitude perante o que ainda não foi visto.

---

# Parte I — o que já entrou

Todas medidas, todas em `main`. As quatro abaixo são as que entraram antes de
a fila começar; as sete da Parte II saíram na ordem de construção do fim.

## 8. `side` saiu do Belief ✅

O rótulo dizia "esta criatura está numa sala que a rota obrigatória nunca
entra" — o que codifica **onde fica a saída**, calculado sobre o mapa inteiro
antes de o herói ter visto um tile. Era a concessão que a `rules.md` §7 nunca
listou.

Medido antes de tirar. Fração de baús laterais abertos, 150 runs por ponto:

```
ganância 0,2    0,10 → 0,19
ganância 1,0    0,84 → 0,86      (o que ship)
ganância 1,8    0,87 → 0,90
```

A aposta sobrevive porque **a opcionalidade já estava precificada duas
vezes**: sala lateral fica fora da rota, então chegar nela custa mais
caminhada e mais guardião. O rótulo dizia a mesma coisa de novo.

Duas coisas caíram junto: a luta passou a ter **uma barra só** (no valor que
ship as duas já eram o mesmo número), e **guardião deixou de precisar ser
lateral** — o que é mais honesto, porque um bicho da espinha que cobre um baú
também precisa ser resolvido.

**E cobrou uma dívida** — §D abaixo.

## 9. O guardião cobra por distância, não por presença ✅

Visto rodando (seed 2956634425, andar 6): o bot ignorou um baú imediatamente à
sua esquerda, sem guardião perto, e foi buscar algo bem mais longe.

Era um booleano onde devia haver uma curva. Dentro do raio, o guardião cobrava
o duelo **inteiro** — colado no baú ou a doze tiles dele. Errado sobre o jogo,
não só sobre a conta: um guardião a oito turnos **pode ser batido no tempo**,
porque o herói abre o baú em dois turnos e sai.

Agora decai por `persistence`, sobre **passos reais** — o `dangerField` já
inundava a partir de cada criatura e devolvia um mapa `reach` que ninguém lia.
Isso conserta de brinde a outra metade: o teste antigo media em linha reta, e
um guardião do outro lado de uma parede cobrava como se estivesse ao lado.

**O desconto não vale para quem não se consegue deixar para trás.** Sem isso o
vault teria evaporado: o Butcher tem raio 10 sobre um quarto de 9, então os
baús do fundo cairiam para ~1/20 do duelo dele — contra o achado medido de que
baús fora do alcance eram abertos em 89,7% das vezes contra 39,2% dos
guardados. É a regra do B18 no único outro lugar a que ela pertence.

Medido, ganância 1, 150 seeds: andares 4,44 → 4,49, baús laterais 13,85 →
14,54, divergem em 70 das 150. Ele pega mais loot sem ficar mais raso.

## Memória de golpes ✅

A vida de uma criatura não atravessa em distância nenhuma. O herói percebe o
próprio golpe e o Belief soma por criatura, então o palpite decai durante o
duelo. Palpite esgotado com a criatura de pé é **refeito do zero** — o piso de
1 hp precificava em zero o resto de uma luta que ele estava perdendo.

## B26 — o tile de uma criatura viva custa o duelo dela ✅

Entrar nele ataca e o herói não sai do lugar, então cobrar um `stepCost` era
precificar um movimento que o motor não permite. Custa o duelo e **só** o
duelo — a ameaça por turno do campo de perigo são os mesmos golpes contados de
novo.

**Consequência fora do plano:** um perseguidor adjacente passa a custar
**zero**, porque a rota até ele *é* o duelo e o duelo de quem já persegue não é
cobrado. Ele vira a coisa mais barata do tabuleiro e o bot **termina a briga**
em vez de sair de perto. Recuos caíram de 71 para 17 duelos em 120 runs, com
profundidade e mortes iguais — a maior parte do que parecia recuo era o bot
largando briga que ganharia.

---

# Parte II — o que falta

## 1. A fórmula do preço do tile ✅

```
preço(tile) = stepCost × (1 + cautela × exposição(tile))
```

`exposição` = quantas criaturas-turno aquele tile custa. `cautela` = **quantos
passos vale um desses turnos**, adimensional. A rota inteira fica precificada
em múltiplos de um passo.

Essa forma é do dono e substitui a primeira que eu escrevi (`stepCost +
cautela_hp × exposição`). São a mesma coisa reparametrizada — provado, 150 de
150 seeds idênticas — mas esta põe no dial **a razão entre pressa e perigo**,
que é a única quantidade que sempre importou. Cautela como preço em hp era um
segundo número absoluto ao lado do `stepCost`, e nenhum dos dois queria dizer
nada sozinho.

O centro sai de graça: `MEAN_BITE / stepCost` ≈ **16 passos por
criatura-turno**, a razão em que o campo antigo já rodava. As seis faixas vão
de 3 a 29.

**A cautela é CEGA À FORÇA, de propósito.** Não lê `xp`, não lê vida, não
distingue rato de dragão. Quem julga força é a coragem, dentro do duelo. Na
prática é uma linha no campo de perigo:

```
bite(m) = expectedDamage(m.xp, 0)      →      bite(m) = 1
```

O decaimento com a distância, a aglomeração e o `activation` continuam iguais
— as três coisas que pareciam precisar de termos novos já estão lá.

**O `activation` fica.** Não é sobre força, é sobre geometria: criatura fora
do próprio raio é provadamente imóvel (`rules.md` §3), e é a única certeza
dura que o bot tem sobre o mapa. Tirar isso faz ele contornar estátuas.

**Custo aceito e declarado:** cautela alta desvia até de rato. É o trade-off,
não um defeito.

**E ela NÃO está no painel do jogador**, apesar de ter sido desenhada como
dial. O painel tinha o `persistence` chamado Cautela (hoje `persistence` é constante decidida, fora do painel), e pôr os dois lado a
lado é dois dials sobre uma decisão só — persistence é a FORMA do decaimento
do perigo, caution a MAGNITUDE, e ambos movem a mesma coisa visível: quão
perto o herói aceita passar. É o padrão do M47.

Então `caution` fica como traço de herói em `src/bot/config.js`, onde um herói
pode diferir de outro, e fora das seis faixas até que uma varredura diga se os
dois são separáveis. **Se não forem, um deles é o dial e o outro é constante
decidida — e essa escolha é do dono, não efeito colateral de nomear.**

> 2026-08-27 — a escolha foi feita, e por outro caminho que o parágrafo
> previa: a metade de EXPOSIÇÃO virou a constante `EXPOSURE_STEPS` (mortes
> 1,00 planas nas seis faixas — calibração, não escolha) e a metade do
> DESCONHECIDO virou o dial **Curiosidade** (`curiosity`, espelho `(2 − c)`
> sobre o `opening`). `porta-e-chave.md` tem o mesmo registro do lado de lá.

### Por que NÃO `cautela × (1 + exposição)`

Foi a primeira forma escrita e ela achata o perigo. Hoje um tile colado numa
criatura xp 4 custa `0,1 + 1,25` contra `0,1` de um tile limpo — contraste de
**13:1**. Naquela forma o contraste vira **2:1**, e a cautela não conserta
porque multiplica os dois lados igual.

Na forma adotada a cautela é **a taxa de câmbio entre perigo e passo**, e
ganha um centro calibrado de graça: `MEAN_BITE`, a mordida média do bestiário,
derivada de `MONSTER_TABLE` e não escolhida.

**Correção ao que estava escrito aqui:** esse centro NÃO reproduz o jogo antigo
exatamente. Ele gasta o mesmo orçamento total de perigo, mas tile a tile é
outro jogo — ao lado de um rato custa mais do que custava, ao lado de um dragão
menos. Essa é a troca sendo comprada, não um efeito colateral.

Medido, ganância 1, 150 seeds: andares 4,32 → 4,23 (dentro do ruído), baús
laterais 14,70 → 13,81, divergem em 60 seeds. E o fio da aposta recuou de
0,908 para 0,891 — a primeira das quatro mudanças a empurrá-lo de volta.

## 2. Calibrar a cautela contra um duelo justo ⚠️ NÃO FEITA, e há motivo

A intenção era escolher a cautela como frase e não como número: **quantos
turnos de exposição valem uma briga justa.**

**A frase nunca foi escrita, porque as varreduras disseram que não há o que
calibrar.** Duas medições independentes, as duas nas seis faixas:

```
rota      desvio 1,22 → 1,26   reversão 1,2% → 1,6%   sangue 0,1 → 0,3
cerco     0,64% → 0,64% formado, 1,20% → 1,21% no próximo turno
```

Da faixa mínima à máxima — nove vezes o valor — nada se move fora do ruído. O
`B24` previa isso e a previsão foi escrita no `config.js` ANTES da varredura:
o `stepCost` já tinha sido varrido de 0,08 a 0,9, que é ONZE vezes a mesma
razão entre pressa e perigo, e mediu plano.

**A pergunta que fica não é sobre o dial, é sobre o MAPA.** Uma taxa de câmbio
entre perigo e passo só pode separar se houver mais de um caminho. Com
`MAP_DUG_PERCENTAGE` em 0,15 existe rota obrigatória e pouca malha — pode
simplesmente não haver por onde desviar. `ROOM_SCALE` e `MAP_SIZE` (agora
dials do mapa) são onde isso se testa, e é uma sessão sobre geração, não
sobre o bot.

**Consequência prática:** enquanto isso não for respondido, a cautela é um
dial que não paga o próprio custo. Ela está fora do painel do jogador por
outro motivo (§1), e essas duas coisas juntas dizem que ela pode acabar sendo
constante decidida em vez de dial.

## 3. Perseguidor paga metade do caminho ✅

Uma criatura que persegue anda um passo enquanto o herói anda um passo, então
a distância `d` fecha em `d/2` turnos. Como a cautela é hp por turno, o
caminho até um perseguidor custa **metade**. Baú e item, parados, pagam
inteiro.

Não é parâmetro novo — é aritmética que o bot errava. Fica no mesmo lugar
onde o duelo já é dispensado pelo mesmo motivo ("vai acontecer de qualquer
jeito").

Medido, ganância 1, 150 seeds: andares 4,23 → 4,33 (dentro do ruído), baús
laterais 13,81 → 14,23, divergem em 30 das 150.

## 4. Previsão de dois turnos ❌ DESCARTADA, medida

**Descartada depois de medir, e a medição é a do dono, não a minha.**

A motivação real dela nunca foi o decaimento — era **não ficar encurralado**:
evitar combate com 2+ criaturas adjacentes. Na primeira volta eu medi
zigue-zague e desvio, que é o proxy errado, e ela sobreviveu por engano. Medido
o cerco de verdade, 80 runs por faixa:

```
faixa   cautela   cercado   escolhido   fechou em cima   sangue cercado
0         3,2      0,64%       0,06%           0,58%          5,5%
5        28,6      0,64%       0,08%           0,56%          5,5%
```

O herói fica cercado em **0,7% dos turnos**, e a parte em que ele ANDOU para
dentro do cerco sabendo é **0,07%** — um turno em mil e quatrocentos. Nove de
cada dez cercos são as criaturas fechando em cima dele, não ele escolhendo mal.
O cerco custa 5,5 a 7,8% de todo o dano tomado, e isso é o TETO do prêmio;
a §4 só alcança a fatia escolhida, que é a menor das duas.

A cautela também não separa nada disto — 0,64% nas duas pontas, sem tendência.

**O que ela teria sido, e vale registrar caso alguém volte:** não uma peça nova
ao lado do que existe, mas o `crowdPenalty` deixando de ser cego ao tempo. Ele
já cobra um extra quando 2+ criaturas alcançam um tile; só que conta as que já
estão a um passo, não as que CHEGARIAM enquanto o herói caminha. Se um dia o
cerco virar um número grande, é ali que se mexe, e não no decaimento.

O resto desta seção é o desenho como ele estava, mantido porque a parte técnica
continua correta:

A previsão **é fiel e não é chute**: criaturas só perseguem, usam `findPath`,
pulam 10% dos turnos e bloqueiam umas às outras (`src/sim/monsters.js`). Dá
para reproduzir o motor, não para adivinhá-lo.

Onde entra: **substituindo o `persistence ^ dist` dentro da exposição.** Hoje
esse termo é um chute decaindo — "quanto mais longe, menos provável que
chegue". Nos tiles perto, a previsão vira a verdade.

**O que ela compra de verdade é assimetria.** Um flood simétrico saído da
criatura não sabe dizer que os tiles *atrás* do herói são mais seguros que os
*além* da criatura. A previsão sabe, porque a criatura anda na direção dele. É
a única coisa aqui que o campo atual não consegue expressar de jeito nenhum.

**É também a única que pode não pagar.** Se não der para ver a diferença
rodando, joga fora.

### O que NÃO fazer, e o motivo veio do próprio dono

Trocar o Dijkstra por "escolha o vizinho que maximiza a distância da criatura
mais próxima em 2 turnos". Duas coisas quebram:

- Sem termo de progresso a rota para de ir ao objetivo, e o herói circula no
  canto mais seguro para sempre.
- Maximizar passo a passo é escalada local — é exatamente o zigue-zague que a
  proposta queria evitar. O Dijkstra não zigue-zagueia porque decide o caminho
  inteiro antes do primeiro passo.

E a rota **não pode trocar de moeda** depois que o objetivo é traçado: o
Dijkstra precisa de um escalar só, e duas moedas exigem um peso, que é um
parâmetro novo comprando um problema que a moeda única não tinha.

## 5. Fronteira como quarto candidato ✅

Hoje a fronteira **não é candidato, é plano B**: `if (pool.length) {…} else
{ fronteira }`. Ordem de prioridade, não comparação de preço.

Ela passa a entrar na pool com preço em hp, como criatura, item e baú.

**Sai o portão do V5** (`perigoNoCaminho ≤ sideBar`). Ele foi remendo para a
exploração não ter preço: ela escolhia a fronteira com menos passos, cega a
perigo, e nenhuma barra podia recusá-la. Com o preço honesto, **o preço já é o
portão**.

Medido, ganância 1, 150 seeds: andares 4,27 → 4,26 e baús 14,09 → 13,92 —
parados — mas **76 das 150 seeds divergem**, então o comportamento mudou
bastante sem mover o agregado. Nos tripwires: a aposta aliviou de 0,892 para
0,857 (bom, afasta-se de "sempre aberto"), mortes de abertura 0,220 → 0,267, e
"wins too rare" voltou a disparar com 0 clears contra 1. Um clear em 150 é
ruído, mas é o fio ligado.

**A objeção que quase matou isto, e a resposta:** "a fronteira com preço =
`walk` ganha de tudo e o bot nunca briga". Não — ela ganha *enquanto estiver
perto*. Conforme o andar é varrido as fronteiras ficam longe e as criaturas
continuam perto, e a briga volta a ganhar sozinha. Isso se auto-equilibra, e é
onde a personalidade vira comportamento visível: varrer o andar antes contra
encarar o que está na frente.

## 10. A incerteza é o escuro que um passo ABRE ✅ refeita

**Hoje o escuro é o terreno mais barato do jogo, sem dial nenhum.**
`believedWalkable` trata tile nunca visto como passável e o campo de perigo não
conhece criatura lá — então o escuro não é neutro, é *seguro por construção*.
É uma mentira, não uma escolha.

O bot já tem o número para consertar, calculado na própria função:

```js
const unseenMonsters = settings.monsterCount - belief.monsters.size;
```

Quantas criaturas o andar tem é concedido (`rules.md` §7). A diferença está no
escuro, e o escuro passa a custar isso — **como exposição, pela mesma fórmula
da §1**:

```
exposição(tile escuro) = densidade esperada de criaturas ainda não vistas
preço = stepCost + cautela × exposição
```

Isto é obrigatório e não é escolha de estilo: se a cautela escalasse o perigo
conhecido e não o escuro, **subir a cautela faria o herói desviar de criatura à
vista e entrar em sala escura**. O modelo ficaria invertido. A cautela é a taxa
de câmbio de TODA exposição, vista ou não.

**E por isso a coragem NÃO entra aqui.** Exposição é cega à força por definição
— não há vida de criatura para descontar, só "quantas criaturas-turno isto me
custa". Uma versão anterior precificava o escuro como uma criatura imaginada
avaliada por `expectedHpFor` e descontada pela coragem; isso briga com a §1 e
foi essa que caiu. O escuro vira um número de densidade, não uma criatura
fictícia.

**Quem paga é o apetite ao risco** (§7): o escuro é incerteza, e incerteza
aceita é a pergunta dele.

A conta que ficou:

```
escuro = (criaturas que faltam / tiles nunca vistos) × emissão
emissão = Σ tiles(d) × persistence^d      ≈ 4d tiles à distância d
```

`MEAN_ACTIVATION` (12,55, derivada da tabela como `MEAN_BITE`) dá o raio, e a
emissão sai 29,5. Num andar típico — 6 criaturas por achar, 800 tiles no
escuro — um tile apagado custa **0,45 contra 0,10 de um tile limpo**.

Medido, ganância 1, 150 seeds: andares 4,33 → 4,27, baús 14,23 → 14,09,
divergem em apenas **10 das 150**. Isso é esperado e não é decepção: a
fronteira ainda é plano B, então o preço do escuro quase só afeta rotas que
cortam o desconhecido. **O retorno desta peça vem com a §5**, que é o que ela
existe para tornar seguro.

## 6. Refúgio: o tile seguro mais próximo ✅

Um tile conhecido de **exposição zero**. Como criatura fora do raio é
provadamente imóvel, exposição zero é **garantia, não palpite** — o refúgio é o
único lugar do bot onde "seguro" é uma prova.

**Por que é necessário.** O bot não tem nenhum objetivo que signifique **"para
longe daqui"**. Toda a lista dele é coisa para *pegar*. É por isso que "fugir"
e "desistir" são a mesma coisa hoje, e o B26 mostrou que a maior parte do que
parecia fuga era desistência.

**Por que NÃO é um quinto candidato.** Porque não produz nada. Se competisse
por preço seria barato *sempre* — é um tile seguro logo ali — e o herói se
esconderia para sempre. O lugar dele é substituir o galho onde o bot hoje vai
para a fronteira que ele mesmo recusou, porque ficar parado é morte garantida.

**O que decide entre explorar e se refugiar não é gosto, é sobrevivência** — e
essa foi a resposta que a sessão levou mais tempo para achar. A barra já
existe:

```
melhor fronteira custa mais que fightMargin × hp efetivo   →   refúgio
```

Medido, 150 runs, 637 andares: o refúgio dispara em **13 andares** e ocupa
**1,1% dos turnos**. Raro e dramático, que é o que um recuo deve ser.
Profundidade parada (4,26 → 4,25), 5 seeds divergem.

**E ele oscila, o que precisa ficar escrito.** São 756 turnos de refúgio em 13
andares — cerca de 58 por andar, alto demais para ser uma fuga só. A causa é
estrutural: o herói chega ao refúgio, fica seguro, `exposto` vira falso, e o
último recurso o manda para uma fronteira que a barra tinha recusado; andando
até ela ele se expõe de novo e volta. O fio da lesma continua em **0**, então
isso não está estourando o orçamento de turnos — mas é ida-e-volta, e é a
primeira coisa a procurar quando finalmente se assistir.

Desenho final da escolha:

```
candidatos, todos em hp:   criatura · item · baú · fronteira
                            → pega o mais barato

lista vazia:
   buraco conhecido?        → buraco
   fronteira cara demais?   → refúgio
   senão                    → rest
```

## 7. Decompor `sideAppetite` em apetite ao risco × ganância ✅

**Não é adicionar um dial, é separar um que já está sobrecarregado** — e essa
distinção importa, porque a regra do `CLAUDE.md` proíbe compensar um parâmetro
com outro, não proíbe desfazer uma fusão errada.

O próprio código já admite a fusão:

> `sideAppetite` deixa de ser uma fração do hp do herói e vira um multiplicador
> sobre VALOR

E ele tem **três papéis**, um deles correndo na direção contrária:

| uso | o que realmente é | direção | vai para |
|---|---|---|---|
| `sideBar` — item, baú, fronteira | incerteza aceita | sobe = permissivo | **apetite ao risco** |
| o escuro (§10) | incerteza aceita | sobe = permissivo | **apetite ao risco** |
| `chestValueHp ×` — preço de reserva do baú | valor | sobe = permissivo | ganância |
| `READ_AT ×` — segurar o livro | valor | sobe = **restritivo** | ganância |
| `RAGE_AT ×` — segurar a seringa | valor | sobe = **restritivo** | ganância |

**As barras são risco, os preços são ganância.** Os dois papéis de valor são
coerentes entre si: quem valoriza muito **adquire mais** e **consome menos**.
Isso é avareza funcionando dos dois lados, e fica junto.

**A propriedade que torna isto seguro:** os dois nascem em 1, então **o corte
entra sem mudar comportamento nenhum**. Refatoração de significado com medição
idêntica — dá para landar, confirmar que nada moveu, e só depois varrer cada
metade. É raro conseguir isso num corte deste tamanho, e é por isso que vem
cedo.

## 11. O valor de um baú é o da sala, não o dele sozinho ✅

**A assimetria, em uma linha: o guardião é rateado, a caminhada não.**

O portão do baú é

```js
if (walk + guard > chestValueHp × sideAppetite) continue;
```

e `guard` já vem dividido pelo número de coisas que aquele mesmo guardião cobre
(B22 — sem isso o vault era recusado oito vezes seguidas, comparando `1 × valor
− 1 × duelo` quando a sala vale `8 × valor − 1 × duelo`).

Mas `walk` não é dividido por nada. A aritmética mostra o erro exato —
multiplicando o portão por `n`:

```
o que ele testa:    n × walk + duelo   >   n × valor × ganância
o que é verdade:        walk + duelo   >   n × valor × ganância
```

**A caminhada é cobrada `n` vezes por uma viagem só.** Uma sala com seis baús
do outro lado do andar é julgada como se o herói fosse até lá seis vezes.

O conserto tem duas formas equivalentes — ratear a caminhada, ou multiplicar o
valor pelo tamanho do agrupamento — e **a escolha entre elas é o trabalho de
verdade**, porque as duas precisam definir *agrupamento*:

- **Pelo guardião**: "os baús que este mesmo guardião cobre". Já está
  calculado, custo zero. Mas um agrupamento **sem guardião** fica invisível, e
  esse é justamente o caso barato que o bot deveria adorar.
- **Por distância entre baús**: precisa de um raio, que é parâmetro novo.
- **Pela sala**: o bot não sabe o que é sala (a §8 tirou), e re-conceder isso
  desfaz a peça 8.

**Feito pela primeira**, com o limite declarado no código. Medido, ganância 1,
150 seeds: andares 4,49 → 4,32 (dentro do ruído), baús laterais 14,54 → 14,70,
divergem em 82 seeds. E os tripwires no jogo shipado:

```
mortes de abertura   0,233 → 0,200
runs completas           0 → 3        ("wins too rare" parou de disparar)
a aposta está morta  0,845 → 0,908
```

**A primeira run completa do projeto em muitas sessões apareceu aqui** — e a
mesma mudança empurrou a aposta para 0,908, na direção de "baú lateral é
sempre aberto", que é a metade do fio que dispara. Três mudanças seguidas
empurraram esse fio para o mesmo lado (0,838 → 0,828 → 0,845 → 0,908). É o
número a vigiar na próxima peça.

**Por que ele anda sempre para o mesmo lado:** `docs/project/vault-irrecusavel.md`
mede o outro efeito do mesmo rateio — o número de baús vira desconto no
perigo, então mais recompensa deixa a sala mais SEGURA na conta do bot em vez
de mais arriscada. No vault isso já saturou: o guardião passa a barra em todas
as seis faixas de Coragem, e a entrada está em 86%.

---

## D. A dívida aberta: 0,6 de andar do avarento

Tirar `side` (§8) custou profundidade na faixa mais cautelosa. Medido, 80
seeds, ganância 0,2:

```
andares       3,67 ± 0,16   →   3,05 ± 0,14      (~2,9 sigma)
baús laterais        2,21   →          2,70
mais raso em 40 seeds, mais fundo em 6
```

Na faixa que ship (ganância 1) não moveu: 4,41 → 4,44 sobre 150 seeds.

**A causa provável não é o escuro ser de graça — é a barra de luta.** Com
ganância 0,2 uma criatura lateral enfrentava `0,2 × fightBar`; sem o rótulo
enfrenta a `fightBar` inteira. O avarento aceita brigas laterais que recusava,
mata o guardião, e o baú fica de graça. **Inferência, não medição:** confirmar
contando lutas laterais aceitas antes e depois.

Se for isso, a §10 não devolve nada, porque o que ele entra é sala que ele **já
está vendo**. O que pode devolver é a §1 — cautela alta torna exposição cara e
sala opcional é densa em exposição — mas cautela e ganância são dials
diferentes, então não é automático.

**Fica registrado sem dono.** Quem construir qualquer peça olha este número
primeiro.

---

## Ordem de construção

Onze peças, quatro feitas. A ordem abaixo é por **risco crescente**, e cada
linha diz o que se vê rodando — porque nenhuma delas se julga por um número
sozinho.

| # | peça | como você vê que funcionou | risco |
|---|---|---|---|
| ~~1~~ | ~~**§7** o corte da `sideAppetite`~~ ✅ feito | nada muda — e foi isso que se confirmou, 150 de 150 seeds | nenhum |
| ~~2~~ | ~~**§11** ratear a caminhada~~ ✅ feito | ele deixa de recusar sala de tesouro distante | baixo |
| ~~3~~ | ~~**§1** `bite = 1` e a cautela como taxa de câmbio~~ ✅ feito | cautela alta: desvia de rato | médio — mudou o que "perigo" significa |
| 4 | **§2** calibrar contra um duelo justo | a tabela de seis faixas | nenhum, é medição |
| ~~5~~ | ~~**§3** perseguidor paga metade~~ ✅ feito | ele para de dar a volta para encontrar quem já vem | baixo |
| 6 | **§10** perigo esperado do escuro | ele para de entrar em sala escura como se fosse corredor vazio | médio |
| ~~7~~ | ~~**§5** fronteira na pool~~ ✅ feito (o portão FICOU) | explorar e brigar se misturam em vez de alternar em blocos | **alto** |
| ~~8~~ | ~~**§6** refúgio~~ ✅ feito | dá para ver o herói recuar de propósito | médio |
| ~~9~~ | ~~**§4** previsão de dois turnos~~ ❌ descartada por medição | — | era alta, e não pagava |

**A fila acabou.** O que sobrou não é peça desta proposta e sim um defeito
achado dentro dela — ver abaixo.

## A criatura pagava duas vezes no preço de um baú ✅ consertado

Quando a rota até um baú ATRAVESSA a criatura que o guarda, ela entra na conta
duas vezes: uma no `walk`, porque desde o B26 o tile dela custa o duelo, e
outra no `guardCost`, porque o raio dela cobre o baú. É a mesma luta cobrada
duas vezes.

O efeito é o bot recusar baús que devia pegar e dar voltas que não devia. Não
precisou de medição para se justificar — a conta estava errada.

**A resposta foi a esperada:** se a rota atravessa, o guardião já foi pago, e o
`guardCost` daquela criatura sai. A rota até cada baú ou item é reconstruída
e as criaturas que estão em cima dela ficam de fora da conta de guarda.

Medido, ganância 1, 150 seeds: andares 4,25 → 4,21, baús 13,91 → 13,76,
divergem em **3 das 150**. Quase nada, e isso é informação: o caso em que a
rota mais barata atravessa um guardião é raro — o desvio quase sempre ganha.
Fica porque a conta estava errada, não porque mediu.

**§7 primeiro porque entra provadamente sem mexer em nada** — é o único jeito
de ganhar dois dials legíveis antes de tudo o mais começar a mover números.

**§1 antes de §2, §3, §5, §6 e §10**: ela muda o que "perigo" significa, então
qualquer medição feita antes dela não vale mais.

**§10 ANTES de §5, e este é o risco maior do plano.** O V5 existe porque isso
já deu errado de um jeito medido: o herói entrava na sala com o bicho e depois
fugia da luta que a própria ganância não deixava terminar. Trocar o portão pelo
preço é certo *se* o preço for honesto — o B26 arrumou metade (criatura não é
chão) e a §10 arruma a outra (o escuro não é seguro). Fazer §5 sem §10 é
reintroduzir o defeito com outro nome.

**Cada dial novo precisa de linha em `src/ui/dials.js`**, faixa de seis
entalhes e passagem pelo `dial-overrides.json`. Sem isso não dá para mexer nele
rodando, que é o único jeito de julgar qualquer uma destas.

---

## Aberto: a lista ordena por custo, e valor só entra no portão

**Achado pelo dono, e é real.** Olhe as duas linhas no mesmo arquivo:

```js
criatura:  price = ... + max(0, duelo − PRÊMIO)      ← valor entra
baú:       price = walk/viagem + guarda + abertura    ← valor NÃO entra
```

O prêmio visível de uma criatura é subtraído do preço dela. O valor esperado
de um baú aparece só no **portão** — decide se ele pode competir, e some da
comparação. Então um baú que vale 1,5 hp e uma criatura que não vale nada
disputam **por custo puro**, e o bot pega o mais barato em vez do que mais
compensa.

O caso do dono: um baú ao seu lado antes de um duelo é quase óbvio. Ele não
barateia o duelo — armadura e hp não entram no `duelCost` — mas o torna
sobrevivível, e custo esperado não é sobrevivência. Este repo diz isso no
comentário do `fightMargin`: *um duelo precificado em exatamente tudo que o
herói tem perde cerca de metade das vezes*.

**A correção de uma linha foi tentada e os fios recusaram em uma rodada.**
Subtrair o valor do preço deixa todo baú admitido abaixo de zero, e criatura
não tem termo de valor nenhum (`prize` é zero fora do Butcher) — então
qualquer baú passa na frente de qualquer luta, sempre. O bot aspirou loot e
parou de descer: `nothing gets deep` disparou e mortes de abertura foram de
0,227 a 0,287.

**O que falta para consertar de verdade:** o lado da criatura. Matar rende
`xpEarned`, que vira moeda entre runs, e o bot ignora isso ao escolher alvo.
Enquanto um lado tem valor e o outro não, pôr valor no ranking só troca de
qual viés se sofre.

Ficou do episódio uma correção que vale sozinha: a histerese era
multiplicativa (`atual ≤ melhor × 1,4`) e inverte de sentido com preço
negativo. Virou a mesma coisa escrita como folga sobre `|melhor|` —
aritmética idêntica para positivos, e agora à prova de sinal.

## Descartado, e por quê

Ler antes de reintroduzir.

**Curiosidade como quarto dial** (`custo do escuro = stepCost × (2 −
curiosidade)`). Morreu de uma pergunta do dono: o escuro é aposta cega de
**dois lados** — pode ser uma sala com baú, pode ser um ogro acordado. Isso
mata duas candidatas de uma vez. A coragem é de um lado só: desconta perigo e
não sabe falar de recompensa, então sobre uma aposta ficaria otimista sobre
metade da conta. E a curiosidade não tem pergunta — ela só teria trabalho se o
escuro tivesse um VALOR próprio para preferir, e ele só tem preço. O dono certo
já estava no bot: a ganância é o único dial de dois lados, e ela **já governa a
fronteira** (`frontierOk` compara com `sideBar`). **Se um dia o escuro ganhar
valor esperado** (dá: `chestCount − vistos` × valor médio do baú), a
curiosidade volta a ter uma pergunta de verdade.

> **A condição apareceu.** A sala trancada (`porta-e-chave.md`) é escuro que
> certamente tem algo dentro e cujo tamanho se vê de fora — valor esperado,
> não só preço. O verbete acima continua valendo palavra por palavra: ele diz
> QUANDO a curiosidade volta, e essa hora chegou. Vale também a metade que
> mata a coragem — ela foi recomendada de novo nesta conversa, por quem não
> tinha lido isto, e o argumento dos "dois lados" a derrubou pela segunda vez.

**Bloquear o tile da criatura em vez de precificá-lo** (sumidouro, como o
santuário). Foi implementado e medido: recuo sobe 44%, profundidade e mortes
iguais. Mas quebra o V5 — uma fronteira atrás de um guardião em corredor vira
*inalcançável* em vez de cara, e o bot para de explorar em vez de pagar.

**Rota gulosa de dois turnos** substituindo o Dijkstra. Ver §4.

**A previsão de dois turnos inteira**, e o motivo está na §4: o cerco que ela
existia para evitar acontece em 0,7% dos turnos e a parte evitável por rota é
0,07%.

**`awakeCost` como gatilho do refúgio.** Foi a primeira resposta para "o que
decide fugir" e está errada por dois motivos: não desconta a distância — uma
criatura a oito tiles pesa igual a uma colada — e usa distância em L, não em
passos, então erra sempre para o lado de "está acordada". Um herói fugiria por
causa de três bichos distantes atrás de uma parede.

**Um interruptor de modo** (`pool vazia e aguento o que vem → explora; não
aguento → refugia`). Só fazia sentido porque a fronteira não tinha preço; com
ela na pool, o interruptor some. A pergunta do dono que derrubou isto: "se eu
aguento, por que eu exploraria?"

---

## Fora desta proposta, mesma família

**B27** — a seringa dispara quando o corpo a corpo custa *mais* que uma barra,
que é o mesmo teste que o portão de luta usa para *recusar* essa luta. Em 30 de
84 injeções o portão recusa toda criatura adjacente com a fúria já ligada. A
correção é condição, não limiar — injetar quando a fúria vira uma luta recusada
em aceita — e **apaga o `RAGE_AT`** junto com a escada de ganância que ele
compra. Precisa da decisão do dono.
