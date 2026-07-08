import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, { API_BASE, getToken } from '../services/api';
import PeriodService from '../services/periodService';

interface PeriodContextValue {
  type: string;
  current: { debut: string; fin: string; id: string };
  previous: { debut: string; fin: string };
  next: { debut: string; fin: string };
  label: string;
  timeContext: string;
  compareLabel: string;
  period: PeriodService;
  loading: boolean;
  changeType: (newType: 'quotidien' | 'hebdomadaire' | 'mensuel') => Promise<void>;
  availableTypes: { value: string; label: string }[];
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [type, setType] = useState('mensuel');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setType('mensuel');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await api.users.me();
        if (user?.periode_budget) {
          setType(user.periode_budget);
        }
      } catch { }
      setLoading(false);
    })();
  }, []);

  const period = useMemo(() => new PeriodService(type), [type]);

  const changeType = useCallback(async (newType: 'quotidien' | 'hebdomadaire' | 'mensuel') => {
    setType(newType);
    try {
      const token = getToken();
      await fetch(`${API_BASE}/users/me/periode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ periode_budget: newType }),
      });
    } catch { }
  }, []);

  const value = useMemo<PeriodContextValue>(() => ({
    type,
    current: period.current,
    previous: period.previous,
    next: period.next,
    label: period.label,
    timeContext: period.timeContext(),
    compareLabel: period.compareLabel(),
    period,
    loading,
    changeType,
    availableTypes: PeriodService.getAvailableTypes(),
  }  ), [type, period, loading, changeType]);

  return (
    <PeriodContext.Provider value={value}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriodContext() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriodContext must be used within PeriodContext');
  return ctx;
}
