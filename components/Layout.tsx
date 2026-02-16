
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  BookOpenIcon, 
  MagnifyingGlassIcon, 
  UserIcon, 
  BellIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { 
  BookOpenIcon as BookOpenSolid, 
  MagnifyingGlassIcon as MagnifyingGlassSolid, 
  UserIcon as UserSolid, 
  BellIcon as BellSolid
} from '@heroicons/react/24/solid';
import { APP_VERSION } from '../lib/version';

// --- Custom Router Implementation ---

interface RouterContextType {
  path: string;
  navigate: (to: string | number, options?: { replace?: boolean }) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType>({
  path: '/',
  navigate: () => {},
  params: {},
});

export const useRouter = () => useContext(RouterContext);

export const useNavigate = () => {
  const { navigate } = useRouter();
  return navigate;
};

export const useLocation = () => {
  const { path } = useRouter();
  return { pathname: path };
};

export const useParams = <T extends Record<string, string>>() => {
  const { params } = useRouter();
  return params as T;
};

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [path, setPath] = useState('/');
  // Simple history stack for navigation
  const [historyStack, setHistoryStack] = useState<string[]>(['/']);

  const navigate = (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === 'number') {
      if (to === -1) {
        setHistoryStack(prev => {
          if (prev.length <= 1) return prev;
          const newStack = prev.slice(0, -1);
          setPath(newStack[newStack.length - 1]);
          return newStack;
        });
      }
      return;
    }

    setPath(to);
    setHistoryStack(prev => options?.replace ? [...prev.slice(0, -1), to] : [...prev, to]);
    window.scrollTo(0, 0);
  };

  return (
    <RouterContext.Provider value={{ path, navigate, params: {} }}>
      {children}
    </RouterContext.Provider>
  );
};

export const Link: React.FC<{ to: string; className?: string; children: ReactNode }> = ({ to, className, children }) => {
  const { navigate } = useRouter();
  return (
    <a 
      href={to} 
      onClick={(e) => { e.preventDefault(); navigate(to); }} 
      className={className}
    >
      {children}
    </a>
  );
};

export const Navigate: React.FC<{ to: string; replace?: boolean }> = ({ to, replace }) => {
  const { navigate } = useRouter();
  useEffect(() => {
    navigate(to, { replace });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const matchPath = (current: string, pattern: string) => {
  if (pattern === '*') return { params: {} };
  
  const currentParts = current.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  
  if (currentParts.length !== patternParts.length) return null;
  
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = currentParts[i];
    } else if (patternParts[i] !== currentParts[i]) {
      return null;
    }
  }
  return { params };
};

const RouterContextWrapper: React.FC<{ params: Record<string, string>; children: ReactNode }> = ({ params, children }) => {
  const parent = useContext(RouterContext);
  return (
    <RouterContext.Provider value={{ ...parent, params }}>
      {children}
    </RouterContext.Provider>
  );
};

export const Route: React.FC<{ path: string; element: ReactNode }> = () => null;

export const Routes: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { path } = useRouter();
  let selectedRoute: ReactNode = null;

  const walkChildren = (nodes: ReactNode) => {
    React.Children.forEach(nodes, child => {
      if (selectedRoute) return;
      if (!React.isValidElement(child)) return;

      if (child.type === React.Fragment) {
        walkChildren(child.props.children);
        return;
      }

      const props = child.props as { path?: string; element?: ReactNode };
      if (!props || typeof props.path !== 'string') return;

      const match = matchPath(path, props.path);
      if (match) {
        selectedRoute = (
          <RouterContextWrapper params={match.params}>
            {props.element}
          </RouterContextWrapper>
        );
      }
    });
  };

  walkChildren(children);

  return <>{selectedRoute}</>;
};

// --- Layout Component ---

const Layout: React.FC<{ children: React.ReactNode; canAccessFull: boolean }> = ({ children, canAccessFull }) => {
  const location = useLocation();
  const path = location.pathname;

  // Updated navigation: Removed 'Add' and 'Profile' from the main list
  const navItems = canAccessFull
    ? [
        { name: 'Каталог', path: '/', icon: MagnifyingGlassIcon, activeIcon: MagnifyingGlassSolid },
        { name: 'Мои книги', path: '/books', icon: BookOpenIcon, activeIcon: BookOpenSolid },
        { name: 'Активность', path: '/requests', icon: BellIcon, activeIcon: BellSolid },
      ]
    : [{ name: 'Каталог', path: '/', icon: MagnifyingGlassIcon, activeIcon: MagnifyingGlassSolid }];

  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-64 flex flex-col bg-stone-50 text-stone-900">
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-stone-200 p-6 z-50">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center text-white font-bold">К</div>
          <h1 className="text-xl font-serif font-bold text-stone-800">Книжный клуб ЦХМ</h1>
        </div>
        
        <div className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = path === item.path ? item.activeIcon : item.icon;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  path === item.path ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-stone-500 hover:bg-stone-50'
                }`}>
                <Icon className="w-6 h-6" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
        
        {canAccessFull ? (
          <>
            {/* Desktop Add Button */}
            <Link to="/add" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-stone-500 hover:bg-stone-50 mb-2">
              <PlusIcon className="w-6 h-6" />
              <span>Добавить книгу</span>
            </Link>

            {/* Desktop Profile Link at bottom of sidebar */}
            <Link
              to="/profile"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-auto ${
                path === '/profile' ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-stone-500 hover:bg-stone-50'
              }`}
            >
              {path === '/profile' ? <UserSolid className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
              <span>Профиль</span>
            </Link>
          </>
        ) : (
          <Link
            to="/auth"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-auto text-stone-500 hover:bg-stone-50"
          >
            <UserIcon className="w-6 h-6" />
            <span>Войти</span>
          </Link>
        )}
      </nav>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 py-4 z-40 flex justify-between items-center">
        <h1 className="text-xl font-serif font-bold text-stone-800">Книжный клуб ЦХМ</h1>
        
        <div className="flex items-center gap-3">
          {canAccessFull ? (
            <>
              {/* Add Book Button in Top Mobile Header */}
              <Link
                to="/add"
                className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-sm"
              >
                <PlusIcon className="w-5 h-5 text-white" />
              </Link>

              <Link to="/profile">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border ${
                    path === '/profile' ? 'border-amber-700 bg-amber-50' : 'border-stone-200 bg-stone-100'
                  }`}
                >
                  <UserIcon className={`w-5 h-5 ${path === '/profile' ? 'text-amber-700' : 'text-stone-400'}`} />
                </div>
              </Link>
            </>
          ) : (
            <Link
              to="/auth"
              className="px-3 py-1.5 bg-stone-900 text-white rounded-full text-xs font-bold"
            >
              Войти
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full">
        {children}
      </main>

      <footer className="px-4 pb-24 lg:pb-6 text-[10px] text-stone-400 text-center">
        Версия {APP_VERSION}
      </footer>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-stone-200 px-6 py-2 pb-5 z-50 flex justify-between items-center">
        {navItems.map((item) => {
          const Icon = path === item.path ? item.activeIcon : item.icon;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 w-full">
              <Icon className={`w-6 h-6 ${path === item.path ? 'text-amber-800' : 'text-stone-400'}`} />
              <span className={`text-[10px] ${path === item.path ? 'text-amber-800 font-semibold' : 'text-stone-400'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
