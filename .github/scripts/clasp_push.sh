
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Function to check if a directory contains any of the changed files
# Returns 0 if the directory contains changes, 1 otherwise
function contains_changes() {
  # If no changed files are provided, assume no changes
  [[ "${*:2}" = "" ]] && return 0
  for f in "${@:2}"; do
    case $(realpath "$f")/ in 
      $(realpath "$1")/*) return 0;;
    esac
  done
  return 1
}

# Get the unique directories of the changed files
# This helps in identifying which directories have modifications
changed_files=$(echo "${@:1}" | xargs realpath | xargs -I {} dirname {}| sort -u | uniq)

# Initialize an array to hold directories containing .clasp.json files
dirs=()

# Find all directories containing .clasp.json files, which indicate Clasp projects
# Use absolute paths for accuracy
IFS=$'\n' read -r -d '' -a dirs < <( find . -name '.clasp.json' -exec dirname '{}' \; | sort -u | xargs realpath )

exit_code=0

# Process each Clasp project directory
for dir in "${dirs[@]}"; do
  pushd "${dir}" > /dev/null || exit
  # Skip if the directory does not contain any changed files
  contains_changes "$dir" "${changed_files[@]}" || continue
  echo "Publishing ${dir}"
  clasp push -f
  status=$?
  if [ $status -ne 0 ]; then
    exit_code=$status
  fi
  popd > /dev/null || exit
done

if [ $exit_code -ne 0 ]; then
  echo "Script push failed."
fi

exit $exit_code