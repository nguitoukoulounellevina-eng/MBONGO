export const comptesCache: { data: any[] | null; loaded: boolean } = { data: null, loaded: false };
export const revenusCache: { data: any[] | null; loaded: boolean } = { data: null, loaded: false };
export const depensesCache: { data: any[] | null; loaded: boolean } = { data: null, loaded: false };
export const budgetsCache: { data: any[] | null; loaded: boolean } = { data: null, loaded: false };

export function clearAllCache() {
  comptesCache.data = null; comptesCache.loaded = false;
  revenusCache.data = null; revenusCache.loaded = false;
  depensesCache.data = null; depensesCache.loaded = false;
  budgetsCache.data = null; budgetsCache.loaded = false;
}
