import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { parseEmailWebhookPayload, sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { WebhookError, verifyWebhookRequest } from 'npm:@lovable.dev/webhooks-js'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

// Template mapping
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration
const SITE_NAME = "StoryMaster"
const SENDER_DOMAIN = "notify.storymaster.app"
const ROOT_DOMAIN = "storymaster.app"
const FROM_DOMAIN = "storymaster.app" // Domain shown in From address (may be root or sender subdomain)

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://storymaster123-73.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Webhook handler - verifies signature and sends email
async function handleWebhook(req: Request): Promise<Response> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let emailType = ''
  let recipientEmail = ''
  let confirmationUrl = ''
  let token = ''
  let email = ''
  let newEmail = ''
  let run_id = ''

  // Managed Lovable path (signed webhook)
  if (req.headers.has('x-lovable-signature')) {
    let payload: any
    try {
      const verified = await verifyWebhookRequest({
        req,
        secret: apiKey,
        parser: parseEmailWebhookPayload,
      })
      payload = verified.payload
      run_id = payload.run_id
    } catch (error) {
      if (error instanceof WebhookError) {
        switch (error.code) {
          case 'invalid_signature':
          case 'missing_timestamp':
          case 'invalid_timestamp':
          case 'stale_timestamp':
            console.error('Invalid webhook signature', { error: error.message })
            return new Response(JSON.stringify({ error: 'Invalid signature' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          case 'invalid_payload':
          case 'invalid_json':
            console.error('Invalid webhook payload', { error: error.message })
            return new Response(
              JSON.stringify({ error: 'Invalid webhook payload' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
      }

      console.error('Webhook verification failed', { error })
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!run_id) {
      console.error('Webhook payload missing run_id')
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (payload.version !== '1') {
      console.error('Unsupported payload version', { version: payload.version, run_id })
      return new Response(
        JSON.stringify({ error: `Unsupported payload version: ${payload.version}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    emailType = payload.data.action_type
    recipientEmail = payload.data.email
    confirmationUrl = payload.data.url
    token = payload.data.token ?? ''
    email = payload.data.email
    newEmail = payload.data.new_email ?? ''
  } else {
    // Direct Supabase Send Email Hook payload fallback
    type SupabaseHookPayload = {
      user?: { email?: string; new_email?: string }
      email_data?: {
        token?: string
        token_hash?: string
        token_new?: string
        token_hash_new?: string
        redirect_to?: string
        site_url?: string
        email_action_type?: string
      }
    }

    let directPayload: SupabaseHookPayload
    try {
      directPayload = (await req.json()) as SupabaseHookPayload
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    emailType = directPayload.email_data?.email_action_type ?? ''
    email = directPayload.user?.email ?? ''
    newEmail = directPayload.user?.new_email ?? ''
    recipientEmail = emailType === 'email_change' && newEmail ? newEmail : email

    const redirectTo = directPayload.email_data?.redirect_to || directPayload.email_data?.site_url || `https://${ROOT_DOMAIN}`
    const tokenHash = directPayload.email_data?.token_hash || directPayload.email_data?.token_hash_new || ''
    token = directPayload.email_data?.token || directPayload.email_data?.token_new || ''

    confirmationUrl = tokenHash
      ? `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(emailType)}&redirect_to=${encodeURIComponent(redirectTo)}`
      : redirectTo
  }

  if (!emailType || !recipientEmail || !confirmationUrl) {
    console.error('Missing required email payload fields', { emailType, recipientEmail })
    return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Received auth event', { emailType, email: recipientEmail, run_id })

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, run_id })
    return new Response(
      JSON.stringify({ error: `Unknown email type: ${emailType}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Build template props from payload.data (HookData structure)
  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: recipientEmail,
    confirmationUrl,
    token,
    email,
    newEmail,
  }

  // Render React Email to HTML and plain text
  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  })

  try {
    const sendPayload: Record<string, unknown> = {
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: EMAIL_SUBJECTS[emailType] || 'Notification',
      html,
      text,
      purpose: 'transactional',
    }

    if (run_id) {
      sendPayload.run_id = run_id
    } else {
      sendPayload.idempotency_key = `auth-${emailType}-${crypto.randomUUID()}`
    }

    await sendLovableEmail(
      sendPayload,
      { apiKey }
    )
  } catch (sendError) {
    console.error('Failed to send auth email', { error: sendError, run_id, emailType })
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email sent', { emailType, email: payload.data.email, run_id })

  return new Response(
    JSON.stringify({ success: true, sent: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
