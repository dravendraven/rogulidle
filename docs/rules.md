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

**Dez andares, vinte travessias.** A run desce até o fundo e volta. Todo
andar é cruzado exatamente duas vezes, e **concluir é completar a última
travessia** — chegar ao fundo é a metade do caminho, e não conclui nada.

**A regra de pareamento.** A travessia de subida cruza o andar espelhado:
a travessia seguinte ao fundo é a segunda passagem pelo andar mais fundo, e a
última travessia é a segunda passagem pelo andar 1.

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
mortes, xp acumulado. **A posição, não** — ela vem sempre da geração do andar
novo, e vale igual na subida.

## 2. O mapa

Grade quadrada fixa. Salas ligadas por corredores, escavando até uma fração
alvo do mapa.

**Espinha e lateral.** Uma rota obrigatória liga o herói ao santuário; o resto
são salas laterais, opcionais. A divisão é o eixo de desenho do mapa — risco
obrigatório contra risco escolhido.

**Herói e santuário nascem em salas distantes entre si**, e o santuário fica
numa sala distante, não na mais distante possível.

**Profundidade é posicional, não o número do andar.** O quão "fundo" um tile
está é o comprimento do caminho até ele sobre o caminho mais longo do mapa.
Perto da entrada, a profundidade cai a zero em qualquer andar.

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

**O santuário tem um guardião**, elevado ao teto do andar.

**Todo baú tem criatura por perto**, espinha incluída. Loot não é de graça.

### Como elas se comportam

**Só perseguem.** Nunca fogem, nunca vagam, nunca pegam item.

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

**Arma alarga o dado, não soma depois dele.** Consequência: o piso continua
em zero — herói bem armado ainda erra feio — e cada ponto de arma vale meio
ponto de dano esperado, não um inteiro. **Isto é uma divergência do original**,
que somava depois.

**Arma soma o inventário inteiro.** Duas armas somam.

**Armadura é uma segunda barra consumida, nunca redução.** O golpe cai
inteiro; só pode cair na barra. Gasto é gasto. O que o herói aguenta é hp mais
armadura — qualquer coisa que julgue sobrevivência tem que somar as duas.

**Escudo reabastece a barra. O hp máximo nunca se move.**

**Consequência das regras acima, e ela não é óbvia: dano é um evento, não um
aluguel.** Como adjacência sozinha não ataca, o ataque é o movimento, e as
criaturas agem depois do herói, **fugir de um perseguidor de mesma velocidade
não custa nada** — ele cola e nunca acerta. O golpe é pago exatamente quando o
herói deixa de aumentar a distância: atacar, abrir baú, pisar no santuário, ou
estar encurralado.

Isto está escrito porque já foi modelado errado uma vez, como custo por turno
de proximidade, e o erro sobrevive a leitura atenta da fórmula — só não
sobrevive a ler §3 e §6 juntos.

### O que NÃO cresce

**O xp do herói não cresce com as mortes.** Divergência do original, que dava
+1 a cada duas mortes.

**O hp máximo não cresce com as mortes.** Mecanismo existe, desligado.

**Não existe regeneração passiva.** Divergência: o original curava com o
tempo, o que dá para acampar.

**Portanto: arma é a única coisa no jogo que deixa o herói permanentemente
mais forte.** Essa frase carrega mais peso de desenho que qualquer outra
aqui — é por isso que de onde a arma vem é uma decisão de balanço, não de
sabor.

## 5. Itens e de onde vêm

**Criatura dropa arma**, com o tipo limitado pelo tier dela — arma boa não cai
de bicho fraco, e abaixo de um limiar ela é removida do sorteio, não apenas
tornada improvável.

**Baú guarda armadura e poção.**

**Nem todo baú tem algo.** A chance varia com a posição no mapa, e a
profundidade compra qualidade melhor, não só mais quantidade.

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

**A run começa de mãos vazias.** O herói entra no andar 1 sem nada, e a
abertura é difícil de propósito. Como arma só cai de criatura, o único jeito
de se armar é vencer luta — que é exatamente o que um herói desarmado faz
mal. Esse travamento é real e está aceito: é o preço de uma abertura que
filtra.

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

## 6. O turno

**Andar contra parede não passa turno.** Nada acontece, e as criaturas não
agem. Isso torna esbarrão barato em turnos e caro em ações.

**Pedir uma ação impossível também não passa turno.** Beber sem poção tem a
mesma forma do esbarrão: nada acontece, e as criaturas não agem.

**Atacar, abrir baú, pisar no santuário e beber resolvem no lugar** em vez de
mover.

**O que impede a entrada impede tudo o que viria depois dela.** Criatura viva
e baú fechado barram o tile alvo. Barrado o tile, nada mais que estivesse
nele acontece naquele turno: o herói não pega item solto que esteja embaixo
da criatura, e não encerra o andar por um santuário ocupado. Uma regra só, não
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

**A regra é do canal, não do leitor.** Um campo que carregue resposta ainda
não revelada já a vazou, mesmo que ninguém o leia — foi por isso que o item
já sorteado de uma criatura saiu do Belief. O que atravessa é lista
explícita por tipo de entidade, não cópia do objeto inteiro.

**Quantas criaturas o andar tem é concedido**, de propósito.

## 8. Como uma travessia e uma run terminam

**Pisar no santuário encerra a travessia. O motor permite isso a qualquer
momento** — nada obriga a limpar nada.

**Encerrar a travessia não encerra a run.** O santuário é escada em todas
menos na última; a run só termina em vitória quando a última travessia é
completada (§1). Não existe ramo de "virada" no fundo: a run simplesmente
continua, e é o pareamento que decide qual andar vem a seguir.

**Mas é preciso alcançá-lo.** Santuário ocupado por criatura viva não encerra
andar nenhum: o herói ataca, fica onde está, e o andar segue (§6). Como o
santuário tem guardião por desenho (§3), isso não é canto raro — é o caso
comum de todo andar até o guardião cair.

**Nenhuma morte é exigida por regra de jogo, em nenhum momento.** O motor
nunca obrigou a limpar nada — quem já obrigou foi o bot, e de propósito, para
que se pudesse medir o custo de relaxar. Hoje o bot também não obriga: sai
assim que o santuário estiver alcançável.

Quanto o bot escolhe lutar é decisão dele e vive em
`docs/bot-strategy.md`, não aqui — este arquivo descreve o que o jogo
permite, e o jogo permite sair de mãos vazias no primeiro turno.

**Morte quando o hp chega a zero.** Há também limite de turnos, que encerra a
travessia sem conclusão — e, como conclusão de run exige todas, encerra a run
junto.

## 9. Entre runs

**Moeda por travessia concluída**, derivada de xp por turno. Toda travessia
paga, ida e volta.

**Moeda só é efetivamente ganha se a run for concluída** — e concluir agora é
completar as vinte travessias, não chegar ao fundo (§1). Morrer descarta o
acumulado e, por padrão, zera também o saldo guardado e o item comprado.

**Guardar o saldo através de uma morte é um flag, desligado por padrão**
(`PERSIST_BALANCE_ACROSS_DEATH`, `src/ui/wallet.js`). Existe para que a regra
alternativa possa ser medida contra a padrão, não porque esteja indeciso.

**A moeda compra item para a run seguinte.** A loja aparece ao fim de uma
run, oferece um punhado de itens a preço fixo, e **a compra múltipla é
permitida** — o mesmo item mais de uma vez. Item comprado entra como item
inicial da run seguinte, pelo mesmo caminho de §5, e é indistinguível de um
achado em baú.

**Ninguém precisa estar assistindo, e por isso a loja compra sozinha.**
Rogulidle joga sozinho: se nada for clicado antes do tempo da tela acabar, a
compra padrão é sorteada **entre o que o saldo alcança, com peso proporcional
ao preço**. Não é o mais barato — isso faria toda run comprar escudo para
sempre. O sorteio passa pelo rng do projeto e deriva do seed da sessão, então
o mesmo `?seed=` reproduz também a loja.

**A economia de itens da loja está sabidamente desequilibrada, e isso é
deliberado.** Preço fixo com compra múltipla torna o escudo a compra racional
e a segunda arma um mau negócio — armadura é linear e sem teto, arma tem
retorno decrescente por ponto. Aceito por ora; o conserto é estrutural e está
no M32, não numa mudança de preço.

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
