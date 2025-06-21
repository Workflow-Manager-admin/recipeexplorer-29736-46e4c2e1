#!/bin/bash
cd /home/kavia/workspace/code-generation/recipeexplorer-29736-46e4c2e1/recipes_backend_workspace/recipes_backend
source venv/bin/activate
flake8 .
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

