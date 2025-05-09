import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  Divider,
  CircularProgress,
  IconButton,
  Badge
} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';

const Chat = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth(); // Use token directly from AuthContext
  const { socket } = useSocket();
  
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [participants, setParticipants] = useState([]);
  const [typing, setTyping] = useState({});
  const [error, setError] = useState("");
  
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  
  // Debug output to help diagnose issues
  useEffect(() => {
    console.log("Chat component mounted with:");
    console.log("- chatId:", chatId);
    console.log("- user:", user ? `${user.name} (${user._id})` : "Not logged in");
    console.log("- token available:", !!token);
  }, [chatId, user, token]);
  
  // Fetch chat data when component mounts or chatId changes
  useEffect(() => {
    const fetchChat = async () => {
      if (!token) {
        setError("Authentication token not available");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching chat data for chat ID:", chatId);
        
        // First, fetch the chat details
        const chatResponse = await axios.get(`http://localhost:5000/api/chat/user-chats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        console.log("Got user chats response:", chatResponse.status);
        
        // If we couldn't find the chat in user chats, try getting messages directly
        let foundChat = chatResponse.data.find(c => c._id === chatId);
        
        if (!foundChat) {
          console.log("Chat not found in user-chats, fetching messages directly");
          try {
            // Try to access messages directly, which will fail if user is not a participant
            const messagesResponse = await axios.get(`http://localhost:5000/api/chat/messages/${chatId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            // If successful, create a temporary chat object
            setMessages(messagesResponse.data);
            console.log("Direct messages fetch successful:", messagesResponse.data.length);
            
            // Get chat information directly
            const singleChatResponse = await axios.get(`http://localhost:5000/api/chat/direct/${chatId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }).catch(() => null);
            
            if (singleChatResponse && singleChatResponse.data) {
              foundChat = singleChatResponse.data;
            } else {
              // Construct minimal chat object
              foundChat = {
                _id: chatId,
                participants: []
              };
            }
          } catch (err) {
            console.error("Error fetching messages directly:", err);
            setError("Cannot access this chat. You may not be a participant.");
            setLoading(false);
            return;
          }
        }
        
        setChat(foundChat);
        console.log("Chat found:", foundChat);
        
        // Handle user ID format differences
        const userId = user?._id;
        console.log("Current user ID:", userId);
        
        // Filter participants to exclude current user
        const otherParticipants = foundChat.participants.filter(p => p._id !== userId);
        setParticipants(otherParticipants);
        console.log("Participants set:", otherParticipants.length);
        
        // If we don't already have messages, fetch them now
        if (!messages.length) {
          try {
            const messagesResponse = await axios.get(`http://localhost:5000/api/chat/messages/${chatId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            console.log("Messages loaded:", messagesResponse.data.length);
            setMessages(messagesResponse.data);
          } catch (err) {
            console.error("Failed to load messages:", err);
            setError("Failed to load messages. Please try again.");
          }
        }
        
        // Mark messages as read
        await axios.put(`http://localhost:5000/api/chat/read/${chatId}`, {}, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching chat:", error);
        setError(error.response?.data?.message || "Failed to load chat messages");
        setLoading(false);
        toast.error("Failed to load chat. Please try again.");
      }
    };
    
    if (chatId && user && token) {
      fetchChat();
    } else {
      setError("Missing required information to load chat");
      setLoading(false);
    }
  }, [chatId, user, token]);
  
  // Set up socket listeners for real-time messaging
  useEffect(() => {
    if (!socket || !chatId || !user) return;
    
    const userId = user._id || user.id; // Handle different user ID formats
    
    const handleReceiveMessage = (data) => {
      if (data.chatId === chatId) {
        console.log("New message received via socket:", data.message);
        setMessages(prevMessages => [...prevMessages, data.message]);
        
        // Mark message as read
        socket.emit("messageRead", {
          chatId,
          messageId: data.message._id,
          userId: userId
        });
      }
    };
    
    const handleUserTyping = (data) => {
      if (data.chatId === chatId) {
        setTyping(prev => ({
          ...prev,
          [data.userId]: data.isTyping
        }));
      }
    };
    
    const handleReadReceipt = (data) => {
      if (data.chatId === chatId) {
        // Update read status of a message
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg._id === data.messageId 
              ? { 
                  ...msg, 
                  readBy: [...msg.readBy, { user: data.readBy, readAt: data.readAt }] 
                } 
              : msg
          )
        );
      }
    };
    
    // Set up socket event listeners
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("userTyping", handleUserTyping);
    socket.on("messageReadReceipt", handleReadReceipt);
    
    // Clean up listeners
    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("userTyping", handleUserTyping);
      socket.off("messageReadReceipt", handleReadReceipt);
    };
  }, [socket, chatId, user]);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !chatId) return;
    
    try {
      // Show sending indicator
      const tempId = Date.now().toString();
      const userId = user._id;
      console.log("Sending message as user ID:", userId);
      
      const sendingMsg = { 
        _id: tempId,
        content: message, 
        sender: { 
          _id: userId, 
          name: user.name 
        }, 
        timestamp: new Date(),
        isSending: true,
        readBy: [{ user: userId }]
      };
      
      setMessages(prevMessages => [...prevMessages, sendingMsg]);
      
      // Reset message input immediately for better UX
      const sentMessageContent = message;
      setMessage("");
      
      // Make sure we're using the correct content property
      console.log("Sending message to backend:", sentMessageContent);
      
      const response = await axios({
        method: 'post',
        url: 'http://localhost:5000/api/chat/send',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        data: {
          chatId: chatId,
          content: sentMessageContent
        }
      });
      
      console.log("Message sent successfully, response:", response.data);
      
      // Replace temporary message with real one
      setMessages(prevMessages => {
        const filtered = prevMessages.filter(msg => msg._id !== tempId);
        return [...filtered, response.data];
      });
      
      // Send message through socket for real-time display if socket is connected
      if (socket) {
        socket.emit("sendMessage", {
          chatId,
          message: response.data,
          senderId: userId
        });
      }
      
    } catch (error) {
      console.error("Error sending message:", error.response || error);
      toast.error("Failed to send message. Please try again.");
      setError("Failed to send message");
      
      // Remove the temporary message on error
      setMessages(prevMessages => prevMessages.filter(msg => !msg.isSending));
    }
  };
  
  const handleTyping = () => {
    if (!socket || !user) return;
    
    const userId = user._id || user.id; // Handle different ID formats
    
    // Emit typing event
    socket.emit("typing", {
      chatId,
      userId: userId,
      isTyping: true
    });
    
    // Clear previous timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    // Set new timeout to stop typing indicator after 3 seconds
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing", {
        chatId,
        userId: userId,
        isTyping: false
      });
    }, 3000);
  };
  
  // Function to check if a message is read by all participants
  const isReadByAll = (message) => {
    if (!chat || !message.readBy) return false;
    
    const senderId = message.sender._id || message.sender.id;
    
    // Get all participant IDs excluding the sender
    const participantIds = chat.participants
      .filter(p => {
        const participantId = p._id || p.id;
        return participantId !== senderId;
      })
      .map(p => p._id || p.id);
    
    // Check if all participants are in the readBy array
    return participantIds.every(pid => 
      message.readBy.some(r => (r.user === pid || r.user._id === pid))
    );
  };
  
  const goBack = () => {
    navigate('/chat-list');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const isMessageOwn = (msg) => {
    const userId = user._id || user.id;
    const senderId = msg.sender._id || msg.sender.id;
    return userId === senderId;
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 0, height: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Chat header */}
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: 'primary.main', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center' 
          }}
        >
          <IconButton color="inherit" onClick={goBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          
          {participants.length > 0 && (
            <>
              <Avatar 
                src={participants[0].profilePicture} 
                alt={participants[0].name}
              >
                {participants[0].name ? participants[0].name.charAt(0) : '?'}
              </Avatar>
              <Typography variant="h6" sx={{ ml: 2 }}>
                {participants.length === 1 
                  ? participants[0].name 
                  : `${participants[0].name} and ${participants.length - 1} others`
                }
              </Typography>
            </>
          )}
          
          {chat?.relatedSOS && (
            <Badge 
              color="error" 
              badgeContent="SOS" 
              sx={{ ml: 'auto' }}
            />
          )}
        </Box>
        
        {/* Messages container */}
        <Box 
          sx={{ 
            p: 2, 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {error && (
            <Typography color="error" align="center" sx={{ my: 2 }}>
              {error}
            </Typography>
          )}
          
          <List sx={{ width: '100%' }}>
            {messages.map((msg, index) => {
              const isOwn = isMessageOwn(msg);
              
              return (
                <ListItem 
                  key={index}
                  sx={{ 
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-start',
                    mb: 1
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: isOwn ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      maxWidth: '75%'
                    }}
                  >
                    {!isOwn && (
                      <ListItemAvatar sx={{ minWidth: '40px', mt: 0 }}>
                        <Avatar 
                          src={msg.sender.profilePicture} 
                          alt={msg.sender.name}
                          sx={{ width: 32, height: 32 }}
                        >
                          {msg.sender.name ? msg.sender.name.charAt(0) : '?'}
                        </Avatar>
                      </ListItemAvatar>
                    )}
                    
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        bgcolor: isOwn ? 'primary.light' : 'grey.100',
                        borderRadius: 2,
                        position: 'relative',
                        opacity: msg.isSending ? 0.7 : 1
                      }}
                    >
                      {!isOwn && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          {msg.sender.name}
                        </Typography>
                      )}
                      
                      <Typography variant="body1" sx={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        {msg.content}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
                          {msg.isSending ? 'Sending...' : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        
                        {isOwn && !msg.isSending && (
                          isReadByAll(msg) ? <DoneAllIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : <DoneIcon sx={{ fontSize: 16 }} />
                        )}
                      </Box>
                    </Paper>
                  </Box>
                </ListItem>
              );
            })}
          </List>
          
          {/* Display typing indicators */}
          {Object.entries(typing).some(([id, isTyping]) => isTyping) && chat?.participants && (
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                {chat.participants
                  .filter(p => typing[p._id || p.id])
                  .map(p => p.name)
                  .join(", ")} is typing...
              </Typography>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </Box>
        
        <Divider />
        
        {/* Message input */}
        <Box 
          component="form" 
          onSubmit={handleSendMessage}
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: 'background.paper'
          }}
        >
          <TextField
            fullWidth
            placeholder="Type a message"
            variant="outlined"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={handleTyping}
            sx={{ mr: 2 }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            endIcon={<SendIcon />}
            disabled={!message.trim()}
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Chat;