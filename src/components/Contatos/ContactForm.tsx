import React, { useEffect, useState } from 'react';
import InputMask from 'react-input-mask';
import { X, Plus, Trash2 } from 'lucide-react';
import { Contact } from '../../lib/types';
import { maskFor } from '../../utils/phoneMask';
import { validateContactInput, normalizeArrayStrings } from '../../utils/validation';
import { confirmSave, swalError, swalSuccess, swalValidation } from '../../utils/alerts';

interface ContactFormProps {
  clientId: string;
  contact?: Contact | null;
  onSubmit: (data: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onClose: () => void;
}

export default function ContactForm({ clientId, contact, onSubmit, onClose }: ContactFormProps) {
  const [fullName, setFullName] = useState(contact?.full_name || '');
  const [emails, setEmails] = useState<string[]>(contact?.emails?.length ? contact!.emails : ['']);
  const [phones, setPhones] = useState<string[]>(contact?.phones?.length ? contact!.phones : ['']);
  const [masks, setMasks] = useState<string[]>(phones.map(() => maskFor('')));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMasks(phones.map(() => maskFor('')));
  }, [phones.length]);

  const handleEmailChange = (i: number, v: string) => {
    const copy = [...emails]; copy[i] = v; setEmails(copy);
  };
  const handlePhoneChange = (i: number, v: string) => {
    const copy = [...phones]; copy[i] = v; setPhones(copy);
    const masksCopy = [...masks]; masksCopy[i] = maskFor(v); setMasks(masksCopy);
  };

  const addEmail = () => setEmails(prev => [...prev, '']);
  const removeEmail = (i: number) => setEmails(prev => prev.filter((_, idx) => idx !== i));
  const addPhone = () => setPhones(prev => [...prev, '']);
  const removePhone = (i: number) => {
    setPhones(prev => prev.filter((_, idx) => idx !== i));
    setMasks(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const v = validateContactInput(fullName, emails, phones);
    if (!v.ok) {
      setLoading(false);
      await swalValidation(v.message!);
      return;
    }

    const ok = await confirmSave(!!contact, 'contato');
    if (!ok) {
      setLoading(false);
      return;
    }

    try {
      await onSubmit({
        full_name: fullName,
        emails: normalizeArrayStrings(emails),
        phones: normalizeArrayStrings(phones),
        client_id: clientId,
      } as any);
      await swalSuccess(contact ? 'Contato atualizado com sucesso.' : 'Contato criado com sucesso.');
      onClose();
    } catch (err: any) {
      console.error(err);
      await swalError('Erro', err?.message || 'Falha ao salvar contato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* modal responsivo: largura adaptativa, altura limitada e scroll interno */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">{contact ? 'Editar Contato' : 'Novo Contato'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">E-mails *</label>
              <button type="button" onClick={addEmail} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    maxLength={80}
                    required={index === 0}
                    onChange={(e) => handleEmailChange(index, e.target.value.slice(0, 80))}
                    placeholder="email@exemplo.com"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {emails.length > 1 && (
                    <button type="button" onClick={() => removeEmail(index)} className="self-start sm:self-center text-red-600 hover:text-red-700">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Telefones *</label>
              <button type="button" onClick={addPhone} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {phones.map((phone, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2">
                  <InputMask mask={masks[index] || maskFor('')} value={phone} onChange={(e) => handlePhoneChange(index, e.target.value)}>
                    {(inputProps: any) => (
                      <input {...inputProps} required={index === 0} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="(00) 00000-0000" />
                    )}
                  </InputMask>
                  {phones.length > 1 && (
                    <button type="button" onClick={() => removePhone(index)} className="self-start sm:self-center text-red-600 hover:text-red-700">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={loading} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
