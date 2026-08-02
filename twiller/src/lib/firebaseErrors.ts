const FIREBASE_ERROR_KEYS: Record<string, string> = {
  "auth/email-already-in-use": "errors.emailInUse",
  "auth/invalid-email": "errors.invalidEmail",
  "auth/wrong-password": "errors.wrongPassword",
  "auth/user-not-found": "errors.userNotFound",
  "auth/invalid-credential": "errors.invalidCredential",
  "auth/weak-password": "errors.weakPassword",
  "auth/user-disabled": "errors.userDisabled",
  "auth/too-many-requests": "errors.tooManyRequests",
  "auth/network-request-failed": "errors.networkError",
  "auth/operation-not-allowed": "errors.operationNotAllowed",
  "auth/popup-closed-by-user": "errors.popupClosed",
  "auth/account-exists-with-different-credential":
    "errors.accountExistsDifferentCredential",
  "auth/invalid-verification-code": "errors.invalidVerificationCode",
  "auth/invalid-verification-id": "errors.invalidVerificationId",
  "auth/missing-password": "errors.missingPassword",
};

interface FirebaseLikeError {
  code?: string;
  message?: string;
}

export function getFirebaseErrorMessage(
  error: unknown,
  t: (key: string) => string
): string {
  const err = (error ?? null) as FirebaseLikeError | null;
  const serverMsg = (err as {
    response?: { data?: { error?: string } };
  } | null)?.response?.data?.error;
  if (serverMsg) {
    return serverMsg;
  }
  const code = err?.code;
  if (code && FIREBASE_ERROR_KEYS[code]) {
    return t(FIREBASE_ERROR_KEYS[code]);
  }
  return err?.message || t("errors.authFailed");
}
