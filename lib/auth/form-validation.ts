import { ApiError, formatApiError, isNetworkError } from "@/lib/api/errors"

export type AuthFieldErrors = {
  email?: string
  password?: string
  answer?: string
  newPassword?: string
  confirmPassword?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateSignIn(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {}
  const trimmed = email.trim()

  if (!trimmed) {
    errors.email = "Enter your email address."
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = "Enter a valid email address."
  }

  if (!password) {
    errors.password = "Enter your password."
  }

  return errors
}

export function hasFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}

export function mapSignInApiError(
  err: unknown,
  serverAddress?: string | null,
): { fields: AuthFieldErrors; form?: string } {
  if (err instanceof ApiError) {
    if (err.code === "INVALID_CREDENTIALS") {
      return { fields: { password: "Email or password is incorrect." } }
    }
    if (err.code === "ACCOUNT_LOCKED") {
      return { fields: {}, form: err.message }
    }
    if (err.code === "VALIDATION_ERROR") {
      return { fields: validateSignIn("", "") }
    }
    if (isNetworkError(err) || err.code === "UPSTREAM_UNREACHABLE") {
      return { fields: {}, form: formatApiError(err, serverAddress) }
    }
    return { fields: {}, form: formatApiError(err, serverAddress) }
  }

  return { fields: {}, form: formatApiError(err, serverAddress) }
}

export function validateForgotPasswordEmail(email: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {}
  const trimmed = email.trim()

  if (!trimmed) {
    errors.email = "Enter your email address."
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = "Enter a valid email address."
  }

  return errors
}

export function validateForgotPasswordReset(
  answer: string,
  newPassword: string,
  confirmPassword: string,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {}

  if (!answer.trim()) {
    errors.answer = "Enter your security answer."
  }
  if (!newPassword) {
    errors.newPassword = "Enter a new password."
  } else if (newPassword.length < 8) {
    errors.newPassword = "Use at least 8 characters."
  }
  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your new password."
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match."
  }

  return errors
}

export function mapRecoveryApiError(
  err: unknown,
  serverAddress?: string | null,
): { fields: AuthFieldErrors; form?: string } {
  if (err instanceof ApiError) {
    if (err.code === "RECOVERY_FAILED") {
      return { fields: { answer: "Security answer is incorrect." } }
    }
    if (err.code === "VALIDATION_ERROR") {
      return { fields: {}, form: "Check your entries and try again." }
    }
    if (isNetworkError(err)) {
      return { fields: {}, form: formatApiError(err, serverAddress) }
    }
    return { fields: {}, form: formatApiError(err, serverAddress) }
  }

  return { fields: {}, form: formatApiError(err, serverAddress) }
}
