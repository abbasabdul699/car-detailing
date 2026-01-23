'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatPhoneDisplay } from '@/lib/phone';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  twilioSid?: string;
  status: string;
  channel?: string;
  vapiCallId?: string;
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
  channel?: string;
  metadata?: any;
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
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previousMessageCounts, setPreviousMessageCounts] = useState<{[key: string]: number}>({});
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'phone'>('all');

  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations();
      
      // Auto-refresh conversations every 5 seconds
      const conversationsInterval = setInterval(() => {
        fetchConversations(true);
      }, 5000);
      
      return () => clearInterval(conversationsInterval);
    }
  }, [session?.user?.id]);

  // Auto-refresh selected conversation messages
  useEffect(() => {
    if (selectedConversation) {
      // Auto-refresh messages every 3 seconds when a conversation is selected
      const messagesInterval = setInterval(() => {
        fetchConversationMessages(selectedConversation.id);
      }, 3000);
      
      return () => clearInterval(messagesInterval);
    }
  }, [selectedConversation]);

  // Add a refresh button or auto-refresh
  const refreshConversations = () => {
    fetchConversations();
  };

  const fetchConversations = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await fetch('/api/detailer/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      
      // Check for new messages and update counts
      const newCounts: {[key: string]: number} = {};
      let hasNew = false;
      
      data.forEach((conv: Conversation) => {
        newCounts[conv.id] = conv.messages.length;
        
        // Check if this conversation has new messages
        if (previousMessageCounts[conv.id] && 
            previousMessageCounts[conv.id] < conv.messages.length) {
          hasNew = true;
        }
      });
      
      if (hasNew && Object.keys(previousMessageCounts).length > 0) {
        setHasNewMessages(true);
        // Clear the notification after 3 seconds
        setTimeout(() => setHasNewMessages(false), 3000);
      }
      
      setConversations(data);
      setPreviousMessageCounts(newCounts);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    try {
      setSendingMessage(true);
      
      const response = await fetch('/api/detailer/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Clear the input
      setNewMessage('');
      
      // Refresh the conversation messages to show the new message
      await fetchConversationMessages(selectedConversation.id);
      
      // Also refresh the conversations list to update the last message preview
      await fetchConversations();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = async () => {
    if (!selectedConversation) return;
    
    const confirmClear = window.confirm(
      'Are you sure you want to clear this conversation? This will delete all messages and cannot be undone.'
    );
    
    if (!confirmClear) return;

    try {
      const response = await fetch(`/api/detailer/clear-conversation?conversationId=${selectedConversation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear conversation');
      }

      // Refresh the conversation messages to show empty state
      await fetchConversationMessages(selectedConversation.id);
      
      // Also refresh the conversations list
      await fetchConversations();
      
      alert('Conversation cleared successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear conversation');
      alert('Failed to clear conversation. Please try again.');
    }
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

  // Filter conversations based on search query, date, and channel
  const filteredConversations = conversations.filter(conversation => {
    // Channel filter
    const channelMatch = channelFilter === 'all' || conversation.channel === channelFilter;

    // Text search filter
    const textMatch = !searchQuery.trim() || (() => {
      const query = searchQuery.toLowerCase();
      const customerName = conversation.customerName?.toLowerCase() || '';
      const customerPhone = conversation.customerPhone?.toLowerCase() || '';
      const lastMessage = getLastMessagePreview(conversation.messages).toLowerCase();
      
      return customerName.includes(query) || 
             customerPhone.includes(query) || 
             lastMessage.includes(query);
    })();

    // Date filter
    const dateMatch = !dateFilter || (() => {
      const conversationDate = new Date(conversation.lastMessageAt);
      const filterDate = new Date(dateFilter + 'T00:00:00'); // Ensure we're using local timezone
      
      // Get date components for comparison (ignoring time)
      const conversationYear = conversationDate.getFullYear();
      const conversationMonth = conversationDate.getMonth();
      const conversationDay = conversationDate.getDate();
      
      const filterYear = filterDate.getFullYear();
      const filterMonth = filterDate.getMonth();
      const filterDay = filterDate.getDate();
      
      return conversationYear === filterYear && 
             conversationMonth === filterMonth && 
             conversationDay === filterDay;
    })();

    return channelMatch && textMatch && dateMatch;
  });

  const createNewConversation = async () => {
    if (!newCustomerPhone.trim() || creatingConversation) return;

    try {
      setCreatingConversation(true);
      
      const response = await fetch('/api/detailer/start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerPhone: newCustomerPhone,
          customerName: newCustomerName || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Refresh conversations to show the new one
        await fetchConversations();
        
        // Select the conversation (either new or re-initialized)
        if (data.conversation) {
          await fetchConversationMessages(data.conversation.id);
        }
        
        // Close modal and reset form
        setShowNewConversationModal(false);
        setNewCustomerPhone('');
        setNewCustomerName('');
        
        alert('Conversation started! The AI will reach out to the customer.');
      } else {
        const errorData = await response.json();
        // Check if it's the "already exists" error
        if (response.status === 409 && errorData.conversation) {
          // Conversation exists with messages - select it instead
          await fetchConversationMessages(errorData.conversation.id);
          setShowNewConversationModal(false);
          setNewCustomerPhone('');
          setNewCustomerName('');
          alert('Conversation already exists with this customer. Opening existing conversation.');
        } else {
          alert(`Failed to start conversation: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Error creating conversation. Please try again.');
    } finally {
      setCreatingConversation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    <div className="h-screen flex relative">
      {/* New Messages Notification */}
      {hasNewMessages && (
        <div className="absolute top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">New messages received!</span>
          </div>
        </div>
      )}
      {/* Conversations List */}
      <div className={`${showConversationList ? 'flex' : 'hidden'} md:flex w-full md:w-1/3 border-r border-gray-200 flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="pl-10 md:pl-0">
              <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? `${filteredConversations.length} of ${conversations.length}` : conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewConversationModal(true)}
                className="hidden md:flex bg-black text-white px-3 py-2 rounded-xl text-sm hover:bg-gray-800 transition-colors items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start New
              </button>
              <button
                onClick={refreshConversations}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                title="Refresh conversations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="mb-4 space-y-3">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`h-10 w-10 rounded-full border flex items-center justify-center transition-colors ${
                  dateFilter 
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Filter by date"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {/* Channel Filter Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setChannelFilter('all')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  channelFilter === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChannelFilter('sms')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  channelFilter === 'sms'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📱 SMS
              </button>
              <button
                onClick={() => setChannelFilter('phone')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  channelFilter === 'phone'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📞 Calls
              </button>
            </div>

            {/* Date Filter */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                  dateFilter 
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {dateFilter ? new Date(dateFilter + 'T00:00:00').toLocaleDateString() : 'Filter by date'}
              </button>
              
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Clear date filter"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Date Picker */}
            {showDateFilter && (
              <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Select date:</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Done
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      const today = new Date();
                      setDateFilter(today.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setDateFilter(yesterday.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      setDateFilter(weekAgo.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Last week
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery || dateFilter ? (
                <>
                  <p>No conversations found</p>
                  <p className="text-sm mt-1">
                    {searchQuery && dateFilter 
                      ? 'Try different search terms or date range'
                      : searchQuery 
                      ? 'Try a different search term'
                      : 'Try a different date'
                    }
                  </p>
                </>
              ) : (
                <>
                  <p>No conversations yet</p>
                  <p className="text-sm mt-1">Customer messages will appear here</p>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => fetchConversationMessages(conversation.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {conversation.channel === 'phone' && (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Call
                        </span>
                      )}
                      {conversation.channel === 'sms' && (
                        <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          SMS
                        </span>
                      )}
                      {conversation.metadata?.lastCallDuration && (
                        <span className="text-xs text-gray-500">
                          {Math.floor(conversation.metadata.lastCallDuration / 60)}m {conversation.metadata.lastCallDuration % 60}s
                        </span>
                      )}
                    </div>
                    {conversation.customerName ? (
                      <>
                        <h3 className="font-semibold text-gray-900 truncate text-base mt-1">
                          {conversation.customerName}
                        </h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {formatPhoneDisplay(conversation.customerPhone)}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-900 truncate text-base mt-1">
                          {formatPhoneDisplay(conversation.customerPhone)}
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
                <div className="mt-2 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    conversation.status === 'active' 
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {conversation.status}
                  </span>
                  {previousMessageCounts[conversation.id] && 
                   previousMessageCounts[conversation.id] < conversation.messages.length && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                      New
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button - Mobile Only */}
      <button
        onClick={() => setShowNewConversationModal(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition flex items-center justify-center z-30"
        aria-label="Start new conversation"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Messages View */}
      <div className={`${!showConversationList ? 'flex' : 'hidden'} md:flex flex-1 flex flex-col h-screen`}>
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
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
                          {formatPhoneDisplay(selectedConversation.customerPhone)}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {formatPhoneDisplay(selectedConversation.customerPhone)}
                        </h2>
                        <p className="text-sm text-gray-500">
                          Customer name not provided yet
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-500">
                    Last active: {formatMessageTime(selectedConversation.lastMessageAt)}
                  </div>
                  <button
                    onClick={clearConversation}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                    title="Clear conversation"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages?.length > 0 ? (
                selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${
                        message.direction === 'outbound'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`text-xs mt-1 ${
                        message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
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
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={1}
                  disabled={sendingMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {sendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-medium mb-2 text-gray-900">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the list to view messages</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Start New Conversation
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Phone Number *
                </label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewConversationModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewConversation}
                disabled={!newCustomerPhone.trim() || creatingConversation}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {creatingConversation && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {creatingConversation ? 'Starting...' : 'Start Conversation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
