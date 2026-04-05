import type { JsonValue } from '@prisma/client/runtime/library';
import type { EvaluateIntentInput } from '../evaluate.schema.js';

export interface EvaluatorResult {
  passed: boolean;
  reason?: string;
}

interface VenueAllowlistParams {
  allowed_venues?: string[];
}

export function evaluateVenueAllowlist(
  intent: EvaluateIntentInput,
  params: JsonValue
): EvaluatorResult {
  const typedParams = (params ?? {}) as VenueAllowlistParams;
  const allowedVenues = Array.isArray(typedParams.allowed_venues)
    ? typedParams.allowed_venues.filter((value): value is string => typeof value === 'string')
    : [];

  if (allowedVenues.length === 0) {
    return {
      passed: false,
      reason: `Venue '${intent.venue}' is not in the approved allowlist.`
    };
  }

  const targetVenue = intent.venue.toLowerCase();
  const inAllowlist = allowedVenues.some(venue => venue.toLowerCase() === targetVenue);

  if (!inAllowlist) {
    return {
      passed: false,
      reason: `Venue '${intent.venue}' is not in the approved allowlist.`
    };
  }

  return { passed: true };
}
