
import { getSupabase } from '../lib/supabaseClient';
import { normalizePhone } from '../lib/phoneUtils';

/**
 * При входе пользователя — ищет книги и заявки с совпадающим телефоном
 * и привязывает их к аккаунту.
 */
export const matchPhoneRecords = async (userId: string, phone: string) => {
  const supabase = getSupabase();
  if (!supabase || !phone) return;

  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 10) return;

  // 1. Книги: current_borrower_phone совпадает И current_borrower_id пустой
  try {
    const { data: books } = await supabase
      .from('books')
      .select('id, current_borrower_phone')
      .or('current_borrower_id.is.null,current_borrower_id.eq.')
      .not('current_borrower_phone', 'is', null);

    if (books) {
      for (const book of books) {
        if (book.current_borrower_phone && normalizePhone(book.current_borrower_phone) === normalized) {
          await supabase
            .from('books')
            .update({
              current_borrower_id: userId,
              updated_at: new Date().toISOString()
            })
            .eq('id', book.id);

          console.log(`Matched book ${book.id} to user ${userId}`);
        }
      }
    }
  } catch (err) {
    console.warn('Phone matching (books) error:', err);
  }

  // 2. Заявки: borrower с временным профилем (is_public=false)
  try {
    const { data: requests } = await supabase
      .from('requests')
      .select('id, borrower_id, borrower_phone')
      .not('borrower_phone', 'is', null);

    if (requests) {
      for (const req of requests) {
        if (req.borrower_phone && normalizePhone(req.borrower_phone) === normalized && req.borrower_id !== userId) {
          // Проверяем что borrower — временный профиль
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_public')
            .eq('id', req.borrower_id)
            .single();

          if (profile && !profile.is_public) {
            await supabase
              .from('requests')
              .update({
                borrower_id: userId,
                updated_at: new Date().toISOString()
              })
              .eq('id', req.id);

            console.log(`Matched request ${req.id} to user ${userId}`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Phone matching (requests) error:', err);
  }
};
