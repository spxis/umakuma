export const CUSTOM_LIBRARY_NAME_MIN_LENGTH = 3;
export const CUSTOM_LIBRARY_NAME_MAX_LENGTH = 48;
export const CUSTOM_LIBRARY_NAME_ALLOWED_REGEX = /^[A-Za-z0-9 _-]+$/;

export function sanitizeCustomLibraryNameInput(value: string): string {
  return value.replace(/[^A-Za-z0-9 _-]/g, "");
}

export function getCustomLibraryNameValidationMessage(value: string): string | null {
  const trimmedValue = value.trim();
  if (trimmedValue.length < CUSTOM_LIBRARY_NAME_MIN_LENGTH) {
    return `Use at least ${CUSTOM_LIBRARY_NAME_MIN_LENGTH} characters.`;
  }
  if (trimmedValue.length > CUSTOM_LIBRARY_NAME_MAX_LENGTH) {
    return `Use ${CUSTOM_LIBRARY_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!CUSTOM_LIBRARY_NAME_ALLOWED_REGEX.test(trimmedValue)) {
    return "Use letters, numbers, spaces, hyphens, or underscores.";
  }

  return null;
}