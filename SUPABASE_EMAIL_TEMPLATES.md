# Supabase Email Templates (branded)

Sending stays exactly as you configured it: Supabase Authentication → Emails (your custom SMTP, From: `StoryMaster <noreply@storymaster.app>`). Nothing else is involved.

Paste the HTML below into **Supabase Dashboard → Authentication → Emails → Templates**.

---

## Reset Password

Subject: `Reset your StoryMaster password`

```html
<div style="background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px 0">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);border-radius:12px 12px 0 0;padding:32px 24px;text-align:center">
      <h1 style="font-size:28px;font-weight:bold;color:#ffffff;margin:0 0 8px">📚 StoryMaster Kids</h1>
      <p style="font-size:14px;color:#fce7f3;margin:0">Turning Screen Time into Reading Time</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:32px 28px">
      <h2 style="font-size:22px;font-weight:bold;color:#1f2937;margin:0 0 16px">Reset your password 🔒</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px">
        We received a request to reset the password for your StoryMaster Kids account. Tap the button below to choose a new one.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="{{ .ConfirmationURL }}" style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);color:#ffffff;font-size:16px;font-weight:bold;border-radius:12px;padding:14px 28px;text-decoration:none;display:inline-block">Reset Password</a>
      </div>
      <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0 0 24px;word-break:break-all">
        Or paste this link into your browser:<br />
        <a href="{{ .ConfirmationURL }}" style="color:#7c3aed">{{ .ConfirmationURL }}</a>
      </p>
      <p style="font-size:13px;color:#9ca3af;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:16px">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:20px 0 0">© StoryMaster Kids • Stories that spark imagination</p>
  </div>
</div>
```

---

## Confirm Signup

Subject: `Confirm your StoryMaster account`

```html
<div style="background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px 0">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);border-radius:12px 12px 0 0;padding:32px 24px;text-align:center">
      <h1 style="font-size:28px;font-weight:bold;color:#ffffff;margin:0 0 8px">📚 StoryMaster Kids</h1>
      <p style="font-size:14px;color:#fce7f3;margin:0">Turning Screen Time into Reading Time</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:32px 28px">
      <h2 style="font-size:22px;font-weight:bold;color:#1f2937;margin:0 0 16px">Welcome aboard! ✨</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px">
        Confirm your email address to start your first adventure.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="{{ .ConfirmationURL }}" style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);color:#ffffff;font-size:16px;font-weight:bold;border-radius:12px;padding:14px 28px;text-decoration:none;display:inline-block">Confirm Email</a>
      </div>
      <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0 0 24px;word-break:break-all">
        Or paste this link into your browser:<br />
        <a href="{{ .ConfirmationURL }}" style="color:#7c3aed">{{ .ConfirmationURL }}</a>
      </p>
      <p style="font-size:13px;color:#9ca3af;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:16px">
        If you didn't create a StoryMaster account, you can ignore this email.
      </p>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:20px 0 0">© StoryMaster Kids • Stories that spark imagination</p>
  </div>
</div>
```
