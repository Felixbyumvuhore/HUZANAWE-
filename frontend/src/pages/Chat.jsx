import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

export default function Chat() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      // Poll for new messages every 3 seconds
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchMessages(activeConv.id, true), 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConv?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/chat/conversations");
      setConversations(res.data);
    } catch {
      addToast("Failed to load conversations", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(res.data);
      if (!silent) fetchConversations(); // refresh unread counts
    } catch {
      if (!silent) addToast("Failed to load messages", "error");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;
    setSending(true);
    try {
      await api.post(`/chat/conversations/${activeConv.id}/messages`, {
        content: newMessage.trim(),
      });
      setNewMessage("");
      fetchMessages(activeConv.id, true);
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (conv) => {
    if (conv.user1Id === user?.id) {
      return { name: conv.user2Name, avatar: conv.user2Avatar, role: conv.user2Role };
    }
    return { name: conv.user1Name, avatar: conv.user1Avatar, role: conv.user1Role };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <i className="fas fa-spinner fa-spin text-3xl text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          <i className="fas fa-comments text-primary-500 mr-2" />
          Messages
        </h1>
        <p className="text-gray-500 mb-6">Chat with your contacts</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: "70vh" }}>
          <div className="flex h-full">
            {/* Conversation List */}
            <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">Conversations</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length > 0 ? (
                  conversations.map((conv) => {
                    const other = getOtherUser(conv);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConv(conv)}
                        className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left border-b border-gray-50 ${
                          activeConv?.id === conv.id ? "bg-primary-50" : ""
                        }`}
                      >
                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {other.avatar ? (
                            <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <i className="fas fa-user text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-800 text-sm truncate">{other.name}</p>
                            {conv.unreadCount > 0 && (
                              <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              other.role === "provider" ? "bg-green-50 text-green-600" :
                              other.role === "admin" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                            }`}>
                              {other.role}
                            </span>
                            {conv.lastMessage && (
                              <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <i className="fas fa-inbox text-3xl mb-3 block" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Pay to contact a provider or client to start chatting</p>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 flex flex-col ${!activeConv ? "hidden md:flex" : "flex"}`}>
              {activeConv ? (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                    <button
                      onClick={() => setActiveConv(null)}
                      className="md:hidden text-gray-500 hover:text-gray-700 mr-1"
                    >
                      <i className="fas fa-arrow-left" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {getOtherUser(activeConv).avatar ? (
                        <img src={getOtherUser(activeConv).avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <i className="fas fa-user text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{getOtherUser(activeConv).name}</p>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        getOtherUser(activeConv).role === "provider" ? "bg-green-50 text-green-600" :
                        getOtherUser(activeConv).role === "admin" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                      }`}>
                        {getOtherUser(activeConv).role}
                      </span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <i className="fas fa-spinner fa-spin text-xl text-gray-400" />
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] ${isMe ? "order-2" : ""}`}>
                              <div
                                className={`px-4 py-2.5 rounded-2xl text-sm ${
                                  isMe
                                    ? "bg-primary-600 text-white rounded-br-md"
                                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-md"
                                }`}
                              >
                                {msg.content}
                              </div>
                              <p className={`text-xs text-gray-400 mt-1 ${isMe ? "text-right" : ""}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <i className="fas fa-comment-dots text-3xl mb-3 block" />
                        <p className="text-sm">No messages yet. Say hello!</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none text-sm"
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="bg-primary-600 text-white px-5 py-3 rounded-xl hover:bg-primary-700 transition disabled:opacity-50"
                    >
                      {sending ? (
                        <i className="fas fa-spinner fa-spin" />
                      ) : (
                        <i className="fas fa-paper-plane" />
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <i className="fas fa-comments text-5xl mb-4 block" />
                    <p className="font-medium">Select a conversation</p>
                    <p className="text-sm mt-1">Choose from the list to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
