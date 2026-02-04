# CODEX Reference (ReevaCar CRM)

## Project Overview
ReevaCar is a Next.js CRM built for mobile car detailers. It supports detailer onboarding and profiles, booking and calendar management, customer messaging (SMS/voice), reviews, and subscriptions/billing. The app serves multiple roles: detailers (primary users), admins (management), and customers (booking and messaging touchpoints).

## Tech Stack
- Next.js App Router, React 19, TypeScript
- Tailwind CSS (with shadcn/ui config)
- Prisma ORM with MongoDB
- Mongoose + native MongoDB client (limited usage)
- NextAuth (credentials providers for admin + detailer)
- Stripe, Twilio (SMS/voice), Google APIs (Maps/Calendar), Instagram, AWS S3

## App Structure
- `app/` — App Router pages and layout.
- `app/api/` — Server routes grouped by domain (auth, detailer, bookings, webhooks, cron, etc.).
- `app/detailer-dashboard/` — Detailer CRM UI (calendar, customers, messages, resources, subscription).
- `app/admin/` — Admin UI.
- `app/components/` — Shared UI components and providers.
- `lib/` — Server utilities (db, integrations, booking/calendar helpers, etc.).
- `prisma/` — Prisma schema and seed.
- `scripts/` + `app/scripts/` — Ops and data migration helpers.
- `public/` — Static assets.

## Auth & Session
- NextAuth config: `app/api/auth/[...nextauth]/route.ts`.
- Two credentials providers:
  - Admin: matches `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
  - Detailer: checks Prisma detailer record and bcrypt password.
- JWT session strategy (30-day max age) with role-based redirect:
  - Detailer -> `/detailer-dashboard/calendar`
  - Admin -> `/admin`
- Middleware protects `/admin/*` and `/detailer-dashboard/*`:
  - `middleware.ts` uses `next-auth/middleware` and logs cookie presence in dev.
- Detailer sessions use a custom cookie name (`next-auth.detailer.session-token`).

## Data Layer
### Prisma (MongoDB)
Defined in `prisma/schema.prisma` (MongoDB datasource). Core models:
- **Detailer** (business profile + integrations + subscription fields)
- **Customer**, **CustomerSnapshot**
- **Conversation**, **Message**
- **Booking**, **Event**, **Resource**, **Employee**
- **Services**, **Bundles**, **Reviews**, **Notifications**
- **SubscriptionPlan**, **Subscription**, **Invoice**, **Charge**
- **ScheduledReview**

### Mongoose / MongoDB Client (limited)
- `app/models/*` define Mongoose models.
- `lib/dbConnect.ts` and `lib/mongodb.ts` handle Mongoose and native driver connections.
- Expect a mixed data access layer; prefer Prisma unless a file explicitly uses Mongoose.

## Core Features & Flows
- Detailer onboarding/profile management, including business hours and portfolio images.
- Booking + calendar: availability computation, event sync, scheduling resources (bays/vans).
- Conversations: SMS/voice workflows, conversation state, customer snapshots.
- Reviews: capture/reply and scheduled review links.
- Subscription/billing: Stripe plans and customer portal.

## Integrations
- **Stripe**: subscriptions, invoices, webhooks.
- **Twilio**: SMS/voice, webhooks, AI concierge workflows.
- **Google**: Maps (autocomplete + map rendering), Calendar sync.
- **Instagram**: OAuth + DM handling.
- **AWS S3**: image and media storage.
- **OpenAI / ElevenLabs**: voice/AI flows.

## API Areas (Grouped)
`app/api/*` is organized by domain. Common groups:
- **Auth**: `auth`, `auth-detailer`, `auth-admin`, password reset, integrations.
- **Detailer**: bookings, customers, resources, profile, messages, calendar sync.
- **Bookings & Availability**: `bookings`, `availability`, `events`, `calendar`.
- **Billing**: `subscription`, `create-subscription`, `webhooks/stripe`.
- **Messaging/AI**: `ai`, `voice`, `webhooks/twilio`, `vapi`.
- **Integrations**: `google-reviews`, `places`, `instagram`.
- **Cron/Jobs**: `cron/*` for reminders, trial processing, summaries.
- **Admin**: `admin/*` for detailer management and SMS admin actions.

## Environment Variables
Consolidated from `process.env` usage:

### Core / Runtime
- `NODE_ENV`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `INTERNAL_API_BASE`
- `VERCEL_URL`
- `VERCEL_ENV`

### Database
- `DATABASE_URL` (Prisma MongoDB)
- `MONGODB_URI` (Mongoose/native MongoDB)

### Auth / Admin
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

### Stripe
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_FIRST_COHORT_COUPON_ID`

### Twilio
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_SEND_DISABLED`
- `TWILIO_FORCE_SMS`

### Google
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Instagram
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`

### AWS S3
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_BUCKET_NAME`

### Email
- `SENDGRID_API_KEY`
- `EMAIL_SERVER_HOST`
- `EMAIL_SERVER_PORT`
- `EMAIL_SERVER_USER`
- `EMAIL_SERVER_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_USER`
- `EMAIL_PASS`

### AI / Voice
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

### Cron
- `CRON_SECRET`

## Dev Scripts & Ops Notes
`package.json` scripts:
- `dev` / `dev:mobile`: runs `scripts/dev-mobile.js` for mobile testing.
- `dev:monitor`: IP monitor.
- `build`: `prisma generate && next build`
- `postbuild`: `next-sitemap`
- `start`, `lint`
- `seed`: `ts-node prisma/seed.ts`
- Image migration helpers: `migrate-images`, `update-urls`, `check-urls`, `update-all-urls`, `upload-images`

## Conventions & Gotchas
- Mixed DB access (Prisma + Mongoose/MongoClient). Confirm which is used per file.
- NextAuth uses multiple providers and custom cookie names for detailer/admin flows.
- `next.config.ts` allows external image domains (S3, Maps).
- `experimental.serverActions.bodySizeLimit` set to `2mb`.
- In dev, middleware logs auth cookies for `/admin/*` and `/detailer-dashboard/*`.
