#!/bin/bash

current_branch=$(git branch --show-current 2>/dev/null)
if [ -z "$current_branch" ]; then
  echo "Error: Failed to determine the current git branch."
  exit 1
fi

echo "Current branch: $current_branch"

line_to_find="if \[\[ '\${{ github.ref }}' == 'refs/heads/master' \]\]; then"
line_to_replace="if \[\[ '\${{ github.ref }}' == 'refs/heads/$current_branch' \]\]; then"

file_path="../workflows/packages.yaml"

if grep -q "$line_to_find" "$file_path"; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i "" "s|$line_to_find|$line_to_replace|g" "$file_path"
  else
    sed -i "s|$line_to_find|$line_to_replace|g" "$file_path"
  fi

  echo "Successfully updated ${file_path} to use the branch '${current_branch}'."
else
  echo "The line with 'refs/heads/master' was not found in $file_path."
fi