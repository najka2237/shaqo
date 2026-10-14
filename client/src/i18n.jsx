import { createContext, useContext, useState, useCallback } from 'react';
import so from './so.js';

// English is the source language; `so.js` maps the English text to Somali.
const Ctx = createContext({ lang: 'en', setLang: () => {}, t: (s) => s });
export const useLang = () => useContext(Ctx);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem('lang') || 'en'; } catch { return 'en'; } });
  const setLang = (l) => { setLangState(l); try { localStorage.setItem('lang', l); } catch { /* ignore */ } document.documentElement.lang = l; };
  const t = useCallback((s) => (lang === 'so' && so[s]) || s, [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
