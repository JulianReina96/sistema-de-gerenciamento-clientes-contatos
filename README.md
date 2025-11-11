# 🧭 Sistema de Cadastro de Clientes e Contatos (Supabase + React)

Este projeto implementa um **sistema completo de cadastro de clientes e contatos**, com **armazenamento de fotos via Supabase Storage**.  
Foi desenvolvido como parte de um **desafio técnico Fullstack Júnior/Pleno**, com foco em funcionalidade, organização e documentação clara.  

---

## 🚀 Funcionalidades

✅ Cadastro completo de clientes  
✅ Vínculo de múltiplos contatos a cada cliente  
✅ Upload de imagem de perfil (armazenada no Supabase Storage)  
✅ Políticas de segurança completas (Row Level Security - RLS)  
✅ Banco configurado automaticamente via migration  
✅ Bucket público (`clients_avatar`) criado e pronto para uso  
✅ Interface responsiva e intuitiva (React + TailwindCSS)

---

## ⚙️ Requisitos de ambiente

Antes de começar, instale:

- [Node.js 18+](https://nodejs.org)  
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

E crie uma conta gratuita no Supabase  
- [Supabase](https://supabase.com)  

---

## 🧩 1️⃣ Clonar o projeto

Abra o terminal e execute:

```bash
git clone https://github.com/JulianReina96/sistema-de-gerenciamento-clientes-contatos.git
cd sistema-de-gerenciamento-clientes-contatos
```

Agora, instale as dependências do projeto:

```bash
npm install
```

💡 **Dica:** Caso o Node não esteja instalado, baixe-o em [nodejs.org](https://nodejs.org).

---

## 🧠 2️⃣ Criar o projeto Supabase

1. Acesse [https://app.supabase.com](https://app.supabase.com)  
2. Crie um novo projeto gratuito  
3. Vá até **Project Settings → Data API** e copie:
   - `Project URL` → usada como `VITE_SUPABASE_URL`
4. Vá até **Project Settings → API Keys** e copie:
   - `anon public key` → usada como `VITE_SUPABASE_ANON_KEY`

---

## 🗄️ 3️⃣ Configurar o banco de dados e o Storage

Caso ainda não tenha instalado o Supabase CLI, execute:
```bash
npx supabase 
```
Com o Supabase CLI instalado, faça login via **npx** (não é preciso instalação global):

```bash
npx supabase login
```

Quando o terminal solicitar, insira o código de autenticação fornecido pelo navegador.

Agora, vincule o projeto local ao Supabase:

```bash
npx supabase link --project-ref <seu-project-ref>
```

> 💡 *O `<seu-project-ref>` é o identificador do seu projeto, visível na URL do Supabase (ex: `abcxyz123` — aparece logo após `project/` no endereço do painel).*

Depois, execute o migration:

```bash
npx supabase db push
```

✅ Isso criará automaticamente:
- As tabelas `clients` e `contacts`
- Todas as políticas de segurança RLS
- O bucket público `clients_avatar` (para armazenar fotos)
- As permissões de upload, leitura e atualização

---

## 🌐 4️⃣ Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com os valores copiados do painel:

```bash
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
```

---

## 🧰 5️⃣ Rodar o projeto localmente

Execute:

```bash
npm run dev
```

O projeto abrirá automaticamente em:  
👉 [http://localhost:5173](http://localhost:5173)

---

## 🧪 6️⃣ Testar funcionalidades

1. Cadastre um novo **cliente**  
2. Adicione e-mails e telefones  
3. Faça upload da **foto do cliente** (opcional)  
4. Adicione **contatos** associados a esse cliente  
5. Acesse o **relatório** para visualizar clientes e contatos vinculados  

🖼️ O upload da foto é salvo automaticamente no bucket público `clients_avatar`,  
e o link público é exibido na interface.

---

## 🧱 Estrutura do Banco

### 🧾 Tabela `clients`
| Campo | Tipo | Descrição |
|--------|------|------------|
| id | uuid | Identificador do cliente |
| user_id | uuid | ID do usuário autenticado |
| full_name | text | Nome completo do cliente |
| emails | text[] | Lista de e-mails |
| phones | text[] | Lista de telefones |
| registration_date | date | Data de registro |
| foto_url | text | URL pública da foto |
| created_at / updated_at | timestamptz | Timestamps automáticos |

### 🧾 Tabela `contacts`
| Campo | Tipo | Descrição |
|--------|------|------------|
| id | uuid | Identificador do contato |
| client_id | uuid | Cliente associado |
| user_id | uuid | Usuário autenticado |
| full_name | text | Nome do contato |
| emails / phones | text[] | Dados do contato |
| created_at / updated_at | timestamptz | Timestamps automáticos |

---

## 📦 Bucket `clients_avatar`

O bucket é criado automaticamente via migration e configurado como **público**.  
As políticas permitem upload, leitura e atualização via painel ou SDK.

Exemplo de uso no código:

```js
const { data, error } = await supabase.storage
  .from('clients_avatar')
  .upload(`${user.id}/${Date.now()}_${file.name}`, file, { upsert: true });
```

---

## 🔐 Segurança e permissões

As políticas **Row Level Security (RLS)** garantem que:
- Cada usuário só pode ver e editar **seus próprios clientes e contatos**  
- O bucket `clients_avatar` é público apenas para leitura  
- Uploads funcionam de forma segura e controlada via regras SQL

---

## 🌐 Deploy

O projeto também está disponível online em:  
[🌐 Deploy Vercel](https://sistema-de-gerenciamento-clientes-c.vercel.app/)

---

## 🧩 Extras (opcional)

Para limpar e recriar todo o banco localmente:
```bash
npx supabase db reset
```

Para abrir o painel local do Supabase:
```bash
npx supabase studio
```

---

## ✅ Conclusão

Após rodar o migration e configurar o `.env`, **nenhuma etapa adicional é necessária**.  
O sistema estará pronto para uso, com banco e Storage configurados automaticamente.  

---

**Autor:** Julian Freitas Reina  
**Repositório:** [github.com/JulianReina96/sistema-de-gerenciamento-clientes-contatos](https://github.com/JulianReina96/sistema-de-gerenciamento-clientes-contatos)  
**Deploy:** [https://sistema-de-gerenciamento-clientes-c.vercel.app/](https://sistema-de-gerenciamento-clientes-c.vercel.app/)  
**Tecnologias:** Supabase · React · TypeScript · Vite · TailwindCSS  
**Licença:** MIT
