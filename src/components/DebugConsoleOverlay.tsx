import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2, ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';

interface LogEntry {
  id: string;
  type: 'error' | 'warn' | 'unhandled' | 'promise';
  message: string;
  stack?: string;
  timestamp: string;
}

export function DebugConsoleOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type: LogEntry['type'], msg: string, stack?: string) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        message: msg,
        stack,
        timestamp: timeStr
      };

      setLogs((prev) => [...prev.slice(-49), newEntry]); // Keep last 50 logs
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      const text = args.map(a => (typeof a === 'object' ? (a?.message || JSON.stringify(a, null, 2)) : String(a))).join(' ');
      const errObj = args.find(a => a instanceof Error || (a && typeof a === 'object' && a.stack));
      addLog('error', text, errObj?.stack);
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      const text = args.map(a => (typeof a === 'object' ? (a?.message || JSON.stringify(a, null, 2)) : String(a))).join(' ');
      const errObj = args.find(a => a instanceof Error || (a && typeof a === 'object' && a.stack));
      addLog('warn', text, errObj?.stack);
    };

    const handleWindowError = (event: ErrorEvent) => {
      addLog('unhandled', event.message || 'Unknown window error', event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = typeof reason === 'object' && reason ? (reason.message || JSON.stringify(reason)) : String(reason);
      const stack = typeof reason === 'object' && reason?.stack ? reason.stack : undefined;
      addLog('promise', `Unhandled Rejection: ${msg}`, stack);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!isMinimized && isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized, isOpen]);

  const copyLogs = () => {
    const formatted = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}\n${l.stack ? 'STACK:\n' + l.stack : ''}`).join('\n---\n');
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-3 z-[9999] bg-rose-600/90 text-white p-2.5 rounded-full shadow-2xl backdrop-blur flex items-center gap-1.5 text-xs font-mono font-bold active:scale-95"
      >
        <Terminal size={16} />
        {logs.length > 0 && <span className="bg-white text-rose-600 rounded-full px-1.5 py-0.2 text-[10px]">{logs.length}</span>}
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] max-w-lg mx-auto bg-gray-950/95 text-gray-100 border-t-2 border-rose-500 shadow-2xl backdrop-blur-md font-mono flex flex-col transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800 text-xs">
        <div className="flex items-center gap-2 text-rose-400 font-bold">
          <Terminal size={14} />
          <span>DEBUG LOGS ({logs.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyLogs}
            title="Copy All"
            className="p-1 rounded hover:bg-gray-800 text-gray-300 active:scale-95"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => setLogs([])}
            title="Clear Logs"
            className="p-1 rounded hover:bg-gray-800 text-gray-300 active:scale-95"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-gray-800 text-gray-300 active:scale-95"
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 active:scale-95"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      {!isMinimized && (
        <div className="p-2 overflow-y-auto max-h-[40vh] space-y-2 text-[11px] select-text">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-3 italic">
              Listening for console.error, unhandledrejection, and window.onerror...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded border text-left break-all ${
                  log.type === 'error' || log.type === 'unhandled' || log.type === 'promise'
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                    : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold mb-1">
                  <span className="uppercase px-1 rounded bg-black/40 text-rose-400">{log.type}</span>
                  <span>{log.timestamp}</span>
                </div>
                <div className="font-semibold text-white">{log.message}</div>
                {log.stack && (
                  <pre className="mt-1 p-1.5 bg-black/60 rounded text-[9.5px] text-gray-300 overflow-x-auto whitespace-pre-wrap leading-tight font-mono">
                    {log.stack}
                  </pre>
                )}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
