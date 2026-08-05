"use strict";

// ----- Firebase init -----
firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();

// Demo mode: the tutorial demo always uses this fixed password.
const DEMO_PASSWORD = "VectorM@Youtube";

// ----- Elements -----
const $ = (id) => document.getElementById(id);
const errorBox = $("errorBox");
const successBox = $("successBox");
const nameField = $("nameField");
const nameInput = $("name");
const emailInput = $("email");
const passwordInput = $("password");
const submitBtn = $("submitBtn");
const signInTab = $("signInTab");
const signUpTab = $("signUpTab");
const modeHint = $("modeHint");
const authCard = document.querySelector(".auth-card");
const dashboard = $("dashboard");

let mode = "signin"; // "signin" | "signup"

// ----- UI helpers -----
function showError(message) {
  successBox.hidden = true;
  errorBox.hidden = false;
  errorBox.textContent = message;
}

function showSuccess(message) {
  errorBox.hidden = true;
  successBox.hidden = false;
  successBox.textContent = message;
}

function clearMessages() {
  errorBox.hidden = true;
  successBox.hidden = true;
}

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === "signup";
  nameField.hidden = !signingUp;
  submitBtn.textContent = signingUp ? "Create Account" : "Sign In";
  signInTab.classList.toggle("active", !signingUp);
  signUpTab.classList.toggle("active", signingUp);
  modeHint.innerHTML = signingUp
    ? 'Already have an account? <button type="button" class="link" id="switchMode">Sign In</button>'
    : 'Don\'t have an account? <button type="button" class="link" id="switchMode">Sign Up</button>';
  modeHint.querySelector("#switchMode").addEventListener("click", () =>
    setMode(signingUp ? "signin" : "signup")
  );
  clearMessages();
}

// ----- Firebase errors -> readable messages -----
const FIREBASE_MESSAGES = {
  "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your internet connection.",
  "auth/account-exists-with-different-credential":
    "An account already exists with the same email but a different sign-in method.",
  "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
  "auth/operation-not-allowed": "This sign-in method is not enabled in the Firebase console.",
};

function friendlyError(error) {
  const code = error && error.code;
  if (code && FIREBASE_MESSAGES[code]) return FIREBASE_MESSAGES[code];
  return (error && error.message) || "Something went wrong. Please try again.";
}

// ----- Email / password auth -----
$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const email = emailInput.value.trim();
  const password = passwordInput.value; // demo password: VectorM@Youtube
  const displayName = nameInput.value.trim();

  if (!email || !password) {
    showError("Please fill in your email and password.");
    return;
  }
  if (mode === "signup" && !displayName) {
    showError("Please enter your full name.");
    return;
  }

  submitBtn.disabled = true;
  try {
    if (mode === "signup") {
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      if (displayName) {
        await credential.user.updateProfile({ displayName });
      }
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (error) {
    showError(friendlyError(error));
  } finally {
    submitBtn.disabled = false;
  }
});

// ----- Google -----
$("googleBtn").addEventListener("click", async () => {
  clearMessages();
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (error) {
    showError(friendlyError(error));
  }
});

// ----- Facebook -----
$("facebookBtn").addEventListener("click", async () => {
  clearMessages();
  try {
    const provider = new firebase.auth.FacebookAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (error) {
    showError(friendlyError(error));
  }
});

// ----- Session handling -----
auth.onAuthStateChanged((user) => {
  if (user) {
    authCard.hidden = true;
    dashboard.hidden = false;
    $("userEmail").textContent = user.email || "No email";
    $("userName").textContent =
      user.displayName || user.email || "User";
    $("userAvatar").src =
      user.photoURL ||
      "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=100";
  } else {
    dashboard.hidden = true;
    authCard.hidden = false;
  }
});

$("signOutBtn").addEventListener("click", () => auth.signOut());

// ----- Init -----
passwordInput.value = DEMO_PASSWORD; // demo password is always VectorM@Youtube
setMode("signin");
