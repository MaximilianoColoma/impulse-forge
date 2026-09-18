import { describe, expect, it } from 'vitest';
import { validateSeatChange } from '../seatValidation';
import { ValidationException } from '../validation';

describe('validateSeatChange', () => {
  it('accepts valid seat counts within [5, 50]', () => {
    expect(validateSeatChange({ newSeats: 5 })).toEqual({ newSeats: 5 });
    expect(validateSeatChange({ newSeats: 25 })).toEqual({ newSeats: 25 });
    expect(validateSeatChange({ newSeats: 50 })).toEqual({ newSeats: 50 });
  });

  it('rejects seats below 5', () => {
    expect(() => validateSeatChange({ newSeats: 4 })).toThrow(ValidationException);
  });

  it('rejects seats above 50', () => {
    expect(() => validateSeatChange({ newSeats: 51 })).toThrow(ValidationException);
  });

  it('rejects non-integer values', () => {
    expect(() => validateSeatChange({ newSeats: 5.5 })).toThrow(ValidationException);
    expect(() => validateSeatChange({ newSeats: 'ten' })).toThrow(ValidationException);
  });

  it('rejects missing body', () => {
    expect(() => validateSeatChange(null)).toThrow(ValidationException);
  });
});