
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Function to check if a directory contains any of the changed files
function contains_changes() {
  local dir="$1"
  shift
  [[ "$*" == "" ]] && { echo "No changed files provided, skipping $dir"; return 1; }
  for f in "$@"; do
    if [[ $(realpath "$f" 2>/dev/null)/ == $(realpath "$dir")/* ]]; then
      echo "Found changed file $f in $dir"
      return 0
    fi
  done
  echo "No changed files in $dir"
  return 1
}
# Debug input
echo "Input changed files: $@"

# Convert changed files to absolute paths and get unique directories
changed_files=""
if [ $# -gt 0 ]; then
  changed_files=$(echo "$@" | xargs -n1 realpath 2>/dev/null | xargs -I {} dirname {} | sort -u)
fi
echo "Changed directories: $changed_files"

# Find all directories containing .clasp.json files, which indicate Clasp projects
IFS=$'\n' read -r -d '' -a dirs < <(find . -name '.clasp.json' -exec dirname {} \; | sort -u | xargs realpath)
echo "Clasp project directories: ${dirs[@]}"

exit_code=0

# Process each Clasp project directory
for dir in "${dirs[@]}"; do
  pushd "$dir" > /dev/null || { echo "Failed to enter $dir"; exit 1; }
  # Skip if the directory does not contain any changed files
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