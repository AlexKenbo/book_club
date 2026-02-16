
import React, { useEffect, useRef, useState } from 'react';
import { useRxQuery } from '../db';
import BookCard from '../components/BookCard';
import { useNavigate } from '../components/Layout';
import { UserProfile, Book } from '../types';
import { getDb } from '../db';
import { buildStoragePath, fileToBase64, uploadPublicImage } from '../lib/storage';
import { logger } from '../lib/logger';
import {
  SparklesIcon,
  BookOpenIcon,
  PlusIcon,
  PhoneIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

interface ProfileProps {
  userId: string;
  onSignOut?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ userId, onSignOut }) => {
  const navigate = useNavigate();
  const profile = useRxQuery<UserProfile>(db => db.profiles.findOne(userId), [userId]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    avatarUrl: ''
  });
  
  const currentlyBorrowed = useRxQuery<Book[]>(db => db.books.find({ selector: { currentBorrowerId: userId } }), [userId]);
  
  // Note: For counts, we can just get the length of the result array for now in simple UI
  const myBooks = useRxQuery<Book[]>(db => db.books.find({ selector: { ownerId: userId } }), [userId]);
  const myBooksCount = myBooks?.length || 0;

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name || '',
      phoneNumber: profile.phoneNumber || '',
      avatarUrl: profile.avatarUrl || ''
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [profile?.id, profile?.updatedAt]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setAvatarFile(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setStatus('Имя обязательно.');
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      const db = await getDb();
      const existing = await db.profiles.findOne(userId).exec();
      let avatarUrl = form.avatarUrl || undefined;
      if (avatarFile) {
        try {
          const path = buildStoragePath('avatars', avatarFile, userId);
          avatarUrl = await uploadPublicImage(path, avatarFile);
        } catch (err: any) {
          if (err?.message === 'Supabase client not configured') {
            avatarUrl = await fileToBase64(avatarFile);
          } else {
            throw err;
          }
        }
      }
      await db.profiles.upsert({
        id: userId,
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        avatarUrl,
        isPublic: existing?.isPublic ?? true,
        updatedAt: new Date().toISOString()
      });
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsEditing(false);
    } catch (err) {
      logger.error('Failed to save profile', { error: (err as Error)?.message ?? String(err) });
      setStatus('Не удалось сохранить профиль.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        name: profile.name || '',
        phoneNumber: profile.phoneNumber || '',
        avatarUrl: profile.avatarUrl || ''
      });
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditing(false);
    setStatus(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-[2.5rem] bg-amber-100 ring-4 ring-white shadow-xl flex items-center justify-center text-4xl text-amber-800 font-serif font-bold overflow-hidden">
            {avatarPreview || profile?.avatarUrl ? (
              <img src={avatarPreview || profile?.avatarUrl} alt={profile?.name} className="w-full h-full object-cover" />
            ) : (
              profile?.name?.charAt(0) || '?'
            )}
          </div>
          {isEditing && (
            <button
              onClick={handleAvatarPick}
              className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-lg"
              title="Изменить фото"
            >
              <CameraIcon className="w-4 h-4" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-stone-900">{profile?.name || 'Пользователь'}</h1>
            <SparklesIcon className="w-5 h-5 text-amber-500" />
          </div>
          {profile?.phoneNumber && (
             <div className="flex items-center justify-center gap-1.5 mt-1 text-sm text-stone-400">
               <PhoneIcon className="w-3.5 h-3.5" />
               <span>{profile.phoneNumber}</span>
             </div>
          )}
          <div className="mt-3 flex items-center justify-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-xs font-bold rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Редактировать
              </button>
            ) : (
              <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Режим редактирования</span>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <section className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Данные профиля</div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Имя</label>
            <input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-amber-500 focus:ring-amber-200 focus:outline-none"
              placeholder="Ваше имя"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Телефон</label>
            <input
              value={form.phoneNumber}
              onChange={e => setForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-amber-500 focus:ring-amber-200 focus:outline-none"
              placeholder="+7 900 000-00-00"
            />
          </div>
          {status && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl px-4 py-3 text-sm">
              {status}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving ? 'Сохраняем...' : 'Сохранить'}
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="w-full py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
            >
              Отмена
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* Add Book Button Section */}
      <div className="px-4">
        <button 
          onClick={() => navigate('/add')}
          className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold shadow-lg shadow-stone-200 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-black"
        >
          <PlusIcon className="w-5 h-5" />
          Добавить книгу в библиотеку
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-stone-200 text-center shadow-sm">
          <div className="text-3xl font-serif font-bold text-amber-800 mb-1">{myBooksCount}</div>
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Мои книги</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-200 text-center shadow-sm">
          <div className="text-3xl font-serif font-bold text-amber-800 mb-1">{currentlyBorrowed?.length || 0}</div>
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Взял книги</div>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Настройки</div>
        <div className="p-6">
          <div className="flex flex-col gap-3">
            <button
              onClick={onSignOut}
              className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-stone-900 active:scale-95 transition-all"
            >
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpenIcon className="w-5 h-5 text-stone-400" />
          <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Книги у меня на руках</h2>
        </div>
        {!currentlyBorrowed || currentlyBorrowed.length === 0 ? (
          <div className="p-10 bg-stone-100 rounded-3xl text-center text-stone-400 italic text-sm border-2 border-dashed border-stone-200">
            Вы пока не брали книги у других.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {currentlyBorrowed.map(book => (
              <BookCard 
                key={book.id} 
                book={book} 
                isOwner={false} 
                onAction={() => {}} 
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
