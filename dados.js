const fs = require('fs');
const path = require('path');

const DADOS_DIR = path.join(__dirname, 'dados');

function ensureDadosDir() {
  if (!fs.existsSync(DADOS_DIR)) {
    fs.mkdirSync(DADOS_DIR, { recursive: true });
  }
}

function readJson(filename) {
  ensureDadosDir();
  const filePath = path.join(DADOS_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeJson(filename, data) {
  ensureDadosDir();
  const filePath = path.join(DADOS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getProximoId(items) {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

// Pokémons
function getPokemons() {
  return readJson('pokemons.json');
}

function savePokemons(pokemons) {
  writeJson('pokemons.json', pokemons);
}

function getPokemonById(id) {
  return getPokemons().find((p) => p.id === id) || null;
}

function getPokemonByNumero(numero) {
  return getPokemons().find((p) => p.numero === numero) || null;
}

function createPokemon(data) {
  const pokemons = getPokemons();
  const now = new Date().toISOString();
  const pokemon = {
    id: getProximoId(pokemons),
    nome: data.nome,
    numero: data.numero,
    tipo_primario: data.tipo_primario,
    tipo_secundario: data.tipo_secundario || null,
    geracao: data.geracao || 1,
    regiao: data.regiao || null,
    classe: data.classe || 'normal',
    altura: data.altura || null,
    peso: data.peso || null,
    hp: data.hp || null,
    ataque: data.ataque || null,
    defesa: data.defesa || null,
    ataque_especial: data.ataque_especial || null,
    defesa_especial: data.defesa_especial || null,
    velocidade: data.velocidade || null,
    descricao: data.descricao || null,
    url_sprite: data.url_sprite || null,
    created_at: now,
    updated_at: now,
  };
  pokemons.push(pokemon);
  savePokemons(pokemons);
  return pokemon;
}

function updatePokemon(id, data) {
  const pokemons = getPokemons();
  const index = pokemons.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const camposPermitidos = [
    'nome', 'numero', 'tipo_primario', 'tipo_secundario', 'geracao', 'regiao', 'classe',
    'altura', 'peso', 'hp', 'ataque', 'defesa', 'ataque_especial', 'defesa_especial', 'velocidade',
    'descricao', 'url_sprite',
  ];

  for (const campo of camposPermitidos) {
    if (campo in data) {
      pokemons[index][campo] = data[campo];
    }
  }
  pokemons[index].updated_at = new Date().toISOString();
  savePokemons(pokemons);
  return pokemons[index];
}

function deletePokemon(id) {
  const pokemons = getPokemons();
  const index = pokemons.findIndex((p) => p.id === id);
  if (index === -1) return false;
  pokemons.splice(index, 1);
  savePokemons(pokemons);
  return true;
}

// Usuários
function getUsuarios() {
  return readJson('usuarios.json');
}

function saveUsuarios(usuarios) {
  writeJson('usuarios.json', usuarios);
}

function getUsuarioById(id) {
  const usuario = getUsuarios().find((u) => u.id === id);
  if (!usuario) return null;
  const { senha, ...rest } = usuario;
  return rest;
}

function getUsuarioByEmail(email) {
  return getUsuarios().find((u) => u.email === email) || null;
}

function createUsuario(data) {
  const crypto = require('crypto');
  const usuarios = getUsuarios();
  const now = new Date().toISOString();
  const usuario = {
    id: getProximoId(usuarios),
    nome: data.nome,
    email: data.email,
    nome_usuario: data.nome_usuario,
    senha: crypto.createHash('sha256').update(data.senha).digest('hex'),
    created_at: now,
    updated_at: now,
  };
  usuarios.push(usuario);
  saveUsuarios(usuarios);
  const { senha, ...rest } = usuario;
  return rest;
}

module.exports = {
  getPokemons,
  getPokemonById,
  getPokemonByNumero,
  createPokemon,
  updatePokemon,
  deletePokemon,
  getUsuarios,
  getUsuarioById,
  getUsuarioByEmail,
  createUsuario,
};
