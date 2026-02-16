
import React, { useState, useEffect } from 'react';
import { useNavigate } from '../components/Layout';
import { getDb, useRxQuery, generateId } from '../db';
import BookCard from '../components/BookCard';
import ContactOptionsModal from '../components/ContactOptionsModal';
import { RequestStatus, Book, BorrowRequest } from '../types';

interface DiscoverProps {
  userId?: string;
  userName?: string;
  canRequest: boolean;
  showAuthCta?: boolean;
  onEnableDemo?: () => void;
}

const Discover: React.FC<DiscoverProps> = ({ userId, userName, canRequest, showAuthCta = false, onEnableDemo }) => {
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [optimisticPending, setOptimisticPending] = useState<Set<string>>(new Set());
  const [contactBook, setContactBook] = useState<{ id: string; imageUrl: string; ownerId: string; ownerName: string } | null>(null);

  // Получаем книги (чужие)
  const books = useRxQuery<Book[]>(db => 
    db.books.find({
        selector: { 
            ...(userId ? { ownerId: { $ne: userId } } : {})
        },
        sort: [{ createdAt: 'desc' }]
    }), 
    [userId]
  );

  // Получаем мои активные заявки из БД
  const myRequests = useRxQuery<BorrowRequest[]>(db => 
    userId
      ? db.requests.find({
          selector: {
            borrowerId: userId,
            status: RequestStatus.Pending
          }
        })
      : null,
    [userId]
  );

  // Синхронизация optimistic UI
  useEffect(() => {
    if (myRequests) {
        const realPendingIds = new Set(myRequests.map(r => r.bookId));
        setOptimisticPending(prev => {
            const next = new Set(prev);
            for (const id of prev) {
                if (realPendingIds.has(id)) {
                    next.delete(id);
                }
            }
            return next;
        });
    }
  }, [myRequests]);

  const getIsPending = (bookId: string | undefined) => {
      if (!bookId) return false;
      const inDB = myRequests?.some(r => r.bookId === bookId);
      const inOptimistic = optimisticPending.has(bookId);
      return inDB || inOptimistic;
  };

  const handleRequestBook = async (bookId: string | undefined, ownerId: string, ownerName: string, imageUrl: string) => {
    if (!bookId) return;

    if (!canRequest || !userId || !userName) {
      setContactBook({ id: bookId, imageUrl, ownerId, ownerName });
      return;
    }
    
    // Если уже есть запрос, ничего не делаем (защита от двойного клика)
    if (getIsPending(bookId)) return;

    // Сразу показываем UI "Запрос отправлен" (Optimistic Update)
    setProcessingId(bookId);
    setOptimisticPending(prev => new Set(prev).add(bookId));

    try {
      const db = await getDb();
      
      const existing = await db.requests.findOne({
          selector: { 
              bookId: bookId, 
              borrowerId: userId, 
              status: RequestStatus.Pending 
          }
      }).exec();
        
      if (!existing) {
          // Получаем профили для телефонов
          const lenderProfileDoc = await db.profiles.findOne(ownerId).exec();
          const borrowerProfileDoc = await db.profiles.findOne(userId).exec();
          
          const lenderProfile = lenderProfileDoc?.toJSON();
          const borrowerProfile = borrowerProfileDoc?.toJSON();

          await db.requests.insert({
            id: generateId(),
            bookId,
            bookImageUrl: imageUrl,
            lenderId: ownerId,
            lenderName: ownerName,
            lenderPhone: lenderProfile?.phoneNumber,
            borrowerId: userId,
            borrowerName: userName,
            borrowerPhone: borrowerProfile?.phoneNumber,
            status: RequestStatus.Pending,
            requestedAt: Date.now()
          });
      }
    } catch (err) {
      console.error(err);
      // Откат оптимистичного обновления при ошибке
      setOptimisticPending(prev => { const s = new Set(prev); s.delete(bookId); return s; });
      alert("Не удалось отправить запрос. Попробуйте снова.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {showAuthCta && (
        <div className="bg-white border border-stone-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-900 mb-1">Войдите, чтобы брать книги</h2>
            <p className="text-sm text-stone-500">
              Авторизуйтесь по номеру телефона.
            </p>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold"
          >
            Войти
          </button>
        </div>
      )}
      <header>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Найти что почитать</h1>
        <p className="text-stone-500">
          Книги сообщества. Нажмите "Хочу почитать", чтобы отправить запрос владельцу.
        </p>
      </header>

      {books === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 lg:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[3/4] bg-stone-200 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="py-20 text-center text-stone-500 bg-white rounded-3xl border border-dashed border-stone-200">
          В библиотеке сообщества пока пусто. Станьте первым!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 lg:gap-6">
          {books.map(book => (
            <div key={book.id} className="h-full"> 
                <BookCard 
                book={book} 
                isOwner={false}
                currentUserId={userId}
                actionLoading={processingId === book.id}
                hasPendingRequest={getIsPending(book.id)}
                onAction={(action) => {
                    if (action === 'request') handleRequestBook(book.id, book.ownerId, book.ownerName, book.imageUrl);
                    if (action === 'reserve') handleRequestBook(book.id, book.ownerId, book.ownerName, book.imageUrl);
                }}
                />
            </div>
          ))}
        </div>
      )}

      {contactBook && (
        <ContactOptionsModal
          bookId={contactBook.id}
          bookImageUrl={contactBook.imageUrl}
          ownerId={contactBook.ownerId}
          ownerName={contactBook.ownerName}
          onClose={() => setContactBook(null)}
          onNavigateAuth={() => navigate('/auth')}
        />
      )}
    </div>
  );
};

export default Discover;
