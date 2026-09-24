"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "sigma-nu-presentation-privacy";
const COOKIE_KEY = "sigma_nu_presentation_privacy";
const CHANGE_EVENT = "sigma-nu-presentation-privacy-change";
const DESCRIPTION = "Hidden in presentation privacy mode.";
let clientReady = false;

function subscribeToPrivacy(callback: () => void) {
  clientReady = true;
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getClientPrivacyPreference() {
  if (!clientReady) return "unresolved";
  return window.sessionStorage.getItem(STORAGE_KEY) ?? "none";
}

function getServerPrivacyPreference() {
  return "unresolved";
}

type PrivacyContextValue = {
  enabled: boolean;
  resolved: boolean;
  setEnabled: (enabled: boolean) => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PresentationPrivacyProvider({
  initialEnabled,
  children,
}: {
  initialEnabled: boolean;
  children?: React.ReactNode;
}) {
  const storedPreference = useSyncExternalStore(
    subscribeToPrivacy,
    getClientPrivacyPreference,
    getServerPrivacyPreference,
  );
  const resolved = storedPreference !== "unresolved";
  const enabled =
    storedPreference === "on"
      ? true
      : storedPreference === "off"
        ? false
        : initialEnabled;
  const router = useRouter();

  const setEnabled = useCallback(
    (nextEnabled: boolean) => {
      window.sessionStorage.setItem(STORAGE_KEY, nextEnabled ? "on" : "off");
      window.dispatchEvent(new Event(CHANGE_EVENT));
      document.cookie = `${COOKIE_KEY}=${nextEnabled ? "on" : "off"}; Path=/; Max-Age=31536000; SameSite=Lax`;
      router.refresh();
    },
    [router],
  );

  const value = useMemo(
    () => ({ enabled, resolved, setEnabled }),
    [enabled, resolved, setEnabled],
  );

  return (
    <PrivacyContext.Provider value={value}>
      <div data-presentation-privacy={enabled ? "on" : "off"}>
        {children}
        {enabled && (
          <PresentationPrivacyBanner onDisable={() => setEnabled(false)} />
        )}
      </div>
    </PrivacyContext.Provider>
  );
}

export function usePresentationPrivacy() {
  const value = useContext(PrivacyContext);
  if (!value) throw new Error("Presentation privacy provider is missing");
  return value;
}

export function PresentationPrivacyControls({
  canToggle,
}: {
  canToggle: boolean;
}) {
  const { enabled, setEnabled } = usePresentationPrivacy();
  if (!canToggle) return null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Presentation privacy mode"
      title={
        enabled
          ? "Turn off presentation privacy"
          : "Turn on presentation privacy"
      }
      onClick={() => setEnabled(!enabled)}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${enabled ? "bg-[var(--navy)] text-white" : "border bg-white text-[var(--navy)] hover:bg-[var(--surface-subtle)]"}`}
    >
      {enabled ? (
        <EyeOff aria-hidden="true" className="size-4" />
      ) : (
        <Eye aria-hidden="true" className="size-4" />
      )}
      <span className="hidden sm:inline">
        {enabled ? "Privacy on" : "Presentation privacy"}
      </span>
    </button>
  );
}

export function PresentationPrivacyBanner({
  onDisable,
}: {
  onDisable?: () => void;
}) {
  const { enabled, setEnabled } = usePresentationPrivacy();
  if (!enabled) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 flex min-h-12 items-center justify-center gap-3 bg-[var(--navy)] px-4 py-2 text-center text-sm font-semibold text-white shadow-[0_-8px_24px_rgba(17,41,75,0.18)] print:static print:bg-white print:text-black print:shadow-none"
    >
      <span>Presentation privacy mode is on</span>
      <button
        type="button"
        onClick={onDisable ?? (() => setEnabled(false))}
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[var(--navy)] underline-offset-2 hover:underline"
      >
        Turn it off
      </button>
    </div>
  );
}

export function PrivacySensitive({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { enabled, resolved } = usePresentationPrivacy();
  if (enabled || !resolved) {
    return (
      <span
        role="img"
        aria-label={DESCRIPTION}
        data-privacy-sensitive="true"
        className={`privacy-placeholder ${className ?? ""}`}
      >
        {DESCRIPTION}
      </span>
    );
  }
  return <>{children}</>;
}

export function PrivacySensitiveBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { enabled, resolved } = usePresentationPrivacy();
  if (enabled || !resolved) {
    return (
      <div
        role="img"
        aria-label={DESCRIPTION}
        data-privacy-sensitive="true"
        className={`privacy-placeholder-block ${className ?? ""}`}
      >
        {DESCRIPTION}
      </div>
    );
  }
  return <>{children}</>;
}

export function PrivacyActionGuard({
  children,
  label = "Turn off presentation privacy to use this action.",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const { enabled } = usePresentationPrivacy();
  if (!enabled) return <>{children}</>;
  return (
    <div
      role="note"
      className="rounded-xl border border-dashed bg-[var(--surface-subtle)] p-4 text-sm font-semibold text-[var(--muted)]"
    >
      {label}
    </div>
  );
}

export function usePrivacyPathRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => {
    router.replace(pathname as never);
  }, [pathname, router]);
}
