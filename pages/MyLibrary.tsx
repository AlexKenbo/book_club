
import React, { useState } from 'react';
import { useNavigate } from '../components/Layout';
import { getDb, useRxQuery } from '../db';
import BookCard from '../components/BookCard';
import { Book, BookStatus } from '../types';
import { 
  BuildingLibraryIcon, 
  ArrowLeftOnRectangleIcon, 
} from '@heroicons/react/24/outline';

type Tab = 'my_books' | 'reading';

const MyLibrary: React.FC<{ userId: string; userName: string }> = ({ userId, userName }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('my_books');

  // Мои книги (Свободные + Выданные)
  const myBooks = useRxQuery<Book[]>(db => 
    db.books.find({
      selector: { ownerId: userId },
      sort: [{ createdAt: 'desc' }]
    }), 
    [userId]
  );

  // Книги, которые я взял у других (Читаю)
  const readingBooks = useRxQuery<Book[]>(db => 
    db.books.find({
      selector: { currentBorrowerId: userId }
    }), 
    [userId]
  );

  // Обработчики действий
  const handleBookAction = async (bookId: string | undefined, action: 'delete' | 'return' | 'request' | 'reserve') => {
    if (!bookId) return;
    const db = await getDb();
    const bookDoc = await db.books.findOne(bookId).exec();

    if (action === 'delete' && bookDoc) {
      await bookDoc.remove();
    }

    if (action === 'return' && bookDoc) {
      await bookDoc.patch({ 
        status: BookStatus.Available, 
        currentBorrowerId: undefined, 
        currentBorrowerName: undefined 
      });
    }
  };

  const tabs = [
    { id: 'my_books', label: 'Мои книги', icon: BuildingLibraryIcon, count: myBooks?.length },
    { id: 'reading', label: 'Взял книги', icon: ArrowLeftOnRectangleIcon, count: readingBooks?.length },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-1">
          Моя библиотека
        </h1>
        <p className="text-stone-500 text-sm">Ваша личная коллекция и книги, которые вы читаете.</p>
      </header>

      {/* Навигация по вкладкам */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 border ${
              activeTab === tab.id
                ? 'bg-stone-900 text-white border-stone-900 shadow-lg'
                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-stone-700 text-white' : 'bg-stone-200 text-stone-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="min-h-[300px]">
        
        {/* Вкладка: Мои книги */}
        {activeTab === 'my_books' && (
          !myBooks?.length ? (
            <EmptyState message="У вас пока нет книг." action={() => navigate('/add')} actionText="Добавить книгу" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {myBooks.map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  isOwner={true}
                  currentUserId={userId} 
                  onAction={(a) => handleBookAction(book.id, a)} 
                />
              ))}
            </div>
          )
        )}

        {/* Вкладка: Взял книги */}
        {activeTab === 'reading' && (
          !readingBooks?.length ? (
            <EmptyState message="Вы пока не взяли книг у друзей." action={() => navigate('/')} actionText="Найти книгу" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {readingBooks.map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  isOwner={false}
                  currentUserId={userId} 
                  onAction={() => {}} 
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ message: string; action?: () => void; actionText?: string }> = ({ message, action, actionText }) => (
  <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-stone-300 flex flex-col items-center">
    <div className="text-4xl mb-3 opacity-50">📚</div>
    <p className="text-stone-500 font-medium mb-6">{message}</p>
    {action && (
      <button onClick={action} className="px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all">
        {actionText}
      </button>
    )}
  </div>
);

export default MyLibrary;
