const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { executeWithAudit, queryWithAudit, reconfigurePool, getConfig } = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'bankdb_secret_key_2026';

// 1. Employee Login
router.post('/login/employee', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows, sqlMeta } = await executeWithAudit(
      'SELECT employee_id, First_name, Last_name, email, role, branch_name, salary, password_hash FROM Employee WHERE email = ?',
      [email],
      'Lab 5: SELECT WHERE (Employee Authentication)'
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Employee account not found with this email.',
        sqlMeta
      });
    }

    const emp = rows[0];
    if (emp.password_hash !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Default demo password is "emp123".',
        sqlMeta
      });
    }

    const user = {
      id: emp.employee_id,
      name: `${emp.First_name} ${emp.Last_name}`,
      email: emp.email,
      role: emp.role,
      branch: emp.branch_name,
      type: 'employee'
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, user, token, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 2. Customer Login
router.post('/login/customer', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows, sqlMeta } = await executeWithAudit(
      'SELECT customer_id, First_name, Last_name, email, phone_number, kyc_status, password_hash FROM Customers WHERE email = ?',
      [email],
      'Lab 5: SELECT WHERE (Customer Authentication)'
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Customer not found with this email.',
        sqlMeta
      });
    }

    const cust = rows[0];
    if (cust.password_hash !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Default demo password is "cust123".',
        sqlMeta
      });
    }

    const user = {
      id: cust.customer_id,
      name: `${cust.First_name} ${cust.Last_name}`,
      email: cust.email,
      phone: cust.phone_number,
      kyc: cust.kyc_status,
      type: 'customer',
      role: 'Customer'
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, user, token, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 3. Dynamic Database Reconfiguration (Runtime Gear Modal)
router.post('/db-config', async (req, res, next) => {
  try {
    const { host, port, user, password, database } = req.body;
    const updateConfig = {};
    if (host) updateConfig.host = host;
    if (port) updateConfig.port = parseInt(port, 10);
    if (user) updateConfig.user = user;
    if (password !== undefined) updateConfig.password = password;
    if (database) updateConfig.database = database;

    await reconfigurePool(updateConfig);

    res.json({
      success: true,
      message: 'MySQL pool successfully reconnected to runtime configuration.',
      config: getConfig(),
      sqlMeta: {
        executedSql: `-- MySQL Pool Reconfigured to: ${updateConfig.user || 'user'}@${updateConfig.host || 'localhost'}:${updateConfig.port || 3306}/${updateConfig.database || 'BankDB'}`,
        labTag: 'Lab 10: Dynamic Database Connection Reconfiguration',
        durationMs: 1.2,
        rowCount: 1,
        timestamp: new Date().toLocaleTimeString()
      }
    });
  } catch (err) {
    next(err);
  }
});

// 4. Verify Active Token
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing Authorization Token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
});

// 5. Lab 10: SHOW GRANTS
router.get('/grants', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await queryWithAudit(
      'SHOW GRANTS FOR CURRENT_USER()',
      [],
      'Lab 10: DCL (SHOW GRANTS FOR CURRENT_USER)'
    );

    const grants = rows.map(r => Object.values(r)[0]);
    res.json({ success: true, grants, sqlMeta });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
