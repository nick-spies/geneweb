#!/bin/bash
# Build geneweb distribution and run gwd with the Spies database on port 2317.
# Handles the symlink and cache-busting gotchas automatically.

set -e
cd "$(dirname "$0")"

echo "=== Building distribution ==="
make distrib

echo "=== Fixing bases symlink ==="
rm -rf distribution/gw/bases
ln -s "$(pwd)/bases" distribution/gw/bases

echo "=== Stopping existing gwd ==="
pkill -f "gwd.*2317" 2>/dev/null || true
sleep 1

echo "=== Starting gwd on port 2317 ==="
cd distribution/gw
exec ./gwd -p 2317 -hd .
