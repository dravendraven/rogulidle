# Estratégia do bot

**Este arquivo descreve o que o bot faz hoje, não as regras que alguém achou
que ele deveria seguir.** A versão anterior era o oposto — foi escrita antes
do bot existir, organizada em torno de três regras desenhadas à mão, e o
código já a tinha contrariado: a "Regra 1 — recursos antes de combate" deixou
de valer quando o B11 fez a luta competir com o loot.

Sempre que o bot muda, **este arquivo muda**. Se ele descreve algo que o
código não faz, o código está certo e o arquivo está velho.

**O que falhou não mora aqui.** Toda tentativa medida-e-rejeitada vive em
`docs/project/decisions.md`, junto com o resto do que o projeto aprendeu.
Este arquivo não repete essa lista: duas cópias divergem, e o histórico do
git já guarda o registro completo de cada item.

---

## 1. Os objetivos

Estas são as únicas regras de verdade. Todo o resto é o bot tentando
cumpri-las.

**#1 — concluir a run: atravessar os dez andares, vivo.** Requisito mínimo.

**#2 — acumular moeda.** A moeda deriva de xp por turno, acumula andar a
andar, e serve para comprar na loja.

### Os dois não competem, e isso é estrutural

**Moeda só é efetivamente ganha se a run for concluída.** Morrer descarta o
acumulado da run em andamento e, pela regra padrão, zera também o saldo
guardado e o item comprado. O placar de vida inteira é pago apenas numa
conclusão completa, pela mesma lógica.

Consequência: **um bot que arrisca a run por moeda está fazendo uma troca
estritamente ruim.** O #1 não é um rival do #2 — é a condição para ele
existir. Qualquer comportamento que ganhe moeda ao custo de profundidade está
errado pelos dois objetivos ao mesmo tempo, não fazendo um trade-off entre
eles.

Isso é o que torna o modo de falha do B9 ("um bot que caça luta por loot é um
bot que morre por loot") uma preocupação legítima e não um preciosismo.

### Por que não há um terceiro objetivo

Ser interessante de assistir é o produto, mas não é algo que o bot possa
maximizar — "seja interessante" não é uma função de custo. Isso fica a cargo
do design do mapa; um bot competente já é naturalmente assistível, mesmo
quando faz bobagem.

### O #2 ainda não é perseguido — ver §5

O bot não tem **nenhum termo de moeda** hoje. Ele otimiza custo em hp. O #2 é
um objetivo do produto que o bot ainda ignora, e isso está registrado como
lacuna aberta em vez de descrito como se já funcionasse.

---

## 2. O que o bot sabe

**Só `Observation` / `Belief`, nunca `GameState`.** Regra dura do
`CLAUDE.md`, e é de canal: um campo que carregue resposta ainda não revelada
já violou a regra, mesmo que ninguém o leia. Foi por isso que o `drop` já
sorteado de uma criatura foi removido do Belief (M28).

**Névoa de guerra.** Ele enxerga por raio de visão simples, sem raycasting, e
lembra do que viu. Tile nunca visto é tratado como **andável** — otimismo
deliberado, que tem um custo real descrito em §5.

**Quantas criaturas o andar tem.** Concedido de propósito
(`BOT_KNOWS_MONSTER_COUNT`): sem isso ele não consegue formular "vale a pena
o desvio dado o que ainda vem".

**Que equipamento persiste entre andares.** Por isso ele precifica loot
contra os andares que **ainda faltam**, não contra o atual — `horizon` e
`monstersAhead` descontam o futuro pela chance de chegar lá. Um andar jogado
isolado genuinamente não tem futuro, e nesse caso o desconto é zero.

---

## 3. Como ele decide um turno

Tudo numa moeda só: **hp**. É o que permite comparar "andar até ali" com "ter
esta luta" sem inventar taxa de conversão.

### 3.1 Precificar o tabuleiro

`dangerField` monta o preço de ameaça por tile. Um Dijkstra sobre isso —
custo de passo mais preço de perigo — dá o custo em hp de alcançar cada tile.
Esse campo alimenta toda escolha abaixo.

**O santuário é sumidouro nesse campo: entra-se, não se sai.** Desde o B16 o
tile do santuário recebe custo e rota como qualquer outro, mas o campo não se
expande a partir dele — então nenhuma rota o atravessa, e o que estiver
apenas do outro lado dele fica sem custo nenhum, ou seja, inalcançável.

Não é preço, é a estrutura do grafo ficando honesta. Pisar ali encerra o
andar (`rules.md` §8), então "a rota segue além do santuário" não é um
caminho caro, é um caminho que não existe — e preço nenhum diz isso, em peso
nenhum. Antes disso o roteador não enxergava a porta: `believedWalkable`
decide passabilidade pelo TIPO do tile, e santuário não é tipo, é entidade em
`belief.shrine`. O bot atravessava para pegar loot do outro lado e encerrava
o andar sem querer, em 27% de todos os andares completados.

**Só o campo do próprio bot.** O alcance das criaturas (`threat.js`) não
muda: o santuário para o herói, não os lobos. E o campo que a camada tática
monta *a partir do objetivo* também não, de propósito — ele mede distância
até o objetivo, e um caminho que TERMINA no santuário nunca o cruza.

### 3.2 Escolher o objetivo

Uma comparação, não uma cadeia de prioridades. `chooseGoal`:

**Coisas que valem ter.** Loot visível, precificado por `valueByItemName` —
que calcula **valor marginal**: quanto o resto da campanha fica mais barato
com o item, contra o inventário que o herói já tem. E, desde o B11, **uma
luta que vale começar entra na mesma lista**, com um `net` na mesma moeda.
Loot que não paga a própria caminhada pontua negativo e é ignorado.

**O que ordena a lista mudou no B22.** O `net` deixou de ser a ordenação e
virou o último desempate. Cada candidato é planejado inteiro — ir, resolver,
sair — e comparado por **dominância**: A vence B quando o piso de hp efetivo
ao longo do plano é pelo menos o de B *e* o estado na saída (hp, dano de arma)
também é. Preferem-se os não-dominados; empate se resolve pelo piso, e só
então pelo `net`. Sem taxa de câmbio entre os eixos, porque não é preciso uma:
sobreviver melhor e sair mais rico é melhor sem nenhum coeficiente.

Junto veio uma **deleção**: o horizonte virou o andar. O `campaignCost` não
precifica mais equipamento contra o resto da run — o estado na saída carrega o
valor de uma arma, e nada o projeta para a frente.

Uma propriedade que decorre disso e surpreende: a dominância é **invariante ao
hp do herói**. Somar hp soma o mesmo a todo candidato, então a ordenação a hp
baixo e a hp alto é idêntica. Quem depende do hp é o veto do §3.3, não o
ranking.

**Está ligado por decisão do dono, para ser assistido, e não porque mediu
melhor** — mediu pior. Os números que o matariam estão no comentário do flag
`lowWaterVeto` em `src/bot/bot.js`, que é onde eles pertencem.

**O andar é fases, e o raio de ativação é a fronteira (B23).** Antes de
ordenar, a lista é particionada. O `dangerField` precifica ameaça como campo
que decai com a distância — a forma certa para uma criatura que já persegue, e
a errada para uma que dorme, porque a `rules.md` §3 diz que ela está imóvel até
o herói entrar no raio dela. Cruzar aquele raio é **evento**, não custo
gradual, e nenhum preço contínuo diz "nada, e então um duelo inteiro".

Então o bot calcula a **região livre**: os tiles alcançáveis sem acordar nada
que ainda dorme. A pergunta do turno vira duas, nesta ordem — *sobrou algo que
valha a pena aqui dentro?* e só depois *qual raio cruzar em seguida*.
Criaturas já acordadas não delimitam a região, porque perseguem o herói faça
ele o que fizer, e por isso entram na primeira pergunta mesmo com `net`
negativo: o duelo de um perseguidor não é custo de escolhê-lo.

É partição da ORDEM, nunca do conjunto. Quando nada que vale a pena está
livre, todos os candidatos voltam a competir — senão um andar cujo loot todo
mora dentro de algum raio deixaria o bot sem nada além da porta.

Isto recuperou a maior parte do que o B22 custou, e os números estão no
comentário do flag `activationPhases`.

**O santuário, na mesma lista, valendo zero.** Desde o B12 sair não é uma
etapa abaixo da comparação — é um candidato *dentro* dela, com `net` 0,
entrando depois do filtro `net > 0` em vez de através dele.

Isso torna explícita uma comparação que sempre esteve implícita: aquele filtro
sempre significou "este objetivo se paga", e aquilo contra o que ele se paga é
**ir embora**. Quando nada supera zero, o melhor candidato restante é a porta.

**Zero, e não `−distância até lá`, de propósito.** Todo andar termina naquele
tile, então a caminhada até ele é custo fixo do andar, não custo marginal de
*escolher* sair. Cobrá-la faria o bot demorar mais justamente nos andares cuja
saída é mais distante — ao contrário.

**A luta mais barata.** Só quando o santuário não está alcançável de jeito
nenhum — e aí lutar ou explorar é tudo o que existe. Antes do B12 esta etapa
disparava sempre que houvesse qualquer criatura conhecida, o que era a última
obrigação estrutural de lutar.

O que sobrou de `requireClear` não guarda a saída: só filtra quais criaturas de
sala lateral entram na comparação — oportunidade, não obrigação.

**Fronteira.** Explorar, como último recurso.

**Histerese unificada.** Um único teste de teimosia, indexado pelo tipo do
objetivo atual — o B11 juntou os dois que existiam antes. Objetivo de
fronteira é especialmente teimoso: dezenas ficam à mesma distância, e
reescolher a cada passo faria o bot trocar de alvo para sempre sem chegar a
nenhum.

### 3.3 Decidir se a luta é sobrevivível

`worthStarting` é um filtro duro, aplicado **antes** de a criatura entrar em
qualquer comparação. `duelCost` estima o hp perdido num duelo; a margem de
segurança é um dial. Isto não é ranking — é veto. O B11 mudou como uma luta
se ordena contra loot, e deliberadamente não afrouxou quando ela é segura.

**Desde o B21 há um segundo veto, e ele olha o plano inteiro.** `worthStarting`
julga um duelo; o veto do piso julga a trajetória — ir, resolver, sair — e
descarta qualquer candidato cujo mínimo de hp efetivo caia abaixo da folga que
o gate do duelo já deixa. Continua sendo filtro, nunca reordenação: entre os
sobreviventes a ordem do §3.2 vale intacta.

A saída é isenta por construção. Se até sair fura o piso, recusar não ajuda —
o herói está em apuros de qualquer jeito, e deletar a porta jogaria o bot na
etapa da luta mais barata, que é o oposto do que um veto de sobrevivência
serve para fazer.

### 3.4 Simular, não adivinhar

O movimento das criaturas é determinístico, então "onde estará o lobo em três
turnos" só tem resposta em relação ao que o bot fizer. Por isso a camada
tática é **busca sobre as próprias jogadas do bot**, rodando o motor de
verdade sobre um mundo hipotético — não previsão seguida de rota.

Ela funciona como **veto, não como escolha**. Pontuada livremente, a busca
anda em círculos: um passo custa uma fração mínima do que custa levar um
golpe, então recuar sempre pontua melhor que avançar e a run nunca termina.
Ela só derruba o passo planejado se o superar por uma margem, e há uma
penalidade explícita para desfazer o passo anterior.

Profundidade um. Mais fundo é pior, não melhor — está medido em
`decisions.md`.

### 3.5 Deixar vir até você

Quando algo está caçando, o bot pode escolher um tile e **se comprometer com
ele uma vez**, em vez de recalcular todo turno. Recalcular era exatamente
como o vaivém nascia.

---

## 4. Como as coisas são precificadas

| pergunta | quem responde |
|---|---|
| quanto custa o resto da campanha | `campaignCost` |
| quanto custa um duelo | `duelCost` |
| a luta é sobrevivível | `worthStarting` |
| quanto vale este item, para **este** herói | `valueByItemName` (delta marginal) |
| quanto vale um baú fechado | `expectedChestValue` |
| o que esta criatura provavelmente carrega | `expectedMonsterDropValue` (B9) |

**Arma é precificada marginalmente, armadura e poção por valor de face — e
isso está certo.** Armadura *é* hp efetivo, linear e sem teto, então três de
armadura valem três, sempre. Arma passa por turnos-para-matar, que é
recíproco do dano, então cada ponto vale menos que o anterior. Qualquer
redesenho da curva de arma precisa preservar esse cálculo marginal.

**Poção entrou no mesmo grupo de armadura desde o B14.** Antes do M35 beber
era no contato e uma poção pega com hp cheio era perdida, então o valor era
limitado pelo hp que faltava. Agora carregar é de graça e beber é ação
própria que o bot escolhe — uma poção nunca é desperdiçada por ficar
guardada, só vale menos se a run acabar antes de ser usada, e é esse
desconto que `LOOT_CAMPAIGN_HORIZON` já cobre, sem um segundo dial.

O custo do turno de beber **não** entra aqui: é pago na decisão de beber, não
na aquisição — `rules.md` §6, dano é evento e quem escolhe o turno é o bot.
A política que decide QUANDO beber está na próxima seção, e ela ainda não lê
o campo de perigo para pesar esse custo.

---

## 5. O que ele ainda não faz

Lacunas conhecidas, declaradas aqui para não serem redescobertas.

**Não persegue o objetivo #2.** Nenhum termo de moeda existe no bot. Já há
recomendação registrada de como adicionar direito — delta real de
`campaignCost` com o equipamento comprado na run seguinte, **não** a fórmula
da moeda, que existe para diagnóstico e não como preço de decisão. Ver as
notas do U6e em `docs/backlog.md`.

**Beber ignora perigo.** A política de hoje (B14) é deliberadamente burra:
bebe sempre que o hp que falta cobre a cura, sem olhar se há perseguidor —
ele bebe do lado de um lobo. Existe de propósito, para o M35 ter um número a
melhorar; B15 é quem lê o campo de perigo antes de decidir o turno.

**Roteamento é o resíduo inteiro do vaivém.** Com a penalidade de reversão no
lugar, as camadas de veto e de objetivo praticamente zeraram; o que sobra é
roteamento. Duas tentativas já falharam por motivos entendidos, ambos em
`decisions.md`.

**Tile nunca visto conta como andável.** É otimismo deliberado, e cobra: uma
rota mirada no escuro pode acabar em rocha, o esbarrão gasta uma ação sem
gastar um turno, e o replanejamento é outra chance de inverter. A pista
aberta é o esbarrão, não a escolha de rota.

**Vários flags embarcados não passaram por 2σ formal.** `priceDrops` e
`combatCompetes` foram medidos em duas famílias de seed concordantes, sem
barra formal — sinalizado, não afirmado.

**`finishes` está em zero, então guardas que o leem são decorativas.** Duas
regras de segurança consecutivas foram escritas como "pare se `finishes`
cair", com `finishes` lendo zero em todos os braços. Ver M33.

---

## 6. Os flags desligados

Estão no código, desligados, com o número que os matou no comentário — de
propósito, para que a medição viaje junto e ninguém os religue por intuição.
São: procurar corredor, precificação por exposição, e as três tentativas de
dar valor à exploração.

O raciocínio de cada um está em `docs/project/decisions.md`. **Leia lá antes
de ligar qualquer um** — todos parecem boas ideias, e é exatamente por isso
que foram construídos.
