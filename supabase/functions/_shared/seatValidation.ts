// Shared seat validation for enterprise seat-change endpoints
import { ValidationException, validators } from './validation.ts';

export function validateSeatChange(data: unknown): { newSeats: number } {
  if (!data || typeof data !== 'object') {
    throw new ValidationException([{ field: 'body', message: 'Request body must be an object' }]);
  }
  const { newSeats } = data as Record<string, unknown>;
  const errors = [] as { field: string; message: string }[];
  if (!validators.isNumber(newSeats) || !Number.isInteger(newSeats)) {
    errors.push({ field: 'newSeats', message: 'newSeats must be an integer' });
  } else if ((newSeats as number) < 5) {
    errors.push({ field: 'newSeats', message: 'Enterprise requires at least 5 seats' });
  } else if ((newSeats as number) > 50) {
    errors.push({ field: 'newSeats', message: 'Enterprise supports at most 50 seats via self-service' });
  }
  if (errors.length > 0) throw new ValidationException(errors);
  return { newSeats: newSeats as number };
}