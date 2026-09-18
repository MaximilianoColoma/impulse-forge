import { describe, it, expect } from 'vitest';
import { authSchema, loginSchema } from '../auth';

describe('Auth Validation', () => {
  describe('authSchema (signup)', () => {
    it('should validate correct signup data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = authSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'Password123',
      };

      const result = authSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject too short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Pass1',
      };

      const result = authSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('should require uppercase letter in password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = authSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('should require lowercase letter in password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'PASSWORD123',
      };

      const result = authSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase');
      }
    });

    it('should require number in password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'PasswordABC',
      };

      const result = authSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number');
      }
    });

    it('should trim and lowercase email', () => {
      const data = {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'Password123',
      };

      const result = authSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow any password length for login', () => {
      const data = {
        email: 'test@example.com',
        password: '123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
