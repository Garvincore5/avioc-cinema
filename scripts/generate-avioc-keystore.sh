#!/usr/bin/env bash
# ==============================================================================
# Avioc Cinema — Official Android Keystore Generator (Linux/macOS)
# ==============================================================================
set -euo pipefail

KEYSTORE_PASS="${1:-avioc2026cinema}"
ALIAS="${2:-avioc}"
OUTPUT_PATH="${3:-./scripts/avioc-release-key.jks}"

echo "========================================="
echo "  Avioc Cinema — Generating Keystore     "
echo "========================================="

mkdir -p "$(dirname "$OUTPUT_PATH")"

DNAME="CN=Avioc, OU=Avioc Cinema Media, O=Avioc Cinema, L=Kampala, ST=Central, C=UG"

keytool -genkey -v \
  -keystore "$OUTPUT_PATH" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$KEYSTORE_PASS" \
  -keypass "$KEYSTORE_PASS" \
  -dname "$DNAME"

echo "✓ Created $OUTPUT_PATH with author 'Avioc'"
