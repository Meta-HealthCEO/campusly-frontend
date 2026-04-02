# TODO 36 — WhatsApp Integration (South Africa Critical)

> **Priority:** HIGH — WhatsApp is THE communication channel in South Africa. 95%+ of parents have it. Email open rates are ~20%; WhatsApp is ~95%.

## Context
Campusly has notification infrastructure (queued via BullMQ) and a communication module with templates, but actual delivery is not wired to any channel. South African parents overwhelmingly prefer WhatsApp over email/SMS. This integration makes Campusly notifications actually reach parents.

---

## 1. WhatsApp Business API Integration

### 1a. Provider Setup
- Use WhatsApp Business API via provider: **Twilio** (established) or **360dialog** (SA-focused, cheaper)
- Alternative: **WATI.io** (purpose-built for WhatsApp business messaging, good SA support)
- Each school gets their own WhatsApp Business number (or shared with school name in message)
- Template messages pre-approved by Meta (required for outbound messaging)

### 1b. Message Templates (Meta-Approved)
Pre-register these template categories:
- **Fee reminder:** "Hi {{parent_name}}, a reminder that {{student_name}}'s school fees of R{{amount}} are due on {{date}}. Pay online: {{link}}"
- **Absence alert:** "Hi {{parent_name}}, {{student_name}} was marked absent from {{subject}} at {{time}} today. If this is unexpected, please contact the school."
- **Homework due:** "Hi {{parent_name}}, {{student_name}} has a {{subject}} assignment due on {{date}}: {{title}}"
- **Results available:** "Hi {{parent_name}}, {{student_name}}'s {{assessment}} results are now available. View: {{link}}"
- **Event reminder:** "Reminder: {{event_name}} is on {{date}} at {{venue}}. {{student_name}} is registered."
- **General announcement:** "{{school_name}} announcement: {{message}}"
- **Transport alert:** "{{student_name}} has boarded the school bus at {{time}}."
- **Emergency:** "URGENT from {{school_name}}: {{message}}"

### 1c. Two-Way Messaging
- Parents can reply to WhatsApp messages
- Replies routed to teacher/admin inbox in Campusly
- Auto-responses for common queries: "Type BALANCE to check fee balance", "Type ABSENT to report an absence"
- Keyword routing: balance, absent, fees, events, homework

---

## 2. Notification Channel Wiring

### 2a. Connect to Existing Notification System
- `notification-dispatch.job.ts` already exists — wire WhatsApp as a delivery channel
- Check parent's preferred channel (WhatsApp > SMS > Email > In-App)
- Fallback chain: try WhatsApp first, fall back to SMS if not delivered in 30min, then email

### 2b. Message Queue & Delivery Tracking
- Track delivery status: sent, delivered, read, failed
- Retry logic for failed messages
- Rate limiting per school to prevent spam
- Delivery report dashboard for admins

### 2c. Opt-In/Opt-Out Management
- POPIA compliant: parents must opt in to WhatsApp notifications
- Easy opt-out: reply STOP to unsubscribe
- Manage preferences per notification type
- Re-opt-in capability

---

## 3. Bulk Communication via WhatsApp

### 3a. Class/Grade Broadcasts
- Teacher/admin selects recipient group (class, grade, all parents)
- Uses approved template with personalised fields
- Scheduled sending (e.g., fee reminders on 1st of month)
- Delivery report with read receipts

### 3b. Emergency Broadcasting
- Priority queue for emergency messages
- Bypass quiet hours for urgent alerts
- Confirmation of delivery to all parents
- Escalation if not delivered within 15 minutes (fallback to SMS + phone call trigger)

---

## 4. WhatsApp Chatbot (Phase 2)

### 4a. Parent Self-Service Bot
- "Type BALANCE" → Returns fee balance
- "Type ATTENDANCE" → Returns this week's attendance
- "Type HOMEWORK" → Returns pending homework
- "Type RESULTS" → Returns latest results
- "Type MENU" → Shows all options
- Powered by simple keyword matching (not AI — fast and reliable)

### 4b. AI-Enhanced Bot (Phase 3)
- Natural language understanding for parent queries
- "How did Thabo do in his maths test?" → Looks up results and responds
- "Is there school tomorrow?" → Checks calendar
- Powered by AI tutor backend (reuse #35 infrastructure)

---

## Data Models

```typescript
interface WhatsAppConfig {
  schoolId: string;
  provider: 'twilio' | '360dialog' | 'wati';
  apiKey: string;
  phoneNumber: string;
  businessAccountId: string;
  templateIds: Record<string, string>; // templateType → approved template ID
  enabled: boolean;
  lastVerifiedAt: Date;
}

interface WhatsAppMessage {
  schoolId: string;
  recipientPhone: string;
  recipientName: string;
  templateType: string;
  templateParams: Record<string, string>;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  externalId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
}

interface WhatsAppOptIn {
  parentId: string;
  schoolId: string;
  phoneNumber: string;
  optedIn: boolean;
  optInDate?: Date;
  optOutDate?: Date;
  preferredLanguage: 'en' | 'af' | 'zu' | 'xh';
}
```

## API Endpoints
- `POST /api/whatsapp/config` — Configure WhatsApp for school
- `GET /api/whatsapp/config` — Get WhatsApp config
- `POST /api/whatsapp/send` — Send single message
- `POST /api/whatsapp/broadcast` — Send to group
- `POST /api/whatsapp/webhook` — Receive delivery reports + replies
- `GET /api/whatsapp/delivery-report` — Delivery analytics
- `POST /api/whatsapp/opt-in` — Record opt-in
- `POST /api/whatsapp/opt-out` — Record opt-out

## Frontend Pages
- `/admin/settings/whatsapp` — WhatsApp setup and configuration
- Enhanced `/admin/communication` — Add WhatsApp as channel option
- Enhanced notification preferences — WhatsApp toggle per notification type

## Revenue Model
- WhatsApp messaging is a **usage-based bolt-on**
- Free tier: 100 messages/month (enough for small school alerts)
- Standard: 1,000 messages/month (R150/month)
- Premium: 10,000 messages/month (R500/month)
- Enterprise: Unlimited (R1,500/month)
- Emergency broadcasts always included
