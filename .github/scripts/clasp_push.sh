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
  dir_absolute=$(realpath "$dir" 2>/dev/null || echo "$dir")
  dir_absolute="${dir_absolute%/}/"
  for f in "$@"; do
    file_absolute=$(realpath "$f" 2>/dev/null || echo "$(pwd)/$f")
    echo "Comparing $file_absolute against $dir_absolute"
    if [[ "$file_absolute" == "$dir_absolute"* ]]; then
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

# Filter changed files to only include src/ directories
changed_files=""
if [ $# -gt 0 ]; then
  changed_files=$(echo "$@" | xargs -n1 | grep '^src/' | xargs -n1 realpath 2>/dev/null | xargs -I {} dirname {} | sort -u || true)
fi
echo "Changed directories (filtered to src/): $changed_files"

# Find all directories containing .clasp.json files
dirs=()
if ! find_output=$(find . -name '.clasp.json' -exec dirname {} \; | sort -u | xargs realpath 2>/dev/null); then
  echo "Warning: find command failed or no .clasp.json files found"
else
  IFS=$'\n' read -r -d '' -a dirs <<< "$find_output" || true
fi
echo "Clasp project directories: ${dirs[@]}"

exit_code=0

# Process each Clasp project directory
for dir in "${dirs[@]}"; do
  echo "Processing directory: $dir"
  if [ ! -d "$dir" ]; then
    echo "Directory $dir does not exist, skipping"
    continue
  fi
  pushd "$dir" > /dev/null || { echo "Failed to enter $dir"; exit_code=1; continue; }
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