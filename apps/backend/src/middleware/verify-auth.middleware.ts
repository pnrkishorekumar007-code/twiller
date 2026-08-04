import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdmin } from "@services/firebase-admin.service";
import { User, IUser } from "@models";

export interface AuthenticatedRequest extends Request {
  authUser?: IUser;
}

export async function verifyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      res.status(401).json({ error: "Missing auth token" });
      return;
    }

    const app = getFirebaseAdmin();
    if (!app) {
      res.status(500).json({
        error: "Server authentication is misconfigured (FIREBASE_SERVICE_ACCOUNT_KEY missing or invalid).",
      });
      return;
    }

    const decoded = await getAuth(app).verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email });
      if (user) {
        user.firebaseUid = decoded.uid;
        await user.save();
      }
    }

    if (!user) {
      res.status(404).json({ error: "No matching account found" });
      return;
    }

    req.authUser = user;
    next();
  } catch (error) {
    console.error("Auth verification failed:", (error as Error).message);
    res.status(401).json({ error: "Invalid or expired auth token" });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  verifyAuth(req, res, next);
}