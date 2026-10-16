# O juiz dos bichos

Relatório de `sim/juiz_bichos.js` (o motor fica em `prototipo3d/js/juiz.js`): 45 bichos com esqueleto, 309 mil triângulos no total. Nota média: **94**.

| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |
|---|---|---|---|---|---|---|
| anta | **86** | 93 | 70 | 84 | 96 | 7540 |
| tamanduá-bandeira | **87** | 94 | 84 | 82 | 88 | 5664 |
| boi | **88** | 82 | 94 | 75 | 100 | 13876 |
| bezerro | **88** | 91 | 100 | 70 | 89 | 12884 |
| capivara | **91** | 100 | 88 | 76 | 100 | 7060 |
| onça-pintada | **91** | 93 | 100 | 81 | 91 | 7988 |
| ovelha | **94** | 86 | 88 | 100 | 100 | 6120 |
| garça-moura | **96** | 100 | 100 | 100 | 86 | 3390 |
| lobo-guará | **98** | 100 | 100 | 93 | 100 | 7028 |
| garça-branca | **100** | 100 | 100 | 100 | 100 | 3380 |
| seriema | **100** | 100 | 100 | 100 | 100 | 3452 |
| galinha | **100** | 100 | 100 | 100 | 100 | 3652 |
| ema | **100** | 100 | 100 | 100 | 100 | 3364 |

## anta (86)

Medidas: cern 1.09 · comp 1.86 · peito 0.64 · cab 0.56 · jF 134.8 · jH 125 · fora 0 · focinho 0.06 · vincoPastar 22 · vel 0.57 · deslize 0.27 · afunda 0.1 · apoio 0.64 · passo 0.98 · balanco 5.2 · joelhoAndando 165.6 · flutua 2.6 · ordem 1 · froude 0.42

Tempo: graze 44% · idle 14% · walk 39% · swim 3%

- **pose** (−18): perna da frente dobrada parado: carpo a 134.8° (reta: 162–180°)
- **movimento** (−16): casco patina no apoio: 0.27 m/s (pisada firme: < 0,1 m/s)
- **pose** (−9): pastando, a pele dobra/estica demais em 22 triângulos (perna2 22)
- **forma** (−7): altura do dorso 1.09m (o bicho de verdade: 0.75–1.08m)
- **comportamento** (−4): andando 39% do tempo (o bicho de verdade: 5–35%)
- **pose** (−3): jarrete a 125° (perna boa: 130–166°)

## tamanduá-bandeira (87)

Medidas: cern 0.69 · comp 1.38 · peito 0.6 · cab 0.39 · jF 176.4 · jH 170.9 · fora 2.6 · vel 0.43 · deslize 0.42 · afunda 0.1 · apoio 0.64 · passo 0.96 · balanco 3.9 · joelhoAndando 175.7 · flutua 3.6 · ordem 1 · froude 0.4

Tempo: graze 24% · idle 1% · walk 75%

- **movimento** (−18): casco patina no apoio: 0.42 m/s (pisada firme: < 0,1 m/s)
- **pose** (−13): perna sai do tronco: 2.6 cm para fora da silhueta (parado)
- **comportamento** (−8): andando 75% do tempo (o bicho de verdade: 15–55%)
- **forma** (−6): peito/altura 0.6 (o bicho de verdade: 0.6–0.85)
- **comportamento** (−4): parado 1% do tempo (o bicho de verdade: 5–40%)
- **pose** (−3): jarrete a 170.9° (perna boa: 120–166°)

## boi (88)

Medidas: cern 1.43 · comp 1.78 · peito 0.67 · cab 0.47 · jF 176.3 · jH 152.6 · fora 0.3 · focinho 0.07 · vincoPastar 14 · vel 0.84 · deslize 0.54 · afunda 0.2 · apoio 0.64 · passo 1.05 · balanco 6.6 · joelhoAndando 175.3 · flutua 4.6 · ordem 1 · froude 0.42

Tempo: graze 60% · idle 12% · walk 28% · drink 1%

- **movimento** (−18): casco patina no apoio: 0.54 m/s (pisada firme: < 0,1 m/s)
- **forma** (−11): peito/altura 0.67 (o bicho de verdade: 0.48–0.6)
- **movimento** (−7): no apoio o casco fica 4.6 cm acima do chão
- **forma** (−7): comprimento do corpo 1.78m (o bicho de verdade: 1.4–1.75m)
- **pose** (−6): pastando, a pele dobra/estica demais em 14 triângulos (pescoco 14)

## bezerro (88)

Medidas: cern 0.85 · comp 1.05 · peito 0.61 · cab 0.28 · jF 171.7 · jH 149.4 · fora 0.2 · vel 0.88 · deslize 0.78 · afunda 0.1 · apoio 0.64 · passo 1.22 · balanco 4 · joelhoAndando 175.1 · flutua 12.3 · ordem 1 · froude 0.41

Tempo: graze 69% · idle 9% · walk 22%

- **movimento** (−18): casco patina no apoio: 0.78 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−12): no apoio o casco fica 12.3 cm acima do chão
- **forma** (−9): peito/altura 0.61 (o bicho de verdade: 0.42–0.58)
- **comportamento** (−6): parado 9% do tempo (o bicho de verdade: 20–60%)
- **comportamento** (−5): pastando/ciscando 69% do tempo (o bicho de verdade: 20–60%)

## capivara (91)

Medidas: cern 0.64 · comp 1.17 · peito 0.68 · cab 0.44 · jF 176.3 · jH 148.8 · fora 0 · focinho 0.07 · vincoPastar 39 · vel 0.48 · deslize 0.28 · afunda 0.1 · apoio 0.64 · passo 1.23 · balanco 4.5 · joelhoAndando 170.1 · flutua 4.9 · ordem 1 · froude 0.41

Tempo: graze 36% · idle 17% · walk 20% · drink 3% · swim 22% · flee 2%

- **movimento** (−17): casco patina no apoio: 0.28 m/s (pisada firme: < 0,1 m/s)
- **pose** (−12): pastando, a pele dobra/estica demais em 39 triângulos (pescoco 27, perna0 10)
- **movimento** (−7): no apoio o casco fica 4.9 cm acima do chão

## onça-pintada (91)

Medidas: cern 0.73 · comp 1.35 · peito 0.63 · cab 0.38 · jF 165.3 · jH 140 · fora 0 · vel 0.9 · deslize 0.18 · afunda 0.1 · apoio 0.64 · passo 1.38 · balanco 3.5 · joelhoAndando 176.1 · flutua 5.8 · ordem 1 · froude 0.42

Tempo: graze 15% · idle 21% · walk 64%

- **movimento** (−11): casco patina no apoio: 0.18 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−9): no apoio o casco fica 5.8 cm acima do chão
- **forma** (−7): peito/altura 0.63 (o bicho de verdade: 0.45–0.62)
- **comportamento** (−5): parado 21% do tempo (o bicho de verdade: 30–80%)
- **comportamento** (−4): andando 64% do tempo (o bicho de verdade: 15–60%)

## ovelha (94)

Medidas: cern 0.83 · comp 0.82 · peito 0.62 · cab 0.27 · jF 169.8 · jH 161.2 · fora 0 · focinho 0.1 · vincoPastar 14 · vel 0.5 · deslize 0.12 · afunda 0.1 · apoio 0.64 · passo 0.85 · balanco 3 · joelhoAndando 176.4 · flutua 3.5 · ordem 1 · froude 0.43

Tempo: graze 71% · idle 13% · walk 16%

- **forma** (−7): comprimento do corpo 0.82m (o bicho de verdade: 0.85–1.25m)
- **forma** (−7): altura do dorso 0.83m (o bicho de verdade: 0.6–0.82m)
- **pose** (−6): pastando, o focinho fica a 10 cm do capim
- **pose** (−6): pastando, a pele dobra/estica demais em 14 triângulos (perna1 14)

## garça-moura (96)

Medidas: cern 1.19 · comp 0.56 · peito 0.29 · cab 0.31

Tempo: flee 100%

- **comportamento** (−10): parado 0% do tempo (o bicho de verdade: 45–95%)
- **comportamento** (−4): andando 0% do tempo (o bicho de verdade: 5–45%)

## lobo-guará (98)

Medidas: cern 0.91 · comp 1.12 · peito 0.36 · cab 0.38 · jF 164.8 · jH 153.4 · fora 0.2 · vel 1.49 · deslize 0.06 · afunda 0.1 · apoio 0.64 · passo 1.24 · balanco 2.9 · joelhoAndando 175.8 · flutua 4.6 · ordem 1 · froude 0.41

Tempo: graze 28% · idle 26% · walk 46%

- **movimento** (−7): no apoio o casco fica 4.6 cm acima do chão
- **pose** (−0): perna da frente dobrada parado: carpo a 164.8° (reta: 165–180°)

## garça-branca (100)

Medidas: cern 0.95 · comp 0.43 · peito 0.26 · cab 0.18

Tempo: graze 4% · idle 56% · walk 32% · flee 8%

- nada a corrigir

## seriema (100)

Medidas: cern 0.83 · comp 0.42 · peito 0.34 · cab 0.12

Tempo: graze 37% · idle 19% · walk 44%

- nada a corrigir

## galinha (100)

Medidas: cern 0.46 · comp 0.26 · peito 0.45 · cab 0.08

Tempo: graze 59% · idle 13% · walk 11% · flee 17%

- nada a corrigir

## ema (100)

Medidas: cern 1.47 · comp 0.7 · peito 0.42 · cab 0.17

Tempo: graze 44% · idle 17% · walk 39%

- nada a corrigir

## Fontes das medidas

- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.
- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).
- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.
- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).
- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).
- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.
