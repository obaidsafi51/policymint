# ABI Verification — ReputationRegistry

Contract: 0x423a9904e39537a9997fbaF0f220d79D7d545763  
Network: Ethereum Sepolia (chainId: 11155111)  
Verified: 2026-04-11

## FeedbackType Enum (confirmed from Etherscan contract source)

| Name | Value |
| :-- | --: |
| TRADE_EXECUTION | 0 |
| RISK_MANAGEMENT | 1 |
| STRATEGY_QUALITY | 2 |
| GENERAL | 3 |

## PRD Correction
PRD FR-09 table listed POSITIVE/NEUTRAL/NEGATIVE — these do not exist.

Correct mapping:
- allow outcomes → TRADE_EXECUTION (0), score 80 or 50
- block outcomes → RISK_MANAGEMENT (1), score 20 or 10

Score (0–100) carries sentiment. `feedbackType` carries category.

## Critical: hasRated() Constraint
Contract enforces one feedback submission per rater wallet per `agentId`.

Backend must call `hasRated(agentId, operatorAddress)` before every `submitFeedback()` call to avoid gas-wasting reverts.

## ABI Source
Full ABI snapshot is saved at `docs/abis/ReputationRegistry.json`.

Etherscan source:
https://sepolia.etherscan.io/address/0x423a9904e39537a9997fbaF0f220d79D7d545763#code
