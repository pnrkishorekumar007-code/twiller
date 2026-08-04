import { body, validationResult } from "express-validator";

export function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
      details: errors.array(),
    });
  }
  next();
}

export const validateRegister = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username may only contain letters, numbers, and underscores"),
  body("displayName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Display name must be 1-50 characters"),
  body("avatar").optional().isString().isLength({ max: 500 }),
  body("phone")
    .optional()
    .isString()
    .custom((v) => /^\+?[1-9]\d{6,14}$/.test(v.replace(/[\s-]/g, "")))
    .withMessage("Phone must be in E.164 format"),
  runValidation,
];

export const validatePost = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Tweet content must be 1-200 characters"),
  body("image").optional().isString().isLength({ max: 1000 }),
  runValidation,
];

export const validateComment = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Comment must be 1-200 characters"),
  runValidation,
];

export const validateMessage = [
  body("otherId").isMongoId().withMessage("otherId must be a valid user id"),
  body("content")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Message content must be 1-500 characters"),
  runValidation,
];

export const validateProfileUpdate = [
  body("displayName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Display name must be 1-50 characters"),
  body("bio").optional().isString().isLength({ max: 280 }),
  body("location").optional().isString().isLength({ max: 100 }),
  body("website")
    .optional({ values: "falsy" })
    .isURL({ require_protocol: true, protocols: ["http", "https"] })
    .withMessage("Website must be a valid http(s) URL"),
  body("avatar").optional().isString().isLength({ max: 1000 }),
  body("phone")
    .optional({ values: "falsy" })
    .isString()
    .custom((v) => /^\+?[1-9]\d{6,14}$/.test(String(v).replace(/[\s-]/g, "")))
    .withMessage("Phone must be in E.164 format"),
  body("notificationsEnabled").optional().isBoolean(),
  runValidation,
];

export const validateConversationCreate = [
  body("otherId").isMongoId().withMessage("otherId must be a valid user id"),
  runValidation,
];
