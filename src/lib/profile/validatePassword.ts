// import { UserDetails } from "./userInfo";

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  messages: string[];
} {
  const messages: string[] = [];
  
  if (password.length < 8) {
    messages.push('at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    messages.push('at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    messages.push('at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    messages.push('at least one number');
  }
  
  return {
    isValid: messages.length === 0,
    messages,
  };
}


