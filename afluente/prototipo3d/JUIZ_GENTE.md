# O juiz de gente

Relatório de `sim/juiz_gente.js` (o motor fica em `prototipo3d/js/juizgente.js`). Nota média: **98**.

Cada tipo de morador é montado, medido parado, posto nas poses do jogo e (o andar) seguido por 4 s. Na saia, mede-se também a folga do pano até o corpo (saiaFolga, em mm: os 10% mais afastados entre a cintura e o quadril).

| Tipo | Nota | Forma | Integração | Pose | Movimento | Triângulos |
|---|---|---|---|---|---|---|
| homem | **96** | 100 | 100 | 83 | 100 | 15198 |
| homem de chapéu | **96** | 100 | 100 | 83 | 100 | 17454 |
| mulher de saia | **99** | 100 | 100 | 95 | 100 | 16064 |
| mulher de vestido e lenço | **98** | 100 | 100 | 91 | 100 | 16272 |
| mulher forte de saia comprida | **99** | 100 | 100 | 95 | 100 | 16592 |
| mulher magra de vestido | **99** | 100 | 100 | 95 | 100 | 14084 |
| idoso | **96** | 100 | 100 | 83 | 100 | 14128 |
| menino | **99** | 100 | 100 | 96 | 100 | 14360 |
| menina | **97** | 100 | 100 | 87 | 100 | 14116 |

## homem (96)

Medidas (frações da altura; mm nas emendas): altura 1.71 · cabeca 0.136 · ombros 0.265 · quadril 0.213 · braco 0.183 · antebraco 0.152 · coxa 0.24 · canela 0.251 · pe 0.152 · hOmbro 0.825 · hCotovelo 0.642 · hPunho 0.497 · hQuadril 0.526 · hJoelho 0.287 · triangulos 15198 · quina_tronco 1.4 · quina_coxa 1.3 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 0.5 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 9, dentro 0 mm) · braços à frente (vinco 0, dentro 0 mm) · braços abertos (vinco 6, dentro 0 mm) · agachado juntando (vinco 0, dentro 0 mm) · ajoelhado lavando (vinco 122, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 33, dentro 0 mm) · mão na cintura (vinco 28, dentro 0 mm)

- **pose** (−9): ajoelhado lavando: 122 cm² de pele esticando/encolhendo demais (perna 122 cm²)
- **pose** (−4): enxuga a testa: 33 cm² de pele esticando/encolhendo demais (braço 23, tronco 9 cm²)
- **pose** (−4): mão na cintura: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)

## homem de chapéu (96)

Medidas (frações da altura; mm nas emendas): altura 1.71 · cabeca 0.139 · ombros 0.265 · quadril 0.213 · braco 0.183 · antebraco 0.152 · mao 0.101 · coxa 0.24 · canela 0.251 · pe 0.152 · hOmbro 0.825 · hCotovelo 0.642 · hPunho 0.497 · hQuadril 0.526 · hJoelho 0.287 · triangulos 17454 · quina_tronco 1.3 · quina_coxa 1.2 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 0.5 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 23, dentro 0 mm) · braços à frente (vinco 4, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 4, dentro 0 mm) · ajoelhado lavando (vinco 122, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 37, dentro 0 mm) · enxuga a testa (vinco 27, dentro 0 mm) · mão na cintura (vinco 8, dentro 0 mm)

- **pose** (−9): ajoelhado lavando: 122 cm² de pele esticando/encolhendo demais (perna 122 cm²)
- **pose** (−4): enxada no alto: 37 cm² de pele esticando/encolhendo demais (roupa 23, tronco 14 cm²)
- **pose** (−4): enxuga a testa: 27 cm² de pele esticando/encolhendo demais (braço 12, tronco 9 cm²)

## mulher de saia (99)

Medidas (frações da altura; mm nas emendas): altura 1.71 · cabeca 0.136 · ombros 0.241 · quadril 0.216 · braco 0.183 · antebraco 0.152 · mao 0.101 · coxa 0.24 · canela 0.251 · pe 0.152 · hOmbro 0.825 · hCotovelo 0.643 · hPunho 0.499 · hQuadril 0.526 · hJoelho 0.287 · triangulos 16064 · quina_tronco 1.1 · quina_coxa 1.2 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 0.3 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9 · saiaFolga 13.4

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 9, dentro 0 mm) · braços à frente (vinco 5, dentro 0 mm) · braços abertos (vinco 2, dentro 0 mm) · agachado juntando (vinco 5, dentro 0 mm) · ajoelhado lavando (vinco 54, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 14, dentro 0 mm) · enxuga a testa (vinco 12, dentro 0 mm) · mão na cintura (vinco 0, dentro 0 mm)

- **pose** (−5): ajoelhado lavando: 54 cm² de pele esticando/encolhendo demais (perna 53, roupa 2 cm²)

## mulher de vestido e lenço (98)

Medidas (frações da altura; mm nas emendas): altura 1.71 · cabeca 0.139 · ombros 0.241 · quadril 0.216 · braco 0.183 · antebraco 0.152 · mao 0.101 · coxa 0.24 · canela 0.251 · pe 0.146 · hOmbro 0.825 · hCotovelo 0.643 · hPunho 0.499 · hQuadril 0.526 · hJoelho 0.287 · triangulos 16272 · quina_tronco 1.1 · quina_coxa 1.2 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 2.5 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9 · saiaFolga 16.9

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 2, dentro 0 mm) · braços à frente (vinco 0, dentro 0 mm) · braços abertos (vinco 1, dentro 0 mm) · agachado juntando (vinco 0, dentro 0 mm) · ajoelhado lavando (vinco 53, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 12, dentro 0 mm) · enxuga a testa (vinco 27, dentro 0 mm) · mão na cintura (vinco 25, dentro 0 mm)

- **pose** (−5): ajoelhado lavando: 53 cm² de pele esticando/encolhendo demais (perna 53 cm²)
- **pose** (−4): enxuga a testa: 27 cm² de pele esticando/encolhendo demais (braço 19, roupa 9 cm²)

## mulher forte de saia comprida (99)

Medidas (frações da altura; mm nas emendas): altura 1.71 · cabeca 0.139 · ombros 0.265 · quadril 0.242 · braco 0.183 · antebraco 0.152 · mao 0.101 · coxa 0.24 · canela 0.251 · pe 0.146 · hOmbro 0.825 · hCotovelo 0.643 · hPunho 0.499 · hQuadril 0.526 · hJoelho 0.287 · triangulos 16592 · quina_tronco 1.2 · quina_coxa 1.1 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 2.4 · cabeça solta do pescoço 0.7 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9 · saiaFolga 19.3

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 23, dentro 0 mm) · braços à frente (vinco 6, dentro 0 mm) · braços abertos (vinco 7, dentro 0 mm) · agachado juntando (vinco 6, dentro 0 mm) · ajoelhado lavando (vinco 55, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 12, dentro 0 mm) · mão na cintura (vinco 0, dentro 0 mm)

- **pose** (−5): ajoelhado lavando: 55 cm² de pele esticando/encolhendo demais (perna 53, roupa 2 cm²)

## mulher magra de vestido (99)

Medidas (frações da altura; mm nas emendas): altura 1.71 · cabeca 0.139 · ombros 0.217 · quadril 0.198 · braco 0.183 · antebraco 0.152 · mao 0.101 · coxa 0.24 · canela 0.251 · pe 0.152 · hOmbro 0.825 · hCotovelo 0.643 · hPunho 0.499 · hQuadril 0.526 · hJoelho 0.287 · triangulos 14084 · quina_tronco 0.9 · quina_coxa 1.1 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 0.6 · cabeça solta do pescoço 0.6 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9 · saiaFolga 16.5

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 3, dentro 0 mm) · braços à frente (vinco 0, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 0, dentro 0 mm) · ajoelhado lavando (vinco 52, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 10, dentro 0 mm) · enxuga a testa (vinco 21, dentro 0 mm) · mão na cintura (vinco 0, dentro 0 mm)

- **pose** (−5): ajoelhado lavando: 52 cm² de pele esticando/encolhendo demais (perna 52 cm²)

## idoso (96)

Medidas (frações da altura; mm nas emendas): altura 1.71 · cabeca 0.136 · ombros 0.265 · quadril 0.213 · braco 0.183 · antebraco 0.152 · mao 0.101 · coxa 0.24 · canela 0.251 · pe 0.152 · hOmbro 0.825 · hCotovelo 0.642 · hPunho 0.498 · hQuadril 0.526 · hJoelho 0.287 · triangulos 14128 · quina_tronco 1.3 · quina_coxa 1.2 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 0.5 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 9, dentro 0 mm) · braços à frente (vinco 0, dentro 0 mm) · braços abertos (vinco 6, dentro 0 mm) · agachado juntando (vinco 0, dentro 0 mm) · ajoelhado lavando (vinco 122, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 33, dentro 0 mm) · mão na cintura (vinco 28, dentro 0 mm)

- **pose** (−9): ajoelhado lavando: 122 cm² de pele esticando/encolhendo demais (perna 122 cm²)
- **pose** (−4): enxuga a testa: 33 cm² de pele esticando/encolhendo demais (braço 23, tronco 9 cm²)
- **pose** (−4): mão na cintura: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)

## menino (99)

Medidas (frações da altura; mm nas emendas): altura 1.75 · cabeca 0.158 · ombros 0.259 · quadril 0.208 · braco 0.179 · antebraco 0.149 · mao 0.099 · coxa 0.234 · canela 0.246 · pe 0.157 · hOmbro 0.806 · hCotovelo 0.627 · hPunho 0.486 · hQuadril 0.514 · hJoelho 0.28 · triangulos 14360 · quina_tronco 1 · quina_coxa 1 · quina_braço 0.8 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 4 · cabeça solta do pescoço 1.1 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 9, dentro 0 mm) · braços à frente (vinco 0, dentro 0 mm) · braços abertos (vinco 6, dentro 0 mm) · agachado juntando (vinco 0, dentro 0 mm) · ajoelhado lavando (vinco 28, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 22, dentro 0 mm) · mão na cintura (vinco 8, dentro 0 mm)

- **pose** (−4): ajoelhado lavando: 28 cm² de pele esticando/encolhendo demais (perna 28 cm²)

## menina (97)

Medidas (frações da altura; mm nas emendas): altura 1.75 · cabeca 0.159 · ombros 0.272 · quadril 0.197 · braco 0.179 · antebraco 0.149 · mao 0.099 · coxa 0.234 · canela 0.246 · pe 0.148 · hOmbro 0.806 · hCotovelo 0.628 · hPunho 0.488 · hQuadril 0.514 · hJoelho 0.28 · triangulos 14116 · quina_tronco 0.9 · quina_coxa 0.8 · quina_braço 0.7 · tampaOmbro 0 · mão solta do punho 0 · pé solto da perna 4 · cabeça solta do pescoço 1.1 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -3.9 · saiaFolga 26.9

Andar: velocidade 1.25 · deslize 0.07 · sobeDesce 3.5 · passoAltura 0.41 · bracoContraPerna -0.75

Poses: braço erguido (lata na cabeça) (vinco 14, dentro 0 mm) · braços à frente (vinco 0, dentro 0 mm) · braços abertos (vinco 2, dentro 0 mm) · agachado juntando (vinco 0, dentro 0 mm) · ajoelhado lavando (vinco 52, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 28, dentro 0 mm) · enxuga a testa (vinco 35, dentro 0 mm) · mão na cintura (vinco 8, dentro 0 mm)

- **pose** (−5): ajoelhado lavando: 52 cm² de pele esticando/encolhendo demais (perna 52 cm²)
- **pose** (−4): enxuga a testa: 35 cm² de pele esticando/encolhendo demais (roupa 14, braço 12 cm²)
- **pose** (−4): enxada no alto: 28 cm² de pele esticando/encolhendo demais (tronco 14, roupa 14 cm²)

## Fontes

- Segmentos do corpo como fração da altura: Drillis & Contini (1966); Winter, *Biomechanics and Motor Control of Human Movement*.
- Criança de 6 a 8 anos: cabeça com ~1/6 da altura, pernas proporcionalmente mais curtas (tabelas de crescimento e antropometria infantil).
- Andar: passo de ~0,41 da altura a ~1,2 m/s, centro do corpo subindo e descendo 3–6 cm, braço em oposição à perna (Perry, *Gait Analysis*).
