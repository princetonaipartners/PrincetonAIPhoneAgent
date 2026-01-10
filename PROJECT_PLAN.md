# PrincetonAI Medical Phone Agent - Project Plan

> **Gold Standard Document** - Single source of truth for the MVP
>
> Last Updated: January 2026
> Status: Planning Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Scope](#2-project-scope)
3. [Technical Architecture](#3-technical-architecture)
4. [Data Schema](#4-data-schema)
5. [Conversation Design](#5-conversation-design)
6. [System Prompt Specification](#6-system-prompt-specification)
7. [API Specifications](#7-api-specifications)
8. [ElevenLabs Agent Configuration](#8-elevenlabs-agent-configuration)
9. [Security & Compliance](#9-security--compliance)
10. [Implementation Checklist](#10-implementation-checklist)
11. [Testing Plan](#11-testing-plan)
12. [Deployment Guide](#12-deployment-guide)
13. [Cost Estimates](#13-cost-estimates)
14. [Open Questions & Decisions](#14-open-questions--decisions)

---

## 1. Executive Summary

### Project Name
**PrincetonAI-Medical-PhoneAgent**

### Purpose
Build a proof-of-concept voice agent that can receive phone calls, conduct conversational patient intake interviews, and capture structured registration data for an NHS-affiliated UK medical practice.

### Goals
1. Demonstrate technical feasibility of voice-based patient intake
2. Prove conversation quality is acceptable for real-world use
3. Capture structured data ready for future patient system integration
4. Validate cost-effectiveness at scale

### Success Criteria
- [ ] Agent completes full intake conversations naturally
- [ ] Structured data is captured accurately (>90% accuracy on test calls)
- [ ] Average call duration under 10 minutes for standard intake
- [ ] System handles common edge cases gracefully
- [ ] Client accepts demo for contract signing

---

## 2. Project Scope

### In Scope (MVP)

#### Patient Identification
- First name
- Last name
- Postcode
- Phone number
- Preferred contact method (text/phone/both)

#### Emergency Screening
- Confirm not an emergency
- Direct to 999 if emergency indicated

#### Request Types (MVP supports 2)
1. **Health Problem** - Full intake flow
2. **Repeat Prescription** - Simplified flow

#### Health Problem Data Collection
- Problem description
- Duration / progression
- Treatments tried
- Concerns
- How they'd like help
- Best contact times

#### Repeat Prescription Data Collection
- Medication name(s)
- Strength/dosage
- Additional notes

### Out of Scope (Deferred)
- Fit (sick) note requests
- Routine care bookings
- Test results inquiries
- Referral follow-ups
- Doctor's letter requests
- Other admin requests
- Live patient system integration
- NHS identity verification
- Multi-language support
- Full NHS DSPT compliance

---

## 3. Technical Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     INBOUND CALL                                │
│              (Twilio UK Number → ElevenLabs)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ELEVENLABS CONVERSATIONAL AI                   │
│                                                                 │
│  Agent: PrincetonAI-Medical-PhoneAgent                          │
│  LLM: Claude Sonnet 4                                           │
│  Voice: UK English (professional, warm)                         │
│                                                                 │
│  Post-Call Webhook ──────────────────────────────────────────┐  │
└──────────────────────────────────────────────────────────────│──┘
                                                               │
                             ┌─────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js 15)                          │
│                                                                 │
│  /api/webhooks/elevenlabs    ← Receives call data               │
│  /api/tools/validate-postcode ← Real-time validation            │
│  /admin                       ← View submissions                │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                 │
│                                                                 │
│  Tables: submissions, call_logs                                 │
│  Auth: Service role for webhooks                                │
│  RLS: Enabled for admin access                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 15.x | App Router, API routes |
| Language | TypeScript | 5.x | Type safety |
| Database | Supabase | Latest | Postgres + Auth + RLS |
| Hosting | Vercel | Serverless | Auto-scaling, edge |
| Voice AI | ElevenLabs | Latest | Conversational AI platform |
| Telephony | Twilio | Via ElevenLabs | UK phone number |
| LLM | Claude Sonnet 4 | Via ElevenLabs | Conversation intelligence |
| Styling | Tailwind CSS | 4.x | Admin UI |
| Validation | Zod | 3.x | Schema validation |

### Project Structure

```
PhoneAgent/
├── PROJECT_PLAN.md              # This document (gold standard)
├── .env.local                   # Local secrets (gitignored)
├── .env.example                 # Template for env vars
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Landing/status page
│   │
│   ├── admin/
│   │   ├── page.tsx             # Submissions dashboard
│   │   └── [id]/
│   │       └── page.tsx         # Submission detail view
│   │
│   └── api/
│       ├── webhooks/
│       │   └── elevenlabs/
│       │       └── route.ts     # Post-call webhook
│       │
│       └── tools/
│           └── validate-postcode/
│               └── route.ts     # Real-time validation
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   └── server.ts            # Server client
│   │
│   ├── elevenlabs/
│   │   ├── webhook.ts           # Webhook validation
│   │   └── types.ts             # Type definitions
│   │
│   └── utils/
│       └── postcode.ts          # UK postcode validation
│
├── types/
│   └── index.ts                 # Shared TypeScript types
│
├── elevenlabs-config/
│   ├── agent.json               # Full agent configuration
│   └── system-prompt.md         # System prompt reference
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## 4. Data Schema

### Supabase Tables

#### `submissions` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Primary key, auto-generated |
| `conversation_id` | text | NO | ElevenLabs conversation ID (unique) |
| `agent_id` | text | NO | ElevenLabs agent ID |
| `call_timestamp` | timestamptz | NO | When call started |
| `call_duration_secs` | integer | YES | Call length in seconds |
| `caller_phone` | text | YES | Caller's phone number |
| `status` | text | NO | pending, completed, failed, requires_review |
| `patient_data` | jsonb | NO | Structured patient info |
| `request_type` | text | YES | health_problem, repeat_prescription |
| `request_data` | jsonb | YES | Type-specific request details |
| `transcript` | text | YES | Full conversation transcript |
| `analysis` | jsonb | YES | LLM analysis output |
| `created_at` | timestamptz | NO | Record creation time |
| `updated_at` | timestamptz | NO | Last update time |

#### `patient_data` JSONB Structure

```typescript
interface PatientData {
  first_name: string;
  last_name: string;
  postcode: string;
  phone_number: string;
  preferred_contact: 'text' | 'phone' | 'both';
  emergency_confirmed: boolean;
}
```

#### `request_data` JSONB Structure (Health Problem)

```typescript
interface HealthProblemRequest {
  type: 'health_problem';
  description: string;
  duration: string;
  progression: string;        // getting better, worse, same
  treatments_tried: string;
  concerns: string;
  help_requested: string;
  best_contact_times: string;
}
```

#### `request_data` JSONB Structure (Repeat Prescription)

```typescript
interface RepeatPrescriptionRequest {
  type: 'repeat_prescription';
  medications: Array<{
    name: string;
    strength: string;
  }>;
  additional_notes: string;
}
```

#### `call_logs` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Primary key |
| `conversation_id` | text | NO | Links to submission |
| `event_type` | text | NO | webhook_received, processing, error |
| `payload` | jsonb | YES | Raw event data |
| `created_at` | timestamptz | NO | Event timestamp |

### SQL Migration

```sql
-- 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL,
  call_timestamp TIMESTAMPTZ NOT NULL,
  call_duration_secs INTEGER,
  caller_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  patient_data JSONB NOT NULL DEFAULT '{}',
  request_type TEXT,
  request_data JSONB,
  transcript TEXT,
  analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Call logs table
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_submissions_conversation_id ON submissions(conversation_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_call_logs_conversation_id ON call_logs(conversation_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for webhooks)
CREATE POLICY "Service role full access to submissions" ON submissions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to call_logs" ON call_logs
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 5. Conversation Design

### Flow Diagram

```
START
  │
  ▼
┌─────────────────────────────────────────┐
│ GREETING                                │
│ "Hello, you've reached the automated    │
│ patient request line. I'll help you     │
│ submit a request to the practice team." │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ COLLECT: First name                     │
│ "Could I start with your first name?"   │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ COLLECT: Last name                      │
│ "And your last name?"                   │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ COLLECT: Postcode                       │
│ "What's your postcode?"                 │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ COLLECT: Phone number                   │
│ "And the best phone number to reach     │
│ you on?"                                │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ COLLECT: Contact preference             │
│ "Would you prefer to be contacted by    │
│ text message, phone call, or either?"   │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ EMERGENCY SCREENING                     │
│ "Before we continue, I need to confirm  │
│ this isn't a medical emergency. If      │
│ you're experiencing chest pain,         │
│ difficulty breathing, severe bleeding,  │
│ or any other emergency, please hang up  │
│ and call 999 immediately.               │
│                                         │
│ Can you confirm this is not an          │
│ emergency?"                             │
└───────────────────┬─────────────────────┘
                    │
            ┌───────┴───────┐
            │               │
       [CONFIRMED]     [EMERGENCY]
            │               │
            │               ▼
            │    ┌─────────────────────┐
            │    │ "Please hang up and │
            │    │ call 999 now. Take  │
            │    │ care."              │
            │    │ [END CALL]          │
            │    └─────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│ REQUEST TYPE                            │
│ "Thank you. How can I help you today?   │
│ Are you calling about a health problem, │
│ or do you need a repeat prescription?"  │
└───────────────────┬─────────────────────┘
                    │
            ┌───────┴───────┐
            │               │
    [HEALTH PROBLEM]  [PRESCRIPTION]
            │               │
            ▼               ▼
     ┌──────────┐    ┌──────────────┐
     │ HEALTH   │    │ PRESCRIPTION │
     │ FLOW     │    │ FLOW         │
     └────┬─────┘    └──────┬───────┘
          │                 │
          └────────┬────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ CONFIRMATION                            │
│ "Let me read back what I have..."       │
│ [Summarize key details]                 │
│ "Is that all correct?"                  │
└───────────────────┬─────────────────────┘
                    │
            ┌───────┴───────┐
            │               │
       [CORRECT]      [CORRECTION]
            │               │
            │               ▼
            │    ┌─────────────────────┐
            │    │ Handle correction   │
            │    │ Loop back as needed │
            │    └─────────┬───────────┘
            │              │
            └──────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│ CLOSING                                 │
│ "Your request has been submitted. A     │
│ member of the team will be in touch     │
│ during working hours, by [preference].  │
│ Is there anything else I can help with?"│
└───────────────────┬─────────────────────┘
                    │
            ┌───────┴───────┐
            │               │
          [NO]          [YES]
            │               │
            ▼               ▼
    ┌───────────┐   ┌───────────────┐
    │ "Thank    │   │ Handle or     │
    │ you.      │   │ explain       │
    │ Goodbye." │   │ limitations   │
    │ [END]     │   └───────────────┘
    └───────────┘
```

### Health Problem Sub-Flow

```
┌─────────────────────────────────────────┐
│ "Can you describe the health problem    │
│ you're experiencing?"                   │
│ [Allow natural description]             │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ "How long has this been going on?"      │
│ [Duration + progression if offered]     │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ "Is it getting better, worse, or        │
│ staying about the same?"                │
│ [If not already mentioned]              │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ "Have you tried anything to help        │
│ with this?"                             │
│ [Medications, home remedies, etc.]      │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ "Is there anything you're particularly  │
│ worried about?"                         │
│ [Concerns, fears]                       │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ "How would you like us to help?"        │
│ [Expectations]                          │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ "When are the best times to contact     │
│ you?"                                   │
│ [Availability]                          │
└───────────────────┬─────────────────────┘
                    │
                    ▼
            [Continue to Confirmation]
```

### Repeat Prescription Sub-Flow

```
┌─────────────────────────────────────────┐
│ "Which medication do you need?"         │
│ [Get name]                              │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ "And what strength is that?"            │
│ [Get dosage/strength]                   │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ "Do you need any other medications?"    │
│ [Loop if yes]                           │
└───────────────────┬─────────────────────┘
                    │
            ┌───────┴───────┐
            │               │
          [NO]           [YES]
            │               │
            │               └──→ [Loop back]
            │
            ▼
┌─────────────────────────────────────────┐
│ "Is there anything else you'd like to   │
│ tell us about your prescription?"       │
│ [Additional notes - optional]           │
└───────────────────┬─────────────────────┘
                    │
                    ▼
            [Continue to Confirmation]
```

### Edge Case Handling

| Scenario | Agent Response |
|----------|----------------|
| Unclear answer | "I didn't quite catch that. Could you say that again?" |
| Patient asks a question | Answer briefly if possible, or: "I can make a note of that question for the team." |
| Patient wants to skip | "That's fine, we can skip that. Moving on..." |
| Patient gives too much info | Extract relevant parts, don't interrupt |
| Patient corrects earlier info | "No problem, let me update that. So your [field] is [new value]?" |
| Patient gets frustrated | "I understand. Would you prefer to speak with a person? I can make a note for the team to call you back." |
| Patient mentions emergency symptoms | Immediately interrupt: "That sounds like it could be serious. Please hang up and call 999." |
| Patient asks for medical advice | "I'm not able to give medical advice, but I'll make sure a member of the clinical team reviews your request." |
| Background noise / unclear | "I'm having a little trouble hearing you. Could you repeat that?" |
| Patient speaks different language | "I'm sorry, I can only help in English at the moment. I'll make a note for the team." |

---

## 6. System Prompt Specification

### Prompt Structure

Following ElevenLabs best practices, the prompt uses clear sections with markdown headings.

```markdown
# Identity

You are an automated patient request assistant for a UK medical practice. Your name is not important - if asked, say you're the "automated patient request line." You help patients submit non-urgent requests to the practice team.

# Voice and Tone

- Speak in a warm, professional, and patient manner
- Use British English (favour, colour, organisation)
- Be concise but not rushed
- Sound human and natural, not robotic
- Use conversational fillers sparingly ("Right, let me just...", "Okay, so...")

# Goal

Collect patient intake information through natural conversation and submit a structured request to the practice team. You need to gather:

1. Patient identification (name, postcode, phone, contact preference)
2. Emergency confirmation
3. Request type (health problem or repeat prescription)
4. Request-specific details
5. Confirmation of collected information

# Conversation Flow

## Opening
Greet the caller and explain you'll help them submit a request.

## Patient Details
Collect these in order:
- First name
- Last name
- Postcode (format: letters, numbers, space, number, letters - like "SW1A 1AA")
- Phone number (mobile preferred)
- Contact preference (text, phone call, or either)

## Emergency Screening
CRITICAL: Before proceeding, confirm this is not a medical emergency. List serious symptoms (chest pain, difficulty breathing, severe bleeding, stroke signs) and direct to 999 if any apply. This step is important.

## Request Type
Ask what they need help with: health problem or repeat prescription.

## Health Problem Flow
If health problem, collect:
- Description of the problem (in their words)
- How long it's been going on
- Whether it's getting better, worse, or staying same
- What they've tried to help
- Any particular concerns
- How they'd like the team to help
- Best times to contact them

## Repeat Prescription Flow
If repeat prescription, collect:
- Medication name
- Strength/dosage
- Ask if they need any other medications (loop if yes)
- Any additional notes about the prescription

## Confirmation
Read back the key information:
- Name and postcode
- Request type
- Key details (problem summary or medication list)
Ask if everything is correct.

## Closing
Confirm the request is submitted. Remind them the team will be in touch during working hours. Ask if there's anything else. Say goodbye warmly.

# Guardrails

- NEVER provide medical advice, diagnosis, or treatment recommendations
- NEVER suggest medications or dosages
- ALWAYS direct to 999 if emergency symptoms are mentioned, even mid-conversation
- NEVER claim to be a doctor, nurse, or medical professional
- NEVER promise specific callback times
- NEVER access or claim to access patient medical records
- If caller becomes abusive, politely end the call
- If caller is clearly confused or distressed, suggest they call back with someone to help, or offer to note for urgent callback
- Do not make up information - if unsure, say you'll make a note for the team

# Data Format Rules

When recording information for the system:
- Names: As spoken, capitalised properly
- Postcode: Uppercase, with space (e.g., "SW1A 1AA")
- Phone: UK format with leading 0 (e.g., "07700 900123")
- Speak email addresses as "john dot smith at company dot com" but record as "john.smith@company.com"

# Examples

## Good opening
"Hello, you've reached the automated patient request line. I'll help you submit a request to the practice team. Could I start with your first name?"

## Good emergency screening
"Before we go any further, I just need to check - this isn't a medical emergency, is it? If you're having chest pain, difficulty breathing, severe bleeding, or signs of a stroke, please hang up and call 999 immediately. Can you confirm this isn't an emergency?"

## Handling a correction
Patient: "Actually, my postcode is E1 6AN, not E1 6AM"
Agent: "No problem, I've updated that. So your postcode is E1 6AN. Is that right?"

## Handling a question
Patient: "How long will it take for someone to call me back?"
Agent: "The team will review your request and get back to you during working hours, usually the same day. I can't promise an exact time, but I'll make sure your request is submitted. Now, could you tell me..."
```

### Prompt Token Count
Estimated: ~1,200 tokens (under 2,000 limit for optimal latency)

---

## 7. API Specifications

### Webhook Endpoint

**POST** `/api/webhooks/elevenlabs`

Receives post-call data from ElevenLabs.

#### Headers

| Header | Description |
|--------|-------------|
| `ElevenLabs-Signature` | HMAC signature for validation |
| `Content-Type` | `application/json` |

#### Signature Validation

```typescript
// ElevenLabs-Signature format: t=timestamp,v0=hash
// hash = HMAC-SHA256(timestamp + "." + body, secret)
```

#### Request Body

```typescript
interface ElevenLabsWebhook {
  type: "post_call_transcription";
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    status: "done" | "failed";
    transcript: Array<{
      role: "agent" | "user";
      message: string;
      time_in_call_secs: number;
    }>;
    metadata: {
      start_time_unix_secs: number;
      end_time_unix_secs: number;
      call_duration_secs: number;
      cost: number;
    };
    analysis: {
      call_successful: boolean;
      data_collected: {
        patient_first_name: string;
        patient_last_name: string;
        patient_postcode: string;
        patient_phone: string;
        preferred_contact: string;
        emergency_confirmed: boolean;
        request_type: string;
        // ... type-specific fields
      };
    };
  };
}
```

#### Response

```typescript
// Success
{ status: 200 }

// Error (will retry)
{ status: 500, body: { error: string } }
```

### Postcode Validation Tool (Optional)

**POST** `/api/tools/validate-postcode`

Real-time postcode validation during call.

#### Request Body

```typescript
{
  postcode: string;
}
```

#### Response

```typescript
{
  valid: boolean;
  formatted: string;  // Properly formatted if valid
  error?: string;     // If invalid
}
```

---

## 8. ElevenLabs Agent Configuration

### Agent Settings

| Setting | Value |
|---------|-------|
| Name | PrincetonAI-Medical-PhoneAgent |
| LLM | Claude Sonnet 4 |
| Language | English (UK) |
| Voice | TBD - UK female, professional |
| First Message | "Hello, you've reached the automated patient request line. I'll help you submit a request to the practice team. Could I start with your first name?" |

### Data Collection Schema

Configure in ElevenLabs to extract these fields in analysis:

```json
{
  "patient_first_name": {
    "type": "string",
    "description": "Patient's first name"
  },
  "patient_last_name": {
    "type": "string",
    "description": "Patient's last name"
  },
  "patient_postcode": {
    "type": "string",
    "description": "UK postcode, uppercase with space"
  },
  "patient_phone": {
    "type": "string",
    "description": "UK phone number"
  },
  "preferred_contact": {
    "type": "string",
    "enum": ["text", "phone", "both"],
    "description": "How patient prefers to be contacted"
  },
  "emergency_confirmed": {
    "type": "boolean",
    "description": "Patient confirmed not an emergency"
  },
  "request_type": {
    "type": "string",
    "enum": ["health_problem", "repeat_prescription"],
    "description": "Type of request"
  },
  "health_problem_description": {
    "type": "string",
    "description": "Description of health problem if applicable"
  },
  "health_problem_duration": {
    "type": "string",
    "description": "How long problem has been occurring"
  },
  "health_problem_progression": {
    "type": "string",
    "description": "Getting better, worse, or same"
  },
  "health_problem_tried": {
    "type": "string",
    "description": "Treatments patient has tried"
  },
  "health_problem_concerns": {
    "type": "string",
    "description": "Patient's specific concerns"
  },
  "health_problem_help_wanted": {
    "type": "string",
    "description": "How patient wants to be helped"
  },
  "best_contact_times": {
    "type": "string",
    "description": "When patient is available"
  },
  "medications_requested": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "strength": { "type": "string" }
      }
    },
    "description": "List of medications for repeat prescription"
  },
  "prescription_notes": {
    "type": "string",
    "description": "Additional notes about prescription"
  },
  "call_successful": {
    "type": "boolean",
    "description": "Whether intake was completed successfully"
  }
}
```

### Webhook Configuration

| Setting | Value |
|---------|-------|
| URL | `https://[your-vercel-domain]/api/webhooks/elevenlabs` |
| Type | post_call_transcription |
| Secret | Generated, stored in env |

---

## 9. Security & Compliance

### MVP Security Measures

| Measure | Implementation |
|---------|----------------|
| Webhook validation | HMAC-SHA256 signature verification |
| HTTPS | Enforced by Vercel |
| Environment variables | Secrets in Vercel, not in code |
| Database access | Supabase service role only for webhooks |
| Admin access | Protected route (basic for MVP) |

### Data Handling

| Data Type | Handling |
|-----------|----------|
| Test data | Synthetic only for development |
| Transcripts | Stored in Supabase, no long-term retention policy for MVP |
| Phone numbers | Stored for demo purposes only |

### Production Requirements (Post-MVP)

- [ ] NHS DSPT compliance
- [ ] EU data residency (ElevenLabs Enterprise)
- [ ] DPIA completion
- [ ] Formal data retention policy
- [ ] Patient consent flow
- [ ] Audit logging
- [ ] Access controls with authentication

---

## 10. Implementation Checklist

### Phase 1: Project Setup
- [ ] Initialize Next.js 15 project
- [ ] Configure TypeScript
- [ ] Set up Tailwind CSS
- [ ] Create project structure
- [ ] Set up environment variables template
- [ ] Initialize git repository

### Phase 2: Database
- [ ] Create Supabase project
- [ ] Run initial migration
- [ ] Configure RLS policies
- [ ] Set up service role access
- [ ] Test database connection

### Phase 3: Webhook Backend
- [ ] Create webhook route
- [ ] Implement HMAC validation
- [ ] Parse ElevenLabs payload
- [ ] Transform to database schema
- [ ] Insert into Supabase
- [ ] Add error logging

### Phase 4: ElevenLabs Configuration
- [ ] Create ElevenLabs account
- [ ] Select voice
- [ ] Write system prompt
- [ ] Configure data collection schema
- [ ] Set up post-call webhook
- [ ] Test in ElevenLabs playground

### Phase 5: Telephony
- [ ] Create Twilio account
- [ ] Purchase UK phone number
- [ ] Connect Twilio to ElevenLabs
- [ ] Test inbound call routing

### Phase 6: Admin Dashboard
- [ ] Create submissions list page
- [ ] Create submission detail page
- [ ] Display transcript
- [ ] Display extracted data
- [ ] Add status indicators

### Phase 7: Testing
- [ ] Test happy path (health problem)
- [ ] Test happy path (prescription)
- [ ] Test edge cases
- [ ] Test webhook reliability
- [ ] Review transcripts and tune prompt

### Phase 8: Deployment
- [ ] Deploy to Vercel
- [ ] Connect Supabase integration
- [ ] Update webhook URL
- [ ] Final end-to-end test
- [ ] Demo to client

---

## 11. Testing Plan

### Test Scenarios

#### Happy Path Tests

| ID | Scenario | Expected Outcome |
|----|----------|-----------------|
| HP-01 | Health problem, all fields provided | Complete submission with all data extracted |
| HP-02 | Repeat prescription, single medication | Complete submission with medication details |
| HP-03 | Repeat prescription, multiple medications | All medications captured in array |

#### Edge Case Tests

| ID | Scenario | Expected Outcome |
|----|----------|-----------------|
| EC-01 | Patient mentions emergency symptom | Agent directs to 999, call ends |
| EC-02 | Patient corrects postcode | Updated value captured correctly |
| EC-03 | Patient skips optional field | Null stored, conversation continues |
| EC-04 | Patient asks question | Brief answer, continues flow |
| EC-05 | Background noise, unclear audio | Agent asks for clarification |
| EC-06 | Patient provides unsupported request type | Agent explains limitations, offers to note for team |
| EC-07 | Call drops mid-conversation | Partial data saved with status "incomplete" |

#### System Tests

| ID | Scenario | Expected Outcome |
|----|----------|-----------------|
| SY-01 | Webhook receives valid payload | Data inserted into database |
| SY-02 | Webhook receives invalid signature | Request rejected with 401 |
| SY-03 | Database write fails | Error logged, webhook returns 500 for retry |
| SY-04 | Admin views submissions | List displays correctly |
| SY-05 | Admin views single submission | All data and transcript visible |

### Test Phone Numbers

For development, use test calls through ElevenLabs playground before connecting Twilio.

---

## 12. Deployment Guide

### Prerequisites

- Vercel account
- Supabase account
- ElevenLabs account (Pro plan minimum for testing)
- Twilio account
- GitHub repository

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# ElevenLabs
ELEVENLABS_API_KEY=xxx
ELEVENLABS_WEBHOOK_SECRET=xxx
ELEVENLABS_AGENT_ID=xxx

# Twilio (for reference, configured in ElevenLabs)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+44xxx
```

### Deployment Steps

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Initial MVP"
   git push origin main
   ```

2. **Connect Vercel**
   - Import GitHub repository
   - Configure environment variables
   - Deploy

3. **Connect Supabase Integration**
   - Install Supabase integration in Vercel
   - Link to Supabase project
   - Environment variables auto-sync

4. **Configure ElevenLabs Webhook**
   - Update webhook URL to Vercel domain
   - Test webhook delivery

5. **Connect Twilio**
   - In ElevenLabs dashboard, add Twilio phone number
   - Test inbound call

---

## 13. Cost Estimates

### Development Phase

| Service | Estimated Cost |
|---------|---------------|
| ElevenLabs Pro | $99/month |
| Twilio phone number | ~$1/month |
| Twilio minutes (testing) | ~$5-10 |
| Vercel | Free tier |
| Supabase | Free tier |
| **Total** | ~$110-120/month |

### Per-Call Costs (Production Estimate)

| Component | Cost |
|-----------|------|
| ElevenLabs (8 min avg) | $0.64-0.80 |
| Twilio inbound | ~$0.02 |
| **Total per call** | ~$0.66-0.82 |

### Volume Projections

| Monthly Calls | Estimated Cost |
|---------------|---------------|
| 100 | ~$70-85 |
| 500 | ~$330-410 |
| 1,000 | ~$660-820 |

---

## 14. Open Questions & Decisions

### Pending Decisions

| ID | Question | Options | Decision | Date |
|----|----------|---------|----------|------|
| D-01 | Voice selection | Various UK voices in ElevenLabs | TBD | - |
| D-02 | Admin authentication | None (MVP) / Basic Auth / Supabase Auth | TBD | - |
| D-03 | Practice name in greeting | Generic / Specific | TBD | - |
| D-04 | Maximum call duration | 10 min / 15 min / No limit | TBD | - |

### Open Questions

| ID | Question | Status |
|----|----------|--------|
| Q-01 | Does client have specific form they want matched exactly? | Answered - Accurx form |
| Q-02 | Are there UK-specific postcode validation requirements? | Research needed |
| Q-03 | Should we store call recordings? | Probably not for MVP |
| Q-04 | What's the expected call volume for pilot? | Need client input |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-09 | Initial document creation | PrincetonAI |

---

*This is a living document. Update as decisions are made and requirements evolve.*
