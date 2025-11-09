export function maskFor(_value: string): string {
  // máscara fixa (xx) xxxxx-xxxx
  return '(99) 99999-9999';
}

export function normalizeDigits(s: string): string {
  return (s || '').replace(/\D/g, '');
}

// valida telefone com DDD + 9 dígitos (11 dígitos)
export function isValidPhone(s: string): boolean {
  const d = normalizeDigits(s);
  return d.length === 11;
}