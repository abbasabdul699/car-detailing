import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import env from './env'

export const connection = new IORedis(env.REDIS_URL)

export const queues = {
  outreach: new Queue('outreach', { connection }),
  followup: new Queue('followup', { connection }),
  review:   new Queue('review',   { connection })
}

export { Worker, QueueEvents }
