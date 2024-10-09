## Secrets Detection

We make use of [GitLeaks](https://github.com/gitleaks/gitleaks) for secrets detection. This is a command line tool that can either go through your git log or the files in your repository and search for secrets that shouldn't be stored there. Please see the README on the gitleaks repo linked above on how to run this tool.
Recommended cadence for running this tool is _once a month_.

### Run Log

* Date: September 25th, 2024
* Method: git log piped to stdin
* Call made: `git log -p -n 1000000 | gitleaks -v stdin`
* Result: No Leaks found

* Date: September 25th, 2024
* Method: Scan of directory files
* Call made: `gitleaks dir ./tables`
* Result: No Leaks found