const router = require('express').Router();
const { executeWithAudit } = require('../db/pool');

// 1. Get All Cards with Linked Account and Customer Info (Lab 1: Weak Entity JOIN)
router.get('/', async (req, res, next) => {
  try {
    const { rows, sqlMeta } = await executeWithAudit(
      `SELECT CR.card_id, CR.Card_number, CR.card_type, CR.daily_limit, CR.card_status, CR.expiry_date, CR.cvv,
              A.Account_id, A.Account_number, A.account_type, A.balance,
              C.customer_id, C.First_name, C.Last_name, C.email
       FROM Cards CR
       INNER JOIN Accounts A ON CR.Account_id = A.Account_id
       INNER JOIN Customers C ON A.customer_id = C.customer_id
       ORDER BY CR.card_id ASC`,
      [],
      'Lab 1 & 7: Query Weak Entity Cards linked to Accounts and Customers'
    );

    res.json({ success: true, data: rows, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 2. Issue New Card (Weak Entity INSERT with Composite Key)
router.post('/', async (req, res, next) => {
  try {
    const { accountId, cardType = 'Debit', dailyLimit = 50000.00 } = req.body;

    if (!accountId) {
      return res.status(400).json({ success: false, message: 'accountId is required to issue a card.' });
    }

    // Auto-generate 16-digit card number prefix based on type
    const prefix = cardType === 'Credit' ? '5412' : '4532';
    let randomPart = '';
    for (let i = 0; i < 12; i++) {
      randomPart += Math.floor(Math.random() * 10);
    }
    const cardNumber = prefix + randomPart;

    const cvv = String(Math.floor(100 + Math.random() * 900));
    const now = new Date();
    const expiryYear = now.getFullYear() + 4;
    const expiryDate = `${expiryYear}-12-31`;

    const { rows, sqlMeta } = await executeWithAudit(
      `INSERT INTO Cards (Card_number, card_type, cvv, pin_hash, daily_limit, card_status, expiry_date, Account_id)
       VALUES (?, ?, ?, '1234', ?, 'Active', ?, ?)`,
      [cardNumber, cardType, cvv, dailyLimit, expiryDate, accountId],
      `Lab 1 & 4: Weak Entity INSERT (Cards for Account_id ${accountId})`
    );

    res.json({
      success: true,
      message: `New ${cardType} Card successfully issued for Account #${accountId}.`,
      card: {
        card_id: rows.insertId,
        cardNumber,
        cardType,
        cvv,
        expiryDate,
        dailyLimit,
        accountId
      },
      sqlMeta
    });
  } catch (err) {
    next(err);
  }
});

// 3. Freeze Card
router.put('/:cardId/:accountId/freeze', async (req, res, next) => {
  try {
    const { cardId, accountId } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `UPDATE Cards SET card_status = 'Frozen' WHERE card_id = ? AND Account_id = ?`,
      [cardId, accountId],
      `Lab 4: UPDATE Cards SET card_status = 'Frozen' (Composite Key: ${cardId}, ${accountId})`
    );

    res.json({ success: true, message: `Card #${cardId} frozen successfully.`, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 4. Unfreeze Card
router.put('/:cardId/:accountId/unfreeze', async (req, res, next) => {
  try {
    const { cardId, accountId } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `UPDATE Cards SET card_status = 'Active' WHERE card_id = ? AND Account_id = ?`,
      [cardId, accountId],
      `Lab 4: UPDATE Cards SET card_status = 'Active' (Composite Key: ${cardId}, ${accountId})`
    );

    res.json({ success: true, message: `Card #${cardId} unfreezed and active.`, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 5. Update Daily Spending Limit
router.put('/:cardId/:accountId/limit', async (req, res, next) => {
  try {
    const { cardId, accountId } = req.params;
    const { limit } = req.body;

    const { rows, sqlMeta } = await executeWithAudit(
      `UPDATE Cards SET daily_limit = ? WHERE card_id = ? AND Account_id = ?`,
      [limit, cardId, accountId],
      `Lab 4: UPDATE Cards daily_limit = ${limit} (Subject to chk_card_limit)`
    );

    res.json({ success: true, message: `Daily limit updated to ₹${limit}`, sqlMeta });
  } catch (err) {
    next(err);
  }
});

// 6. Delete Card (Weak Entity Delete)
router.delete('/:cardId/:accountId', async (req, res, next) => {
  try {
    const { cardId, accountId } = req.params;
    const { rows, sqlMeta } = await executeWithAudit(
      `DELETE FROM Cards WHERE card_id = ? AND Account_id = ?`,
      [cardId, accountId],
      `Lab 1 & 4: Weak Entity Record Deletion (Cards WHERE card_id = ${cardId} AND Account_id = ${accountId})`
    );

    res.json({ success: true, message: `Card #${cardId} revoked and removed.`, sqlMeta });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
