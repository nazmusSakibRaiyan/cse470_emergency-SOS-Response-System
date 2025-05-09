import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Avatar, 
  Divider, 
  Chip, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar,
  Card,
  CardContent,
  CardActions,
  CircularProgress
} from "@mui/material";
import { 
  Person as PersonIcon, 
  Notifications as NotificationsIcon, 
  Warning as WarningIcon,
  LocationOn as LocationIcon,
  Chat as ChatIcon,
  AssessmentOutlined as ReportIcon,
  People as PeopleIcon,
  ContactPhone as ContactIcon,
  Security as SecurityIcon
} from "@mui/icons-material";

const Dashboard = () => {
  const { user, token } = useAuth();
  const { respondingVolunteers, unreadNotifications } = useSocket();
  const navigate = useNavigate();
  
  const [activeSOSCases, setActiveSOSCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalSOSResolved: 0,
    activeVolunteers: 0,
    userContacts: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !token) return;
      
      try {
        setLoading(true);
        
        // Fetch recent notifications
        const notificationsResponse = await axios.get("http://localhost:5000/api/notifications/recent", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setNotifications(notificationsResponse.data.slice(0, 5)); // Get top 5 notifications
        
        // Fetch active SOS cases for volunteers
        if (user.role === "volunteer") {
          const sosResponse = await axios.get("http://localhost:5000/api/sos/active", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setActiveSOSCases(sosResponse.data);
        }
        
        // Fetch user stats
        const statsPromises = [
          axios.get("http://localhost:5000/api/sos/stats", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("http://localhost:5000/api/contacts/count", {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { count: 0 } }))
        ];
        
        const [sosStats, contactStats] = await Promise.all(statsPromises);
        
        setStats({
          totalSOSResolved: sosStats.data.resolved || 0,
          activeVolunteers: sosStats.data.activeVolunteers || 0,
          userContacts: contactStats.data.count || 0
        });
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user, token]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.name || "User"}!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Your personal safety dashboard - {new Date().toLocaleDateString()}
        </Typography>
      </Box>
      
      <Grid container spacing={4}>
        {/* User profile summary card */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Avatar 
                sx={{ width: 80, height: 80, mb: 2, bgcolor: 'primary.main' }}
                alt={user?.name}
                src={user?.profilePicture}
              >
                {user?.name ? user.name.charAt(0) : <PersonIcon />}
              </Avatar>
              <Typography variant="h6">{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Chip 
                label={user?.role === "admin" ? "Admin" : user?.role === "volunteer" ? "Volunteer" : "User"} 
                color={user?.role === "admin" ? "error" : user?.role === "volunteer" ? "secondary" : "primary"}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ mb: 1 }}
                component={Link}
                to="/profile"
              >
                View Profile
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Quick actions card */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <WarningIcon color="error" sx={{ fontSize: 40 }} />
                    <Typography variant="subtitle1" sx={{ mt: 1 }}>SOS Alert</Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      fullWidth
                      component={Link}
                      to="/alert"
                      color="error"
                    >
                      Send SOS
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <ChatIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="subtitle1" sx={{ mt: 1 }}>Messages</Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      fullWidth
                      component={Link}
                      to="/chat-list"
                      color="primary"
                    >
                      View Chats
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <ContactIcon color="secondary" sx={{ fontSize: 40 }} />
                    <Typography variant="subtitle1" sx={{ mt: 1 }}>Contacts</Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      fullWidth
                      component={Link}
                      to="/contact"
                      color="secondary"
                    >
                      Manage
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              {user?.role === "volunteer" && (
                <Grid item xs={6} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <LocationIcon color="success" sx={{ fontSize: 40 }} />
                      <Typography variant="subtitle1" sx={{ mt: 1 }}>Active SOS</Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        fullWidth
                        component={Link}
                        to="/active-sos"
                        color="success"
                      >
                        View
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              )}
              
              {user?.role === "admin" && (
                <>
                  <Grid item xs={6} sm={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <PeopleIcon sx={{ color: '#9c27b0', fontSize: 40 }} />
                        <Typography variant="subtitle1" sx={{ mt: 1 }}>Users</Typography>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          fullWidth
                          component={Link}
                          to="/user-management"
                          sx={{ color: '#9c27b0' }}
                        >
                          Manage
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <ReportIcon sx={{ color: '#ff9800', fontSize: 40 }} />
                        <Typography variant="subtitle1" sx={{ mt: 1 }}>Reports</Typography>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          fullWidth
                          component={Link}
                          to="/safety-reports"
                          sx={{ color: '#ff9800' }}
                        >
                          View
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
        </Grid>
        
        {/* Active SOS cases card (for volunteers) */}
        {user?.role === "volunteer" && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Active SOS Cases
                <Chip 
                  label={activeSOSCases.length} 
                  color="error" 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              </Typography>
              
              {activeSOSCases.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No active SOS cases at the moment
                  </Typography>
                </Box>
              ) : (
                <List>
                  {activeSOSCases.slice(0, 3).map((sos) => (
                    <ListItem 
                      key={sos._id} 
                      button 
                      onClick={() => navigate(`/sos/${sos._id}`)}
                      sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 1 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'error.main' }}>
                          <WarningIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={`Emergency from ${sos.user?.name || "Unknown User"}`} 
                        secondary={new Date(sos.createdAt).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                  
                  {activeSOSCases.length > 3 && (
                    <Button 
                      component={Link}
                      to="/active-sos" 
                      fullWidth
                      sx={{ mt: 1 }}
                    >
                      View All ({activeSOSCases.length})
                    </Button>
                  )}
                </List>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Recent notifications card */}
        <Grid item xs={12} md={user?.role === "volunteer" ? 6 : 8}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Notifications
              {unreadNotifications > 0 && (
                <Chip 
                  label={unreadNotifications} 
                  color="primary" 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            
            {notifications.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No recent notifications
                </Typography>
              </Box>
            ) : (
              <List>
                {notifications.map((notification) => (
                  <ListItem 
                    key={notification._id} 
                    button
                    sx={{ 
                      bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                      mb: 1,
                      borderRadius: 1
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: notification.type === 'SOS' ? 'error.main' : 'primary.main' }}>
                        {notification.type === 'SOS' ? <WarningIcon /> : <NotificationsIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={notification.title} 
                      secondary={
                        <>
                          {notification.message}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {new Date(notification.createdAt).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
                
                <Button 
                  component={Link}
                  to="/notifications" 
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  View All Notifications
                </Button>
              </List>
            )}
          </Paper>
        </Grid>
        
        {/* Statistics cards */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <SecurityIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h4">{stats.totalSOSResolved}</Typography>
                <Typography variant="body1" color="text.secondary">
                  SOS Cases Resolved
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <PeopleIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4">{stats.activeVolunteers}</Typography>
                <Typography variant="body1" color="text.secondary">
                  Active Volunteers
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <ContactIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h4">{stats.userContacts}</Typography>
                <Typography variant="body1" color="text.secondary">
                  Emergency Contacts
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
