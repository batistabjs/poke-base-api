# Poke Base API

API RESTful para cadastro e gerenciamento de Pokémons.

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **JSON** - Armazenamento de dados em arquivos
- **JWT (JSON Web Tokens)** - Autenticação

## Estrutura do Projeto

```
poke-base-api-js/
├── dados/
│   ├── pokemons.json         # Dados dos pokémons
│   └── usuarios.json         # Dados dos usuários
├── dados.js                  # Módulo de acesso aos dados
├── jwt.js                    # Autenticação JWT
├── package.json              # Dependências do projeto
├── server.js                 # Ponto de entrada / servidor
└── README.md                 # Este arquivo
```

## Autenticação

### Como Funciona

- **Endpoints GET** são **PÚBLICOS** - não requerem autenticação
- **Endpoints POST/PUT/DELETE** requerem autenticação via Token JWT
- Exceção: `auth/cadastro` e `auth/login` são públicos

### Obtendo um Token

1. Cadastre-se: `POST /api/v1/auth/cadastro`
2. Faça login: `POST /api/v1/auth/login`

### Usando o Token

Inclua o header `Authorization` em requisições autenticadas:

```
Authorization: Bearer SEU_TOKEN_AQUI
```

### Usuários Padrão (Seed)

| Email | Senha | Nome |
|-------|-------|------|
| admin@pokebase.com | 123456 | Administrador |
| ash@pokebase.com | 123456 | Ash Ketchum |
| misty@pokebase.com | 123456 | Misty Waterflower |

## Tipos de Pokémon Suportados

| Tipo | Tipo |
|------|------|
| **normal** | Normal |
| **fogo** | Fogo |
| **agua** | Água |
| **eletrico** | Elétrico |
| **grama** | Grama |
| **gelo** | Gelo |
| **luta** | Lutador |
| **venenoso** | Venenoso |
| **terrenoso** | Terrestre |
| **voador** | Voador |
| **psiquico** | Psíquico |
| **inseto** | Inseto |
| **pedra** | Pedra |
| **fantasma** | Fantasma |
| **dragao** | Dragão |
| **noturno** | Noturno |
| **aco** | Aço |
| **fada** | Fada |

## Regiões Suportadas

| Região | Geração |
|--------|---------|
| Kanto | 1 |
| Johto | 2 |
| Hoenn | 3 |
| Sinnoh | 4 |
| Unova | 5 |
| Kalos | 6 |
| Alola | 7 |
| Galar | 8 |
| Paldea | 9 |

## Classes de Pokémon

| Classe | Descrição |
|--------|-----------|
| **normal** | Pokémon comuns |
| **lendario** | Pokémon lendários |
| **mitico** | Pokémon míticos |

## Instalação

### 1. Instalar Node.js

Certifique-se de que o Node.js esteja instalado:
```
node -v
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Iniciar o servidor

```bash
npm start
```

Ou para desenvolvimento com auto-reload:
```bash
npm run dev
```

### 4. Testar a API

```
http://localhost:8080
```

## Endpoints da API

### Autenticação (Públicos)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| POST | /api/v1/auth/cadastro | Cadastrar novo usuário | Não |
| POST | /api/v1/auth/login | Login (retorna token) | Não |
| GET | /api/v1/auth/me | Dados do usuário logado | Sim |

### Pokémons - Consultas (Públicas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/v1/pokemons | Listar todos os pokémons |
| GET | /api/v1/pokemons/{id} | Buscar pokémon por ID |
| GET | /api/v1/pokemons/tipo/{tipo} | Filtrar por tipo |
| GET | /api/v1/pokemons/tipo-secundario/{tipo} | Filtrar por tipo secundário |
| GET | /api/v1/pokemons/geracao/{geracao} | Filtrar por geração |
| GET | /api/v1/pokemons/regiao/{regiao} | Filtrar por região |
| GET | /api/v1/pokemons/classe/{classe} | Filtrar por classe |
| GET | /api/v1/pokemons/buscar?q={termo} | Busca textual |
| GET | /api/v1/pokemons/estatisticas | Estatísticas |

### Pokémons - Cadastro (Autenticados)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/v1/pokemons | Criar novo pokémon |
| PUT | /api/v1/pokemons/{id} | Atualizar pokémon |
| DELETE | /api/v1/pokemons/{id} | Deletar pokémon |

## Parâmetros de Paginação e Filtros

Para o endpoint `GET /api/v1/pokemons`:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| pagina | int | Número da página (padrão: 1) |
| tamanho_pagina | int | Itens por página (padrão: 10) |
| ordenar_por | string | Campo para ordenar (padrão: numero) |
| direcao_ordenacao | string | asc ou desc (padrão: asc) |
| busca | string | Busca em nome e descrição |
| tipo | string | Tipo primário ou secundário |
| geracao | int | Geração (1-9) |

## Exemplos de Uso

### Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pokebase.com",
    "senha": "123456"
  }'
```

Resposta (200 OK):

```json
{
  "token_gerado": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@pokebase.com",
    "nome_usuario": "admin"
  }
}
```

### Listar Pokémons (Público - Sem Token)

```bash
# Listar todos
curl "http://localhost:8080/api/v1/pokemons"

# Filtrar por tipo
curl "http://localhost:8080/api/v1/pokemons?tipo=eletrico"

# Filtrar por geração
curl "http://localhost:8080/api/v1/pokemons?geracao=1"

# Buscar por nome
curl "http://localhost:8080/api/v1/pokemons?busca=pikachu"

# Paginação
curl "http://localhost:8080/api/v1/pokemons?pagina=2&tamanho_pagina=5"
```

### Criar Pokémon (Autenticado)

```bash
curl -X POST http://localhost:8080/api/v1/pokemons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "nome": "Pikachu",
    "numero": 25,
    "tipo_primario": "eletrico",
    "geracao": 1,
    "regiao": "Kanto",
    "classe": "normal",
    "altura": 0.4,
    "peso": 6.0,
    "hp": 35,
    "ataque": 55,
    "defesa": 40,
    "ataque_especial": 50,
    "defesa_especial": 50,
    "velocidade": 90,
    "descricao": "Quando vários deles se reúnem, sua eletricidade pode causar tempestades.",
    "url_sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
  }'
```

### Atualizar Pokémon (Autenticado)

```bash
curl -X PUT http://localhost:8080/api/v1/pokemons/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "descricao": "Descrição atualizada do Pokémon",
    "url_sprite": "https://example.com/novo-sprite.png"
  }'
```

### Deletar Pokémon (Autenticado)

```bash
curl -X DELETE http://localhost:8080/api/v1/pokemons/1 \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Status Codes

| Código | Descrição |
|--------|-----------|
| 200 | OK - Sucesso |
| 201 | Created - Criado |
| 400 | Bad Request - Requisição inválida |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Acesso negado |
| 404 | Not Found - Não encontrado |
| 422 | Unprocessable Entity - Erro de validação |
| 500 | Internal Server Error - Erro interno |

## Licença

MIT License
