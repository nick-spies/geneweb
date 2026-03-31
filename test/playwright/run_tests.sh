#!/bin/bash
# Panoramic tree renderer smoke tests
# Usage: ./test/playwright/run_tests.sh
# Requires: gwd running on localhost:2317 with the spies database

set -e
cd "$(dirname "$0")"

# Check gwd is running
if ! curl -s http://localhost:2317/spies > /dev/null 2>&1; then
  echo "ERROR: gwd not running on port 2317. Start it first."
  exit 1
fi

echo "Running panoramic tree smoke tests..."
npx playwright test --config=playwright.config.js "$@"
