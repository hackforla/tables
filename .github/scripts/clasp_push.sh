#!/bin/bash

set -e  # Exit on any error

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Function to check if a directory contains any of the changed files
function contains_changes() {
  local dir="$1"
  shift
  [[ "$*" == "" ]] && return 1
  dir_absolute=$(realpath "$dir" 2>/dev/null || pwd)
  dir_absolute="${dir_absolute%/}/"  # Ensure trailing slash for pattern match
  for f in "$@"; do
    file_absolute=$(realpath "$f" 2>/dev/null || echo "$f")
    if [[ "$file_absolute" == "$dir_absolute"* ]]; then
      return 0
    fi
  done
  return 1
}

# Ensure working directory is the repository root
cd "$GITHUB_WORKSPACE" || exit 1

# If no input files, exit
if [ $# -eq 0 ]; then
  exit 0
fi

# Filter changed files to only include src/ directories
changed_files=$(echo "$@" | xargs -n1 | grep '^src/' | xargs -n1 realpath 2>/dev/null | xargs -I {} dirname {} | sort -u || true)

# Find all directories containing .clasp.json files
dirs=()
if find_output=$(find . -name '.clasp.json' -exec dirname {} \; | sort -u | xargs realpath 2>/dev/null); then
  IFS=$'\n' read -r -d '' -a dirs <<< "$find_output" || true
fi

exit_code=0

# Process each Clasp project directory
for dir in "${dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    continue
  fi
  pushd "$dir" > /dev/null || { exit_code=1; continue; }
  # Skip if the directory does not contain any changed files
  if ! contains_changes "$dir" "$@"; then
    popd > /dev/null
    continue
  fi
  clasp push -f
  status=$?
  if [ $status -ne 0 ]; then
    exit_code=$status
  fi
  popd > /dev/null
done

exit $exit_code