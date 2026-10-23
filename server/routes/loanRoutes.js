const router = require('express').Router();
const { executeWithAudit, queryWithAudit } = require('../db/pool');

// 1. Get All Loans with Customer and Approving Officer Info (Lab 7: JOIN)
router.get('/', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT L.loan_id, L.loan_type, L.Attribute, L.amount, L.interest_rate, L.tenure, L.start_date, L.status,
              C.customer_id, C.First_name, C.Last_name, C.email, C.phone_number,
              E.employee_id, E.First_name AS officer_fname, E.Last_name AS officer_lname
       FROM Loan L
       INNER JOIN Customers C ON L.customer_id = C.customer_id
       LEFT JOIN Employee E ON L.approved_by = E.employee_id
       ORDER BY L.loan_id DESC`,
      [],
      'Lab 7: Query Loans Joined with Customers and Approving Officer'
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 2. Apply for New Loan (Lab 4: DML INSERT with CHECK constraints)
router.post('/', async (req, res, next) => {
  try {
    const {
      customerId, loanType = 'Personal Loan', attribute = 'Unsecured',
      amount, interestRate = 10.5, tenure = 24
    } = req.body;

    const numAmount = parseFloat(amount);
    const numRate = parseFloat(interestRate);
    const numTenure = parseInt(tenure, 10);

    const { rows, sqlMeta } = await executeWithAudit(
      `INSERT INTO Loan (loan_type, Attribute, amount, interest_rate, tenure, status, customer_id, approved_by)
       VALUES (?, ?, ?, ?, ?, 'Pending', ?, NULL)`,
      [loanType, attribute, numAmount, numRate, numTenure, customerId],
      `Lab 4: INSERT Loan Application (Subject to chk_loan_amount & chk_loan_interest)`
    );

    res.json({
      success: true,
      message: 'Loan application submitted successfully in Pending status.',
      loanId: rows.insertId,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 3. Approve Loan
router.put('/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvedBy = 2 } = req.body;

    const { rows, sqlMeta } = await executeWithAudit(
      `UPDATE Loan SET status = 'Approved', approved_by = ? WHERE loan_id = ?`,
      [approvedBy, id],
      `Lab 4: Loan Underwriting Approval (UPDATE Loan SET status='Approved')`
    );

    res.json({ success: true, message: `Loan #${id} approved by Officer #${approvedBy}.`, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 4. Reject Loan
router.put('/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `UPDATE Loan SET status = 'Rejected' WHERE loan_id = ?`,
      [id],
      `Lab 4: Loan Underwriting Rejection (UPDATE Loan SET status='Rejected')`
    );

    res.json({ success: true, message: `Loan #${id} marked as Rejected.`, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 5. Get Installments / Payments for a Loan (Weak Entity Query)
router.get('/:id/payments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT LP.*, A.Account_number
       FROM Loan_payments LP
       LEFT JOIN Accounts A ON LP.account_id = A.Account_id
       WHERE LP.loan_id = ?
       ORDER BY LP.payment_date DESC, LP.payment_id DESC`,
      [id],
      `Lab 1 & 7: Query Weak Entity Loan_payments for Loan #${id}`
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 6. View Amortization Schedule for Loan (Lab 9 View)
router.get('/:id/amortization', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT * FROM Loan_Amortization_Schedule_View WHERE loan_id = ?`,
      [id],
      `Lab 9: Query Loan_Amortization_Schedule_View for Loan #${id}`
    );

    res.json({ success: true, data: rows[0] || null, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 7. Pay EMI Installment (Calls Stored Procedure sp_pay_loan_installment)
router.post('/:id/pay-emi', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accountId, amount, processedBy = 1 } = req.body;

    const { rows, sqlMeta } = await queryWithAudit(
      `CALL sp_pay_loan_installment(?, ?, ?, ?)`,
      [parseInt(id, 10), parseInt(accountId, 10), parseFloat(amount), parseInt(processedBy, 10)],
      `Lab 12: CALL sp_pay_loan_installment(loan_id=${id}, account_id=${accountId}, amount=${amount})`
    );

    res.json({
      success: true,
      message: `EMI Payment of ₹${amount} applied to Loan #${id} from Account #${accountId}.`,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 8. Stored Function: Calculate EMI (Additional Experiment 1: fn_calculate_emi)
router.get('/calculate-emi', async (req, res, next) => {
  try {
    const { principal = 500000, rate = 9.5, tenure = 36 } = req.query;

    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT fn_calculate_emi(?, ?, ?) AS calculated_emi`,
      [parseFloat(principal), parseFloat(rate), parseInt(tenure, 10)],
      `Additional Exp 1: SELECT fn_calculate_emi(${principal}, ${rate}, ${tenure})`
    );

    res.json({
      success: true,
      principal: parseFloat(principal),
      rate: parseFloat(rate),
      tenure: parseInt(tenure, 10),
      emi: parseFloat(rows[0].calculated_emi),
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 9. Stored Function: Customer Total Balance (Additional Experiment 1: fn_get_customer_total_balance)
router.get('/customer-balance/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT fn_get_customer_total_balance(?) AS total_balance`,
      [customerId],
      `Additional Exp 1: SELECT fn_get_customer_total_balance(${customerId})`
    );

    res.json({
      success: true,
      customerId,
      totalBalance: parseFloat(rows[0].total_balance),
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// LAB 8: ADVANCED SUBQUERY EXPLORER (ALL 6 TYPES)
// -------------------------------------------------------------

// Subquery 1: Scalar Subquery - Second Highest Balance
router.get('/subquery/second-highest', async (req, res, next) => {
  try {
    const sql = `
      SELECT A.*, C.First_name, C.Last_name
      FROM Accounts A
      JOIN Customers C ON A.customer_id = C.customer_id
      WHERE A.balance = (
        SELECT MAX(balance)
        FROM Accounts
        WHERE balance < (SELECT MAX(balance) FROM Accounts)
      )
    `;
    const { rows, sqlMeta } = await executeWithAudit(
      sql,
      [],
      'Lab 8: Scalar Subquery (Find Account with 2nd Highest Balance)'
    );

    res.json({ success: true, title: '2nd Highest Balance (Nested Scalar Subquery)', data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// Subquery 2: Scalar Subquery - Above Average Balance
router.get('/subquery/above-average', async (req, res, next) => {
  try {
    const sql = `
      SELECT A.*, C.First_name, C.Last_name
      FROM Accounts A
      JOIN Customers C ON A.customer_id = C.customer_id
      WHERE A.balance > (SELECT AVG(balance) FROM Accounts)
      ORDER BY A.balance DESC
    `;
    const { rows, sqlMeta } = await executeWithAudit(
      sql,
      [],
      'Lab 8: Scalar Subquery with Aggregate (balance > AVG(balance))'
    );

    res.json({ success: true, title: 'Above Average Balance (Scalar AVG Subquery)', data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// Subquery 3: Multi-Row Subquery with IN - Customers with Pending Loans
router.get('/subquery/pending-loan-customers', async (req, res, next) => {
  try {
    const sql = `
      SELECT customer_id, First_name, Last_name, email, phone_number
      FROM Customers
      WHERE customer_id IN (
        SELECT customer_id FROM Loan WHERE status = 'Pending'
      )
    `;
    const { rows, sqlMeta } = await executeWithAudit(
      sql,
      [],
      'Lab 8: Multi-Row IN Subquery (WHERE customer_id IN (SELECT ... WHERE status="Pending"))'
    );

    res.json({ success: true, title: 'Customers with Pending Loans (IN Subquery)', data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// Subquery 4: Multi-Row Subquery with ALL - Balance Greater than ALL Salary Accounts
router.get('/subquery/above-all-salary', async (req, res, next) => {
  try {
    const sql = `
      SELECT A.Account_number, A.account_type, A.balance, C.First_name, C.Last_name
      FROM Accounts A
      JOIN Customers C ON A.customer_id = C.customer_id
      WHERE A.balance > ALL (
        SELECT balance FROM Accounts WHERE account_type = 'Salary'
      )
      ORDER BY A.balance DESC
    `;
    const { rows, sqlMeta } = await executeWithAudit(
      sql,
      [],
      'Lab 8: Multi-Row ALL Subquery (WHERE balance > ALL (SELECT balance WHERE account_type="Salary"))'
    );

    res.json({ success: true, title: 'Balance > ALL Salary Accounts (ALL Subquery)', data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// Subquery 5: Correlated Subquery with NOT EXISTS - Customers with Zero Loans
router.get('/subquery/no-loans', async (req, res, next) => {
  try {
    const sql = `
      SELECT C.customer_id, C.First_name, C.Last_name, C.email, C.phone_number
      FROM Customers C
      WHERE NOT EXISTS (
        SELECT 1 FROM Loan L WHERE L.customer_id = C.customer_id
      )
    `;
    const { rows, sqlMeta } = await executeWithAudit(
      sql,
      [],
      'Lab 8: Correlated NOT EXISTS Subquery (Customers with No Loan Applications)'
    );

    res.json({ success: true, title: 'Zero-Loan Customers (Correlated NOT EXISTS)', data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// Subquery 6: Correlated Subquery with EXISTS - Active Transacting Customers
router.get('/subquery/has-transactions', async (req, res, next) => {
  try {
    const sql = `
      SELECT C.customer_id, C.First_name, C.Last_name, C.email
      FROM Customers C
      WHERE EXISTS (
        SELECT 1 FROM Transactions T
        JOIN Accounts A ON T.account_id = A.Account_id
        WHERE A.customer_id = C.customer_id
      )
    `;
    const { rows, sqlMeta } = await executeWithAudit(
      sql,
      [],
      'Lab 8: Correlated EXISTS Subquery (Customers with Recorded Transactions)'
    );

    res.json({ success: true, title: 'Active Transactors (Correlated EXISTS)', data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
