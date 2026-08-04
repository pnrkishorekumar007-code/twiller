import { AuthenticatedRequest } from "@middleware/verify-auth.middleware";
import { Response } from "express";
import { User, IUser } from "@models";
import { getAuth } from "@services/firebase-admin.service";
import { normalizePhone } from "@utils/phone.utils";
import { escapeRegex } from "@utils/escape-regex.utils";
import {
  hasReachedPlanLimit,
  resetPlanQuotaIfDue,
  incrementTweetCount,
  incrementCommentCount,
  incrementMessageCount,
} from "@services/plan-limits.service";
import { config } from "@config";

export async function registerUser(req: AuthenticatedRequest, res: Response): Promise<void> {
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
        error: "Server authentication is misconfigured.",
      });
      return;
    }

    const decoded = await getAuth(app).verifyIdToken(token);

    let existingUser = await User.findOne({ firebaseUid: decoded.uid });
    if (!existingUser && decoded.email) {
      existingUser = await User.findOne({ email: decoded.email });
      if (existingUser) {
        existingUser.firebaseUid = decoded.uid;
        await existingUser.save();
      }
    }

    if (existingUser) {
      res.status(200).json(existingUser);
      return;
    }

    if (req.body.username) {
      const existingUsername = await User.findOne({ username: req.body.username });
      if (existingUsername) {
        res.status(409).json({ error: "Username already taken" });
        return;
      }
    }

    let normalizedPhone = null;
    if (req.body.phone) {
      normalizedPhone = normalizePhone(req.body.phone);
      if (!normalizedPhone) {
        res.status(400).json({ error: "Invalid phone number format" });
        return;
      }
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        res.status(409).json({ error: "Phone number is already registered" });
        return;
      }
    }

    const newUserData: Partial<IUser> = {
      username: req.body.username,
      displayName: req.body.displayName,
      avatar: req.body.avatar,
      email: decoded.email,
      firebaseUid: decoded.uid,
    };

    if (normalizedPhone) {
      newUserData.phone = normalizedPhone;
    }

    const newUser = new User(newUserData);
    try {
      await newUser.save();
    } catch (saveError: any) {
      if (saveError.code === 11000) {
        res.status(409).json({ error: "Username or phone number is already registered" });
        return;
      }
      throw saveError;
    }

    res.status(201).json(newUser);
  } catch (error) {
    if (
      (error as any).code === "auth/id-token-expired" ||
      (error as any).code === "auth/argument-error"
    ) {
      res.status(401).json({ error: "Invalid or expired auth token" });
      return;
    }
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getLoggedInUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    res.status(200).json(req.authUser);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email } = req.query;
    const users = await User.find({ email: { $ne: email } })
      .select("username displayName avatar bio plan following followedBy")
      .limit(6)
      .lean();
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) {
      res.status(200).json([]);
      return;
    }
    const users = await User.find({
      $or: [
        { username: { $regex: escapeRegex(q), $options: "i" } },
        { displayName: { $regex: escapeRegex(q), $options: "i" } },
      ],
    })
      .select("username displayName avatar bio plan following followedBy")
      .limit(8)
      .lean();
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.params.id).select(
      "username displayName avatar bio location website joinedDate plan tweetCount following followedBy"
    );
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email } = req.params;
    if (String(req.authUser!.email).toLowerCase() !== String(email).toLowerCase()) {
      res.status(403).json({ error: "You can only edit your own profile" });
      return;
    }

    const {
      displayName,
      bio,
      location,
      website,
      avatar,
      phone,
      notificationsEnabled,
    } = req.body;

    let normalizedPhone: string | null = null;
    if (phone) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        res.status(400).json({ error: "Invalid phone number format" });
        return;
      }
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone && existingPhone._id.toString() !== req.authUser!._id.toString()) {
        res.status(400).json({ error: "Phone number already registered" });
        return;
      }
    }

    const setFields: Partial<IUser> = {
      displayName,
      bio,
      location,
      website,
      avatar,
      notificationsEnabled,
    };
    if (normalizedPhone) setFields.phone = normalizedPhone;

    const updateOp: any = { $set: setFields };
    if (phone !== undefined && !normalizedPhone) {
      updateOp.$unset = { phone: "" };
    }

    const updated = await User.findByIdAndUpdate(req.authUser!._id, updateOp, {
      new: true,
    });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

export async function getTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { Tweet } = await import("@models");
    const tweets = await Tweet.find({ content: { $regex: /#/, $ne: null } })
      .select("content timestamp")
      .sort({ timestamp: -1 })
      .limit(200);
    const counts: Record<string, number> = {};
    for (const t of tweets) {
      const tags = (t.content || "").match(/#[\w]+/g) || [];
      for (const tag of tags) {
        const key = tag.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    const trends = Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    res.status(200).json(trends);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}