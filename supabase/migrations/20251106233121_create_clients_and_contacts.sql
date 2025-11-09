/*
  # Sistema de Cadastro de Clientes e Contatos

  1. Novas Tabelas
    - `clients` (clientes)
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário autenticado)
      - `full_name` (text, nome completo do cliente)
      - `emails` (text[], lista de emails)
      - `phones` (text[], lista de telefones)
      - `registration_date` (date, data de registro)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `contacts` (contatos)
      - `id` (uuid, chave primária)
      - `client_id` (uuid, referência ao cliente)
      - `user_id` (uuid, referência ao usuário autenticado)
      - `full_name` (text, nome completo do contato)
      - `emails` (text[], lista de emails)
      - `phones` (text[], lista de telefones)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança (RLS)
    - Habilitar RLS em ambas as tabelas
    - Políticas para clientes:
      - Usuários autenticados podem ver seus próprios clientes
      - Usuários autenticados podem inserir seus próprios clientes
      - Usuários autenticados podem atualizar seus próprios clientes
      - Usuários autenticados podem deletar seus próprios clientes
    - Políticas para contatos:
      - Usuários autenticados podem ver contatos de seus clientes
      - Usuários autenticados podem inserir contatos em seus clientes
      - Usuários autenticados podem atualizar contatos de seus clientes
      - Usuários autenticados podem deletar contatos de seus clientes

  3. Índices
    - Índice em `clients.user_id` para consultas rápidas
    - Índice em `contacts.client_id` para joins eficientes
    - Índice em `contacts.user_id` para consultas rápidas

  4. Funções
    - Trigger para atualizar `updated_at` automaticamente
*/

-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  emails text[] DEFAULT '{}',
  phones text[] DEFAULT '{}',
  registration_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  foto_url text DEFAULT NULL
);

-- Criar tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  emails text[] DEFAULT '{}',
  phones text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar índices
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients(user_id);
CREATE INDEX IF NOT EXISTS contacts_client_id_idx ON contacts(client_id);
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);

-- Habilitar RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Políticas para clients
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para contacts
CREATE POLICY "Users can view contacts of own clients"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert contacts to own clients"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = contacts.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts of own clients"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = contacts.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts of own clients"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);