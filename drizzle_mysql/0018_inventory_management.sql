
CREATE TABLE \	bl_parts_master\ (
	\part_number\ varchar(100) NOT NULL,
	\part_description\ text,
	\oem_part_number\ varchar(100),
	\category\ varchar(50),
	\sub_category\ varchar(50),
	\uom\ varchar(20),
	\hsn_code\ varchar(20),
	\gst_rate\ decimal(5,2),
	\bc_classification\ varchar(1),
	\sn_classification\ varchar(1),
	\critical_part_flag\ boolean DEFAULT false,
	\warranty_eligible\ boolean DEFAULT true,
	\shelf_life_days\ int,
	\min_stock\ int DEFAULT 0,
	\max_stock\ int DEFAULT 0,
	\eorder_level\ int DEFAULT 0,
	\eorder_quantity\ int DEFAULT 0,
	\preferred_vendor_id\ varchar(50),
	\status\ varchar(50),
	CONSTRAINT \	bl_parts_master_part_number\ PRIMARY KEY(\part_number\)
);
--> statement-breakpoint
CREATE TABLE \	bl_part_supersession\ (
	\supersession_id\ varchar(50) NOT NULL,
	\old_part_number\ varchar(100) NOT NULL,
	\
ew_part_number\ varchar(100) NOT NULL,
	\effective_date\ timestamp DEFAULT (now()),
	\status\ varchar(50),
	CONSTRAINT \	bl_part_supersession_supersession_id\ PRIMARY KEY(\supersession_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_warehouse_master\ (
	\warehouse_id\ varchar(50) NOT NULL,
	\ranch_id\ varchar(50),
	\location\ varchar(100),
	\	ype\ varchar(50),
	\status\ varchar(50),
	CONSTRAINT \	bl_warehouse_master_warehouse_id\ PRIMARY KEY(\warehouse_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_bin_master\ (
	\in_id\ varchar(50) NOT NULL,
	\warehouse_id\ varchar(50) NOT NULL,
	\in_code\ varchar(50),
	\ack\ varchar(50),
	\shelf\ varchar(50),
	\capacity\ int,
	\status\ varchar(50),
	CONSTRAINT \	bl_bin_master_bin_id\ PRIMARY KEY(\in_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_inventory_stock\ (
	\stock_id\ varchar(50) NOT NULL,
	\part_number\ varchar(100) NOT NULL,
	\warehouse_id\ varchar(50) NOT NULL,
	\in_id\ varchar(50),
	\current_quantity\ decimal(12,2) DEFAULT '0',
	\eserved_quantity\ decimal(12,2) DEFAULT '0',
	\vailable_quantity\ decimal(12,2) DEFAULT '0',
	\locked_quantity\ decimal(12,2) DEFAULT '0',
	\in_transit_quantity\ decimal(12,2) DEFAULT '0',
	\verage_cost\ decimal(12,2) DEFAULT '0',
	\last_purchase_cost\ decimal(12,2) DEFAULT '0',
	\inventory_value\ decimal(15,2) DEFAULT '0',
	CONSTRAINT \	bl_inventory_stock_stock_id\ PRIMARY KEY(\stock_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_inventory_batch\ (
	\atch_id\ varchar(50) NOT NULL,
	\part_number\ varchar(100) NOT NULL,
	\atch_number\ varchar(100) NOT NULL,
	\manufacturing_date\ timestamp,
	\expiry_date\ timestamp,
	\status\ varchar(50),
	CONSTRAINT \	bl_inventory_batch_batch_id\ PRIMARY KEY(\atch_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_inventory_serial\ (
	\serial_id\ varchar(50) NOT NULL,
	\part_number\ varchar(100) NOT NULL,
	\serial_number\ varchar(100) NOT NULL,
	\atch_id\ varchar(50),
	\warehouse_id\ varchar(50),
	\status\ varchar(50),
	CONSTRAINT \	bl_inventory_serial_serial_id\ PRIMARY KEY(\serial_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_goods_receipt\ (
	\grn_number\ varchar(50) NOT NULL,
	\endor_id\ varchar(50),
	\po_reference\ varchar(50),
	\invoice_number\ varchar(50),
	\invoice_date\ timestamp,
	\eceived_date\ timestamp DEFAULT (now()),
	\warehouse_id\ varchar(50),
	\status\ varchar(50),
	CONSTRAINT \	bl_goods_receipt_grn_number\ PRIMARY KEY(\grn_number\)
);
--> statement-breakpoint
CREATE TABLE \	bl_goods_receipt_line\ (
	\grn_line_id\ varchar(50) NOT NULL,
	\grn_number\ varchar(50) NOT NULL,
	\part_number\ varchar(100) NOT NULL,
	\ordered_quantity\ decimal(10,2),
	\eceived_quantity\ decimal(10,2),
	\ccepted_quantity\ decimal(10,2),
	\ejected_quantity\ decimal(10,2),
	\ate\ decimal(10,2),
	\	ax\ decimal(10,2),
	\atch_number\ varchar(100),
	\serial_number\ varchar(100),
	\expiry_date\ timestamp,
	CONSTRAINT \	bl_goods_receipt_line_grn_line_id\ PRIMARY KEY(\grn_line_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_stock_transaction\ (
	\	ransaction_id\ varchar(50) NOT NULL,
	\	ransaction_type\ varchar(50),
	\part_number\ varchar(100) NOT NULL,
	\warehouse_id\ varchar(50),
	\in_id\ varchar(50),
	\eference_type\ varchar(50),
	\eference_id\ varchar(50),
	\quantity\ decimal(12,2),
	\unit_cost\ decimal(12,2),
	\unning_balance\ decimal(12,2),
	\	ransaction_time\ timestamp DEFAULT (now()),
	\performed_by\ varchar(50),
	\eason\ text,
	CONSTRAINT \	bl_stock_transaction_transaction_id\ PRIMARY KEY(\	ransaction_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_stock_reservation\ (
	\eservation_number\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50),
	\part_number\ varchar(100) NOT NULL,
	\eserved_quantity\ decimal(12,2),
	\issued_quantity\ decimal(12,2) DEFAULT '0',
	\eleased_quantity\ decimal(12,2) DEFAULT '0',
	\status\ varchar(50),
	CONSTRAINT \	bl_stock_reservation_reservation_number\ PRIMARY KEY(\eservation_number\)
);
--> statement-breakpoint
CREATE TABLE \	bl_goods_issue\ (
	\issue_number\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50),
	\part_number\ varchar(100) NOT NULL,
	\issued_quantity\ decimal(12,2),
	\warehouse_id\ varchar(50),
	\in_id\ varchar(50),
	\	echnician_id\ varchar(50),
	\issue_time\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_goods_issue_issue_number\ PRIMARY KEY(\issue_number\)
);
--> statement-breakpoint
CREATE TABLE \	bl_goods_return\ (
	\eturn_number\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50),
	\part_number\ varchar(100) NOT NULL,
	\eturned_quantity\ decimal(12,2),
	\eason\ varchar(100),
	\condition\ varchar(50),
	\warehouse_id\ varchar(50),
	\eturn_time\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_goods_return_return_number\ PRIMARY KEY(\eturn_number\)
);
--> statement-breakpoint
CREATE TABLE \	bl_stock_transfer\ (
	\	ransfer_number\ varchar(50) NOT NULL,
	\source_warehouse_id\ varchar(50),
	\destination_warehouse_id\ varchar(50),
	\part_number\ varchar(100) NOT NULL,
	\quantity\ decimal(12,2),
	\dispatch_time\ timestamp,
	\eceipt_time\ timestamp,
	\status\ varchar(50),
	CONSTRAINT \	bl_stock_transfer_transfer_number\ PRIMARY KEY(\	ransfer_number\)
);
--> statement-breakpoint
CREATE TABLE \	bl_stock_verification\ (
	\erification_number\ varchar(50) NOT NULL,
	\warehouse_id\ varchar(50),
	\erification_date\ timestamp DEFAULT (now()),
	\system_quantity\ decimal(12,2),
	\physical_quantity\ decimal(12,2),
	\ariance\ decimal(12,2),
	\pproved_by\ varchar(50),
	CONSTRAINT \	bl_stock_verification_verification_number\ PRIMARY KEY(\erification_number\)
);

