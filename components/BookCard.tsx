
import React, { useState } from 'react';
import { getDb } from '../db';
import { Book, BookStatus, UserProfile } from '../types';
import { 
  TrashIcon, 
  ArrowUturnLeftIcon, 
  HandRaisedIcon,
  ClockIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  CheckCircleIcon,
  BuildingLibraryIcon,
  FaceSmileIcon,
  InformationCircleIcon,
  PhoneIcon,
  XMarkIcon,
  UserCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface BookCardProps {
  book: Book;
  isOwner: boolean;
  currentUserId?: string; // Need this to check if I am the borrower
  onAction: (action: 'delete' | 'return' | 'request' | 'reserve') => void;
  actionLoading?: boolean;
  hasPendingRequest?: boolean;
}

const BookCard: React.FC<BookCardProps> = ({ book, isOwner, currentUserId, onAction, actionLoading = false, hasPendingRequest = false }) => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [borrowerProfile, setBorrowerProfile] = useState<UserProfile | null>(null);
  
  const handleActionClick = (e: React.MouseEvent, action: 'delete' | 'return' | 'request' | 'reserve') => {
    e.stopPropagation(); 
    e.preventDefault(); 
    
    if (action === 'delete') {
       setShowDeleteModal(true);
    } else {
       onAction(action);
    }
  };

  const confirmDelete = () => {
      onAction('delete');
      setShowDeleteModal(false);
  };

  const handleOpenContactModal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!book.currentBorrowerId) return;

    try {
        const db = await getDb();
        const profileDoc = await db.profiles.findOne(book.currentBorrowerId).exec();
        const profile = profileDoc ? profileDoc.toJSON() : null;
        
        // Если профиль не найден (редкий кейс), создаем заглушку из данных книги
        setBorrowerProfile(profile || { 
            id: book.currentBorrowerId, 
            name: book.currentBorrowerName || 'Неизвестный', 
            isPublic: false 
        });
        setShowContactModal(true);
    } catch (err) {
        console.error(err);
    }
  };

  const isBorrowedByMe = !isOwner && book.currentBorrowerId === currentUserId;

  return (
    <>
      <div className="group bg-white rounded-3xl overflow-hidden border border-stone-200 flex flex-col h-full shadow-sm hover:shadow-md transition-all relative">
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
          <img 
            src={book.imageUrl} 
            alt="Book Cover" 
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 bg-stone-100"
            loading="lazy"
          />
          
          {/* Бейдж категории */}
          <div className="absolute bottom-2 left-2">
            <span className="bg-stone-900/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-tight">
              {book.category}
            </span>
          </div>

          {/* Бейдж ожидания */}
          {!isOwner && hasPendingRequest && (
             <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in z-10">
               <div className="bg-amber-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 transform -rotate-3 border-2 border-white">
                 <ClockIcon className="w-4 h-4" />
                 ОЖИДАНИЕ
               </div>
             </div>
          )}

          {/* Бейдж "Вы читаете" - если книга у меня */}
          {isBorrowedByMe && (
             <div className="absolute inset-0 bg-green-900/10 flex items-end justify-center pb-12 p-4 z-10">
               <div className="bg-white/95 backdrop-blur-sm text-green-800 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1.5 border border-green-100">
                 <BookOpenIcon className="w-3 h-3" />
                 ВЫ ЧИТАЕТЕ
               </div>
             </div>
          )}

          {isOwner && book.status === BookStatus.Available && (
            <button 
              type="button"
              onClick={(e) => handleActionClick(e, 'delete')}
              disabled={actionLoading}
              className="absolute top-2 right-2 p-2 bg-white/90 text-stone-400 hover:text-red-500 rounded-full shadow-sm backdrop-blur-sm transition-colors cursor-pointer z-20"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-3 pt-3 pb-0 flex-1 flex flex-col gap-2">
          {/* Инфо строка */}
          <div className="flex items-center justify-between text-stone-500">
             {!isOwner ? (
               // Если я не владелец
               book.status === BookStatus.Borrowed && !isBorrowedByMe ? (
                  // Книга у кого-то другого: ПОКАЗЫВАЕМ "У: [ИМЯ]"
                  <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 w-full opacity-80">
                      <FaceSmileIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wide truncate">
                        У: {book.currentBorrowerName || 'Читателя'}
                      </span>
                   </div>
               ) : (
                  // Книга свободна или у меня: показываем владельца
                  <div className="flex items-center gap-1.5" title="Владелец книги">
                     <BuildingLibraryIcon className="w-3.5 h-3.5 text-stone-400" />
                     <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[100px]">
                       {book.ownerName}
                     </span>
                  </div>
               )
             ) : (
                // Логика для владельца
                book.status === BookStatus.Available ? (
                   <div className="flex items-center gap-1.5 text-green-700">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        На полке
                      </span>
                   </div>
                ) : (
                   // Владелец, книга выдана - КЛИКАБЕЛЬНАЯ ПЛАШКА С ИКОНКОЙ
                   <button 
                      onClick={handleOpenContactModal}
                      className="group/btn flex items-center justify-between gap-2 w-full text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer"
                      title="Нажмите, чтобы увидеть контакты"
                   >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <FaceSmileIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wide truncate">
                          У: {book.currentBorrowerName || 'Читателя'}
                        </span>
                      </div>
                      <InformationCircleIcon className="w-4 h-4 text-amber-400 group-hover/btn:text-amber-600 transition-colors" />
                   </button>
                )
             )}
          </div>
        </div>

        {/* КНОПКИ ДЕЙСТВИЯ - Всегда внизу */}
        <div className="p-3 mt-auto">
          {isOwner && book.status === BookStatus.Borrowed && (
            <button 
              type="button"
              onClick={(e) => handleActionClick(e, 'return')}
              disabled={actionLoading}
              className="w-full py-2.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
              Вернуть на полку
            </button>
          )}

          {!isOwner && (
            <>
              {hasPendingRequest ? (
                <div className="w-full py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-default">
                   <ClockIcon className="w-4 h-4" />
                   Запрос отправлен
                </div>
              ) : (
                <>
                  {book.status === BookStatus.Available && (
                    <button 
                      type="button"
                      onClick={(e) => handleActionClick(e, 'request')}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50 disabled:active:scale-100 cursor-pointer shadow-md"
                    >
                      {actionLoading ? (
                        <span className="animate-pulse">Отправка...</span>
                      ) : (
                        <>
                          <HandRaisedIcon className="w-4 h-4" />
                          Хочу почитать
                        </>
                      )}
                    </button>
                  )}

                  {book.status === BookStatus.Borrowed && !isBorrowedByMe && (
                    <button 
                        type="button"
                        onClick={(e) => handleActionClick(e, 'reserve')}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? (
                          <span className="animate-pulse">Обработка...</span>
                      ) : (
                        <>
                          <CalendarDaysIcon className="w-4 h-4" />
                          Забронировать
                        </>
                      )}
                    </button>
                  )}

                  {/* Если книга выдана мне, кнопка не нужна или может быть неактивной "Читаю" */}
                  {isBorrowedByMe && (
                     <div className="w-full py-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-green-100">
                        У вас на руках
                     </div>
                  )}
                </>
              )}
            </>
          )}
          
          {/* Для владельца, если книга на полке - пустое место или ничего, чтобы не было "gaps" */}
          {isOwner && book.status === BookStatus.Available && (
               <div className="h-[38px]"></div> // Spacer to keep card height consistent with others
          )}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО КОНТАКТОВ */}
      {showContactModal && borrowerProfile && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowContactModal(false)}>
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm relative shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Заголовок и Закрыть */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-serif font-bold text-stone-900">Читатель</h3>
                    <button onClick={() => setShowContactModal(false)} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
                        <XMarkIcon className="w-5 h-5 text-stone-500" />
                    </button>
                </div>

                {/* Аватар и Имя */}
                <div className="flex flex-col items-center mb-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-3 shadow-inner">
                         <span className="text-3xl font-serif font-bold text-amber-800">{borrowerProfile.name.charAt(0)}</span>
                    </div>
                    <div className="text-xl font-bold text-stone-900 mb-1">{borrowerProfile.name}</div>
                    {borrowerProfile.phoneNumber && (
                        <div className="text-sm text-stone-400 flex items-center gap-1.5">
                            <PhoneIcon className="w-4 h-4" />
                            {borrowerProfile.phoneNumber}
                        </div>
                    )}
                </div>

                {/* Кнопка звонка */}
                <div className="space-y-3">
                    {borrowerProfile.phoneNumber ? (
                        <a href={`tel:${borrowerProfile.phoneNumber}`} className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all">
                            <PhoneIcon className="w-5 h-5" />
                            Позвонить: {borrowerProfile.phoneNumber}
                        </a>
                    ) : (
                        <div className="w-full py-3.5 bg-stone-100 text-stone-400 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                            <PhoneIcon className="w-5 h-5" />
                            Телефон не указан
                        </div>
                    )}
                    
                    <button onClick={() => setShowContactModal(false)} className="w-full py-3.5 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-colors">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО УДАЛЕНИЯ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm relative shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center" onClick={e => e.stopPropagation()}>
                
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                </div>
                
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Удалить книгу?</h3>
                <p className="text-stone-500 mb-6 text-sm">
                    Вы собираетесь удалить <span className="font-bold text-stone-800">"{book.category === 'Христианские' ? 'Христианскую книгу' : 'Книгу'}"</span> из вашей библиотеки. Это действие нельзя отменить.
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={confirmDelete} 
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95 transition-all"
                    >
                        <TrashIcon className="w-5 h-5" />
                        Да, удалить
                    </button>
                    
                    <button 
                        onClick={() => setShowDeleteModal(false)} 
                        className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default BookCard;
