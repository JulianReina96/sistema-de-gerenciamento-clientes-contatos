export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  emails: string[];
  phones: string[];
  registration_date: string;
  created_at: string;
  updated_at: string;
  // URL pública para foto/avatar do cliente (opcional)
  foto_url?: string | null;
}

export interface Contact {
  id: string;
  client_id: string;
  user_id: string;
  full_name: string;
  emails: string[];
  phones: string[];
  created_at: string;
  updated_at: string;
}

export interface ClientWithContacts extends Client {
  contacts: Contact[];
}
