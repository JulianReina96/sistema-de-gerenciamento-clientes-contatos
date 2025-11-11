import { useState, useEffect, useRef } from 'react';
import InputMask from 'react-input-mask';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Client } from '../../lib/types';
import { validateClientInput, validateImageFile, normalizeArrayStrings } from '../../utils/validation';
import { confirmSave, swalError, swalSuccess, swalValidation } from '../../utils/alerts';
import { BUCKET_CLIENTS, extractStoragePath, uploadClientImage, removeFile, FALLBACK_AVATAR } from '../../utils/storage';
import { maskFor } from '../../utils/phoneMask';

interface ClientFormProps {
  client?: Client | null;
  onSubmit: (data: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onClose: () => void;
}

export default function ClientForm({ client, onSubmit, onClose }: ClientFormProps) {
  const [fullName, setFullName] = useState('');
  const [emails, setEmails] = useState<string[]>(['']);
  const [phones, setPhones] = useState<string[]>(['']);
  const [registrationDate, setRegistrationDate] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (client) {
      setFullName(client.full_name || '');
      setEmails(client.emails?.length ? client.emails : ['']);
      setPhones(client.phones?.length ? client.phones : ['']);
      setRegistrationDate(client.registration_date);
      setFotoUrl(client.foto_url || '');
      setPreviewUrl(client.foto_url || '');
      setDeleteExisting(false);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setRegistrationDate(today);
      setDeleteExisting(false);
    }
  }, [client]);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (localFile) {
      objectUrl = URL.createObjectURL(localFile);
      setPreviewUrl(objectUrl);
    } else {
      if (deleteExisting) setPreviewUrl('');
      else setPreviewUrl(client?.foto_url || fotoUrl || '');
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [localFile, client?.foto_url, fotoUrl, deleteExisting]);

  const handleRemoveImage = () => {
    setLocalFile(null);
    setPreviewUrl('');
    setFotoUrl('');
    setDeleteExisting(Boolean(client?.foto_url));
    if (inputFileRef.current) inputFileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // validações JS complementares (HTML required permanece)
    const v = validateClientInput(fullName, emails, phones);
    if (!v.ok) {
      setLoading(false);
      await swalValidation(v.message!);
      return;
    }

    if (localFile) {
      const vf = validateImageFile(localFile);
      if (!vf.ok) {
        setLoading(false);
        await swalValidation(vf.message!);
        return;
      }
    }

    const confirmed = await confirmSave(!!client, 'cliente');
    if (!confirmed) {
      setLoading(false);
      return;
    }

    try {
      let finalFotoUrl: string | null = fotoUrl || null;
      const originalFoto = client?.foto_url || '';
      let uploadedPath: string | null = null;

      // Upload novo
      if (localFile && user) {
        const { path } = await uploadClientImage(user.id, localFile, client?.id);
        uploadedPath = path;

        // se usava URL pública antes, apenas guardamos path (mantendo compatibilidade)
        finalFotoUrl = path;

        // remove antiga se houver e for diferente
        const oldPath = extractStoragePath(originalFoto, BUCKET_CLIENTS);
        if (oldPath && oldPath !== path) {
          try { await removeFile(oldPath); } catch {}
        }
      }

      // remoção sem novo upload
      if (deleteExisting && !uploadedPath && originalFoto) {
        const oldPath = extractStoragePath(originalFoto, BUCKET_CLIENTS);
        if (oldPath) {
          try { await removeFile(oldPath); } catch {}
        }
        finalFotoUrl = null;
      }

      await onSubmit({
        full_name: fullName,
        emails: normalizeArrayStrings(emails),
        phones: normalizeArrayStrings(phones),
        registration_date: registrationDate,
        foto_url: finalFotoUrl,
      });

      await swalSuccess(client ? 'Cliente atualizado com sucesso.' : 'Cliente criado com sucesso.');
      setDeleteExisting(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      await swalError('Erro', err?.message || 'Falha ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  const addEmail = () => setEmails([...emails, '']);
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addPhone = () => setPhones([...phones, '']);
  const removePhone = (index: number) => setPhones(phones.filter((_, i) => i !== index));
  const updatePhone = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-x-hidden">
      {/* reduzir largura máxima e altura máxima para não estourar a tela; inner scroll já presente */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-800">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={fullName}
              maxLength={80}
              onChange={(e) => setFullName(e.target.value.slice(0, 80))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Registro *
            </label>
            {/* A data é definida automaticamente: hoje para novo cliente; não pode ser editada */}
            <input
              type="date"
              value={registrationDate}
              readOnly
              title="A data é definida automaticamente e não pode ser alterada"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 cursor-default"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                E-mails
              </label>
              <button
                type="button"
                onClick={addEmail}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    maxLength={80}
                    required={index === 0}
                    onChange={(e) => updateEmail(index, e.target.value.slice(0, 80))}
                    placeholder="email@exemplo.com"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Telefones *
              </label>
              <button
                type="button"
                onClick={addPhone}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {phones.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <InputMask mask={maskFor('')} value={phone} onChange={(e) => updatePhone(index, e.target.value)}>
                    {(inputProps: any) => (
                      <input {...inputProps} required={index === 0} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="(00) 00000-0000" />
                    )}
                  </InputMask>
                  {phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto (opcional)</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                {previewUrl ? (
                  <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <img src={FALLBACK_AVATAR} alt="avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={inputFileRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] || null;
                    if (!f) {
                      setLocalFile(null);
                      setFotoUrl('');
                      setPreviewUrl(client?.foto_url || '');
                      setDeleteExisting(false);
                      return;
                    }
                    const vf = validateImageFile(f);
                    if (!vf.ok) {
                      e.currentTarget.value = '';
                      setLocalFile(null);
                      await swalValidation(vf.message!);
                      return;
                    }
                    setLocalFile(f);
                    setDeleteExisting(false);
                  }}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => inputFileRef.current?.click()}
                    className="px-3 py-1 bg-white border rounded-md text-sm hover:bg-gray-50"
                  >
                    Escolher foto
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-1 bg-white border rounded-md text-sm hover:bg-gray-50"
                  >
                    Remover
                  </button>
                </div>
                <div className="text-xs text-gray-500">Tipos: jpg, jpeg, png. Máx. recomendado: 2MB.</div>
              </div>
            </div>
           </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
             <button
               type="button"
               onClick={onClose}
               className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
             >
               Cancelar
             </button>
             <button
               type="submit"
               disabled={loading}
               className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
             >
               {loading ? 'Salvando...' : 'Salvar'}
             </button>
           </div>
         </form>
       </div>
     </div>
   );
 }
