const express = require('express');
const mongoose = require('mongoose');
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import cors from "cors";
require('dotenv').config();
const cors = require('cors');


dotenv.config();

const app = express();

app.use(express.json());
app.use(cors())
app.use('/api/auth', authRoutes);
mongoose.connect(process.env.MONGO_URI,
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("Failed to connect to MongoDB", err);
});

app.get('/', (req, res) => {
    res.json({ message: 'Hello from server!' });

  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
