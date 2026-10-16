# O juiz de gente

Relatório de `sim/juiz_gente.js` (o motor fica em `prototipo3d/js/juizgente.js`). Nota média: **95**.

Cada tipo de morador é montado, medido parado, posto nas poses do jogo e (o andar) seguido por 4 s.

| Tipo | Nota | Forma | Integração | Pose | Movimento | Triângulos |
|---|---|---|---|---|---|---|
| homem | **91** | 93 | 100 | 69 | 100 | 20462 |
| homem de chapéu | **91** | 93 | 100 | 73 | 100 | 21402 |
| mulher de saia | **97** | 93 | 100 | 96 | 100 | 19976 |
| mulher de vestido e lenço | **99** | 96 | 100 | 100 | 100 | 19208 |
| idoso | **90** | 91 | 100 | 68 | 100 | 19880 |
| menino | **99** | 97 | 100 | 100 | 100 | 18188 |
| menina | **99** | 97 | 100 | 100 | 100 | 18108 |

## homem (91)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.141 · ombros 0.272 · quadril 0.215 · braco 0.179 · antebraco 0.155 · coxa 0.247 · canela 0.25 · pe 0.155 · hOmbro 0.809 · hCotovelo 0.631 · hPunho 0.489 · hQuadril 0.533 · hJoelho 0.286 · triangulos 20462 · quina_tronco 1 · quina_coxa 1.6 · quina_braço 1.1 · tampaOmbro 0 · mão solta do punho 4.2 · pé solto da perna 1.2 · cabeça solta do pescoço 0 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5.5

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.9 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 45, dentro 0 mm) · braços à frente (vinco 27, dentro 0 mm) · braços abertos (vinco 18, dentro 0 mm) · agachado juntando (vinco 27, dentro 0 mm) · ajoelhado lavando (vinco 70, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 50, dentro 0 mm) · enxuga a testa (vinco 37, dentro 0 mm) · mão na cintura (vinco 27, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 70 cm² de pele esticando/encolhendo demais (perna 60, braço 10 cm²)
- **pose** (−5): enxada no alto: 50 cm² de pele esticando/encolhendo demais (braço 35, tronco 15 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 45 cm² de pele esticando/encolhendo demais (braço 33, tronco 12 cm²)
- **pose** (−4): enxuga a testa: 37 cm² de pele esticando/encolhendo demais (braço 31, tronco 6 cm²)
- **pose** (−4): braços à frente: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **pose** (−4): agachado juntando: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **pose** (−4): mão na cintura: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **forma** (−3): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **forma** (−3): largura do quadril 0.215 da altura (o corpo de verdade: 0.17–0.215) — longo/largo
- **forma** (−0): silhueta facetada: até 1.6 mm de quina no coxa com 18 lados (mais segmentos)

## homem de chapéu (91)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.141 · ombros 0.272 · quadril 0.216 · braco 0.179 · antebraco 0.155 · mao 0.104 · coxa 0.243 · canela 0.246 · pe 0.155 · hOmbro 0.807 · hCotovelo 0.628 · hPunho 0.49 · hQuadril 0.526 · hJoelho 0.283 · triangulos 21402 · quina_tronco 1 · quina_coxa 1.6 · quina_braço 1.1 · tampaOmbro 0 · mão solta do punho 4.7 · pé solto da perna 1.6 · cabeça solta do pescoço 0.5 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5.5

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.9 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 39, dentro 0 mm) · braços à frente (vinco 27, dentro 0 mm) · braços abertos (vinco 18, dentro 0 mm) · agachado juntando (vinco 27, dentro 0 mm) · ajoelhado lavando (vinco 69, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 51, dentro 0 mm) · enxuga a testa (vinco 42, dentro 0 mm) · mão na cintura (vinco 25, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 69 cm² de pele esticando/encolhendo demais (perna 59, braço 10 cm²)
- **pose** (−5): enxada no alto: 51 cm² de pele esticando/encolhendo demais (braço 35, tronco 15 cm²)
- **pose** (−5): enxuga a testa: 42 cm² de pele esticando/encolhendo demais (braço 36, tronco 6 cm²)
- **pose** (−4): braço erguido (lata na cabeça): 39 cm² de pele esticando/encolhendo demais (braço 27, tronco 12 cm²)
- **pose** (−4): braços à frente: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **pose** (−4): agachado juntando: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **forma** (−3): largura do quadril 0.216 da altura (o corpo de verdade: 0.17–0.215) — longo/largo
- **forma** (−3): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **forma** (−0): silhueta facetada: até 1.6 mm de quina no coxa com 18 lados (mais segmentos)

## mulher de saia (97)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.141 · ombros 0.244 · quadril 0.219 · braco 0.173 · antebraco 0.145 · mao 0.101 · coxa 0.243 · canela 0.247 · pe 0.147 · hOmbro 0.805 · hCotovelo 0.633 · hPunho 0.503 · hQuadril 0.526 · hJoelho 0.283 · triangulos 19976 · quina_tronco 0.8 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.7 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.3

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.9 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 15, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 16, dentro 0 mm) · agachado juntando (vinco 18, dentro 0 mm) · ajoelhado lavando (vinco 9, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 19, dentro 0 mm) · enxuga a testa (vinco 26, dentro 0 mm) · mão na cintura (vinco 21, dentro 0 mm)

- **pose** (−4): enxuga a testa: 26 cm² de pele esticando/encolhendo demais (braço 26 cm²)
- **forma** (−3): altura do punho 0.503 da altura (o corpo de verdade: 0.46–0.5) — longo/largo
- **forma** (−3): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo

## mulher de vestido e lenço (99)

Medidas (frações da altura; mm nas emendas): altura 1.696 · cabeca 0.14 · ombros 0.244 · quadril 0.221 · braco 0.173 · antebraco 0.145 · mao 0.099 · coxa 0.243 · canela 0.247 · pe 0.146 · hOmbro 0.805 · hCotovelo 0.633 · hPunho 0.505 · hQuadril 0.526 · hJoelho 0.284 · triangulos 19208 · quina_tronco 0.8 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.7 · cabeloNoRosto 2 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.9 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 22, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 16, dentro 0 mm) · agachado juntando (vinco 18, dentro 0 mm) · ajoelhado lavando (vinco 11, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 19, dentro 0 mm) · enxuga a testa (vinco 23, dentro 0 mm) · mão na cintura (vinco 24, dentro 0 mm)

- **forma** (−4): altura do punho 0.505 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## idoso (90)

Medidas (frações da altura; mm nas emendas): altura 1.686 · cabeca 0.141 · ombros 0.273 · quadril 0.222 · braco 0.18 · antebraco 0.156 · mao 0.109 · coxa 0.247 · canela 0.25 · pe 0.156 · hOmbro 0.81 · hCotovelo 0.631 · hPunho 0.486 · hQuadril 0.535 · hJoelho 0.287 · triangulos 19880 · quina_tronco 1 · quina_coxa 1.6 · quina_braço 1.1 · tampaOmbro 0 · mão solta do punho 4.8 · pé solto da perna 0.9 · cabeça solta do pescoço 0.1 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5.8

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.9 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 46, dentro 0 mm) · braços à frente (vinco 27, dentro 0 mm) · braços abertos (vinco 18, dentro 0 mm) · agachado juntando (vinco 32, dentro 0 mm) · ajoelhado lavando (vinco 70, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 51, dentro 0 mm) · enxuga a testa (vinco 38, dentro 0 mm) · mão na cintura (vinco 35, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 70 cm² de pele esticando/encolhendo demais (perna 60, braço 10 cm²)
- **forma** (−5): largura do quadril 0.222 da altura (o corpo de verdade: 0.17–0.215) — longo/largo
- **pose** (−5): enxada no alto: 51 cm² de pele esticando/encolhendo demais (braço 36, tronco 15 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 46 cm² de pele esticando/encolhendo demais (braço 34, tronco 12 cm²)
- **pose** (−4): enxuga a testa: 38 cm² de pele esticando/encolhendo demais (braço 32, tronco 6 cm²)
- **pose** (−4): mão na cintura: 35 cm² de pele esticando/encolhendo demais (braço 35 cm²)
- **pose** (−4): agachado juntando: 32 cm² de pele esticando/encolhendo demais (braço 27, tronco 5 cm²)
- **pose** (−4): braços à frente: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **forma** (−4): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **forma** (−0): silhueta facetada: até 1.6 mm de quina no coxa com 18 lados (mais segmentos)

## menino (99)

Medidas (frações da altura; mm nas emendas): altura 1.674 · cabeca 0.156 · ombros 0.241 · quadril 0.195 · braco 0.171 · antebraco 0.143 · mao 0.094 · coxa 0.231 · canela 0.243 · pe 0.141 · hOmbro 0.783 · hCotovelo 0.615 · hPunho 0.491 · hQuadril 0.511 · hJoelho 0.28 · triangulos 18188 · quina_tronco 0.6 · quina_coxa 1.2 · quina_braço 0.8 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0.7 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -1.3

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.9 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 17, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 5, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 11, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 22, dentro 0 mm) · mão na cintura (vinco 19, dentro 0 mm)

- **forma** (−3): altura do punho 0.491 da altura (o corpo de verdade: 0.42–0.49) — longo/largo

## menina (99)

Medidas (frações da altura; mm nas emendas): altura 1.674 · cabeca 0.157 · ombros 0.245 · quadril 0.199 · braco 0.171 · antebraco 0.142 · mao 0.092 · coxa 0.233 · canela 0.245 · pe 0.141 · hOmbro 0.784 · hCotovelo 0.616 · hPunho 0.494 · hQuadril 0.514 · hJoelho 0.282 · triangulos 18108 · quina_tronco 0.6 · quina_coxa 1.2 · quina_braço 0.8 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0.3 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -1

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.9 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 22, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 5, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 11, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 23, dentro 0 mm) · mão na cintura (vinco 20, dentro 0 mm)

- **forma** (−3): altura do punho 0.494 da altura (o corpo de verdade: 0.42–0.49) — longo/largo

## Fontes

- Segmentos do corpo como fração da altura: Drillis & Contini (1966); Winter, *Biomechanics and Motor Control of Human Movement*.
- Criança de 6 a 8 anos: cabeça com ~1/6 da altura, pernas proporcionalmente mais curtas (tabelas de crescimento e antropometria infantil).
- Andar: passo de ~0,41 da altura a ~1,2 m/s, centro do corpo subindo e descendo 3–6 cm, braço em oposição à perna (Perry, *Gait Analysis*).
