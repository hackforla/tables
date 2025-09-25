#!/bin/bash

set -e  # Exit on any error

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Function to check if a directory contains any of the changed files
function contains_changes() {
  local dir="$1"
  shift
  [[ "$*" == "" ]] && return 1
  dir_absolute=$(realpath "$dir" 2>/dev/null || echo "$dir")
  dir_absolute="${dir_absolute%/}/"
  for f in "$@"; do
    file_absolute=$(realpath "$f" 2>/dev/null || echo "$root_dir/$f")
    if [[ "$file_absolute" == "$dir_absolute"* ]]; then
      echo "Found changed file $f in $dir"
      return 0
    fi
  done
  return 1
}

# Ensure working directory is the repository root
cd "$GITHUB_WORKSPACE" || exit 1
root_dir=$(pwd)

# Get changed files
changed_files=""
if [[ "${GITHUB_EVENT_NAME}" == "push" ]]; then
  changed_files=$(git diff --name-only HEAD~1 | grep '^src/' | tr '\n' ' ' || true)
else
  changed_files=$(git diff --name-only origin/main | grep '^src/' | tr '\n' ' ' || true)
fi
if [[ -z "$changed_files" ]]; then
  echo "No changes found in src/, exiting"
  exit 0
fi

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
  if ! contains_changes "$dir" $changed_files; then
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