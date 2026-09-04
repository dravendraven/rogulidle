# As regras do Rogulidle

**O que este jogo faz, hoje.** É isto que qualquer agente lê antes de mexer
em comportamento.

Não é a spec do Rogule. Aquela é `docs/rogule-spec.md`, que registra o
original de onde este jogo saiu e onde nos afastamos dele — documento de
procedência, útil para decidir se uma mudança é legítima, inútil para saber o
que o código faz agora.

**Nenhum número mora aqui.** Regra se enuncia por forma, ordem e causa; valor
mora em `src/sim/balance.js` / `difficulty.js`, e a tabela no topo de
`docs/balance.md` é o único lugar onde os valores atuais estão escritos.
Prosa que repete valor apodrece no dia em que o dial muda — foi exatamente
assim que a spec antiga passou a afirmar coisas falsas.

Mudou o comportamento? **Este arquivo muda no mesmo commit.**

---

## 1. A forma de uma run

**Dez andares, dezenove travessias.** A run desce até o fundo e volta. Todo
andar é cruzado duas vezes — exceto o mais fundo, cruzado uma só: o herói
sobe PARA FORA do fundo, não o cruza de novo. **Concluir é completar a
última travessia** — chegar ao fundo é a metade do caminho, e não conclui
nada.

**O retorno é um interruptor, e hoje ele sai DESLIGADO.** Desligado, a run
é só a descida: dez travessias, e concluir é limpar o andar 10. O motor
continua com dezenove por padrão — quem desliga é a página, pedindo
`traversals: LEVELS` — e o interruptor mora no lab («A volta para casa»).
Tudo o que este item descreve abaixo vale quando ele está ligado.

**A regra de pareamento.** A travessia de subida `k` cruza o andar
`2 × andares − k`: a travessia seguinte ao fundo é a segunda passagem pelo
andar 9, e a última (19) é a segunda passagem pelo andar 1.

**Na subida, as portas se invertem.** O herói surge onde o buraco do andar
estava — subiu a escada que tinha descido — e a saída fica onde ele
originalmente entrava. A troca é feita depois da geração, sem consumir
sorteio, então o andar continua idêntico ao gêmeo da descida.
Consequência deliberada: o guardião que vigiava a escada de descida recebe
o herói na chegada da subida.

**Dificuldade é indexada por ANDAR, não por travessia.** Cada andar guarda o
próprio elenco na volta, então a massa *cai* enquanto o herói sobe. O que
torna a volta perigosa não é lotação — é o desenho descrito em
`docs/map-design.md`, que os itens seguintes constroem em cima desta
estrutura.

**Cada andar é gerado do seed e do plano do andar, e é independente do
herói.** Mapa, criaturas e baús saem de `newGame`; só depois o herói que
chegou sobrescreve os campos dele. O andar 7 é o mesmo andar 7 tenha o herói
chegado lá ou morrido no 2.

**Por isso a segunda passagem devolve o mesmo andar de graça:** pedir o mesmo
número de andar de novo reconstrói o mesmo mapa, sem cache e sem segunda
seed. Hoje isso devolve também o mesmo elenco e os mesmos baús — a volta é
estruturalmente idêntica à ida, e é assim de propósito, porque o que a torna
diferente é construído separado para poder ser medido.

**O que atravessa:** hp, hp máximo, barra de armadura, xp, inventário,
mortes, xp acumulado. **A posição, não** — ela vem sempre da geração do
andar novo (na subida, do buraco gerado, pela inversão acima).

## 2. O mapa

Grade quadrada fixa. Salas ligadas por corredores, escavando até uma fração
alvo do mapa.

**Espinha e lateral.** Uma rota obrigatória liga o herói ao buraco; o resto
são salas laterais, opcionais. A divisão é o eixo de desenho do mapa — risco
obrigatório contra risco escolhido.

**Existe um CATÁLOGO de temas de mapa, e ele sai desligado.** Atrás de um
dial (`MAP_THEME`), um andar pode ser desenhado como cripta (salas
regulares e ordenadas), grade (salas 3×3 ligadas às vizinhas, com loops),
caverna (autômato celular, aberto e orgânico), anel, central — ou
"sorteio", um tema por andar tirado do próprio stream do mapa. No zero, os
dials de forma de sempre decidem, que é o jogo enviado. O catálogo existe
para testar identidades no Lab antes de o desenho final ser escolhido.

**Existe um layout de DUAS rotas, e ele sai desligado.** Como um dos temas
do catálogo acima (o «anel»), um andar pode ser gerado assim:
duas rotas disjuntas ligam o herói ao buraco — uma curta e mais densa em
ameaça, uma longa e mais rala — e chegar exige escolher uma. As salas
laterais viram becos pendurados para dentro do anel. Nesses andares o motor
conta em qual rota o herói pisou (`routeVisits`, na linha do andar), o bot
não recebe rótulo nenhum de rota, e herói e buraco são posicionados pelo
próprio layout, a um terço de volta um do outro — não pelo par mais
distante, que apagaria a assimetria. O desenho por trás está em
`docs/map-design.md`.

**Herói e buraco nascem em salas distantes entre si**, e o buraco fica numa
sala distante, não na mais distante possível.

**O buraco nunca fecha uma passagem.** Herói e buraco só nascem em salas
com chão aberto em volta do centro. Na caverna, as "salas" são pátios
abertos achados no meio das veias, e um trecho de veia estreita também
conta como sala — recebe baús e criaturas — mas nunca o herói nem o
buraco. Uma caverna que não rende pátios suficientes é descartada e
sorteada de novo, algumas vezes, antes de o andar ceder ao gerador padrão.

**Profundidade é posicional, não o número do andar.** O quão "fundo" um tile
está é o comprimento do caminho até ele sobre o caminho mais longo do mapa.
Perto da entrada, a profundidade cai a zero em qualquer andar.

**Um andar tem uma sala desenhada, não sorteada.** Num andar fixo do jogo
existe um **vault**: uma sala quadrada de tamanho fixo, maior que qualquer
sala que o gerador produz, com quatro pilares dentro dela. Ela é carimbada
sobre o mapa já pronto, depois que herói e buraco já foram colocados.

Três coisas valem por construção, não por sorteio:

- **Tem uma porta só e é um beco sem saída**, então a rota obrigatória nunca
  passa por dentro dela — é sempre lateral, sempre recusável.
- **A porta dá para a rota obrigatória**, então o herói passa na frente dela.
- **Nada nela é sorteado**, nem onde ela fica: a busca é uma varredura
  determinística. Ela não gasta nenhum número do gerador.

Quando não há rocha virgem para ela, o carimbo **desapropria**: escolhe o
retângulo que engole menos chão andável, nunca um tile da rota obrigatória,
e sela o anel em volta do corpo para continuar beco sem saída. Nos mapas do
gerador padrão a varredura pura sempre acha rocha e a desapropriação nunca
roda; ela existe para os temas densos do catálogo (grade, caverna, anel),
onde o andar 4 estava saindo sem Butcher. Quando nem isso existe — uma rota
comprida o bastante para cruzar todo retângulo possível — a desapropriação
pode cortar a própria rota, desde que herói e buraco continuem ligados por
outro caminho (verificado, e revertido se quebrar); só as duas pontas, onde
eles estão de pé, são invioláveis. Só num mapa sem nada disso o andar fica
sem vault.
O que fica dentro dela está em §3 e §5.

## 3. Criaturas

Onze tipos numa tabela. O índice é o **tier** — força crescente.

### Que tier aparece

O centro do sorteio vem da profundidade posicional escalada pela dificuldade
do andar. O slot sorteado espalha em torno desse centro, e então é
**limitado**:

- **Piso por profundidade** — andar fundo não sorteia bicho trivial.
- **Teto por profundidade** — andar raso não sorteia bicho acima da faixa.
- **Corte extra nos primeiros andares** — desvanece até zero em andar 2.

**Limita-se o slot sorteado, nunca o centro.** O espalhamento alcança além do
centro, então mexer no centro não limita o resultado — erro já cometido e
medido uma vez.

### Como elas aparecem no andar

**Em grupos que compartilham o tipo.** Um grupo é um sorteio com vários
corpos, não vários sorteios.

**Cauda fora de profundidade.** Uma criatura pode raramente vir de acima da
faixa do andar, com chance crescente na profundidade.

**O buraco tem um guardião**, elevado ao teto do andar.

**Todo baú tem criatura por perto**, espinha incluída. Loot não é de graça.

**O vault (§2) tem um ocupante fixo.** Uma criatura só dele, que **não está
na tabela de tiers** — não é sorteada, não escala com o andar, não é
atingida pela cauda fora de profundidade e não é elevada por nada. Fica no
centro da sala, entre os pilares.

Ela é **muita vida contra mordida média**, e isso é o desenho: uma criatura
de mordida alta resolveria o duelo em três turnos e poderia matar um herói
cheio de um golpe. Esta não consegue — o maior golpe possível dela é menor
que o hp cheio do herói — e o duelo dura o bastante para virar dos dois
lados.

**A massa dela não conta como ameaça do andar.** O andar não a exige de
ninguém: quem passa reto não a encontra.

**E ela mora sozinha.** O elenco comum do andar nunca nasce dentro do
vault — nem quando o carimbo desapropriou chão que já era andável (§2).

**Ela fica no fundo da sala, acorda quando o herói entra no corredor, e é a
única criatura rápida do jogo** — age duas vezes por turno, então uma luta
com ela custa cerca do dobro do que a mesma vida e a mesma mordida custariam
numa criatura comum. O raio dela
também é o que cobra os baús: todos ficam dentro dele, então nenhum sai sem
a luta entrar na conta.

**A sala fica no fim de um corredor**, não colada na rota. Isso não esconde
nada — visão atravessa parede — mas encarece *entrar*, que é diferente de
encarecer a criatura: criatura mais pesada o bot simplesmente recusa.

### Como elas se comportam

**Só perseguem.** Nunca fogem, nunca vagam, nunca pegam item.

**Quase todas agem uma vez por turno.** Uma criatura pode ter **velocidade**,
que é quantas ações ela toma por turno do herói — cada ação é um passo *ou*
um golpe, e o dado de hesitar é rolado por ação, não por turno. Nenhuma
criatura da tabela de tiers tem isso; hoje só o ocupante do vault tem.

**São estáticas enquanto o herói estiver mais longe que o raio de ativação
delas.** O raio não correlaciona com força.

**Bloqueiam umas às outras, mas não o herói** — andar sobre o herói é como
atacam.

**Podem perder o turno**, por sorteio. Numa simulação hipotética do bot,
assume-se que nunca perdem.

**Adjacência sozinha não é ataque**, por padrão — o ataque é o movimento.

## 4. Combate

**O golpe vai do atacante ao defensor, sem contra-ataque.** Um duelo,
portanto, alterna estritamente: só quem se moveu bate.

**O dano é um sorteio, e o golpe pode errar.**

**Arma alarga o dado, não soma depois dele.** Cada ponto de `dmg` levanta o
TOPO do dado e vale meio ponto de dano esperado, não um inteiro. **Isto é uma
divergência do original**, que somava depois.

**Uma arma pode também levantar o PISO do dado** (`dmgMin`). Um ponto de piso
vale um ponto inteiro de dano esperado nos golpes que acertam — o dobro de um
ponto de topo, porque levanta toda face do dado em vez de acrescentar uma face
no fim. Sem arma de piso o dado começa em zero: herói bem armado ainda erra
feio. O piso nunca ultrapassa o topo; se chegar lá, o dado vira constante.

**Arma soma o inventário inteiro.** Duas armas somam, os dois lados do dado.

**Armadura é uma segunda barra consumida, nunca redução.** O golpe cai
inteiro; só pode cair na barra. Gasto é gasto. O que o herói aguenta é hp mais
armadura — qualquer coisa que julgue sobrevivência tem que somar as duas.

**Escudo reabastece a barra. O hp máximo nunca se move.**

**Consequência das regras acima, e ela não é óbvia: dano é um evento, não um
aluguel.** Como adjacência sozinha não ataca, o ataque é o movimento, e as
criaturas agem depois do herói, **fugir de um perseguidor de mesma velocidade
não custa nada** — ele cola e nunca acerta. O golpe é pago exatamente quando o
herói deixa de aumentar a distância: atacar, abrir baú, pisar no buraco, ou
estar encurralado.

Isto está escrito porque já foi modelado errado uma vez, como custo por turno
de proximidade, e o erro sobrevive a leitura atenta da fórmula — só não
sobrevive a ler §3 e §6 juntos.

### O que NÃO cresce

**O xp do herói não cresce com as mortes.** Divergência do original, que dava
+1 a cada duas mortes. O mecanismo foi removido, não desligado — o que a
alternativa mediu está em `docs/project/decisions.md`.

**O hp máximo não cresce com as mortes.** Idem: removido, com a medição que
reverteu a adoção registrada em `decisions.md`.

**Não existe regeneração passiva.** Divergência: o original curava com o
tempo, o que dá para acampar.

**Portanto: arma é a única coisa no jogo que deixa o herói permanentemente
mais forte.** Armadura é barra consumida e poção é uso único; xp e hp máximo
não crescem. Nada mais é permanente.

## 5. Itens e de onde vêm

**Criatura dropa arma**, com o tipo limitado pelo tier dela — arma boa não cai
de bicho fraco, e abaixo de um limiar ela é removida do sorteio, não apenas
tornada improvável.

**Baú guarda armadura e poção.**

**O ocupante do vault (§3) larga o machado, sempre — e o carrega à vista.**
É o único drop garantido do jogo — não passa pela chance de largar algo nem
pelo sorteio de qual arma — e a única criatura cujo drop atravessa a névoa
(§7). Ou seja: o que a sala paga é sabido antes de entrar nela, e o que
continua incerto é só se o herói sai vivo com aquilo.

**O vault tem baús próprios, extras aos do andar, e o conteúdo deles é
fixo.** Mesmo pagamento em toda seed, nas mesmas posições. É a única
recompensa do jogo que não é sorteada: quem aposta sabe exatamente o que
está comprando antes de entrar. O que varia é se o herói chega a pegar.

**E o andar do vault não coloca baú nenhum fora dele.** Toda a recompensa
daquele andar está dentro da sala, em volta do ocupante e dentro do alcance
dele — não há nada para raspar sem lutar. Passar reto é seguir para o andar
seguinte sem nada, que é o que faz a sala custar alguma coisa a quem a
recusa.

**Nem todo baú tem algo, e a chance é FIXA.** Metade dos baús guarda alguma
coisa, esteja ele na porta ou no fundo do andar — uma porta só, um
significado só. Antes a chance variava com a posição (10% na entrada, 100%
no ponto mais fundo) e ainda perdia um quarto numa segunda porta escondida
atrás dela, então a taxa real era um produto que ninguém conseguia ler.

**A recompensa da sala lateral passou a ser QUANTIDADE, não qualidade.** O
peso que puxa baús para as laterais é o que faz o desvio pagar; a
profundidade da sala continua escolhendo o tier da criatura, ou seja o
risco. Risco e recompensa seguem rolando separados — em eixos diferentes.

**Poção é carregada, não consumida ao pisar.** Entra no inventário como
qualquer outro item, viaja entre andares, e beber é uma ação à parte (§6).
Não há teto de quantas o herói guarda; a oferta já é limitada pela escassez
do sorteio.

**Beber com hp cheio é permitido e desperdiça a poção.** O motor permite;
decidir não desperdiçar é do bot. É a mesma divisão de sempre — o motor
define o que é possível, a política define o que é sensato.

Isto é **divergência do original**, que consumia no contato. A regra antiga
precisava de um segundo remendo para funcionar: como consumir no contato
desperdiça poção achada com saúde, o motor se recusava a pegá-la com hp
cheio e a deixava no chão. Beber sob comando apaga as duas regras de uma
vez.

**A run começa de mãos vazias.** O herói entra no andar 1 sem nada. Como arma
só cai de criatura (acima), armar-se exige vencer luta desarmado — o ciclo é
consequência das regras, não uma trava escrita à parte.

**Existe um kit inicial, e hoje ele está vazio.** É um valor, não uma
máquina: o motor sempre aplica o kit, e o kit não conter nada é o que faz o
herói começar desarmado.

**O kit é uma vez por run, e isso vem da ordem, não de uma guarda.** Ele é
aplicado antes do que desce a escada (§1), e o que desce sobrescreve o
inventário inteiro. O andar 1 não tem nada descendo e recebe o kit; todo
andar abaixo tem, e fica com o que o herói de fato carrega. Herói não
reganha kit ao descer.

**O herói também pode começar com itens comprados** (o que a loja usa), e
eles **somam ao kit** em vez de substituí-lo — comprar nunca pode deixar o
herói pior do que não comprar. Com o kit vazio isso equivale a "a compra é
tudo que o herói tem", sem regra separada para esse caso. Item que entra
assim credita a barra de armadura pela mesma regra do item pego do chão —
uma função, não duas cópias.

**Existe um item que se lê, e ele não é uma poção maior.** Um herói começa a
descida com ele. Lido, o herói **passa cinco turnos parado** e volta com a
barra de vida cheia; o item some. Não cura na hora e não dá para desistir no
meio — a leitura, uma vez começada, toma os cinco turnos.

O preço não é fixo, e é aí que mora a decisão: como o golpe só é pago quando
o herói deixa de aumentar a distância (§4), ficar parado não custa **nada**
se nada acordado o alcança, e custa cinco golpes de graça se algo alcança.
Saber qual dos dois é o problema de quem lê.

**E existe um item que se injeta.** Outro herói começa com ele. Usado, custa
o turno e então, por alguns turnos, **o TOPO do dado de dano é
multiplicado** — o piso não se mexe, então o que aumenta é a amplitude, não o
mínimo. Multiplica em vez de somar de propósito: um bônus fixo seria enorme
num herói desarmado e irrelevante num equipado, e um fator vale o mesmo nos
dois. Ele continua agindo normalmente enquanto dura; não há nada a esperar.

**Quanto um item vale pode depender de quem o carrega.** O mundo larga
sempre o mesmo item; o que muda é a mão. Um herói pode tirar de uma arma ou
de um escudo mais — ou menos — do que outro tira do mesmo objeto, e isso
vale igual para o que ele acha no chão, o que vem no kit e o que ele compra:
é o mesmo ponto único por onde um item entra no inventário, pela mesma razão
que a armadura é creditada por uma função só.

## 6. O turno

**Andar contra parede não passa turno.** Nada acontece, e as criaturas não
agem. Isso torna esbarrão barato em turnos e caro em ações.

**Pedir uma ação impossível também não passa turno.** Beber sem poção tem a
mesma forma do esbarrão: nada acontece, e as criaturas não agem.

**Atacar, abrir baú, pisar no buraco e beber resolvem no lugar** em vez de
mover.

**Ler é a única ação que custa mais de um turno**, e enquanto ela corre o
herói não escolhe nada: o que for pedido é descartado, o turno passa e as
criaturas agem. Ele volta a decidir quando a leitura acaba — ou não volta,
se morrer no meio.

**O que impede a entrada impede tudo o que viria depois dela.** Criatura viva
e baú fechado barram o tile alvo. Barrado o tile, nada mais que estivesse
nele acontece naquele turno: o herói não pega item solto que esteja embaixo
da criatura, e não encerra o andar por um buraco ocupado. Uma regra só, não
uma lista de exceções — o herói não entrou, então nada do que está lá dentro
o alcança.

**O custo de dois turnos do baú não vem daí.** Ele vem de o conteúdo ser
despejado depois de a foto do tile já ter sido tirada, então o drop nunca
esteve na lista de coleta daquele turno. As duas regras concordam; não são a
mesma.

**Beber custa o turno, e esse custo é a decisão.** Como as criaturas agem
depois do herói, o turno gasto bebendo é um turno em que quem persegue
alcança — e §4 diz o que isso significa: o golpe é pago exatamente quando o
herói deixa de aumentar a distância. Beber sem ninguém atrás custa zero;
beber encurralado custa um golpe. Quem escolhe o momento é o bot.

**As criaturas agem depois do herói.**

**Determinismo é sagrado.** Mesmo seed, mesma run, sempre. Nada de
aleatoriedade fora do gerador do jogo dentro de `src/sim/`, e `step()` é
função pura — sem DOM, sem relógio, sem armazenamento.

## 7. O que o bot pode saber

**Só `Observation` / `Belief`, nunca o estado do jogo.** A névoa é decisão de
desenho.

**Visibilidade é por distância simples, sem linha de visão.** O que foi visto
fica na memória.

**O alcance é do herói, não do jogo.** Existe herói que enxerga mais longe que
outro — até o andar inteiro de uma vez. O que muda é quanto entra na
`Observation`; a névoa continua existindo como mecanismo, e para quem não tem
o traço ela é exatamente a de sempre.

**A regra é do canal, não do leitor.** Um campo que carregue resposta ainda
não revelada já a vazou, mesmo que ninguém o leia — foi por isso que o item
já sorteado de uma criatura saiu do Belief. O que atravessa é lista
explícita por tipo de entidade, não cópia do objeto inteiro.

**A vida de uma criatura nunca atravessa — só o número acima da cabeça.** O
que o bot recebe é o xp, que é a mordida; quanto ela aguenta, não. E isso
vale **em qualquer distância, inclusive encostado nela**: comprometer-se com
uma luta é sempre um palpite, do primeiro ao último golpe.

**Mas o golpe que o próprio herói deu atravessa.** Ele sabe em quem bateu e
quanto tirou — é o braço dele, não resposta escondida da criatura. O Belief
soma isso por criatura, então o palpite inicial vai sendo descontado durante
o duelo e uma luta já começada fica mais barata conforme é ganha. É o que
permite desistir dela no meio sem que a névoa seja aberta.

**Quando o desconto zera e a criatura continua de pé, o palpite foi
refutado** — e a única coisa que o bot pode concluir é que estava lutando
contra algo mais duro que a média da espécie. Ele palpita de novo, do zero.
Não vale supor que sobrou nada: um resto avaliado em zero faria o bot mais
confiante justamente onde ele já se provou errado.

**A lista abre por dois lados, e eles são de naturezas diferentes.**

**Pelo observador: existe herói com direito a essa resposta.** Para um
deles, o item já sorteado de criatura e de baú atravessa — dentro do que ele
já enxerga, sem alcance extra. Não é exceção à regra acima: é a mesma lista
explícita, com uma entrada a mais concedida de propósito a quem foi
desenhado com o traço, e fechada para todos os outros.

**Pela criatura: uma pode anunciar o próprio drop, e uma anuncia.** É
propriedade dela, não do observador: o ocupante do vault (§5) mostra o
machado a quem o enxerga, e só ele. Não é furo na névoa — é revelação
declarada por uma criatura, do mesmo tipo que a velocidade dela ser visível.
Todo o resto do bestiário continua guardando o que carrega.

**Ver longe e saber o conteúdo são eixos separados, e nenhum herói está no
topo dos dois.** Ver longe não é saber o que a coisa guarda, e saber o que
ela guarda não é vê-la de longe.

**Quantas criaturas e quantos baús o andar tem é concedido**, de
propósito — é o que deixa o bot saber quando o escuro não deve mais nada.

**Espinha e lateral NÃO são concedidas.** O bot não recebe em que metade do
mapa (§2) uma criatura ou um baú está — saber que uma sala é opcional é
saber que existe caminho até o buraco sem passar por ela, e isso é a
resposta que a névoa esconde. Ele atravessava no Belief e foi retirado: a
aposta lateral sobrevive porque **já estava precificada duas vezes**. Sala
opcional fica fora da rota, então chegar nela custa mais caminhada e mais
guardião; o rótulo dizia a mesma coisa de novo. Medido nas seis faixas de
ganância, o avarento continua recusando e o esbanjador continua entrando.

O gerador continua construindo o mapa em torno do eixo — mais ameaça na
espinha, baú melhor na lateral. O que mudou é só que o herói responde ao que
aquilo **custa**, não ao que lhe contaram.

## 8. Como uma travessia e uma run terminam

**Pisar no buraco encerra a travessia. O motor permite isso a qualquer
momento** — nada obriga a limpar nada.

**Encerrar a travessia não encerra a run.** O buraco é escada em todas
menos na última; a run só termina em vitória quando a última travessia é
completada (§1). Não existe ramo de "virada" no fundo: a run simplesmente
continua, e é o pareamento que decide qual andar vem a seguir.

**Mas é preciso alcançá-lo.** Santuário ocupado por criatura viva não encerra
andar nenhum: o herói ataca, fica onde está, e o andar segue (§6). Como o
buraco tem guardião por desenho (§3), isso não é canto raro — é o caso
comum de todo andar até o guardião cair.

**Nenhuma morte é exigida por regra de jogo, em nenhum momento.** O motor
nunca obrigou a limpar nada — quem já obrigou foi o bot, e de propósito, para
que se pudesse medir o custo de relaxar. Hoje o bot também não obriga: sai
assim que o buraco estiver alcançável.

Quanto o bot escolhe lutar é decisão dele e vive em `docs/bot.md`, não
aqui — este arquivo descreve o que o jogo permite, e o jogo permite sair
de mãos vazias no primeiro turno.

**Morte quando o hp chega a zero.**

**Toda travessia tem um orçamento de turnos, e estourar encerra a travessia
sem conclusão** — e, como conclusão de run exige todas, encerra a run junto.

O orçamento é **por travessia**, não por run: cada uma recebe a dotação
inteira. A moeda é o **turno**, então ele cobra andar e lutar igualmente —
qualquer coisa que passe turno gasta orçamento.

**Isto deixou de ser guarda de segurança e passou a ser regra de desenho.**
O limite sempre existiu, mas escrito solto no código e largo demais para
morder; agora tem nome e valor declarado, e apertá-lo é mudança de valor. O
propósito é que tempo custe: desviar por uma sala lateral gasta um número
contável no momento em que a decisão é tomada.

**O orçamento aparece na tela como ESTAMINA.** Uma barra de dez marcas na
UI, drenando ao longo da travessia — outra palavra para o mesmo número, não
um recurso separado. **O bot não a lê**: estamina é informação do jogador,
por decisão do dono; o bot continua decidindo sem saber quanto resta.

## 9. Entre runs

**Moeda por travessia concluída**, derivada de xp por turno. Toda travessia
paga, ida e volta.

**O baú da moeda** (2026-08-31): em cada andar, o baú **mais distante da
rota obrigatória** (em passos andados) carrega moedas **além** do que
sorteou — o mundo dos itens é byte-idêntico ao jogo sem moeda. Abrir credita
as moedas e deixa o item no chão como sempre; elas pagam junto com a
travessia, sob a regra de sempre. Qual baú é o da moeda **não cruza o fog**
(só a persona que vê conteúdo sabe), então o bot precifica todo baú pelo
valor esperado — e o apressado, que recusa o baú distante pelo preço, abre
mão da moeda sem saber qual era. É a segunda renda do jogo: a taxa xp÷turno
recompensa descer rápido; o baú distante recompensa explorar. Três formas
anteriores foram medidas e descartadas — moeda no lugar do item (sustain
perdido, wire de mortes disparou), pilha visível em sala lateral e pilha
fora da vista da rota (quem vislumbrava, pegava).

**A moeda é da run, e não sobrevive a ela.** O saldo começa em zero em toda
run, é gasto na loja que fecha aquela run, e o que não for gasto é
descartado. Não há saldo guardado entre runs.

**Andar não concluído não paga, e o que já foi pago não é devolvido.** Morrer
ou estourar o orçamento no meio de uma travessia encerra a run sem pagar
aquela travessia; o que as travessias anteriores pagaram continua no saldo e
vai para a loja do mesmo jeito.

**Morrer perde o que o herói estava carregando.** O item que ele começou a
run segurando — comprado na loja anterior — é perdido junto com a run.
Concluir a run o mantém, e a compra seguinte SOMA ao que já estava guardado:
runs concluídas em sequência acumulam itens iniciais.

**Um herói pode gastar antes de a run acabar.** Existe herói para quem cada
andar concluído já é uma compra: a moeda que aquele andar pagou vira item na
hora, com preço próprio e não o da loja, e o que ele gastou não chega ao fim
da run. Para todos os outros a moeda só é gasta depois, e a regra abaixo é a
única que existe.

**A moeda compra item para a run seguinte.** A loja aparece ao fim de uma
run, oferece um punhado de itens a preço fixo, e **a compra múltipla é
permitida** — o mesmo item mais de uma vez. Item comprado entra como item
inicial da run seguinte, pelo mesmo caminho de §5, e é indistinguível de um
achado em baú.

**A tela fica aberta enquanto o saldo ainda alcança alguma coisa.** Cada
compra desconta o preço, mostra o que sobrou e **reinicia o relógio** — a
janela mede a próxima decisão, não a visita. Ela fecha no «skip», quando o
relógio acaba, ou no instante em que o saldo não paga nem o item mais
barato.

**Ninguém precisa estar assistindo, e por isso a loja compra sozinha.**
Rogulidle joga sozinho: se nada for clicado antes de o tempo da tela acabar,
o saldo é **gasto até o fim seguindo uma ordem de prioridade** — compra-se o
primeiro item da ordem que o saldo ainda alcança, repetidamente, até ele não
pagar nem o mais barato. Antes comprava um item só e descartava o resto, o
que cobrava por não estar olhando: quem assistia tinha compra múltipla, quem
não assistia levava um item.

**A ordem é do jogador**, e vale só para a compra sem clique — quem está
olhando continua comprando no botão. Quem nunca mexe nela recebe a ordem **do
mais caro para o mais barato**, que não é valor escrito em lugar nenhum: é a
tabela de preços lida de trás para frente. Item que a ordem não nomeia entra
no fim dela, então a lista nunca deixa de cobrir a prateleira inteira.

**Cara-primeiro é a ordem que menos infla o herói**, e é por isso que ela é a
padrão: o troco só desce para o barato depois que o caro não cabe mais, então
um saldo vira uma coisa boa e pouco resto em vez de uma pilha do mais barato.
A ordem inversa é oferecida ao jogador de propósito — ela é o outro extremo, e
qual das duas é melhor depende da run.

**A loja deixou de sortear.** Não passa mais pelo rng: para quem nunca
reordenou o mesmo `?seed=` continua reproduzindo a sessão inteira, porque a
ordem padrão é a mesma para todo mundo. Quem reordenou diverge, exatamente
como os dials do lab já fazem divergir.

**A loja vende também um consumível, e ele é o item mais barato dela.** Ele
não some no fim da run: entra na run seguinte como qualquer outra compra, e
só é gasto quando o herói o usa. O preço mínimo da prateleira é o que decide
se um saldo sobra sem comprar nada.

**Um nome guarda um jogo.** Na primeira visita a página pergunta um nome, e é
a única vez que ela para para perguntar alguma coisa: o nome é o endereço do
save, não uma conta — não há senha. Ele é dobrado antes de virar endereço
(sem acentos, sem maiúsculas, um separador só), então duas grafias do mesmo
nome abrem o mesmo jogo. Dois nomes no mesmo navegador são dois jogos
independentes, e trocar de nome não apaga o jogo de ninguém.

**O primeiro nome adota o jogo que ainda não tinha nome** — quem já jogava
antes de o nome existir continua de onde estava. Só o primeiro: o segundo
nome começa limpo.

**O mesmo nome em outro aparelho continua o mesmo jogo, um aparelho por
vez.** Ao entrar, o nome é reservado; quem chegar depois é recusado com um
recado que diz em que tipo de aparelho ele está aberto e há quanto tempo deu
sinal. A reserva tem prazo e se renova sozinha enquanto o jogo roda: fechar a
aba a devolve na hora, e um aparelho que sumiu sem devolver a perde quando o
prazo vence — ninguém fica trancado para fora do próprio jogo.

**Uma aba por navegador, e essa recusa vem antes do nome.** Duas abas do
mesmo navegador dividem o mesmo save: com o serviço no ar a segunda já era
recusada como se fosse outro aparelho, mas sem rede as duas jogariam e
gravariam por cima uma da outra. A segunda aba só oferece recarregar —
dentro do mesmo navegador, fechar a outra é trivial. O navegador libera essa
reserva sozinho quando a aba morre, sem prazo nenhum.

**Quem foi recusado pode assumir na hora.** O prazo resolve sozinho o
aparelho que morreu segurando o nome, mas só depois de correr inteiro, e
quem está diante da tela em geral sabe que o outro está fechado. O botão
toma o nome imediatamente; o aparelho que o tinha para em segundos, no meio
da run se for o caso, e perde o que ainda não tinha gravado — a run
interrompida não conta, não paga e não chega à loja. É por isso que só um botão
faz isso, e nunca acontece sozinho: só quem está olhando sabe que o outro
lado pode ser interrompido.

**O save sobe de tempos em tempos, e ao fechar a aba** — não a cada run. O
navegador continua gravando toda run; o que é espaçado é a subida. A
consequência é honesta e pequena: trocar de aparelho pode custar as últimas
runs.

**Quem perde a reserva para.** Se o nome foi tomado por outro aparelho, a aba
diz isso e encerra ali, em vez de seguir jogando runs que nenhum save vai
guardar.

**Sem servidor, o jogo continua.** Fora do ar ou sem rede, tudo é jogado e
gravado só naquele aparelho, e o cabeçalho marca que nada está
sincronizando. De tempos em tempos a aba tenta de novo sozinha — quando a
rede volta, a marca some e o jogo volta a subir sem ninguém recarregar nada.

**O que foi jogado sem rede só vale se ninguém tiver jogado no lugar.** Se
ao voltar o nome estiver com outro aparelho, ou o save de lá tiver andado,
as runs jogadas sozinhas são descartadas e a aba para pedindo recarregar —
juntar as duas histórias faria uma terceira, que ninguém jogou.

**O que a página lembra, ela lembra entre visitas.** Refresh não começa outra
sessão. O número da run, o histórico dos últimos resultados, o placar e a
cadeia de seeds voltam como estavam — junto com o que já persistia: itens
guardados, recordes, feitos, herói escolhido, ordem da loja e a personalidade
sorteada do bot.

**A sessão é gravada no instante em que a run é contada.** Antes disso a run
não tocou em nada guardado, então uma interrupção no meio dela a faz ser
jogada de novo, idêntica — o par (seed da sessão, número da run) a reproduz.
Depois disso a run está contada e não volta. A loja que vem em seguida grava
o que ela mesma compra, na hora do clique; sair no meio dela custa o resto
das compras e nada além.

**Sessão reproduzível não grava.** Abrir o jogo com um seed pedido é olhar a
sessão de outra pessoa, e olhar não escreve por cima do próprio save.

**Recomeçar apaga a sessão junto** — histórico, contagem e cadeia de seeds —
e abandona a run em curso, que por isso não conta.

**Os preços são fixos e não escalam com nada** — nem com a profundidade
alcançada, nem com o que já foi comprado antes. O que cada item custa está em
`src/ui/shop.js`; o que cada compra vale em jogo está medido em
`docs/project/decisions.md`, não aqui.

## 10. Onde este jogo se afasta do Rogule

As divergências deliberadas, com o raciocínio e o que foi medido, estão em
`docs/rogule-spec.md §13` e em `docs/project/decisions.md`. As de maior
consequência para desenho estão marcadas acima como "divergência":
regeneração, crescimento de xp e hp, armadura como barra, arma alargando o
dado, e poção carregada em vez de consumida no contato.

**Nada em `§13` é lei.** É registro de decisões tomadas com números na mão. Se
uma delas parecer errada, o caminho é medir de novo, não restaurar
fidelidade por fidelidade — este jogo deixou de ser uma cópia no momento em
que passou a jogar sozinho.
