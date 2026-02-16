
import React, { useState } from 'react';
import { getDb, useRxQuery } from '../db';
import { BookStatus, RequestStatus, BorrowRequest } from '../types';
import { CheckIcon, XMarkIcon, HandRaisedIcon, PaperAirplaneIcon, PhoneIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Requests: React.FC<{ userId: string }> = ({ userId }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Запросы МНЕ (как владельцу)
  const incoming = useRxQuery<BorrowRequest[]>(db => 
    db.requests.find({
        selector: {
            lenderId: userId,
            status: RequestStatus.Pending
        }
    }),
    [userId]
  );
  
  // Запросы МОИ (как читателя)
  const outgoing = useRxQuery<BorrowRequest[]>(db => 
    db.requests.find({
        selector: {
            borrowerId: userId
        },
        sort: [{ requestedAt: 'desc' }]
    }),
    [userId]
  );

  const handleApprove = async (reqId: string, bookId: string, bId: string, bName: string) => {
    try {
        const db = await getDb();
        const reqDoc = await db.requests.findOne(reqId).exec();
        const bookDoc = await db.books.findOne(bookId).exec();

        if (reqDoc && bookDoc) {
             const reqData = reqDoc.toJSON();
             await reqDoc.patch({ status: RequestStatus.Approved });
             await bookDoc.patch({
                status: BookStatus.Borrowed,
                currentBorrowerId: bId,
                currentBorrowerName: bName,
                currentBorrowerPhone: reqData.borrowerPhone || undefined
             });
        }
    } catch (e) {
      console.error(e);
      alert("Ошибка при обновлении статуса");
    }
  };

  const handleReject = async (reqId: string) => {
      const db = await getDb();
      const doc = await db.requests.findOne(reqId).exec();
      if (doc) await doc.patch({ status: RequestStatus.Rejected });
  }

  const handleCancelRequest = async (reqId: string) => {
      const db = await getDb();
      const doc = await db.requests.findOne(reqId).exec();
      if (doc) await doc.remove();
  }

  // Sort incoming manually since we didn't add index on requestedAt for every query in db.ts initially, or use javascript sort
  const sortedIncoming = incoming ? [...incoming].sort((a, b) => a.requestedAt - b.requestedAt) : [];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 pb-10">
      <header>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Активность</h1>
        <p className="text-stone-500">Управление запросами на обмен книгами.</p>
      </header>

      {/* Входящие запросы (Хотят у меня) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <HandRaisedIcon className="w-5 h-5 text-amber-600" />
            <h2 className="text-xs font-black text-stone-900 uppercase tracking-widest">
            Хотят взять у вас
            </h2>
            {sortedIncoming.length > 0 && (
                <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{sortedIncoming.length}</span>
            )}
        </div>
        
        {sortedIncoming.length === 0 ? (
          <div className="p-8 bg-stone-50 border border-dashed border-stone-200 rounded-3xl text-center flex flex-col items-center">
             <span className="text-2xl opacity-30 mb-2">📫</span>
             <p className="text-stone-400 text-sm">Новых запросов пока нет.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedIncoming.map(req => (
              <div key={req.id} className="bg-white p-4 rounded-3xl border border-stone-200 flex flex-col sm:flex-row items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <img 
                  src={req.bookImageUrl} 
                  className="w-16 h-20 object-contain bg-stone-100 rounded-xl shadow-sm border border-stone-100 cursor-pointer hover:opacity-80 transition-opacity" 
                  alt="Book cover" 
                  onClick={() => setSelectedImage(req.bookImageUrl)}
                />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-stone-600">
                    Читатель <span className="font-black text-amber-800">{req.borrowerName}</span>
                  </p>
                  {req.borrowerPhone && (
                      <a href={`tel:${req.borrowerPhone}`} className="inline-flex items-center gap-1 text-xs text-stone-400 mt-1 hover:text-amber-700">
                          <PhoneIcon className="w-3 h-3" />
                          {req.borrowerPhone}
                      </a>
                  )}
                  <p className="text-[10px] text-stone-300 mt-0.5">{new Date(req.requestedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-center">
                  <button 
                    onClick={() => handleReject(req.id)} 
                    className="p-3 bg-stone-50 text-stone-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-colors active:scale-95"
                    title="Отклонить"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => handleApprove(req.id, req.bookId, req.borrowerId, req.borrowerName)} 
                    className="p-3 bg-amber-700 text-white rounded-2xl shadow-lg shadow-amber-100 active:scale-95 transition-all hover:bg-amber-800 flex items-center gap-2"
                  >
                    <CheckIcon className="w-6 h-6" />
                    <span className="text-xs font-bold sm:hidden">Одобрить</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Исходящие запросы (Я хочу) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <PaperAirplaneIcon className="w-5 h-5 text-stone-500" /> 
            <h2 className="text-xs font-black text-stone-900 uppercase tracking-widest">
            Ваши запросы
            </h2>
        </div>

        {!outgoing || outgoing.length === 0 ? (
          <div className="p-8 bg-white border border-stone-100 rounded-3xl text-center text-stone-400 text-sm italic">
            Вы пока не отправляли запросов на книги.
          </div>
        ) : (
          <div className="space-y-3">
            {outgoing.map(req => (
              <div key={req.id} className="bg-white p-4 rounded-3xl border border-stone-200 flex items-center gap-4">
                <div className="relative">
                    <img 
                      src={req.bookImageUrl} 
                      className="w-12 h-16 object-contain bg-stone-100 rounded-lg shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                      alt="Book cover"
                      onClick={() => setSelectedImage(req.bookImageUrl)}
                    />
                    <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
                        req.status === RequestStatus.Pending ? 'bg-amber-100' : 
                        req.status === RequestStatus.Approved ? 'bg-green-100' : 
                        req.status === RequestStatus.Rejected ? 'bg-red-100' : 'bg-stone-100'
                    }`}>
                        {req.status === RequestStatus.Approved && <CheckIcon className="w-3 h-3 text-green-700" />}
                        {req.status === RequestStatus.Rejected && <XMarkIcon className="w-3 h-3 text-red-700" />}
                        {req.status === RequestStatus.Pending && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>}
                        {req.status === RequestStatus.Returned && <CheckIcon className="w-3 h-3 text-stone-500" />}
                    </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-stone-400 font-bold uppercase mb-0.5">{new Date(req.requestedAt).toLocaleDateString()}</p>
                  <p className="text-xs font-bold text-stone-800 truncate">
                      {req.status === RequestStatus.Pending && (
                          <>Ждем ответа от: <span className="text-amber-800">{req.lenderName || 'Владельца'}</span></>
                      )}
                      {req.status === RequestStatus.Approved && (
                          <span className="text-green-700">{req.lenderName || 'Владелец'} одобрил!</span>
                      )}
                      {req.status === RequestStatus.Rejected && (
                          <span className="text-red-700">{req.lenderName || 'Владелец'} отказал</span>
                      )}
                      {req.status === RequestStatus.Returned && 'Книга возвращена'}
                  </p>
                  {/* Показываем телефон владельца */}
                  {req.lenderPhone && (
                      <a href={`tel:${req.lenderPhone}`} className="inline-flex items-center gap-1 text-[10px] text-stone-500 mt-1 font-medium bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100 hover:bg-amber-50 hover:text-amber-800 transition-colors">
                          <PhoneIcon className="w-3 h-3" />
                          {req.lenderPhone}
                      </a>
                  )}
                </div>
                
                {req.status === RequestStatus.Pending ? (
                   <button 
                      onClick={() => handleCancelRequest(req.id)}
                      className="px-3 py-2 bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-600 rounded-xl text-[10px] font-bold uppercase transition-colors active:scale-95 flex items-center gap-1"
                   >
                      <XMarkIcon className="w-3 h-3" />
                      Отмена
                   </button>
                ) : (
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl whitespace-nowrap ${
                    req.status === RequestStatus.Approved ? 'bg-green-50 text-green-700 border border-green-100' : 
                    req.status === RequestStatus.Rejected ? 'bg-red-50 text-red-700 border border-red-100' :
                    'bg-stone-50 text-stone-400 border border-stone-100'
                    }`}>
                    {req.status}
                    </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Модальное окно просмотра изображения */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-sm w-full bg-transparent shadow-2xl rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                >
                    <XCircleIcon className="w-6 h-6" />
                </button>
                <img src={selectedImage} alt="Full size" className="w-full h-auto rounded-2xl" />
            </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
