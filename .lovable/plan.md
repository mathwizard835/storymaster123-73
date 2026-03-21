## Fix: Auth Emails Showing "Supabase Auth" Instead of "StoryMaster"

### What's Happening

Your email domain (`notify.storymaster.app`) is verified and active. The branded templates and edge function exist. However, the Lovable backend hasn't fully wired up the `auth-email-hook` to intercept Supabase's default auth emails. This is why you still see "Supabase Auth" as the sender.

### What Needs to Happen

**You do NOT need to manually configure anything in the Supabase dashboard.** Lovable handles the hook registration automatically.

The fix is to re-scaffold the auth email templates using Lovable's managed tool, which will:

1. Re-register the `auth-email-hook` with the backend so it properly intercepts auth events
2. Preserve your existing branded templates (StoryMaster purple styling)
3. Redeploy the edge function

After this, all new auth emails (signup confirmations, password resets, magic links) will come from **StoryMaster &lt;[noreply@storymaster.app](mailto:noreply@storymaster.app)&gt;** instead of "Supabase Auth."

NOTE FROM DEVELOPER: It just just say it's from StoryMaster, not StoryMaster & It...

### Steps

1. Re-scaffold auth email templates (triggers backend wiring)
2. Re-apply StoryMaster branding to any reset templates
3. Deploy the `auth-email-hook` edge function
4. Confirm activation — emails will flow through your branded templates automatically

### No Manual Steps Required

You won't need to touch the Supabase dashboard. The entire process is handled by Lovable's managed email system.