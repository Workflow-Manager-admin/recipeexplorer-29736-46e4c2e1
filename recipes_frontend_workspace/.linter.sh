#!/bin/bash
cd /home/kavia/workspace/code-generation/recipeexplorer-29736-46e4c2e1/recipes_frontend_workspace/recipes_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

