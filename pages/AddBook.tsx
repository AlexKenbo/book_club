
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from '../components/Layout';
import { getDb, generateId } from '../db';
import { BookStatus, BookCategory } from '../types';
import { CameraIcon, ChevronLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { buildStoragePath, fileToBase64, uploadPublicImage } from '../lib/storage';

const CATEGORIES: BookCategory[] = ['Христианские', 'Художественные', 'Саморазвитие'];

const AddBook: React.FC<{ userId: string; userName: string }> = ({ userId, userName }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [category, setCategory] = useState<BookCategory>('Художественные');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setImageFile(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    setIsSaving(true);
    try {
      const db = await getDb();
      const bookId = generateId();
      let imageUrl = '';
      try {
        const path = buildStoragePath('books', imageFile, bookId);
        imageUrl = await uploadPublicImage(path, imageFile);
      } catch (err: any) {
        if (err?.message === 'Supabase client not configured') {
          imageUrl = await fileToBase64(imageFile);
        } else {
          throw err;
        }
      }
      await db.books.insert({
        id: bookId,
        ownerId: userId,
        ownerName: userName,
        imageUrl,
        category,
        status: BookStatus.Available,
        createdAt: Date.now()
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-stone-200 rounded-full">
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-serif font-bold text-stone-900">Добавить книгу</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-col items-center">
          <div onClick={() => fileInputRef.current?.click()}
            className={`w-full aspect-[3/4] max-w-xs rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative bg-stone-100 ${
              imagePreview ? 'border-amber-700 shadow-xl shadow-amber-100' : 'border-stone-300 hover:border-amber-400'
            }`}>
            {imagePreview ? <img src={imagePreview} className="w-full h-full object-contain bg-stone-100" alt="Preview" /> : (
              <div className="text-center p-6">
                <CameraIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-stone-500">Загрузите обложку</p>
                <p className="text-xs text-stone-400 mt-1">Нажмите для выбора фото</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1 ml-1">Раздел библиотеки</label>
          <div className="grid grid-cols-1 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all font-bold ${
                  category === cat 
                    ? 'border-amber-700 bg-amber-50 text-amber-900' 
                    : 'border-stone-100 bg-stone-50 text-stone-500'
                }`}
              >
                {cat}
                {category === cat && <CheckIcon className="w-5 h-5 text-amber-700" />}
              </button>
            ))}
          </div>
        </div>

        <button disabled={!imageFile || isSaving}
          className="w-full py-4 bg-stone-900 hover:bg-black disabled:bg-stone-300 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2">
          {isSaving ? 'Сохранение...' : 'Поставить на полку'}
          {!isSaving && <CheckIcon className="w-6 h-6" />}
        </button>
      </form>
    </div>
  );
};

export default AddBook;
