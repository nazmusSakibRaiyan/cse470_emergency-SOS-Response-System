import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Divider, 
  CircularProgress, 
  Badge,
  IconButton
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { formatDistanceToNow } from 'date-fns';

const ChatList = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { socket } = useSocket();
  
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Fetch all chats for the user
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        console.log("Fetching chats for user:", user?._id || user?.id);
        
        const response = await axios.get("http://localhost:5000/api/chat/user-chats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        console.log("Fetched chats:", response.data.length);
        setChats(response.data);
        
        // Calculate unread counts for each chat
        const counts = {};
        for (const chat of response.data) {
          let unreadCount = 0;
          
          // Need to fetch messages for each chat to count unread
          const messagesResponse = await axios.get(`http://localhost:5000/api/chat/messages/${chat._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          const userId = user?._id || user?.id;
          if (messagesResponse.data && Array.isArray(messagesResponse.data)) {
            // Count messages not read by current user
            unreadCount = messagesResponse.data.filter(
              msg => {
                const senderId = msg.sender?._id || msg.sender?.id;
                return senderId !== userId && 
                  !msg.readBy.some(read => {
                    const readerId = read.user?._id || read.user;
                    return readerId === userId;
                  });
              }
            ).length;
          }
          
          counts[chat._id] = unreadCount;
        }
        
        setUnreadCounts(counts);
        setLoading(false);
        
      } catch (error) {
        console.error("Error fetching chats:", error);
        setError("Failed to load chats");
        toast.error("Could not load chats. Please try again later.");
        setLoading(false);
      }
    };
    
    if (user && token) {
      fetchChats();
    } else {
      setLoading(false);
      setError("Please log in to view chats");
    }
  }, [user, token]);
  
  // Listen for new messages via socket
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (data) => {
      // Update the chat list when a new message arrives
      const { chatId, message, notification } = data;
      console.log("New message received for chat:", chatId);
      
      setChats(prevChats => {
        // Find if this chat already exists in the list
        const chatIndex = prevChats.findIndex(chat => chat._id === chatId);
        
        if (chatIndex >= 0) {
          // Chat exists, update it
          const updatedChats = [...prevChats];
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            lastMessage: {
              content: message.content,
              sender: message.sender,
              timestamp: message.timestamp
            }
          };
          
          // Move this chat to the top of the list
          const movedChat = updatedChats.splice(chatIndex, 1)[0];
          return [movedChat, ...updatedChats];
        }
        
        return prevChats;
      });
      
      // Update unread count for this chat
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || 0) + 1
      }));
    };
    
    socket.on("newMessage", handleNewMessage);
    
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket]);
  
  const handleChatClick = (chatId) => {
    navigate(`/chat/${chatId}`);
  };
  
  const handleCreateChat = () => {
    // Navigate to a new screen to create a chat
    navigate('/contacts');
  };
  
  // Helper function to get the chat name based on participants
  const getChatName = (chat) => {
    if (!chat.participants || chat.participants.length === 0) {
      return "Unnamed Chat";
    }
    
    const userId = user?._id || user?.id;
    // Filter out the current user
    const otherParticipants = chat.participants.filter(p => {
      const participantId = p._id || p.id;
      return participantId !== userId;
    });
    
    if (otherParticipants.length === 0) {
      return "Only Me";
    } else if (otherParticipants.length === 1) {
      return otherParticipants[0].name;
    } else {
      return `${otherParticipants[0].name} and ${otherParticipants.length - 1} others`;
    }
  };
  
  // Helper function to get avatar for the chat
  const getChatAvatar = (chat) => {
    const userId = user?._id || user?.id;
    const otherParticipants = chat.participants.filter(p => {
      const participantId = p._id || p.id;
      return participantId !== userId;
    });
    
    if (otherParticipants.length === 0) {
      return null;
    }
    
    return otherParticipants[0];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 0 }}>
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: 'primary.main', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="h5" component="h2">Chats</Typography>
          <IconButton color="inherit" onClick={handleCreateChat}>
            <AddIcon />
          </IconButton>
        </Box>
        
        {error && (
          <Typography color="error" align="center" sx={{ my: 2 }}>
            {error}
          </Typography>
        )}
        
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {chats.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="subtitle1" color="textSecondary">
                No conversations yet
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Start a new conversation by clicking the + button
              </Typography>
            </Box>
          ) : (
            chats.map((chat, index) => {
              const avatar = getChatAvatar(chat);
              const unreadCount = unreadCounts[chat._id] || 0;
              
              return (
                <React.Fragment key={chat._id}>
                  <ListItem 
                    alignItems="flex-start" 
                    button 
                    onClick={() => handleChatClick(chat._id)}
                    sx={{ 
                      bgcolor: unreadCount > 0 ? 'action.hover' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        src={avatar?.profilePicture} 
                        alt={avatar?.name}
                        sx={{ 
                          bgcolor: chat.relatedSOS ? 'error.main' : 'primary.main'
                        }}
                      >
                        {avatar ? avatar.name.charAt(0) : "C"}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle1">
                            {getChatName(chat)}
                          </Typography>
                          {chat.lastMessage && (
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          {chat.lastMessage ? (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {(chat.lastMessage.sender._id === (user?._id || user?.id)) && "You: "}
                              <Typography
                                sx={{ display: 'inline' }}
                                component="span"
                                variant="body2"
                                color="text.primary"
                                noWrap
                              >
                                {chat.lastMessage.content.substring(0, 30)}
                                {chat.lastMessage.content.length > 30 ? '...' : ''}
                              </Typography>
                              {unreadCount > 0 && (
                                <Badge
                                  badgeContent={unreadCount}
                                  color="primary"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No messages yet
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < chats.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              );
            })
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default ChatList;