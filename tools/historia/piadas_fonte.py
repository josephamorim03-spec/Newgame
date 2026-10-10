#!/usr/bin/env python3
"""As falas do modo história (docs/historia.md), uma por linha, com código. Gera docs/historia_piadas.json.

Cada fala: código, capítulo, quem fala, onde (quadro ou momento da partida), o texto, o desenho do quadro (quando
ajuda a julgar a piada) e de qual gag ela faz parte (§8 do roteiro). O status nasce "pendente": só o dono aprova
(docs/historia.md §11). Rodar de novo preserva o status e a nota de quem já foi revisado.

    python3 tools/historia/piadas_fonte.py
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / 'docs' / 'historia_piadas.json'

CAPS = {
    'P': 'Prólogo · Boa noite. Uma partida?', 'G': 'Prólogo · o guia na voz da Diana',
    'C1': 'Cap. 1 · O Sapo', 'I1': 'Interlúdio · Coisa de receita', 'C2': 'Cap. 2 · O Coelho', 'C3': 'Cap. 3 · A Raposa',
    'C4': 'Cap. 4 · O Urso', 'C5': 'Cap. 5 · O Guaxinim', 'C6': 'Cap. 6 · A Ovelha', 'I6': 'Interlúdio · Cansei de disfarçar',
    'C7': 'Cap. 7 · Dona Coruja', 'R': 'A revelação · O mural', 'C8': 'Cap. 8 · Diana, a fita original',
    'F': 'Final · a cura', 'X': 'Pós-créditos',
}

# (código, quem, onde, texto, desenho, gag)
F = [
    # Prólogo
    ('P-01', 'Diana', 'Antes · Q1', 'Boa noite. Você joga dados?', 'A Diana atrás da mesinha de feltro. No nariz, um curativo com estampa de pips de dado.', 'nariz'),
    ('P-02', 'Diana', 'Antes · Q2', 'Não importa. Eu ensino. Sou ótima professora e péssima em deixar coisas em cima da mesa.', 'A pata dela empurra um dado devagar até a beirada.', 'pata'),
    ('P-03', 'Diana', 'Antes · Q3', 'Não pergunte do nariz.', 'O dado cai para fora do quadro. Ela não olha.', 'nariz'),
    ('P-04', 'Diana', 'Depois · Q1', 'Você aprende rápido.', 'Ela olhando o placar.', ''),
    ('P-05', 'Diana', 'Depois · Q2', 'Ótimo. Preciso de um favor. Alguém levou sete páginas do meu caderno de receitas.', 'Um caderno "RECEITAS DA DIANA" com tocos de páginas arrancadas.', 'receitas'),
    ('P-06', 'Diana', 'Depois · Q3', 'Sete. Como a soma dos opostos. Não é coincidência. Quase nada é.', 'Close no rosto dela.', 'letra-d'),
    # Guia
    ('G-01', 'Diana', 'Primeiro Eco', 'Eco. O mesmo número. Gêmeos idênticos: mesmo código, opiniões diferentes.', '', ''),
    ('G-02', 'Diana', 'Primeiro Passo', 'Passo. Um a mais ou um a menos. Uma mutação pequena. A maioria passa despercebida. (toca no nariz) A minha, não.', '', 'nariz'),
    ('G-03a', 'Diana', 'Primeiro Oposto · opção a', 'Oposto. Somam sete: as faces de lados contrários do dado. Os opostos se completam. Diz o dado.', '', ''),
    ('G-03b', 'Diana', 'Primeiro Oposto · opção b', 'Oposto. Somam sete: um e seis, dois e cinco, três e quatro. Cada número tem o seu par. Quase romântico.', '', ''),
    ('G-04', 'Diana', 'Primeira corrente de 3', 'Três elos. Um códon: a menor frase que a vida sabe ler. Já dá para disparar.', '', ''),
    ('G-05', 'Diana', 'Primeira ruptura', 'Rompeu. Na natureza chamam isso de mutação. Aqui chamamos de "arrisquei demais".', '', ''),
    ('G-06', 'Diana', 'Primeiro uso do Bolso', 'O Bolso guarda um dado. A vida guarda duas fitas pelo mesmo motivo.', '', ''),
    # Cap 1 Sapo
    ('C1-01', 'Diana', 'Interlúdio · Q1', 'Dobrei a dose.', 'Dois curativos cruzados em X no nariz.', 'nariz'),
    ('C1-02', 'Diana', 'Interlúdio · Q2–Q3', 'O Sapo está com a página um. Ele é educado. Vai te oferecer chá. / Não aceite. É água do lago.', '', 'cha'),
    ('C1-03', 'Sapo', 'Chegada · Q1', 'Boa noite. Aceita um chá?', 'O Sapo numa vitória-régia, tirando o chapéu de palha.', 'cha'),
    ('C1-04', 'Sapo', 'Chegada · Q2', 'É do lago, sim. Orgânico.', 'Uma xícara turva, com um girino dentro.', 'cha'),
    ('C1-05', 'Sapo', 'Chegada · Q3', 'A página se chama "Sopa de Girino ao Contrário". Achei de mau gosto. Já fui girino.', '', ''),
    ('C1-06', 'Sapo', 'Chegada · Q4', 'Ganhe e ela é sua. Perca, e você toma o chá.', '', 'cha'),
    ('C1-07', 'Sapo', 'Partida · início', 'Calma. Aqui o tempo anda devagar.', '', ''),
    ('C1-08', 'Sapo', 'Partida · usa Reverso', 'Reverso: a fita volta pela outra ponta. Já fui girino. Não volto nem com transcriptase.', '', ''),
    ('C1-09', 'Sapo', 'Partida · seu disparo grande', 'Que salto.', '', ''),
    ('C1-10', 'Sapo', 'Partida · ruptura dele', 'Escorreguei na vitória-régia.', '', ''),
    ('C1-11', 'Sapo', 'Partida · ele venceu', 'Chá?', '', 'cha'),
    ('C1-12', 'Sapo', 'Partida · ele perdeu', 'Justo. A página é sua. O chá também, se quiser.', '', 'cha'),
    ('C1-13a', 'Página 1', 'Depois · Q1 · opção a', 'SOPA DE GIRINO AO CONTRÁRIO · Ingredientes: A, T, C e G. Nessa ordem. Ou na outra.', 'A página molhada.', 'receitas'),
    ('C1-13b', 'Página 1', 'Depois · Q1 · opção b', '(margem, na letra da Diana) Ler no espelho. Ou com o Reverso.', 'A página molhada, com o título escrito espelhado: SOPA DE GIRINO AO CONTRÁRIO.', 'receitas'),
    ('C1-14', 'Sapo', 'Depois · Q2–Q3', 'Sabe por que ela quer isso? Dizem que a salamandra regenera uma perna inteira. / Eu não. Sou sapo. Todo mundo confunde.', '', ''),
    # Interlúdio 1
    ('I1-01', 'Diana', 'Q1', 'Uma a menos.', 'Ela lê a página um. No fundo, pela primeira vez, um mural de cortiça com uma foto de dado e um barbante vermelho.', 'mural'),
    ('I1-02', 'Diana', 'Q2', 'O que é o DNA, se não um conjunto de dados?', 'Ela olha para o nada.', 'letra-d'),
    ('I1-03', 'Diana', 'Q3', '…Coisa de receita. Próximo: o Coelho.', 'Ela percebe você olhando o mural e cobre a cortiça com a pata.', 'mural'),
    # Cap 2 Coelho
    ('C2-01', 'Diana', 'Interlúdio · Q1', 'O Coelho tem a página dois. Ele joga rápido.', 'Curativo e, por cima, um adesivo: "NÃO PERGUNTE".', 'nariz'),
    ('C2-02', 'Diana', 'Interlúdio · Q2', 'Ele faz tudo rápido. A família dele que o diga: são quarenta e três.', '', ''),
    ('C2-03', 'Coelho', 'Chegada · Q1', 'Desculpe, estou atrasado. Para tudo. Sempre.', 'O Coelho com uma planilha, cercado de silhuetas de coelhinhos.', ''),
    ('C2-04', 'Coelho', 'Chegada · Q2', 'A página? "Pão que Cresce Sozinho". Testei. Cresceu. Tivemos que mudar de toca.', '', 'pao'),
    ('C2-05', 'Coelho', 'Chegada · Q3', 'Jogo rápido, tá? Tenho reunião de família. É uma reunião grande.', '', ''),
    ('C2-06', 'Coelho', 'Partida · início', 'Valendo. Vai. Vai. Vai.', '', ''),
    ('C2-07', 'Coelho', 'Partida · usa Sobrecarga', 'Mais dois. Aqui em casa mais nunca é demais. É só… mais.', '', ''),
    ('C2-08', 'Coelho', 'Partida · seu disparo grande', 'Isso conta como multiplicação?', '', ''),
    ('C2-09', 'Coelho', 'Partida · ruptura dele', 'Contei errado. De novo. Eram quarenta e quatro.', '', ''),
    ('C2-10', 'Coelho', 'Partida · ele venceu', 'Ganhei! Preciso ir. Atrasado.', '', ''),
    ('C2-11', 'Coelho', 'Partida · ele perdeu', 'Toma a página. Corre que ainda dá tempo de… alguma coisa.', '', ''),
    ('C2-12a', 'Página 2', 'Depois · Q1 · opção a', 'PÃO QUE CRESCE SOZINHO · Ingredientes: G, G, G e G. Fermento: sim.', 'Um pão saindo da fôrma e do quadro.', 'receitas'),
    ('C2-12b', 'Página 2', 'Depois · Q1 · opção b', '(margem, na letra da Diana) Não deixar o Coelho ler.', 'A página com o título PÃO QUE CRESCE SOZINHO e uma mancha de farinha em forma de pata de coelho.', 'receitas'),
    ('C2-13', 'Coelho', 'Depois · Q2', 'Ela é sua amiga? Avisa que o curativo está torto.', '', 'nariz'),
    ('C2-14a', 'Coelho', 'Depois · Q3 · opção a', 'Ela tem outras receitas? Pergunto por um amigo. Quarenta e três amigos.', '', 'pao'),
    ('C2-14b', 'Coelho', 'Depois · Q3 · opção b', '(sem esta fala: o capítulo termina no Q2)', '', 'pao'),
    # Cap 3 Raposa
    ('C3-01', 'Diana', 'Interlúdio · Q1', 'Inspiração.', 'Um mini cachecol verde enrolado no nariz.', 'nariz'),
    ('C3-02', 'Diana', 'Interlúdio · Q2–Q3', 'A Raposa tem a página três. Ela vai mentir para você. / Não. Pior. Ela vai dizer a verdade de um jeito que parece mentira.', '', ''),
    ('C3-03', 'Diana', 'Interlúdio · Q4', 'E ela usa armadilhas. Eu também. Achei que era hora de contar.', 'A Diana vira uma carta para baixo: o "?".', ''),
    ('C3-04a', 'Raposa', 'Chegada · Q1 · opção a', 'Ah. Você deve ser o projeto da gata.', 'A Raposa num sofá de toca, olhos semicerrados, satisfeita.', 'sabem'),
    ('C3-04b', 'Raposa', 'Chegada · Q1 · opção b', 'Ah. Quem a gata anda treinando.', 'A Raposa num sofá de toca, olhos semicerrados, satisfeita.', 'sabem'),
    ('C3-05', 'Raposa', 'Chegada · Q2', 'No inverno eu fico branca, sabia? É genética. O cachecol é escolha.', '', ''),
    ('C3-06', 'Raposa', 'Chegada · Q3–Q5', 'A página é "Torta de Fundo Falso". Adorei. Quase não devolvo. / … / Quase.', '', ''),
    ('C3-07', 'Raposa', 'Partida · início', 'Fique à vontade. Nada aqui é o que parece. Inclusive eu.', '', ''),
    ('C3-08', 'Raposa', 'Partida · arma', 'Armei alguma coisa. Ou não. É uma raposa falando.', '', ''),
    ('C3-09', 'Raposa', 'Partida · Fundo Falso pegou', 'O fundo era falso. A raposa, verdadeira.', '', ''),
    ('C3-10', 'Raposa', 'Partida · seu disparo grande', 'Hm. Você não é fácil de enganar.', '', ''),
    ('C3-11', 'Raposa', 'Partida · ruptura dela', 'Que deselegante. Para mim.', '', ''),
    ('C3-12', 'Raposa', 'Partida · ela venceu', 'Volte quando quiser perder com estilo.', '', ''),
    ('C3-13', 'Raposa', 'Partida · ela perdeu', 'Leve. E cuidado com a gata: ela é mais raposa do que eu.', '', 'sabem'),
    ('C3-14a', 'Página 3', 'Depois · Q1 · opção a', 'TORTA DE FUNDO FALSO · Recheio: segredo. Até para quem come.', 'Uma torta inteira, sem corte.', 'receitas'),
    ('C3-14b', 'Página 3', 'Depois · Q1 · opção b', '(debaixo de uma aba da página) Achou que ia ter receita aqui?', 'A página TORTA DE FUNDO FALSO tem uma aba de papel colada; levantada, mostra só a frase.', 'receitas'),
    # Cap 4 Urso
    ('C4-01', 'Diana', 'Interlúdio · Q1–Q3', 'É um acessório. / … / Está na moda. Em clínica veterinária.', 'A Diana com um cone de veterinário no pescoço.', 'nariz'),
    ('C4-02', 'Diana', 'Interlúdio · Q4–Q5', 'O Urso tem a página quatro. Está hibernando. Não acorde ele. / Quer dizer: acorde. Com educação.', 'O mural no fundo: três fotos e um bilhete "DISPARO. DUELO. DOBRO. → D".', 'letra-d'),
    ('C4-03', 'Urso', 'Chegada · Q2', '…É primavera?', 'Caverna escura, um volume enorme de gorro vermelho; o ronco desenhado com pips. Um olho abre.', ''),
    ('C4-04a', 'Urso', 'Chegada · Q3 · opção a', 'Não? Então estou sonhando. Joga rápido, antes que eu acorde.', '', ''),
    ('C4-04b', 'Urso', 'Chegada · Q3 · opção b', 'Não? Então me acorda em março.', '', ''),
    ('C4-05', 'Caixa + Urso', 'Chegada · Q4', 'CAIXA: Ursos hibernam meses e acordam sem perder músculo. A ciência quer muito esse segredo. / URSO: O segredo é não acordar.', '', ''),
    ('C4-06', 'Urso', 'Partida · início', '(bocejo) Vai você primeiro. Vai você sempre.', '', ''),
    ('C4-07', 'Urso', 'Partida · usa Pausa', 'Pausa. Não é preguiça. É estratégia de inverno.', '', ''),
    ('C4-08', 'Urso', 'Partida · seu disparo grande', 'Hm. Isso foi… acordado.', '', ''),
    ('C4-09', 'Urso', 'Partida · ruptura dele', 'Cochilei no meio.', '', ''),
    ('C4-10', 'Urso', 'Partida · ele venceu', 'Pronto. Posso voltar a dormir?', '', ''),
    ('C4-11', 'Urso', 'Partida · ele perdeu', 'Leva a página. Fecha a porta. Apaga a luz.', '', ''),
    ('C4-12a', 'Página 4', 'Depois · Q1 · opção a', 'MEL EM BANHO-MARIA · Tempo de preparo: um inverno.', 'Um pote de mel de gorro, dormindo em banho-maria.', 'receitas'),
    ('C4-12b', 'Página 4', 'Depois · Q1 · opção b', '(margem, na letra da Diana) Não acordar o mel.', 'A página MEL EM BANHO-MARIA, com o pote de mel desenhado de olhos fechados.', 'receitas'),
    ('C4-13', 'Urso', 'Depois · Q3–Q4', '(dormindo) …a gata… o nariz… ela pediu pra não contar… / (ronco)', 'O Urso dormindo de novo; você puxa a página da pata dele.', 'sabem'),
    # Cap 5 Guaxinim
    ('C5-01', 'Diana', 'Interlúdio · Q1–Q2', 'O cone sumiu. / Suspeito de alguém de máscara.', 'Uma meia enrolada no nariz.', 'nariz'),
    ('C5-02', 'Diana', 'Interlúdio · Q3', 'Por coincidência, o Guaxinim tem a página cinco. Por coincidência, ele usa máscara. Eu não acredito em coincidência.', '', 'letra-d'),
    ('C5-03', 'Guaxinim', 'Chegada · Q1', 'Isso? Achei.', 'O Guaxinim num monte de tralha, usando o cone da Diana como abajur.', 'nariz'),
    ('C5-04', 'Guaxinim', 'Chegada · Q2', 'Não roubei. Fiz uma transferência horizontal.', '', ''),
    ('C5-05', 'Guaxinim', 'Chegada · Q3', 'Bactéria faz isso o tempo todo: pega o gene do vizinho e pronto. Ninguém prende bactéria.', '', ''),
    ('C5-06', 'Guaxinim', 'Chegada · Q4–Q5', 'As páginas? Fui eu, sim. Todas. Depois vendi uma para cada bicho. / Modelo de assinatura.', '', ''),
    ('C5-07', 'Guaxinim', 'Partida · início', 'Bonito seu Bolso. Seria uma pena se…', '', ''),
    ('C5-08', 'Guaxinim', 'Partida · usa Furto', 'Troca justa. Para mim.', '', ''),
    ('C5-09', 'Guaxinim', 'Partida · Pedágio pegou', 'Taxa de serviço.', '', ''),
    ('C5-10', 'Guaxinim', 'Partida · seu disparo grande', 'Ei. Isso era meu. Quer dizer. Ia ser.', '', ''),
    ('C5-11', 'Guaxinim', 'Partida · ruptura dele', 'Lixo. Literalmente.', '', ''),
    ('C5-12', 'Guaxinim', 'Partida · ele venceu', 'Volte sempre. Traga coisas.', '', ''),
    ('C5-13', 'Guaxinim', 'Partida · ele perdeu', 'Tá. Leva a página. E o cone. / …Fica com o cone? Não? Tá.', '', 'nariz'),
    ('C5-14a', 'Página 5', 'Depois · Q1 · opção a', 'SALADA DE SOBRAS DOS OUTROS · Ingredientes: os do vizinho.', 'Uma tigela com folhas de várias hortas.', 'receitas'),
    ('C5-14b', 'Página 5', 'Depois · Q1 · opção b', '(etiqueta de preço colada na página) Página 5 · 4,99 por mês', 'A página SALADA DE SOBRAS DOS OUTROS com uma etiqueta de preço por cima do título.', 'receitas'),
    ('C5-15', 'Guaxinim', 'Depois · Q2', 'Pergunta pra gata quem deixou a janela aberta.', '', 'sabem'),
    # Cap 6 Ovelha
    ('C6-01', 'Diana', 'Interlúdio · Q1–Q3', 'Algodão. / … / É lã. Da Ovelha. Ela ainda não sabe.', 'Um tufo branco e fofo no nariz.', 'nariz'),
    ('C6-02', 'Diana', 'Interlúdio · Q4', 'Página seis. Ela é simpática. Não fale de clonagem.', '', ''),
    ('C6-03', 'Ovelha', 'Chegada · Q1', 'Não sou a Dolly.', 'A Ovelha num pasto de hexágonos, com uma falha na lã do ombro.', ''),
    ('C6-04', 'Ovelha', 'Chegada · Q2', 'Não sou parente da Dolly. Não lembro dela. Sim, todo mundo pergunta.', '', ''),
    ('C6-05', 'Ovelha', 'Chegada · Q3–Q5', 'Quer trocar? Dou duas pedras por um dado. / … / Ninguém nunca quer a ovelha. Eu sei.', '', ''),
    ('C6-06', 'Ovelha', 'Partida · início', 'Rola. Vê se sai sete.', '', ''),
    ('C6-07', 'Ovelha', 'Partida · usa Espelho', 'Espelho: uma cópia de você, ao contrário. É o mais perto de clone que eu chego.', '', ''),
    ('C6-08', 'Ovelha', 'Partida · seu disparo grande', 'Bééém jogado.', '', ''),
    ('C6-09', 'Ovelha', 'Partida · ruptura dela', 'Desmanchou. Igual tricô.', '', ''),
    ('C6-10', 'Ovelha', 'Partida · ela venceu', 'Leva um pouco de lã de lembrança. Parece que alguém já levou.', '', 'nariz'),
    ('C6-11', 'Ovelha', 'Partida · ela perdeu', 'Toma a página. E diz pra gata devolver a minha lã.', '', 'nariz'),
    ('C6-12a', 'Página 6', 'Depois · Q1 · opção a', 'PUDIM GÊMEO · Rende: duas porções idênticas. A segunda não lembra da primeira.', 'Dois pudins iguais.', 'receitas'),
    ('C6-12b', 'Página 6', 'Depois · Q1 · opção b', '(margem, na letra da Diana) Uma delas é a cópia. Não pergunte qual.', 'Duas páginas PUDIM GÊMEO idênticas, grampeadas.', 'receitas'),
    # Interlúdio 6
    ('I6-01', 'Diana', 'Q1', 'Cansei de disfarçar.', 'A Diana sem nada no nariz: o ferimento à mostra. Primeiro quadro sério da história.', 'nariz'),
    ('I6-02', 'Diana', 'Q2', 'Não é nada. É um lençol.', 'O mural coberto por um lençol, o barbante vermelho saindo por baixo.', 'mural'),
    ('I6-03', 'Diana', 'Q3–Q4', 'Última página. Dona Coruja. Ela sabe ler. / Ler a Mesa. Ler gente. Ler… coisas que eu não contei.', '', 'sabem'),
    # Cap 7 Coruja
    ('C7-01', 'Coruja', 'Chegada · Q1', 'Boa noite. Sente-se. A Diana mandou você.', 'Biblioteca de estantes altas. Lombadas: "Volume A", "Volume T", "Volume C", "Volume G".', ''),
    ('C7-02', 'Coruja', 'Chegada · Q2', 'Mandou você em todo mundo antes de mim. Esperta. Mandou você treinar.', '', 'sabem'),
    ('C7-03', 'Coruja', 'Chegada · Q3', 'Ela vai te dizer que "Dona Coruja" também começa com D. Diga a ela que "Dona" é pronome de tratamento.', 'O Coelho numa mesa de leitura, ofegante, com uma pilha de livros de receitas e um pão que não cabe na mesa.', 'letra-d'),
    ('C7-04', 'Coruja', 'Partida · início', 'Sem pressa. Quem escreve precisa saber ler.', '', ''),
    ('C7-05', 'Coruja', 'Partida · usa Lacre', 'Lacre. Nem tudo que está escrito precisa ser dito.', '', ''),
    ('C7-06', 'Coruja', 'Partida · seu disparo grande', 'Jogada precisa. Você leu.', '', ''),
    ('C7-07', 'Coruja', 'Partida · ruptura dela', 'Hum. Escrevi uma letra errada. Acontece com os melhores.', '', ''),
    ('C7-08', 'Coruja', 'Partida · ela venceu', 'Ainda não. Volte quando ler mais rápido.', '', ''),
    ('C7-09', 'Coruja', 'Partida · ela perdeu', 'Agora sim. Sente-se. Precisamos falar da gata.', 'Reescrita sem gênero (era "Está pronta").', 'sabem'),
    ('C7-10a', 'Coruja', 'Depois · Q1 · opção a', 'A última. Não tem ingrediente nenhum.', 'Ela entrega a última página: só o desenho de um nariz de gato com um X.', 'receitas'),
    ('C7-10b', 'Coruja', 'Depois · Q1 · opção b', '(quadro mudo: ela só entrega a página)', 'Ela entrega a última página: só o desenho de um nariz de gato com um X.', 'receitas'),
    ('C7-11', 'Coruja', 'Depois · Q2', 'Uma letra errada, no meio de quase três bilhões. Um Passo onde devia haver um Eco. Por isso não fecha.', '', ''),
    ('C7-12', 'Coruja', 'Depois · Q3', 'Ela não te ensinou a jogar por gentileza. Pergunte a ela.', 'Reescrita sem gênero (tirei o "querida").', 'sabem'),
    # Revelação
    ('R-01', 'Diana', 'Q1', 'Você acha que é coincidência tudo começar com D?', 'Ela puxa o lençol: o mural inteiro, barbante vermelho, a foto de cada bicho carimbada, a sua no meio, uma dupla hélice com dados no lugar dos degraus.', 'letra-d'),
    ('R-02', 'Diana', 'Q2', 'Meu nome. Dados. DNA. Está tudo conectado.', 'Três cartões ligados pelo barbante: DIANA · DADOS · DNA.', 'letra-d'),
    ('R-03', 'Diana', 'Q3–Q5', 'Até a Dona Coruja. / Ela diz que "Dona" é pronome de tratamento. / É o que um D diria.', 'A foto da Coruja com um post-it "D?".', 'letra-d'),
    ('R-04', 'Diana', 'Q6', 'Uma letra. Errada. Desde que eu nasci. O corte foi a quina de um dado. O não fechar é comigo.', 'Ela sentada, séria.', 'nariz'),
    ('R-05', 'Diana', 'Q7', 'Eu tentei sozinha. Mas com essas patas fica difícil.', 'A pata dela segurando uma pipeta, torta, pingando.', ''),
    ('R-06', 'Diana', 'Q8–Q10', 'Então eu ensinei alguém que monta correntes melhor do que eu. / … / Você.', '', ''),
    ('R-07', 'Diana', 'Q11 · [Você me usou.]', 'Usei. Ensinei. Em gatês é a mesma palavra.', '', ''),
    ('R-08', 'Diana', 'Q11 · [E as páginas?]', 'O Guaxinim levou. Eu deixei a janela aberta. Com um bilhete: "por favor, não leve as páginas". / Guaxinim não lê bilhete. Eu sabia.', '', 'sabem'),
    ('R-09', 'Diana', 'Q12–Q13', 'E não: eu não estava brincando com os seus dados na tela inicial. / Estava sequenciando.', '', 'pata'),
    ('R-10', 'Coelho + Diana', 'Q14–Q15', 'COELHO: Então… não é um livro de receitas? / DIANA: É. / A receita sou eu.', 'O Coelho na porta, abraçado a um pão do tamanho dele.', 'pao'),
    ('R-11', 'Diana', 'Q16–Q17', 'Falta escrever. A correção tem que ser feita contra a fita original. A fita original sou eu. / Jogue sério. Se eu facilitar, a cura sai com defeito.', 'Ela na Mesa dela, os dados prontos.', ''),
    # Cap 8 Diana
    ('C8-01', 'Diana', 'Partida · início', 'Boa noite. Uma partida? / (balão menor) Dessa vez vale.', 'A primeira fala do jogo, palavra por palavra.', 'revanche'),
    ('C8-02', 'Diana', 'Partida · seu primeiro Oposto', 'Par complementar. A com T. Bonito.', '', ''),
    ('C8-03', 'Diana', 'Partida · usa Espelho', 'Espelho. Você vai ter que ler ao contrário. Como eu.', '', ''),
    ('C8-04', 'Diana', 'Partida · seu disparo grande', 'Isso. Escreve assim.', '', ''),
    ('C8-05', 'Diana', 'Partida · ruptura dela', 'Arrisquei demais. De novo. Está no meu DNA.', '', ''),
    ('C8-06', 'Diana', 'Partida · ela venceu', 'Ainda não. Revanche? / Por favor.', '', 'revanche'),
    ('C8-07', 'Diana', 'Partida · ela perdeu', 'Mereceu.', 'Sem o "Revanche?" de sempre: vem a cena da cura.', 'revanche'),
    # Final
    ('F-01', 'Diana', 'Q1–Q2', 'Dois, cinco, dois, cinco. / …Parece senha de wi-fi.', 'A sua corrente vencedora vira uma fita impressa com as letras embaixo: 2 5 2 5 → C G C G.', ''),
    ('F-02', 'Diana', 'Q2 · se a corrente tem 3 ou 4', 'O três e o quatro não dizem nada. São tipo "hmm". Todo texto tem.', '', ''),
    ('F-03', 'Diana', 'Q5–Q6', 'Fechou. / Faz cócegas.', 'O ferimento fechado; ela encosta a pata. Antes, um quadro mudo.', 'nariz'),
    ('F-A', 'Diana', 'Fecho · o Eco', 'Fechou. Fechou. / Por que eu estou falando duas vezes? Vezes? / Você pôs um Eco. Eco. / …Passa amanhã. Manhã. / Revanche? Vanche?', '', 'fecho'),
    ('F-A2', 'Diana', 'Fecho · quadro da 3.ª estrela', 'Fita complementar perfeita. Eu ensinei bem. Bem.', '', 'fecho'),
    # Pós-créditos
    ('X-01', 'Diana', 'Pós-créditos 1', 'DianaDice não seria um nome melhor para esse jogo? / … / Seria.', 'Ela risca "Dice Duel" com um pincel atômico e escreve por cima: "DianaDice".', 'letra-d'),
    ('X-02a', 'Sapo + Diana', 'Pós-créditos 2 · opção a', 'SAPO: Soube da cura. Trouxe chá. / DIANA: É do lago? / SAPO: Orgânico.', 'A Diana, curada, abre a porta. O Sapo de chapéu, com uma xícara turva.', 'cha'),
    ('X-02b', '—', 'Pós-créditos 2 · opção b', '(sem o segundo pós-créditos: termina no DianaDice)', '', ''),
]

GAGS = {
    'nariz': 'O nariz (o enfeite muda a cada capítulo)', 'mural': 'O mural', 'letra-d': 'A teoria do D', 'receitas': 'O caderno de "receitas"',
    'pao': 'O pão do Coelho', 'sabem': 'Quem sabe de alguma coisa', 'pata': 'A pata', 'revanche': '"Revanche?"', 'cha': 'O chá do Sapo',
    'fecho': 'O fecho da história (o Eco)',
}


def importar(pasta):
    """As decisões da página de revisão (os documentos da coleção "revisao", salvos um por arquivo): cada uma vale
    para o texto que foi julgado (o campo "texto" do documento)."""
    dec = {}
    for f in sorted(Path(pasta).glob('*.json')):
        d = json.loads(f.read_text(encoding='utf-8'))
        d = d.get('data', d)
        if d.get('status') in ('aprovada', 'ajustar', 'recusada'):
            dec[f.stem] = d
    return dec


def main():
    antes = {}
    if SAIDA.exists():
        for x in json.loads(SAIDA.read_text(encoding='utf-8'))['falas']:
            antes[x['id']] = x
    if len(sys.argv) > 1:   # python3 tools/historia/piadas_fonte.py PASTA_DA_REVISAO
        for cod, d in importar(sys.argv[1]).items():
            if cod in antes and d.get('texto') == antes[cod]['texto']:
                antes[cod] = {**antes[cod], 'status': d['status'], 'nota': d.get('nota') or ''}
    # textos que o próprio dono escreveu numa nota de ajuste já nascem aprovados
    DO_DONO = {'R-05'}
    ids = [f[0] for f in F]
    assert len(ids) == len(set(ids)), 'código repetido'
    falas = []
    for cod, quem, onde, texto, desenho, gag in F:
        cap = cod.split('-')[0]
        velho = antes.get(cod, {})
        # texto mudou: volta a pendente (a aprovação era do texto de antes)
        mudou = velho and velho.get('texto') != texto
        st = 'aprovada' if cod in DO_DONO else 'pendente' if mudou or not velho else velho.get('status', 'pendente')
        falas.append({'id': cod, 'cap': cap, 'capitulo': CAPS[cap], 'quem': quem, 'onde': onde, 'texto': texto, 'desenho': desenho,
                      'gag': gag, 'status': st, 'nota': 'texto do dono' if cod in DO_DONO else '' if mudou else velho.get('nota', '')})
    SAIDA.write_text(json.dumps({'gags': GAGS, 'falas': falas}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    from collections import Counter
    print(f'{SAIDA.relative_to(RAIZ)}: {len(falas)} falas', dict(Counter(x['status'] for x in falas)))


if __name__ == '__main__':
    main()
