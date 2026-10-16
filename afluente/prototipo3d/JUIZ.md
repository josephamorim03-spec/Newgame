# O juiz dos bichos

Relatório de `sim/juiz_bichos.js` (o motor fica em `prototipo3d/js/juiz.js`): 45 bichos com esqueleto, 224 mil triângulos no total. Nota média: **96**.

| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |
|---|---|---|---|---|---|---|
| ovelha | **90** | 86 | 82 | 92 | 100 | 4464 |
| bezerro | **92** | 94 | 100 | 82 | 91 | 7640 |
| boi | **93** | 87 | 94 | 91 | 100 | 8304 |
| lobo-guará | **93** | 100 | 100 | 73 | 100 | 5372 |
| tamanduá-bandeira | **93** | 93 | 89 | 100 | 90 | 4008 |
| anta | **93** | 100 | 90 | 82 | 100 | 5020 |
| capivara | **95** | 100 | 81 | 100 | 100 | 5128 |
| onça-pintada | **96** | 100 | 100 | 93 | 90 | 5156 |
| garça-moura | **99** | 100 | 100 | 100 | 96 | 3390 |
| garça-branca | **100** | 100 | 100 | 100 | 100 | 3380 |
| seriema | **100** | 100 | 100 | 100 | 100 | 3452 |
| galinha | **100** | 100 | 100 | 100 | 100 | 3652 |
| ema | **100** | 100 | 100 | 100 | 100 | 3364 |

## ovelha (90)

Medidas: cern 0.83 · comp 0.82 · peito 0.57 · cab 0.27 · jF 167.2 · jH 158.1 · fora 0 · focinho 0.09 · vincoPastar 39 · vel 0.5 · deslize 0.14 · afunda 0.1 · apoio 0.64 · passo 0.85 · balanco 3.3 · joelhoAndando 175.3 · flutua 3.7 · ordem 1 · froude 0.43

Tempo: graze 70% · idle 14% · walk 16%

- **pose** (−12): pastando, a pele dobra/estica demais em 39 triângulos (perna2 31, perna0 6)
- **movimento** (−8): casco patina no apoio: 0.14 m/s (pisada firme: < 0,1 m/s)
- **forma** (−7): comprimento do corpo 0.82m (o bicho de verdade: 0.85–1.25m)
- **forma** (−7): altura do dorso 0.83m (o bicho de verdade: 0.6–0.82m)
- **pose** (−5): pastando, o focinho fica a 9 cm do capim
- **pose** (−1): perna da frente dobrada parado: carpo a 167.2° (reta: 168–180°)

## bezerro (92)

Medidas: cern 0.85 · comp 1.05 · peito 0.58 · cab 0.26 · jF 176.3 · jH 153.6 · fora 0.3 · vel 0.95 · deslize 0.19 · afunda 0.1 · apoio 0.64 · passo 1.22 · balanco 4.8 · joelhoAndando 175.3 · flutua 4.6 · ordem 1 · froude 0.41

Tempo: graze 44% · idle 15% · walk 41%

- **movimento** (−11): casco patina no apoio: 0.19 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−7): no apoio o casco fica 4.6 cm acima do chão
- **forma** (−6): peito/altura 0.58 (o bicho de verdade: 0.42–0.58)
- **comportamento** (−5): andando 41% do tempo (o bicho de verdade: 5–35%)
- **comportamento** (−4): parado 15% do tempo (o bicho de verdade: 20–60%)

## boi (93)

Medidas: cern 1.42 · comp 1.78 · peito 0.61 · cab 0.43 · jF 176.3 · jH 151.4 · fora 0.4 · focinho 0.04 · vincoPastar 16 · vel 0.68 · deslize 0.03 · afunda 0.1 · apoio 0.64 · passo 1.05 · balanco 6.8 · joelhoAndando 175.5 · flutua 5.7 · ordem 1 · froude 0.42

Tempo: graze 53% · idle 16% · walk 27% · drink 4%

- **movimento** (−9): no apoio o casco fica 5.7 cm acima do chão
- **forma** (−7): comprimento do corpo 1.78m (o bicho de verdade: 1.4–1.75m)
- **forma** (−7): peito/altura 0.61 (o bicho de verdade: 0.48–0.6)
- **pose** (−6): pastando, a pele dobra/estica demais em 16 triângulos (pescoco 16)

## lobo-guará (93)

Medidas: cern 0.9 · comp 1.12 · peito 0.35 · cab 0.38 · jF 175.6 · jH 160.2 · fora 0.4 · vel 1.44 · deslize 0.3 · afunda 0.1 · apoio 0.64 · passo 1.24 · balanco 3 · joelhoAndando 176.4 · flutua 5.7 · ordem 1 · froude 0.41

Tempo: graze 31% · idle 17% · walk 52%

- **movimento** (−18): casco patina no apoio: 0.3 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−9): no apoio o casco fica 5.7 cm acima do chão

## tamanduá-bandeira (93)

Medidas: cern 0.69 · comp 1.38 · peito 0.57 · cab 0.39 · jF 151 · jH 146.3 · fora 2.1 · vel 0.45 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 0.96 · balanco 2.1 · joelhoAndando 176.2 · flutua 2.4 · ordem 1 · froude 0.4

Tempo: graze 32% · walk 68%

- **pose** (−11): perna sai do tronco: 2.1 cm para fora da silhueta (parado)
- **forma** (−7): peito/altura 0.57 (o bicho de verdade: 0.6–0.85)
- **comportamento** (−6): andando 68% do tempo (o bicho de verdade: 15–55%)
- **comportamento** (−4): parado 0% do tempo (o bicho de verdade: 5–40%)

## anta (93)

Medidas: cern 1.08 · comp 1.84 · peito 0.63 · cab 0.56 · jF 176.4 · jH 163.8 · fora 0 · focinho 0.04 · vincoPastar 24 · vel 0.57 · deslize 0.41 · afunda 0.1 · apoio 0.64 · passo 0.98 · balanco 8.7 · joelhoAndando 172.2 · flutua 2.5 · ordem 1 · froude 0.42

Tempo: graze 49% · idle 10% · walk 38% · swim 3%

- **movimento** (−18): casco patina no apoio: 0.41 m/s (pisada firme: < 0,1 m/s)
- **pose** (−10): pastando, a pele dobra/estica demais em 24 triângulos (perna1 24)

## capivara (95)

Medidas: cern 0.64 · comp 1.17 · peito 0.67 · cab 0.44 · jF 176.4 · jH 176.2 · fora 0 · focinho 0 · vincoPastar 73 · vel 0.5 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 1.23 · balanco 4.8 · joelhoAndando 158.2 · flutua 2.5 · ordem 1 · froude 0.41

Tempo: graze 36% · idle 20% · walk 18% · swim 20% · flee 5%

- **pose** (−12): pastando, a pele dobra/estica demais em 73 triângulos (pescoco 34, perna0 15)
- **pose** (−7): jarrete a 176.2° (perna boa: 110–165°)

## onça-pintada (96)

Medidas: cern 0.7 · comp 1.33 · peito 0.58 · cab 0.37 · jF 176.4 · jH 155 · fora 0 · vel 0.9 · deslize 0.05 · afunda 0.1 · apoio 0.64 · passo 1.38 · balanco 4 · joelhoAndando 173.4 · flutua 4.5 · ordem 1 · froude 0.42

Tempo: graze 37% · idle 21% · walk 40% · flee 1%

- **movimento** (−7): no apoio o casco fica 4.5 cm acima do chão
- **comportamento** (−5): parado 21% do tempo (o bicho de verdade: 30–80%)
- **comportamento** (−5): pastando/ciscando 37% do tempo (o bicho de verdade: 0–30%)

## garça-moura (99)

Medidas: cern 1.19 · comp 0.56 · peito 0.29 · cab 0.31

Tempo: graze 25% · idle 41% · walk 34%

- **comportamento** (−4): parado 41% do tempo (o bicho de verdade: 45–95%)

## garça-branca (100)

Medidas: cern 0.95 · comp 0.43 · peito 0.26 · cab 0.18

Tempo: graze 19% · idle 50% · walk 30% · flee 2%

- nada a corrigir

## seriema (100)

Medidas: cern 0.83 · comp 0.42 · peito 0.34 · cab 0.12

Tempo: graze 46% · idle 18% · walk 36%

- nada a corrigir

## galinha (100)

Medidas: cern 0.46 · comp 0.26 · peito 0.45 · cab 0.08

Tempo: graze 58% · idle 10% · walk 11% · flee 22%

- nada a corrigir

## ema (100)

Medidas: cern 1.47 · comp 0.7 · peito 0.42 · cab 0.17

Tempo: graze 44% · idle 19% · walk 37%

- nada a corrigir

## Fontes das medidas

- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.
- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).
- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.
- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).
- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).
- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.
