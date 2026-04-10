#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

required_env=(
  RENDER_BASE_URL
  IN_SCOPE_AGENT_ID
  OUT_OF_SCOPE_AGENT_ID
)

for name in "${required_env[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo -e "${RED}Missing required env var: ${name}${NC}"
    exit 1
  fi
done

TOTAL=0
PASSED=0
FAILED=0

tmp_files=()
cleanup() {
  for file in "${tmp_files[@]}"; do
    rm -f "$file" || true
  done
}
trap cleanup EXIT

print_result() {
  local ok="$1"
  local label="$2"
  local details="$3"
  TOTAL=$((TOTAL + 1))
  if [[ "$ok" == "true" ]]; then
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}PASS${NC} ${label} ${details}"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}FAIL${NC} ${label} ${details}"
  fi
}

run_check() {
  local label="$1"
  local url="$2"
  local expected_status="$3"
  local expected_contains="$4"
  shift 4

  local body_file
  body_file="$(mktemp)"
  tmp_files+=("$body_file")

  local status
  status="$(curl -sS -o "$body_file" -w '%{http_code}' "$url" "$@")"
  local body
  body="$(tr -d '\n' < "$body_file")"

  if [[ "$status" != "$expected_status" ]]; then
    print_result "false" "$label" "(expected status $expected_status got $status)"
    return
  fi

  if [[ -n "$expected_contains" ]] && [[ "$body" != *"$expected_contains"* ]]; then
    print_result "false" "$label" "(expected body to contain: $expected_contains)"
    return
  fi

  print_result "true" "$label" "(status $status)"
}

echo "Running L3 direct backend security checks against: $RENDER_BASE_URL"
echo

if [[ -n "${VALID_OPERATOR_TOKEN:-}" ]]; then
  run_check \
    "L3-01 valid token + in-scope" \
    "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
    "200" \
    '"success":true' \
    -H "X-Operator-Token: $VALID_OPERATOR_TOKEN"

  run_check \
    "L3-02 valid token + out-of-scope" \
    "$RENDER_BASE_URL/v1/agents/$OUT_OF_SCOPE_AGENT_ID/stats" \
    "403" \
    '"code":"AGENT_SCOPE_VIOLATION"' \
    -H "X-Operator-Token: $VALID_OPERATOR_TOKEN"
else
  echo -e "${YELLOW}SKIP${NC} L3-01/L3-02 (VALID_OPERATOR_TOKEN not set)"
fi

run_check \
  "L3-03 missing token" \
  "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
  "401" \
  '"code":"TOKEN_MISSING"'

if [[ -n "${EXPIRED_OPERATOR_TOKEN:-}" ]]; then
  run_check \
    "L3-04 expired token" \
    "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
    "401" \
    '"code":"TOKEN_EXPIRED"' \
    -H "X-Operator-Token: $EXPIRED_OPERATOR_TOKEN"
else
  echo -e "${YELLOW}SKIP${NC} L3-04 expired token (EXPIRED_OPERATOR_TOKEN not set)"
fi

if [[ -n "${INVALID_OPERATOR_TOKEN:-}" ]]; then
  run_check \
    "L3-05 invalid token" \
    "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
    "401" \
    '"code":"TOKEN_INVALID"' \
    -H "X-Operator-Token: $INVALID_OPERATOR_TOKEN"
else
  echo -e "${YELLOW}SKIP${NC} L3-05 invalid token (INVALID_OPERATOR_TOKEN not set)"
fi

if [[ -n "${VALID_AGENT_API_KEY:-}" ]]; then
  body_file="$(mktemp)"
  tmp_files+=("$body_file")
  status="$(curl -sS -o "$body_file" -w '%{http_code}' \
    "$RENDER_BASE_URL/v1/evaluate" \
    -H "Authorization: Bearer $VALID_AGENT_API_KEY" \
    -H "Content-Type: application/json" \
    --data '{
      "agent_id":"'"$IN_SCOPE_AGENT_ID"'",
      "action_type":"trade",
      "venue":"kraken-spot",
      "amount":"100",
      "token_in":"BTC",
      "token_out":"USD",
      "params":{}
    }')"
  body="$(tr -d '\n' < "$body_file")"

  if [[ "$body" == *'"code":"TOKEN_MISSING"'* ]] || [[ "$body" == *'"code":"AGENT_SCOPE_VIOLATION"'* ]]; then
    print_result "false" "L3-06 /v1/evaluate unchanged auth path" "(unexpected operator-token code returned)"
  else
    print_result "true" "L3-06 /v1/evaluate unchanged auth path" "(status $status, no operator-token code leakage)"
  fi
else
  echo -e "${YELLOW}SKIP${NC} L3-06 /v1/evaluate unchanged auth path (VALID_AGENT_API_KEY not set)"
fi

echo
echo "Summary: $PASSED passed, $FAILED failed, $TOTAL total"

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
