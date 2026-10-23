require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./db/initSchema');
const mysqlErrorHandler = require('./middleware/mysqlErrorHandler');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'BankDB API Server', time: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/customers', require('./routes/customerAccountRoutes'));
app.use('/api/cards', require('./routes/cardRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/admin', require('./routes/adminLabRoutes'));

// Global MySQL Error Handler (Must be mounted last)
app.use(mysqlErrorHandler);

const PORT = process.env.PORT || 5000;

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🏦 BankDB Express API Server listening on port ${PORT}`);
    console.log(`📡 Ready to stream SQL telemetry to React frontend`);
  });
}).catch(err => {
  console.error('Fatal initialization error:', err);
});
