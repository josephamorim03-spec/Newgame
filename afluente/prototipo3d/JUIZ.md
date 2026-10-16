# O juiz dos bichos

Relatório de `sim/juiz_bichos.js` (o motor fica em `prototipo3d/js/juiz.js`): 45 bichos com esqueleto, 224 mil triângulos no total. Nota média: **95**.

| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |
|---|---|---|---|---|---|---|
| boi | **86** | 87 | 94 | 65 | 100 | 8304 |
| ovelha | **90** | 86 | 82 | 92 | 100 | 4464 |
| tamanduá-bandeira | **92** | 93 | 88 | 100 | 87 | 4008 |
| lobo-guará | **93** | 100 | 100 | 72 | 100 | 5372 |
| onça-pintada | **93** | 100 | 100 | 83 | 87 | 5156 |
| bezerro | **94** | 94 | 100 | 83 | 100 | 7640 |
| anta | **95** | 100 | 81 | 100 | 100 | 5020 |
| capivara | **96** | 100 | 88 | 100 | 96 | 5128 |
| garça-branca | **100** | 100 | 100 | 100 | 100 | 3380 |
| seriema | **100** | 100 | 100 | 100 | 100 | 3452 |
| garça-moura | **100** | 100 | 100 | 100 | 100 | 3390 |
| galinha | **100** | 100 | 100 | 100 | 100 | 3652 |
| ema | **100** | 100 | 100 | 100 | 100 | 3364 |

## boi (86)

Medidas: cern 1.42 · comp 1.78 · peito 0.61 · cab 0.43 · jF 176.3 · jH 149.4 · fora 0.4 · focinho 0.06 · vincoPastar 16 · vel 0.3 · deslize 0.8 · afunda 0.1 · apoio 0.64 · passo 1.05 · balanco 16.9 · joelhoAndando 171.9 · flutua 9.3 · ordem 1 · froude 0.42

Tempo: graze 61% · idle 15% · walk 24%

- **movimento** (−18): casco patina no apoio: 0.8 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−12): no apoio o casco fica 9.3 cm acima do chão
- **forma** (−7): comprimento do corpo 1.78m (o bicho de verdade: 1.4–1.75m)
- **forma** (−7): peito/altura 0.61 (o bicho de verdade: 0.48–0.6)
- **pose** (−6): pastando, a pele dobra/estica demais em 16 triângulos (pescoco 16)
- **movimento** (−5): corpo sobe e desce 16.9 cm a cada passo (demais)

## ovelha (90)

Medidas: cern 0.83 · comp 0.82 · peito 0.57 · cab 0.27 · jF 164.9 · jH 155.8 · fora 0 · focinho 0.1 · vincoPastar 24 · vel 0.5 · deslize 0.13 · afunda 0.1 · apoio 0.64 · passo 0.85 · balanco 2.6 · joelhoAndando 174.5 · flutua 3.9 · ordem 1 · froude 0.43

Tempo: graze 66% · idle 16% · walk 18%

- **pose** (−10): pastando, a pele dobra/estica demais em 24 triângulos (perna2 14, perna0 10)
- **movimento** (−8): casco patina no apoio: 0.13 m/s (pisada firme: < 0,1 m/s)
- **forma** (−7): comprimento do corpo 0.82m (o bicho de verdade: 0.85–1.25m)
- **forma** (−7): altura do dorso 0.83m (o bicho de verdade: 0.6–0.82m)
- **pose** (−6): pastando, o focinho fica a 10 cm do capim
- **pose** (−2): perna da frente dobrada parado: carpo a 164.9° (reta: 168–180°)

## tamanduá-bandeira (92)

Medidas: cern 0.69 · comp 1.38 · peito 0.57 · cab 0.39 · jF 158.8 · jH 150.8 · fora 2.3 · vel 0.45 · deslize 0.12 · afunda 0.1 · apoio 0.64 · passo 0.96 · balanco 3 · joelhoAndando 176.3 · flutua 3.8 · ordem 1 · froude 0.4

Tempo: graze 22% · walk 78%

- **pose** (−12): perna sai do tronco: 2.3 cm para fora da silhueta (parado)
- **comportamento** (−9): andando 78% do tempo (o bicho de verdade: 15–55%)
- **forma** (−7): peito/altura 0.57 (o bicho de verdade: 0.6–0.85)
- **comportamento** (−4): parado 0% do tempo (o bicho de verdade: 5–40%)

## lobo-guará (93)

Medidas: cern 0.9 · comp 1.12 · peito 0.35 · cab 0.38 · jF 165 · jH 151.1 · fora 0.6 · vel 1.27 · deslize 0.34 · afunda 0.1 · apoio 0.64 · passo 1.24 · balanco 8.2 · joelhoAndando 176 · flutua 6.3 · ordem 1 · froude 0.41

Tempo: graze 29% · idle 20% · walk 50% · flee 1%

- **movimento** (−18): casco patina no apoio: 0.34 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−10): no apoio o casco fica 6.3 cm acima do chão

## onça-pintada (93)

Medidas: cern 0.7 · comp 1.33 · peito 0.58 · cab 0.37 · jF 165 · jH 141.9 · fora 0 · vel 0.9 · deslize 0.16 · afunda 0.1 · apoio 0.64 · passo 1.38 · balanco 6.9 · joelhoAndando 170.9 · flutua 4.9 · ordem 1 · froude 0.42

Tempo: graze 38% · idle 10% · walk 53%

- **movimento** (−10): casco patina no apoio: 0.16 m/s (pisada firme: < 0,1 m/s)
- **comportamento** (−8): parado 10% do tempo (o bicho de verdade: 30–80%)
- **movimento** (−7): no apoio o casco fica 4.9 cm acima do chão
- **comportamento** (−5): pastando/ciscando 38% do tempo (o bicho de verdade: 0–30%)

## bezerro (94)

Medidas: cern 0.85 · comp 1.05 · peito 0.58 · cab 0.26 · jF 176.3 · jH 152.4 · fora 0.3 · vel 0.85 · deslize 0.16 · afunda 0.1 · apoio 0.64 · passo 1.22 · balanco 5.7 · joelhoAndando 174.9 · flutua 5.1 · ordem 1 · froude 0.41

Tempo: graze 53% · idle 17% · walk 30%

- **movimento** (−10): casco patina no apoio: 0.16 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−8): no apoio o casco fica 5.1 cm acima do chão
- **forma** (−6): peito/altura 0.58 (o bicho de verdade: 0.42–0.58)

## anta (95)

Medidas: cern 1.08 · comp 1.84 · peito 0.63 · cab 0.56 · jF 153.7 · jH 141.7 · fora 0 · focinho 0.04 · vincoPastar 34 · vel 0.6 · deslize 0.01 · afunda 0.1 · apoio 0.64 · passo 0.98 · balanco 6.3 · joelhoAndando 156 · flutua 2.6 · ordem 1 · froude 0.42

Tempo: graze 39% · idle 7% · walk 38% · swim 16%

- **pose** (−12): pastando, a pele dobra/estica demais em 34 triângulos (perna1 20, perna0 14)
- **pose** (−7): perna da frente dobrada parado: carpo a 153.7° (reta: 162–180°)

## capivara (96)

Medidas: cern 0.64 · comp 1.17 · peito 0.67 · cab 0.44 · jF 168.2 · jH 144.9 · fora 0 · focinho 0.02 · vincoPastar 64 · vel 0.5 · deslize 0.12 · afunda 0.1 · apoio 0.65 · passo 1.23 · balanco 3.1 · joelhoAndando 173.2 · flutua 4 · ordem 1 · froude 0.41

Tempo: graze 51% · idle 16% · walk 18% · drink 3% · swim 7% · flee 3%

- **pose** (−12): pastando, a pele dobra/estica demais em 64 triângulos (pescoco 35, perna0 18)
- **comportamento** (−4): parado 16% do tempo (o bicho de verdade: 20–60%)

## garça-branca (100)

Medidas: cern 0.95 · comp 0.43 · peito 0.26 · cab 0.18

Tempo: graze 21% · idle 47% · walk 30% · flee 2%

- nada a corrigir

## seriema (100)

Medidas: cern 0.83 · comp 0.42 · peito 0.34 · cab 0.12

Tempo: graze 50% · idle 13% · walk 37%

- nada a corrigir

## garça-moura (100)

Medidas: cern 1.19 · comp 0.56 · peito 0.29 · cab 0.31

Tempo: graze 5% · idle 64% · walk 27% · flee 4%

- nada a corrigir

## galinha (100)

Medidas: cern 0.46 · comp 0.26 · peito 0.45 · cab 0.08

Tempo: graze 59% · idle 11% · walk 11% · flee 19%

- nada a corrigir

## ema (100)

Medidas: cern 1.47 · comp 0.7 · peito 0.42 · cab 0.17

Tempo: graze 61% · idle 12% · walk 27%

- nada a corrigir

## Fontes das medidas

- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.
- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).
- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.
- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).
- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).
- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.
