'use client';

import React, { useState } from 'react';
import { db } from '@/core/config/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Seeding Script: Dominican Republic Holidays 2026
 * This page is temporary and used to populate the 'holidays' collection in Firestore.
 * Using setDoc with YYYY-MM-DD as ID to ensure idempotency.
 */
export default function SeedPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const drHolidays2026 = [
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-01-05", name: "Three Kings' Day" },
    { date: "2026-01-21", name: "Our Lady of Altagracia Day" },
    { date: "2026-01-26", name: "Juan Pablo Duarte's Birthday" },
    { date: "2026-02-27", name: "National Independence Day" },
    { date: "2026-04-03", name: "Good Friday" },
    { date: "2026-05-04", name: "Labor Day" },
    { date: "2026-06-08", name: "Corpus Christi" },
    { date: "2026-08-16", name: "Restoration Day" },
    { date: "2026-09-24", name: "Our Lady of Mercy Day" },
    { date: "2026-10-12", name: "Columbus Day" },
    { date: "2026-11-02", name: "All Saints' Day" },
    { date: "2026-11-06", name: "Constitution Day" },
    { date: "2026-12-25", name: "Christmas" }
  ];

  const handleSeed = async () => {
    setStatus('loading');
    setMessage('Iniciando inyección de datos...');

    try {
      for (const holiday of drHolidays2026) {
        // Create document reference with date string as ID
        const docRef = doc(db, 'holidays', holiday.date);
        
        // We inject the date as a native Timestamp to maintain compatibility 
        // with the Backend range queries (C# Firestore SDK).
        await setDoc(docRef, {
          name: holiday.name,
          date: Timestamp.fromDate(new Date(`${holiday.date}T12:00:00Z`)), // Midday UTC to avoid timezone shifts
          dateString: holiday.date // Extra field for readability
        });
      }

      setStatus('success');
      setMessage('¡Éxito! 14 feriados han sido inyectados en Firestore.');
    } catch (error: any) {
      console.error("Error seeding Firestore:", error);
      setStatus('error');
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="max-w-md w-full glass-panel p-8 text-center shadow-2xl border border-white/5">
        <h1 className="text-2xl font-bold mb-4 gradient-text">Firestore Seeder</h1>
        <p className="text-zinc-400 mb-8 text-sm">
          Presiona el botón para inyectar los feriados oficiales de RD 2026. 
          Se utilizará el formato de ID <code className="text-blue-400">YYYY-MM-DD</code>.
        </p>

        <button
          onClick={handleSeed}
          disabled={status === 'loading'}
          className={`w-full py-4 px-6 rounded-xl font-bold transition-all-custom ${
            status === 'loading' 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
              : 'gradient-primary text-white hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {status === 'loading' ? 'Inyectando...' : 'Ejecutar Seeding 2026'}
        </button>

        {message && (
          <div className={`mt-6 p-4 rounded-lg text-sm border ${
            status === 'success' 
              ? 'bg-green-500/10 border-green-500/50 text-green-400' 
              : status === 'error' 
                ? 'bg-red-500/10 border-red-500/50 text-red-400' 
                : 'bg-blue-500/10 border-blue-500/50 text-blue-400'
          }`}>
            {message}
          </div>
        )}

        {status === 'success' && (
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-4 text-xs text-zinc-500 hover:text-white underline"
          >
            Volver al inicio
          </button>
        )}
      </div>
    </div>
  );
}
