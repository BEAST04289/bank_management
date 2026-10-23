-- =====================================================================================
-- MASTER SQL SCRIPT: BANKING MANAGEMENT SYSTEM (BankDB)
-- Course: CSC2131 - RDBMS Lab (Covers Experiments 1 to 12 + Additional Experiments 1 & 2)
-- Engine: MySQL 8.0+ (InnoDB for ACID Transaction & Foreign Key Support)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- EXPERIMENT 2: DDL STATEMENTS (CREATE DATABASE, DROP, CREATE TABLES)
-- -------------------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS BankDB;
USE BankDB;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS employee_audit;
DROP TABLE IF EXISTS Customer_Archive;
DROP TABLE IF EXISTS Account_Tiers;
DROP TABLE IF EXISTS Loan_payments;
DROP TABLE IF EXISTS Loan;
DROP TABLE IF EXISTS Transactions;
DROP TABLE IF EXISTS Cards;
DROP TABLE IF EXISTS Accounts;
DROP TABLE IF EXISTS Employee;
DROP TABLE IF EXISTS Customers;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. CUSTOMERS (Strong Entity - Lab 1 ERD, Lab 2 DDL, Lab 3 Constraints)
CREATE TABLE Customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    First_name VARCHAR(50) NOT NULL,
    Last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    dob DATE NOT NULL,
    address VARCHAR(150) DEFAULT 'Jaipur, Rajasthan',
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'Verified',
    password_hash VARCHAR(255) NOT NULL DEFAULT 'cust123',
    CONSTRAINT unq_cust_email UNIQUE (email),
    CONSTRAINT unq_cust_phone UNIQUE (phone_number)
) ENGINE=InnoDB;

-- 2. EMPLOYEE (Strong Entity - Lab 1 ERD, Lab 2 DDL, Lab 3 Constraints)
CREATE TABLE Employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    First_name VARCHAR(50) NOT NULL,
    Last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'Loan Officer',
    branch_name VARCHAR(50) NOT NULL DEFAULT 'MUJ Main Branch',
    salary DECIMAL(10, 2) NOT NULL DEFAULT 60000.00,
    password_hash VARCHAR(255) NOT NULL DEFAULT 'emp123',
    CONSTRAINT chk_emp_salary CHECK (salary > 0)
) ENGINE=InnoDB;

-- 3. ACCOUNTS (Strong Entity - Includes Notebook IFSC & Branch attributes)
CREATE TABLE Accounts (
    Account_id INT AUTO_INCREMENT PRIMARY KEY,
    Account_number VARCHAR(20) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL DEFAULT 'BANK0001001',
    branch_name VARCHAR(50) NOT NULL DEFAULT 'Jaipur Main',
    account_type VARCHAR(20) NOT NULL DEFAULT 'Savings',
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    min_balance DECIMAL(12, 2) NOT NULL DEFAULT 1000.00,
    opened_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    customer_id INT NOT NULL,
    CONSTRAINT unq_acc_num UNIQUE (Account_number),
    CONSTRAINT chk_acc_balance CHECK (balance >= 0),
    CONSTRAINT fk_accounts_customer FOREIGN KEY (customer_id) 
        REFERENCES Customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. CARDS (Weak Entity depending on Accounts - Includes Notebook CVV & PIN)
CREATE TABLE Cards (
    card_id INT AUTO_INCREMENT,
    Card_number VARCHAR(16) NOT NULL,
    card_type VARCHAR(20) NOT NULL DEFAULT 'Debit',
    cvv VARCHAR(3) NOT NULL DEFAULT '101',
    pin_hash VARCHAR(255) NOT NULL DEFAULT '1234',
    daily_limit DECIMAL(10, 2) NOT NULL DEFAULT 50000.00,
    card_status VARCHAR(20) NOT NULL DEFAULT 'Active',
    expiry_date DATE NOT NULL,
    Account_id INT NOT NULL,
    PRIMARY KEY (card_id, Account_id),
    CONSTRAINT unq_card_num UNIQUE (Card_number),
    CONSTRAINT chk_card_limit CHECK (daily_limit > 0),
    CONSTRAINT fk_cards_account FOREIGN KEY (Account_id) 
        REFERENCES Accounts(Account_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. TRANSACTIONS (Strong Entity - Links to Accounts and Employee Processed_by)
CREATE TABLE Transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL DEFAULT 'Deposit',
    description VARCHAR(150) DEFAULT 'Counter Transaction',
    Transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    account_id INT NOT NULL,
    processed_by INT NULL,
    CONSTRAINT chk_trans_amount CHECK (amount > 0),
    CONSTRAINT fk_trans_account FOREIGN KEY (account_id) 
        REFERENCES Accounts(Account_id) ON DELETE CASCADE,
    CONSTRAINT fk_trans_employee FOREIGN KEY (processed_by) 
        REFERENCES Employee(employee_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. LOAN (Strong Entity - Customer requests, Employee approves)
CREATE TABLE Loan (
    loan_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_type VARCHAR(30) NOT NULL,
    Attribute VARCHAR(50) NOT NULL DEFAULT 'Secured',
    amount DECIMAL(12, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    tenure INT NOT NULL COMMENT 'Tenure in months',
    start_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    customer_id INT NOT NULL,
    approved_by INT NULL,
    CONSTRAINT chk_loan_amount CHECK (amount > 0),
    CONSTRAINT chk_loan_interest CHECK (interest_rate >= 0),
    CONSTRAINT chk_loan_tenure CHECK (tenure > 0),
    CONSTRAINT fk_loan_customer FOREIGN KEY (customer_id) 
        REFERENCES Customers(customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_loan_employee FOREIGN KEY (approved_by) 
        REFERENCES Employee(employee_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. LOAN_PAYMENTS (Weak Entity depending on Loan - Tracks EMI Installments)
CREATE TABLE Loan_payments (
    payment_id INT AUTO_INCREMENT,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    status VARCHAR(20) NOT NULL DEFAULT 'Paid',
    loan_id INT NOT NULL,
    account_id INT NULL,
    PRIMARY KEY (payment_id, loan_id),
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT fk_pay_loan FOREIGN KEY (loan_id) 
        REFERENCES Loan(loan_id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_account FOREIGN KEY (account_id) 
        REFERENCES Accounts(Account_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. ACCOUNT_TIERS (Auxiliary Table for Lab 7 NON-EQUI JOIN)
CREATE TABLE Account_Tiers (
    Tier_Name VARCHAR(20) PRIMARY KEY,
    Min_Balance DECIMAL(12, 2) NOT NULL,
    Max_Balance DECIMAL(12, 2) NOT NULL,
    Benefits VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 9. EMPLOYEE_AUDIT (For Lab 12 Triggers)
CREATE TABLE employee_audit (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    action VARCHAR(10) NOT NULL,
    details VARCHAR(150) DEFAULT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------------------
-- LAB 2 DDL DEMONSTRATION: ALTER, RENAME, AND DROP OPERATIONS
-- -------------------------------------------------------------------------------------
ALTER TABLE Customers ADD COLUMN temp_kyc_note VARCHAR(50);
ALTER TABLE Customers DROP COLUMN temp_kyc_note;
RENAME TABLE Loan_payments TO Loan_Installments;
RENAME TABLE Loan_Installments TO Loan_payments;
CREATE TABLE temp_table (temp_id INT);
DROP TABLE temp_table;

-- -------------------------------------------------------------------------------------
-- ADDITIONAL EXPERIMENT 1: STORED FUNCTIONS (EMI MATH & NET WORTH)
-- -------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_calculate_emi;
DROP FUNCTION IF EXISTS fn_get_customer_total_balance;

DELIMITER //

CREATE FUNCTION fn_calculate_emi(
    p_principal DECIMAL(12,2),
    p_annual_rate DECIMAL(5,2),
    p_tenure_months INT
) RETURNS DECIMAL(12,2)
DETERMINISTIC
BEGIN
    DECLARE v_monthly_rate DOUBLE;
    DECLARE v_emi DOUBLE;
    IF p_tenure_months <= 0 OR p_principal <= 0 THEN
        RETURN 0.00;
    END IF;
    IF p_annual_rate = 0 THEN
        RETURN ROUND(p_principal / p_tenure_months, 2);
    END IF;
    SET v_monthly_rate = (p_annual_rate / 12.0) / 100.0;
    SET v_emi = p_principal * v_monthly_rate * POW(1 + v_monthly_rate, p_tenure_months) 
                / (POW(1 + v_monthly_rate, p_tenure_months) - 1);
    RETURN ROUND(v_emi, 2);
END //

CREATE FUNCTION fn_get_customer_total_balance(p_customer_id INT) 
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(12,2);
    SELECT COALESCE(SUM(balance), 0.00) INTO v_total
    FROM Accounts
    WHERE customer_id = p_customer_id;
    RETURN v_total;
END //

DELIMITER ;

-- -------------------------------------------------------------------------------------
-- EXPERIMENT 12: TRIGGERS (BEFORE & AFTER TRIGGERS FOR VALIDATION AND AUDITING)
-- -------------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_employee_insert;
DROP TRIGGER IF EXISTS trg_employee_update;
DROP TRIGGER IF EXISTS trg_employee_delete;
DROP TRIGGER IF EXISTS trg_before_tx_validate;

DELIMITER //

CREATE TRIGGER trg_employee_insert
AFTER INSERT ON Employee
FOR EACH ROW
BEGIN
    INSERT INTO employee_audit (employee_id, action, details)
    VALUES (NEW.employee_id, 'INSERT', CONCAT('Added ', NEW.First_name, ' ', NEW.Last_name, ' as ', NEW.role));
END //

CREATE TRIGGER trg_employee_update
AFTER UPDATE ON Employee
FOR EACH ROW
BEGIN
    INSERT INTO employee_audit (employee_id, action, details)
    VALUES (NEW.employee_id, 'UPDATE', CONCAT('Updated ', NEW.First_name, ' ', NEW.Last_name, ' (Role: ', NEW.role, ')'));
END //

CREATE TRIGGER trg_employee_delete
AFTER DELETE ON Employee
FOR EACH ROW
BEGIN
    INSERT INTO employee_audit (employee_id, action, details)
    VALUES (OLD.employee_id, 'DELETE', CONCAT('Removed ', OLD.First_name, ' ', OLD.Last_name));
END //

CREATE TRIGGER trg_before_tx_validate
BEFORE INSERT ON Transactions
FOR EACH ROW
BEGIN
    DECLARE v_acc_status VARCHAR(20);
    SELECT status INTO v_acc_status FROM Accounts WHERE Account_id = NEW.account_id;
    IF v_acc_status != 'Active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction blocked by Trigger: Target bank account is not Active.';
    END IF;
END //

DELIMITER ;

-- -------------------------------------------------------------------------------------
-- EXPERIMENT 12 & ADDITIONAL EXPERIMENT 1: STORED PROCEDURES & CURSORS
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS GetAccountsByType;
DROP PROCEDURE IF EXISTS AddEmployee;
DROP PROCEDURE IF EXISTS sp_process_atomic_transfer;
DROP PROCEDURE IF EXISTS sp_pay_loan_installment;
DROP PROCEDURE IF EXISTS sp_batch_credit_savings_interest;

DELIMITER //

CREATE PROCEDURE GetAccountsByType(IN p_type VARCHAR(20))
BEGIN
    SELECT A.*, C.First_name, C.Last_name, C.email
    FROM Accounts A
    INNER JOIN Customers C ON A.customer_id = C.customer_id
    WHERE A.account_type = p_type;
END //

CREATE PROCEDURE AddEmployee(
    IN p_id INT,
    IN p_fname VARCHAR(50),
    IN p_lname VARCHAR(50)
)
BEGIN
    INSERT INTO Employee (employee_id, First_name, Last_name, email, role)
    VALUES (p_id, p_fname, p_lname, CONCAT(LOWER(p_fname), '.', p_id, '@bankdb.com'), 'Teller');
END //

CREATE PROCEDURE sp_process_atomic_transfer(
    IN p_from_acc INT,
    IN p_to_acc INT,
    IN p_amount DECIMAL(12,2),
    IN p_emp_id INT
)
BEGIN
    DECLARE v_sender_bal DECIMAL(12,2);
    DECLARE v_sender_min DECIMAL(12,2);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    SELECT balance, min_balance INTO v_sender_bal, v_sender_min
    FROM Accounts WHERE Account_id = p_from_acc FOR UPDATE;
    
    IF (v_sender_bal - p_amount) < v_sender_min THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transfer declined: Insufficient funds above minimum required balance.';
    END IF;

    UPDATE Accounts SET balance = balance - p_amount WHERE Account_id = p_from_acc;
    SAVEPOINT after_sender_debit;
    
    UPDATE Accounts SET balance = balance + p_amount WHERE Account_id = p_to_acc;
    
    INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
    VALUES (p_amount, 'Transfer Out', CONCAT('Transfer to Account ID ', p_to_acc), p_from_acc, p_emp_id);
    
    INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
    VALUES (p_amount, 'Transfer In', CONCAT('Transfer from Account ID ', p_from_acc), p_to_acc, p_emp_id);
    
    COMMIT;
END //

CREATE PROCEDURE sp_pay_loan_installment(
    IN p_loan_id INT,
    IN p_account_id INT,
    IN p_amount DECIMAL(12,2),
    IN p_emp_id INT
)
BEGIN
    DECLARE v_loan_status VARCHAR(20);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    SELECT status INTO v_loan_status FROM Loan WHERE loan_id = p_loan_id FOR UPDATE;
    IF v_loan_status != 'Approved' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Installment rejected: Loan must be in Approved status.';
    END IF;

    UPDATE Accounts SET balance = balance - p_amount WHERE Account_id = p_account_id;
    
    INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
    VALUES (p_amount, 'EMI Payment', CONCAT('Loan Installment for Loan #', p_loan_id), p_account_id, p_emp_id);
    
    INSERT INTO Loan_payments (amount, payment_date, status, loan_id, account_id)
    VALUES (p_amount, CURRENT_DATE, 'Paid', p_loan_id, p_account_id);
    
    COMMIT;
END //

CREATE PROCEDURE sp_batch_credit_savings_interest(
    IN p_annual_rate DECIMAL(5,2),
    IN p_emp_id INT,
    OUT p_accounts_credited INT,
    OUT p_total_interest_paid DECIMAL(12,2)
)
BEGIN
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_acc_id INT;
    DECLARE v_bal DECIMAL(12,2);
    DECLARE v_interest DECIMAL(12,2);
    
    DECLARE cur_savings CURSOR FOR 
        SELECT Account_id, balance FROM Accounts 
        WHERE account_type = 'Savings' AND status = 'Active';
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    
    SET p_accounts_credited = 0;
    SET p_total_interest_paid = 0.00;
    
    START TRANSACTION;
    OPEN cur_savings;
    
    read_loop: LOOP
        FETCH cur_savings INTO v_acc_id, v_bal;
        IF v_done = 1 THEN
            LEAVE read_loop;
        END IF;
        
        SET v_interest = ROUND(v_bal * (p_annual_rate / 4.0) / 100.0, 2);
        
        IF v_interest > 0 THEN
            UPDATE Accounts SET balance = balance + v_interest WHERE Account_id = v_acc_id;
            INSERT INTO Transactions (amount, transaction_type, description, account_id, processed_by)
            VALUES (v_interest, 'Interest Credit', CONCAT('Quarterly Savings Interest @ ', p_annual_rate, '%'), v_acc_id, p_emp_id);
            
            SET p_accounts_credited = p_accounts_credited + 1;
            SET p_total_interest_paid = p_total_interest_paid + v_interest;
        END IF;
    END LOOP;
    
    CLOSE cur_savings;
    COMMIT;
END //

DELIMITER ;

-- -------------------------------------------------------------------------------------
-- EXPERIMENT 9: VIEWS (MULTI-TABLE ANALYTICAL VIEWS & UPDATABLE SINGLE-TABLE VIEW)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW High_Value_Customers AS 
SELECT C.customer_id, C.First_name, C.Last_name, C.email, C.phone_number,
       A.Account_id, A.Account_number, A.account_type, A.branch_name, A.balance 
FROM Customers C
INNER JOIN Accounts A ON C.customer_id = A.customer_id
WHERE A.balance > 50000;

CREATE OR REPLACE VIEW Account_Summary AS
SELECT Account_id, Account_number, ifsc_code, branch_name, account_type, balance, opened_date, status, customer_id
FROM Accounts;

CREATE OR REPLACE VIEW Loan_Amortization_Schedule_View AS
SELECT L.loan_id, C.First_name, C.Last_name, L.loan_type, L.Attribute,
       L.amount AS Principal_Amount, L.interest_rate, L.tenure, L.status,
       fn_calculate_emi(L.amount, L.interest_rate, L.tenure) AS Monthly_EMI,
       ROUND(fn_calculate_emi(L.amount, L.interest_rate, L.tenure) * L.tenure, 2) AS Total_Payable,
       COALESCE((SELECT SUM(LP.amount) FROM Loan_payments LP WHERE LP.loan_id = L.loan_id), 0.00) AS Total_Paid_To_Date,
       E.First_name AS Approved_By_Officer
FROM Loan L
INNER JOIN Customers C ON L.customer_id = C.customer_id
LEFT JOIN Employee E ON L.approved_by = E.employee_id;

-- -------------------------------------------------------------------------------------
-- EXPERIMENT 4: DML STATEMENTS (SEEDING REALISTIC DATA)
-- -------------------------------------------------------------------------------------
INSERT INTO Account_Tiers (Tier_Name, Min_Balance, Max_Balance, Benefits) VALUES
('Silver', 0.00, 49999.99, 'Standard Debit Card & Free NEFT'),
('Gold', 50000.00, 99999.99, 'Zero IMPS Fees & Priority Counter Service'),
('Platinum', 100000.00, 99999999.99, 'Dedicated Relationship Manager & Preferential Loan Rates');

INSERT INTO Customers (customer_id, First_name, Last_name, email, phone_number, dob, address, kyc_status, password_hash) VALUES
(1, 'Aarav', 'Sharma', 'aarav@email.com', '9876543210', '1998-04-15', 'Malviya Nagar, Jaipur', 'Verified', 'cust123'),
(2, 'Priya', 'Verma', 'priya@email.com', '9876543211', '2001-11-20', 'Vaishali Nagar, Jaipur', 'Verified', 'cust123'),
(3, 'Rohan', 'Gupta', 'rohan@email.com', '9876543212', '1995-07-08', 'Connaught Place, Delhi', 'Verified', 'cust123'),
(4, 'Sneha', 'Iyer', 'sneha@email.com', '9876543213', '2002-01-30', 'Mansarovar, Jaipur', 'Verified', 'cust123'),
(5, 'Vikram', 'Singh', 'vikram@email.com', '9876543214', '1989-09-12', 'C-Scheme, Jaipur', 'Verified', 'cust123');

INSERT INTO Employee (employee_id, First_name, Last_name, email, role, branch_name, salary, password_hash) VALUES
(1, 'Rajesh', 'Khanna', 'rajesh@bankdb.com', 'Branch Manager', 'Jaipur Main', 95000.00, 'emp123'),
(2, 'Anita', 'Desai', 'anita@bankdb.com', 'Loan Officer', 'Jaipur Main', 72000.00, 'emp123'),
(3, 'Karan', 'Mehta', 'karan@bankdb.com', 'Senior Teller', 'MUJ Campus Branch', 55000.00, 'emp123');

INSERT INTO Accounts (Account_id, Account_number, ifsc_code, branch_name, account_type, balance, min_balance, opened_date, status, customer_id) VALUES
(101, 'ACC10001', 'BANK0001001', 'Jaipur Main', 'Savings', 75000.00, 2000.00, '2025-01-10', 'Active', 1),
(102, 'ACC10002', 'BANK0001001', 'Jaipur Main', 'Current', 145000.00, 10000.00, '2025-02-14', 'Active', 2),
(103, 'ACC10003', 'BANK0001002', 'Delhi Connaught', 'Savings', 32000.00, 2000.00, '2025-03-01', 'Active', 3),
(104, 'ACC10004', 'BANK0001003', 'MUJ Campus Branch', 'Salary', 64000.00, 0.00, '2025-04-19', 'Active', 4),
(105, 'ACC10005', 'BANK0001001', 'Jaipur Main', 'Savings', 95000.00, 2000.00, '2025-05-22', 'Active', 5);

INSERT INTO Cards (card_id, Card_number, card_type, cvv, pin_hash, daily_limit, card_status, expiry_date, Account_id) VALUES
(1, '4532019283746510', 'Debit', '412', '1234', 50000.00, 'Active', '2029-12-31', 101),
(2, '5412758493021928', 'Credit', '889', '5678', 150000.00, 'Active', '2028-08-31', 102),
(3, '4916283746591029', 'Debit', '305', '4321', 40000.00, 'Active', '2030-05-31', 104);

INSERT INTO Transactions (transaction_id, amount, transaction_type, description, Transaction_date, account_id, processed_by) VALUES
(301, 25000.00, 'Deposit', 'Initial Payroll Deposit', '2026-09-01 10:15:00', 101, 1),
(302, 5000.00, 'Withdrawal', 'ATM Cash Withdrawal', '2026-09-05 14:30:00', 102, 3),
(303, 12000.00, 'Deposit', 'Branch Cash Deposit', '2026-09-12 11:00:00', 103, 1),
(304, 14000.00, 'Deposit', 'NEFT Inward Remittance', '2026-09-20 16:45:00', 104, 2);

INSERT INTO Loan (loan_id, loan_type, Attribute, amount, interest_rate, tenure, start_date, status, customer_id, approved_by) VALUES
(201, 'Home Loan', 'Secured', 1500000.00, 8.50, 120, '2025-06-01', 'Approved', 1, 1),
(202, 'Personal Loan', 'Unsecured', 300000.00, 11.20, 36, '2025-08-15', 'Approved', 2, 2),
(203, 'Education Loan', 'Student', 600000.00, 7.80, 60, '2026-01-10', 'Pending', 4, NULL);

INSERT INTO Loan_payments (payment_id, amount, payment_date, status, loan_id, account_id) VALUES
(1, 18597.85, '2026-07-01', 'Paid', 201, 101),
(2, 18597.85, '2026-08-01', 'Paid', 201, 101),
(3, 9850.05, '2026-09-01', 'Paid', 202, 102);

-- Lab 4 Variant: INSERT INTO ... SELECT (Creating Customer_Archive backup)
CREATE TABLE IF NOT EXISTS Customer_Archive (
    customer_id INT PRIMARY KEY,
    First_name VARCHAR(50),
    Last_name VARCHAR(50),
    email VARCHAR(100)
);
INSERT IGNORE INTO Customer_Archive
SELECT customer_id, First_name, Last_name, email FROM Customers;

SELECT '✅ BankDB Master SQL Script executed successfully!' AS Status;
