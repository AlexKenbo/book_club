
export enum BookStatus {
  Available = 'свободна',
  Borrowed = 'у кого-то',
  Reserved = 'забронирована'
}

export enum RequestStatus {
  Pending = 'ожидает',
  Approved = 'одобрено',
  Rejected = 'отклонено',
  Returned = 'возвращено'
}

export type BookCategory = 'Христианские' | 'Художественные' | 'Саморазвитие';

export interface Book {
  id: string;
  ownerId: string;
  ownerName: string;
  imageUrl: string;
  category: BookCategory;
  status: BookStatus;
  currentBorrowerId?: string;
  currentBorrowerName?: string;
  currentBorrowerPhone?: string;
  createdAt: number;
  updatedAt: string; // ISO string for Supabase sync
}

export interface BorrowRequest {
  id: string;
  bookId: string;
  bookImageUrl: string;
  lenderId: string;
  lenderName: string;
  lenderPhone?: string; // Телефон владельца
  borrowerId: string;
  borrowerName: string;
  borrowerPhone?: string; // Телефон того, кто берет
  status: RequestStatus;
  requestedAt: number;
  updatedAt: string; // ISO string for Supabase sync
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isPublic: boolean;
  updatedAt: string; // ISO string for Supabase sync
}
