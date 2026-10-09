// Dice Duel · banco de dados
// Postgres quando há DATABASE_URL (Railway); senão, memória com cópia num arquivo JSON (desenvolvimento e testes).
// As duas implementações têm a mesma interface.
'use strict';
const fs = require('fs');
const path = require('path');
const Regras = require('../shared/regras');
const { chaveDoNome } = require('./autenticacao');

const contaNova = (id, nome, senha) => ({
  id, nome, chave: chaveDoNome(nome), senha_hash: senha.hash, sal: senha.sal,
  rating: 1000, pico: 1000, partidas: 0, vitorias: 0, moedas: 0, xp: 0,
  cartas: Regras.GRATIS.slice(), dados: ['marfim'], icones: ['bolinha'], mesas: ['salvia'],
  ativo: { dado: 'marfim', icone: 'bolinha', mesa: 'salvia' }, solo_dia: '', solo_hoje: 0, solo_rating: 1000, solo_pico: 1000, extras: {},
  criado: new Date().toISOString(),
});
const CAMPOS_JSON = ['cartas', 'dados', 'icones', 'mesas', 'ativo', 'extras'];
const CAMPOS_EDITAVEIS = ['rating', 'pico', 'partidas', 'vitorias', 'moedas', 'xp', 'cartas', 'dados', 'icones', 'mesas', 'ativo', 'solo_dia', 'solo_hoje', 'solo_rating', 'solo_pico', 'extras'];
const hoje = () => new Date().toISOString().slice(0, 10);
// o que a conta mostra ao próprio dono (nunca a senha)
const perfil = c => c && ({
  id: c.id, nome: c.nome, rating: c.rating, pico: c.pico, partidas: c.partidas, vitorias: c.vitorias, moedas: c.moedas, xp: c.xp,
  cartas: c.cartas, dados: c.dados, icones: c.icones, mesas: c.mesas, ativo: c.ativo, solo_rating: c.solo_rating, solo_pico: c.solo_pico,
  extras: c.extras || {}, titulo: Regras.tituloDe(c.rating), nivel: Regras.nivelDe(c.xp),
});
// o que os outros veem de uma conta (amigos, ranking)
const publico = c => ({ id: c.id, nome: c.nome, rating: c.rating, partidas: c.partidas, vitorias: c.vitorias, icone: (typeof c.ativo === 'string' ? JSON.parse(c.ativo) : c.ativo).icone });
// ordem do ranking: rating, depois vitórias
const acima = (o, e) => o.rating > e.rating || (o.rating === e.rating && o.vitorias > e.vitorias);

class BancoMemoria {
  constructor(arquivo = null) {
    this.arquivo = arquivo; this.contas = []; this.partidas = []; this.amizades = []; this.proximo = 1; this.config = {};
    if (arquivo && fs.existsSync(arquivo)) Object.assign(this, JSON.parse(fs.readFileSync(arquivo, 'utf8')));
    if (!this.amizades) this.amizades = [];
  }
  async iniciar() {
    // contas antigas tinham só o nome em minúsculas como chave: passam para a chave nova (sem acentos e separadores)
    let mudou = false;
    for (const c of this.contas) {
      const k = chaveDoNome(c.nome);
      if (c.chave !== k && !this.contas.some(o => o !== c && o.chave === k)) { c.chave = k; mudou = true; }
    }
    if (mudou) this._gravar();
  }
  _gravar() {
    if (!this.arquivo) return;
    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
    fs.writeFileSync(this.arquivo, JSON.stringify({ contas: this.contas, partidas: this.partidas, amizades: this.amizades, proximo: this.proximo, config: this.config }));
  }
  async criarConta(nome, senha) {
    if (this.contas.some(c => c.chave === chaveDoNome(nome))) return null;
    const c = contaNova(this.proximo++, nome, senha); this.contas.push(c); this._gravar(); return { ...c };
  }
  async contaPorNome(nome) {
    // uma conta antiga que não pôde migrar (colidiu com outra) guarda a chave antiga, o nome em minúsculas: quem digita
    // exatamente esse nome entra nela; fora isso vale a chave nova (sem acentos e separadores)
    const c = this.contas.find(x => x.chave === String(nome).trim().toLowerCase()) || this.contas.find(x => x.chave === chaveDoNome(nome));
    return c ? JSON.parse(JSON.stringify(c)) : null;
  }
  async contaPorId(id) { const c = this.contas.find(x => x.id === id); return c ? JSON.parse(JSON.stringify(c)) : null; }
  async atualizarConta(id, campos) {
    const c = this.contas.find(x => x.id === id); if (!c) return null;
    for (const k of Object.keys(campos)) if (CAMPOS_EDITAVEIS.includes(k)) c[k] = JSON.parse(JSON.stringify(campos[k]));
    this._gravar(); return JSON.parse(JSON.stringify(c));
  }
  async ranking(limite = 50) {
    return this.contas.filter(c => c.partidas > 0).sort((a, b) => b.rating - a.rating || b.vitorias - a.vitorias).slice(0, limite).map(publico);
  }
  // o que é público de várias contas de uma vez (a lista de quem está online)
  async contasPorIds(ids) { const s = new Set(ids); return this.contas.filter(c => s.has(c.id)).map(publico); }
  // posição no ranking global (null se a conta ainda não jogou online) e quantos estão nele
  async posicaoNoRanking(id) {
    const e = this.contas.find(x => x.id === id), noRanking = this.contas.filter(c => c.partidas > 0);
    return { posicao: e && e.partidas > 0 ? 1 + noRanking.filter(o => acima(o, e)).length : null, total: noRanking.length };
  }
  async registrarPartida(p) { this.partidas.push({ ...p, id: this.partidas.length + 1, dia: hoje(), criado: new Date().toISOString() }); this._gravar(); }
  // quantas partidas valendo moedas este par já jogou hoje (contra conluio de duas contas)
  async partidasDoParHoje(a, b) { const d = hoje(); return this.partidas.filter(p => p.dia === d && ((p.a === a && p.b === b) || (p.a === b && p.b === a))).length; }

  // ---------- amizades: um pedido (de → para) vira amizade quando "para" aceita ----------
  async amizade(a, b) { const r = this.amizades.find(x => (x.de === a && x.para === b) || (x.de === b && x.para === a)); return r ? { ...r } : null; }
  async pedirAmizade(de, para) {
    if (await this.amizade(de, para)) return false;
    this.amizades.push({ de, para, aceita: false, criado: new Date().toISOString() }); this._gravar(); return true;
  }
  async aceitarAmizade(de, para) {
    const r = this.amizades.find(x => x.de === de && x.para === para && !x.aceita); if (!r) return false;
    r.aceita = true; this._gravar(); return true;
  }
  async desfazerAmizade(a, b) {
    const antes = this.amizades.length;
    this.amizades = this.amizades.filter(x => !((x.de === a && x.para === b) || (x.de === b && x.para === a)));
    if (this.amizades.length !== antes) this._gravar();
    return antes !== this.amizades.length;
  }
  // amigos e pedidos de uma conta, com o que é público de cada outra conta
  async amizadesDe(id) {
    return this.amizades.filter(x => x.de === id || x.para === id).map(x => {
      const outro = this.contas.find(c => c.id === (x.de === id ? x.para : x.de));
      return outro && { ...publico(outro), aceita: x.aceita, enviado: x.de === id };
    }).filter(Boolean);
  }

  // um valor de configuração que nasce uma vez e fica (ex.: o segredo dos tokens, quando SEGREDO não foi definido)
  async valorFixo(chave, criar) {
    if (!this.config) this.config = {};
    if (!this.config[chave]) { this.config[chave] = criar(); this._gravar(); }
    return this.config[chave];
  }
  async fechar() {}
}

class BancoPostgres {
  constructor(pool) { this.pool = pool; }
  async iniciar() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS contas (
      id SERIAL PRIMARY KEY, nome TEXT NOT NULL, chave TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL, sal TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 1000, pico INTEGER NOT NULL DEFAULT 1000, partidas INTEGER NOT NULL DEFAULT 0,
      vitorias INTEGER NOT NULL DEFAULT 0, moedas INTEGER NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0,
      cartas JSONB NOT NULL, dados JSONB NOT NULL, icones JSONB NOT NULL, mesas JSONB NOT NULL, ativo JSONB NOT NULL,
      solo_dia TEXT NOT NULL DEFAULT '', solo_hoje INTEGER NOT NULL DEFAULT 0,
      solo_rating INTEGER NOT NULL DEFAULT 1000, solo_pico INTEGER NOT NULL DEFAULT 1000, criado TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS partidas (
      id SERIAL PRIMARY KEY, a INTEGER NOT NULL, b INTEGER NOT NULL, vencedor INTEGER, placar TEXT NOT NULL,
      rodadas INTEGER NOT NULL, moedas INTEGER NOT NULL DEFAULT 0, dia TEXT NOT NULL, criado TIMESTAMPTZ NOT NULL DEFAULT now())`);
    // colunas que chegaram depois da primeira versão (bancos já criados ganham a coluna sem perder nada)
    await this.pool.query("ALTER TABLE contas ADD COLUMN IF NOT EXISTS extras JSONB NOT NULL DEFAULT '{}'::jsonb");
    await this.pool.query('CREATE INDEX IF NOT EXISTS contas_rating ON contas (rating DESC)');
    await this.pool.query('CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)');
    await this.pool.query('CREATE INDEX IF NOT EXISTS partidas_dia ON partidas (dia)');
    // amizades: um pedido (de → para) vira amizade quando "para" aceita; some junto com a conta
    await this.pool.query(`CREATE TABLE IF NOT EXISTS amizades (
      de INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE, para INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
      aceita BOOLEAN NOT NULL DEFAULT false, criado TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (de, para))`);
    await this.pool.query('CREATE INDEX IF NOT EXISTS amizades_para ON amizades (para)');
    await this.migrarChaves();
  }
  // contas antigas tinham só o nome em minúsculas como chave: passam (uma vez) para a chave nova, sem acentos e separadores.
  // Se duas contas antigas viram a mesma chave, a segunda fica com a antiga (e continua entrando pelo nome em minúsculas).
  async migrarChaves() {
    const feito = await this.pool.query("SELECT 1 FROM config WHERE chave = 'chaves_v2'");
    if (feito.rows.length) return;
    const { rows } = await this.pool.query('SELECT id, nome, chave FROM contas ORDER BY id');
    for (const r of rows) {
      const k = chaveDoNome(r.nome);
      if (k === r.chave) continue;
      try { await this.pool.query('UPDATE contas SET chave = $1 WHERE id = $2', [k, r.id]); }
      catch (e) { if (e.code === '23505') console.warn(`nome parecido com outro já existente, ficou com a chave antiga: ${r.nome}`); else throw e; }
    }
    await this.pool.query("INSERT INTO config (chave, valor) VALUES ('chaves_v2', 'ok') ON CONFLICT (chave) DO NOTHING");
  }
  _linha(r) { if (!r) return null; const c = { ...r }; for (const k of CAMPOS_JSON) if (typeof c[k] === 'string') c[k] = JSON.parse(c[k]); if (c.criado instanceof Date) c.criado = c.criado.toISOString(); return c; }
  async criarConta(nome, senha) {
    const c = contaNova(0, nome, senha);
    try {
      const r = await this.pool.query(`INSERT INTO contas (nome, chave, senha_hash, sal, cartas, dados, icones, mesas, ativo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [c.nome, c.chave, c.senha_hash, c.sal, JSON.stringify(c.cartas), JSON.stringify(c.dados), JSON.stringify(c.icones), JSON.stringify(c.mesas), JSON.stringify(c.ativo)]);
      return this._linha(r.rows[0]);
    } catch (e) { if (e.code === '23505') return null; throw e; }   // a chave é UNIQUE: duas criações ao mesmo tempo, só uma passa
  }
  async contaPorNome(nome) {
    // a chave antiga exata (conta que não pôde migrar) vem antes da chave nova; veja BancoMemoria.contaPorNome
    const r = await this.pool.query('SELECT * FROM contas WHERE chave = $1 OR chave = $2 ORDER BY (chave = $2) DESC LIMIT 1', [chaveDoNome(nome), String(nome).trim().toLowerCase()]);
    return this._linha(r.rows[0]);
  }
  async contaPorId(id) { const r = await this.pool.query('SELECT * FROM contas WHERE id = $1', [id]); return this._linha(r.rows[0]); }
  async atualizarConta(id, campos) {
    const ks = Object.keys(campos).filter(k => CAMPOS_EDITAVEIS.includes(k)); if (!ks.length) return this.contaPorId(id);
    const sets = ks.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const vals = ks.map(k => (CAMPOS_JSON.includes(k) ? JSON.stringify(campos[k]) : campos[k]));
    const r = await this.pool.query(`UPDATE contas SET ${sets} WHERE id = $1 RETURNING *`, [id, ...vals]);
    return this._linha(r.rows[0]);
  }
  async ranking(limite = 50) {
    const r = await this.pool.query('SELECT id, nome, rating, partidas, vitorias, ativo FROM contas WHERE partidas > 0 ORDER BY rating DESC, vitorias DESC LIMIT $1', [limite]);
    return r.rows.map(publico);
  }
  async contasPorIds(ids) {
    if (!ids.length) return [];
    const r = await this.pool.query('SELECT id, nome, rating, partidas, vitorias, ativo FROM contas WHERE id = ANY($1)', [ids]);
    return r.rows.map(publico);
  }
  async posicaoNoRanking(id) {
    const r = await this.pool.query(`SELECT e.partidas > 0 AS joga,
      (SELECT count(*)::int FROM contas o WHERE o.partidas > 0 AND (o.rating > e.rating OR (o.rating = e.rating AND o.vitorias > e.vitorias))) AS acima,
      (SELECT count(*)::int FROM contas WHERE partidas > 0) AS total FROM contas e WHERE e.id = $1`, [id]);
    const x = r.rows[0];
    return { posicao: x && x.joga ? x.acima + 1 : null, total: x ? x.total : 0 };
  }
  async registrarPartida(p) {
    await this.pool.query('INSERT INTO partidas (a, b, vencedor, placar, rodadas, moedas, dia) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [p.a, p.b, p.vencedor, p.placar, p.rodadas, p.moedas || 0, hoje()]);
  }
  async partidasDoParHoje(a, b) {
    const r = await this.pool.query('SELECT count(*)::int AS n FROM partidas WHERE dia = $1 AND ((a = $2 AND b = $3) OR (a = $3 AND b = $2))', [hoje(), a, b]);
    return r.rows[0].n;
  }

  // ---------- amizades ----------
  async amizade(a, b) {
    const r = await this.pool.query('SELECT de, para, aceita FROM amizades WHERE (de = $1 AND para = $2) OR (de = $2 AND para = $1) LIMIT 1', [a, b]);
    return r.rows[0] || null;
  }
  async pedirAmizade(de, para) {
    // um pedido por par, em qualquer direção (a trava por conta no app evita dois pedidos cruzados ao mesmo tempo)
    if (await this.amizade(de, para)) return false;
    const r = await this.pool.query('INSERT INTO amizades (de, para) VALUES ($1, $2) ON CONFLICT DO NOTHING', [de, para]);
    return r.rowCount > 0;
  }
  async aceitarAmizade(de, para) {
    const r = await this.pool.query('UPDATE amizades SET aceita = true WHERE de = $1 AND para = $2 AND NOT aceita', [de, para]);
    return r.rowCount > 0;
  }
  async desfazerAmizade(a, b) {
    const r = await this.pool.query('DELETE FROM amizades WHERE (de = $1 AND para = $2) OR (de = $2 AND para = $1)', [a, b]);
    return r.rowCount > 0;
  }
  async amizadesDe(id) {
    const r = await this.pool.query(`SELECT a.de, a.aceita, c.id, c.nome, c.rating, c.partidas, c.vitorias, c.ativo
      FROM amizades a JOIN contas c ON c.id = CASE WHEN a.de = $1 THEN a.para ELSE a.de END
      WHERE a.de = $1 OR a.para = $1`, [id]);
    return r.rows.map(x => ({ ...publico(x), aceita: x.aceita, enviado: x.de === id }));
  }

  async valorFixo(chave, criar) {
    await this.pool.query('INSERT INTO config (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING', [chave, criar()]);
    return (await this.pool.query('SELECT valor FROM config WHERE chave = $1', [chave])).rows[0].valor;
  }
  async fechar() { await this.pool.end(); }
}

async function criarBanco({ url = process.env.DATABASE_URL, arquivo = null } = {}) {
  let banco;
  if (url) {
    const { Pool } = require('pg');
    const local = /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
    const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 8, connectionTimeoutMillis: 10_000 });
    pool.on('error', e => console.error('postgres:', e.message));   // conexão ociosa caiu: o pool abre outra, o processo não cai
    banco = new BancoPostgres(pool);
    try { await banco.iniciar(); } catch (e) { await pool.end().catch(() => {}); throw e; }
    return banco;
  }
  banco = new BancoMemoria(arquivo);
  await banco.iniciar();
  return banco;
}

module.exports = { criarBanco, BancoMemoria, BancoPostgres, hoje, perfil, publico };
