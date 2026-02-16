/**
 * Нормализует телефон для сравнения:
 * - убирает все нецифровые символы
 * - заменяет ведущую 8 на 7
 */
export const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) {
    return '7' + digits.slice(1);
  }
  return digits;
};
