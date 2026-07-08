/* ─── Helpers ─── */
function pad(n) { return String(n).padStart(2, '0') }
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function daysInMonth(y, m) { return new Date(y, m, 0).getDate() }

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const start = addDays(date, -(dayNum - 1));
  const end = addDays(start, 6);
  return { start, end, weekNo, year: d.getUTCFullYear() };
}

function formatDateFR(d) {
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShort(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

const MOIS_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/* ═══════════════════════════════════════
   DailyPeriod
   ═══════════════════════════════════════ */
class DailyPeriod {
  static getCurrent(date) {
    const d = dateStr(date);
    return { debut: d, fin: d, id: d };
  }

  static getPrevious(date) {
    return this.getCurrent(addDays(date, -1));
  }

  static getNext(date) {
    return this.getCurrent(addDays(date, 1));
  }

  static getProgress(range, now) {
    return 1;
  }

  static daysIn(range) {
    return 1;
  }

  static getLabel(range) {
    return formatDateFR(new Date(range.debut));
  }

  static compareLabel() {
    return 'hier';
  }

  static timeContext() {
    return "aujourd'hui";
  }
}

/* ═══════════════════════════════════════
   WeeklyPeriod
   ═══════════════════════════════════════ */
class WeeklyPeriod {
  static getCurrent(date) {
    const { start, end, weekNo, year } = getISOWeek(date);
    return { debut: dateStr(start), fin: dateStr(end), id: `${year}-W${weekNo}` };
  }

  static getPrevious(date) {
    return this.getCurrent(addDays(date, -7));
  }

  static getNext(date) {
    return this.getCurrent(addDays(date, 7));
  }

  static getProgress(range, now) {
    const debut = new Date(range.debut);
    const fin = new Date(range.fin);
    const total = (fin - debut) / 86400000 + 1;
    const ecoule = (now - debut) / 86400000 + 1;
    return Math.min(1, Math.max(0, ecoule / total));
  }

  static daysIn(range) {
    return 7;
  }

  static getLabel(range) {
    const debut = new Date(range.debut);
    const fin = new Date(range.fin);
    return `Semaine ${getISOWeek(debut).weekNo} (${formatShort(debut)}-${formatShort(fin)})`;
  }

  static compareLabel() {
    return 'la semaine dernière';
  }

  static timeContext() {
    return 'cette semaine';
  }
}

/* ═══════════════════════════════════════
   MonthlyPeriod
   ═══════════════════════════════════════ */
class MonthlyPeriod {
  static getCurrent(date) {
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return {
      debut: `${y}-${pad(m)}-01`,
      fin: `${y}-${pad(m)}-${daysInMonth(y, m)}`,
      id: `${y}-${pad(m)}`,
    };
  }

  static getPrevious(date) {
    const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    return this.getCurrent(d);
  }

  static getNext(date) {
    const d = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return this.getCurrent(d);
  }

  static getProgress(range, now) {
    const debut = new Date(range.debut);
    const fin = new Date(range.fin);
    const total = (fin - debut) / 86400000 + 1;
    const ecoule = (now - debut) / 86400000 + 1;
    return Math.min(1, Math.max(0, ecoule / total));
  }

  static daysIn(range) {
    const d = new Date(range.debut);
    return daysInMonth(d.getFullYear(), d.getMonth() + 1);
  }

  static getLabel(range) {
    const parts = range.id.split('-');
    return `${MOIS_LABELS[parseInt(parts[1]) - 1]} ${parts[0]}`;
  }

  static compareLabel() {
    return 'le mois dernier';
  }

  static timeContext() {
    return 'ce mois-ci';
  }
}

module.exports = { DailyPeriod, WeeklyPeriod, MonthlyPeriod, dateStr, addDays };
