import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    
    if (!value) {
      return null;
    }
    
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);
    const hasMinLength = value.length >= 8;
    
    const errors: ValidationErrors = {};
    let isValid = true;
    
    if (!hasUpperCase) {
      errors['noUpperCase'] = true;
      isValid = false;
    }
    
    if (!hasLowerCase) {
      errors['noLowerCase'] = true;
      isValid = false;
    }
    
    if (!hasNumeric) {
      errors['noNumeric'] = true;
      isValid = false;
    }
    
    if (!hasSpecial) {
      errors['noSpecialChar'] = true;
      isValid = false;
    }
    
    if (!hasMinLength) {
      errors['minLength'] = true;
      isValid = false;
    }
    
    return isValid ? null : errors;
  };
}

export function passwordMatchValidator(passwordControlName: string, confirmPasswordControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordControlName);
    const confirmPassword = control.get(confirmPasswordControlName);
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
      return null;
    }
    
    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      confirmPassword.setErrors(null);
      return null;
    }
  };
}

export function getPasswordErrorMessage(errors: ValidationErrors | null): string {
  if (!errors) return '';
  
  if (errors['minLength']) {
    return 'La password deve essere di almeno 8 caratteri';
  }
  
  if (errors['noUpperCase']) {
    return 'La password deve contenere almeno una lettera maiuscola';
  }
  
  if (errors['noLowerCase']) {
    return 'La password deve contenere almeno una lettera minuscola';
  }
  
  if (errors['noNumeric']) {
    return 'La password deve contenere almeno un numero';
  }
  
  if (errors['noSpecialChar']) {
    return 'La password deve contenere almeno un carattere speciale';
  }
  
  if (errors['passwordMismatch']) {
    return 'Le password non corrispondono';
  }
  
  return 'Password non valida';
} 