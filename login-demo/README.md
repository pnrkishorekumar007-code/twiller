# Universal Login Demo (HTML / CSS / JS + Firebase)

A standalone login page with **email/password**, **Google**, and **Facebook**
authentication, built on Firebase Auth. Dark, Twitter-style UI.

## Files

| File                 | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `index.html`         | Login form + provider buttons + dashboard view |
| `style.css`          | Styling                                        |
| `firebase-config.js` | Your Firebase project config                   |
| `app.js`             | Auth logic (email/password, Google, Facebook)  |

## Run it (Live Server)

1. Open this folder in VS Code.
2. Install the **Live Server** extension if you don't have it.
3. Right-click `index.html` -> **Open with Live Server**.
4. A tab opens at `http://127.0.0.1:5500/index.html`.

> Popup sign-in (Google/Facebook) requires a non-`file://` origin, so always use
> Live Server or any localhost server.

## Demo password

The demo password is always: **VectorM@Youtube** (pre-filled in the form).

## Firebase setup (one-time)

The config in `firebase-config.js` points at the `twiller-247bf` project and
works as-is. For a new project:

1. Go to https://console.firebase.google.com and create/open a project.
2. **Authentication -> Sign-in method**:
   - Enable **Email/Password**.
   - Enable **Google** (any Gmail account works).
   - Enable **Facebook**: create a Facebook app at
     https://developers.facebook.com/apps, add **Facebook Login** to it, and
     paste the App ID + App Secret here.
3. **Project settings -> Your apps** -> copy the web app config into
   `firebase-config.js`.
4. Add the page origin (`http://127.0.0.1:5500`) to **Authorized domains**.

## How it works

- **Sign In / Sign Up tabs** — email/password via
  `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` (new users
  also set a display name).
- **Continue with Google** — `signInWithPopup` + `GoogleAuthProvider`.
- **Continue with Facebook** — `signInWithPopup` + `FacebookAuthProvider`.
- After sign-in, a dashboard replaces the form; **Sign Out** returns to the form.
- All Firebase error codes are mapped to readable messages shown in the red box.

## Notes / limitations

- This demo is client-only (no backend, no database persistence beyond
  Firebase Auth). It is not connected to the Twiller app.
- Facebook requires a Facebook Developer app + the two-step Firebase console
  setup above; until then you'll see an `operation-not-allowed` style error.
