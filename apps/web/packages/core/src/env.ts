import 'dotenv/config'
import assert from 'node:assert'

const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
  TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  TWILIO_WEBHOOK_AUTH_SECRET: process.env.TWILIO_WEBHOOK_AUTH_SECRET!,
  APP_URL: process.env.APP_URL || 'http://localhost:3000'
}

Object.entries(env).forEach(([k,v])=> assert(v, `${k} missing`))
export default env
