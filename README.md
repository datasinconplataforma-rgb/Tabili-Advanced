# Tabili Advanced

Sistema avancado de gestao de tabelas dinamicas com suporte a formulas, compartilhamento e relatorios.

## Tecnologias

- **Vite** + **React** + **TypeScript**
- **Supabase** (autenticacao e banco de dados)
- **shadcn/ui** + **Tailwind CSS**
- **Recharts** (graficos)
- **jsPDF** + **xlsx** (exportacao)

## Como rodar

```sh
# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Variaveis de Ambiente

Crie um arquivo `.env` na raiz com:

```
VITE_SUPABASE_PROJECT_ID="seu_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_anon_key"
VITE_SUPABASE_URL="https://seu_project_id.supabase.co"
```

## Deploy (Vercel)

1. Conecte o repositorio no Vercel
2. Configure as variaveis de ambiente acima
3. Build command: `npm run build`
4. Output directory: `dist`