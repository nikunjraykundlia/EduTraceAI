require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allowed origins for development and production
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3001',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://127.0.0.1:3001',
      'https://edutrace-ai.onrender.com',
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));

// Basic route
app.get('/', (req, res) => {
  res.send('Smart-Quiz API is running...');
});

// Routes will go here
app.use('/api/auth', require('./routes/auth'));
app.use('/api/personal', require('./routes/personal'));
app.use('/api/classroom', require('./routes/classroom'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/coins', require('./routes/coins'));
app.use('/api/store', require('./routes/store'));
app.use('/api/transcription', require('./routes/transcription'));

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Increase server timeout to 10 minutes for heavy AI processing
server.timeout = 600000;
