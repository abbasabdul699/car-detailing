# SMS Bot Fixes Summary

## Issues Fixed

### 1. Timezone Math Problems ✅
**Problem**: Bot was offering slots like "4:00–6:00 AM" while business hours were 8:00 AM–6:00 PM. This happened when building slots in UTC and rendering them as local time, shifting everything 4 hours earlier.

**Solution**: 
- Created `timeUtilsV2.ts` using Luxon for proper timezone handling
- All time operations now use the detailer's canonical timezone (`America/New_York`)
- Convert to UTC only at persistence/comparison boundaries
- Business hours and slots are generated in the detailer's timezone first

**Files Changed**:
- `lib/timeUtilsV2.ts` - New Luxon-based time utilities
- `lib/slotComputationV2.ts` - Improved slot computation with timezone handling
- `app/api/bookings/create/route.ts` - Updated to use new timezone utilities

### 2. Missing Google Calendar Integration ✅
**Problem**: Bot was unaware of Google Calendar events, offering times that were busy on Google Calendar, and repeating long lists because it didn't "learn" that proposed times were rejected.

**Solution**:
- Implemented Google FreeBusy API integration in `slotComputationV2.ts`
- FreeBusy API is much faster than listing events
- Merges Google Calendar busy times with Reeva bookings before offering slots
- Properly handles timezone conversion for Google Calendar queries

**Files Changed**:
- `lib/slotComputationV2.ts` - Added `getGoogleCalendarBusyTimes()` function
- Uses `google.calendar.freebusy.query()` for efficient busy time checking

### 3. Booking API Failures ✅
**Problem**: Booking API was returning HTML error pages while code tried to parse JSON, causing "Unexpected token '<'" errors and retry loops.

**Solution**:
- Created robust booking client with content-type guards
- Added idempotency keys to prevent duplicate bookings
- Proper error handling with exponential backoff retry logic
- Never assumes JSON response - always checks content-type first

**Files Changed**:
- `lib/bookingClient.ts` - New robust booking client
- `app/api/webhooks/twilio/sms-fast/route.ts` - Updated to use new booking client

### 4. SMS Spam Prevention ✅
**Problem**: Bot was sending duplicate availability lists and getting stuck in retry loops.

**Solution**:
- Implemented conversation state machine to track booking flow
- Added MessageSid deduplication to prevent processing same message twice
- Added conversation locking to prevent concurrent processing
- Added throttling to prevent sending same availability list within 5 minutes

**Files Changed**:
- `lib/conversationState.ts` - Conversation state machine
- `lib/conversationLock.ts` - Simple locking mechanism
- `app/api/webhooks/twilio/sms-fast/route.ts` - Integrated state machine and locking

## New Architecture

### State Machine Flow
```
idle → awaiting_date → awaiting_time → awaiting_confirm → confirmed
  ↑                                                          ↓
  ←—————————————————— error ←———————————————————————————————
```

### Conversation States
- **idle**: Initial state, asks for date
- **awaiting_date**: Waiting for user to specify date, shows available slots
- **awaiting_time**: Waiting for user to pick specific time slot
- **awaiting_confirm**: Waiting for user confirmation to book
- **confirmed**: Booking completed
- **error**: Error state, can reset to idle

### Key Features
1. **Timezone Safety**: All times handled in detailer's timezone, converted to UTC only at boundaries
2. **Google Calendar Integration**: Uses FreeBusy API for efficient busy time checking
3. **Robust Booking**: Content-type guards, idempotency, retry logic with exponential backoff
4. **Spam Prevention**: State machine, deduplication, locking, throttling
5. **Error Recovery**: Graceful fallbacks and proper error messages

## Files Created/Modified

### New Files
- `lib/slotComputationV2.ts` - Improved slot computation with Google FreeBusy
- `lib/timeUtilsV2.ts` - Luxon-based timezone utilities
- `lib/bookingClient.ts` - Robust booking API client
- `lib/conversationState.ts` - Conversation state machine
- `lib/conversationLock.ts` - Simple conversation locking
- `SMS_BOT_FIXES_SUMMARY.md` - This summary

### Modified Files
- `app/api/webhooks/twilio/sms-fast/route.ts` - Integrated all improvements
- `app/api/bookings/create/route.ts` - Updated to use new timezone utilities

### Dependencies Added
- `luxon` - Modern JavaScript date/time library
- `@types/luxon` - TypeScript definitions for Luxon

## Testing Recommendations

1. **Timezone Testing**: Test with different timezones to ensure slots show correct local times
2. **Google Calendar Integration**: Test with connected Google Calendar to ensure busy times are respected
3. **Booking Robustness**: Test with network failures, invalid responses to ensure proper error handling
4. **State Machine**: Test conversation flow to ensure proper state transitions
5. **Spam Prevention**: Test rapid messages to ensure deduplication and locking work

## Deployment Notes

1. Install new dependencies: `pnpm add luxon @types/luxon`
2. The new code is backward compatible - existing functionality remains unchanged
3. Conversation state machine only activates for booking-related messages
4. All improvements are opt-in and have fallbacks to existing behavior

## Monitoring

Key metrics to monitor:
- Booking success rate
- SMS response times
- Duplicate message detection rate
- Conversation lock acquisition rate
- Google Calendar API response times

## Future Improvements

1. **Redis Integration**: Replace in-memory locks with Redis for production scalability
2. **Advanced State Machine**: Add more states for complex booking scenarios
3. **Google Calendar Webhooks**: Real-time updates when calendar events change
4. **Analytics**: Track conversation flow metrics and conversion rates
5. **A/B Testing**: Test different conversation flows and responses
