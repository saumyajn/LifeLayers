import type { LifeLayersUser } from "../features/auth/authTypes";
import { ServiceUnavailableState } from "./common";

type AccountPanelProps = {
  user: LifeLayersUser | null;
  busy: boolean;
  configured: boolean;
  preferencesReady: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
};

export function AccountPanel({
  user,
  busy,
  configured,
  preferencesReady,
  onSignIn,
  onSignOut,
}: AccountPanelProps) {
  const initials =
    user?.displayName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "LL";

  return (
    <div className="rail-section account-panel">
      <div className="rail-header">
        <p className="rail-label">Account</p>
        <span className={user ? "sync-dot live" : "sync-dot"} aria-hidden="true" />
      </div>

      {user ? (
        <div className="account-card">
          <div className="account-avatar" aria-hidden="true">
            {user.photoURL ? <img src={user.photoURL} alt="" /> : <span>{initials}</span>}
          </div>
          <div>
            <strong>{user.displayName ?? "LifeLayers user"}</strong>
            <small>{user.email ?? "Google account connected"}</small>
            <em>{preferencesReady ? "Preferences syncing" : "Loading preferences"}</em>
          </div>
        </div>
      ) : configured ? (
        <p className="account-copy">
          Sign in to carry saved places, filters, and reviews across sessions.
        </p>
      ) : (
        <ServiceUnavailableState
          className="account-copy"
          service="Firebase"
          description="Add Firebase env values to enable Google login, Firestore saves, and review sync."
        />
      )}

      <button
        className={user ? "secondary-action account-action" : "primary-action account-action"}
        disabled={busy || !configured}
        onClick={user ? onSignOut : onSignIn}
      >
        {busy ? "Working..." : user ? "Sign out" : "Sign in with Google"}
      </button>
    </div>
  );
}
