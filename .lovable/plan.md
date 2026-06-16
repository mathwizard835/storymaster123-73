Based on the latest logs, you should not need to release a whole new App Store version for the original Anthropic model outage. The mobile app calls the same deployed Supabase Edge Function, and backend fixes deploy server-side.

Current signal:
- The old Anthropic 404 model error stopped after the model ID change.
- New mobile attempts are now returning 403 because the account in the logs is at the Adventure Pass soft cap: 40/40 stories in the last 30 days.
- The client is still not treating that server response as a known, user-facing limit, so it can still look like generic story-generation failure.

Plan:
1. Update client error handling in `src/lib/story.ts`
   - Preserve all expected server-side generation codes/messages, including `paywall_required` and subscription/limit messages, instead of collapsing them into “service temporarily unavailable”.

2. Update the mission screen error UX in `src/pages/Mission.tsx`
   - When generation is blocked by paywall or 40/40 soft cap, show a clear message instead of implying the generation service is down.
   - Keep continuation scenes allowed when the backend allows them; do not change model routing or subscription rules.

3. Verify the deployed function state
   - Re-check `generate-story` logs after the change.
   - Confirm there are no remaining `claude-sonnet-4-20250514` references.
   - Confirm current failures are limits/paywall responses, not Anthropic 404/service outage responses.

4. Native release guidance
   - If the installed app is a normal bundled Capacitor release, client UI/error-message fixes require a new app update to reach App Store users.
   - But the actual story-generation backend/model fix does not require a native release.
   - If users are only blocked by the 40/40 cap or subscription gate, a native release will not fix that; the account/subscription/limit state must be addressed.