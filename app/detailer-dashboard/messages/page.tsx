'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  twilioSid?: string;
  status: string;
  createdAt: string;
}

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface Conversation {
  id: string;
  customerPhone: string;
  customerName?: string;
  status: string;
  lastMessageAt: string;
  messages: Message[];
  customer?: Customer;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConversationList, setShowConversationList] = useState(true); // For mobile view

  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations();
    }
  }, [session?.user?.id]);

  // Add a refresh button or auto-refresh
  const refreshConversations = () => {
    fetchConversations();
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/detailer/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/detailer/conversations?conversationId=${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const conversation = await response.json();
      setSelectedConversation(conversation);
      // Hide conversation list on mobile when a conversation is selected
      setShowConversationList(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    }
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    setSelectedConversation(null);
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getLastMessagePreview = (messages: Message[]) => {
    if (messages.length === 0) return 'No messages';
    const lastMessage = messages[0];
    return lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + '...'
      : lastMessage.content;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className={`${showConversationList ? 'flex' : 'hidden'} md:flex w-full md:w-1/3 border-r border-gray-200 flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-500 mt-1">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={refreshConversations}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh conversations"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Customer messages will appear here</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => fetchConversationMessages(conversation.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-green-50 border-green-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {conversation.customerName ? (
                      <>
                        <h3 className="font-semibold text-gray-900 truncate text-base">
                          {conversation.customerName}
                        </h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {formatPhoneNumber(conversation.customerPhone)}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-900 truncate text-base">
                          {formatPhoneNumber(conversation.customerPhone)}
                        </h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          No name provided
                        </p>
                      </>
                    )}
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {getLastMessagePreview(conversation.messages)}
                    </p>
                  </div>
                  <div className="ml-2 text-xs text-gray-400">
                    {formatMessageTime(conversation.lastMessageAt)}
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    conversation.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {conversation.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Messages View */}
      <div className={`${!showConversationList ? 'flex' : 'hidden'} md:flex flex-1 flex flex-col`}>
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Back to conversations"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    {selectedConversation.customerName ? (
                      <>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedConversation.customerName}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {formatPhoneNumber(selectedConversation.customerPhone)}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {formatPhoneNumber(selectedConversation.customerPhone)}
                        </h2>
                        <p className="text-sm text-gray-500">
                          Customer name not provided yet
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Last active: {formatMessageTime(selectedConversation.lastMessageAt)}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.direction === 'outbound'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`text-xs mt-1 ${
                      message.direction === 'outbound' ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      {formatMessageTime(message.createdAt)}
                      {message.direction === 'outbound' && (
                        <span className="ml-2">
                          {message.status === 'sent' && '✓'}
                          {message.status === 'delivered' && '✓✓'}
                          {message.status === 'failed' && '✗'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the list to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
