#!/usr/bin/env bash
# Build for Linux / macOS (run on the same OS you want to build for)
set -e
cd "$(dirname "$0")"
npm install
case "$(uname)" in
  Darwin) npm run dist:mac ;;
  *) npm run dist:linux ;;
esac
echo "Done. Check the release/ folder."
