import { body, param, query, validationResult, ValidationChain } from "express-validator";
import { Request, Response, NextFunction } from "express";

export function runValidation(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: errors.array()[0].msg,
      details: errors.array(),
    });
    return;
  }
  next();
}

export const validateRegister: ValidationChain[] = [
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

export const validatePost: ValidationChain[] = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Tweet content must be 1-200 characters"),
  body("image").optional().isString().isLength({ max: 1000 }),
  runValidation,
];

export const validateComment: ValidationChain[] = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Comment must be 1-200 characters"),
  runValidation,
];

export const validateMessage: ValidationChain[] = [
  body("otherId").isMongoId().withMessage("otherId must be a valid user id"),
  body("content")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Message content must be 1-500 characters"),
  runValidation,
];

export const validateProfileUpdate: ValidationChain[] = [
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

export const validateConversationCreate: ValidationChain[] = [
  body("otherId").isMongoId().withMessage("otherId must be a valid user id"),
  runValidation,
];

export const validateMongoId = (field: string = "id"): ValidationChain[] => [
  param(field).isMongoId().withMessage(`${field} must be a valid MongoDB ObjectId`),
  runValidation,
];

export const validateQuery = (): ValidationChain[] => [
  query("q").optional().isString().trim().isLength({ max: 100 }),
  query("before").optional().isISO8601().withMessage("before must be a valid ISO date"),
  query("following").optional().isIn(["true", "false"]),
  query("userId").optional().isMongoId(),
  runValidation,
];