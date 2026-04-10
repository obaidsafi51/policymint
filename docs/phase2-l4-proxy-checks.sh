#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

required_env=(
  VERCEL_BASE_URL
  RENDER_BASE_URL
  IN_SCOPE_AGENT_ID
  FRONTEND_ORIGIN
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

run_json_check() {
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

echo "Running L4 proxy checks"
echo "Vercel: $VERCEL_BASE_URL"
echo "Render: $RENDER_BASE_URL"
echo

# L4-02 proxy blocks missing cookie on protected route
run_json_check \
  "L4-02 missing cookie blocked by proxy" \
  "$VERCEL_BASE_URL/api/proxy/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
  "401" \
  '"code":"TOKEN_MISSING"'

# L4-01 valid cookie -> protected route success (optional if cookie provided)
if [[ -n "${OPERATOR_COOKIE_VALUE:-}" ]]; then
  run_json_check \
    "L4-01 valid cookie passes through" \
    "$VERCEL_BASE_URL/api/proxy/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
    "200" \
    '"success":true' \
    -H "Cookie: policymint_operator_session=$OPERATOR_COOKIE_VALUE"
else
  echo -e "${YELLOW}SKIP${NC} L4-01 valid cookie passes through (set OPERATOR_COOKIE_VALUE to run)"
fi

# L4-03 / L4-04 optional checks requiring crafted cookies
if [[ -n "${GRACE_WINDOW_COOKIE_VALUE:-}" ]]; then
  body_file="$(mktemp)"
  tmp_files+=("$body_file")
  headers_file="$(mktemp)"
  tmp_files+=("$headers_file")
  status="$(curl -sS -D "$headers_file" -o "$body_file" -w '%{http_code}' \
    "$VERCEL_BASE_URL/api/proxy/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
    -H "Cookie: policymint_operator_session=$GRACE_WINDOW_COOKIE_VALUE")"
  header_content="$(tr -d '\r' < "$headers_file")"
  if [[ "$status" == "200" ]] && [[ "$header_content" == *"set-cookie:"* ]]; then
    print_result "true" "L4-03 expired-in-grace refresh" "(status 200 + Set-Cookie observed)"
  else
    print_result "false" "L4-03 expired-in-grace refresh" "(expected 200 + Set-Cookie, got status $status)"
  fi
else
  echo -e "${YELLOW}SKIP${NC} L4-03 expired-in-grace refresh (set GRACE_WINDOW_COOKIE_VALUE to run)"
fi

if [[ -n "${BEYOND_GRACE_COOKIE_VALUE:-}" ]]; then
  run_json_check \
    "L4-04 expired-beyond-grace rejected" \
    "$VERCEL_BASE_URL/api/proxy/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
    "401" \
    '"code":"SESSION_EXPIRED"' \
    -H "Cookie: policymint_operator_session=$BEYOND_GRACE_COOKIE_VALUE"
else
  echo -e "${YELLOW}SKIP${NC} L4-04 expired-beyond-grace rejected (set BEYOND_GRACE_COOKIE_VALUE to run)"
fi

# L4-07 CORS preflight should not allow arbitrary origin in production
headers_file="$(mktemp)"
tmp_files+=("$headers_file")
status="$(curl -sS -o /dev/null -D "$headers_file" -w '%{http_code}' \
  -X OPTIONS "$RENDER_BASE_URL/v1/agents/$IN_SCOPE_AGENT_ID/stats" \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: x-operator-token")"
header_content="$(tr -d '\r' < "$headers_file")"

if [[ "$header_content" == *"access-control-allow-origin: *"* ]]; then
  print_result "false" "L4-07 CORS wildcard check" "(wildcard ACAO detected)"
elif [[ "$header_content" == *"access-control-allow-origin: https://evil.example.com"* ]]; then
  print_result "false" "L4-07 CORS arbitrary origin check" "(evil origin allowed)"
else
  print_result "true" "L4-07 CORS origin restriction" "(status $status, no wildcard/arbitrary origin allow)"
fi

# L4-06 response leak precheck from CLI (browser DevTools still required)
body_file="$(mktemp)"
tmp_files+=("$body_file")
curl -sS "$VERCEL_BASE_URL/api/proxy/auth/session" -o "$body_file" || true
body="$(tr -d '\n' < "$body_file")"

if [[ "$body" == *"$RENDER_BASE_URL"* ]]; then
  print_result "false" "L4-06 backend URL payload leak" "(render URL found in proxy response body)"
else
  print_result "true" "L4-06 backend URL payload precheck" "(render URL not present in sampled response body)"
fi

echo
echo -e "${YELLOW}Manual checks still required:${NC}"
echo "- DevTools Network: ensure browser traffic uses only /api/proxy on Vercel origin"
echo "- DevTools Network/Application: verify Set-Cookie forwarding on login and cookie placement on Vercel domain"

echo
echo "Summary: $PASSED passed, $FAILED failed, $TOTAL total"

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
