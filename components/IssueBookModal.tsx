
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { UserProfile } from '../types';
import { normalizePhone } from '../lib/phoneUtils';
import { getSupabase } from '../lib/supabaseClient';

interface IssueBookModalProps {
  onClose: () => void;
  onIssue: (name: string, phone: string, profileId?: string) => void;
}

const IssueBookModal: React.FC<IssueBookModalProps> = ({ onClose, onIssue }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Поиск профилей при вводе телефона
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const normalized = normalizePhone(phone);
    if (normalized.length < 4) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, phone_number, avatar_url, is_public')
          .ilike('phone_number', `%${normalized}%`);

        if (error) {
          console.warn('Profile search error:', error.message);
          return;
        }

        const matched: UserProfile[] = (data || [])
          .filter((p: any) => p.phone_number && p.is_public !== false)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            phoneNumber: p.phone_number,
            avatarUrl: p.avatar_url,
            isPublic: p.is_public,
          } as UserProfile));

        setSuggestions(matched);
      } catch (err) {
        console.warn('Profile search error:', err);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [phone]);

  const handleSelectProfile = (profile: UserProfile) => {
    setName(profile.name);
    setPhone(profile.phoneNumber || phone);
    setSelectedProfileId(profile.id);
    setSuggestions([]);
  };

  const handleClearSelection = () => {
    setSelectedProfileId(null);
    setName('');
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onIssue(trimmedName, phone.trim(), selectedProfileId || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm relative shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-serif font-bold text-stone-900">Выдать книгу</h3>
          <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
            <XMarkIcon className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <p className="text-sm text-stone-500 mb-5">Введите данные человека, которому выдаёте книгу.</p>

        <div className="space-y-4 mb-6">
          {/* Телефон — сначала, чтобы поиск сработал до заполнения имени */}
          <div className="relative">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 block">Телефон</label>
            <div className="relative">
              <PhoneIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value);
                  // Сброс выбора при изменении телефона
                  if (selectedProfileId) {
                    setSelectedProfileId(null);
                    setName('');
                  }
                }}
                placeholder="+7 (999) 123-45-67"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Dropdown с найденными профилями */}
            {suggestions.length > 0 && !selectedProfileId && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleSelectProfile(profile)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-amber-800">{profile.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-stone-900">{profile.name}</div>
                      <div className="text-xs text-stone-400">{profile.phoneNumber}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Имя */}
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 block">Имя</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={e => { if (!selectedProfileId) setName(e.target.value); }}
                readOnly={!!selectedProfileId}
                placeholder="Как зовут читателя"
                className={`w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${selectedProfileId ? 'bg-amber-50 border-amber-200 text-amber-900' : ''}`}
              />
              {selectedProfileId && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 transition-colors"
                  title="Сбросить выбор"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            {selectedProfileId && (
              <p className="text-[11px] text-amber-600 mt-1">Зарегистрированный пользователь</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-100 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
          >
            Выдать
          </button>
          <button onClick={onClose} className="w-full py-3.5 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-colors">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueBookModal;
