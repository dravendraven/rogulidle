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

Dez andares. Concluir é atravessar todos, vivo.

**Cada andar é gerado do seed e do plano do andar, e é independente do
herói.** Mapa, criaturas e baús saem de `newGame`; só depois o herói que
desceu sobrescreve os campos dele. O andar 7 é o mesmo andar 7 tenha o herói
chegado lá ou morrido no 2.

**O que desce a escada:** hp, hp máximo, barra de armadura, xp, inventário,
mortes, xp acumulado. **A posição, não** — ela vem sempre da geração do andar
novo.

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

**Poção cura na hora e é desperdiçada com hp cheio** — por isso o motor a
deixa no chão em vez de gastá-la, e o herói pode voltar.

**O herói pode começar com itens** (o que a loja usa). Item que entra assim
credita a barra de armadura pela mesma regra do item pego do chão — uma
função, não duas cópias.

## 6. O turno

**Andar contra parede não passa turno.** Nada acontece, e as criaturas não
agem. Isso torna esbarrão barato em turnos e caro em ações.

**Atacar, abrir baú e pisar no santuário resolvem no lugar** em vez de mover.

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

## 8. Como um andar e uma run terminam

**Pisar no santuário encerra o andar. O motor permite isso a qualquer
momento** — nada obriga a limpar nada.

**A obrigação de limpar é do bot, não do motor.** Hoje: as criaturas da
espinha precisam morrer. A versão antiga exigia tudo. Está no bot de
propósito, para que se possa medir o custo de relaxar.

**Morte quando o hp chega a zero.** Há também limite de turnos, que encerra o
andar sem conclusão.

## 9. Entre runs

**Moeda por andar concluído**, derivada de xp por turno.

**Moeda só é efetivamente ganha se a run for concluída.** Morrer descarta o
acumulado e, por padrão, zera também o saldo guardado e o item comprado.

**A moeda compra item para a run seguinte** — a loja está em construção
(U6e). Enquanto isso os preços são fixos e a compra múltipla é liberada,
sabidamente desequilibrada: ver a decisão registrada no U6e e o M32.

## 10. Onde este jogo se afasta do Rogule

As divergências deliberadas, com o raciocínio e o que foi medido, estão em
`docs/rogule-spec.md §13` e em `docs/project/decisions.md`. As de maior
consequência para desenho estão marcadas acima como "divergência":
regeneração, crescimento de xp e hp, armadura como barra, e arma alargando o
dado.

**Nada em `§13` é lei.** É registro de decisões tomadas com números na mão. Se
uma delas parecer errada, o caminho é medir de novo, não restaurar
fidelidade por fidelidade — este jogo deixou de ser uma cópia no momento em
que passou a jogar sozinho.
