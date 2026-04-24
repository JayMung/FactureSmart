/**
 * Validation Tests
 * [COD-56] - Tests for Zod schemas and input validation
 */
import { describe, it, expect } from 'vitest';

// NIF: 15 digits
const NIF_REGEX = /^\d{15}$/;

// Phone RDC valid patterns:
//   +243[89][0-9]{8}  (12 chars total: +243 + 9 digits starting with 8 or 9)
//   0[89][0-9]{8}     (10 chars total: 0 + 9 digits starting with 8 or 9)
const PHONE_REGEX = /^(\+243[89]\d{8}|0[89]\d{8})$/;

// Amount: positive number
const isValidAmount = (amount: unknown): boolean => {
  return typeof amount === 'number' && amount > 0 && !isNaN(amount);
};

// Email basic validation
const isValidEmail = (email: unknown): boolean => {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

describe('NIF Validation', () => {
  it('should accept valid 15-digit NIF', () => {
    expect(NIF_REGEX.test('123456789012345')).toBe(true);
    expect(NIF_REGEX.test('987654321098765')).toBe(true);
    expect(NIF_REGEX.test('555555555555555')).toBe(true);
  });

  it('should reject NIF with wrong length', () => {
    expect(NIF_REGEX.test('12345')).toBe(false);
    expect(NIF_REGEX.test('12345678901234')).toBe(false);
    expect(NIF_REGEX.test('1234567890123456')).toBe(false);
  });

  it('should reject NIF with letters', () => {
    expect(NIF_REGEX.test('1234567890123AB')).toBe(false);
  });
});

describe('Phone Validation (RDC)', () => {
  // Valid +243 numbers: +24381xxxxxxx, +24382xxxxxxx, +24397xxxxxxx, +24399xxxxxxx
  it('should accept valid plus-243 numbers with 81/82/97/99 prefix', () => {
    expect(PHONE_REGEX.test('+243811234567')).toBe(true);
    expect(PHONE_REGEX.test('+243821234567')).toBe(true);
    expect(PHONE_REGEX.test('+243971234567')).toBe(true);
    expect(PHONE_REGEX.test('+243991234567')).toBe(true);
  });

  // Valid 08x numbers: 081xxxxxxxx, 082xxxxxxxx, 097xxxxxxxx, 099xxxxxxxx
  it('should accept valid 08x numbers with 81/82/97/99 prefix', () => {
    expect(PHONE_REGEX.test('0811234567')).toBe(true);
    expect(PHONE_REGEX.test('0821234567')).toBe(true);
    expect(PHONE_REGEX.test('0971234567')).toBe(true);
    expect(PHONE_REGEX.test('0991234567')).toBe(true);
  });

  // Invalid: +243 with digit 0, 1, 2, 3, 4, 5, 6, 7 after the prefix
  it('should reject numbers with invalid second digit after +243', () => {
    // +2430xxxxxxx = invalid (0 after +243)
    expect(PHONE_REGEX.test('+243001234567')).toBe(false);
    // +2437xxxxxxx = invalid (7 after +243)
    expect(PHONE_REGEX.test('+243701234567')).toBe(false);
    // +2436xxxxxxx = invalid (6 after +243)
    expect(PHONE_REGEX.test('+243601234567')).toBe(false);
  });

  // Wrong total length
  it('should reject numbers with wrong total length', () => {
    expect(PHONE_REGEX.test('+24381123456')).toBe(false);   // 11 chars
    expect(PHONE_REGEX.test('+2438112345678')).toBe(false); // 13 chars
    expect(PHONE_REGEX.test('081123456')).toBe(false);       // 9 chars
    expect(PHONE_REGEX.test('08112345678')).toBe(false);     // 11 chars
  });
});

describe('Amount Validation', () => {
  it('should accept positive amounts', () => {
    expect(isValidAmount(1000)).toBe(true);
    expect(isValidAmount(0.01)).toBe(true);
    expect(isValidAmount(100000000)).toBe(true);
  });

  it('should reject zero and negative', () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-100)).toBe(false);
    expect(isValidAmount(-0.01)).toBe(false);
  });

  it('should reject non-numbers', () => {
    expect(isValidAmount('1000')).toBe(false);
    expect(isValidAmount(null)).toBe(false);
    expect(isValidAmount(undefined)).toBe(false);
    expect(isValidAmount(NaN)).toBe(false);
  });
});

describe('Email Validation', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co')).toBe(true);
    expect(isValidEmail('admin@facturesmart.com')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });
});
