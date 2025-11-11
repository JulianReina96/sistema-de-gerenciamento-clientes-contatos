import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Contact, Client } from '../../lib/types';
import { Edit2, Trash2, UserCircle, Download } from 'lucide-react';
import ContactForm from './ContactForm';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { confirmDelete, swalError, swalSuccess } from '../../utils/alerts';
import { FALLBACK_AVATAR, resolveClientImageUrl } from '../../utils/storage';
import { imageUrlToPNGDataUrl } from '../../utils/images';
import { safeFilenameForExport } from '../../utils/validation';

export default function ContactList() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  // preview/signed url do avatar do cliente relacionado ao contato selecionado
  const [selectedClientAvatar, setSelectedClientAvatar] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContactClientId, setNewContactClientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadClients();
    loadContacts();
  }, [user]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user!.id)
        .order('full_name');

      if (error) throw error;
      setContacts(data || []);
      if (data && data.length > 0 && !selectedContactId) {
        setSelectedContactId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (contactData: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('contacts')
      .insert([{ ...contactData, user_id: user!.id }]);

    if (error) throw error;
    await loadContacts();
    setShowForm(false);
    setNewContactClientId(null);
  };

  const handleUpdate = async (contactData: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!editingContact) return;

    const { error } = await supabase
      .from('contacts')
      .update(contactData)
      .eq('id', editingContact.id);

    if (error) throw error;
    await loadContacts();
    setShowForm(false);
    setEditingContact(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDelete('contato');
    if (!ok) return;
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      await loadContacts();
      if (selectedContactId === id) setSelectedContactId(null);
      await swalSuccess('Contato removido com sucesso.');
    } catch (err: any) {
      console.error(err);
      await swalError('Erro', err?.message || 'Falha ao remover contato.');
    }
  };

  const openCreateForm = (clientId?: string) => {
    setEditingContact(null);
    setNewContactClientId(clientId || null);
    setShowForm(true);
  };

  const openEditForm = (contact: Contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingContact(null);
    setNewContactClientId(null);
  };

  const toggleClient = (id: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedClientId(id);
  };

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (contacts.filter(ct => ct.client_id === c.id).map(ct => ct.full_name).join(' ').toLowerCase().includes(q))
    );
  }, [clients, contacts, search]);

  // agrupa TODOS os clients por letra (sempre mostra todas as letras)
  const groupedAllClients = useMemo(() => {
    const map = new Map<string, Client[]>();
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    letters.forEach(l => map.set(l, []));
    map.set('#', []);
    clients.forEach(c => {
      const ch = (c.full_name || '').trim().charAt(0).toUpperCase();
      if (letters.includes(ch)) map.get(ch)!.push(c);
      else map.get('#')!.push(c);
    });
    return map;
  }, [clients]);

  // ids de clients que batem com a busca (para destacar)
  const matchesSet = useMemo(() => new Set(filteredClients.map(c => c.id)), [filteredClients]);

  const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'];

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;
  // cliente relacionado ao contato selecionado (facilita render)
  const selectedContactClient = selectedContact ? clients.find(cl => cl.id === selectedContact.client_id) || null : null;

  // exporta um contato específico (contato + seu cliente) em PDF
  const exportContactPDF = async (contact: Contact) => {
    const client = clients.find(c => c.id === contact.client_id);
    const doc = new jsPDF();

    const clientImgUrl = await resolveClientImageUrl(client?.foto_url || '');
    const imgData = await imageUrlToPNGDataUrl(clientImgUrl);
    const imgW = 30, imgH = 30;
    const format = /jpe?g/i.test(imgData) ? 'JPEG' : 'PNG';
    if (imgData) doc.addImage(imgData, format as any, 14, 14, imgW, imgH);

    doc.setFontSize(14);
    doc.text(client?.full_name || '—', 14 + imgW + 8, 24);
    doc.setFontSize(10);
    if (client?.registration_date) {
      doc.text(`Registro: ${new Date(client.registration_date).toLocaleDateString('pt-BR')}`, 14 + imgW + 8, 32);
    }

    let y = 14 + Math.max(imgH, 20) + 10;
    doc.setFontSize(16);
    doc.text('Contato', 14, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Nome: ${contact.full_name || '—'}`, 14, y); y += 8;
    if (contact.created_at) {
      doc.text(`Cadastro: ${new Date(contact.created_at).toLocaleDateString('pt-BR')}`, 14, y); y += 8;
    }
    if (contact.emails?.length) {
      y += 4; doc.setFont('helvetica', 'bold'); doc.text('E-mails:', 14, y);
      doc.setFont('helvetica', 'normal'); y += 6;
      contact.emails.forEach(e => { doc.text(`- ${e}`, 18, y); y += 8; });
    }
    if (contact.phones?.length) {
      y += 4; doc.setFont('helvetica', 'bold'); doc.text('Telefones:', 14, y);
      doc.setFont('helvetica', 'normal'); y += 6;
      contact.phones.forEach(p => { doc.text(`- ${p}`, 18, y); y += 8; });
    }

    doc.save(`${safeFilenameForExport(contact.full_name || 'contact')}.pdf`);
  };

  // exporta cliente e todos os seus contatos em PDF (tabela)
  const exportClientPDF = async (client: Client) => {
    const clientContacts = contacts.filter(ct => ct.client_id === client.id);
    const doc = new jsPDF();

    const clientImgUrl = await resolveClientImageUrl(client.foto_url || '');
    const imgData = await imageUrlToPNGDataUrl(clientImgUrl);
    const imgW = 30, imgH = 30;
    const format = /jpe?g/i.test(imgData) ? 'JPEG' : 'PNG';
    if (imgData) doc.addImage(imgData, format as any, 14, 14, imgW, imgH);

    doc.setFontSize(14);
    doc.text(`Cliente: ${client.full_name}`, 14 + imgW + 8, 24);
    doc.setFontSize(10);
    if (client.registration_date) {
      doc.text(`Registro: ${new Date(client.registration_date).toLocaleDateString('pt-BR')}`, 14 + imgW + 8, 32);
    }

    autoTable(doc, {
      startY: 14 + Math.max(imgH, 20) + 10,
      head: [['Nome', 'E-mails', 'Telefones', 'Cadastro']],
      body: clientContacts.map(ct => [
        ct.full_name || '—',
        (ct.emails || []).join(', '),
        (ct.phones || []).join(', '),
        ct.created_at ? new Date(ct.created_at).toLocaleDateString('pt-BR') : '—',
      ]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [240, 240, 240], textColor: 20 },
    });

    doc.save(`${safeFilenameForExport(client.full_name || 'client')}_contacts.pdf`);
  };

  // carrega preview/signed url do avatar do cliente do contato selecionado
  useEffect(() => {
    let mounted = true;
    const loadAvatar = async () => {
      setSelectedClientAvatar('');
      if (!selectedContact) return;
      const client = clients.find(cl => cl.id === selectedContact.client_id);
      if (!client || !client.foto_url) return;

      // se já for URL pública, usa direto
      if (client.foto_url.startsWith('http')) {
        if (mounted) setSelectedClientAvatar(client.foto_url);
        return;
      }

      // caso armazene apenas storage path, gera signed url (ajuste bucket se necessário)
      try {
        const bucket = 'clients_avatar'; // ajuste se o seu bucket tiver outro nome
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(client.foto_url, 60 * 60);
        if (!error && data?.signedUrl && mounted) {
          setSelectedClientAvatar(data.signedUrl);
        } else {
          // fallback: tenta usar o path como src (pode falhar se privado)
          if (mounted) setSelectedClientAvatar(client.foto_url);
        }
      } catch (err) {
        console.error('Erro ao gerar signed url do avatar:', err);
        if (mounted) setSelectedClientAvatar('');
      }
    };
    loadAvatar();
    return () => { mounted = false; };
  }, [selectedContact, clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente</h3>
        <p className="text-gray-600">Cadastre um cliente para começar a adicionar contatos</p>
      </div>
    );
  }

  return (
    // container responsivo: empilha em mobile, evita overflow horizontal
    <div className="flex flex-col sm:flex-row gap-6 max-w-full mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      {/* Coluna esquerda: largura adaptativa em breakpoints, com scroll interno */}
      <div className="w-full sm:w-80 md:w-96 bg-white rounded-xl shadow-sm p-4 overflow-auto max-h-[80vh]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Agenda (Clientes)</h2>
            <p className="text-sm text-gray-600">{clients.length} clientes</p>
          </div>
        </div>

        <div className="mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente ou contato..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>

        <div className="space-y-4">
          {alphabet.map(letter => {
            const list = groupedAllClients.get(letter) || [];
            const visibleList = search.trim() === '' ? list : list.filter(c => matchesSet.has(c.id));
            if (visibleList.length === 0) return null;
            return (
              <div key={letter}>
                <div className="text-xs font-bold text-gray-500 mb-2">{letter}</div>
                <div className="space-y-2">
                  {visibleList.map(client => {
                    const clientContacts = contacts.filter(ct => ct.client_id === client.id);
                    const isExpanded = expandedClients.has(client.id);
                    return (
                      <div key={client.id} className="border border-gray-100 rounded-lg overflow-hidden">
                        <div
                          onClick={() => toggleClient(client.id)}
                          className={`w-full cursor-pointer px-3 py-2 bg-white hover:bg-gray-50 flex items-center justify-between`}
                          title={client.full_name}
                        >
                          <div className="text-sm min-w-0">
                            <div
                              className="font-medium text-gray-800 truncate max-w-[20ch]"
                              title={client.full_name}
                            >
                              {client.full_name}
                            </div>
                            <div className="text-xs text-gray-500">{clientContacts.length} contatos</div>
                          </div>

                          {/* evita que os botões "quebrem" / encolham quando o nome é longo */}
                          <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
                             <button
                               onClick={(e) => { e.stopPropagation(); openCreateForm(client.id); }}
                               className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-md hover:bg-green-100"
                               title="Adicionar contato a este cliente"
                             >
                               + Contato
                             </button>
 
                             <button
                               onClick={(e) => { e.stopPropagation(); exportClientPDF(client); }}
                               className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-100 flex items-center gap-1"
                               title="Exportar cliente e contatos (PDF)"
                             >
                               <Download className="w-3 h-3" /> Exportar
                             </button>
 
                             <div className="text-xs text-gray-400">
                               {isExpanded ? '▾' : '▸'}
                             </div>
                           </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-gray-50 p-2">
                            {clientContacts.length === 0 ? (
                              <div className="text-sm text-gray-500 px-2 py-2">Nenhum contato</div>
                            ) : (
                              <ul>
                                {clientContacts.map(ct => (
                                  <li
                                    key={ct.id}
                                    onClick={() => setSelectedContactId(ct.id)}
                                    className={`cursor-pointer px-2 py-2 rounded-md hover:bg-gray-100 flex items-center justify-between ${selectedContactId === ct.id ? 'bg-gray-100' : ''}`}
                                  >
                                    <div className="text-sm min-w-0">
                                      <div className="font-medium text-gray-800 truncate max-w-[200px]" title={ct.full_name}>
                                        {ct.full_name}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate max-w-[200px]" title={ct.emails?.[0] || ct.phones?.[0] || ''}>
                                        {ct.emails?.[0] || ct.phones?.[0] || ''}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); exportContactPDF(ct); }}
                                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-100 flex items-center gap-1"
                                        title="Exportar contato (PDF)"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel direito: ocupa o restante, min-w-0 para evitar overflow */}
      <div className="flex-1 min-w-0">
        {!selectedContact ? (
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <p className="text-gray-600">Selecione um contato dentro de um cliente à esquerda para ver os detalhes</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                <img
                  src={selectedClientAvatar || selectedContactClient?.foto_url || FALLBACK_AVATAR}
                  alt={selectedContactClient?.full_name || 'cliente'}
                  className="w-full h-full object-cover"
                  onError={(e: any) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Cliente</div>
                <div className="text-lg font-semibold text-gray-800 truncate" title={selectedContactClient?.full_name}>
                  {selectedContactClient?.full_name || '—'}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedContactClient?.registration_date ? new Date(selectedContactClient.registration_date).toLocaleDateString('pt-BR') : ''}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 overflow-auto">
              <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                <div className="min-w-0 w-full md:flex-1">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-1 break-words whitespace-normal" title={selectedContact.full_name}>
                    {selectedContact.full_name}
                  </h3>
                  <div className="text-sm text-gray-500 mb-3">
                    {selectedContact.created_at ? new Date(selectedContact.created_at).toLocaleDateString('pt-BR') : ''}
                  </div>

                  <div className="space-y-3 text-sm text-gray-700">
                    {selectedContact.emails && selectedContact.emails.length > 0 && (
                      <div>
                        <div className="font-medium text-gray-600">E-mails</div>
                        <div className="mt-1 text-gray-800">
                          {selectedContact.emails.map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                      </div>
                    )}

                    {selectedContact.phones && selectedContact.phones.length > 0 && (
                      <div>
                        <div className="font-medium text-gray-600">Telefones</div>
                        <div className="mt-1 text-gray-800">
                          {selectedContact.phones.map((p, i) => <div key={i}>{p}</div>)}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="font-medium text-gray-600">Cliente</div>
                      <div className="mt-1 text-gray-800">
                        {selectedContactClient?.full_name || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                  <button
                    onClick={() => openEditForm(selectedContact)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleDelete(selectedContact.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => exportContactPDF(selectedContact)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Exportar contato (PDF)"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
         )}
      </div>

      {/* Formulário de contato (modal) */}
      {showForm && (
        <ContactForm
          clientId={editingContact ? editingContact.client_id : (newContactClientId || clients[0]?.id || '')}
          contact={editingContact}
          onSubmit={editingContact ? handleUpdate : handleCreate}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
