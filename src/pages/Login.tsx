import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const { staff, setCurrentUser, startShift } = useAppStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    try {
      const user = staff.find(s => s.pin === pin);
      if (user) {
        await startShift(user.id);
        setCurrentUser(user);
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const appendPin = (digit: string) => {
    if (pin.length < 4 && !isLoading) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto-submit when 4 digits are reached
        setTimeout(async () => {
          setIsLoading(true);
          try {
            const user = staff.find(s => s.pin === newPin);
            if (user) {
              await startShift(user.id);
              setCurrentUser(user);
            } else {
              setError('Incorrect PIN');
              setPin('');
            }
          } catch (err) {
            console.error('Auto-login error:', err);
            setError('Connection error. Please try again.');
            setPin('');
          } finally {
            setIsLoading(false);
          }
        }, 300);
      }
    }
  };

  const clearPin = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 md:p-8">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-zinc-200 w-full max-w-sm animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Lock size={36} />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Welcome</h1>
          <p className="text-zinc-500 mt-2 font-medium">Enter your security PIN to start</p>
          {staff.length === 0 && !isLoading && (
            <p className="text-amber-600 mt-2 text-xs font-bold bg-amber-50 p-2 rounded-lg">
              No staff members found. Please wait or contact admin.
            </p>
          )}
        </div>

        <div className="space-y-8">
          <div className="flex justify-center gap-4">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  isLoading 
                    ? 'bg-emerald-200 animate-pulse' 
                    : i < pin.length 
                      ? 'bg-emerald-500 scale-125 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                      : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm text-center font-bold animate-in shake duration-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                disabled={isLoading}
                onClick={() => appendPin(num.toString())}
                className="h-16 md:h-20 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 text-2xl font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center border border-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={isLoading}
              onClick={clearPin}
              className="h-16 md:h-20 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 text-zinc-400 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center border border-zinc-100 text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => appendPin('0')}
              className="h-16 md:h-20 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 text-2xl font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center border border-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              0
            </button>
            <button
              onClick={() => handleLogin()}
              disabled={pin.length !== 4}
              className="h-16 md:h-20 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-300 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-sm uppercase tracking-widest"
            >
              Go
            </button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-[0.2em]">Secure POS System</p>
        </div>
      </div>
    </div>
  );
};
