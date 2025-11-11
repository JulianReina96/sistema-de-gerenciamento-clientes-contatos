/*
  # Sistema de Cadastro de Clientes e Contatos + Suporte a Uploads via Supabase Storage

  Este migration cria toda a base de dados do sistema e configura o Supabase Storage
  para permitir o upload público de imagens no bucket `clients_avatar`.

  ## Inclui:
  1. Tabelas de clientes e contatos
  2. RLS e políticas de segurança completas
  3. Triggers automáticas de atualização de timestamp
  4. Índices para performance
  5. Criação automática do bucket `clients_avatar`
  6. Políticas completas de INSERT/SELECT/UPDATE compatíveis com Supabase Storage
*/

------------------------------
-- 1. Tabelas principais
------------------------------

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

------------------------------
-- 2. Função e triggers para updated_at
------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

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

------------------------------
-- 3. Índices
------------------------------

CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients(user_id);
CREATE INDEX IF NOT EXISTS contacts_client_id_idx ON contacts(client_id);
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);

------------------------------
-- 4. Segurança (RLS)
------------------------------

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

------------------------------
-- 5. Configuração automática do Supabase Storage
------------------------------

-- Criar bucket público se não existir
INSERT INTO storage.buckets (id, name, public)
SELECT 'clients_avatar', 'clients_avatar', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'clients_avatar'
);




------------------------------
-- 6. Políticas completas para o bucket clients_avatar
------------------------------

-- Inserção (upload)
CREATE POLICY "Allow public uploads for clients_avatar"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'clients_avatar'
  AND (metadata IS NULL OR TRUE)
  AND (owner IS NULL OR TRUE)
  AND (owner_id IS NULL OR TRUE)
  AND (user_metadata IS NULL OR TRUE)
  AND (version IS NULL OR TRUE)
  AND (name IS NOT NULL)
);

-- Leitura pública
CREATE POLICY "Allow public read for clients_avatar"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'clients_avatar');

-- Atualização (upsert)
CREATE POLICY "Allow public update for clients_avatar"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'clients_avatar')
WITH CHECK (bucket_id = 'clients_avatar');

-- Exclusão opcional (para desenvolvedores/testes)

CREATE POLICY "Allow public delete for clients_avatar"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'clients_avatar');

------------------------------
-- ✅ Após rodar este migration:
-- - Bucket `clients_avatar` será criado e público
-- - Uploads via Supabase Storage funcionarão imediatamente
-- - Nenhuma configuração adicional é necessária
------------------------------
