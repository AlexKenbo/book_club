
import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "../lib/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Uncaught error in ErrorBoundary", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
    });
    this.setState({ errorInfo });
  }

  private handleReset = async () => {
    if (!confirm("Это удалит локальные данные и перезагрузит страницу. Продолжить?")) return;
    
    try {
        // Очистка IndexedDB
        if (window.indexedDB && window.indexedDB.databases) {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
                if (db.name) await window.indexedDB.deleteDatabase(db.name);
            }
        }
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    } catch (e) {
        alert("Не удалось очистить данные автоматически. Пожалуйста, очистите кэш браузера вручную.");
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 p-6 flex flex-col items-center justify-center text-center font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full border border-stone-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Что-то пошло не так</h1>
            <p className="text-stone-500 mb-6 text-sm">Приложение столкнулось с критической ошибкой. Обычно это происходит из-за конфликта старых данных в браузере.</p>
            
            <div className="bg-stone-900 text-stone-300 p-4 rounded-xl text-left text-[10px] font-mono overflow-auto max-h-32 mb-6 border border-stone-800">
              {this.state.error?.toString()}
            </div>

            <button 
                onClick={this.handleReset}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-red-100"
            >
                Сбросить данные и починить
            </button>
            <p className="text-[10px] text-stone-400 mt-3">Это действие безопасно удалит локальную копию базы данных.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
