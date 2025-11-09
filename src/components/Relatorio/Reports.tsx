import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ClientWithContacts, Client, Contact } from '../../lib/types';
import { FileText, Download, UserCircle } from 'lucide-react';
import { FALLBACK_AVATAR, resolveClientImageUrl } from '../../utils/storage';

export default function Reports() {
  const [clientsWithContacts, setClientsWithContacts] = useState<ClientWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const [clientAvatarMap, setClientAvatarMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadReport();
  }, []);

  // carrega/atualiza avatares dos clientes (usados para exibir nos contatos)
  useEffect(() => {
    const loadAvatars = async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        clientsWithContacts.map(async (c) => {
          try {
            map[c.id] = c.foto_url ? await resolveClientImageUrl(c.foto_url) : FALLBACK_AVATAR;
          } catch {
            map[c.id] = FALLBACK_AVATAR;
          }
        })
      );
      setClientAvatarMap(map);
    };
    if (clientsWithContacts.length > 0) loadAvatars();
  }, [clientsWithContacts]);

  const loadReport = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('full_name');

      if (clientsError) throw clientsError;

      const clientsWithContactsData: ClientWithContacts[] = [];

      for (const client of clientsData || []) {
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('*')
          .eq('client_id', client.id)
          .order('full_name');

        if (contactsError) throw contactsError;

        clientsWithContactsData.push({
          ...client,
          contacts: contactsData || [],
        });
      }

      setClientsWithContacts(clientsWithContactsData);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando relatório...</div>
      </div>
    );
  }

  const totalClients = clientsWithContacts.length;
  const totalContacts = clientsWithContacts.reduce((acc, client) => acc + client.contacts.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
            <p className="text-sm text-gray-600">Visualize todos os clientes e contatos</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition"
        >
          <Download className="w-5 h-5" />
          Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <UserCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Clientes</p>
              <p className="text-3xl font-bold text-gray-800">{totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <UserCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Contatos</p>
              <p className="text-3xl font-bold text-gray-800">{totalContacts}</p>
            </div>
          </div>
        </div>
      </div>

      <div ref={printRef} className="bg-white rounded-xl shadow-sm p-8 print:shadow-none print:p-0">
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Relatório de Clientes e Contatos</h1>
          <p className="text-gray-600">
            Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          </p>
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <span className="font-semibold">Total de Clientes:</span> {totalClients}
            </div>
            <div>
              <span className="font-semibold">Total de Contatos:</span> {totalContacts}
            </div>
          </div>
          <hr className="my-6 border-gray-300" />
        </div>

        {clientsWithContacts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado para exibir</h3>
            <p className="text-gray-600">Cadastre clientes e contatos para gerar relatórios</p>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-6">
            {clientsWithContacts.map((client, index) => (
              <div key={client.id} className="print:break-inside-avoid">
                {index > 0 && <hr className="my-8 border-gray-200 print:my-6" />}

                <div className="mb-4">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={clientAvatarMap[client.id] || FALLBACK_AVATAR}
                        alt={client.full_name || 'avatar'}
                        className="w-full h-full object-cover"
                        onError={(e: any) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{client.full_name}</h3>
                      <p className="text-sm text-gray-600">
                        Cadastrado em: {new Date(client.registration_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="ml-11 space-y-2 text-sm">
                    {client.emails.length > 0 && (
                      <div>
                        <span className="font-semibold text-gray-700">E-mails:</span>
                        <span className="ml-2 text-gray-600">{client.emails.join(', ')}</span>
                      </div>
                    )}
                    {client.phones.length > 0 && (
                      <div>
                        <span className="font-semibold text-gray-700">Telefones:</span>
                        <span className="ml-2 text-gray-600">{client.phones.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-11">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    Contatos ({client.contacts.length})
                  </h4>

                  {client.contacts.length === 0 ? (
                    <p className="text-sm text-gray-500 italic ml-6">Nenhum contato cadastrado</p>
                  ) : (
                    <div className="space-y-3">
                      {client.contacts.map((contact) => (
                        <div key={contact.id} className="ml-6 p-3 bg-gray-50 rounded-lg print:bg-white print:border print:border-gray-200">
                          <p className="font-medium text-gray-800 mb-1">{contact.full_name}</p>
                          <div className="space-y-1 text-sm text-gray-600">
                            {contact.emails.length > 0 && (
                              <div>
                                <span className="font-medium">E-mails:</span> {contact.emails.join(', ')}
                              </div>
                            )}
                            {contact.phones.length > 0 && (
                              <div>
                                <span className="font-medium">Telefones:</span> {contact.phones.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
