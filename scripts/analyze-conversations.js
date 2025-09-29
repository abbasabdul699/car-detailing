const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Analyze conversation patterns to identify successful booking conversions
async function analyzeConversations() {
  console.log('🔍 Analyzing conversation patterns...')
  
  try {
    // Get all conversations with their messages
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      take: 50 // Analyze last 50 conversations
    })
    
    console.log(`📊 Found ${conversations.length} conversations to analyze`)
    
    // Analyze conversation patterns
    const analysis = {
      totalConversations: conversations.length,
      successfulBookings: 0,
      averageMessageCount: 0,
      commonDropOffPoints: [],
      successfulPatterns: [],
      failedPatterns: [],
      servicePreferences: {},
      timePatterns: {},
      customerBehavior: {}
    }
    
    let totalMessages = 0
    const messageCounts = []
    
    for (const conversation of conversations) {
      const messages = conversation.messages
      totalMessages += messages.length
      messageCounts.push(messages.length)
      
      // Check if this conversation led to a booking
      const hasBooking = messages.some(msg => 
        msg.direction === 'outbound' && 
        (msg.content.includes('booking confirmation') || 
         msg.content.includes('appointment') ||
         msg.content.includes('calendar'))
      )
      
      if (hasBooking) {
        analysis.successfulBookings++
        analysis.successfulPatterns.push(analyzeSuccessfulConversation(messages))
      } else {
        analysis.failedPatterns.push(analyzeFailedConversation(messages))
      }
      
      // Analyze service preferences
      const serviceMentions = extractServiceMentions(messages)
      serviceMentions.forEach(service => {
        analysis.servicePreferences[service] = (analysis.servicePreferences[service] || 0) + 1
      })
      
      // Analyze time patterns
      const firstMessage = messages[0]
      if (firstMessage) {
        const hour = firstMessage.createdAt.getHours()
        analysis.timePatterns[hour] = (analysis.timePatterns[hour] || 0) + 1
      }
    }
    
    analysis.averageMessageCount = totalMessages / conversations.length
    
    // Find common drop-off points
    analysis.commonDropOffPoints = findCommonDropOffPoints(conversations)
    
    console.log('\n📈 CONVERSATION ANALYSIS RESULTS:')
    console.log('=====================================')
    console.log(`Total Conversations: ${analysis.totalConversations}`)
    console.log(`Successful Bookings: ${analysis.successfulBookings}`)
    console.log(`Booking Conversion Rate: ${((analysis.successfulBookings / analysis.totalConversations) * 100).toFixed(1)}%`)
    console.log(`Average Messages per Conversation: ${analysis.averageMessageCount.toFixed(1)}`)
    
    console.log('\n🎯 SERVICE PREFERENCES:')
    Object.entries(analysis.servicePreferences)
      .sort(([,a], [,b]) => b - a)
      .forEach(([service, count]) => {
        console.log(`  ${service}: ${count} mentions`)
      })
    
    console.log('\n⏰ PEAK HOURS:')
    Object.entries(analysis.timePatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([hour, count]) => {
        console.log(`  ${hour}:00 - ${count} conversations`)
      })
    
    console.log('\n✅ SUCCESSFUL PATTERNS:')
    if (analysis.successfulPatterns.length > 0) {
      const topPatterns = getTopPatterns(analysis.successfulPatterns)
      topPatterns.forEach((pattern, index) => {
        console.log(`  ${index + 1}. ${pattern.description} (${pattern.count} occurrences)`)
      })
    }
    
    console.log('\n❌ COMMON DROP-OFF POINTS:')
    analysis.commonDropOffPoints.forEach((point, index) => {
      console.log(`  ${index + 1}. ${point.description} (${point.frequency}% of failed conversations)`)
    })
    
    // Generate prompt optimization recommendations
    const recommendations = generatePromptRecommendations(analysis)
    console.log('\n🚀 PROMPT OPTIMIZATION RECOMMENDATIONS:')
    console.log('==========================================')
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.category}:`)
      console.log(`   ${rec.recommendation}`)
      console.log(`   Impact: ${rec.impact}`)
    })
    
    return analysis
    
  } catch (error) {
    console.error('Error analyzing conversations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function analyzeSuccessfulConversation(messages) {
  const inboundMessages = messages.filter(m => m.direction === 'inbound')
  const outboundMessages = messages.filter(m => m.direction === 'outbound')
  
  return {
    messageCount: messages.length,
    conversationDuration: messages.length > 0 ? 
      new Date(messages[messages.length - 1].createdAt) - new Date(messages[0].createdAt) : 0,
    customerEngagement: inboundMessages.length,
    aiResponsiveness: outboundMessages.length,
    hasAddress: messages.some(m => m.content.match(/\d+\s+\w+\s+(street|st|avenue|ave|road|rd)/i)),
    hasVehicle: messages.some(m => m.content.match(/\d{4}\s+\w+/i)),
    hasService: messages.some(m => m.content.match(/detail|wash|clean|coating/i)),
    hasDate: messages.some(m => m.content.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today/i)),
    hasTime: messages.some(m => m.content.match(/\d{1,2}\s*(am|pm)/i))
  }
}

function analyzeFailedConversation(messages) {
  const lastInboundMessage = messages.filter(m => m.direction === 'inbound').pop()
  const lastOutboundMessage = messages.filter(m => m.direction === 'outbound').pop()
  
  return {
    messageCount: messages.length,
    lastCustomerMessage: lastInboundMessage?.content || '',
    lastAiResponse: lastOutboundMessage?.content || '',
    conversationEnded: lastInboundMessage ? 
      new Date(lastInboundMessage.createdAt) > new Date(lastOutboundMessage?.createdAt || 0) : false
  }
}

function extractServiceMentions(messages) {
  const services = []
  const serviceKeywords = ['detail', 'wash', 'clean', 'coating', 'wax', 'polish', 'interior', 'exterior', 'full']
  
  messages.forEach(msg => {
    serviceKeywords.forEach(keyword => {
      if (msg.content.toLowerCase().includes(keyword)) {
        services.push(keyword)
      }
    })
  })
  
  return [...new Set(services)] // Remove duplicates
}

function findCommonDropOffPoints(conversations) {
  const dropOffPoints = {}
  
  conversations.forEach(conversation => {
    const messages = conversation.messages
    const hasBooking = messages.some(msg => 
      msg.direction === 'outbound' && 
      (msg.content.includes('booking confirmation') || 
       msg.content.includes('appointment'))
    )
    
    if (!hasBooking && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      const lastInboundMessage = messages.filter(m => m.direction === 'inbound').pop()
      
      if (lastInboundMessage) {
        const content = lastInboundMessage.content.toLowerCase()
        let dropOffReason = 'Unknown'
        
        if (content.includes('email') || content.includes('@')) {
          dropOffReason = 'Email request'
        } else if (content.includes('address') || content.includes('street')) {
          dropOffReason = 'Address request'
        } else if (content.includes('name') || content.includes('call me')) {
          dropOffReason = 'Name request'
        } else if (content.includes('price') || content.includes('cost') || content.includes('how much')) {
          dropOffReason = 'Pricing question'
        } else if (content.includes('when') || content.includes('time') || content.includes('available')) {
          dropOffReason = 'Scheduling question'
        }
        
        dropOffPoints[dropOffReason] = (dropOffPoints[dropOffReason] || 0) + 1
      }
    }
  })
  
  const totalFailed = Object.values(dropOffPoints).reduce((sum, count) => sum + count, 0)
  
  return Object.entries(dropOffPoints)
    .map(([reason, count]) => ({
      description: reason,
      frequency: ((count / totalFailed) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.frequency) - parseFloat(a.frequency))
}

function getTopPatterns(successfulPatterns) {
  const patternCounts = {}
  
  successfulPatterns.forEach(pattern => {
    const key = `${pattern.hasAddress}-${pattern.hasVehicle}-${pattern.hasService}-${pattern.hasDate}`
    patternCounts[key] = (patternCounts[key] || 0) + 1
  })
  
  return Object.entries(patternCounts)
    .map(([pattern, count]) => ({
      description: `Complete info collection (Address: ${pattern.includes('true') ? 'Yes' : 'No'}, Vehicle: Yes, Service: Yes, Date: Yes)`,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
}

function generatePromptRecommendations(analysis) {
  const recommendations = []
  
  // Booking conversion rate analysis
  const conversionRate = (analysis.successfulBookings / analysis.totalConversations) * 100
  
  if (conversionRate < 30) {
    recommendations.push({
      category: 'Booking Conversion',
      recommendation: 'Add more direct booking prompts and reduce friction in the booking process',
      impact: 'High - Could increase conversion by 20-30%'
    })
  }
  
  // Service preferences
  const topService = Object.entries(analysis.servicePreferences)[0]
  if (topService) {
    recommendations.push({
      category: 'Service Focus',
      recommendation: `Lead with "${topService[0]}" services since it's mentioned in ${topService[1]} conversations`,
      impact: 'Medium - Better customer engagement'
    })
  }
  
  // Drop-off points
  if (analysis.commonDropOffPoints.length > 0) {
    const topDropOff = analysis.commonDropOffPoints[0]
    recommendations.push({
      category: 'Drop-off Prevention',
      recommendation: `Address "${topDropOff.description}" earlier in the conversation to prevent ${topDropOff.frequency}% of drop-offs`,
      impact: 'High - Could reduce customer loss significantly'
    })
  }
  
  // Message count optimization
  if (analysis.averageMessageCount > 10) {
    recommendations.push({
      category: 'Conversation Efficiency',
      recommendation: 'Streamline the booking process to reduce average message count from 10+ to 6-8 messages',
      impact: 'Medium - Better user experience'
    })
  }
  
  return recommendations
}

// Run the analysis
analyzeConversations()
  .then(() => {
    console.log('\n✅ Analysis complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Analysis failed:', error)
    process.exit(1)
  })
