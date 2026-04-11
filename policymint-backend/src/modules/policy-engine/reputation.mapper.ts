import { FeedbackType, type FeedbackTypeValue } from '../../lib/blockchain/reputationRegistry.js';

export type EvaluationOutcome =
  | 'allow_confirmed'
  | 'allow_execution_failed'
  | 'allow_execution_rejected'
  | 'block_policy_violation'
  | 'block_risk_router';

export interface ReputationPayload {
  score: number;
  feedbackType: FeedbackTypeValue;
  comment: string;
}

export function resolveReputationPayload(outcome: EvaluationOutcome): ReputationPayload {
  switch (outcome) {
    case 'allow_confirmed':
      return {
        score: 80,
        feedbackType: FeedbackType.TRADE_EXECUTION,
        comment: 'Trade executed within policy bounds',
      };

    case 'allow_execution_failed':
      return {
        score: 50,
        feedbackType: FeedbackType.TRADE_EXECUTION,
        comment: 'Trade allowed but execution failed',
      };

    case 'allow_execution_rejected':
      return {
        score: 10,
        feedbackType: FeedbackType.RISK_MANAGEMENT,
        comment: 'Trade blocked: RiskRouter hard limit exceeded',
      };

    case 'block_policy_violation':
      return {
        score: 20,
        feedbackType: FeedbackType.RISK_MANAGEMENT,
        comment: 'Trade blocked: policy rule violated',
      };

    case 'block_risk_router':
      return {
        score: 10,
        feedbackType: FeedbackType.RISK_MANAGEMENT,
        comment: 'Trade blocked: RiskRouter hard limit exceeded',
      };
  }
}
