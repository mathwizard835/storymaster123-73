/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your StoryMaster verification code 🔐</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Heading style={heroTitle}>📚 StoryMaster Kids</Heading>
          <Text style={heroTagline}>Turning Screen Time into Reading Time</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirm it's you 🔐</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
          <Text style={footer}>
            This code will expire shortly. If you didn't request this, you can safely ignore this email.
          </Text>
        </Section>
        <Text style={brandFooter}>© StoryMaster Kids • Stories that spark imagination</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#7c3aed',
  letterSpacing: '8px',
  margin: '0',
  background: '#faf5ff',
  padding: '16px 24px',
  borderRadius: '12px',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '24px 0 0', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }
const brandFooter = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: '20px 0 0' }
