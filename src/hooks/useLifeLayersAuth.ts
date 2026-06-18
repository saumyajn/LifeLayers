import { useCallback, useEffect, useState } from "react";
import {
  isFirebaseConfigured,
  listenForUser,
  signInWithGoogle,
  signOutUser,
  type LifeLayersUser,
} from "../firebase";
import { getErrorMessage } from "../lib/lifelayers";

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
      await signOutUser();
      setActionStatus("Signed out.");
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
