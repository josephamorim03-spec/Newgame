// Dice Duel · banco de dados
// Postgres quando há DATABASE_URL (Railway); senão, memória com cópia num arquivo JSON (desenvolvimento e testes).
// As duas implementações têm a mesma interface.
'use strict';
const fs = require('fs');
const path = require('path');
const Regras = require('../shared/regras');

const contaNova = (id, nome, senha) => ({
  id, nome, chave: nome.toLowerCase(), senha_hash: senha.hash, sal: senha.sal,
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

class BancoMemoria {
  constructor(arquivo = null) {
    this.arquivo = arquivo; this.contas = []; this.partidas = []; this.proximo = 1;
    if (arquivo && fs.existsSync(arquivo)) Object.assign(this, JSON.parse(fs.readFileSync(arquivo, 'utf8')));
  }
  async iniciar() {}
  _gravar() {
    if (!this.arquivo) return;
    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
    fs.writeFileSync(this.arquivo, JSON.stringify({ contas: this.contas, partidas: this.partidas, proximo: this.proximo }));
  }
  async criarConta(nome, senha) {
    if (this.contas.some(c => c.chave === nome.toLowerCase())) return null;
    const c = contaNova(this.proximo++, nome, senha); this.contas.push(c); this._gravar(); return { ...c };
  }
  async contaPorNome(nome) { const c = this.contas.find(x => x.chave === nome.toLowerCase()); return c ? JSON.parse(JSON.stringify(c)) : null; }
  async contaPorId(id) { const c = this.contas.find(x => x.id === id); return c ? JSON.parse(JSON.stringify(c)) : null; }
  async atualizarConta(id, campos) {
    const c = this.contas.find(x => x.id === id); if (!c) return null;
    for (const k of Object.keys(campos)) if (CAMPOS_EDITAVEIS.includes(k)) c[k] = JSON.parse(JSON.stringify(campos[k]));
    this._gravar(); return JSON.parse(JSON.stringify(c));
  }
  async ranking(limite = 50) {
    return this.contas.filter(c => c.partidas > 0).sort((a, b) => b.rating - a.rating || b.vitorias - a.vitorias).slice(0, limite)
      .map(c => ({ nome: c.nome, rating: c.rating, partidas: c.partidas, vitorias: c.vitorias, icone: c.ativo.icone }));
  }
  async registrarPartida(p) { this.partidas.push({ ...p, id: this.partidas.length + 1, dia: hoje(), criado: new Date().toISOString() }); this._gravar(); }
  // quantas partidas valendo moedas este par já jogou hoje (contra conluio de duas contas)
  async partidasDoParHoje(a, b) { const d = hoje(); return this.partidas.filter(p => p.dia === d && ((p.a === a && p.b === b) || (p.a === b && p.b === a))).length; }
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
    await this.pool.query('CREATE INDEX IF NOT EXISTS partidas_dia ON partidas (dia)');
  }
  _linha(r) { if (!r) return null; const c = { ...r }; for (const k of CAMPOS_JSON) if (typeof c[k] === 'string') c[k] = JSON.parse(c[k]); if (c.criado instanceof Date) c.criado = c.criado.toISOString(); return c; }
  async criarConta(nome, senha) {
    const c = contaNova(0, nome, senha);
    try {
      const r = await this.pool.query(`INSERT INTO contas (nome, chave, senha_hash, sal, cartas, dados, icones, mesas, ativo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [c.nome, c.chave, c.senha_hash, c.sal, JSON.stringify(c.cartas), JSON.stringify(c.dados), JSON.stringify(c.icones), JSON.stringify(c.mesas), JSON.stringify(c.ativo)]);
      return this._linha(r.rows[0]);
    } catch (e) { if (e.code === '23505') return null; throw e; }
  }
  async contaPorNome(nome) { const r = await this.pool.query('SELECT * FROM contas WHERE chave = $1', [nome.toLowerCase()]); return this._linha(r.rows[0]); }
  async contaPorId(id) { const r = await this.pool.query('SELECT * FROM contas WHERE id = $1', [id]); return this._linha(r.rows[0]); }
  async atualizarConta(id, campos) {
    const ks = Object.keys(campos).filter(k => CAMPOS_EDITAVEIS.includes(k)); if (!ks.length) return this.contaPorId(id);
    const sets = ks.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const vals = ks.map(k => (CAMPOS_JSON.includes(k) ? JSON.stringify(campos[k]) : campos[k]));
    const r = await this.pool.query(`UPDATE contas SET ${sets} WHERE id = $1 RETURNING *`, [id, ...vals]);
    return this._linha(r.rows[0]);
  }
  async ranking(limite = 50) {
    const r = await this.pool.query('SELECT nome, rating, partidas, vitorias, ativo FROM contas WHERE partidas > 0 ORDER BY rating DESC, vitorias DESC LIMIT $1', [limite]);
    return r.rows.map(x => ({ nome: x.nome, rating: x.rating, partidas: x.partidas, vitorias: x.vitorias, icone: (typeof x.ativo === 'string' ? JSON.parse(x.ativo) : x.ativo).icone }));
  }
  async registrarPartida(p) {
    await this.pool.query('INSERT INTO partidas (a, b, vencedor, placar, rodadas, moedas, dia) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [p.a, p.b, p.vencedor, p.placar, p.rodadas, p.moedas || 0, hoje()]);
  }
  async partidasDoParHoje(a, b) {
    const r = await this.pool.query('SELECT count(*)::int AS n FROM partidas WHERE dia = $1 AND ((a = $2 AND b = $3) OR (a = $3 AND b = $2))', [hoje(), a, b]);
    return r.rows[0].n;
  }
  async fechar() { await this.pool.end(); }
}

async function criarBanco({ url = process.env.DATABASE_URL, arquivo = null } = {}) {
  let banco;
  if (url) {
    const { Pool } = require('pg');
    const local = /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
    banco = new BancoPostgres(new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 8 }));
  } else banco = new BancoMemoria(arquivo);
  await banco.iniciar();
  return banco;
}

module.exports = { criarBanco, BancoMemoria, BancoPostgres, hoje, perfil };
