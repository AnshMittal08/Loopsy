import { z } from "zod";

// Shared field primitives. `.refine` is used for email so this is robust across
// zod minor versions (no dependence on the built-in string().email()).
const email = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid email address.");

const password = z.string().min(8, "Password must be at least 8 characters.");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  password,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required."),
});

export const createDesignSchema = z.object({
  name: z.string().trim().max(200).optional(),
  spec: z.record(z.string(), z.any()).refine((v) => v && typeof v === "object", "A design spec is required."),
});
