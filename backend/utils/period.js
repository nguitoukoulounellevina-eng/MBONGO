const { DailyPeriod, WeeklyPeriod, MonthlyPeriod, dateStr } = require('./period-strategies');

class Period {
  static registry = {
    quotidien: DailyPeriod,
    hebdomadaire: WeeklyPeriod,
    mensuel: MonthlyPeriod,
  };

  static register(type, impl) {
    Period.registry[type] = impl;
  }

  constructor(periodeBudget, date = new Date()) {
    this.type = periodeBudget || 'mensuel';
    this.date = date;
    this.impl = Period.registry[this.type];
    if (!this.impl) {
      console.warn(`[Period] Type "${this.type}" inconnu, fallback mensuel`);
      this.impl = MonthlyPeriod;
      this.type = 'mensuel';
    }
  }

  get current()     { return this.impl.getCurrent(this.date) }
  get previous()    { return this.impl.getPrevious(this.date) }
  get next()        { return this.impl.getNext(this.date) }
  get progress()    { return this.impl.getProgress(this.current, this.date) }
  get daysIn()      { return this.impl.daysIn(this.current) }
  get label()       { return this.impl.getLabel(this.current) }
  compareLabel()    { return this.impl.compareLabel() }
  timeContext()     { return this.impl.timeContext() }
  prevLabel()       { return this.impl.getLabel(this.previous) }

  get sqlFilter()   { return 'date BETWEEN ? AND ?' }
  get sqlParams()   { return [this.current.debut, this.current.fin] }
  get prevSqlParams() { return [this.previous.debut, this.previous.fin] }

  get month() {
    return this.date.getMonth() + 1;
  }

  get year() {
    return this.date.getFullYear();
  }

  fromRange(debut, fin) {
    return { debut: dateStr(debut), fin: dateStr(fin) };
  }

  toJSON() {
    return {
      type: this.type,
      current: this.current,
      previous: this.previous,
      next: this.next,
      label: this.label,
      compareLabel: this.compareLabel(),
      timeContext: this.timeContext(),
      prevLabel: this.prevLabel(),
    };
  }
}

module.exports = Period;
