import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Stack,
  Card,
  CardContent,
  CardActions
} from "@mui/material";
import {
  Close as CloseIcon,
  Navigation as NavigationIcon,
  AccessTime as AccessTimeIcon,
  PersonPin as PersonPinIcon,
  MyLocation as MyLocationIcon
} from "@mui/icons-material";

// You'll need to install these packages:
// npm install leaflet react-leaflet

const NearbySOSMap = () => {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [sosAlerts, setSOSAlerts] = useState([]);
  const [selectedSOS, setSelectedSOS] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  
  // This would be replaced with actual map markers when the real map is loaded
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Get user's location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Could not access your location. Please enable location services.");
      }
    );
  }, []);

  useEffect(() => {
    if (!token || !user || user.role !== "volunteer") {
      toast.error("You need to be logged in as a volunteer to access this page.");
      navigate("/");
      return;
    }

    const fetchActiveSOSAlerts = async () => {
      try {
        setLoading(true);
        
        const response = await fetch("http://localhost:5000/api/sos/active", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch active SOS alerts");
        }

        const data = await response.json();
        setSOSAlerts(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching SOS alerts:", error);
        toast.error("Failed to load SOS alerts");
        setLoading(false);
      }
    };

    fetchActiveSOSAlerts();

    // Listen for new SOS alerts
    if (socket) {
      socket.on("newSOS", (data) => {
        toast.success("New SOS alert received!", {
          icon: "🚨",
        });
        setSOSAlerts((prevAlerts) => [data, ...prevAlerts]);
      });

      socket.on("sosResolved", ({ sosId }) => {
        setSOSAlerts((prevAlerts) => 
          prevAlerts.filter((alert) => alert._id !== sosId)
        );
        
        if (selectedSOS && selectedSOS._id === sosId) {
          setSelectedSOS(null);
          setDrawerOpen(false);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("newSOS");
        socket.off("sosResolved");
      }
    };
  }, [token, user, socket, navigate, selectedSOS]);

  // For demonstration: this would be replaced with actual map initialization
  useEffect(() => {
    if (userLocation && !mapInitialized) {
      // In a real implementation, this is where you'd initialize the map
      // using libraries like Leaflet or Google Maps
      
      // Simulate map loading
      setTimeout(() => {
        setMapReady(true);
        setMapInitialized(true);
        setLoading(false);
      }, 1500);
    }
  }, [userLocation, mapInitialized]);

  const handleSOSClick = (sos) => {
    setSelectedSOS(sos);
    setDrawerOpen(true);
  };

  const handleAcceptSOS = async () => {
    if (!selectedSOS) return;

    try {
      const response = await fetch("http://localhost:5000/api/sos/acceptSOS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sosId: selectedSOS._id, userId: user._id })
      });

      if (!response.ok) {
        throw new Error("Failed to accept SOS");
      }

      toast.success("You have accepted this SOS alert");
      
      // Start location tracking and navigate to SOS detail page
      navigate(`/sos/${selectedSOS._id}`);
    } catch (error) {
      console.error("Error accepting SOS:", error);
      toast.error("Failed to accept SOS alert");
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1); // Distance in km
  };

  // This would normally be handled by the map library
  const renderMockMap = () => {
    if (!userLocation) return null;
    
    return (
      <Paper 
        elevation={3}
        sx={{
          height: 'calc(100vh - 180px)',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#b3d1ff',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Mock map content */}
        <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
          <Button 
            variant="contained" 
            startIcon={<MyLocationIcon />}
            size="small"
          >
            Center Map
          </Button>
        </Box>
        
        <Box sx={{ textAlign: 'center', maxWidth: '80%' }}>
          <Typography variant="h6" gutterBottom>
            Map View Prototype
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Your location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
          </Typography>
          
          <Box sx={{ my: 2 }}>
            <PersonPinIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="caption" display="block">Your Position</Typography>
          </Box>
          
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
            {sosAlerts.map((sos, index) => (
              <Box key={sos._id || index} sx={{ textAlign: 'center' }}>
                <IconButton 
                  color="error" 
                  sx={{ 
                    bgcolor: 'rgba(255,0,0,0.1)', 
                    '&:hover': { bgcolor: 'rgba(255,0,0,0.2)' } 
                  }}
                  onClick={() => handleSOSClick(sos)}
                >
                  <NavigationIcon fontSize="large" />
                </IconButton>
                <Typography variant="caption" display="block">
                  {userLocation && sos.coordinates ? 
                    `${calculateDistance(
                      userLocation.latitude, 
                      userLocation.longitude, 
                      sos.coordinates.latitude, 
                      sos.coordinates.longitude
                    )} km` : 'Unknown'}
                </Typography>
              </Box>
            ))}
          </Stack>
          
          <Typography variant="body2">
            In the actual implementation, this would be an interactive map showing your location
            and nearby SOS alerts. Click on the red markers above to see details of mock SOS alerts.
          </Typography>
        </Box>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Nearby SOS Alerts
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        View and respond to nearby emergency alerts on the map
      </Typography>

      {sosAlerts.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No active SOS alerts nearby
          </Typography>
          <Typography variant="body1" color="text.secondary">
            When someone in your area sends an emergency alert, it will appear on this map
          </Typography>
        </Paper>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Chip 
              color="error" 
              label={`${sosAlerts.length} Active Alert${sosAlerts.length > 1 ? 's' : ''}`} 
            />
          </Box>
          
          {/* This would be replaced with an actual map component in production */}
          {renderMockMap()}
          
          {/* List of SOS alerts for easier access */}
          <Paper elevation={2} sx={{ mt: 3, p: 0, overflow: 'hidden' }}>
            <List sx={{ p: 0 }}>
              {sosAlerts.map((sos, index) => (
                <React.Fragment key={sos._id || index}>
                  <ListItem 
                    button 
                    onClick={() => handleSOSClick(sos)}
                    sx={{ 
                      py: 2,
                      backgroundColor: selectedSOS && selectedSOS._id === sos._id ? 'rgba(255, 0, 0, 0.05)' : 'transparent'
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1">
                          Emergency from {sos.user?.name || "Unknown User"}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            {sos.message || "Emergency assistance needed"}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                            <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(sos.createdAt).toLocaleString()}
                            </Typography>
                            {userLocation && sos.coordinates && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                {calculateDistance(
                                  userLocation.latitude, 
                                  userLocation.longitude, 
                                  sos.coordinates.latitude, 
                                  sos.coordinates.longitude
                                )} km away
                              </Typography>
                            )}
                          </Box>
                        </>
                      }
                    />
                    <Button 
                      variant="contained" 
                      color="error" 
                      size="small"
                      sx={{ ml: 2 }}
                    >
                      View
                    </Button>
                  </ListItem>
                  {index < sosAlerts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </>
      )}

      {/* SOS Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 } }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Emergency Details
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          {selectedSOS && (
            <Box>
              <Card variant="outlined" sx={{ mb: 3, bgcolor: 'error.soft', borderColor: 'error.main' }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    From: {selectedSOS.user?.name || "Unknown User"}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedSOS.message || "Emergency assistance needed"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sent at {new Date(selectedSOS.createdAt).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              
              <Typography variant="subtitle2" gutterBottom>
                Location Details
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                {selectedSOS.coordinates ? (
                  <>
                    <Typography variant="body2">
                      Coordinates: {selectedSOS.coordinates.latitude.toFixed(6)}, {selectedSOS.coordinates.longitude.toFixed(6)}
                    </Typography>
                    
                    {userLocation && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Approximately {calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          selectedSOS.coordinates.latitude,
                          selectedSOS.coordinates.longitude
                        )} km from your location
                      </Typography>
                    )}
                    
                    <Button
                      variant="outlined"
                      startIcon={<NavigationIcon />}
                      fullWidth
                      sx={{ mt: 2 }}
                      component="a"
                      href={`https://www.google.com/maps?q=${selectedSOS.coordinates.latitude},${selectedSOS.coordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View in Google Maps
                    </Button>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No location information available
                  </Typography>
                )}
              </Paper>
              
              <Button
                variant="contained"
                color="error"
                fullWidth
                size="large"
                onClick={handleAcceptSOS}
                sx={{ mb: 2 }}
              >
                Accept & Respond
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setDrawerOpen(false)}
              >
                Close
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </Container>
  );
};

export default NearbySOSMap;