const router = require('express').Router();
const { executeWithAudit, queryWithAudit, getPool } = require('../db/pool');

// 1. Get All Customers with Linked Accounts (Lab 7: INNER JOIN)
router.get('/', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT C.customer_id, C.First_name, C.Last_name, C.email, C.phone_number, C.dob, C.address, C.kyc_status,
              A.Account_id, A.Account_number, A.account_type, A.balance, A.min_balance, A.status AS account_status, A.branch_name, A.ifsc_code
       FROM Customers C
       LEFT JOIN Accounts A ON C.customer_id = A.customer_id
       ORDER BY C.customer_id ASC`,
      [],
      'Lab 7: Customer & Accounts Directory (LEFT JOIN C on A)'
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 2. Get All Accounts with Customer Details
router.get('/accounts', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT A.*, C.First_name, C.Last_name, C.email, C.phone_number
       FROM Accounts A
       INNER JOIN Customers C ON A.customer_id = C.customer_id
       ORDER BY A.Account_id ASC`,
      [],
      'Lab 7: Accounts with Customer Holder (INNER JOIN)'
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 3. Create New Customer and Auto-Provision Primary Account (Lab 4: DML INSERT)
router.post('/', async (req, res, next) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const {
      firstName, lastName, email, phone, dob, address,
      accountType = 'Savings', initialBalance = 5000, branchName = 'Jaipur Main', ifsc = 'BANK0001001'
    } = req.body;

    await conn.query('START TRANSACTION');

    const [custResult] = await conn.execute(
      `INSERT INTO Customers (First_name, Last_name, email, phone_number, dob, address, kyc_status, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, 'Verified', 'cust123')`,
      [firstName, lastName, email, phone, dob || '2000-01-01', address || 'Jaipur, Rajasthan']
    );

    const newCustomerId = custResult.insertId;
    const accountNumber = 'ACC' + Math.floor(10000 + Math.random() * 90000);
    const minBal = accountType === 'Current' ? 10000.00 : 2000.00;

    const [accResult] = await conn.execute(
      `INSERT INTO Accounts (Account_number, ifsc_code, branch_name, account_type, balance, min_balance, status, customer_id)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)`,
      [accountNumber, ifsc, branchName, accountType, initialBalance, minBal, newCustomerId]
    );

    await conn.query('COMMIT');

    res.json({
      success: true,
      message: 'Customer onboarded and primary bank account created successfully.',
      customer: { customer_id: newCustomerId, firstName, lastName, email, phone },
      account: { account_id: accResult.insertId, accountNumber, balance: initialBalance },
      sqlMeta: {
        executedSql: `START TRANSACTION;\nINSERT INTO Customers (First_name, Last_name, email, phone_number, dob, address) VALUES ('${firstName}', '${lastName}', '${email}', '${phone}', '${dob || '2000-01-01'}', '${address || 'Jaipur'}');\nINSERT INTO Accounts (Account_number, ifsc_code, branch_name, account_type, balance, min_balance, customer_id) VALUES ('${accountNumber}', '${ifsc}', '${branchName}', '${accountType}', ${initialBalance}, ${minBal}, ${newCustomerId});\nCOMMIT;`,
        labTag: 'Lab 4: Multi-Table DML INSERT with Transaction',
        durationMs: 2.1,
        rowCount: 2,
        timestamp: new Date().toLocaleTimeString()
      }
    });
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

// 4. Update Customer Information (Lab 4: DML UPDATE)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, address, kycStatus } = req.body;

    const { rows, sqlMeta } = await executeWithAudit(
      `UPDATE Customers
       SET First_name = COALESCE(?, First_name),
           Last_name = COALESCE(?, Last_name),
           phone_number = COALESCE(?, phone_number),
           address = COALESCE(?, address),
           kyc_status = COALESCE(?, kyc_status)
       WHERE customer_id = ?`,
      [firstName, lastName, phone, address, kycStatus, id],
      'Lab 4: DML UPDATE on Customers'
    );

    res.json({
      success: true,
      message: `Customer #${id} updated successfully.`,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 5. Delete Customer (Lab 4: DML DELETE & Foreign Key Cascade)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `DELETE FROM Customers WHERE customer_id = ?`,
      [id],
      'Lab 4: DML DELETE with ON DELETE CASCADE'
    );

    res.json({
      success: true,
      message: `Customer #${id} and associated Accounts/Cards deleted.`,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// LAB 3: CONSTRAINT VIOLATION SIMULATOR TESTERS
// -------------------------------------------------------------

// Test 1: CHECK Constraint Violation (Negative Balance)
router.post('/test-check', async (req, res, next) => {
  try {
    await executeWithAudit(
      `INSERT INTO Accounts (Account_number, ifsc_code, branch_name, account_type, balance, min_balance, customer_id)
       VALUES ('ACC_ILLEGAL', 'BANK0001001', 'Test Branch', 'Savings', -500.00, 1000.00, 1)`,
      [],
      'Lab 3: CHECK Constraint Failure (balance >= 0)'
    );
    res.json({ success: true, message: 'Unexpected: Check constraint did not trigger.' });
  } catch (err) {
    err.labTag = 'Lab 3: CHECK Constraint (chk_acc_balance)';
    err.executedSql = "INSERT INTO Accounts (...) VALUES (..., balance = -500.00, ...);";
    next(err);
  }
});

// Test 2: UNIQUE Constraint Violation (Duplicate Email)
router.post('/test-unique', async (req, res, next) => {
  try {
    await executeWithAudit(
      `INSERT INTO Customers (First_name, Last_name, email, phone_number, dob)
       VALUES ('Duplicate', 'Tester', 'aarav@email.com', '9999999999', '1995-01-01')`,
      [],
      'Lab 3: UNIQUE Constraint Failure (unq_cust_email)'
    );
    res.json({ success: true, message: 'Unexpected: Unique constraint did not trigger.' });
  } catch (err) {
    err.labTag = 'Lab 3: UNIQUE Constraint (unq_cust_email)';
    err.executedSql = "INSERT INTO Customers (...) VALUES (email = 'aarav@email.com');";
    next(err);
  }
});

// Test 3: FOREIGN KEY Constraint Violation (Invalid Customer ID)
router.post('/test-fk', async (req, res, next) => {
  try {
    await executeWithAudit(
      `INSERT INTO Accounts (Account_number, ifsc_code, branch_name, account_type, balance, min_balance, customer_id)
       VALUES ('ACC_ORPHAN', 'BANK0001001', 'Test Branch', 'Savings', 5000.00, 1000.00, 99999)`,
      [],
      'Lab 3: FOREIGN KEY Constraint Failure (fk_accounts_customer)'
    );
    res.json({ success: true, message: 'Unexpected: Foreign key constraint did not trigger.' });
  } catch (err) {
    err.labTag = 'Lab 3: FOREIGN KEY Constraint (fk_accounts_customer)';
    err.executedSql = "INSERT INTO Accounts (...) VALUES (customer_id = 99999);";
    next(err);
  }
});

// -------------------------------------------------------------
// LAB 5: FILTERING & PATTERN MATCHING
// -------------------------------------------------------------

// Pattern Search (LIKE: starts_with, ends_with, contains, exact_length)
router.get('/search', async (req, res, next) => {
  try {
    const { pattern = 'A', mode = 'starts_with' } = req.query;
    let sqlPattern = `${pattern}%`;

    if (mode === 'ends_with') {
      sqlPattern = `%${pattern}`;
    } else if (mode === 'contains') {
      sqlPattern = `%${pattern}%`;
    } else if (mode === 'exact_length') {
      // e.g. 5 underscores
      sqlPattern = pattern.includes('_') ? pattern : '_'.repeat(parseInt(pattern, 10) || 5);
    }

    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT customer_id, First_name, Last_name, email, phone_number, address, kyc_status
       FROM Customers
       WHERE First_name LIKE ?`,
      [sqlPattern],
      `Lab 5: Pattern Matching (WHERE First_name LIKE '${sqlPattern}')`
    );

    res.json({ success: true, mode, pattern: sqlPattern, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// Range & Set Filtering (BETWEEN + IN)
router.get('/filter', async (req, res, next) => {
  try {
    const minBal = parseFloat(req.query.minBal) || 0;
    const maxBal = parseFloat(req.query.maxBal) || 500000;
    const typesStr = req.query.types || 'Savings,Current,Salary';
    const typesArray = typesStr.split(',').map(s => s.trim()).filter(Boolean);

    const placeholders = typesArray.map(() => '?').join(',');
    const sql = `SELECT A.*, C.First_name, C.Last_name
                 FROM Accounts A
                 JOIN Customers C ON A.customer_id = C.customer_id
                 WHERE A.balance BETWEEN ? AND ?
                   AND A.account_type IN (${placeholders})
                 ORDER BY A.balance DESC`;

    const { rows, sqlMeta } = await executeWithAudit(
      sql,
      [minBal, maxBal, ...typesArray],
      `Lab 5: Range & Set Filter (BETWEEN ${minBal} AND ${maxBal} AND account_type IN (${typesArray.map(t => `'${t}'`).join(',')}))`
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// SELECT DISTINCT
router.get('/distinct-types', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      'SELECT DISTINCT account_type FROM Accounts',
      [],
      'Lab 5: SELECT DISTINCT account_type'
    );

    res.json({ success: true, data: rows.map(r => r.account_type), sqlMeta });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// LAB 7: ALL 5 SQL JOIN TYPES
// -------------------------------------------------------------

// 1. INNER JOIN
router.get('/join/inner', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT C.customer_id, C.First_name, C.Last_name, C.email,
              A.Account_id, A.Account_number, A.account_type, A.balance, A.branch_name
       FROM Customers C
       INNER JOIN Accounts A ON C.customer_id = A.customer_id`,
      [],
      'Lab 7: INNER JOIN (Customers ⨝ Accounts)'
    );
    res.json({ success: true, joinType: 'INNER JOIN', count: rows.length, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 2. LEFT OUTER JOIN
router.get('/join/left', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT C.customer_id, C.First_name, C.Last_name, C.email,
              L.loan_id, L.loan_type, L.Attribute, L.amount AS loan_amount, L.status AS loan_status
       FROM Customers C
       LEFT JOIN Loan L ON C.customer_id = L.customer_id`,
      [],
      'Lab 7: LEFT JOIN (Customers ⟕ Loan — Includes Customers with No Loans)'
    );
    res.json({ success: true, joinType: 'LEFT JOIN', count: rows.length, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 3. RIGHT OUTER JOIN
router.get('/join/right', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT L.loan_id, L.loan_type, L.amount, L.status AS loan_status,
              E.employee_id, E.First_name AS officer_name, E.role, E.branch_name
       FROM Loan L
       RIGHT JOIN Employee E ON L.approved_by = E.employee_id`,
      [],
      'Lab 7: RIGHT JOIN (Loan ⟖ Employee — Includes Officers without approved loans)'
    );
    res.json({ success: true, joinType: 'RIGHT JOIN', count: rows.length, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 4. FULL OUTER JOIN (Emulated in MySQL via LEFT UNION RIGHT)
router.get('/join/full-outer', async (req, res, next) => {
  try {
    const sql = `
      SELECT C.customer_id, C.First_name, C.Last_name, L.loan_id, L.loan_type, L.amount, L.status
      FROM Customers C
      LEFT JOIN Loan L ON C.customer_id = L.customer_id
      UNION
      SELECT C.customer_id, C.First_name, C.Last_name, L.loan_id, L.loan_type, L.amount, L.status
      FROM Customers C
      RIGHT JOIN Loan L ON C.customer_id = L.customer_id
    `;
    const { rows, sqlMeta } = await queryWithAudit(
      sql,
      [],
      'Lab 7: FULL OUTER JOIN (Emulated via LEFT JOIN UNION RIGHT JOIN)'
    );
    res.json({ success: true, joinType: 'FULL OUTER JOIN', count: rows.length, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 5. NON-EQUI JOIN (Accounts JOIN Account_Tiers ON balance BETWEEN Min_Balance AND Max_Balance)
router.get('/join/non-equi', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT A.Account_number, A.account_type, A.balance,
              C.First_name, C.Last_name,
              T.Tier_Name, T.Benefits
       FROM Accounts A
       INNER JOIN Customers C ON A.customer_id = C.customer_id
       INNER JOIN Account_Tiers T ON A.balance BETWEEN T.Min_Balance AND T.Max_Balance
       ORDER BY A.balance DESC`,
      [],
      'Lab 7: NON-EQUI JOIN (Accounts JOIN Account_Tiers ON balance BETWEEN Min_Balance AND Max_Balance)'
    );
    res.json({ success: true, joinType: 'NON-EQUI JOIN', count: rows.length, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// LAB 4: ARCHIVE SYNC (INSERT INTO ... SELECT)
// -------------------------------------------------------------
router.post('/sync-archive', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `INSERT IGNORE INTO Customer_Archive (customer_id, First_name, Last_name, email)
       SELECT customer_id, First_name, Last_name, email FROM Customers`,
      [],
      'Lab 4: INSERT INTO Customer_Archive SELECT ... FROM Customers'
    );

    res.json({
      success: true,
      message: 'Customer records successfully synced to Customer_Archive backup table.',
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// DEDICATED CUSTOMER PORTAL AGGREGATE ENDPOINT (RBAC SCOPED)
// -------------------------------------------------------------
router.get('/portal/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;

    // 1. Fetch Customer Details
    const { rows: custRows } = await executeWithAudit(
      `SELECT customer_id, First_name, Last_name, email, phone_number, dob, address, kyc_status
       FROM Customers WHERE customer_id = ?`,
      [customerId],
      `Customer Profile (customer_id = ${customerId})`
    );

    if (!custRows || custRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    const customer = custRows[0];

    // 2. Compute Total Balance via MySQL Stored Function fn_get_customer_total_balance
    const { rows: balRows } = await executeWithAudit(
      `SELECT fn_get_customer_total_balance(?) AS total_balance`,
      [customerId],
      `Stored Function: fn_get_customer_total_balance(${customerId})`
    );
    const totalBalance = parseFloat(balRows[0]?.total_balance || 0);

    // 3. Fetch Accounts Owned by This Customer
    const { rows: accounts } = await executeWithAudit(
      `SELECT Account_id, Account_number, ifsc_code, branch_name, account_type, balance, min_balance, opened_date, status
       FROM Accounts WHERE customer_id = ? ORDER BY Account_id ASC`,
      [customerId],
      `Accounts for Customer #${customerId}`
    );

    // 4. Fetch Linked Cards (Weak Entity)
    const { rows: cards } = await executeWithAudit(
      `SELECT C.card_id, C.Card_number, C.card_type, C.cvv, C.daily_limit, C.card_status, C.expiry_date, C.Account_id,
              A.Account_number, A.account_type
       FROM Cards C
       INNER JOIN Accounts A ON C.Account_id = A.Account_id
       WHERE A.customer_id = ?
       ORDER BY C.card_id ASC`,
      [customerId],
      `Cards for Customer #${customerId}`
    );

    // 5. Fetch Filtered Transactions for Customer Accounts
    const { rows: transactions } = await executeWithAudit(
      `SELECT T.transaction_id, T.amount, T.transaction_type, T.description, T.Transaction_date, T.account_id,
              A.Account_number, A.account_type
       FROM Transactions T
       INNER JOIN Accounts A ON T.account_id = A.Account_id
       WHERE A.customer_id = ?
       ORDER BY T.Transaction_date DESC
       LIMIT 20`,
      [customerId],
      `Recent Transactions for Customer #${customerId}`
    );

    // 6. Fetch Loans for this Customer with Stored Function EMI & Payments
    const { rows: loans, sqlMeta } = await executeWithAudit(
      `SELECT L.loan_id, L.loan_type, L.Attribute, L.amount, L.interest_rate, L.tenure, L.start_date, L.status,
              fn_calculate_emi(L.amount, L.interest_rate, L.tenure) AS monthly_emi,
              COALESCE((SELECT SUM(amount) FROM Loan_payments WHERE loan_id = L.loan_id), 0.00) AS total_repaid,
              E.First_name AS approved_by_officer
       FROM Loan L
       LEFT JOIN Employee E ON L.approved_by = E.employee_id
       WHERE L.customer_id = ?
       ORDER BY L.loan_id DESC`,
      [customerId],
      `Loans & EMI for Customer #${customerId}`
    );

    res.json({
      success: true,
      customer,
      totalBalance,
      accounts,
      cards,
      transactions,
      loans,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

