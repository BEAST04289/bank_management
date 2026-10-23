const router = require('express').Router();
const { executeWithAudit, queryWithAudit } = require('../db/pool');

// 1. KPI Analytics (Lab 6: Aggregations COUNT, SUM, AVG, MIN, MAX)
router.get('/kpi', async (req, res, next) => {
  try {
    const custRes = await executeWithAudit(
      'SELECT COUNT(*) AS total_customers FROM Customers',
      [],
      'Lab 6: COUNT(*) on Customers'
    );

    const accRes = await executeWithAudit(
      `SELECT COUNT(*) AS total_accounts,
              COALESCE(SUM(balance), 0) AS total_deposits,
              COALESCE(AVG(balance), 0) AS avg_balance,
              COALESCE(MIN(balance), 0) AS min_balance,
              COALESCE(MAX(balance), 0) AS max_balance
       FROM Accounts`,
      [],
      'Lab 6: Multi-Aggregation (COUNT, SUM, AVG, MIN, MAX) on Accounts'
    );

    const loanRes = await executeWithAudit(
      'SELECT COALESCE(SUM(amount), 0) AS total_loan_volume FROM Loan',
      [],
      'Lab 6: SUM(amount) on Loan'
    );

    const empRes = await executeWithAudit(
      'SELECT COUNT(*) AS total_employees FROM Employee',
      [],
      'Lab 6: COUNT(*) on Employee'
    );

    const kpi = {
      totalCustomers: custRes.rows[0].total_customers,
      totalAccounts: accRes.rows[0].total_accounts,
      totalDeposits: parseFloat(accRes.rows[0].total_deposits),
      avgBalance: parseFloat(accRes.rows[0].avg_balance),
      minBalance: parseFloat(accRes.rows[0].min_balance),
      maxBalance: parseFloat(accRes.rows[0].max_balance),
      totalLoanVolume: parseFloat(loanRes.rows[0].total_loan_volume),
      totalEmployees: empRes.rows[0].total_employees
    };

    res.json({
      success: true,
      kpi,
      sqlMeta: accRes.sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 2. Grouped Analytics (Lab 6: GROUP BY, HAVING, ORDER BY)
router.get('/grouped', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT account_type, branch_name, COUNT(*) AS count,
              ROUND(AVG(balance), 2) AS avg_bal,
              ROUND(SUM(balance), 2) AS total_bal
       FROM Accounts
       GROUP BY account_type, branch_name
       HAVING COUNT(*) >= 1
       ORDER BY total_bal DESC`,
      [],
      'Lab 6: GROUP BY account_type, branch_name HAVING COUNT(*) >= 1 ORDER BY total_bal DESC'
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 3. Top Depositors Leaderboard (Lab 6: ORDER BY, LIMIT)
router.get('/top-accounts', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT A.Account_id, A.Account_number, A.account_type, A.branch_name, A.balance,
              C.customer_id, C.First_name, C.Last_name, C.email
       FROM Accounts A
       INNER JOIN Customers C ON A.customer_id = C.customer_id
       ORDER BY A.balance DESC
       LIMIT 3`,
      [],
      'Lab 6: ORDER BY balance DESC LIMIT 3'
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 4. Lab 9: Database Views Explorer
router.get('/views/:viewName', async (req, res, next) => {
  try {
    const { viewName } = req.params;
    const allowedViews = {
      'High_Value_Customers': 'High_Value_Customers',
      'Account_Summary': 'Account_Summary',
      'Loan_Amortization_Schedule_View': 'Loan_Amortization_Schedule_View'
    };

    const targetView = allowedViews[viewName];
    if (!targetView) {
      return res.status(400).json({
        success: false,
        message: `Invalid view requested. Allowed: ${Object.keys(allowedViews).join(', ')}`
      });
    }

    const { rows, sqlMeta } = await queryWithAudit(
      `SELECT * FROM ${targetView}`,
      [],
      `Lab 9: Querying Database View (${targetView})`
    );

    res.json({ success: true, viewName: targetView, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 5. Lab 9: Updatable View Demonstration
router.put('/views/update-status', async (req, res, next) => {
  try {
    const { accountId, newStatus } = req.body;
    if (!accountId || !newStatus) {
      return res.status(400).json({ success: false, message: 'accountId and newStatus are required' });
    }

    const { rows, sqlMeta } = await executeWithAudit(
      `UPDATE Account_Summary SET status = ? WHERE Account_id = ?`,
      [newStatus, accountId],
      'Lab 9: DML through Updatable View (UPDATE Account_Summary)'
    );

    res.json({
      success: true,
      message: `Account #${accountId} status updated to '${newStatus}' directly through Account_Summary view.`,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
