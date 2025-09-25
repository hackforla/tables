#!/bin/bash

set -e  # Exit on any error

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Function to check if a directory contains any of the changed files
function contains_changes() {
  local dir="$1"
  shift
  echo "Checking for changed files in $dir: $@"
  [[ "$*" == "" ]] && { echo "No changed files provided, skipping $dir"; return 1; }
  dir_absolute=$(realpath "$dir" 2>/dev/null || pwd)
  for f in "$@"; do
    file_absolute=$(realpath "$f" 2>/dev/null || echo "$f")
    echo "Comparing $file_absolute against $dir_absolute"
    if [[ "$file_absolute" == "$dir_absolute"/* ]]; then
      echo "Found changed file $f in $dir"
      return 0
    fi
  done
  echo "No changed files in $dir"
  return 1
}

# Ensure working directory is the repository root
echo "Initial working directory: $(pwd)"
cd "$GITHUB_WORKSPACE" || { echo "Failed to set working directory to $GITHUB_WORKSPACE"; exit 1; }
echo "Current working directory: $(pwd)"

# Debug input
echo "Input changed files: $@"
if [ $# -eq 0 ]; then
  echo "No input files provided, exiting"
  exit 0
fi

# Convert changed files to unique directories
changed_files=$(echo "$@" | xargs -n1 realpath 2>/dev/null | xargs -I {} dirname {} | sort -u || true)
echo "Changed directories: $changed_files"

# Find all directories containing .clasp.json files
IFS=$'\n' read -r -d '' -a dirs < <(find . -name '.clasp.json' -exec dirname {} \; | sort -u | xargs realpath 2>/dev/null || true)
echo "Clasp project directories: ${dirs[@]}"

exit_code=0

# Process each Clasp project directory
for dir in "${dirs[@]}"; do
  echo "Processing directory: $dir"
  pushd "$dir" > /dev/null || { echo "Failed to enter $dir"; exit 1; }
  if ! contains_changes "$dir" "$@"; then
    popd > /dev/null
    continue
  fi
  echo "Publishing $dir"
  clasp push -f
  status=$?
  if [ $status -ne 0 ]; then
    echo "clasp push failed in $dir with status $status"
    exit_code=$status
  fi
  popd > /dev/null
done

if [ $exit_code -ne 0 ]; then
  echo "Script push failed."
fi

exit $exit_code