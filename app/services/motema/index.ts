/* ═══════════════════════════════════════════
   motema/index.ts — Barrel exports
   ═══════════════════════════════════════════ */

// Types
export type {
  Severity, FindingType, Trend,
  FindingScore, AnalysisFinding, FinancialScore, FinancialData,
  AnalysisResult, AnalysisContext, MotemaBriefing,
} from './services/motema.types';

// Core engines
export { calculateFinancialScore, calculateFindingScore } from './core/score.engine';
export {
  collectAllData,
  analyzeRevenus, analyzeDepenses, analyzeBudgets, analyzeObjectifs,
  analyzeHabits, analyzeRisks,
  runFullAnalysis,
} from './core/analysis.engine';
export {
  computeFinalPriority, scoreFindings, getTopPriorities,
  hasCriticalAlerts, summarizePriorities,
} from './core/priority.engine';

// Orchestrator
export { getMotemaBriefing } from './services/motema.service';
