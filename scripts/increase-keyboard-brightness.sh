#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Increase Keyboard Brightness
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🔆

# Documentation:
# @raycast.author rsefer
# @raycast.authorURL https://raycast.com/rsefer

~/dotfiles/bin/keyboard-brightness up || { echo "Error: command failed"; exit 1; }
