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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
