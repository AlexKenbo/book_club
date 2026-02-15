
import React, { useState } from 'react';
import { useParams, useNavigate } from '../components/Layout';
import { getDb, useRxQuery, generateId } from '../db';
import { BookStatus, RequestStatus, Book, BorrowRequest } from '../types';
import { ChevronLeftIcon, TrashIcon, ChatBubbleLeftRightIcon, CalendarDaysIcon, UserCircleIcon, BookmarkIcon, ClockIcon } from '@heroicons/react/24/outline';

const BookDetails: React.FC<{ userId: string; userName: string }> = ({ userId, userName }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isRequesting, setIsRequesting] = useState(false);

  // RxDB findOne works with string primary keys
  const book = useRxQuery<Book>(db => 
    id ? db.books.findOne(id) : null,
    [id]
  );
  
  // Проверяем, есть ли уже активный запрос на эту книгу от меня
  const myPendingRequest = useRxQuery<BorrowRequest>(db => 
    id ? db.requests.findOne({
        selector: {
            bookId: id,
            borrowerId: userId,
            status: RequestStatus.Pending
        }
    }) : null,
    [id, userId]
  );

  const isOwner = book?.ownerId === userId;
  const hasPending = !!myPendingRequest;

  const handleBorrowRequest = async () => {
    if (!book || !id) return;
    
    if (hasPending) {
        alert("Запрос уже отправлен.");
        return;
    }

    setIsRequesting(true);
    try {
      const db = await getDb();
      const lenderProfileDoc = await db.profiles.findOne(book.ownerId).exec();
      const borrowerProfileDoc = await db.profiles.findOne(userId).exec();

      await db.requests.insert({
        id: generateId(),
        bookId: id,
        bookImageUrl: book.imageUrl,
        lenderId: book.ownerId,
        lenderName: book.ownerName,
        lenderPhone: lenderProfileDoc?.toJSON()?.phoneNumber,
        borrowerId: userId,
        borrowerName: userName,
        borrowerPhone: borrowerProfileDoc?.toJSON()?.phoneNumber,
        status: RequestStatus.Pending,
        requestedAt: Date.now()
      });
      // UI обновится реактивно
    } catch (err) {
      console.error(err);
      alert("Не удалось отправить запрос. Попробуйте еще раз.");
    } finally {
      setIsRequesting(false);
    }
  };

  if (book === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-stone-200 border-t-amber-700 rounded-full animate-spin"></div>
        <p className="text-stone-400 font-medium">Загрузка информации о книге...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-10 text-center">
        <div className="text-5xl mb-4">🤷‍♂️</div>
        <h2 className="text-xl font-bold text-stone-800 mb-2">Книга не найдена</h2>
        <button onClick={() => navigate('/')} className="text-amber-700 font-bold underline">Вернуться в библиотеку</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-stone-200 rounded-full shadow-sm active:scale-95 transition-all">
          <ChevronLeftIcon className="w-5 h-5 text-stone-600" />
        </button>
        <div className="flex gap-2">
          {isOwner && (
            <button 
              onClick={async () => { 
                if(confirm("Вы уверены, что хотите удалить эту книгу из вашей библиотеки?")) { 
                  const db = await getDb();
                  const doc = await db.books.findOne(id).exec();
                  if (doc) await doc.remove();
                  navigate('/', { replace: true }); 
                } 
              }} 
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
              title="Удалить книгу"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-stone-200 bg-stone-100">
          <img src={book.imageUrl} alt="Book cover" className="w-full h-full object-contain bg-stone-100" />
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="w-5 h-5 text-amber-600" />
            <span className="text-xl font-bold text-stone-800">{book.category}</span>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-stone-100">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Статус</span>
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wide shadow-sm ${
                book.status === BookStatus.Available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {book.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Владелец</span>
              <div className="flex items-center gap-2">
                <span className="text-stone-800 font-bold">{isOwner ? 'Вы' : book.ownerName}</span>
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                   <UserCircleIcon className="w-6 h-6 text-stone-300" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            {!isOwner && (
                <>
                {hasPending ? (
                    <div className="w-full py-5 bg-amber-50 border border-amber-200 text-amber-700 rounded-[2rem] font-bold text-lg flex items-center justify-center gap-3">
                        <ClockIcon className="w-6 h-6" />
                        Запрос отправлен
                    </div>
                ) : (
                    <>
                    {book.status === BookStatus.Available && (
                        <button 
                            onClick={handleBorrowRequest} 
                            disabled={isRequesting}
                            className="w-full py-5 bg-stone-900 hover:bg-black text-white rounded-[2rem] font-bold text-lg shadow-xl shadow-stone-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-stone-400"
                        >
                            <ChatBubbleLeftRightIcon className="w-6 h-6" />
                            {isRequesting ? 'Отправка...' : 'Хочу почитать'}
                        </button>
                    )}
                    {book.status === BookStatus.Borrowed && (
                        <button 
                            onClick={() => alert("Бронирование пока недоступно в демо режиме.")}
                            className="w-full py-5 border-2 border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white rounded-[2rem] font-bold text-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <CalendarDaysIcon className="w-6 h-6" />
                            Забронировать
                        </button>
                    )}
                    </>
                )}
                </>
            )}

            {isOwner && book.status === BookStatus.Borrowed && (
              <button 
                onClick={async () => {
                  const db = await getDb();
                  const doc = await db.books.findOne(id).exec();
                  if (doc) {
                      await doc.patch({ 
                        status: BookStatus.Available, 
                        currentBorrowerId: undefined, 
                        currentBorrowerName: undefined 
                      });
                      alert("Книга отмечена как возвращенная на полку!");
                  }
                }}
                className="w-full py-5 bg-green-600 hover:bg-green-700 text-white rounded-[2rem] font-bold text-lg shadow-lg active:scale-95 transition-all"
              >
                Книга вернулась ко мне
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
