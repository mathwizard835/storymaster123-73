/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Heading style={heroTitle}>📚 {siteName}</Heading>
          <Text style={heroTagline}>Turning Screen Time into Reading Time</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirm your new email ✉️</Heading>
          <Text style={text}>
            You requested to change your email for {siteName} from{' '}
            <strong>{email}</strong> to <strong>{newEmail}</strong>.
          </Text>
          <Text style={text}>Click the button below to confirm this change:</Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={confirmationUrl}>
              Confirm Email Change
            </Button>
          </Section>
          <Text style={smallText}>
            Or paste this link into your browser:<br />
            <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          </Text>
          <Text style={footer}>
            If you didn't request this change, please secure your account immediately.
          </Text>
        </Section>
        <Text style={brandFooter}>© {siteName} • Stories that spark imagination</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '20px 0', maxWidth: '560px', margin: '0 auto' }
const hero = {
  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
  borderRadius: '12px 12px 0 0',
  padding: '32px 24px',
  textAlign: 'center' as const,
}
const heroTitle = { fontSize: '28px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0 0 8px' }
const heroTagline = { fontSize: '14px', color: '#fce7f3', margin: 0 }
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderTop: 'none',
  borderRadius: '0 0 12px 12px',
  padding: '32px 28px',
}
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1f2937', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 24px', wordBreak: 'break-all' as const }
const link = { color: '#7c3aed', textDecoration: 'underline' }
const button = {
  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '24px 0 0', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }
const brandFooter = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: '20px 0 0' }
