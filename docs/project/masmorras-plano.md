# Plano das masmorras (U14) — 2026-11-01

O desenho está em `candidates.md` (U14, "As 8 masmorras"): três eixos
binários — 🐺 Matilha × 🐉 Fera, 📦 Fartura × 💎 Relíquia, ☀️ Claro × 🌑 Breu —
e uma masmorra por combinação, oito ao todo, com nomes do DCSS. Este arquivo
é a ordem de construção. Nada aqui está construído; quando uma etapa for, o
doc que a descreve muda no mesmo commit e a etapa ganha "FEITO".

## Decisões do dono (2026-11-01)

1. **A masmorra troca no clear.** O seletor no Lab (M2) é como se assiste a
   todas sem precisar de um clear — clear é raríssimo.
2. **A masmorra NÃO fica mais difícil, só muda.** Toda masmorra gasta o mesmo
   orçamento de dificuldade, redistribuído. O "degrau igual à recompensa" do
   U14 (cada clear sobe a régua) está fora deste plano.
3. **O inferno diário (frente D) não é a escada.** Ele pode ter uma masmorra
   tirada da seed do dia, ou regras próprias derivadas da seed — decidir na
   frente D. O catálogo da M1 é o que torna a primeira opção barata.

A primeira masmorra é o jogo de hoje ("atual") — calibração e tutorial.

## As etapas

| etapa | o que entrega | dá para verificar como |
|---|---|---|
| **M1** | as 8 masmorras como DADOS: um arquivo de valores (como `heroes.js`), cada uma um conjunto de overrides do modelo nos eixos que já têm dial — criaturas, baús, formato. Desligado = jogo de hoje | teste: cada masmorra gera andares; hash idêntico desligado |
| **M2** | seletor no Lab: atual / Minas / … / Tumba, vale na próxima run | trocar e assistir |
| **M3** | orçamento: teste que obriga cada masmorra a caber na mesma massa de ameaça por andar da "atual", e os valores de desenho ajustados até caber. As de matilha conferidas também pela arena da A1 (`src/analysis/bosses.js`) — bando que chega junto custa ~o dobro da massa | teste + profundidade por masmorra |
| **M4** | nome e ícones na tela ("**Tumba** 🐉💎🌑", tooltip por ícone) | assistir |
| **M5** | eixo Breu: dial de visão por trecho do modelo (hoje a visão é fixa, salvo por herói). Papazito continua vendo o andar inteiro | teste do alcance + assistir Esgoto |
| **M6** | a matilha acorda junta (regra de motor atrás de campo do modelo). Decidir se o bot não ver isso é desenho ou defeito, e escrever em `bot.md` | teste de regra + assistir Minas |
| **M7** | rotação: masmorra atual no save; o clear avança; a tela anuncia a próxima | `?dev=1` forçando um clear |

**Por que esta ordem:** M1 e M2 respondem "é divertido de assistir?" sem
tocar em motor nem em save. Se não for — como as 3 feras
(`decisions.md`, 2026-11-01) — custou pouco. M5 e M6 mexem no motor e vêm
depois de as masmorras feitas só de dials se provarem.

**Colisões:** `dial-overrides.json` e o save (M7) são também da frente B.
M7 espera a B estar no main.

## Em aberto

- **A ordem das masmorras depois de um clear** — fixa (1 → 8) ou sorteada.
- **O que um clear paga**, agora que não há degrau — se paga algo além de
  mudar o contexto.
