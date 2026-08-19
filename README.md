# Projeto Criado com o Skip

Este projeto foi criado de ponta a ponta com o [Skip](https://goskip.dev).

## 🚀 Stack Tecnológica

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool extremamente rápida
- **TypeScript** - Superset tipado do JavaScript
- **Shadcn UI** - Componentes reutilizáveis e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação de schemas TypeScript-first
- **Recharts** - Biblioteca de gráficos para React

## 📋 Pré-requisitos

- Node.js 18+
- npm

## 🔧 Instalação

```bash
npm install
```

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm start
# ou
npm run dev
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:5173](http://localhost:5173).

### Build

```bash
# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev
```

Gera os arquivos otimizados para produção na pasta `dist/`.

### Preview

```bash
# Visualizar build de produção localmente
npm run preview
```

Permite visualizar a build de produção localmente antes do deploy.

### Linting e Formatação

```bash
# Executar linter
npm run lint

# Executar linter e corrigir problemas automaticamente
npm run lint:fix

# Formatar código com Oxfmt
npm run format
```

## 📁 Estrutura do Projeto

```
.
├── src/              # Código fonte da aplicação
├── public/           # Arquivos estáticos
├── dist/             # Build de produção (gerado)
├── node_modules/     # Dependências (gerado)
└── package.json      # Configurações e dependências do projeto
```

## 🎨 Componentes UI

Este template inclui uma biblioteca completa de componentes Shadcn UI baseados em Radix UI:

- Accordion
- Alert Dialog
- Avatar
- Button
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Switch
- Tabs
- Toast
- Tooltip
- E muito mais...

## 📝 Ferramentas de Qualidade de Código

- **TypeScript**: Tipagem estática
- **Oxlint**: Linter extremamente rápido
- **Oxfmt**: Formatação automática de código

## 🔄 Workflow de Desenvolvimento

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm start`
3. Faça suas alterações
4. Verifique o código: `npm run lint`
5. Formate o código: `npm run format`
6. Crie a build: `npm run build`
7. Visualize a build: `npm run preview`

## 📦 Build e Deploy

```bash
pnpm build
```

Os arquivos otimizados vão para `dist/`.

### GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica o site em:

`https://allantomazela.github.io/super-mega/`

Passos únicos no GitHub:

1. **Settings → Pages → Source:** GitHub Actions
2. **Settings → Secrets and variables → Actions:** cadastre `DATABASE_URL` (Neon produção) e, se quiser, `DATABASE_URL_DEV`
3. Faça push da `main` (ou rode o workflow *Publicar GitHub Pages* manualmente)

O React Router usa o `basename` do Vite (`/super-mega/` no Pages). Em `pnpm start` o base continua `/`.

### Neon (histórico de concursos)

O app é estático (Pages não tem backend). Por isso:

1. A Action grava os concursos oficiais da Caixa no Neon
2. No deploy, exporta um snapshot `concursos.json` junto com o site
3. O frontend tenta, nesta ordem: API da Caixa → snapshot Neon → base estática

```bash
cp .env-dev.example .env-dev
# cole a connection string do Neon em DATABASE_URL
pnpm db:ping
pnpm db:sync-concursos
pnpm db:export-concursos
```

A primeira sync incremental preenche lacunas até o concurso atual. Para recarregar tudo: `pnpm db:sync-concursos:full`.
