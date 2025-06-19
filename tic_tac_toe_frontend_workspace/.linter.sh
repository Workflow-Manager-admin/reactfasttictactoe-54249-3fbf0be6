#!/bin/bash
cd /home/kavia/workspace/code-generation/reactfasttictactoe-54249-3fbf0be6/tic_tac_toe_frontend_workspace/tic_tac_toe_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

