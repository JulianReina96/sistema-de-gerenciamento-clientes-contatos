import { useEffect, useState, useMemo } from 'react';
import { FALLBACK_AVATAR, resolveClientImageUrl } from '../../utils/storage';
import { confirmDelete, swalError, swalSuccess } from '../../utils/alerts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Client } from '../../lib/types';
import { Edit2, Trash2, Plus, Users, ChevronDown } from 'lucide-react';
import ClientForm from './ClientForm';

export default function ClientList() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Busca e paginação
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Nova opção de ordenação: 'alphabetical' por padrão
  const [orderBy, setOrderBy] = useState<'alphabetical' | 'registration'>('alphabetical');

  // Estado de expansão dos cards (set de ids)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    loadClients();
  }, [user, orderBy]); // recarrega ao mudar usuário ou opção de ordenação

  useEffect(() => {
    // Ao mudar a busca, volta para a primeira página
    setPage(1);
  }, [search]);

  useEffect(() => {
    const loadAvatars = async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        clients.map(async (c) => {
          if (!c.foto_url) {
            map[c.id] = FALLBACK_AVATAR;
            return;
          }
          try {
            const url = await resolveClientImageUrl(c.foto_url);
            map[c.id] = url || FALLBACK_AVATAR;
          } catch {
            map[c.id] = FALLBACK_AVATAR;
          }
        })
      );
      setAvatarMap(map);
    };
    if (clients?.length) loadAvatars();
  }, [clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('clients').select('*');
      if (orderBy === 'alphabetical') {
        query = query.order('full_name', { ascending: true });
      } else {
        query = query.order('registration_date', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('clients')
      .insert([{ ...clientData, user_id: user!.id }]);

    if (error) throw error;
    await loadClients();
  };

  const handleUpdate = async (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!editingClient) return;

    const { error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', editingClient.id);

    if (error) throw error;
    await loadClients();
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDelete('cliente');
    if (!ok) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      // recarrega
      await loadClients();
      await swalSuccess('Cliente removido com sucesso.');
    } catch (err: any) {
      console.error(err);
      await swalError('Erro', err?.message || 'Falha ao remover cliente.');
    }
  };

  const openCreateForm = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  // Filtragem local (busca por nome / e-mails / telefones)
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = (c.full_name || '').toLowerCase();
      const emails = (c.emails || []).join(' ').toLowerCase();
      const phones = (c.phones || []).join(' ').toLowerCase();
      return name.includes(q) || emails.includes(q) || phones.includes(q);
    });
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages]);

  const paginatedClients = filteredClients.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    // limite largura e evite overflow-x; padding responsivo para não estourar em mobile
    <div className="space-y-4 max-w-full mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
            <p className="text-sm text-gray-600">{filteredClients.length} encontrados • {clients.length} cadastrados</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone"
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded-lg px-2 py-2 text-sm w-full sm:w-auto"
              title="Itens por página"
            >
              <option value={5}>5 / página</option>
              <option value={10}>10 / página</option>
              <option value={20}>20 / página</option>
              <option value={50}>50 / página</option>
            </select>

            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition w-full sm:w-auto justify-center"
            >
              <Plus className="w-5 h-5" />
              Novo Cliente
            </button>
          </div>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
          <p className="text-gray-600 mb-4">Tente ajustar sua busca ou adicione um novo cliente</p>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Adicionar Cliente
          </button>
        </div>
      ) : (
        // usar grid responsivo em colunas e reduzir padding dos cards em telas pequenas
        <div className="grid grid-cols-1 gap-4">
          {paginatedClients.map((client) => {
            const isExpanded = expandedIds.has(client.id);
            return (
              <div
                key={client.id}
                className="bg-white rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      <img
                        src={avatarMap[client.id] || FALLBACK_AVATAR}
                        alt={client.full_name || 'avatar'}
                        className="w-full h-full object-cover"
                        onError={(e: any) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-1 truncate" title={client.full_name}>
                        {client.full_name}
                      </h3>

                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Registro:</span>
                          <span className="ml-2 text-gray-800 text-sm">
                            {new Date(client.registration_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-0 sm:ml-2">
                    <button
                      onClick={() => openEditForm(client)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => toggleExpand(client.id)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown className="w-4 h-4 transform rotate-180" />
                        Recolher
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Ver Detalhes
                      </>
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 text-sm text-gray-700">
                    <div className="font-medium text-gray-600">Detalhes Adicionais</div>
                    <div className="mt-2">
                      {client.emails && client.emails.length > 0 && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">E-mails:</span>
                          <div className="text-gray-800">
                            {client.emails.join(', ')}
                          </div>
                        </div>
                      )}

                      {client.phones && client.phones.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          <span className="font-medium text-gray-600">Telefones:</span>
                          <div className="text-gray-800">
                            {client.phones.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {filteredClients.length > 0 && (
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-gray-600">
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredClients.length)} de {filteredClients.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              Anterior
            </button>

            <div className="px-3 py-1 border rounded-lg">
              Página {page} / {totalPages}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <ClientForm
          client={editingClient}
          onSubmit={editingClient ? handleUpdate : handleCreate}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
