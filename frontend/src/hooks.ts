import { useCallback, useEffect, useRef, useState } from "react";
import { api, friendlyError, isAbort, type ErrorContext, type Meta } from "./api";

export interface Req<T> { status: "idle" | "loading" | "success" | "error"; data?: T; error?: string }

/** One request at a time: starting a new run aborts the previous one; unmounting aborts too. */
export function useRequest<T>(ctx: ErrorContext) {
  const [state, setState] = useState<Req<T>>({ status: "idle" });
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const run = useCallback(async (fn: (signal: AbortSignal) => Promise<T>) => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setState({ status: "loading" });
    try {
      const data = await fn(c.signal);
      if (!c.signal.aborted) setState({ status: "success", data });
    } catch (e) {
      if (isAbort(e) || c.signal.aborted) return;
      setState({ status: "error", error: friendlyError(e, ctx) });
    }
  }, [ctx]);
  return { state, run, busy: state.status === "loading" };
}

export type Conn = "checking" | "online" | "loading" | "offline";

/** Polls /health (fast while not online, slow once online) and loads /meta when the API is up. */
export function useBackend() {
  const [conn, setConn] = useState<Conn>("checking");
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    let timer = 0;
    let loaded = false;
    const tick = async () => {
      let next = 3000;
      try {
        const h = await api.health(ctl.signal);
        if (h.status === "ok") {
          if (!loaded) { setMeta(await api.meta(ctl.signal)); loaded = true; }
          setConn("online");
          next = 30000;
        } else setConn("loading");
      } catch (e) {
        if (isAbort(e)) return;
        setConn("offline"); // includes "backend still loading the model": it doesn't accept connections yet
      }
      timer = window.setTimeout(tick, next);
    };
    tick();
    return () => { ctl.abort(); clearTimeout(timer); };
  }, []);
  return { conn, meta };
}

/** Light/dark: follows the system until the visitor picks one (then it is remembered). */
export function useTheme() {
  const read = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const [theme, setTheme] = useState<"light" | "dark">(read);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      try { if (localStorage.getItem("theme")) return; } catch { /* ignore */ }
      document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      setTheme(read());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* private mode */ }
    setTheme(next);
  };
  return { theme, toggle };
}
