extends SceneTree
# Exporta a biblioteca de lançamentos (Lancamentos) para JSON, para o Dice Duel tocar na web.
func _init() -> void:
	var bib = load("res://assets/vfx/lancamentos_dados.res")
	var lista := []
	for l in bib.lista:
		var q := []
		for v in l.posicoes: q.append([snappedf(v.x, 0.001), snappedf(v.y, 0.001), snappedf(v.z, 0.001)])
		var r := []
		for i in range(0, l.rotacoes.size(), 4): r.append([snappedf(l.rotacoes[i], 0.0001), snappedf(l.rotacoes[i+1], 0.0001), snappedf(l.rotacoes[i+2], 0.0001), snappedf(l.rotacoes[i+3], 0.0001)])
		lista.append({"dados": l.dados, "hz": l.hz, "espacamento": l.espacamento, "inicios": Array(l.inicios), "repousos": Array(l.repousos),
			"faces_finais": Array(l.faces_finais), "batidas": Array(l.batidas), "posicoes": q, "rotacoes": r})
	var f := FileAccess.open(OS.get_environment("SAIDA"), FileAccess.WRITE)
	f.store_string(JSON.stringify(lista))
	f.close()
	print("exportados: ", lista.size())
	quit()
