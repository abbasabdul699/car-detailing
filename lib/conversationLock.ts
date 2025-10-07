/**
 * Simple conversation locking mechanism to prevent concurrent SMS processing
 * Uses in-memory locks with TTL to avoid race conditions
 */

interface LockEntry {
  lockedAt: Date;
  ttl: number; // milliseconds
}

// In-memory lock store (in production, use Redis)
const locks = new Map<string, LockEntry>();

/**
 * Acquire a lock for a conversation
 */
export function acquireLock(conversationId: string, ttlMs: number = 10000): boolean {
  const now = new Date();
  const existingLock = locks.get(conversationId);
  
  // Check if lock exists and is still valid
  if (existingLock) {
    const lockAge = now.getTime() - existingLock.lockedAt.getTime();
    if (lockAge < existingLock.ttl) {
      console.log(`Lock already held for conversation ${conversationId}, age: ${lockAge}ms`);
      return false; // Lock is still valid
    } else {
      // Lock has expired, remove it
      locks.delete(conversationId);
      console.log(`Expired lock removed for conversation ${conversationId}`);
    }
  }
  
  // Acquire new lock
  locks.set(conversationId, {
    lockedAt: now,
    ttl: ttlMs
  });
  
  console.log(`Lock acquired for conversation ${conversationId}, TTL: ${ttlMs}ms`);
  return true;
}

/**
 * Release a lock for a conversation
 */
export function releaseLock(conversationId: string): void {
  const removed = locks.delete(conversationId);
  if (removed) {
    console.log(`Lock released for conversation ${conversationId}`);
  } else {
    console.log(`No lock found to release for conversation ${conversationId}`);
  }
}

/**
 * Check if a conversation is locked
 */
export function isLocked(conversationId: string): boolean {
  const lock = locks.get(conversationId);
  if (!lock) return false;
  
  const now = new Date();
  const lockAge = now.getTime() - lock.lockedAt.getTime();
  
  if (lockAge >= lock.ttl) {
    // Lock has expired, remove it
    locks.delete(conversationId);
    return false;
  }
  
  return true;
}

/**
 * Clean up expired locks (call periodically)
 */
export function cleanupExpiredLocks(): void {
  const now = new Date();
  let cleaned = 0;
  
  for (const [conversationId, lock] of locks.entries()) {
    const lockAge = now.getTime() - lock.lockedAt.getTime();
    if (lockAge >= lock.ttl) {
      locks.delete(conversationId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired locks`);
  }
}

/**
 * Get lock statistics
 */
export function getLockStats(): { active: number; total: number } {
  const now = new Date();
  let active = 0;
  
  for (const lock of locks.values()) {
    const lockAge = now.getTime() - lock.lockedAt.getTime();
    if (lockAge < lock.ttl) {
      active++;
    }
  }
  
  return { active, total: locks.size };
}
