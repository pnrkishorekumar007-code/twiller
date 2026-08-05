"use client";

import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { auth } from "./firebase";
import axiosInstance from "../lib/axiosInstance";
import { useToast } from "./ToastContext";
import { applyLanguage } from "@/i18n/config";
import { useTranslation } from "react-i18next";

const PENDING_OTP_KEY = "twiller-pending-login-otp";

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  email: string;
  website: string;
  location: string;
  phone?: string;
  plan?: string;
  tweetCount?: number;
  notificationsEnabled?: boolean;
  language?: string;
  following?: string[];
  followedBy?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string,
    phone?: string
  ) => Promise<void>;
  updateProfile: (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
  }) => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
  googlesignin: () => void;
  otpPending: boolean;
  verifyLoginOtp: (otp: string) => Promise<void>;
  cancelLoginOtp: () => Promise<void>;
  updateLanguage: (lang: string) => void;
  authStatus: "idle" | "signing-in" | "verifying" | "error";
  slowConnect: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otpPending, setOtpPending] = useState(false);
  const [authStatus, setAuthStatus] = useState<
    "idle" | "signing-in" | "verifying" | "error"
  >("idle");
  const [slowConnect, setSlowConnect] = useState(false);
  const loginFlowRef = useRef(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const storeUser = (u: User) => {
    setUser(u);
    localStorage.setItem("twitter-user", JSON.stringify(u));
    applyLanguage(u.language);
  };

  const updateLanguage = (lang: string) => {
    setUser((prev) => (prev ? { ...prev, language: lang } : prev));
    if (user) {
      localStorage.setItem(
        "twitter-user",
        JSON.stringify({ ...user, language: lang })
      );
    }
    // i18n side effects must live outside the state updater (updaters must be
    // pure and may be re-run by React), so apply the language unconditionally.
    applyLanguage(lang);
  };

  const gateLogin = async (): Promise<
    "blocked" | "otpRequired" | "success"
  > => {
    const TIMEOUT_MS = 45000;
    try {
      const res = await Promise.race([
        axiosInstance.post("/auth/login-session"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("LOGIN_SESSION_TIMEOUT")), TIMEOUT_MS)
        ),
      ]);
      if ((res as { data?: { otpRequired?: boolean } }).data?.otpRequired)
        return "otpRequired";
      return "success";
    } catch (err) {
      if (err instanceof Error && err.message === "LOGIN_SESSION_TIMEOUT") {
        throw new Error(t("auth.serverTimeout"));
      }
      const data = (err as {
        response?: { data?: { blocked?: boolean; reason?: string } };
      })?.response?.data;
      if (data?.blocked && data?.reason === "mobile_time_window") {
        return "blocked";
      }
      throw err;
    }
  };

  const fetchUserData = async (email: string) => {
    const res = await axiosInstance.get("/loggedinuser", {
      params: { email },
    });
    return res.data;
  };

  // If the backend call is still running after 60s, the Render free-tier
  // server is likely cold-starting — surface a reassuring message.
  useEffect(() => {
    if (authStatus !== "verifying") {
      setSlowConnect(false);
      return;
    }
    const timer = setTimeout(() => setSlowConnect(true), 60000);
    return () => clearTimeout(timer);
  }, [authStatus]);

  useEffect(() => {
    // Check for existing session
    const unsubcribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (loginFlowRef.current) {
        setIsLoading(false);
        return;
      }

      if (firebaseUser?.email) {
        // A login that still needs OTP verification must not restore the
        // session on reload — otherwise refreshing would bypass the check.
        if (sessionStorage.getItem(PENDING_OTP_KEY)) {
          setUser(null);
          setIsLoading(false);
          return;
        }
        try {
          const res = await axiosInstance.get("/loggedinuser", {
            params: { email: firebaseUser.email },
          });

          if (res.data) {
            storeUser(res.data);
          }
        } catch (err) {
          console.log("Failed to fetch user:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("twitter-user");
      }
      setIsLoading(false);
    });
    return () => unsubcribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthStatus("signing-in");
    loginFlowRef.current = true;
    try {
      const usercred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseuser = usercred.user;
      setAuthStatus("verifying");

      const gate = await gateLogin();

      if (gate === "blocked") {
        await signOut(auth);
        throw new Error(t("auth.mobileBlocked"));
      }

      if (gate === "otpRequired") {
        setOtpPending(true);
        sessionStorage.setItem(PENDING_OTP_KEY, "1");
        setAuthStatus("idle");
        return;
      }

      if (!firebaseuser.email) {
        throw new Error(t("auth.noEmail"));
      }
      const res = await fetchUserData(firebaseuser.email);
      if (res) {
        storeUser(res);
      }
      setAuthStatus("idle");
    } catch (err) {
      setAuthStatus("error");
      console.error("Firebase Error (login):", err);
      console.error(
        "Code:",
        (err as { code?: string })?.code,
        "| Message:",
        (err as { message?: string })?.message
      );
      console.error(
        "Server response:",
        (err as { response?: { data?: unknown } })?.response?.data
      );
      const loginCode = (err as { code?: string })?.code;
      if (
        loginCode === "auth/invalid-credential" ||
        loginCode === "auth/user-not-found" ||
        loginCode === "auth/wrong-password"
      ) {
        let methods: string[] | null = null;
        try {
          methods = await fetchSignInMethodsForEmail(auth, email);
        } catch {
          methods = null;
        }
        if (
          methods &&
          methods.includes("google.com") &&
          !methods.includes("password")
        ) {
          console.error(
            `Google-only account detected for ${email} - please sign in with Google.`
          );
          throw new Error(t("auth.googleOnly"));
        }
      }
      throw err;
    } finally {
      loginFlowRef.current = false;
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    phone?: string
  ) => {
    setIsLoading(true);
    setAuthStatus("signing-in");
    try {
      const usercred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      setAuthStatus("verifying");
      const user = usercred.user;
      const newuser: Partial<User> = {
        username,
        displayName,
        avatar: user.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
        email: user.email ?? undefined,
      };
      const trimmedPhone = phone?.trim();
      if (trimmedPhone) {
        newuser.phone = trimmedPhone;
      }
      const res = await axiosInstance.post("/register", newuser);
      if (res.data) {
        storeUser(res.data);
      }
      setAuthStatus("idle");
    } catch (err) {
      setAuthStatus("error");
      console.error("Firebase Error (signup):", err);
      console.error(
        "Code:",
        (err as { code?: string })?.code,
        "| Message:",
        (err as { message?: string })?.message
      );
      console.error(
        "Server response:",
        (err as { response?: { data?: unknown } })?.response?.data
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setOtpPending(false);
    sessionStorage.removeItem(PENDING_OTP_KEY);
    await signOut(auth);
    localStorage.removeItem("twitter-user");
  };

  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
  }) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const updatedUser: User = {
        ...user,
        ...profileData,
      };
      const res = await axiosInstance.patch(
        `/userdata/${user.email}`,
        updatedUser
      );
      if (res.data) {
        storeUser(updatedUser);
      }
    } catch (err) {
      console.error("updateProfile failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  const googlesignin = async () => {
    setIsLoading(true);
    setAuthStatus("signing-in");
    loginFlowRef.current = true;

    try {
      const googleauthprovider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleauthprovider);
      const firebaseuser = result.user;

      if (!firebaseuser?.email) {
        throw new Error(t("auth.googleNoEmail"));
      }

      setAuthStatus("verifying");

      let userData: User | undefined;

      try {
        const res = await axiosInstance.get("/loggedinuser", {
          params: { email: firebaseuser.email },
        });
        userData = res.data;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status !== 404) {
          throw err;
        }
        const newuser: Partial<User> = {
          username: firebaseuser.email.split("@")[0],
          displayName: firebaseuser.displayName || "User",
          avatar: firebaseuser.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
          email: firebaseuser.email,
        };

        const registerRes = await axiosInstance.post("/register", newuser);
        userData = registerRes.data;
      }

      const gate = await gateLogin();

      if (gate === "blocked") {
        await signOut(auth);
        throw new Error(t("auth.mobileBlocked"));
      }

      if (gate === "otpRequired") {
        setOtpPending(true);
        sessionStorage.setItem(PENDING_OTP_KEY, "1");
        setAuthStatus("idle");
        return;
      }

      if (userData) {
        storeUser(userData);
        toast(t("auth.googleSignedIn"), "success");
      } else {
        throw new Error("Login/Register failed: No user data returned");
      }
      setAuthStatus("idle");
    } catch (error: unknown) {
      setAuthStatus("error");
      console.error("Google Sign-In Error:", error);
      const axiosErr = error as {
        response?: { data?: { error?: string } };
      };
      const msg =
        axiosErr?.response?.data?.error ||
        (error instanceof Error
          ? error.message
          : t("auth.loginFailed"));
      toast(msg, "error");
    } finally {
      loginFlowRef.current = false;
      setIsLoading(false);
    }
  };

  const verifyLoginOtp = async (otp: string) => {
    try {
      await axiosInstance.post("/auth/verify-login-otp", { otp });

      const firebaseuser = auth.currentUser;
      if (!firebaseuser?.email) {
        throw new Error(t("auth.sessionLost"));
      }

      const res = await fetchUserData(firebaseuser.email);
      setOtpPending(false);
      sessionStorage.removeItem(PENDING_OTP_KEY);
      if (res) {
        storeUser(res);
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "";
      if (status === 429 || /expired|too many/i.test(msg)) {
        setOtpPending(false);
        sessionStorage.removeItem(PENDING_OTP_KEY);
        await signOut(auth);
      }
      throw err;
    }
  };

  const cancelLoginOtp = async () => {
    setOtpPending(false);
    sessionStorage.removeItem(PENDING_OTP_KEY);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        updateProfile,
        setUser,
        logout,
        isLoading,
        googlesignin,
        otpPending,
        verifyLoginOtp,
        cancelLoginOtp,
        updateLanguage,
        authStatus,
        slowConnect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
