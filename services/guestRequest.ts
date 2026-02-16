
import { getSupabase } from '../lib/supabaseClient';
import { logger } from '../lib/logger';

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

export interface GuestRequestParams {
  bookId: string;
  bookImageUrl: string;
  lenderId: string;
  lenderName: string;
  guestName: string;
  guestPhone: string;
}

export const createGuestRequest = async (params: GuestRequestParams) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const tempProfileId = generateId();
  const now = new Date().toISOString();

  // 1. Создаём временный профиль (для FK на requests.borrower_id)
  const { error: profileError } = await supabase.from('profiles').insert({
    id: tempProfileId,
    name: params.guestName,
    phone_number: params.guestPhone,
    is_public: false,
    updated_at: now
  });

  if (profileError) {
    logger.error('Failed to create guest profile', { error: profileError.message });
    throw profileError;
  }

  // 2. Создаём запрос
  const { error: requestError } = await supabase.from('requests').insert({
    id: generateId(),
    book_id: params.bookId,
    book_image_url: params.bookImageUrl,
    lender_id: params.lenderId,
    lender_name: params.lenderName,
    borrower_id: tempProfileId,
    borrower_name: params.guestName,
    borrower_phone: params.guestPhone,
    status: 'ожидает',
    requested_at: Date.now(),
    updated_at: now
  });

  if (requestError) {
    logger.error('Failed to create guest request', { error: requestError.message });
    throw requestError;
  }
};

export const fetchOwnerProfile = async (ownerId: string) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone_number')
    .eq('id', ownerId)
    .single();

  if (error) {
    logger.error('Failed to fetch owner profile', { error: error.message, ownerId });
    return null;
  }

  return data as { id: string; name: string; phone_number?: string } | null;
};
