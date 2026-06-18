import { useCallback, useEffect, useState } from "react";
import { listenForUser, signInWithGoogle, signOutUser } from "../features/auth/authService";
import type { LifeLayersUser } from "../features/auth/authTypes";
import { getErrorMessage } from "../lib/lifelayers";
import { isFirebaseConfigured } from "../services/firebase/firebaseApp";

export function useLifeLayersAuth({
  setActionStatus,
}: {
  setActionStatus: (message: string) => void;
}) {
  const [currentUser, setCurrentUser] = useState<LifeLayersUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);

  useEffect(
    () =>
      listenForUser((user) => {
        setCurrentUser(user);
        setAuthReady(true);
      }),
    [],
  );

  const handleGoogleSignIn = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setActionStatus("Add Firebase env values to enable Google login.");
      return;
    }

    setAuthBusy(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) {
        setActionStatus(result.message);
        return;
      }

      setActionStatus(result.user ? "Signed in with Google." : "Redirecting to Google login...");
    } catch (error) {
      setActionStatus(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }, [setActionStatus]);

  const handleSignOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      const result = await signOutUser();
      setActionStatus(result.ok ? "Signed out." : result.message);
    } catch (error) {
      setActionStatus(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }, [setActionStatus]);

  return {
    currentUser,
    authBusy,
    authReady,
    handleGoogleSignIn,
    handleSignOut,
  };
}
