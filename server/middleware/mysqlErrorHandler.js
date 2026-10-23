/**
 * MySQL Error Handling Middleware
 * Translates low-level MySQL error codes (CHECK, UNIQUE, FK, Trigger)
 * into high-fidelity diagnostic JSON responses with Lab attribution.
 */
module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error('MySQL Error Caught by Middleware:', err.message);

  let constraintType = 'Database Execution Error';
  let labReference = err.labTag || 'Lab 3: Integrity Constraints';
  let statusCode = 400;

  if (err.errno === 3819) {
    constraintType = 'CHECK Constraint Violation (MySQL Error 3819)';
    labReference = 'Lab 3: Integrity Constraints (CHECK)';
  } else if (err.errno === 1062) {
    constraintType = 'UNIQUE / PRIMARY KEY Violation (MySQL Error 1062)';
    labReference = 'Lab 3: Integrity Constraints (UNIQUE / PRIMARY KEY)';
  } else if (err.errno === 1451 || err.errno === 1452) {
    constraintType = `FOREIGN KEY Integrity Violation (MySQL Error ${err.errno})`;
    labReference = 'Lab 3: Referential Integrity (FOREIGN KEY)';
  } else if (err.errno === 1048) {
    constraintType = 'NOT NULL Column Violation (MySQL Error 1048)';
    labReference = 'Lab 3: NOT NULL Constraint';
  } else if (err.sqlState === '45000') {
    constraintType = 'Trigger / Procedure Business Rule Violation (SQLSTATE 45000)';
    labReference = 'Lab 12: Triggers & Stored Procedures';
  } else if (err.errno === 1045) {
    constraintType = 'Access Denied / Authentication Failure (MySQL Error 1045)';
    labReference = 'Lab 10: DCL (Credentials)';
    statusCode = 401;
  } else if (err.errno === 1146) {
    constraintType = 'Table Does Not Exist (MySQL Error 1146)';
    labReference = 'Lab 2: DDL Statements';
  }

  res.status(statusCode).json({
    success: false,
    errorTitle: constraintType,
    mysqlErrorCode: err.errno || (err.sqlState === '45000' ? 45000 : 5000),
    sqlState: err.sqlState || 'HY000',
    message: err.sqlMessage || err.message,
    sqlMeta: {
      executedSql: err.executedSql || err.sql || (req.body ? JSON.stringify(req.body) : 'Rejected by MySQL Engine'),
      labTag: labReference,
      durationMs: 0.5,
      rowCount: 0,
      timestamp: new Date().toLocaleTimeString(),
      isError: true
    }
  });
};
