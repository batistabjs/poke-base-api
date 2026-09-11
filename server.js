const http = require('http');
const url = require('url');
const jwt = require('./jwt');
const dados = require('./dados');
const crypto = require('crypto');

const PORT = 8082;

const TIPOS_PERMITIDOS = [
  'normal', 'fogo', 'agua', 'eletrico', 'grama', 'gelo',
  'luta', 'venenoso', 'terrenoso', 'voador', 'psiquico',
  'inseto', 'pedra', 'fantasma', 'dragao', 'noturno', 'aco', 'fada',
];

const GERACOES_PERMITIDAS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const REGIOES_PERMITIDAS = [
  'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea',
];

const CLASSES_PERMITIDAS = ['lendario', 'mitico', 'normal'];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function checkAuth(req) {
  const token = jwt.getTokenFromHeader(req);
  if (!token) return { error: 'Usuário não autenticado', status: 401 };
  const userId = jwt.getUserIdFromToken(token);
  if (!userId) return { error: 'Chave de acesso inválida', status: 403 };
  return { userId };
}

function parseQuery(queryString) {
  const params = {};
  if (!queryString) return params;
  for (const [key, value] of new URLSearchParams(queryString)) {
    params[key] = value;
  }
  return params;
}

function matchRoute(method, path) {
  const routes = {
    GET: [
      { pattern: /^\/pokemons\/tipo\/([^/]+)$/, handler: 'byTipo' },
      { pattern: /^\/pokemons\/tipo-secundario\/([^/]+)$/, handler: 'byTipoSecundario' },
      { pattern: /^\/pokemons\/geracao\/(\d+)$/, handler: 'byGeracao' },
      { pattern: /^\/pokemons\/regiao\/([^/]+)$/, handler: 'byRegiao' },
      { pattern: /^\/pokemons\/classe\/([^/]+)$/, handler: 'byClasse' },
      { pattern: /^\/pokemons\/buscar$/, handler: 'search' },
      { pattern: /^\/pokemons\/estatisticas$/, handler: 'stats' },
      { pattern: /^\/pokemons\/(\d+)$/, handler: 'show' },
      { pattern: /^\/pokemons$/, handler: 'index' },
      { pattern: /^\/auth\/me$/, handler: 'authMe' },
      { pattern: /^\/$/, handler: 'root' },
    ],
    POST: [
      { pattern: /^\/pokemons$/, handler: 'store' },
      { pattern: /^\/auth\/cadastro$/, handler: 'cadastro' },
      { pattern: /^\/auth\/login$/, handler: 'login' },
    ],
    PUT: [{ pattern: /^\/pokemons\/(\d+)$/, handler: 'update' }],
    DELETE: [{ pattern: /^\/pokemons\/(\d+)$/, handler: 'destroy' }],
  };

  const methodRoutes = routes[method];
  if (!methodRoutes) return null;

  for (const route of methodRoutes) {
    const match = path.match(route.pattern);
    if (match) {
      return { handler: route.handler, params: match.slice(1) };
    }
  }
  return null;
}

function validatePokemonData(data, isUpdate = false) {
  const errors = {};

  if (!isUpdate || 'nome' in data) {
    if (!data.nome) errors.nome = ['O campo nome é obrigatório'];
    else if (data.nome.length < 2) errors.nome = ['O nome deve ter pelo menos 2 caracteres'];
    else if (data.nome.length > 100) errors.nome = ['O nome deve ter no máximo 100 caracteres'];
  }

  if (!isUpdate || 'numero' in data) {
    if (!data.numero && data.numero !== 0) errors.numero = ['O campo número é obrigatório'];
    else if (data.numero < 1 || data.numero > 1025) errors.numero = ['O número deve estar entre 1 e 1025'];
  }

  if (!isUpdate || 'tipo_primario' in data) {
    if (!data.tipo_primario) errors.tipo_primario = ['O campo tipo primário é obrigatório'];
    else if (!TIPOS_PERMITIDOS.includes(data.tipo_primario))
      errors.tipo_primario = ['Tipo primário inválido'];
  }

  if (data.tipo_secundario && !TIPOS_PERMITIDOS.includes(data.tipo_secundario)) {
    errors.tipo_secundario = ['Tipo secundário inválido'];
  }

  if (data.geracao && !GERACOES_PERMITIDAS.includes(Number(data.geracao))) {
    errors.geracao = ['Geração inválida. Valores permitidos: 1 a 9'];
  }

  if (data.regiao && !REGIOES_PERMITIDAS.includes(data.regiao)) {
    errors.regiao = ['Região inválida'];
  }

  if (data.classe && !CLASSES_PERMITIDAS.includes(data.classe)) {
    errors.classe = ['Classe inválida. Valores permitidos: lendario, mitico, normal'];
  }

  if (data.altura !== undefined && data.altura !== null) {
    if (data.altura < 0 || data.altura > 99.9) errors.altura = ['A altura deve estar entre 0 e 99.9 metros'];
  }

  if (data.peso !== undefined && data.peso !== null) {
    if (data.peso < 0 || data.peso > 9999.9) errors.peso = ['O peso deve estar entre 0 e 9999.9 kg'];
  }

  for (const stat of ['hp', 'ataque', 'defesa', 'ataque_especial', 'defesa_especial', 'velocidade']) {
    if (data[stat] !== undefined && data[stat] !== null) {
      if (data[stat] < 1 || data[stat] > 255) errors[stat] = [`O campo ${stat} deve estar entre 1 e 255`];
    }
  }

  if (data.descricao && data.descricao.length > 2000) {
    errors.descricao = ['A descrição deve ter no máximo 2000 caracteres'];
  }

  if (data.url_sprite) {
    try {
      new URL(data.url_sprite);
      if (data.url_sprite.length > 500) errors.url_sprite = ['A URL do sprite deve ter no máximo 500 caracteres'];
    } catch {
      errors.url_sprite = ['URL do sprite inválida'];
    }
  }

  return errors;
}

const handlers = {
  root() {
    return {
      nome: 'Poke Base API',
      versao: '1.0.0',
      descricao: 'API RESTful para cadastro de Pokémons',
      endpoints: {
        autenticacao: {
          'POST /api/v1/auth/cadastro': 'Cadastrar novo usuário (retorna token)',
          'POST /api/v1/auth/login': 'Login (retorna token)',
          'GET /api/v1/auth/me': 'Dados do usuário autenticado (requer token)',
        },
        pokemons_publicos: {
          'GET /api/v1/pokemons': 'Listar todos os pokémons (paginação e filtros)',
          'GET /api/v1/pokemons/{id}': 'Buscar pokémon por ID',
          'GET /api/v1/pokemons/tipo/{tipo}': 'Listar por tipo primário',
          'GET /api/v1/pokemons/tipo-secundario/{tipo}': 'Listar por tipo secundário',
          'GET /api/v1/pokemons/geracao/{geracao}': 'Listar por geração',
          'GET /api/v1/pokemons/regiao/{regiao}': 'Listar por região',
          'GET /api/v1/pokemons/classe/{classe}': 'Listar por classe',
          'GET /api/v1/pokemons/buscar?q={termo}': 'Busca textual',
          'GET /api/v1/pokemons/estatisticas': 'Estatísticas',
        },
        pokemons_autenticados: {
          'POST /api/v1/pokemons': 'Criar novo pokémon (requer token)',
          'PUT /api/v1/pokemons/{id}': 'Atualizar pokémon (requer token)',
          'DELETE /api/v1/pokemons/{id}': 'Deletar pokémon (requer token)',
        },
      },
    };
  },

  index(req) {
    const query = parseQuery(req.url.split('?')[1]);
    const pagina = Number(query.pagina) || 1;
    const tamanhoPagina = Number(query.tamanho_pagina) || 10;
    const ordenarPor = query.ordenar_por || 'numero';
    const direcaoOrdenacao = (query.direcao_ordenacao || 'asc').toLowerCase();
    const busca = query.busca || null;
    const tipo = query.tipo || null;
    const geracao = query.geracao ? Number(query.geracao) : null;

    let pokemons = dados.getPokemons();

    if (busca) {
      const termo = busca.toLowerCase();
      pokemons = pokemons.filter(
        (p) => p.nome.toLowerCase().includes(termo) || (p.descricao && p.descricao.toLowerCase().includes(termo))
      );
    }

    if (tipo && TIPOS_PERMITIDOS.includes(tipo)) {
      pokemons = pokemons.filter((p) => p.tipo_primario === tipo || p.tipo_secundario === tipo);
    }

    if (geracao && GERACOES_PERMITIDAS.includes(geracao)) {
      pokemons = pokemons.filter((p) => p.geracao === geracao);
    }

    const camposPermitidos = ['id', 'nome', 'numero', 'tipo_primario', 'geracao', 'regiao', 'classe', 'created_at'];
    const campoOrdenacao = camposPermitidos.includes(ordenarPor) ? ordenarPor : 'numero';
    pokemons.sort((a, b) => {
      const valA = a[campoOrdenacao];
      const valB = b[campoOrdenacao];
      if (typeof valA === 'string') return direcaoOrdenacao === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      return direcaoOrdenacao === 'desc' ? valB - valA : valA - valB;
    });

    const totalRegistros = pokemons.length;
    const totalPaginas = Math.ceil(totalRegistros / tamanhoPagina);
    const inicio = (pagina - 1) * tamanhoPagina;
    const dadosPagina = pokemons.slice(inicio, inicio + tamanhoPagina);

    return {
      pagina_atual: pagina,
      tamanho_pagina: tamanhoPagina,
      total_registros: totalRegistros,
      total_paginas: totalPaginas,
      dados: dadosPagina,
    };
  },

  show(_req, params) {
    const pokemon = dados.getPokemonById(Number(params[0]));
    if (!pokemon) return { error: 'Pokémon não encontrado', status: 404 };
    return pokemon;
  },

  store(req, _params, body) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const errors = validatePokemonData(body);
    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    if (dados.getPokemonByNumero(body.numero)) {
      return { error: 'Propriedades inválidas', status: 422, errors: { numero: ['Este número de pokédex já está cadastrado'] } };
    }

    const pokemon = dados.createPokemon(body);
    return { status: 201, mensagem: 'Pokémon criado com sucesso', pokemon };
  },

  update(req, params, body) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const pokemon = dados.getPokemonById(Number(params[0]));
    if (!pokemon) return { error: 'Pokémon não encontrado', status: 404 };

    const errors = validatePokemonData(body, true);
    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    if (body.numero && dados.getPokemonByNumero(body.numero) && dados.getPokemonByNumero(body.numero).id !== pokemon.id) {
      return { error: 'Propriedades inválidas', status: 422, errors: { numero: ['Este número de pokédex já está cadastrado'] } };
    }

    const atualizado = dados.updatePokemon(pokemon.id, body);
    return { mensagem: 'Pokémon atualizado com sucesso', pokemon: atualizado };
  },

  destroy(req, params) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const pokemon = dados.getPokemonById(Number(params[0]));
    if (!pokemon) return { error: 'Pokémon não encontrado', status: 404 };

    dados.deletePokemon(pokemon.id);
    return { mensagem: 'Pokémon removido com sucesso' };
  },

  byTipo(_req, params) {
    const tipo = params[0];
    if (!TIPOS_PERMITIDOS.includes(tipo)) {
      return { error: 'Tipo inválido', status: 422, errors: { tipo: ['Tipo inválido'] } };
    }
    const pokemons = dados.getPokemons().filter((p) => p.tipo_primario === tipo || p.tipo_secundario === tipo);
    return { tipo, total: pokemons.length, dados: pokemons };
  },

  byTipoSecundario(_req, params) {
    const tipo = params[0];
    if (!TIPOS_PERMITIDOS.includes(tipo)) {
      return { error: 'Tipo inválido', status: 422, errors: { tipo: ['Tipo inválido'] } };
    }
    const pokemons = dados.getPokemons().filter((p) => p.tipo_secundario === tipo);
    return { tipo_secundario: tipo, total: pokemons.length, dados: pokemons };
  },

  byGeracao(_req, params) {
    const geracao = Number(params[0]);
    if (!GERACOES_PERMITIDAS.includes(geracao)) {
      return { error: 'Geração inválida', status: 422, errors: { geracao: ['Geração inválida'] } };
    }
    const pokemons = dados.getPokemons().filter((p) => p.geracao === geracao);
    return { geracao, total: pokemons.length, dados: pokemons };
  },

  byRegiao(_req, params) {
    const regiao = params[0];
    if (!REGIOES_PERMITIDAS.includes(regiao)) {
      return { error: 'Região inválida', status: 422, errors: { regiao: ['Região inválida'] } };
    }
    const pokemons = dados.getPokemons().filter((p) => p.regiao === regiao);
    return { regiao, total: pokemons.length, dados: pokemons };
  },

  byClasse(_req, params) {
    const classe = params[0];
    if (!CLASSES_PERMITIDAS.includes(classe)) {
      return { error: 'Classe inválida', status: 422, errors: { classe: ['Classe inválida'] } };
    }
    const pokemons = dados.getPokemons().filter((p) => p.classe === classe);
    return { classe, total: pokemons.length, dados: pokemons };
  },

  search(req) {
    const query = parseQuery(req.url.split('?')[1]);
    const termo = query.q || query.termo;
    if (!termo || termo.length < 2) {
      return { error: 'Termo de busca deve ter pelo menos 2 caracteres', status: 400 };
    }
    const termoLower = termo.toLowerCase();
    const pokemons = dados.getPokemons().filter(
      (p) => p.nome.toLowerCase().includes(termoLower) || (p.descricao && p.descricao.toLowerCase().includes(termoLower))
    );
    return { termo, total: pokemons.length, dados: pokemons };
  },

  stats() {
    const pokemons = dados.getPokemons();
    const porTipo = {};
    const porGeracao = {};
    const porRegiao = {};
    const porClasse = {};

    for (const p of pokemons) {
      porTipo[p.tipo_primario] = (porTipo[p.tipo_primario] || 0) + 1;
      porGeracao[p.geracao] = (porGeracao[p.geracao] || 0) + 1;
      if (p.regiao) porRegiao[p.regiao] = (porRegiao[p.regiao] || 0) + 1;
      porClasse[p.classe] = (porClasse[p.classe] || 0) + 1;
    }

    return {
      por_tipo: Object.entries(porTipo).map(([tipo_primario, total]) => ({ tipo_primario, total })).sort((a, b) => b.total - a.total),
      por_geracao: Object.entries(porGeracao).map(([geracao, total]) => ({ geracao: Number(geracao), total })).sort((a, b) => a.geracao - b.geracao),
      por_regiao: Object.entries(porRegiao).map(([regiao, total]) => ({ regiao, total })).sort((a, b) => b.total - a.total),
      por_classe: Object.entries(porClasse).map(([classe, total]) => ({ classe, total })).sort((a, b) => b.total - a.total),
      total: pokemons.length,
    };
  },

  cadastro(req, _params, body) {
    const errors = {};
    if (!body.nome) errors.nome = ['O campo nome é obrigatório'];
    else if (body.nome.length < 3) errors.nome = ['O nome deve ter no mínimo 3 caracteres'];

    if (!body.email) errors.email = ['O campo e-mail é obrigatório'];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.email = ['E-mail inválido'];

    if (!body.nome_usuario) errors.nome_usuario = ['O campo nome de usuário é obrigatório'];
    else if (body.nome_usuario.length < 3) errors.nome_usuario = ['O nome de usuário deve ter no mínimo 3 caracteres'];

    if (!body.senha) errors.senha = ['O campo senha é obrigatório'];
    else if (body.senha.length < 6) errors.senha = ['A senha deve ter um mínimo de 6 caracteres'];

    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    if (dados.getUsuarioByEmail(body.email)) {
      return { error: 'Propriedades inválidas', status: 422, errors: { email: ['Este e-mail já está em uso'] } };
    }

    const usuarios = dados.getUsuarios();
    if (usuarios.find((u) => u.nome_usuario === body.nome_usuario)) {
      return { error: 'Propriedades inválidas', status: 422, errors: { nome_usuario: ['Este nome de usuário já está em uso'] } };
    }

    const usuario = dados.createUsuario(body);
    const token = jwt.generateToken(usuario.id);
    return { status: 201, token_gerado: token, mensagem: 'Cadastro realizado com sucesso', usuario };
  },

  login(req, _params, body) {
    const errors = {};
    if (!body.email) errors.email = ['O campo e-mail é obrigatório'];
    if (!body.senha) errors.senha = ['O campo senha é obrigatório'];
    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    const usuario = dados.getUsuarioByEmail(body.email);
    if (!usuario) return { error: 'E-mail ou senha inválidos', status: 422, errors: { email: ['E-mail ou senha inválidos'] } };

    const senhaHash = crypto.createHash('sha256').update(body.senha).digest('hex');
    if (senhaHash !== usuario.senha) {
      return { error: 'E-mail ou senha inválidos', status: 422, errors: { senha: ['E-mail ou senha inválidos'] } };
    }

    const token = jwt.generateToken(usuario.id);
    return {
      token_gerado: token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, nome_usuario: usuario.nome_usuario },
    };
  },

  authMe(req) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const usuario = dados.getUsuarioById(auth.userId);
    if (!usuario) return { error: 'Usuário não encontrado', status: 404 };
    return { usuario };
  },
};

async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  let path = parsedUrl.pathname.replace(/^\/api\/v1/, '') || '/';
  path = path.replace(/\/$/, '');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const route = matchRoute(req.method, path);
  if (!route) {
    return sendJson(res, 404, { mensagem: 'Rota não encontrada' });
  }

  try {
    let body = {};
    if (['POST', 'PUT'].includes(req.method)) {
      body = await getRequestBody(req);
    }

    const result = handlers[route.handler](req, route.params, body);

    if (result.status) {
      return sendJson(res, result.status, result);
    }

    return sendJson(res, 200, result);
  } catch (err) {
    console.error('Erro:', err);
    return sendJson(res, 500, { mensagem: 'Erro interno do servidor' });
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Poke Base API rodando em http://localhost:${PORT}`);
  console.log(`Documentação: http://localhost:${PORT}/api/v1`);
});
