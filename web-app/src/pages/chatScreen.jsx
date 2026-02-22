import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, MoreVertical, Send, Paperclip, Smile, Phone, Video, Menu, User, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { socket, getOrCreateDeviceId, registerDevice, requestMessageSync } from '../utils/socket.js';

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
    const [unseenMessages, setUnseenMessages] = useState({});
    const [contactStatusMap, setContactStatusMap] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(null);
    const [deviceId, setDeviceId] = useState('');

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const alphabet = useMemo(() => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!'_-&@#$%*()/:<>|+= ", []);
    const chatId = useMemo(() => `chat_${[myPhone, contactPhone].sort().join("_")}`, [myPhone, contactPhone]);

    // Check authentication
    useEffect(() => {
        if (localStorage.getItem("token") === null) {
            navigate('/');
        }
    }, [navigate]);

    // Dedupe messages
    const dedupeMessages = useCallback((list: any) => {
        const map = new Map();
        list.forEach((m: any) => {
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

    // Fetch current user
    const fetchCurrentUser = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const savedUser = localStorage.getItem("User");

            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                setUser(parsed);
            } else {
                const { data } = await axios.post(
                    `${API_URL}/auth/me`,
                    {},
                    { headers: { token } }
                );

                if (data?.user) {
                    setUser(data.user);
                    localStorage.setItem("User", data.user);
                }
            }
        } catch (error) {
            console.error("Error fetching current user:", error);
        }
    }, []);

    // Fetch contact status
    const fetchContactStatus = useCallback(async (phone) => {
        try {
            const response = await axios.get(`${API_URL}/api/online/status/${phone}`);
            if (response.data?.success) {
                setContactStatusMap(prev => ({
                    ...prev,
                    [phone]: response.data.data.isOnline
                }));

                // If this is the selected contact, update their status too
                if (phone === contactPhone) {
                    setContactIsOnline(response.data.data.isOnline);
                }
            }
        } catch (error) {
            console.error(`Error fetching contact status for ${phone}:`, error);
        }
    }, [contactPhone]);

    // Fetch contact avatar
    const fetchContactAvatar = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/auth/user/${contactPhone}`);
            if (response.data?.success && response.data?.data?.avatar) {
                setContactAvatar(response.data.data.avatar);
            } else {
                setContactAvatar(DEFAULT_AVATAR);
            }
        } catch (error) {
            console.error("Error fetching contact avatar:", error);
            setContactAvatar(DEFAULT_AVATAR);
        }
    }, [contactPhone]);

    // Fetch all contacts/users
    const fetchAllContacts = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Get contacts from localStorage
            const savedContacts = localStorage.getItem("Users");
            let contacts = [];

            if (savedContacts) {
                try {
                    const parsed = JSON.parse(savedContacts);
                    // Ensure it's an array
                    contacts = Array.isArray(parsed) ? parsed : (parsed?.data ? parsed.data : []);
                } catch (parseError) {
                    console.error("Error parsing saved contacts:", parseError);
                    contacts = [];
                }
            }

            // Fetch unseen messages
            const { data: msgData } = await axios.post(
                `${API_URL}/api/messages/get/msg/all`,
                {},
                { headers: { token } }
            );

            if (msgData?.success) {
                const grouped = {};
                msgData.data.forEach((msg) => {
                    if (!msg.seen) {
                        grouped[msg.sender] = (grouped[msg.sender] || 0) + 1;
                    }
                });
                setUnseenMessages(grouped);
            }

            // Transform contacts to chat format
            const formattedChats = contacts.map(contact => {
                const initials = contact.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                return {
                    id: contact.id,
                    name: contact.name,
                    phone: contact.phone,
                    avatar: initials,
                    lastMessage: 'Tap to start chatting',
                    time: '',
                    unread: unseenMessages[contact.phone] || 0
                };
            });

            setChats(formattedChats);

            // Fetch status for all contacts
            for (const contact of contacts) {
                await fetchContactStatus(contact.phone);
            }

            // Set selected chat if coming from navigation
            if (contactPhone) {
                const chat = formattedChats.find(c => c.phone === contactPhone) || {
                    id: Date.now(),
                    name: contactName || contactPhone,
                    phone: contactPhone,
                    avatar: contactName ? contactName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
                };
                setSelectedChat(chat);
            }
        } catch (error) {
            console.error("Error fetching contacts:", error);
        }
    }, [contactPhone, contactName, unseenMessages, fetchContactStatus]);

    // Fetch messages from backend by chatId (saved with chatId for retrieval and display)
    const fetchMessagesFromBackend = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const encodedChatId = encodeURIComponent(chatId);
            const response = await axios.get(
                `${API_URL}/api/messages/chat/${encodedChatId}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'token': token
                    }
                }
            );

            const res = response.data;
            const raw = res.data || [];
            const secretkey = localStorage.getItem("secretkey") || '';

            const backendMsgs = raw.map((msg) => {
                try {
                    const decryptedContent = decryptMessage(msg.content, secretkey);
                    return {
                        from: msg.sender === user?.phoneNumber ? "Me" : msg.sender,
                        message: decryptedContent,
                        timestamp: new Date(msg.createdAt).getTime(),
                        messageId: msg._id,
                        status: msg.status || 'sent',
                    };
                } catch (error) {
                    console.error("Error decrypting message:", error);
                    return {
                        from: msg.sender === user?.phoneNumber ? "Me" : msg.sender,
                        message: "[Decryption failed]",
                        timestamp: new Date(msg.createdAt).getTime(),
                        messageId: msg._id,
                        status: msg.status || 'sent',
                    };
                }
            });

            const merged = dedupeMessages([...backendMsgs]).sort(
                (a, b) => a.timestamp - b.timestamp
            );
            localStorage.setItem(chatId, JSON.stringify(merged));
            setMessages(merged);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    }, [contactPhone, user, chatId, decryptMessage, dedupeMessages]);

    // Mark messages as seen
    const markMessagesSeen = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await axios.post(
                `${API_URL}/api/messages/seen`,
                { receiverPhoneNumber: contactPhone },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'token': token
                    }
                }
            );
        } catch (error) {
            console.error("Error marking messages as seen:", error);
        }
    }, [contactPhone]);

    // Register user on socket when they become available
    useEffect(() => {
        if (!user?.phoneNumber || !deviceId) return;

        const registerUserAndDevice = () => {
            console.log('📱 Registering user on socket:', user.phoneNumber);
            socket.emit('register', user.phoneNumber);

            // Register device
            registerDevice(user.phoneNumber, deviceId);

            // Request message sync for this device
            setTimeout(() => {
                console.log('🔄 Requesting message sync for device:', deviceId);
                requestMessageSync(user.phoneNumber, deviceId);
            }, 500); // Small delay to ensure device is registered first
        };

        if (socket.connected) {
            registerUserAndDevice();
        } else {
            console.log('⏳ Waiting for socket to connect before registering user...');
            socket.once('connect', () => {
                registerUserAndDevice();
            });
        }
    }, [user, deviceId]);

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                // Get or create deviceId
                const storedDeviceId = getOrCreateDeviceId();
                setDeviceId(storedDeviceId);

                await fetchCurrentUser();
                await fetchAllContacts();

                if (contactPhone) {
                    const local = localStorage.getItem(chatId);
                    if (local) {
                        setMessages(JSON.parse(local));
                    }

                    await fetchContactStatus(contactPhone);
                    await fetchContactAvatar();
                    await fetchMessagesFromBackend();
                    await markMessagesSeen();
                }
            } catch (error) {
                console.error("Error during initial load:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [contactPhone, chatId]);

    // Helper function to process and add messages
    const processAndAddMessage = useCallback(async (from, to, encryptedMsg, publickey, files, timestamp) => {
        // Only process messages relevant to current chat
        const isRelevant = (from === contactPhone && to === user?.phoneNumber) ||
            (to === contactPhone && from === user?.phoneNumber);

        if (!isRelevant || !contactPhone || !user?.phoneNumber) {
            return;
        }

        // Decrypt message
        let keyToUse = await localStorage.getItem("secretkey");
        const privatekey = await localStorage.getItem("privatekey");
        keyToUse = publickey + privatekey;

        try {
            const decryptedMsg = decryptMessage(encryptedMsg, keyToUse);

            // Determine timestamp
            let msgTimestamp = timestamp;
            if (typeof msgTimestamp === 'string') {
                msgTimestamp = new Date(msgTimestamp).getTime();
            } else if (!msgTimestamp) {
                msgTimestamp = Date.now();
            }

            const newMsg = {
                from: from === user?.phoneNumber ? "Me" : from,
                message: decryptedMsg,
                timestamp: msgTimestamp,
                file: files || undefined,
            };

            setMessages((prev) => {
                // Check if message already exists
                const exists = prev.some(m => {
                    const timeDiff = Math.abs(m.timestamp - msgTimestamp);
                    return timeDiff < 1000 && m.from === newMsg.from && m.message === newMsg.message;
                });

                if (exists) {
                    return prev;
                }

                const merged = dedupeMessages([...prev, newMsg]).sort(
                    (a, b) => a.timestamp - b.timestamp
                );
                localStorage.setItem(chatId, JSON.stringify(merged));
                return merged;
            });
        } catch (error) {
            console.error("Error processing message:", error);
        }
    }, [contactPhone, user, secretKey, chatId, decryptMessage, dedupeMessages]);

    // Listen for incoming messages from online users
    useEffect(() => {
            const handleMessageReceived = ({ from, message: encryptedMsg, publickey, files }) => {
            processAndAddMessage(from, user?.phoneNumber || '', encryptedMsg, publickey, files, Date.now());
        };

        socket.on('Receivemessage', handleMessageReceived);

        return () => {
            socket.off('Receivemessage', handleMessageReceived);
        };
    }, [user, processAndAddMessage]);

    // Listen for synced messages
    useEffect(() => {
        const handleMessageSynced = ({ from, to, message: encryptedMsg, publickey, files, timestamp, messageId }) => {
            processAndAddMessage(from, to, encryptedMsg, publickey, files, timestamp);
        };

        socket.on('messageSynced', handleMessageSynced);

        return () => {
            socket.off('messageSynced', handleMessageSynced);
        };
    }, [processAndAddMessage]);

    // Listen for bulk message sync (when device first connects)
    useEffect(() => {
        const handleBulkMessageSync = ({ messages: syncedMessages, batchIndex, totalBatches, isLastBatch }) => {
            console.log(`📦 Received message sync batch ${batchIndex + 1}/${totalBatches}: ${syncedMessages.length} messages`);

            const secretkey = localStorage.getItem("secretkey") || '';

            syncedMessages.forEach((msg) => {
                try {
                    // Only process messages relevant to current chat or all messages if no chat selected
                    if (contactPhone && !((msg.sender === contactPhone && msg.receiver === user?.phoneNumber) || (msg.receiver === contactPhone && msg.sender === user?.phoneNumber))) {
                        return;
                    }

                    const decryptedContent = decryptMessage(msg.content, secretkey);

                    setMessages((prev) => {
                        // Deduplicate by checking timestamp and content
                        const exists = prev.some(m => {
                            const timeDiff = Math.abs(m.timestamp - new Date(msg.createdAt).getTime());
                            return timeDiff < 1000 && m.message === decryptedContent;
                        });

                        if (exists) {
                            return prev;
                        }

                        const newMsg = {
                            from: msg.sender === user?.phoneNumber ? "Me" : msg.sender,
                            message: decryptedContent,
                            timestamp: new Date(msg.createdAt).getTime(),
                            file: msg.file || undefined,
                        };

                        const merged = dedupeMessages([...prev, newMsg]).sort(
                            (a, b) => a.timestamp - b.timestamp
                        );

                        if (contactPhone) {
                            const chatIdForContact = `chat_${[user?.phoneNumber, contactPhone].sort().join("_")}`;
                            localStorage.setItem(chatIdForContact, JSON.stringify(merged));
                        }

                        return merged;
                    });
                } catch (error) {
                    console.error("Error processing synced message:", error);
                }
            });

            if (isLastBatch) {
                console.log('✅ Bulk message sync completed');
            }
        };

        socket.on('bulkMessageSync', handleBulkMessageSync);

        return () => {
            socket.off('bulkMessageSync', handleBulkMessageSync);
        };
    }, [user, contactPhone, decryptMessage, dedupeMessages]);

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

            // Send message via socket
            if (socket.connected) {
                console.log('📤 Sending message via socket to:', contactPhone);
                socket.emit('sendMessage', {
                    from: user?.phoneNumber,
                    to: contactPhone,
                    message: encryptedMsg,
                    publickey: publickey,
                    files: null,
                    deviceId: deviceId
                });
            } else {
                console.warn('⚠️ Socket not connected, waiting for connection...');
                socket.once('connect', () => {
                    console.log('📤 Socket reconnected, sending message to:', contactPhone);
                    socket.emit('sendMessage', {
                        from: user?.phoneNumber,
                        to: contactPhone,
                        message: encryptedMsg,
                        publickey: publickey,
                        files: null,
                        deviceId: deviceId
                    });
                });
            }

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        }
    }, [message, secretKey, chatId, contactPhone, user, deviceId, encryptMessage]);

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
    };

    // Handle chat selection
    const handleChatSelect = async (chat) => {
        setSelectedChat(chat);
        setLoading(true);

        try {
            // Load messages for this chat
            const chatIdForContact = `chat_${[user?.phoneNumber, chat.phone].sort().join("_")}`;
            const local = localStorage.getItem(chatIdForContact);
            if (local) {
                setMessages(JSON.parse(local));
            } else {
                setMessages([]);
            }

            // Fetch contact status and avatar
            await fetchContactStatus(chat.phone);

            const response = await axios.get(`${API_URL}/auth/user/${chat.phone}`);
            if (response.data?.success && response.data?.data?.avatar) {
                setContactAvatar(response.data.data.avatar);
            } else {
                setContactAvatar(DEFAULT_AVATAR);
            }

            // Fetch messages from backend by chatId and save with chatId for retrieval/display
            const token = localStorage.getItem("token");
            const encodedChatId = encodeURIComponent(chatIdForContact);
            const msgResponse = await axios.get(
                `${API_URL}/api/messages/chat/${encodedChatId}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'token': token
                    }
                }
            );

            const raw = msgResponse.data.data || [];
            const secretkey = localStorage.getItem("secretkey") || '';

            const backendMsgs = raw.map((msg) => {
                try {
                    const decryptedContent = decryptMessage(msg.content, secretkey);
                    return {
                        from: msg.sender === user?.phoneNumber ? "Me" : msg.sender,
                        message: decryptedContent,
                        timestamp: new Date(msg.createdAt).getTime(),
                        messageId: msg._id,
                        status: msg.status || 'sent',
                    };
                } catch (error) {
                    return {
                        from: msg.sender === user?.phoneNumber ? "Me" : msg.sender,
                        message: "[Decryption failed]",
                        timestamp: new Date(msg.createdAt).getTime(),
                        messageId: msg._id,
                        status: msg.status || 'sent',
                    };
                }
            });

            const sorted = backendMsgs.sort((a, b) => a.timestamp - b.timestamp);
            localStorage.setItem(chatIdForContact, JSON.stringify(sorted));
            setMessages(sorted);

            // Mark as seen
            await axios.post(
                `${API_URL}/api/messages/seen`,
                { receiverPhoneNumber: chat.phone },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'token': token
                    }
                }
            );

        } catch (error) {
            console.error("Error loading chat:", error);
        } finally {
            setLoading(false);
        }
    };

        const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Filter chats based on search
    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chats;
        return chats.filter(chat =>
            chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.phone.includes(searchQuery)
        );
    }, [chats, searchQuery]);

    return (
        <div className='w-screen h-screen bg-[#0F1419] flex flex-col'>
            {/* Header */}
            <div className='h-16 flex items-center justify-between px-6 bg-[#1a1f2e]'>
                <h1 className='text-white font-bold text-2xl'>Chatter</h1>
                <div className='flex items-center gap-5'>
                    {user && (
                        <span className='text-gray-400 text-sm'>Hi, {user.name}</span>
                    )}
                    <button
                        onClick={() => navigate('/profile')}
                        className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors'
                    >
                        <User size={22} />
                    </button>
                    <button className='text-[#00D4C2] hover:text-[#00D4C2]/80 transition-colors'>
                        <Menu size={22} />
                    </button>
                </div>
            </div>
            <div className='h-0.5 bg-[#00D4C2]' />

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
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className='w-full bg-[#0F1419] text-white pl-10 pr-4 py-2.5 rounded-lg border border-[#00D4C2]/20 focus:outline-none focus:border-[#00D4C2]/50 transition-colors'
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className='flex-1 overflow-y-auto'>
                        {filteredChats.length === 0 ? (
                            <div className='text-center text-gray-400 mt-20'>
                                No contacts found
                            </div>
                        ) : (
                            filteredChats.map(chat => {
                                const isOnline = contactStatusMap[chat.phone] || false;
                                const unreadCount = unseenMessages[chat.phone] || 0;

                                return (
                                    <div
                                        key={chat.id}
                                        onClick={() => handleChatSelect(chat)}
                                        className={`px-5 py-4 border-b border-white/10 cursor-pointer hover:bg-[#0F1419]/50 transition-colors ${selectedChat?.id === chat.id ? 'bg-[#0F1419]' : ''
                                            }`}
                                    >
                                        <div className='flex items-center gap-3'>
                                            {/* Avatar */}
                                            <div className='w-12 h-12 rounded-full bg-[#00D4C2] flex items-center justify-center text-[#0F1419] font-bold shrink-0'>
                                                {chat.avatar}
                                            </div>

                                            {/* Chat Info */}
                                            <div className='flex-1 min-w-0'>
                                                <div className='flex items-center justify-between mb-1'>
                                                    <h3 className='text-white font-semibold truncate'>{chat.name}</h3>
                                                    <span className='text-xs text-gray-400 ml-2'>{chat.time}</span>
                                                </div>
                                                <div className='flex items-center justify-between gap-2'>
                                                    <div className='flex items-center gap-2 flex-1 min-w-0'>
                                                        <p className='text-sm text-gray-400 truncate'>{chat.phone}</p>
                                                        <span className={`text-xs ${isOnline ? 'text-[#00D4C2]' : 'text-gray-500'}`}>
                                                            {isOnline ? '● Online' : '● Offline'}
                                                        </span>
                                                    </div>
                                                    {unreadCount > 0 && (
                                                        <span className='bg-[#00D4C2] text-[#0F1419] text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5'>
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className='w-0.5 bg-[#00D4C2]' />

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
                                        <p className={`text-xs mt-0.5 ${contactStatusMap[selectedChat.phone] ? 'text-[#00D4C2]' : 'text-gray-400'}`}>
                                            {contactStatusMap[selectedChat.phone] ? '● Online' : '● Offline'}
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

                            {/* Messages Area */}
                            {loading ? (
                                <div className='flex-1 flex items-center justify-center'>
                                    <div className='text-[#00D4C2] text-lg'>Loading...</div>
                                </div>
                            ) : (
                                <div className='flex-1 overflow-y-auto'>
                                    <div className='px-6 py-6 space-y-4'>
                                        {messages.length === 0 ? (
                                            <div className='text-center text-gray-400 mt-20'>
                                                No messages yet. Start a conversation!
                                            </div>
                                        ) : (
                                            messages.map((msg, index) => {
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
                                            })
                                        )}
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