# O juiz de gente

Relatório de `sim/juiz_gente.js` (o motor fica em `prototipo3d/js/juizgente.js`). Nota média: **96**.

Cada tipo de morador é montado, medido parado, posto nas poses do jogo e (o andar) seguido por 4 s. Na saia, mede-se também a folga do pano até o corpo (saiaFolga, em mm: os 10% mais afastados entre a cintura e o quadril).

| Tipo | Nota | Forma | Integração | Pose | Movimento | Triângulos |
|---|---|---|---|---|---|---|
| homem | **91** | 89 | 100 | 73 | 100 | 20146 |
| homem de chapéu | **92** | 93 | 100 | 76 | 100 | 20978 |
| mulher de saia | **97** | 97 | 100 | 92 | 100 | 20712 |
| mulher de vestido e lenço | **97** | 100 | 86 | 100 | 100 | 19356 |
| mulher forte de saia comprida | **98** | 100 | 100 | 93 | 100 | 19176 |
| mulher magra de vestido | **98** | 97 | 100 | 96 | 100 | 18892 |
| idoso | **90** | 85 | 100 | 74 | 100 | 17812 |
| menino | **100** | 100 | 100 | 100 | 100 | 18428 |
| menina | **99** | 100 | 100 | 96 | 100 | 18348 |

## homem (91)

Medidas (frações da altura; mm nas emendas): altura 1.696 · cabeca 0.14 · ombros 0.276 · quadril 0.221 · braco 0.179 · antebraco 0.155 · coxa 0.242 · canela 0.245 · pe 0.155 · hOmbro 0.806 · hCotovelo 0.628 · hPunho 0.483 · hQuadril 0.524 · hJoelho 0.282 · triangulos 20146 · quina_tronco 1 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.2 · pé solto da perna 0.6 · cabeça solta do pescoço 0.4 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 3.4

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 57, dentro 0.7 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 67, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 71, dentro 0 mm) · enxuga a testa (vinco 46, dentro 0.9 mm) · mão na cintura (vinco 36, dentro 0 mm)

- **pose** (−6): enxada no alto: 71 cm² de pele esticando/encolhendo demais (tronco 40, braço 30 cm²)
- **pose** (−6): ajoelhado lavando: 67 cm² de pele esticando/encolhendo demais (perna 59, braço 8 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 57 cm² de pele esticando/encolhendo demais (braço 32, tronco 25 cm²)
- **forma** (−5): largura do quadril 0.221 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **pose** (−5): enxuga a testa: 46 cm² de pele esticando/encolhendo demais (braço 26, tronco 20 cm²)
- **pose** (−4): mão na cintura: 36 cm² de pele esticando/encolhendo demais (braço 36 cm²)
- **forma** (−3): largura dos ombros 0.276 da altura (o corpo de verdade: 0.225–0.275) — longo/largo
- **forma** (−3): cabeça (alto ao queixo) 0.14 da altura (o corpo de verdade: 0.12–0.14) — longo/largo

## homem de chapéu (92)

Medidas (frações da altura; mm nas emendas): altura 1.696 · cabeca 0.14 · ombros 0.272 · quadril 0.217 · braco 0.178 · antebraco 0.155 · mao 0.105 · coxa 0.247 · canela 0.25 · pe 0.155 · hOmbro 0.809 · hCotovelo 0.631 · hPunho 0.487 · hQuadril 0.534 · hJoelho 0.287 · triangulos 20978 · quina_tronco 1 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.7 · pé solto da perna 1 · cabeça solta do pescoço 0 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 3.5

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 45, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 68, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 55, dentro 0 mm) · enxuga a testa (vinco 41, dentro 0 mm) · mão na cintura (vinco 26, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 68 cm² de pele esticando/encolhendo demais (perna 60, braço 8 cm²)
- **pose** (−5): enxada no alto: 55 cm² de pele esticando/encolhendo demais (braço 30, tronco 25 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 45 cm² de pele esticando/encolhendo demais (braço 29, tronco 16 cm²)
- **pose** (−4): enxuga a testa: 41 cm² de pele esticando/encolhendo demais (braço 29, tronco 12 cm²)
- **forma** (−4): largura do quadril 0.217 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **pose** (−4): mão na cintura: 26 cm² de pele esticando/encolhendo demais (braço 26 cm²)
- **forma** (−3): cabeça (alto ao queixo) 0.14 da altura (o corpo de verdade: 0.12–0.14) — longo/largo

## mulher de saia (97)

Medidas (frações da altura; mm nas emendas): altura 1.693 · cabeca 0.139 · ombros 0.248 · quadril 0.225 · braco 0.173 · antebraco 0.145 · mao 0.1 · coxa 0.241 · canela 0.245 · pe 0.141 · hOmbro 0.804 · hCotovelo 0.632 · hPunho 0.498 · hQuadril 0.523 · hJoelho 0.282 · triangulos 20712 · quina_tronco 0.9 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.3 · cabeça solta do pescoço 0.3 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 2.2 · saiaFolga 44.3

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 20, dentro 0 mm) · braços à frente (vinco 15, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 15, dentro 0 mm) · ajoelhado lavando (vinco 4, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 31, dentro 0 mm) · enxuga a testa (vinco 28, dentro 0 mm) · mão na cintura (vinco 22, dentro 0 mm)

- **pose** (−4): enxada no alto: 31 cm² de pele esticando/encolhendo demais (braço 27, tronco 5 cm²)
- **pose** (−4): enxuga a testa: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)
- **forma** (−3): largura do quadril 0.225 da altura (o corpo de verdade: 0.172–0.225) — longo/largo

## mulher de vestido e lenço (97)

Medidas (frações da altura; mm nas emendas): altura 1.692 · cabeca 0.139 · ombros 0.242 · quadril 0.216 · braco 0.173 · antebraco 0.145 · mao 0.102 · coxa 0.238 · canela 0.242 · pe 0.147 · hOmbro 0.802 · hCotovelo 0.63 · hPunho 0.495 · hQuadril 0.516 · hJoelho 0.279 · triangulos 19356 · quina_tronco 0.8 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.1 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 12 · olhoAFrente 2.7 · saiaFolga 43.8

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 16, dentro 0 mm) · braços à frente (vinco 14, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 14, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 23, dentro 0 mm) · enxuga a testa (vinco 23, dentro 0 mm) · mão na cintura (vinco 21, dentro 0 mm)

- **integração** (−14): lenço descendo sobre a testa até os olhos (12 pontos)

## mulher forte de saia comprida (98)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.138 · ombros 0.247 · quadril 0.22 · braco 0.173 · antebraco 0.145 · mao 0.098 · coxa 0.239 · canela 0.242 · pe 0.146 · hOmbro 0.802 · hCotovelo 0.63 · hPunho 0.497 · hQuadril 0.517 · hJoelho 0.279 · triangulos 19176 · quina_tronco 0.9 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 2.5 · saiaFolga 37.4

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 12, dentro 0 mm) · braços à frente (vinco 14, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 14, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 28, dentro 0 mm) · enxuga a testa (vinco 26, dentro 0 mm) · mão na cintura (vinco 19, dentro 0 mm)

- **pose** (−4): enxada no alto: 28 cm² de pele esticando/encolhendo demais (braço 23, tronco 5 cm²)
- **pose** (−4): enxuga a testa: 26 cm² de pele esticando/encolhendo demais (braço 26 cm²)

## mulher magra de vestido (98)

Medidas (frações da altura; mm nas emendas): altura 1.697 · cabeca 0.139 · ombros 0.241 · quadril 0.214 · braco 0.173 · antebraco 0.145 · mao 0.097 · coxa 0.242 · canela 0.246 · pe 0.141 · hOmbro 0.805 · hCotovelo 0.632 · hPunho 0.501 · hQuadril 0.525 · hJoelho 0.283 · triangulos 18892 · quina_tronco 0.8 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.3 · cabeça solta do pescoço 0.1 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 2.7 · saiaFolga 45.8

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 13, dentro 0 mm) · braços à frente (vinco 14, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 14, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 23, dentro 0 mm) · enxuga a testa (vinco 26, dentro 0 mm) · mão na cintura (vinco 19, dentro 0 mm)

- **pose** (−4): enxuga a testa: 26 cm² de pele esticando/encolhendo demais (braço 26 cm²)
- **forma** (−3): altura do punho 0.501 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## idoso (90)

Medidas (frações da altura; mm nas emendas): altura 1.687 · cabeca 0.143 · ombros 0.28 · quadril 0.227 · braco 0.179 · antebraco 0.156 · mao 0.104 · coxa 0.249 · canela 0.252 · pe 0.156 · hOmbro 0.812 · hCotovelo 0.635 · hPunho 0.488 · hQuadril 0.538 · hJoelho 0.289 · triangulos 17812 · quina_tronco 1 · quina_coxa 1.6 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.7 · pé solto da perna 1.1 · cabeça solta do pescoço 0.2 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.1

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 57, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 25, dentro 0 mm) · ajoelhado lavando (vinco 69, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 64, dentro 0 mm) · enxuga a testa (vinco 46, dentro 0 mm) · mão na cintura (vinco 37, dentro 0 mm)

- **forma** (−7): largura do quadril 0.227 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **pose** (−6): ajoelhado lavando: 69 cm² de pele esticando/encolhendo demais (perna 60, braço 8 cm²)
- **pose** (−6): enxada no alto: 64 cm² de pele esticando/encolhendo demais (tronco 33, braço 32 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 57 cm² de pele esticando/encolhendo demais (braço 33, tronco 24 cm²)
- **pose** (−5): enxuga a testa: 46 cm² de pele esticando/encolhendo demais (braço 26, tronco 20 cm²)
- **forma** (−4): cabeça (alto ao queixo) 0.143 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **pose** (−4): mão na cintura: 37 cm² de pele esticando/encolhendo demais (braço 37 cm²)
- **forma** (−4): largura dos ombros 0.28 da altura (o corpo de verdade: 0.225–0.275) — longo/largo

## menino (100)

Medidas (frações da altura; mm nas emendas): altura 1.674 · cabeca 0.154 · ombros 0.235 · quadril 0.192 · braco 0.171 · antebraco 0.142 · mao 0.092 · coxa 0.233 · canela 0.244 · pe 0.149 · hOmbro 0.784 · hCotovelo 0.615 · hPunho 0.486 · hQuadril 0.514 · hJoelho 0.282 · triangulos 18428 · quina_tronco 0.7 · quina_coxa 1.2 · quina_braço 0.8 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0.4 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -2.6

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 11, dentro 0 mm) · braços à frente (vinco 13, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 13, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 19, dentro 0 mm) · enxuga a testa (vinco 24, dentro 0 mm) · mão na cintura (vinco 19, dentro 0 mm)

- nada a corrigir

## menina (99)

Medidas (frações da altura; mm nas emendas): altura 1.675 · cabeca 0.155 · ombros 0.241 · quadril 0.198 · braco 0.171 · antebraco 0.142 · mao 0.096 · coxa 0.235 · canela 0.247 · pe 0.149 · hOmbro 0.786 · hCotovelo 0.617 · hPunho 0.49 · hQuadril 0.519 · hJoelho 0.284 · triangulos 18348 · quina_tronco 0.6 · quina_coxa 1 · quina_braço 0.7 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0.2 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -2.5

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.1 · passoAltura 0.429 · bracoContraPerna -0.5

Poses: braço erguido (lata na cabeça) (vinco 16, dentro 0 mm) · braços à frente (vinco 13, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 13, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 28, dentro 0 mm) · enxuga a testa (vinco 25, dentro 0 mm) · mão na cintura (vinco 20, dentro 0 mm)

- **pose** (−4): enxada no alto: 28 cm² de pele esticando/encolhendo demais (braço 15, tronco 13 cm²)

## Fontes

- Segmentos do corpo como fração da altura: Drillis & Contini (1966); Winter, *Biomechanics and Motor Control of Human Movement*.
- Criança de 6 a 8 anos: cabeça com ~1/6 da altura, pernas proporcionalmente mais curtas (tabelas de crescimento e antropometria infantil).
- Andar: passo de ~0,41 da altura a ~1,2 m/s, centro do corpo subindo e descendo 3–6 cm, braço em oposição à perna (Perry, *Gait Analysis*).
