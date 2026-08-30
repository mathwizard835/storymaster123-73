import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPPORT_EMAIL = 'support@storymaster.app'
const FROM_ADDRESS = Deno.env.get('SUPPORT_FROM_EMAIL') ?? `StoryMaster Support <${SUPPORT_EMAIL}>`

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function toParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 16px 0;">${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function buildHtml(opts: { name: string; body: string; originalMessage: string; originalDate: string }) {
  const greeting = opts.name ? `Hi ${escapeHtml(opts.name)},` : 'Hi there,'
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;">
      <div style="font-size:18px;font-weight:700;color:#2563eb;margin-bottom:20px;">StoryMaster Kids Support</div>
      <p style="margin:0 0 16px 0;">${greeting}</p>
      ${toParagraphs(opts.body)}
      <p style="margin:24px 0 8px 0;">— The StoryMaster Kids team</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <div style="font-size:13px;color:#6b7280;">
        <div style="margin-bottom:8px;">You wrote on ${escapeHtml(opts.originalDate)}:</div>
        <blockquote style="margin:0;padding-left:12px;border-left:3px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(
          opts.originalMessage,
        )}</blockquote>
      </div>
      <div style="font-size:12px;color:#9ca3af;margin-top:20px;">Reply to this email to continue the conversation.</div>
    </div>
  </body>
</html>`
}

function buildText(opts: { name: string; body: string; originalMessage: string; originalDate: string }) {
  const quoted = opts.originalMessage
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')
  return `${opts.name ? `Hi ${opts.name},` : 'Hi there,'}\n\n${opts.body}\n\n— The StoryMaster Kids team\n\n---\nYou wrote on ${opts.originalDate}:\n${quoted}\n`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData?.user) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const adminUserId = userData.user.id

    const { data: isAdmin, error: roleError } = await admin.rpc('has_role', {
      _user_id: adminUserId,
      _role: 'admin',
    })
    if (roleError || !isAdmin) {
      return json({ error: 'Forbidden' }, 403)
    }

    let payload: { requestId?: string; body?: string; subject?: string }
    try {
      payload = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const requestId = typeof payload.requestId === 'string' ? payload.requestId.trim() : ''
    const messageBody = typeof payload.body === 'string' ? payload.body.trim() : ''
    const subjectInput = typeof payload.subject === 'string' ? payload.subject.trim() : ''

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(requestId)) {
      return json({ error: 'A valid requestId is required' }, 400)
    }
    if (messageBody.length < 2 || messageBody.length > 10000) {
      return json({ error: 'Reply must be between 2 and 10000 characters' }, 400)
    }

    const { data: request, error: requestError } = await admin
      .from('support_requests')
      .select('id, name, email, message, created_at, status')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError) {
      return json({ error: 'Could not load support request', details: requestError.message }, 500)
    }
    if (!request) {
      return json({ error: 'Support request not found' }, 404)
    }
    if (!request.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
      return json({ error: 'This request has no valid email address' }, 400)
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return json({ error: 'Email sending is not configured (missing RESEND_API_KEY)' }, 500)
    }

    const subject = subjectInput || 'Re: Your StoryMaster Kids support request'
    const originalDate = new Date(request.created_at as string).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    })
    const templateArgs = {
      name: (request.name as string) || '',
      body: messageBody,
      originalMessage: (request.message as string) || '',
      originalDate: `${originalDate} UTC`,
    }

    const html = buildHtml(templateArgs)
    const text = buildText(templateArgs)

    let deliveryStatus = 'sent'
    let errorMessage: string | null = null
    let providerMessageId: string | null = null
    let providerStatus = 200
    let providerDetails = ''

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [request.email],
        reply_to: SUPPORT_EMAIL,
        subject,
        html,
        text,
      }),
    })

    if (!resendResponse.ok) {
      providerStatus = resendResponse.status
      providerDetails = await resendResponse.text()
      deliveryStatus = 'failed'
      errorMessage = `[${providerStatus}] ${providerDetails}`.slice(0, 1000)
      console.error('Resend request failed', errorMessage)
    } else {
      const result = await resendResponse.json().catch(() => ({}))
      providerMessageId = result?.id ?? null
    }

    await admin.from('support_replies').insert({
      request_id: requestId,
      admin_id: adminUserId,
      to_email: request.email,
      subject,
      body: messageBody,
      delivery_status: deliveryStatus,
      error_message: errorMessage,
      provider_message_id: providerMessageId,
    })

    if (deliveryStatus === 'failed') {
      return json({ error: 'Email provider rejected the message', details: providerDetails }, providerStatus)
    }

    await admin
      .from('support_requests')
      .update({
        status: request.status === 'resolved' ? 'resolved' : 'in_progress',
        replied_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    return json({ success: true, messageId: providerMessageId })
  } catch (e) {
    console.error('send-support-reply error', e)
    return json({ error: (e as Error)?.message ?? 'Unexpected error' }, 500)
  }
})
