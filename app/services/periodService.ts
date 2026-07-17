import { useState, useCallback, useEffect, useMemo } from 'react';
import api from './api';
import { usePeriodContext } from '@/app/contexts/PeriodContext';

export const MONTHS: string[] = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const DAYS: string[] = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
];

interface PeriodBounds {
  debut: string;
  fin: string;
}

interface PeriodWithId extends PeriodBounds {
  id: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getSunday(date: Date): Date {
  const mon = getMonday(date);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return sun;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getMonthBounds(year: number, month: number): PeriodBounds {
  const debut = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const fin = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { debut, fin };
}

function getWeekNumber(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
  return Math.ceil((days + jan1.getDay() + 1) / 7);
}

class PeriodService {
  readonly type: string;
  readonly refDate: Date;
  readonly month: number;
  readonly year: number;
  readonly current: PeriodWithId;
  readonly previous: PeriodBounds;
  readonly next: PeriodBounds;
  readonly label: string;

  constructor(type: string = 'mensuel', refDate: Date = new Date()) {
    this.type = type;
    this.refDate = new Date(refDate);
    this.month = refDate.getMonth() + 1;
    this.year = refDate.getFullYear();

    const { current, previous, next } = this.computeBounds();
    this.current = { ...current, id: this.computeId() };
    this.previous = previous;
    this.next = next;
    this.label = this.computeLabel();
  }

  private computeId(): string {
    const { type, year, month, refDate } = this;
    switch (type) {
      case 'quotidien':
        return formatDate(refDate);
      case 'hebdomadaire': {
        const week = getWeekNumber(refDate);
        return `${year}-S${pad(week)}`;
      }
      case 'mensuel':
      default:
        return `${year}-${pad(month)}`;
    }
  }

  private computeBounds(): {
    current: PeriodBounds;
    previous: PeriodBounds;
    next: PeriodBounds;
  } {
    const { type, refDate, year, month } = this;
    const m = refDate.getMonth();

    switch (type) {
      case 'quotidien': {
        const today = formatDate(refDate);
        return {
          current: { debut: today, fin: today },
          previous: { debut: formatDate(addDays(refDate, -1)), fin: formatDate(addDays(refDate, -1)) },
          next: { debut: formatDate(addDays(refDate, 1)), fin: formatDate(addDays(refDate, 1)) },
        };
      }
      case 'hebdomadaire': {
        const mon = getMonday(refDate);
        const sun = getSunday(refDate);
        const prevMon = addDays(mon, -7);
        const prevSun = addDays(prevMon, 6);
        const nextMon = addDays(mon, 7);
        const nextSun = addDays(nextMon, 6);
        return {
          current: { debut: formatDate(mon), fin: formatDate(sun) },
          previous: { debut: formatDate(prevMon), fin: formatDate(prevSun) },
          next: { debut: formatDate(nextMon), fin: formatDate(nextSun) },
        };
      }
      case 'mensuel':
      default: {
        const current = getMonthBounds(year, month);
        const prevM = m === 0 ? 11 : m;
        const prevY = m === 0 ? year - 1 : year;
        const nextM = m === 11 ? 0 : m + 1;
        const nextY = m === 11 ? year + 1 : year;
        return {
          current,
          previous: getMonthBounds(prevY, prevM),
          next: getMonthBounds(nextY, nextM),
        };
      }
    }
  }

  private computeLabel(): string {
    const { type, refDate, month, year } = this;
    switch (type) {
      case 'quotidien':
        return `${refDate.getDate()} ${MONTHS[refDate.getMonth()]} ${year}`;
      case 'hebdomadaire': {
        const mon = getMonday(refDate);
        const sun = getSunday(refDate);
        const sameMonth = mon.getMonth() === sun.getMonth();
        if (sameMonth) {
          return `${mon.getDate()} - ${sun.getDate()} ${MONTHS[mon.getMonth()]} ${sun.getFullYear()}`;
        }
        return `${mon.getDate()} ${MONTHS[mon.getMonth()]} - ${sun.getDate()} ${MONTHS[sun.getMonth()]} ${sun.getFullYear()}`;
      }
      case 'mensuel':
      default:
        return `${MONTHS[month - 1]} ${year}`;
    }
  }

  timeContext(): string {
    const now = new Date();
    const { type, refDate } = this;

    switch (type) {
      case 'quotidien': {
        return formatDate(now) === formatDate(refDate) ? "aujourd'hui" : 'hier';
      }
      case 'hebdomadaire': {
        const nowMon = getMonday(now);
        const refMon = getMonday(refDate);
        return formatDate(nowMon) === formatDate(refMon) ? 'cette semaine' : 'semaine dernière';
      }
      case 'mensuel':
      default: {
        const same = now.getMonth() === refDate.getMonth() && now.getFullYear() === refDate.getFullYear();
        return same ? 'ce mois-ci' : 'mois dernier';
      }
    }
  }

  compareLabel(): string {
    switch (this.type) {
      case 'quotidien':
        return 'hier';
      case 'hebdomadaire':
        return 'semaine dernière';
      case 'mensuel':
      default:
        return 'mois précédent';
    }
  }

  daysIn(): number {
    const { type, refDate } = this;
    switch (type) {
      case 'quotidien':
        return 1;
      case 'hebdomadaire':
        return 7;
      case 'mensuel':
      default:
        return new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
    }
  }

  getProgress(): number {
    const { type, refDate } = this;
    switch (type) {
      case 'quotidien':
        return Math.min(refDate.getHours() / 24, 1);
      case 'hebdomadaire': {
        const dayOfWeek = refDate.getDay() === 0 ? 6 : refDate.getDay() - 1;
        return Math.min((dayOfWeek + 1) / 7, 1);
      }
      case 'mensuel':
      default: {
        const total = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
        return Math.min(refDate.getDate() / total, 1);
      }
    }
  }

  static getAvailableTypes(): { value: string; label: string }[] {
    return [
      { value: 'quotidien', label: 'Jour' },
      { value: 'hebdomadaire', label: 'Semaine' },
      { value: 'mensuel', label: 'Mois' },
    ];
  }
}

export default PeriodService;

export function usePeriod(initialType?: string, defaultToCurrent = true) {
  const now = new Date();
  const ctx = usePeriodContext();
  const [type, setType] = useState(initialType || ctx.type || 'mensuel');
  const [refDate, setRefDate] = useState<Date>(now);

  const period = useMemo(() => new PeriodService(type, refDate), [type, refDate]);

  const month = period.month;
  const year = period.year;
  const isCurrentMonth = type === 'mensuel' && month === now.getMonth() + 1 && year === now.getFullYear();

  const [availablePeriods, setAvailablePeriods] = useState<{ debut: string; fin: string; label: string; id: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAvailablePeriods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.archive.periods();
      if (Array.isArray(data)) {
        const mapped = data.map((p: any) => {
          const d = p.debut || `${p.annee}-${String(p.mois).padStart(2, '0')}-01`;
          const f = p.fin || formatDate(new Date(parseInt(p.annee), parseInt(p.mois), 0));
          const svc = new PeriodService('mensuel', new Date(d));
          return { debut: d, fin: f, label: svc.label, id: svc.current.id, mois: svc.month, annee: svc.year };
        });
        setAvailablePeriods(mapped);
      }
    } catch { }
    setLoading(false);
  }, []);

  const changePeriod = useCallback((m: number, y: number) => {
    setRefDate(new Date(y, m - 1, 1));
  }, []);

  const changeDate = useCallback((date: Date) => {
    setRefDate(date);
  }, []);

  const changeToPeriod = useCallback((newType: string, date?: Date) => {
    setType(newType);
    if (date) setRefDate(date);
  }, []);

  const formatLabel = useCallback((m?: number, y?: number) => {
    if (m && y) {
      return `${MONTHS[m - 1]} ${y}`;
    }
    return period.label;
  }, [period.label]);

  return {
    type, setType, month, year, isCurrentMonth,
    changePeriod, changeDate, changeToPeriod,
    availablePeriods, loadAvailablePeriods, loading,
    formatLabel,
    current: period.current,
    previous: period.previous,
    next: period.next,
    label: period.label,
    timeContext: period.timeContext(),
    compareLabel: period.compareLabel(),
    daysIn: period.daysIn(),
    progress: period.getProgress(),
    period,
  };
}

export function formatMonthYear(mois: number, annee: number) {
  return `${MONTHS[mois - 1]} ${annee}`;
}
