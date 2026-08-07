CREATE TABLE `tbl_chart_of_accounts` (
	`account_id` varchar(50) NOT NULL,
	`account_code` varchar(50) NOT NULL,
	`account_name` varchar(150) NOT NULL,
	`account_group` varchar(100),
	`account_type` varchar(50),
	`status` varchar(50),
	CONSTRAINT `tbl_chart_of_accounts_account_id` PRIMARY KEY(`account_id`),
	CONSTRAINT `tbl_chart_of_accounts_account_code_unique` UNIQUE(`account_code`)
);

CREATE TABLE `tbl_financial_period` (
	`period_id` varchar(50) NOT NULL,
	`financial_year` varchar(20),
	`period_name` varchar(50),
	`start_date` timestamp,
	`end_date` timestamp,
	`status` varchar(50),
	CONSTRAINT `tbl_financial_period_period_id` PRIMARY KEY(`period_id`)
);

CREATE TABLE `tbl_invoice_sequence` (
	`sequence_id` varchar(50) NOT NULL,
	`financial_year` varchar(20),
	`branch_id` varchar(50),
	`invoice_type` varchar(50),
	`current_sequence` int DEFAULT 0,
	CONSTRAINT `tbl_invoice_sequence_sequence_id` PRIMARY KEY(`sequence_id`)
);

CREATE TABLE `tbl_invoice` (
	`invoice_id` varchar(50) NOT NULL,
	`invoice_number` varchar(100),
	`invoice_date` timestamp DEFAULT (now()),
	`invoice_type` varchar(50),
	`customer_id` varchar(50),
	`job_card_id` varchar(50),
	`estimate_id` varchar(50),
	`warranty_id` varchar(50),
	`amc_id` varchar(50),
	`fsb_id` varchar(50),
	`goodwill_id` varchar(50),
	`breakdown_id` varchar(50),
	`branch_id` varchar(50),
	`status` varchar(50),
	`currency` varchar(10) DEFAULT 'INR',
	`total_labour` decimal(12,2),
	`total_parts` decimal(12,2),
	`discount` decimal(12,2) DEFAULT '0',
	`taxable_amount` decimal(12,2),
	`gst_amount` decimal(12,2),
	`grand_total` decimal(12,2),
	`round_off` decimal(12,2),
	`net_amount` decimal(12,2),
	`created_by` varchar(50),
	`approved_by` varchar(50),
	CONSTRAINT `tbl_invoice_invoice_id` PRIMARY KEY(`invoice_id`),
	CONSTRAINT `tbl_invoice_invoice_number_unique` UNIQUE(`invoice_number`)
);

CREATE TABLE `tbl_invoice_line` (
	`invoice_line_id` varchar(50) NOT NULL,
	`invoice_id` varchar(50) NOT NULL,
	`line_number` int,
	`item_type` varchar(50),
	`reference_operation_id` varchar(50),
	`reference_part_number` varchar(100),
	`description` text,
	`quantity` decimal(10,2),
	`rate` decimal(12,2),
	`discount` decimal(12,2) DEFAULT '0',
	`taxable_amount` decimal(12,2),
	`tax_amount` decimal(12,2),
	`net_amount` decimal(12,2),
	CONSTRAINT `tbl_invoice_line_invoice_line_id` PRIMARY KEY(`invoice_line_id`)
);

CREATE TABLE `tbl_invoice_revision` (
	`revision_id` varchar(50) NOT NULL,
	`invoice_id` varchar(50) NOT NULL,
	`version` int,
	`reason` text,
	`changed_by` varchar(50),
	`changed_date` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_invoice_revision_revision_id` PRIMARY KEY(`revision_id`)
);

CREATE TABLE `tbl_credit_note` (
	`credit_note_id` varchar(50) NOT NULL,
	`credit_note_number` varchar(100),
	`invoice_id` varchar(50),
	`reason` text,
	`amount` decimal(12,2),
	`gst_amount` decimal(12,2),
	`status` varchar(50),
	CONSTRAINT `tbl_credit_note_credit_note_id` PRIMARY KEY(`credit_note_id`)
);

CREATE TABLE `tbl_debit_note` (
	`debit_note_id` varchar(50) NOT NULL,
	`debit_note_number` varchar(100),
	`invoice_id` varchar(50),
	`reason` text,
	`amount` decimal(12,2),
	`gst_amount` decimal(12,2),
	`status` varchar(50),
	CONSTRAINT `tbl_debit_note_debit_note_id` PRIMARY KEY(`debit_note_id`)
);

CREATE TABLE `tbl_receipt` (
	`receipt_id` varchar(50) NOT NULL,
	`receipt_number` varchar(100),
	`customer_id` varchar(50),
	`receipt_date` timestamp DEFAULT (now()),
	`amount` decimal(12,2),
	`mode` varchar(50),
	`reference_number` varchar(100),
	`bank` varchar(100),
	`status` varchar(50),
	CONSTRAINT `tbl_receipt_receipt_id` PRIMARY KEY(`receipt_id`)
);

CREATE TABLE `tbl_payment_allocation` (
	`allocation_id` varchar(50) NOT NULL,
	`receipt_id` varchar(50) NOT NULL,
	`invoice_id` varchar(50) NOT NULL,
	`allocated_amount` decimal(12,2),
	`allocation_date` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_payment_allocation_allocation_id` PRIMARY KEY(`allocation_id`)
);

CREATE TABLE `tbl_customer_ledger` (
	`ledger_entry_id` varchar(50) NOT NULL,
	`customer_id` varchar(50) NOT NULL,
	`reference_type` varchar(50),
	`reference_id` varchar(50),
	`debit` decimal(12,2) DEFAULT '0',
	`credit` decimal(12,2) DEFAULT '0',
	`running_balance` decimal(12,2),
	`transaction_date` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_customer_ledger_ledger_entry_id` PRIMARY KEY(`ledger_entry_id`)
);

CREATE TABLE `tbl_vendor_ledger` (
	`ledger_entry_id` varchar(50) NOT NULL,
	`vendor_id` varchar(50) NOT NULL,
	`reference_type` varchar(50),
	`reference_id` varchar(50),
	`debit` decimal(12,2) DEFAULT '0',
	`credit` decimal(12,2) DEFAULT '0',
	`running_balance` decimal(12,2),
	`transaction_date` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_vendor_ledger_ledger_entry_id` PRIMARY KEY(`ledger_entry_id`)
);

CREATE TABLE `tbl_tax_transaction` (
	`tax_txn_id` varchar(50) NOT NULL,
	`reference_type` varchar(50),
	`reference_id` varchar(50),
	`tax_type` varchar(50),
	`gst_percent` decimal(5,2),
	`cgst` decimal(12,2) DEFAULT '0',
	`sgst` decimal(12,2) DEFAULT '0',
	`igst` decimal(12,2) DEFAULT '0',
	`cess` decimal(12,2) DEFAULT '0',
	`taxable_amount` decimal(12,2),
	`tax_amount` decimal(12,2),
	`transaction_date` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_tax_transaction_tax_txn_id` PRIMARY KEY(`tax_txn_id`)
);

CREATE TABLE `tbl_financial_journal` (
	`journal_id` varchar(50) NOT NULL,
	`journal_number` varchar(100),
	`voucher_type` varchar(50),
	`reference_type` varchar(50),
	`reference_id` varchar(50),
	`posting_date` timestamp DEFAULT (now()),
	`status` varchar(50),
	`total_debit` decimal(15,2),
	`total_credit` decimal(15,2),
	`period_id` varchar(50),
	`narration` text,
	CONSTRAINT `tbl_financial_journal_journal_id` PRIMARY KEY(`journal_id`)
);

CREATE TABLE `tbl_financial_journal_line` (
	`journal_line_id` varchar(50) NOT NULL,
	`journal_id` varchar(50) NOT NULL,
	`account_id` varchar(50) NOT NULL,
	`debit` decimal(15,2) DEFAULT '0',
	`credit` decimal(15,2) DEFAULT '0',
	`cost_center_branch` varchar(50),
	`cost_center_dept` varchar(50),
	`cost_center_entity` varchar(50),
	CONSTRAINT `tbl_financial_journal_line_journal_line_id` PRIMARY KEY(`journal_line_id`)
);
