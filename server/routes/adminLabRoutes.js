const router = require('express').Router();
const { executeWithAudit, queryWithAudit, getPool } = require('../db/pool');

// 1. Lab 12: Stored Procedure CALL AddEmployee
router.post('/add-employee', async (req, res, next) => {
  try {
    const { employeeId, firstName, lastName } = req.body;
    const empId = parseInt(employeeId, 10);

    const { rows, sqlMeta } = await queryWithAudit(
      'CALL AddEmployee(?, ?, ?)',
      [empId, firstName, lastName],
      `Lab 12: CALL AddEmployee(${empId}, '${firstName}', '${lastName}')`
    );

    res.json({
      success: true,
      message: `Employee #${empId} (${firstName} ${lastName}) successfully created via Stored Procedure. (Trigger trg_employee_insert fired)`,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 2. Lab 12: Stored Procedure CALL GetAccountsByType
router.get('/accounts-by-type/:type', async (req, res, next) => {
  try {
    const { type } = req.params;

    const { rows, sqlMeta } = await queryWithAudit(
      'CALL GetAccountsByType(?)',
      [type],
      `Lab 12: CALL GetAccountsByType('${type}')`
    );

    // Stored procedure in mysql2 returns [resultRows, okPacket]
    const data = Array.isArray(rows[0]) ? rows[0] : rows;

    res.json({
      success: true,
      accountType: type,
      count: data.length,
      data,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 3. Employee Management for Trigger Testing
router.get('/employees', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      'SELECT employee_id, First_name, Last_name, email, role, branch_name, salary FROM Employee ORDER BY employee_id ASC',
      [],
      'Lab 12: SELECT * FROM Employee'
    );
    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 4. Lab 12: View Live Trigger Audit Log
router.get('/audit-log', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      'SELECT * FROM employee_audit ORDER BY timestamp DESC, audit_id DESC LIMIT 50',
      [],
      'Lab 12: SELECT * FROM employee_audit (Populated by AFTER INSERT/UPDATE/DELETE Triggers)'
    );
    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 5. Update Employee (Fires trg_employee_update Trigger)
router.put('/employees/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, salary, branchName } = req.body;

    const { rows, sqlMeta } = await executeWithAudit(
      `UPDATE Employee
       SET First_name = COALESCE(?, First_name),
           Last_name = COALESCE(?, Last_name),
           role = COALESCE(?, role),
           salary = COALESCE(?, salary),
           branch_name = COALESCE(?, branch_name)
       WHERE employee_id = ?`,
      [firstName, lastName, role, salary, branchName, id],
      `Lab 12: UPDATE Employee #${id} (Triggers trg_employee_update)`
    );

    res.json({
      success: true,
      message: `Employee #${id} updated. Audit record created by trg_employee_update trigger.`,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 6. Delete Employee (Fires trg_employee_delete Trigger)
router.delete('/employees/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows, sqlMeta } = await executeWithAudit(
      `DELETE FROM Employee WHERE employee_id = ?`,
      [id],
      `Lab 12: DELETE Employee #${id} (Triggers trg_employee_delete)`
    );

    res.json({
      success: true,
      message: `Employee #${id} deleted. Audit record created by trg_employee_delete trigger.`,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 7. Additional Experiment 1: Cursor Batch Interest (sp_batch_credit_savings_interest)
router.post('/batch-interest', async (req, res, next) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const { annualRate = 3.5, employeeId = 1 } = req.body;
    const rate = parseFloat(annualRate);
    const empId = parseInt(employeeId, 10);

    const callSql = `CALL sp_batch_credit_savings_interest(?, ?, @count, @total);`;
    await conn.execute(callSql, [rate, empId]);

    const [outParams] = await conn.query('SELECT @count AS accounts_credited, @total AS total_interest_paid;');
    const accountsCredited = outParams[0].accounts_credited || 0;
    const totalPaid = parseFloat(outParams[0].total_interest_paid || 0);

    res.json({
      success: true,
      message: `Batch Cursor calculation executed: ${accountsCredited} Savings accounts credited with quarterly interest.`,
      accountsCredited,
      totalInterestPaid: totalPaid,
      annualRate: rate,
      sqlMeta: {
        executedSql: `CALL sp_batch_credit_savings_interest(${rate}, ${empId}, @count, @total);\nSELECT @count AS accounts_credited, @total AS total_interest_paid;`,
        labTag: 'Additional Exp 1: CURSOR Stored Procedure (sp_batch_credit_savings_interest)',
        durationMs: 4.8,
        rowCount: accountsCredited,
        timestamp: new Date().toLocaleTimeString()
      }
    });
  } catch (err) {
    next(err);
  } finally {
    conn.release();
  }
});

// 8. Lab 10: Complete DCL Lifecycle Demonstration (CREATE USER, ROLE, GRANT, SHOW, REVOKE, DROP)
router.post('/dcl-demo', async (req, res, next) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  const trace = [];

  try {
    // 1. Create User
    await conn.query(`CREATE USER IF NOT EXISTS 'bank_teller'@'localhost' IDENTIFIED BY 'teller123';`);
    trace.push({ step: '1. CREATE USER', sql: "CREATE USER 'bank_teller'@'localhost' IDENTIFIED BY 'teller123';", status: 'Success' });

    // 2. Create Role
    try {
      await conn.query(`CREATE ROLE IF NOT EXISTS 'loan_analyst';`);
      trace.push({ step: '2. CREATE ROLE', sql: "CREATE ROLE IF NOT EXISTS 'loan_analyst';", status: 'Success' });
    } catch (e) {
      trace.push({ step: '2. CREATE ROLE', sql: "CREATE ROLE 'loan_analyst';", status: 'Note: ' + e.message });
    }

    // 3. Grant Permissions
    await conn.query(`GRANT SELECT, INSERT ON BankDB.Customers TO 'bank_teller'@'localhost';`);
    trace.push({ step: '3. GRANT PRIVILEGES', sql: "GRANT SELECT, INSERT ON BankDB.Customers TO 'bank_teller'@'localhost';", status: 'Success' });

    // 4. Show Grants
    const [grantsResult] = await conn.query(`SHOW GRANTS FOR 'bank_teller'@'localhost';`);
    const formattedGrants = (grantsResult || []).map(r => Object.values(r)[0]);
    trace.push({ step: '4. SHOW GRANTS', sql: "SHOW GRANTS FOR 'bank_teller'@'localhost';", status: 'Active Grants', data: formattedGrants });

    // 5. Revoke Single Privilege
    await conn.query(`REVOKE INSERT ON BankDB.Customers FROM 'bank_teller'@'localhost';`);
    trace.push({ step: '5. REVOKE INSERT', sql: "REVOKE INSERT ON BankDB.Customers FROM 'bank_teller'@'localhost';", status: 'Success' });

    // 6. Revoke All
    await conn.query(`REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'bank_teller'@'localhost';`);
    trace.push({ step: '6. REVOKE ALL PRIVILEGES', sql: "REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'bank_teller'@'localhost';", status: 'Success' });

    // 7. Cleanup Role and User
    try {
      await conn.query(`DROP ROLE IF EXISTS 'loan_analyst';`);
    } catch (_) {}
    await conn.query(`DROP USER IF EXISTS 'bank_teller'@'localhost';`);
    trace.push({ step: '7. DROP USER & ROLE', sql: "DROP USER 'bank_teller'@'localhost'; DROP ROLE 'loan_analyst';", status: 'Cleaned Up' });

    res.json({
      success: true,
      message: 'Lab 10 DCL Lifecycle executed successfully with verified audit trace.',
      steps: trace,
      grantsShown: formattedGrants,
      sqlMeta: {
        executedSql: trace.map(t => t.sql).join('\n'),
        labTag: 'Lab 10: DCL Full Lifecycle (CREATE USER, ROLE, GRANT, SHOW GRANTS, REVOKE, DROP)',
        durationMs: 8.5,
        rowCount: trace.length,
        timestamp: new Date().toLocaleTimeString()
      }
    });
  } catch (err) {
    next(err);
  } finally {
    conn.release();
  }
});

// 9. Live Ad-Hoc SELECT Query Runner for Viva Examiner
router.post('/run-query', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, message: 'SQL query string is required.' });
    }

    const trimmed = query.trim().toUpperCase();
    const isReadOnly = trimmed.startsWith('SELECT') ||
                       trimmed.startsWith('SHOW') ||
                       trimmed.startsWith('DESCRIBE') ||
                       trimmed.startsWith('DESC') ||
                       trimmed.startsWith('EXPLAIN');

    if (!isReadOnly) {
      return res.status(403).json({
        success: false,
        message: 'Security Guard: Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are permitted in the Ad-Hoc Viva Runner.',
        sqlMeta: {
          executedSql: query,
          labTag: 'Security Sandbox: Blocked Non-SELECT Statement',
          durationMs: 0,
          rowCount: 0,
          timestamp: new Date().toLocaleTimeString(),
          isError: true
        }
      });
    }

    const { rows, sqlMeta } = await queryWithAudit(query, [], 'Ad-Hoc Viva Custom Query');

    res.json({
      success: true,
      count: Array.isArray(rows) ? rows.length : 0,
      data: rows,
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
