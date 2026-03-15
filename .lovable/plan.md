

## Fix: Remove User Tracking Declaration

### Problem
App Store Connect is flagging `NSUserTrackingUsageDescription` in `Info.plist`. This app targets children (COPPA) and does **not** use any tracking (ATT, IDFA, etc.). The key was added unnecessarily and must be removed to avoid App Store compliance issues.

### Changes

**1. `ios/App/App/Info.plist`** — Remove lines 54-55 (`NSUserTrackingUsageDescription` key and value).

**2. `ios/App/App/PrivacyInfo.xcprivacy`** — Already declares `NSPrivacyTracking: false` and no tracking domains, which is correct. No changes needed.

After removing, rebuild and upload a new binary to App Store Connect.

