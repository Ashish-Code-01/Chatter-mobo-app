import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, MoreVertical, Send, Paperclip, Smile, Phone, Video, Menu, User, ArrowLeft } from 'lucide-react';

const API_URL = "https://chatter-mobo-app.onrender.com";
const DEFAULT_AVATAR = "https://res.cloudinary.com/dqmxpgv5k/image/upload/v1765892967/A_circular_default_c_cafouy.png";

const ChatScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { myPhone, contactPhone, contactName } = location.state || {};

    const [selectedChat, setSelectedChat] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [secretKey, setSecretKey] = useState('');
    const [contactIsOnline, setContactIsOnline] = useState(false);
    const [contactAvatar, setContactAvatar] = useState('');
    const [chats, setChats] = useState([]);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const alphabet = useMemo(() => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!'_-&@#$%*()/:<>|+= ", []);
    const chatId = useMemo(() => `chat_${[myPhone, contactPhone].sort().join("_")}`, [myPhone, contactPhone]);

    useEffect(() => {
        if (localStorage.getItem("token") === null) {
            navigate('/');
        }
    }, [navigate]);

    // Dedupe messages
    const dedupeMessages = useCallback((list) => {
        const map = new Map();
        list.forEach((m) => {
            const timeWindow = Math.floor(m.timestamp / 1000);
            const key = `${m.from}_${m.message}_${timeWindow}`;
            if (!map.has(key)) {
                map.set(key, m);
            }
        });
        return Array.from(map.values());
    }, []);

    // Encrypt Message
    const encryptMessage = useCallback((text, key) => {
        if (!text || !key) {
            console.error("Text or key is missing for encryption");
            return text || "";
        }

        let encryptedText = "";

        for (let i = 0; i < text.length; i++) {
            const textChar = text[i];
            const keyChar = key[i % key.length];

            const textIndex = alphabet.indexOf(textChar);
            const keyIndex = alphabet.indexOf(keyChar);

            if (textIndex === -1) {
                encryptedText += textChar;
            } else {
                const newIndex = (textIndex + keyIndex) % alphabet.length;
                encryptedText += alphabet[newIndex];
            }
        }

        return encryptedText;
    }, [alphabet]);

    // Decrypt Message
    const decryptMessage = useCallback((encryptedText, key) => {
        let decryptedText = "";

        for (let i = 0; i < encryptedText.length; i++) {
            const encryptedChar = encryptedText[i];
            const keyChar = key[i % key.length];

            const encryptedIndex = alphabet.indexOf(encryptedChar);
            const keyIndex = alphabet.indexOf(keyChar);

            if (encryptedIndex === -1) {
                decryptedText += encryptedChar;
            } else {
                let newIndex = encryptedIndex - keyIndex;
                if (newIndex < 0) newIndex += alphabet.length;
                decryptedText += alphabet[newIndex];
            }
        }

        return decryptedText;
    }, [alphabet]);

    // Fetch contact status
    const fetchContactStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/online/status/${contactPhone}`);
            const data = await response.json();
            if (data?.success) {
                setContactIsOnline(data.data.isOnline);
            }
        } catch (error) {
            console.error("Error fetching contact status:", error);
        }
    }, [contactPhone]);

    // Fetch contact avatar
    const fetchContactAvatar = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/auth/user/${contactPhone}`);
            const data = await response.json();
            if (data?.success && data?.data?.avatar) {
                setContactAvatar(data.data.avatar);
            } else {
                setContactAvatar(DEFAULT_AVATAR);
            }
        } catch (error) {
            console.error("Error fetching contact avatar:", error);
            setContactAvatar(DEFAULT_AVATAR);
        }
    }, [contactPhone]);

    // Fetch messages from backend
    const fetchMessagesFromBackend = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${API_URL}/api/messages/get/${contactPhone}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({})
            });

            const res = await response.json();
            const raw = res.data || [];
            const secretkey = localStorage.getItem("secretkey");

            const backendMsgs = raw.map((msg) => {
                try {
                    const decryptedContent = decryptMessage(msg.content, secretkey);
                    return {
                        from: msg.sender === myPhone ? "Me" : msg.sender,
                        message: decryptedContent,
                        timestamp: new Date(msg.createdAt).getTime(),
                    };
                } catch (error) {
                    console.error("Error decrypting message:", error);
                    return {
                        from: msg.sender === myPhone ? "Me" : msg.sender,
                        message: "[Decryption failed]",
                        timestamp: new Date(msg.createdAt).getTime(),
                    };
                }
            });

            setMessages((prev) => {
                const merged = dedupeMessages([...prev, ...backendMsgs]).sort(
                    (a, b) => a.timestamp - b.timestamp
                );
                localStorage.setItem(chatId, JSON.stringify(merged));
                return merged;
            });
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    }, [contactPhone, myPhone, chatId, decryptMessage, dedupeMessages]);

    // Mark messages as seen
    const markMessagesSeen = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await fetch(`${API_URL}/api/messages/seen`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ receiverPhoneNumber: contactPhone })
            });
        } catch (error) {
            console.error("Error marking messages as seen:", error);
        }
    }, [contactPhone]);

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                const local = localStorage.getItem(chatId);
                if (local) {
                    setMessages(JSON.parse(local));
                }

                await fetchContactStatus();
                await fetchContactAvatar();
                await fetchMessagesFromBackend();
                await markMessagesSeen();
            } catch (error) {
                console.error("Error during initial load:", error);
            } finally {
                setLoading(false);
            }
        };

        if (contactPhone && myPhone) {
            loadData();
        }
    }, [contactPhone, myPhone, chatId, fetchContactStatus, fetchContactAvatar, fetchMessagesFromBackend, markMessagesSeen]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle send message
    const handleSendMessage = useCallback(async () => {
        try {
            if (!message.trim()) return;

            let keyToUse = secretKey;

            if (!keyToUse) {
                const privatekey = localStorage.getItem("privatekey");
                const serverkey = localStorage.getItem("serverkey");

                if (!privatekey || !serverkey) {
                    console.error("Encryption keys not found. Please login again.");
                    alert("Encryption keys not found. Please login again.");
                    return;
                }

                keyToUse = privatekey + serverkey;
                localStorage.setItem("secretkey", keyToUse);
                setSecretKey(keyToUse);
            }

            const text = message.trim();
            const timestamp = Date.now();
            const newMsg = {
                from: "Me",
                message: text,
                timestamp: timestamp,
            };

            setMessage('');
            setMessages((prev) => {
                const updated = [...prev, newMsg];
                localStorage.setItem(chatId, JSON.stringify(updated));
                return updated;
            });

            const encryptedMsg = encryptMessage(text, keyToUse);

            if (!encryptedMsg || encryptedMsg === text) {
                console.warn("Message encryption may have failed");
            }

            const publickey = keyToUse.substring(0, 16);

            // Send message via socket or API
            // sendMessage(contactPhone, encryptedMsg, publickey);

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        }
    }, [message, secretKey, chatId, contactPhone, encryptMessage]);

    // Handle file attachment
    const handleAttachDocument = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const maxSize = 10 * 1024 * 1024; // 10MB
        const oversizedFiles = files.filter(file => file.size > maxSize);

        if (oversizedFiles.length > 0) {
            alert(`${oversizedFiles.length} file(s) exceed 10MB limit`);
            return;
        }

        // Handle file upload
        console.log('Files selected:', files);
    };

    // Mock chats data
    useEffect(() => {
        const mockChats = [
            { id: 1, name: 'John Doe', lastMessage: 'Hey! How are you?', time: '10:30 AM', unread: 2, avatar: 'JD', phone: '1234567890' },
            { id: 2, name: 'Jane Smith', lastMessage: 'See you tomorrow!', time: '9:15 AM', unread: 0, avatar: 'JS', phone: '0987654321' },
            { id: 3, name: 'Team Alpha', lastMessage: 'Meeting at 3 PM', time: 'Yesterday', unread: 5, avatar: 'TA', phone: '1112223333' },
            { id: 4, name: 'Mom', lastMessage: 'Don\'t forget to call', time: 'Yesterday', unread: 1, avatar: 'M', phone: '4445556666' },
            { id: 5, name: 'Alice Johnson', lastMessage: 'Thanks for the help!', time: 'Monday', unread: 0, avatar: 'AJ', phone: '7778889999' },
        ];
        setChats(mockChats);

        // Set selected chat if coming from navigation
        if (contactPhone) {
            const chat = mockChats.find(c => c.phone === contactPhone) || {
                id: Date.now(),
                name: contactName || contactPhone,
                phone: contactPhone,
                avatar: contactName ? contactName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
            };
            setSelectedChat(chat);
        }
    }, [contactPhone, contactName]);

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className='w-screen h-screen bg-[#0F1419] flex flex-col'>
            {/* Header */}
            <div className='h-16 flex items-center justify-between px-6 bg-[#1a1f2e]'>
                <h1 className='text-white font-bold text-2xl'>Chatter</h1>
                <div className='flex items-center gap-5'>
                    <button className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors'>
                        <User size={22} />
                    </button>
                    <button className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors'>
                        <Menu size={22} />
                    </button>
                </div>
            </div>
            <div className='h-[2px] bg-[#00D4C2]' />

            <div className='flex flex-1 overflow-hidden'>
                {/* Sidebar - Chat List */}
                <div className='bg-[#1a1f2e] w-[30%] flex flex-col'>
                    {/* Search Bar */}
                    <div className='p-5 border-b border-white/10'>
                        <div className='relative'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={18} />
                            <input
                                type='text'
                                placeholder='Search chats...'
                                className='w-full bg-[#0F1419] text-white pl-10 pr-4 py-2.5 rounded-lg border border-[#00D4C2]/20 focus:outline-none focus:border-[#00D4C2]/50 transition-colors'
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className='flex-1 overflow-y-auto'>
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`px-5 py-4 border-b border-white/10 cursor-pointer hover:bg-[#0F1419]/50 transition-colors ${selectedChat?.id === chat.id ? 'bg-[#0F1419]' : ''
                                    }`}
                            >
                                <div className='flex items-center gap-3'>
                                    {/* Avatar */}
                                    <div className='w-12 h-12 rounded-full bg-[#00D4C2] flex items-center justify-center text-[#0F1419] font-bold flex-shrink-0'>
                                        {chat.avatar}
                                    </div>

                                    {/* Chat Info */}
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center justify-between mb-1'>
                                            <h3 className='text-white font-semibold truncate'>{chat.name}</h3>
                                            <span className='text-xs text-gray-400 ml-2'>{chat.time}</span>
                                        </div>
                                        <div className='flex items-center justify-between gap-2'>
                                            <p className='text-sm text-gray-400 truncate flex-1'>{chat.lastMessage}</p>
                                            {chat.unread > 0 && (
                                                <span className='bg-[#00D4C2] text-[#0F1419] text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5'>
                                                    {chat.unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className='w-[2px] bg-[#00D4C2]' />

                {/* Main Chat Area */}
                <div className='bg-[#0F1419] w-[70%] flex flex-col'>
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className='h-18 border-b border-white/10 flex items-center justify-between px-6 py-4'>
                                <div className='flex items-center gap-4'>
                                    {contactAvatar ? (
                                        <img
                                            src={contactAvatar}
                                            alt={selectedChat.name}
                                            className='w-11 h-11 rounded-full border-2 border-[#00D4C2]/30'
                                        />
                                    ) : (
                                        <div className='w-11 h-11 rounded-full bg-[#00D4C2] flex items-center justify-center text-[#0F1419] font-bold'>
                                            {selectedChat.avatar}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className='text-white font-semibold text-lg'>{selectedChat.name}</h2>
                                        <p className={`text-xs mt-0.5 ${contactIsOnline ? 'text-[#00D4C2]' : 'text-gray-400'}`}>
                                            {contactIsOnline ? '● Online' : '● Offline'}
                                        </p>
                                    </div>
                                </div>
                                <div className='flex items-center gap-5'>
                                    <button className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors'>
                                        <Phone size={20} />
                                    </button>
                                    <button className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors'>
                                        <Video size={20} />
                                    </button>
                                    <button className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors'>
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area - FIXED PADDING */}
                            {loading ? (
                                <div className='flex-1 flex items-center justify-center'>
                                    <div className='text-[#00D4C2] text-lg'>Loading...</div>
                                </div>
                            ) : (
                                <div className='flex-1 overflow-y-auto'>
                                    <div className='px-6 py-6 space-y-4'>
                                        {messages.map((msg, index) => {
                                            const isMe = msg.from === 'Me';
                                            return (
                                                <div
                                                    key={`${msg.timestamp}_${index}`}
                                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMe
                                                            ? 'bg-[#00D4C2] text-[#0F1419]'
                                                            : 'bg-[#1a1f2e] text-white border border-[#00D4C2]/20'
                                                            }`}
                                                    >
                                                        <p className='text-sm leading-relaxed'>{msg.message}</p>
                                                        <span className='text-xs opacity-70 mt-1.5 block'>
                                                            {formatTime(msg.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>
                            )}

                            {/* Message Input */}
                            <div className='border-t border-white/10 px-6 py-5'>
                                <div className='flex items-center gap-3'>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        multiple
                                        className='hidden'
                                    />
                                    <button
                                        onClick={handleAttachDocument}
                                        className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors p-1'
                                    >
                                        <Paperclip size={22} />
                                    </button>
                                    <input
                                        type='text'
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder='Type a message...'
                                        className='flex-1 bg-[#1a1f2e] text-white px-5 py-3 rounded-lg border border-[#00D4C2]/20 focus:outline-none focus:border-[#00D4C2]/50 transition-colors'
                                        maxLength={1000}
                                    />
                                    <button className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors p-1'>
                                        <Smile size={22} />
                                    </button>
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!message.trim()}
                                        className={`p-3 rounded-lg transition-colors ${message.trim()
                                            ? 'bg-[#00D4C2] text-[#0F1419] hover:bg-[#00D4C2]/90'
                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className='flex-1 flex items-center justify-center p-8'>
                            <div className='text-center'>
                                <div className='w-24 h-24 rounded-full bg-[#00D4C2]/10 flex items-center justify-center mx-auto mb-6'>
                                    <Menu className='text-[#00D4C2]' size={48} />
                                </div>
                                <h2 className='text-white text-2xl font-semibold mb-3'>Welcome to Chatter</h2>
                                <p className='text-gray-400 text-base'>Select a chat to start messaging</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChatScreen;