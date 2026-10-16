#!/bin/sh
# Applies the game's iOS settings to the Xcode project that `npx cap add ios` generates.
# Runs on macOS (Codemagic does this automatically; see codemagic.yaml).
set -e

PLIST="ios/App/App/Info.plist"
PHONE='["UIInterfaceOrientationPortrait"]'
PAD='["UIInterfaceOrientationPortrait","UIInterfaceOrientationPortraitUpsideDown","UIInterfaceOrientationLandscapeLeft","UIInterfaceOrientationLandscapeRight"]'

# Name under the icon on the Home Screen.
plutil -replace CFBundleDisplayName -string "Swish Street" "$PLIST"

# iPhone: portrait only (the shot view is designed for it). iPad: any orientation.
plutil -replace UISupportedInterfaceOrientations -json "$PHONE" "$PLIST"
plutil -replace "UISupportedInterfaceOrientations~ipad" -json "$PAD" "$PLIST"
plutil -replace UIRequiresFullScreen -bool YES "$PLIST"

# No status bar over the game.
plutil -replace UIStatusBarHidden -bool YES "$PLIST"
plutil -replace UIViewControllerBasedStatusBarAppearance -bool NO "$PLIST"

# The app uses no encryption beyond Apple's own (answers the export compliance question).
plutil -replace ITSAppUsesNonExemptEncryption -bool NO "$PLIST"

echo "iOS project configured: portrait iPhone, any-orientation iPad, full screen, no status bar."
