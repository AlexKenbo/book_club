import React, { useEffect, useState } from 'react';
import { getDb, useRxQuery } from './db';
import Layout, { RouterProvider, Routes, Route, Navigate } from './components/Layout';
import MyLibrary from './pages/MyLibrary';
import Discover from './pages/Discover';
import AddBook from './pages/AddBook';
import Profile from './pages/Profile';
import Requests from './pages/Requests';
import Auth from './pages/Auth';
import { getStoredSession, getSupabase, setSessionToken } from './lib/supabaseClient';
import { matchPhoneRecords } from './services/phoneMatching';
import { logger } from './lib/logger';
import { UserProfile } from './types';
type AuthUser = {
  id: string;
  phone?: string | null;
  user_metadata?: {
    name?: string | null;
  };
};
import {
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const liveProfile = useRxQuery<UserProfile>(
    db => {
      if (!authUser?.id) return null;
      return db.profiles.findOne(authUser.id);
    },
    [authUser?.id]
  );

  const currentUserId = authUser?.id;
  const currentUserName = liveProfile?.name || authUser?.phone || 'Пользователь';

  const canAccessFull = !!authUser;

  useEffect(() => {
    const buildStoredUser = (session: ReturnType<typeof getStoredSession>): AuthUser | null => {
      if (!session?.userId) return null;
      return {
        id: session.userId,
        phone: session.phone ?? null,
        user_metadata: { name: session.name ?? session.phone ?? session.userId }
      };
    };

    const storedSession = getStoredSession();
    const storedUser = buildStoredUser(storedSession);
    if (storedUser) {
      setAuthUser(storedUser);
      setAuthReady(true);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          logger.warn('Failed to fetch auth session', { error: error.message });
        }
        setAuthUser(data.session?.user ?? null);
        setAuthReady(true);
      })
      .catch(err => {
        if (!mounted) return;
        logger.warn('Failed to fetch auth session', { error: String(err) });
        setAuthReady(true);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    const ensureProfile = async (user: AuthUser) => {
      const supabase = getSupabase();
      if (!supabase) return;

      const name = user.user_metadata?.name || user.phone || 'Пользователь';
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            name,
            phone_number: user.phone,
            is_public: true
          },
          { onConflict: 'id' }
        );

      if (error) {
        logger.warn('Failed to ensure profile', { error: error.message });
      }

      if (user.phone) {
        matchPhoneRecords(user.id, user.phone).catch(err => logger.warn('Phone matching failed', { error: String(err) }));
      }
    };

    const init = async () => {
      try {
        setIsLoading(true);
        await getDb();

        if (authUser) {
          await ensureProfile(authUser);
        }
      } catch (e: any) {
        logger.error('Initialization error', { error: e.message || String(e) });
        setInitError(e.message || 'Unknown initialization error');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [authReady, authUser?.id]);

  const resetData = async () => {
    if (confirm('Это удалит все локальные данные и вернет приложение в исходное состояние. Продолжить?')) {
      setIsLoading(true);
      try {
        const db = await getDb();
        await db.remove();
        window.location.reload();
      } catch (err) {
        logger.error('Error resetting data', { error: String(err) });
        setIsLoading(false);
      }
    }
  };

  const handleSignOut = async () => {
    const storedSession = getStoredSession();
    if (storedSession?.token) {
      setSessionToken(null);
      setAuthUser(null);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Ошибка запуска</h2>
        <p className="text-stone-500 mb-6 max-w-xs mx-auto text-sm">{initError}</p>
        <button
          onClick={resetData}
          className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold shadow-lg"
        >
          Сбросить базу данных
        </button>
      </div>
    );
  }

  if (isLoading || !authReady) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-amber-700 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-stone-500 font-medium animate-pulse">Загрузка библиотеки...</p>
        <p className="text-stone-400 text-xs mt-2">Подключение к Supabase...</p>
      </div>
    );
  }

  return (
    <RouterProvider>
      <Layout canAccessFull={canAccessFull}>
        <Routes>
          {canAccessFull ? (
            <>
              <Route
                path="/"
                element={
                  <Discover
                    userId={currentUserId}
                    userName={currentUserName}
                    canRequest
                  />
                }
              />
              <Route
                path="/books"
                element={<MyLibrary userId={currentUserId as string} userName={currentUserName} />}
              />
              <Route
                path="/add"
                element={<AddBook userId={currentUserId as string} userName={currentUserName} />}
              />
              <Route path="/requests" element={<Requests userId={currentUserId as string} />} />
              <Route
                path="/profile"
                element={
                  <Profile
                    userId={currentUserId as string}
                    onSignOut={handleSignOut}
                  />
                }
              />
              <Route path="/discover" element={<Navigate to="/" replace />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route
                path="/"
                element={
                  <Discover
                    canRequest={false}
                    showAuthCta
                  />
                }
              />
              <Route
                path="/auth"
                element={
                  <Auth
                    onSignedIn={() => {
                      const session = getStoredSession();
                      if (!session?.userId) return;
                      setAuthUser({
                        id: session.userId,
                        phone: session.phone ?? null,
                        user_metadata: { name: session.name ?? session.phone ?? session.userId }
                      });
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Layout>
    </RouterProvider>
  );
};

export default App;
