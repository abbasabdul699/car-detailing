'use client'
import { useState, useEffect } from 'react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: string
}

export default function TestAIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('greeting')
  const [context, setContext] = useState<any>({
    businessId: '689e47ec6df928b450daa9c0',
    customerName: '',
    customerPhone: '',
    conversationStarted: false
  })

  // Auto-greet when page loads
  useEffect(() => {
    const sendGreeting = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/ai/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Hello', 
            stage: 'greeting', 
            context: { ...context, conversationStarted: false } 
          })
        })

        const data = await response.json()

        const aiMessage: Message = {
          id: Date.now().toString(),
          text: data.response,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString()
        }

        setMessages([aiMessage])
        
        if (data.nextStage) {
          setStage(data.nextStage)
        }
        
        if (data.context) {
          setContext(prev => ({ ...prev, ...data.context }))
        }

      } catch (error) {
        console.error('Error sending greeting:', error)
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: "Hello! I'm your AI car detailing assistant. How can I help you today?",
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString()
        }
        setMessages([errorMessage])
      } finally {
        setLoading(false)
      }
    }

    // Only send greeting if no messages exist
    if (messages.length === 0) {
      sendGreeting()
    }
  }, []) // Empty dependency array means this runs once on mount

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, stage, context })
      })

      const data = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      }

      setMessages(prev => [...prev, aiMessage])
      
      if (data.nextStage) {
        setStage(data.nextStage)
      }
      
      if (data.context) {
        setContext(prev => ({ ...prev, ...data.context }))
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble right now. Please try again.",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Arian - Car Detailing Assistant</h1>
          <p className="text-sm text-gray-600 mt-1">
            Professional Concierge • Current Stage: {stage.toUpperCase()}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <p className="text-sm">Typing...</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
