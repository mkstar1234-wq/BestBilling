import React from 'react';
import { Lock, ShieldAlert, LogIn, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  loading: boolean;
  error: string | null;
  allowedEmail: string;
}

export function LoginScreen({ onLogin, loading, error, allowedEmail }: LoginScreenProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50/50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 select-none">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/60 p-6 sm:p-8 flex flex-col items-center text-center">
        
        {/* App Logo / Icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 shadow-inner">
          <img 
            src="/adarsh-icon.png" 
            alt="Adarsh Agency" 
            className="w-12 h-12 object-contain"
            onError={(e) => {
              // Fallback to lock icon if image not available
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <Lock className="w-8 h-8 hidden" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
          Adarsh Agency Billing
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          Authorized Cloud & Offline Billing System
        </p>

        {/* Error notice if rejected */}
        {error && (
          <div className="w-full mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-left">
            <div className="flex items-start gap-2.5 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">
                {error}
              </div>
            </div>
            {typeof window !== 'undefined' && (
              <div className="mt-2 pt-2 border-t border-red-200/60 dark:border-red-800/40 flex items-center justify-between text-[11px] text-red-600 dark:text-red-400">
                <span className="font-mono truncate">{window.location.hostname}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.hostname);
                    alert('Copied domain: ' + window.location.hostname);
                  }}
                  className="px-2 py-0.5 bg-red-100 dark:bg-red-900/60 hover:bg-red-200 dark:hover:bg-red-800 rounded font-semibold text-[10px] shrink-0"
                >
                  Copy Domain
                </button>
              </div>
            )}
          </div>
        )}

        {/* Access restricted badge */}
        <div className="w-full mb-6 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-xl flex items-center gap-2 text-left">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="text-[11px] text-amber-800 dark:text-amber-300">
            Protected App: Access restricted to authorized account (<span className="font-semibold">{allowedEmail}</span>).
          </div>
        </div>

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={onLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold text-sm rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>{loading ? 'Authenticating...' : 'Sign in with Google'}</span>
        </button>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-6">
          Secured with Firebase Google Authentication
        </p>
      </div>
    </div>
  );
}
