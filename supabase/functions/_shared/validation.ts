// Validation utilities for edge functions
// Since we can't use zod in Deno easily, we'll use manual validation

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

export const validators = {
  isEmail: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  isString: (value: unknown): value is string => {
    return typeof value === 'string';
  },

  isNumber: (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value);
  },

  isIn: <T>(value: T, allowedValues: readonly T[]): boolean => {
    return allowedValues.includes(value);
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  isUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },
};

export function validateCheckoutRequest(data: unknown): {
  tier: 'pro' | 'power' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  seats: number;
} {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationException([{ field: 'body', message: 'Request body must be an object' }]);
  }

  const { tier, billingCycle, seats } = data as Record<string, unknown>;

  // Validate tier
  if (!validators.isString(tier)) {
    errors.push({ field: 'tier', message: 'Tier must be a string' });
  } else if (!validators.isIn(tier, ['pro', 'power', 'enterprise'] as const)) {
    errors.push({ field: 'tier', message: 'Tier must be "pro", "power" or "enterprise"' });
  }

  // Validate billing cycle
  if (!validators.isString(billingCycle)) {
    errors.push({ field: 'billingCycle', message: 'Billing cycle must be a string' });
  } else if (!validators.isIn(billingCycle, ['monthly', 'yearly'] as const)) {
    errors.push({ field: 'billingCycle', message: 'Billing cycle must be either "monthly" or "yearly"' });
  }

  // Validate seats: required for enterprise (min 5, max 50), ignored (default 1) otherwise
  let normalizedSeats = 1;
  if (tier === 'enterprise') {
    if (!validators.isNumber(seats) || !Number.isInteger(seats)) {
      errors.push({ field: 'seats', message: 'Seats must be an integer for enterprise tier' });
    } else if ((seats as number) < 5) {
      errors.push({ field: 'seats', message: 'Enterprise requires at least 5 seats' });
    } else if ((seats as number) > 50) {
      errors.push({ field: 'seats', message: 'Enterprise supports at most 50 seats via self-service' });
    } else {
      normalizedSeats = seats as number;
    }
  }

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }

  return {
    tier: tier as 'pro' | 'power' | 'enterprise',
    billingCycle: billingCycle as 'monthly' | 'yearly',
    seats: normalizedSeats,
  };
}

export function validateSearchQuery(data: unknown): {
  query: string;
  limit?: number;
} {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationException([{ field: 'body', message: 'Request body must be an object' }]);
  }

  const { query, limit } = data as Record<string, unknown>;

  // Validate query
  if (!validators.isString(query)) {
    errors.push({ field: 'query', message: 'Query must be a string' });
  } else {
    if (!validators.minLength(query, 1)) {
      errors.push({ field: 'query', message: 'Query must not be empty' });
    }
    if (!validators.maxLength(query, 500)) {
      errors.push({ field: 'query', message: 'Query must be less than 500 characters' });
    }
  }

  // Validate limit (optional)
  if (limit !== undefined) {
    if (!validators.isNumber(limit)) {
      errors.push({ field: 'limit', message: 'Limit must be a number' });
    } else if (limit < 1 || limit > 100) {
      errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }

  return {
    query: query as string,
    limit: limit as number | undefined,
  };
}

export function sanitizeString(input: string): string {
  // Remove HTML tags and potentially dangerous characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .trim();
}

export function validateTagGenerationRequest(data: unknown): {
  content: string;
  projectId?: string;
} {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    throw new ValidationException([{ field: 'body', message: 'Request body must be an object' }]);
  }

  const { content, projectId } = data as Record<string, unknown>;

  // Validate content
  if (!validators.isString(content)) {
    errors.push({ field: 'content', message: 'Content must be a string' });
  } else {
    if (!validators.minLength(content, 1)) {
      errors.push({ field: 'content', message: 'Content must not be empty' });
    }
    if (!validators.maxLength(content, 5000)) {
      errors.push({ field: 'content', message: 'Content must be less than 5000 characters' });
    }
  }

  // Validate projectId (optional)
  if (projectId !== undefined && projectId !== null) {
    if (!validators.isString(projectId)) {
      errors.push({ field: 'projectId', message: 'Project ID must be a string' });
    } else if (!validators.isUUID(projectId)) {
      errors.push({ field: 'projectId', message: 'Project ID must be a valid UUID' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }

  return {
    content: sanitizeString(content as string),
    projectId: projectId as string | undefined,
  };
}
