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
- **Nunca começa luta** cujo custo esperado passe de `fightMargin` do hp
  efetivo (hp + armadura). Uma criatura que já persegue paga só a
  caminhada — o duelo dela acontece de qualquer jeito.
- Entre tudo que vale ter — item solto, baú, luta pagável — **pega sempre o
  mais barato em hp**, caminhada e perigo incluídos.
- **Sala lateral é a aposta:** loot guardado e luta opcional laterais são
  ignorados quando o guardião custa mais do que o apetite permite.
- **Explora** a fronteira mais próxima enquanto o escuro ainda pode dever
  algo (as contagens são concedidas — `rules.md` §7); **sai** pelo buraco
  quando nada mais vale.
- **Mantém o objetivo atual** a menos que um novo seja claramente mais
  barato (histerese), para não vacilar entre dois quase-iguais.

## Herói é configuração

`makeBot(options)` aceita `hero`, um override de `DEFAULT_HERO`
(`src/bot/config.js`). Um traço por objetivo:

| traço | objetivo | o que faz |
|---|---|---|
| `fightMargin` | sobreviver | fração do hp efetivo que uma luta pode custar |
| `sideAppetite` | chegar rico | apetite pela aposta das salas laterais (0 = nunca) |
| `stepCost` | poucos passos | quanto vale um passo em hp — mais alto = mais apressado |

Um herói covarde, ganancioso ou apressado é **outro objeto de config, nunca
outro código**. O elenco de heróis ainda não existe de propósito; só o
mecanismo, provado por teste (`test/tests.js`, "the bot's three
objectives").

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
