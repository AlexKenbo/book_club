import React, { useEffect, useState } from 'react';
import { getDb, useRxQuery } from './db';
import Layout, { RouterProvider, Routes, Route, Navigate } from './components/Layout';
import MyLibrary from './pages/MyLibrary';
import Discover from './pages/Discover';
import AddBook from './pages/AddBook';
import Profile from './pages/Profile';
import Requests from './pages/Requests';
import Auth from './pages/Auth';
import { seedDatabase, MOCK_USER_A, MOCK_USER_B, MOCK_USER_C } from './services/mockData';
import { runSystemCheck } from './services/testRunner';
import { getStoredSession, getSupabase, setSessionToken } from './lib/supabaseClient';
import { UserProfile } from './types';
type AuthUser = {
  id: string;
  phone?: string | null;
  user_metadata?: {
    name?: string | null;
  };
};
import {
  SparklesIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const DEMO_MODE_KEY = 'libshare_demo_mode';
const ACTIVE_USER_KEY = 'libshare_active_user';

const DemoActivator: React.FC<{ onEnable: () => void }> = ({ onEnable }) => {
  useEffect(() => { onEnable(); }, []);
  return null;
};

const App: React.FC = () => {
  const [activeMockUserId, setActiveMockUserId] = useState(() =>
    localStorage.getItem(ACTIVE_USER_KEY) || MOCK_USER_A.id
  );
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem(DEMO_MODE_KEY) === 'true');
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

  const demoUser =
    activeMockUserId === MOCK_USER_A.id
      ? MOCK_USER_A
      : activeMockUserId === MOCK_USER_B.id
        ? MOCK_USER_B
        : MOCK_USER_C;

  const currentUserId = demoMode ? demoUser.id : authUser?.id;
  const currentUserName = demoMode
    ? demoUser.name
    : liveProfile?.name || authUser?.phone || 'Пользователь';

  const canAccessFull = demoMode || !!authUser;

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
      localStorage.removeItem(DEMO_MODE_KEY);
      setDemoMode(false);
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
          console.warn('Failed to fetch auth session:', error.message);
        }
        const user = data.session?.user ?? null;
        setAuthUser(user);
        if (user) {
          localStorage.removeItem(DEMO_MODE_KEY);
          setDemoMode(false);
        }
        setAuthReady(true);
      })
      .catch(err => {
        if (!mounted) return;
        console.warn('Failed to fetch auth session:', err);
        setAuthReady(true);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        localStorage.removeItem(DEMO_MODE_KEY);
        setDemoMode(false);
      }
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
        console.warn('Failed to ensure profile:', error.message);
      }
    };

    const init = async () => {
      try {
        setIsLoading(true);
        await getDb();

        if (demoMode) {
          await seedDatabase();
        }

        if (authUser) {
          await ensureProfile(authUser);
        }
      } catch (e: any) {
        console.error('Initialization error:', e);
        setInitError(e.message || 'Unknown initialization error');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [authReady, demoMode, authUser?.id]);

  const switchUser = () => {
    let nextUser;
    if (activeMockUserId === MOCK_USER_A.id) nextUser = MOCK_USER_B.id;
    else if (activeMockUserId === MOCK_USER_B.id) nextUser = MOCK_USER_C.id;
    else nextUser = MOCK_USER_A.id;

    setActiveMockUserId(nextUser);
    localStorage.setItem(ACTIVE_USER_KEY, nextUser);
  };

  const resetDemo = async () => {
    if (confirm('Это удалит все локальные данные и вернет приложение в исходное состояние. Продолжить?')) {
      setIsLoading(true);
      try {
        const db = await getDb();
        await db.remove();
        window.location.reload();
      } catch (err) {
        console.error('Error resetting data:', err);
        setIsLoading(false);
      }
    }
  };

  const enableDemo = async () => {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem(ACTIVE_USER_KEY, MOCK_USER_A.id);
    setDemoMode(true);
    setActiveMockUserId(MOCK_USER_A.id);
    const db = await getDb();
    await db.remove();
    window.location.reload();
  };

  const exitDemo = async () => {
    if (!confirm('Выйти из демо-режима? Локальные демо-данные будут удалены.')) return;

    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
    setDemoMode(false);
    const db = await getDb();
    await db.remove();
    window.location.reload();
  };

  const handleRunTests = async () => {
    setIsLoading(true);
    try {
      const result = await runSystemCheck();
      alert(result.logs.join('\n'));
    } catch (e) {
      alert('Test runner failed: ' + e);
    } finally {
      setIsLoading(false);
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
          onClick={resetDemo}
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
      {demoMode && currentUserId && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <SparklesIcon className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest hidden md:inline flex-shrink-0">
              DEMO MODE
            </span>

            <div className="h-4 w-[1px] bg-amber-300 mx-1 hidden md:block"></div>

            <div className="flex items-center gap-2 truncate">
              <span className="text-xs text-amber-800 truncate">
                <span className="hidden sm:inline opacity-70">Вы: </span>
                <span className="font-bold border-b border-amber-800/20">{demoUser.name}</span>
              </span>

              <button
                onClick={switchUser}
                className="flex items-center gap-1 px-2 py-1 bg-white/60 hover:bg-white border border-amber-200 rounded-md text-[10px] font-bold text-amber-800 transition-all shadow-sm active:scale-95 ml-1"
                title="Сменить пользователя"
              >
                <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                <span className="inline sm:hidden">Сменить</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleRunTests}
              className="p-1.5 text-amber-600 hover:text-amber-900 bg-white border border-amber-300 rounded-lg transition-all active:scale-95"
              title="Запустить диагностику"
            >
              <BeakerIcon className="w-4 h-4" />
            </button>
            <button
              onClick={resetDemo}
              className="p-1.5 text-amber-600 hover:text-amber-900 bg-white border border-amber-300 rounded-lg transition-all active:scale-95"
              title="Сбросить демо"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            <button
              onClick={exitDemo}
              className="p-1.5 text-amber-600 hover:text-amber-900 bg-white border border-amber-300 rounded-lg transition-all active:scale-95"
              title="Выйти из демо"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Layout canAccessFull={canAccessFull}>
        <Routes>
          {canAccessFull ? (
            <>
              <Route
                path="/"
                element={<MyLibrary userId={currentUserId as string} userName={currentUserName} />}
              />
              <Route
                path="/discover"
                element={
                  <Discover
                    userId={currentUserId}
                    userName={currentUserName}
                    canRequest
                  />
                }
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
                    mode={demoMode ? 'demo' : 'live'}
                    onSwitchUser={demoMode ? switchUser : undefined}
                    onResetData={demoMode ? resetDemo : undefined}
                    onExitDemo={demoMode ? exitDemo : undefined}
                    onSignOut={!demoMode ? handleSignOut : undefined}
                  />
                }
              />
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Navigate to="/discover" replace />} />
              <Route
                path="/discover"
                element={
                  <Discover
                    canRequest={false}
                    showAuthCta
                    onEnableDemo={enableDemo}
                  />
                }
              />
              <Route path="/demo" element={<DemoActivator onEnable={enableDemo} />} />
              <Route
                path="/auth"
                element={
                  <Auth
                    onEnableDemo={enableDemo}
                    onSignedIn={() => {
                      const session = getStoredSession();
                      if (!session?.userId) return;
                      setAuthUser({
                        id: session.userId,
                        phone: session.phone ?? null,
                        user_metadata: { name: session.name ?? session.phone ?? session.userId }
                      });
                      localStorage.removeItem(DEMO_MODE_KEY);
                      setDemoMode(false);
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/discover" replace />} />
            </>
          )}
        </Routes>
      </Layout>
    </RouterProvider>
  );
};

export default App;
