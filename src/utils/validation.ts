export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length === 11;
};

export const normalizeArrayStrings = (arr: string[]) =>
  (arr || []).map(s => (s || '').trim()).filter(Boolean);

export const validateImageFile = (file: File) => {
  const maxSize = 2 * 1024 * 1024; // 2MB
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'];
  if (!allowed.includes(file.type)) {
    return { ok: false, message: 'O arquivo deve ser jpeg, jpg, png ou svg.' };
    }
  if (file.size > maxSize) {
    return { ok: false, message: 'A imagem deve ter no máximo 2MB.' };
  }
  return { ok: true };
};

export const safeFileName = (name: string) => {
  const extMatch = name.match(/\.([^.]+)$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
  const base = name.replace(/\.[^/.]+$/, '');
  const safeBase = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_.]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
  return `${safeBase}${ext}`;
};

// retorna { ok, message? } para validar o formulário do cliente
export const validateClientInput = (fullName: string, emails: string[], phones: string[]) => {
  if (!fullName || !fullName.trim()) return { ok: false, message: 'O nome é obrigatório.' };
  const emailList = normalizeArrayStrings(emails);
  if (emailList.length === 0) return { ok: false, message: 'Informe ao menos um e-mail.' };
  const invalidEmail = emailList.find(e => !isValidEmail(e));
  if (invalidEmail) return { ok: false, message: `E-mail inválido: ${invalidEmail}` };

  const phoneList = normalizeArrayStrings(phones);
  if (phoneList.length === 0) return { ok: false, message: 'Informe ao menos um telefone.' };
  const invalidPhone = phoneList.find(p => !isValidPhone(p));
  if (invalidPhone) return { ok: false, message: `Telefone inválido: ${invalidPhone}` };

  return { ok: true };
};

// retorna { ok, message? } para validar o formulário do contato
export const validateContactInput = (fullName: string, emails: string[], phones: string[]) => {
  return validateClientInput(fullName, emails, phones);
};

export const safeFilenameForExport = (s: string) =>
  (s || 'document').replace(/[^a-z0-9_\-\.]/gi, '_');