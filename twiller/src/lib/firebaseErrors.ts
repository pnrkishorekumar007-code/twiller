const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use":
    "An account with this email already exists. Try logging in instead.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/user-not-found":
    "No account found with this email. Please sign up first.",
  "auth/invalid-credential": "Invalid email or password. Please try again.",
  "auth/weak-password":
    "Password is too weak. Use at least 6 characters.",
  "auth/user-disabled":
    "This account has been disabled. Contact support.",
  "auth/too-many-requests":
    "Too many attempts. Please try again later.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/popup-closed-by-user":
    "Sign-in popup was closed before completing.",
  "auth/account-exists-with-different-credential":
    "An account already exists with the same email using a different sign-in method.",
  "auth/invalid-verification-code": "Invalid verification code.",
  "auth/invalid-verification-id": "Invalid verification ID.",
  "auth/missing-password": "Please enter a password.",
};

export function getFirebaseErrorMessage(error: any): string {
  const code = error?.code;
  if (code && FIREBASE_ERROR_MESSAGES[code]) {
    return FIREBASE_ERROR_MESSAGES[code];
  }
  return error?.message || "Authentication failed. Please try again.";
}
