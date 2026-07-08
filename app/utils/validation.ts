export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8;
}

export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];
  if (!password) {
    errors.push('Le mot de passe est obligatoire.');
    return errors;
  }
  if (password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères.');
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre.');
  }
  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre.');
  }
  return errors;
}
