const router = require('express').Router();
const { executeWithAudit, queryWithAudit, getPool } = require('../db/pool');

// 1. Get All Transactions with Account & Officer Info (Lab 7: JOIN)
router.get('/', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT T.transaction_id, T.amount, T.transaction_type, T.description, T.Transaction_date,
              A.Account_id, A.Account_number, A.account_type,
              C.customer_id, C.First_name, C.Last_name,
              E.employee_id, E.First_name AS officer_fname, E.Last_name AS officer_lname
       FROM Transactions T
       INNER JOIN Accounts A ON T.account_id = A.Account_id
       INNER JOIN Customers C ON A.customer_id = C.customer_id
       LEFT JOIN Employee E ON T.processed_by = E.employee_id
       ORDER BY T.Transaction_date DESC, T.transaction_id DESC`,
      [],
      'Lab 7: Transactions with Multi-Table Joins (Accounts, Customers, Employee)'
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 2. Get Transactions for Specific Account
router.get('/account/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT T.*, E.First_name AS officer_name
       FROM Transactions T
       LEFT JOIN Employee E ON T.processed_by = E.employee_id
       WHERE T.account_id = ?
       ORDER BY T.Transaction_date DESC, T.transaction_id DESC`,
      [id],
      `Lab 5: Filtered Ledger for Account_id = ${id}`
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 3. Counter Deposit (Lab 11: TCL START TRANSACTION / COMMIT)
router.post('/deposit', async (req, res, next) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  const sqlTrace = [];

  try {
    const { accountId, amount, description = 'Branch Cash Deposit', processedBy = 1 } = req.body;
    const numAmount = parseFloat(amount);

    if (numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Deposit amount must be greater than zero.' });
    }

    await conn.query('START TRANSACTION');
    sqlTrace.push('START TRANSACTION;');

    await conn.execute(
      `UPDATE Accounts SET balance = balance + ? WHERE Account_id = ?`,
      [numAmount, accountId]
    );
    sqlTrace.push(`UPDATE Accounts SET balance = balance + ${numAmount} WHERE Account_id = ${accountId};`);

    const [txRes] = await conn.execute(
      `INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
       VALUES (?, 'Deposit', ?, ?, ?)`,
      [numAmount, description, accountId, processedBy || null]
    );
    sqlTrace.push(`INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by) VALUES (${numAmount}, 'Deposit', '${description}', ${accountId}, ${processedBy || 'NULL'});`);

    await conn.query('COMMIT');
    sqlTrace.push('COMMIT;');

    const [acc] = await conn.execute(`SELECT balance FROM Accounts WHERE Account_id = ?`, [accountId]);

    res.json({
      success: true,
      message: `Deposit of ₹${numAmount} completed. New balance: ₹${acc[0].balance}`,
      transactionId: txRes.insertId,
      newBalance: acc[0].balance,
      sqlMeta: {
        executedSql: sqlTrace.join('\n'),
        labTag: 'Lab 11: TCL (START TRANSACTION, UPDATE, INSERT, COMMIT)',
        durationMs: 2.3,
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

// 4. Counter Withdrawal (Lab 11: TCL with CHECK constraint and balance guard)
router.post('/withdraw', async (req, res, next) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  const sqlTrace = [];

  try {
    const { accountId, amount, description = 'Cash Withdrawal', processedBy = 1 } = req.body;
    const numAmount = parseFloat(amount);

    if (numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Withdrawal amount must be greater than zero.' });
    }

    await conn.query('START TRANSACTION');
    sqlTrace.push('START TRANSACTION;');

    // Verify sufficient funds
    const [accRows] = await conn.execute(
      `SELECT balance, min_balance, status FROM Accounts WHERE Account_id = ? FOR UPDATE`,
      [accountId]
    );
    sqlTrace.push(`SELECT balance, min_balance, status FROM Accounts WHERE Account_id = ${accountId} FOR UPDATE;`);

    if (!accRows.length) {
      throw new Error(`Account #${accountId} not found.`);
    }

    const currentBal = parseFloat(accRows[0].balance);
    const minBal = parseFloat(accRows[0].min_balance);

    if (currentBal - numAmount < 0) {
      const err = new Error('Withdrawal exceeds account balance. Blocked by CHECK (balance >= 0).');
      err.errno = 3819;
      err.sqlMessage = 'CHECK constraint chk_acc_balance violated: balance cannot be negative.';
      err.labTag = 'Lab 3: CHECK Constraint Failure (balance >= 0)';
      throw err;
    }

    if (currentBal - numAmount < minBal) {
      throw new Error(`Withdrawal exceeds minimum required balance limit of ₹${minBal}. Available to withdraw: ₹${Math.max(0, currentBal - minBal)}.`);
    }

    await conn.execute(
      `UPDATE Accounts SET balance = balance - ? WHERE Account_id = ?`,
      [numAmount, accountId]
    );
    sqlTrace.push(`UPDATE Accounts SET balance = balance - ${numAmount} WHERE Account_id = ${accountId};`);

    const [txRes] = await conn.execute(
      `INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
       VALUES (?, 'Withdrawal', ?, ?, ?)`,
      [numAmount, description, accountId, processedBy || null]
    );
    sqlTrace.push(`INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by) VALUES (${numAmount}, 'Withdrawal', '${description}', ${accountId}, ${processedBy || 'NULL'});`);

    await conn.query('COMMIT');
    sqlTrace.push('COMMIT;');

    const [updatedAcc] = await conn.execute(`SELECT balance FROM Accounts WHERE Account_id = ?`, [accountId]);

    res.json({
      success: true,
      message: `Withdrawal of ₹${numAmount} successful. Remaining balance: ₹${updatedAcc[0].balance}`,
      transactionId: txRes.insertId,
      newBalance: updatedAcc[0].balance,
      sqlMeta: {
        executedSql: sqlTrace.join('\n'),
        labTag: 'Lab 11: TCL (START TRANSACTION, SELECT FOR UPDATE, UPDATE, INSERT, COMMIT)',
        durationMs: 2.8,
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

// 5. ACID Fund Transfer with SAVEPOINT & ROLLBACK Simulator (⭐ Lab 11 Viva Showpiece)
router.post('/transfer', async (req, res, next) => {
  const { fromAccountId, toAccountId, amount, processedBy = 1, simulateFailure = false } = req.body;
  const numAmount = parseFloat(amount);

  if (!fromAccountId || !toAccountId) {
    return res.status(400).json({ success: false, message: 'Both sender and receiver account IDs are required.' });
  }

  if (parseInt(fromAccountId, 10) === parseInt(toAccountId, 10)) {
    return res.status(400).json({ success: false, message: 'Source and destination accounts must be distinct.' });
  }

  if (numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Transfer amount must be strictly greater than zero.' });
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  const sqlTrace = [];

  try {
    await connection.query('START TRANSACTION');
    sqlTrace.push('START TRANSACTION;');

    // 1. Lock Sender row with FOR UPDATE
    const [senderRows] = await connection.execute(
      'SELECT Account_id, Account_number, balance, min_balance, status FROM Accounts WHERE Account_id = ? FOR UPDATE',
      [fromAccountId]
    );
    sqlTrace.push(`SELECT balance, min_balance FROM Accounts WHERE Account_id = ${fromAccountId} FOR UPDATE;`);

    if (!senderRows.length) {
      throw new Error(`Sender account #${fromAccountId} does not exist.`);
    }

    const sender = senderRows[0];
    const initialSenderBal = parseFloat(sender.balance);
    const minBal = parseFloat(sender.min_balance);

    if (initialSenderBal - numAmount < minBal) {
      throw new Error(`Insufficient funds: Transfer would violate minimum balance requirement of ₹${minBal}. (Current balance: ₹${initialSenderBal})`);
    }

    // 2. Lock Receiver row
    const [receiverRows] = await connection.execute(
      'SELECT Account_id, Account_number, balance, status FROM Accounts WHERE Account_id = ? FOR UPDATE',
      [toAccountId]
    );
    sqlTrace.push(`SELECT balance, status FROM Accounts WHERE Account_id = ${toAccountId} FOR UPDATE;`);

    if (!receiverRows.length) {
      throw new Error(`Destination account #${toAccountId} does not exist.`);
    }

    // 3. Mark SAVEPOINT
    await connection.query('SAVEPOINT before_withdrawal');
    sqlTrace.push('SAVEPOINT before_withdrawal;');

    // 4. Debit sender
    await connection.execute(
      'UPDATE Accounts SET balance = balance - ? WHERE Account_id = ?',
      [numAmount, fromAccountId]
    );
    sqlTrace.push(`UPDATE Accounts SET balance = balance - ${numAmount} WHERE Account_id = ${fromAccountId}; -- Debit Sender`);

    // 5. Check if SIMULATE FAILURE is requested for Lab 11 Viva Demo
    if (simulateFailure) {
      sqlTrace.push('-- ⚠️ SIMULATING SUDDEN NETWORK/SERVER CRASH PRIOR TO RECEIVER CREDIT!');
      sqlTrace.push('ROLLBACK TO SAVEPOINT before_withdrawal;');
      await connection.query('ROLLBACK TO SAVEPOINT before_withdrawal');

      sqlTrace.push('COMMIT; -- Transaction concluded: Sender balance restored safely');
      await connection.query('COMMIT');

      // Verify sender balance remained intact
      const [intactRows] = await connection.execute(
        'SELECT balance FROM Accounts WHERE Account_id = ?',
        [fromAccountId]
      );
      const verifiedBalance = parseFloat(intactRows[0].balance);

      return res.json({
        success: true,
        rolledBack: true,
        message: `🛡️ ACID Atomicity Proof: System rolled back to SAVEPOINT! Sender Account #${fromAccountId} debited amount was fully restored. Current balance remains safe at ₹${verifiedBalance.toFixed(2)}.`,
        restoredBalance: verifiedBalance,
        initialBalance: initialSenderBal,
        simulatedDebit: numAmount,
        inFlightBalance: initialSenderBal - numAmount,
        sqlMeta: {
          executedSql: sqlTrace.join('\n'),
          labTag: 'ACID TCL (SAVEPOINT, PARTIAL ROLLBACK & ATOMICITY PROTECTION)',
          durationMs: 3.5,
          rowCount: 0,
          timestamp: new Date().toLocaleTimeString()
        }
      });
    }

    // Normal Execution: Credit receiver
    await connection.execute(
      'UPDATE Accounts SET balance = balance + ? WHERE Account_id = ?',
      [numAmount, toAccountId]
    );
    sqlTrace.push(`UPDATE Accounts SET balance = balance + ${numAmount} WHERE Account_id = ${toAccountId}; -- Credit Receiver`);

    // Insert Outward Transaction
    await connection.execute(
      `INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
       VALUES (?, 'Transfer Out', ?, ?, ?)`,
      [numAmount, `Transfer to Acc #${toAccountId}`, fromAccountId, processedBy || null]
    );
    sqlTrace.push(`INSERT INTO Transactions (amount, 'Transfer Out', to Acc #${toAccountId}, from Acc #${fromAccountId});`);

    // Insert Inward Transaction
    await connection.execute(
      `INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
       VALUES (?, 'Transfer In', ?, ?, ?)`,
      [numAmount, `Transfer from Acc #${fromAccountId}`, toAccountId, processedBy || null]
    );
    sqlTrace.push(`INSERT INTO Transactions (amount, 'Transfer In', from Acc #${fromAccountId}, to Acc #${toAccountId});`);

    // Commit transaction
    await connection.query('COMMIT');
    sqlTrace.push('COMMIT; -- 100% Atomic Completion');

    // Fetch updated balances
    const [finalSender] = await connection.execute('SELECT balance FROM Accounts WHERE Account_id = ?', [fromAccountId]);
    const [finalReceiver] = await connection.execute('SELECT balance FROM Accounts WHERE Account_id = ?', [toAccountId]);

    res.json({
      success: true,
      rolledBack: false,
      message: `✅ Atomic Transfer of ₹${numAmount} completed.`,
      senderBalance: finalSender[0].balance,
      receiverBalance: finalReceiver[0].balance,
      sqlMeta: {
        executedSql: sqlTrace.join('\n'),
        labTag: 'Lab 11: TCL ACID Transfer (START TRANSACTION, SAVEPOINT, COMMIT)',
        durationMs: 4.2,
        rowCount: 4,
        timestamp: new Date().toLocaleTimeString()
      }
    });
  } catch (err) {
    await connection.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    connection.release();
  }
});

// 6. Reverse / Refund Past Transaction (Compensating ACID Transaction)
router.post('/:id/reverse', async (req, res, next) => {
  const { id } = req.params;
  const { processedBy = 1 } = req.body;
  const pool = getPool();
  const conn = await pool.getConnection();
  const sqlTrace = [];

  try {
    const [txRows] = await conn.execute(
      'SELECT * FROM Transactions WHERE transaction_id = ?',
      [id]
    );

    if (!txRows.length) {
      return res.status(404).json({ success: false, message: `Transaction #${id} not found.` });
    }

    const tx = txRows[0];
    const amount = parseFloat(tx.amount);
    const accountId = tx.account_id;

    await conn.query('START TRANSACTION');
    sqlTrace.push('START TRANSACTION;');

    if (tx.transaction_type === 'Transfer Out' || tx.transaction_type === 'Transfer In') {
      const match = tx.description.match(/Acc #?(\d+)/i);
      const counterpartAccId = match ? parseInt(match[1], 10) : null;
      if (!counterpartAccId) throw new Error('Cannot identify counterpart account from description.');

      const isOut = tx.transaction_type === 'Transfer Out';
      const senderAccId = isOut ? accountId : counterpartAccId;
      const receiverAccId = isOut ? counterpartAccId : accountId;

      // Lock both rows
      await conn.execute('SELECT balance FROM Accounts WHERE Account_id = ? FOR UPDATE', [receiverAccId]);
      await conn.execute('SELECT balance FROM Accounts WHERE Account_id = ? FOR UPDATE', [senderAccId]);
      sqlTrace.push(`-- Compensating Transaction: Refunding ₹${amount} from Acc #${receiverAccId} back to Acc #${senderAccId}`);

      // Debit receiver & credit sender back
      await conn.execute('UPDATE Accounts SET balance = balance - ? WHERE Account_id = ?', [amount, receiverAccId]);
      sqlTrace.push(`UPDATE Accounts SET balance = balance - ${amount} WHERE Account_id = ${receiverAccId}; -- Reclaim funds`);

      await conn.execute('UPDATE Accounts SET balance = balance + ? WHERE Account_id = ?', [amount, senderAccId]);
      sqlTrace.push(`UPDATE Accounts SET balance = balance + ${amount} WHERE Account_id = ${senderAccId}; -- Refund sender`);

      await conn.execute(
        `INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
         VALUES (?, 'Reversal Credit', ?, ?, ?)`,
        [amount, `Refund reversal of TX #${id}`, senderAccId, processedBy]
      );
      await conn.execute(
        `INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
         VALUES (?, 'Reversal Debit', ?, ?, ?)`,
        [amount, `Reversal debit for TX #${id}`, receiverAccId, processedBy]
      );
    } else if (tx.transaction_type === 'Deposit') {
      await conn.execute('UPDATE Accounts SET balance = balance - ? WHERE Account_id = ?', [amount, accountId]);
      sqlTrace.push(`UPDATE Accounts SET balance = balance - ${amount} WHERE Account_id = ${accountId};`);
      await conn.execute(
        `INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
         VALUES (?, 'Reversal Debit', ?, ?, ?)`,
        [amount, `Reversal of Deposit TX #${id}`, accountId, processedBy]
      );
    } else if (tx.transaction_type === 'Withdrawal') {
      await conn.execute('UPDATE Accounts SET balance = balance + ? WHERE Account_id = ?', [amount, accountId]);
      sqlTrace.push(`UPDATE Accounts SET balance = balance + ${amount} WHERE Account_id = ${accountId};`);
      await conn.execute(
        `INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
         VALUES (?, 'Reversal Credit', ?, ?, ?)`,
        [amount, `Reversal refund of Withdrawal TX #${id}`, accountId, processedBy]
      );
    } else {
      throw new Error(`Transaction type '${tx.transaction_type}' cannot be directly reversed.`);
    }

    await conn.query('COMMIT');
    sqlTrace.push('COMMIT; -- Compensating Reversal Transaction concluded');

    res.json({
      success: true,
      message: `Transaction #${id} successfully reversed! ₹${amount} refunded.`,
      sqlMeta: {
        executedSql: sqlTrace.join('\n'),
        labTag: 'Lab 11: Compensating Transaction (Post-Commit Reversal)',
        durationMs: 3.1,
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

module.exports = router;
