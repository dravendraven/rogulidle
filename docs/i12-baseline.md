# I12 — a linha de base pré-M35

**Isto existe contra a regra normal do projeto de não registrar medição.** O
I12 pede explicitamente: a metade de comparação replica as MESMAS seeds depois
do B14, e taxa comparada entre famílias de seed diferentes é comparação mais
fraca. Sem este arquivo o "antes" só existe fazendo checkout de commit antigo,
que é possível e que ninguém faz.

**Não copie estes números para lugar nenhum.** Eles descrevem um commit
específico e envelhecem no instante em que o motor muda — que é o motivo de o
projeto não registrar medição em geral. O que este arquivo persiste de
verdade é **como reproduzir**, não o resultado.

## Como reproduzir, exatamente

```
git worktree add --detach <caminho> 9058559
cd <caminho>
node tools/measure.mjs --selftest          # 8/8 antes de confiar em qualquer número
node tools/measure.mjs clustering descentCheck '{"runs":1000,"firstSeed":3000000}'
```

- **Commit:** `9058559` — pré-M35 (o motor ainda recusa poção com hp cheio) e
  já com o instrumento de poção. O M35 entrou logo depois, em `57d1eff`.
- **Família de seeds:** `3000000` a `3007999`, contígua. `descentCheck` usa
  `firstSeed + i`, então a família inteira é descrita pela base e pelo n — não
  há lista de 8000 números para guardar.
- **n = 8000**, rodado em 8 pedaços de 1000 (`firstSeed` 3000000, 3001000, …,
  3007000) só para paralelizar. O particionamento não afeta resultado: cada
  run é determinística na sua própria seed.
- Custo: ~7 min com 4 processos, ~55 min em série.

## O que a metade de comparação precisa fazer

Mesmo comando, mesma família, no commit de depois do B14. Comparar:

| número | por quê |
|---|---|
| `finishRate` + `finishRateSe` | o headline; z de duas amostras |
| `potionShareDrunk` | o que o M35 deveria mover mais diretamente |
| `potionsRefusedAtFullHp` | pré-M35 é o canal que o M35 apaga; depois é 0 por construção |
| `deathsHoldingPotion` | tripwire: zero estrutural antes, sinal real depois |
| `floorAttempts`, `turnsPerFloor` | **a armadilha do denominador** — runs mais longas movem qualquer taxa sozinhas; diga o que o denominador fez antes de explicar a taxa |

**Os dois efeitos vêm entrelaçados.** M35 (poção nunca se perde) e B14 (o bot
ganha uma decisão que pode errar) mudam juntos. Se `finishes` se mexer, esta
medição não diz qual dos dois moveu — o B15 é que separa, mudando só a
política contra um motor fixo.
