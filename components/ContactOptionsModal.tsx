
import React, { useState } from 'react';
import {
  XMarkIcon,
  PhoneIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { createGuestRequest, fetchOwnerProfile } from '../services/guestRequest';

type Screen = 'choose' | 'leave_number' | 'owner_contact' | 'done';

interface ContactOptionsModalProps {
  bookId: string;
  bookImageUrl: string;
  ownerId: string;
  ownerName: string;
  onClose: () => void;
  onNavigateAuth: () => void;
}

const ContactOptionsModal: React.FC<ContactOptionsModalProps> = ({
  bookId,
  bookImageUrl,
  ownerId,
  ownerName,
  onClose,
  onNavigateAuth
}) => {
  const [screen, setScreen] = useState<Screen>('choose');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);

  const handleLeaveNumber = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSending(true);
    try {
      await createGuestRequest({
        bookId,
        bookImageUrl,
        lenderId: ownerId,
        lenderName: ownerName,
        guestName: name.trim(),
        guestPhone: phone.trim()
      });
      setScreen('done');
    } catch {
      alert('Не удалось отправить. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  const handleShowOwnerContact = async () => {
    setLoadingOwner(true);
    setScreen('owner_contact');
    const profile = await fetchOwnerProfile(ownerId);
    setOwnerPhone(profile?.phone_number || null);
    setLoadingOwner(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm relative shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* Заголовок */}
        <div className="flex items-center justify-between mb-5">
          {screen !== 'choose' && screen !== 'done' && (
            <button onClick={() => setScreen('choose')} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
              <ArrowLeftIcon className="w-4 h-4 text-stone-500" />
            </button>
          )}
          <h3 className="text-lg font-serif font-bold text-stone-900 flex-1 text-center">
            {screen === 'choose' && 'Как связаться?'}
            {screen === 'leave_number' && 'Оставить номер'}
            {screen === 'owner_contact' && 'Контакт хозяина'}
            {screen === 'done' && 'Готово!'}
          </h3>
          <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
            <XMarkIcon className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Экран выбора */}
        {screen === 'choose' && (
          <div className="space-y-3">
            <p className="text-sm text-stone-500 mb-4 text-center">
              Книга принадлежит <span className="font-bold text-stone-800">{ownerName}</span>. Выберите способ связи:
            </p>

            <button
              onClick={() => setScreen('leave_number')}
              className="w-full p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-left flex items-center gap-3 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                <PhoneIcon className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Оставить свой номер</div>
                <div className="text-xs text-stone-500">Хозяин перезвонит вам</div>
              </div>
            </button>

            <button
              onClick={handleShowOwnerContact}
              className="w-full p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-2xl text-left flex items-center gap-3 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-800" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Позвонить хозяину</div>
                <div className="text-xs text-stone-500">Увидеть номер и связаться</div>
              </div>
            </button>

            <button
              onClick={() => { onClose(); onNavigateAuth(); }}
              className="w-full p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-left flex items-center gap-3 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowRightOnRectangleIcon className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Войти и забронировать</div>
                <div className="text-xs text-stone-500">Авторизация по SMS</div>
              </div>
            </button>
          </div>
        )}

        {/* Экран "Оставить номер" */}
        {screen === 'leave_number' && (
          <div>
            <p className="text-sm text-stone-500 mb-5 text-center">
              Оставьте свои данные — хозяин книги свяжется с вами.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 block">Имя</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 block">Телефон</label>
                <div className="relative">
                  <PhoneIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleLeaveNumber}
              disabled={!name.trim() || !phone.trim() || sending}
              className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-100 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
            >
              {sending ? (
                <span className="animate-pulse">Отправка...</span>
              ) : (
                'Отправить'
              )}
            </button>
          </div>
        )}

        {/* Экран "Контакт хозяина" */}
        {screen === 'owner_contact' && (
          <div className="text-center">
            {loadingOwner ? (
              <div className="py-8">
                <div className="w-8 h-8 border-3 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-stone-400">Загрузка...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <span className="text-2xl font-serif font-bold text-green-800">{ownerName.charAt(0)}</span>
                </div>
                <div className="text-lg font-bold text-stone-900 mb-1">{ownerName}</div>

                {ownerPhone ? (
                  <div className="space-y-3 mt-5">
                    <a
                      href={`tel:${ownerPhone}`}
                      className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
                    >
                      <PhoneIcon className="w-5 h-5" />
                      Позвонить: {ownerPhone}
                    </a>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-stone-50 rounded-xl text-sm text-stone-500">
                    Хозяин не указал номер телефона. Попробуйте оставить свой номер.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Экран "Готово" */}
        {screen === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-stone-700 font-medium mb-1">Ваш номер отправлен!</p>
            <p className="text-sm text-stone-500 mb-6">Хозяин книги свяжется с вами.</p>
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold active:scale-95 transition-all"
            >
              Закрыть
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ContactOptionsModal;
