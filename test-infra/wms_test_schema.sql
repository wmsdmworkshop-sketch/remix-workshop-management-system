-- MySQL dump 10.13  Distrib 9.7.1, for Win64 (x86_64)
--
-- Host: thomas.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `railway`
--



--
-- Table structure for table `alert_config_master`
--

DROP TABLE IF EXISTS `alert_config_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_config_master` (
  `alert_id` int unsigned NOT NULL AUTO_INCREMENT,
  `alert_type` varchar(50) NOT NULL,
  `trigger_minutes` int unsigned NOT NULL DEFAULT '30',
  `level_1_role` varchar(50) DEFAULT NULL,
  `level_2_role` varchar(50) DEFAULT NULL,
  `level_3_role` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`alert_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_config_master`
--

LOCK TABLES `alert_config_master` WRITE;
/*!40000 ALTER TABLE `alert_config_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_config_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_configs`
--

DROP TABLE IF EXISTS `alert_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_configs` (
  `alert_config_id` int NOT NULL,
  `alert_code` text NOT NULL,
  `alert_name` text NOT NULL,
  `alert_category` text NOT NULL,
  `trigger_condition` text NOT NULL,
  `threshold_value` int NOT NULL,
  `threshold_unit` text NOT NULL,
  `severity` text NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`alert_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_configs`
--

LOCK TABLES `alert_configs` WRITE;
/*!40000 ALTER TABLE `alert_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_log`
--

DROP TABLE IF EXISTS `alert_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_log` (
  `log_id` int unsigned NOT NULL AUTO_INCREMENT,
  `alert_id` int unsigned NOT NULL,
  `job_card_id` int unsigned NOT NULL,
  `triggered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `alert_level` enum('Level 1','Level 2','Level 3') NOT NULL,
  `notified_role` varchar(50) DEFAULT NULL,
  `is_resolved` tinyint(1) NOT NULL DEFAULT '0',
  `resolved_by` int unsigned DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `remarks` text,
  PRIMARY KEY (`log_id`),
  KEY `alert_id` (`alert_id`),
  KEY `job_card_id` (`job_card_id`),
  KEY `resolved_by` (`resolved_by`),
  CONSTRAINT `alert_log_ibfk_1` FOREIGN KEY (`alert_id`) REFERENCES `alert_config_master` (`alert_id`),
  CONSTRAINT `alert_log_ibfk_2` FOREIGN KEY (`job_card_id`) REFERENCES `job_card_master` (`job_card_id`),
  CONSTRAINT `alert_log_ibfk_3` FOREIGN KEY (`resolved_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_log`
--

LOCK TABLES `alert_log` WRITE;
/*!40000 ALTER TABLE `alert_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_logs`
--

DROP TABLE IF EXISTS `alert_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_logs` (
  `alert_id` int NOT NULL,
  `alert_config_id` int NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` int NOT NULL,
  `alert_message` text NOT NULL,
  `severity` text NOT NULL,
  `status` text NOT NULL,
  `acknowledged_by` int DEFAULT NULL,
  `acknowledged_at` text,
  `resolved_at` text,
  `created_at` text NOT NULL,
  PRIMARY KEY (`alert_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_logs`
--

LOCK TABLES `alert_logs` WRITE;
/*!40000 ALTER TABLE `alert_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_legacy_bays`
--

DROP TABLE IF EXISTS `backup_legacy_bays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_legacy_bays` (
  `bay_id` int NOT NULL,
  `bay_code` text NOT NULL,
  `bay_name` text NOT NULL,
  `bay_type` text NOT NULL,
  `status` text NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`bay_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_legacy_bays`
--

LOCK TABLES `backup_legacy_bays` WRITE;
/*!40000 ALTER TABLE `backup_legacy_bays` DISABLE KEYS */;
/*!40000 ALTER TABLE `backup_legacy_bays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_legacy_employees`
--

DROP TABLE IF EXISTS `backup_legacy_employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_legacy_employees` (
  `employee_id` int NOT NULL,
  `full_name` text NOT NULL,
  `employee_code` text NOT NULL,
  `role` text NOT NULL,
  `employee_grade` text NOT NULL,
  `basic_salary` int NOT NULL,
  `mobile` text NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` text,
  `allocated_revenue` int DEFAULT NULL,
  `target_revenue` int DEFAULT NULL,
  `paid_pct` text,
  `tml_claim_pct` text,
  PRIMARY KEY (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_legacy_employees`
--

LOCK TABLES `backup_legacy_employees` WRITE;
/*!40000 ALTER TABLE `backup_legacy_employees` DISABLE KEYS */;
/*!40000 ALTER TABLE `backup_legacy_employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_legacy_job_cards`
--

DROP TABLE IF EXISTS `backup_legacy_job_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_legacy_job_cards` (
  `job_id` int NOT NULL,
  `job_card_no` text NOT NULL,
  `vrn` text NOT NULL,
  `customer_name` text NOT NULL,
  `customer_mobile` text NOT NULL,
  `vehicle_make` text NOT NULL,
  `vehicle_model` text NOT NULL,
  `vehicle_year` int NOT NULL,
  `km_reading` int NOT NULL,
  `sr_type_id` int NOT NULL,
  `job_description` text NOT NULL,
  `priority` text NOT NULL,
  `bay_id` int DEFAULT NULL,
  `status` text NOT NULL,
  `etd` text NOT NULL,
  `started_at` text,
  `completed_at` text,
  `invoiced_at` text,
  `created_by` int NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text,
  `workshop_stage` text,
  `l1_delay` text,
  `l2_delay` text,
  `l3_delay` text,
  `l5_delay` text,
  `delay_notes` text,
  `time_slot` text,
  `tat_status` text,
  `pending_reason` text,
  `remarks` text,
  `date_in` text,
  `time_in` text,
  `expected_date_out` text,
  `expected_time_of_completion` text,
  `time_out` text,
  `date_completed` text,
  `bay_no` text,
  `service_advisor` text,
  `technician_name` text,
  `no_of_laborers` int DEFAULT NULL,
  `actual_time_taken` text,
  `numberplate_photo` text,
  `odometer_photo` text,
  `chassis_number` text,
  `driver_name` text,
  `driver_mobile` text,
  `driver_image` longtext,
  `token_number` text,
  `waiting_time_mins` int DEFAULT NULL,
  `progress_pct` int DEFAULT '0',
  `parts_price` int DEFAULT '0',
  `labor_price` int DEFAULT '0',
  `parts_status` varchar(255) DEFAULT 'None',
  `parts_list` text,
  `parts_images` longtext,
  `warranty_status` varchar(255) DEFAULT 'None',
  `payment_method` varchar(255) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `gate_pass_issued` tinyint(1) DEFAULT '0',
  `exited_at` text,
  PRIMARY KEY (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_legacy_job_cards`
--

LOCK TABLES `backup_legacy_job_cards` WRITE;
/*!40000 ALTER TABLE `backup_legacy_job_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `backup_legacy_job_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bay_master`
--

DROP TABLE IF EXISTS `bay_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bay_master` (
  `bay_id` int unsigned NOT NULL AUTO_INCREMENT,
  `bay_code` varchar(10) NOT NULL,
  `bay_name` varchar(50) NOT NULL,
  `bay_type` varchar(50) DEFAULT NULL,
  `bay_status` enum('Available','In Progress','Waiting Parts','Ready Delivery','Carry Forward','Blocked') DEFAULT 'Available',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `grid_row` int unsigned DEFAULT '1',
  `grid_column` int unsigned DEFAULT '1',
  `entry_direction` enum('Front','Rear') DEFAULT 'Front',
  PRIMARY KEY (`bay_id`),
  UNIQUE KEY `bay_code` (`bay_code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bay_master`
--

LOCK TABLES `bay_master` WRITE;
/*!40000 ALTER TABLE `bay_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `bay_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bay_queue`
--

DROP TABLE IF EXISTS `bay_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bay_queue` (
  `queue_id` int unsigned NOT NULL AUTO_INCREMENT,
  `bay_id` int unsigned NOT NULL,
  `job_card_id` int unsigned NOT NULL,
  `queue_position` int unsigned NOT NULL DEFAULT '1',
  `queue_status` varchar(50) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`queue_id`),
  KEY `bay_id` (`bay_id`),
  KEY `job_card_id` (`job_card_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `bay_queue_ibfk_1` FOREIGN KEY (`bay_id`) REFERENCES `bay_master` (`bay_id`),
  CONSTRAINT `bay_queue_ibfk_2` FOREIGN KEY (`job_card_id`) REFERENCES `job_card_master` (`job_card_id`),
  CONSTRAINT `bay_queue_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bay_queue`
--

LOCK TABLES `bay_queue` WRITE;
/*!40000 ALTER TABLE `bay_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `bay_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bays`
--

DROP TABLE IF EXISTS `bays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bays` (
  `bay_id` int NOT NULL,
  `bay_code` varchar(50) NOT NULL,
  `bay_name` varchar(100) NOT NULL,
  `bay_type` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Idle',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`bay_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bays`
--

LOCK TABLES `bays` WRITE;
/*!40000 ALTER TABLE `bays` DISABLE KEYS */;
/*!40000 ALTER TABLE `bays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carry_forward_log`
--

DROP TABLE IF EXISTS `carry_forward_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carry_forward_log` (
  `cf_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int unsigned NOT NULL,
  `original_date` date NOT NULL,
  `carry_date` date NOT NULL,
  `reason` text,
  `cf_status` enum('Pending','Resolved','Escalated') NOT NULL DEFAULT 'Pending',
  `logged_by` int unsigned NOT NULL,
  `resolved_by` int unsigned DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cf_id`),
  KEY `job_card_id` (`job_card_id`),
  KEY `logged_by` (`logged_by`),
  KEY `resolved_by` (`resolved_by`),
  CONSTRAINT `carry_forward_log_ibfk_1` FOREIGN KEY (`job_card_id`) REFERENCES `job_card_master` (`job_card_id`),
  CONSTRAINT `carry_forward_log_ibfk_2` FOREIGN KEY (`logged_by`) REFERENCES `employee_master` (`employee_id`),
  CONSTRAINT `carry_forward_log_ibfk_3` FOREIGN KEY (`resolved_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carry_forward_log`
--

LOCK TABLES `carry_forward_log` WRITE;
/*!40000 ALTER TABLE `carry_forward_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `carry_forward_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carry_forward_logs`
--

DROP TABLE IF EXISTS `carry_forward_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carry_forward_logs` (
  `cf_id` int NOT NULL,
  `job_id` int NOT NULL,
  `cf_reason` text NOT NULL,
  `raised_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `cf_status` text NOT NULL,
  `raised_at` text NOT NULL,
  `actioned_at` text,
  PRIMARY KEY (`cf_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carry_forward_logs`
--

LOCK TABLES `carry_forward_logs` WRITE;
/*!40000 ALTER TABLE `carry_forward_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `carry_forward_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dealership_service_history`
--

DROP TABLE IF EXISTS `dealership_service_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dealership_service_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vrn` varchar(50) DEFAULT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `service_date` varchar(100) DEFAULT NULL,
  `odometer` int DEFAULT NULL,
  `sr_type` varchar(100) DEFAULT NULL,
  `complaint_summary` text,
  `parts_cost` int DEFAULT '0',
  `labor_cost` int DEFAULT '0',
  `total_cost` int DEFAULT '0',
  `advisor_name` varchar(255) DEFAULT NULL,
  `technician_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dealership_service_history`
--

LOCK TABLES `dealership_service_history` WRITE;
/*!40000 ALTER TABLE `dealership_service_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `dealership_service_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dim_vehicle_master`
--

DROP TABLE IF EXISTS `dim_vehicle_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dim_vehicle_master` (
  `chassis_no` varchar(100) NOT NULL,
  `registration_no` varchar(50) DEFAULT NULL,
  `engine_no` varchar(100) DEFAULT NULL,
  `product_line` varchar(100) DEFAULT NULL,
  `owner_account_name` varchar(255) DEFAULT NULL,
  `original_sale_date` date DEFAULT NULL,
  `tm_invoice_date` date DEFAULT NULL,
  `warranty_expiry_date` date DEFAULT NULL,
  `warranty_expiry_km` int DEFAULT NULL,
  `warranty_expiry_hours` int DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`chassis_no`),
  UNIQUE KEY `registration_no` (`registration_no`),
  KEY `idx_registration` (`registration_no`),
  KEY `idx_vehicle_reg` (`registration_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dim_vehicle_master`
--

LOCK TABLES `dim_vehicle_master` WRITE;
/*!40000 ALTER TABLE `dim_vehicle_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `dim_vehicle_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dms_import_batch`
--

DROP TABLE IF EXISTS `dms_import_batch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dms_import_batch` (
  `batch_id` int unsigned NOT NULL AUTO_INCREMENT,
  `imported_by` int unsigned NOT NULL,
  `import_date` date NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `total_rows` int unsigned DEFAULT '0',
  `matched_rows` int unsigned DEFAULT '0',
  `mismatched_rows` int unsigned DEFAULT '0',
  `not_found_rows` int unsigned DEFAULT '0',
  `status` enum('Processing','Completed','Failed') NOT NULL DEFAULT 'Processing',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_id`),
  KEY `imported_by` (`imported_by`),
  CONSTRAINT `dms_import_batch_ibfk_1` FOREIGN KEY (`imported_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dms_import_batch`
--

LOCK TABLES `dms_import_batch` WRITE;
/*!40000 ALTER TABLE `dms_import_batch` DISABLE KEYS */;
/*!40000 ALTER TABLE `dms_import_batch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dms_import_batches`
--

DROP TABLE IF EXISTS `dms_import_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dms_import_batches` (
  `batch_id` int NOT NULL,
  `imported_by` int NOT NULL,
  `file_name` text NOT NULL,
  `total_rows` int NOT NULL,
  `matched_rows` int NOT NULL,
  `unmatched_rows` int NOT NULL,
  `status` text NOT NULL,
  `imported_at` text NOT NULL,
  PRIMARY KEY (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dms_import_batches`
--

LOCK TABLES `dms_import_batches` WRITE;
/*!40000 ALTER TABLE `dms_import_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `dms_import_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dms_import_row`
--

DROP TABLE IF EXISTS `dms_import_row`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dms_import_row` (
  `row_id` int unsigned NOT NULL AUTO_INCREMENT,
  `batch_id` int unsigned NOT NULL,
  `job_card_no` varchar(30) NOT NULL,
  `vehicle_reg` varchar(20) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `final_labour` decimal(10,2) DEFAULT '0.00',
  `final_spare` decimal(10,2) DEFAULT '0.00',
  `final_cons` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `invoice_no` varchar(30) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `match_status` enum('Matched','Mismatched','Not Found') NOT NULL DEFAULT 'Not Found',
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`row_id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `dms_import_row_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `dms_import_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dms_import_row`
--

LOCK TABLES `dms_import_row` WRITE;
/*!40000 ALTER TABLE `dms_import_row` DISABLE KEYS */;
/*!40000 ALTER TABLE `dms_import_row` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dms_import_rows`
--

DROP TABLE IF EXISTS `dms_import_rows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dms_import_rows` (
  `row_id` int NOT NULL,
  `batch_id` int NOT NULL,
  `row_number` int NOT NULL,
  `vrn` text NOT NULL,
  `job_date` text NOT NULL,
  `sr_type` text NOT NULL,
  `labour_amount` int NOT NULL,
  `parts_amount` int NOT NULL,
  `total_amount` int NOT NULL,
  `matched_job_id` int DEFAULT NULL,
  `match_status` text NOT NULL,
  `conflict_reason` text,
  `resolved_by` int DEFAULT NULL,
  `resolved_at` text,
  `raw_data` text,
  PRIMARY KEY (`row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dms_import_rows`
--

LOCK TABLES `dms_import_rows` WRITE;
/*!40000 ALTER TABLE `dms_import_rows` DISABLE KEYS */;
/*!40000 ALTER TABLE `dms_import_rows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_master`
--

DROP TABLE IF EXISTS `employee_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_master` (
  `employee_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `employee_code` varchar(20) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `employee_grade` varchar(50) DEFAULT NULL,
  `basic_salary` decimal(10,2) NOT NULL DEFAULT '0.00',
  `mobile` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `employee_code` (`employee_code`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_master`
--

LOCK TABLES `employee_master` WRITE;
/*!40000 ALTER TABLE `employee_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `employee_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `role` varchar(100) NOT NULL,
  `employee_grade` varchar(50) NOT NULL DEFAULT 'Junior',
  `basic_salary` int NOT NULL DEFAULT '0',
  `mobile` varchar(50) NOT NULL DEFAULT '',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` varchar(100) DEFAULT NULL,
  `allocated_revenue` int DEFAULT '0',
  `target_revenue` int DEFAULT NULL,
  `paid_pct` varchar(50) DEFAULT NULL,
  `tml_claim_pct` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `employee_code` (`employee_code`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fact_invoices`
--

DROP TABLE IF EXISTS `fact_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fact_invoices` (
  `invoice_no` varchar(100) NOT NULL,
  `chassis_no` varchar(100) DEFAULT NULL,
  `registration_no` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `net_amount` decimal(15,2) DEFAULT NULL,
  `labour_amount` decimal(15,2) DEFAULT NULL,
  `spares_amount` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`invoice_no`),
  KEY `idx_invoice_chassis` (`chassis_no`),
  CONSTRAINT `fact_invoices_ibfk_1` FOREIGN KEY (`chassis_no`) REFERENCES `dim_vehicle_master` (`chassis_no`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fact_invoices`
--

LOCK TABLES `fact_invoices` WRITE;
/*!40000 ALTER TABLE `fact_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `fact_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fact_service_history`
--

DROP TABLE IF EXISTS `fact_service_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fact_service_history` (
  `job_card_no` varchar(100) NOT NULL,
  `chassis_no` varchar(100) DEFAULT NULL,
  `registration_no` varchar(50) DEFAULT NULL,
  `job_card_open_date` date DEFAULT NULL,
  `job_card_close_date` date DEFAULT NULL,
  `odometer_reading` int DEFAULT NULL,
  `sr_no` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`job_card_no`),
  KEY `idx_service_chassis` (`chassis_no`),
  CONSTRAINT `fact_service_history_ibfk_1` FOREIGN KEY (`chassis_no`) REFERENCES `dim_vehicle_master` (`chassis_no`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fact_service_history`
--

LOCK TABLES `fact_service_history` WRITE;
/*!40000 ALTER TABLE `fact_service_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `fact_service_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fsb_master`
--

DROP TABLE IF EXISTS `fsb_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fsb_master` (
  `fsb_id` int NOT NULL AUTO_INCREMENT,
  `job_card_id` int DEFAULT NULL,
  `fsb_status` enum('Settled','Rejected','Deviation') DEFAULT 'Settled',
  PRIMARY KEY (`fsb_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fsb_master`
--

LOCK TABLES `fsb_master` WRITE;
/*!40000 ALTER TABLE `fsb_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `fsb_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gate_entries`
--

DROP TABLE IF EXISTS `gate_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gate_entries` (
  `gate_id` int NOT NULL,
  `token_number` varchar(255) NOT NULL,
  `vrn` varchar(255) NOT NULL,
  `vehicle_model` varchar(255) NOT NULL,
  `chassis_number` varchar(255) NOT NULL,
  `km_reading` int NOT NULL,
  `driver_name` varchar(255) NOT NULL,
  `driver_mobile` varchar(255) NOT NULL,
  `driver_image` longtext,
  `waiting_time_mins` int NOT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  PRIMARY KEY (`gate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gate_entries`
--

LOCK TABLES `gate_entries` WRITE;
/*!40000 ALTER TABLE `gate_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `gate_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_card_master`
--

DROP TABLE IF EXISTS `job_card_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_card_master` (
  `job_card_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_no` varchar(30) NOT NULL,
  `bay_id` int unsigned NOT NULL,
  `vehicle_reg` varchar(10) DEFAULT NULL,
  `chassis_no` varchar(50) DEFAULT NULL,
  `customer_name` varchar(100) NOT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `driver_mobile` varchar(15) NOT NULL DEFAULT '0000000000',
  `mobile` varchar(15) DEFAULT NULL,
  `service_type` enum('Oil Change','2 Service','3 Service','FIP','Gear Box','Low Pickup','Engine Oil Leakage','Check Nut','Balon','Lift XL','General Repair','Electrical','AC Service','Wheel Alignment','Other') DEFAULT NULL,
  `job_status` enum('Open','In Progress','Waiting Parts','Ready','Delivered','Carry Forward','Assigned','Unassigned','In Queue') DEFAULT 'Unassigned',
  `assigned_to` int unsigned NOT NULL,
  `etd` datetime NOT NULL,
  `actual_delivery` datetime DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `live_status` varchar(50) DEFAULT 0xF09F94B52057616974696E6720416C6C6F636174696F6E,
  `billing_status` varchar(50) DEFAULT 'Pending',
  `tech_slot_1` int DEFAULT NULL,
  `tech_slot_2` int DEFAULT NULL,
  `tech_slot_3` int DEFAULT NULL,
  `tech_slot_4` int DEFAULT NULL,
  `tech_slot_5` int DEFAULT NULL,
  `jc_revenue` decimal(10,2) DEFAULT '0.00',
  `crm_jc_no` varchar(50) DEFAULT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `estimated_amount` decimal(10,2) DEFAULT '0.00',
  `invoice_no` varchar(50) DEFAULT NULL,
  `gate_out_time` datetime DEFAULT NULL,
  `last_service_date` varchar(100) DEFAULT NULL,
  `odometer_reading` int DEFAULT NULL,
  `invoice_ocr_data` text,
  PRIMARY KEY (`job_card_id`),
  UNIQUE KEY `job_card_no` (`job_card_no`),
  KEY `bay_id` (`bay_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `created_by` (`created_by`),
  KEY `idx_jcm_vehicle_reg` (`vehicle_reg`),
  KEY `idx_jcm_chassis_no` (`chassis_no`),
  KEY `idx_jcm_crm_jc_no` (`crm_jc_no`),
  KEY `idx_jcm_job_status` (`job_status`),
  CONSTRAINT `job_card_master_ibfk_1` FOREIGN KEY (`bay_id`) REFERENCES `bay_master` (`bay_id`),
  CONSTRAINT `job_card_master_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `employee_master` (`employee_id`),
  CONSTRAINT `job_card_master_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6482 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_card_master`
--

LOCK TABLES `job_card_master` WRITE;
/*!40000 ALTER TABLE `job_card_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_card_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_card_parts`
--

DROP TABLE IF EXISTS `job_card_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_card_parts` (
  `part_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int unsigned NOT NULL,
  `job_card_no` varchar(30) NOT NULL,
  `part_code` varchar(50) DEFAULT NULL,
  `part_name` varchar(100) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `unit_price` decimal(10,2) DEFAULT '0.00',
  `total_price` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int unsigned NOT NULL,
  PRIMARY KEY (`part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_card_parts`
--

LOCK TABLES `job_card_parts` WRITE;
/*!40000 ALTER TABLE `job_card_parts` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_card_parts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_card_service_item`
--

DROP TABLE IF EXISTS `job_card_service_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_card_service_item` (
  `service_item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int unsigned NOT NULL,
  `job_card_no` varchar(30) NOT NULL,
  `service_code` varchar(50) DEFAULT NULL,
  `service_desc` varchar(200) NOT NULL,
  `labour_amount` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int unsigned NOT NULL,
  PRIMARY KEY (`service_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_card_service_item`
--

LOCK TABLES `job_card_service_item` WRITE;
/*!40000 ALTER TABLE `job_card_service_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_card_service_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_card_technician`
--

DROP TABLE IF EXISTS `job_card_technician`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_card_technician` (
  `jct_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int unsigned NOT NULL,
  `job_card_no` varchar(30) NOT NULL,
  `technician_id` int unsigned NOT NULL,
  `role_type` varchar(30) NOT NULL,
  `weightage` decimal(5,2) DEFAULT '0.00',
  `time_in` datetime DEFAULT NULL,
  `time_out` datetime DEFAULT NULL,
  `hours_worked` decimal(5,2) DEFAULT '0.00',
  `labour_share` decimal(10,2) DEFAULT '0.00',
  `efficiency_score` decimal(5,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int unsigned NOT NULL,
  PRIMARY KEY (`jct_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_card_technician`
--

LOCK TABLES `job_card_technician` WRITE;
/*!40000 ALTER TABLE `job_card_technician` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_card_technician` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_cards`
--

DROP TABLE IF EXISTS `job_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_cards` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `job_card_no` varchar(50) NOT NULL,
  `vrn` varchar(50) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_mobile` varchar(50) NOT NULL,
  `vehicle_make` varchar(50) NOT NULL DEFAULT 'Tata',
  `vehicle_model` varchar(100) NOT NULL,
  `vehicle_year` int NOT NULL DEFAULT '2024',
  `km_reading` int DEFAULT NULL,
  `sr_type_id` int NOT NULL DEFAULT '1',
  `job_description` text,
  `priority` varchar(50) NOT NULL DEFAULT 'Normal',
  `bay_id` int DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Waiting',
  `etd` varchar(100) DEFAULT NULL,
  `started_at` varchar(100) DEFAULT NULL,
  `completed_at` varchar(100) DEFAULT NULL,
  `invoiced_at` varchar(100) DEFAULT NULL,
  `created_by` int NOT NULL DEFAULT '1',
  `created_at` varchar(100) NOT NULL,
  `updated_at` varchar(100) DEFAULT NULL,
  `workshop_stage` varchar(100) DEFAULT NULL,
  `l1_delay` varchar(100) DEFAULT NULL,
  `l2_delay` varchar(100) DEFAULT NULL,
  `l3_delay` varchar(100) DEFAULT NULL,
  `l5_delay` varchar(100) DEFAULT NULL,
  `delay_notes` text,
  `time_slot` varchar(50) DEFAULT NULL,
  `tat_status` varchar(50) DEFAULT NULL,
  `pending_reason` text,
  `remarks` text,
  `date_in` varchar(50) DEFAULT NULL,
  `time_in` varchar(50) DEFAULT NULL,
  `expected_date_out` varchar(50) DEFAULT NULL,
  `expected_time_of_completion` varchar(50) DEFAULT NULL,
  `time_out` varchar(50) DEFAULT NULL,
  `date_completed` varchar(50) DEFAULT NULL,
  `bay_no` varchar(50) DEFAULT NULL,
  `service_advisor` varchar(255) DEFAULT NULL,
  `technician_name` varchar(255) DEFAULT NULL,
  `no_of_laborers` int DEFAULT '1',
  `actual_time_taken` varchar(50) DEFAULT NULL,
  `numberplate_photo` text,
  `odometer_photo` text,
  `labor_price` decimal(10,2) DEFAULT '0.00',
  `parts_price` decimal(10,2) DEFAULT '0.00',
  `vin` varchar(50) DEFAULT NULL,
  `last_service_date` varchar(100) DEFAULT NULL,
  `odometer_reading` int DEFAULT NULL,
  `invoice_ocr_data` text,
  `gate_out_time` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`job_id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_cards`
--

LOCK TABLES `job_cards` WRITE;
/*!40000 ALTER TABLE `job_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_revenue_split`
--

DROP TABLE IF EXISTS `job_revenue_split`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_revenue_split` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `allocated_amount` decimal(10,2) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `job_revenue_split_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `backup_legacy_job_cards` (`job_id`),
  CONSTRAINT `job_revenue_split_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `backup_legacy_employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=799 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_revenue_split`
--

LOCK TABLES `job_revenue_split` WRITE;
/*!40000 ALTER TABLE `job_revenue_split` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_revenue_split` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_revenue_split_details`
--

DROP TABLE IF EXISTS `job_revenue_split_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_revenue_split_details` (
  `detail_id` int NOT NULL,
  `revenue_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `tech_role` text NOT NULL,
  `split_pct` int NOT NULL,
  `split_amount` int NOT NULL,
  PRIMARY KEY (`detail_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_revenue_split_details`
--

LOCK TABLES `job_revenue_split_details` WRITE;
/*!40000 ALTER TABLE `job_revenue_split_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_revenue_split_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_revenues`
--

DROP TABLE IF EXISTS `job_revenues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_revenues` (
  `revenue_id` int NOT NULL,
  `job_id` int NOT NULL,
  `labour_amount` int NOT NULL,
  `parts_amount` int NOT NULL,
  `total_amount` int NOT NULL,
  `split_id` int NOT NULL,
  `calculated_at` text,
  PRIMARY KEY (`revenue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_revenues`
--

LOCK TABLES `job_revenues` WRITE;
/*!40000 ALTER TABLE `job_revenues` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_revenues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_technician_maps`
--

DROP TABLE IF EXISTS `job_technician_maps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_technician_maps` (
  `map_id` int NOT NULL,
  `job_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `tech_role` text NOT NULL,
  `assigned_at` text,
  PRIMARY KEY (`map_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_technician_maps`
--

LOCK TABLES `job_technician_maps` WRITE;
/*!40000 ALTER TABLE `job_technician_maps` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_technician_maps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_history`
--

DROP TABLE IF EXISTS `login_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_history` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `login_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `status` enum('success','failed') DEFAULT 'success',
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `login_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_history`
--

LOCK TABLES `login_history` WRITE;
/*!40000 ALTER TABLE `login_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `models`
--

DROP TABLE IF EXISTS `models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `models` (
  `model_id` int NOT NULL AUTO_INCREMENT,
  `model_name` varchar(255) NOT NULL,
  PRIMARY KEY (`model_id`),
  UNIQUE KEY `model_name` (`model_name`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `models`
--

LOCK TABLES `models` WRITE;
/*!40000 ALTER TABLE `models` DISABLE KEYS */;
/*!40000 ALTER TABLE `models` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productivity_alerts`
--

DROP TABLE IF EXISTS `productivity_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productivity_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `alert_type` varchar(50) DEFAULT NULL,
  `severity` varchar(50) DEFAULT NULL,
  `trigger_value` decimal(10,2) DEFAULT NULL,
  `threshold_value` decimal(10,2) DEFAULT NULL,
  `alert_message` varchar(255) DEFAULT NULL,
  `recommended_action` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `productivity_alerts_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `backup_legacy_employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productivity_alerts`
--

LOCK TABLES `productivity_alerts` WRITE;
/*!40000 ALTER TABLE `productivity_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `productivity_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `revenue_split_log`
--

DROP TABLE IF EXISTS `revenue_split_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `revenue_split_log` (
  `split_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_no` varchar(30) NOT NULL,
  `invoice_no` varchar(30) DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `vehicle_reg` varchar(20) NOT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `final_labour` decimal(10,2) DEFAULT '0.00',
  `final_spare` decimal(10,2) DEFAULT '0.00',
  `final_cons` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `labour_pct` decimal(5,2) DEFAULT '0.00',
  `spare_pct` decimal(5,2) DEFAULT '0.00',
  `cons_pct` decimal(5,2) DEFAULT '0.00',
  `recorded_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_revenue` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`split_id`),
  KEY `recorded_by` (`recorded_by`),
  CONSTRAINT `revenue_split_log_ibfk_1` FOREIGN KEY (`recorded_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `revenue_split_log`
--

LOCK TABLES `revenue_split_log` WRITE;
/*!40000 ALTER TABLE `revenue_split_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `revenue_split_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `revenue_splits`
--

DROP TABLE IF EXISTS `revenue_splits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `revenue_splits` (
  `split_id` int NOT NULL,
  `combination_code` text NOT NULL,
  `combination_label` text NOT NULL,
  `person_count` int NOT NULL,
  `tech_pct` int NOT NULL,
  `co_tech_pct` int NOT NULL,
  `electrician_pct` int NOT NULL,
  `add_tech_pct` int NOT NULL,
  `uses_salary_wt` tinyint(1) NOT NULL,
  `senior_override` tinyint(1) NOT NULL,
  `notes` text,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`split_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `revenue_splits`
--

LOCK TABLES `revenue_splits` WRITE;
/*!40000 ALTER TABLE `revenue_splits` DISABLE KEYS */;
/*!40000 ALTER TABLE `revenue_splits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rework_logs`
--

DROP TABLE IF EXISTS `rework_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rework_logs` (
  `rework_id` int NOT NULL,
  `original_job_id` int NOT NULL,
  `new_job_id` int DEFAULT NULL,
  `rework_reason` text NOT NULL,
  `original_tech_id` int NOT NULL,
  `raised_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `rework_status` text NOT NULL,
  `raised_at` text NOT NULL,
  `actioned_at` text,
  PRIMARY KEY (`rework_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rework_logs`
--

LOCK TABLES `rework_logs` WRITE;
/*!40000 ALTER TABLE `rework_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `rework_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rework_tracking`
--

DROP TABLE IF EXISTS `rework_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rework_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_job_id` int DEFAULT NULL,
  `rework_job_id` int DEFAULT NULL,
  `vehicle_reg` varchar(20) DEFAULT NULL,
  `assigned_technician_id` int DEFAULT NULL,
  `original_closure_date` datetime DEFAULT NULL,
  `rework_date` datetime DEFAULT NULL,
  `days_since_original` int DEFAULT NULL,
  `original_issue` varchar(255) DEFAULT NULL,
  `rework_reason` varchar(255) DEFAULT NULL,
  `rework_completed` tinyint(1) DEFAULT NULL,
  `rework_revenue` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `original_job_id` (`original_job_id`),
  KEY `rework_job_id` (`rework_job_id`),
  KEY `assigned_technician_id` (`assigned_technician_id`),
  CONSTRAINT `rework_tracking_ibfk_1` FOREIGN KEY (`original_job_id`) REFERENCES `backup_legacy_job_cards` (`job_id`),
  CONSTRAINT `rework_tracking_ibfk_2` FOREIGN KEY (`rework_job_id`) REFERENCES `backup_legacy_job_cards` (`job_id`),
  CONSTRAINT `rework_tracking_ibfk_3` FOREIGN KEY (`assigned_technician_id`) REFERENCES `backup_legacy_employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rework_tracking`
--

LOCK TABLES `rework_tracking` WRITE;
/*!40000 ALTER TABLE `rework_tracking` DISABLE KEYS */;
/*!40000 ALTER TABLE `rework_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `permission_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) DEFAULT NULL,
  `module_name` varchar(100) DEFAULT NULL,
  `can_view` tinyint(1) DEFAULT '0',
  `can_edit` tinyint(1) DEFAULT '0',
  `can_comment` tinyint(1) DEFAULT '0',
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(255) NOT NULL,
  `permission_level` varchar(50) NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sold_vehicles`
--

DROP TABLE IF EXISTS `sold_vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sold_vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vrn` varchar(50) NOT NULL,
  `vin` varchar(50) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_mobile` varchar(50) NOT NULL,
  `vehicle_make` varchar(100) NOT NULL,
  `vehicle_model` varchar(100) NOT NULL,
  `vehicle_year` int NOT NULL,
  `date_sold` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `warranty_end_date` varchar(100) DEFAULT NULL,
  `warranty_end_km` int DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `vrn` (`vrn`),
  UNIQUE KEY `vin` (`vin`)
) ENGINE=InnoDB AUTO_INCREMENT=2866 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sold_vehicles`
--

LOCK TABLES `sold_vehicles` WRITE;
/*!40000 ALTER TABLE `sold_vehicles` DISABLE KEYS */;
/*!40000 ALTER TABLE `sold_vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sr_types`
--

DROP TABLE IF EXISTS `sr_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sr_types` (
  `sr_type_id` int NOT NULL,
  `sr_type_code` text NOT NULL,
  `sr_type_name` text NOT NULL,
  `default_duration_mins` int NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`sr_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sr_types`
--

LOCK TABLES `sr_types` WRITE;
/*!40000 ALTER TABLE `sr_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `sr_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `technician_kpi_daily`
--

DROP TABLE IF EXISTS `technician_kpi_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technician_kpi_daily` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `kpi_date` varchar(50) DEFAULT NULL,
  `jobs_assigned` int DEFAULT NULL,
  `jobs_completed` int DEFAULT NULL,
  `jobs_open` int DEFAULT NULL,
  `revenue_earned` decimal(10,2) DEFAULT NULL,
  `avg_job_duration` int DEFAULT NULL,
  `completion_efficiency` decimal(5,2) DEFAULT NULL,
  `utilization_percent` decimal(5,2) DEFAULT NULL,
  `rework_count` int DEFAULT NULL,
  `rework_percent` decimal(5,2) DEFAULT NULL,
  `tml_claims` int DEFAULT NULL,
  `tml_claim_rate` decimal(5,2) DEFAULT NULL,
  `avg_revenue_per_job` decimal(10,2) DEFAULT NULL,
  `on_time_completion` decimal(5,2) DEFAULT NULL,
  `quality_score` decimal(5,2) DEFAULT NULL,
  `idle_time` int DEFAULT NULL,
  `break_time` int DEFAULT NULL,
  `overtime_hours` decimal(5,2) DEFAULT NULL,
  `health_status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `technician_kpi_daily_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `backup_legacy_employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13071 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_kpi_daily`
--

LOCK TABLES `technician_kpi_daily` WRITE;
/*!40000 ALTER TABLE `technician_kpi_daily` DISABLE KEYS */;
/*!40000 ALTER TABLE `technician_kpi_daily` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `technician_productivity`
--

DROP TABLE IF EXISTS `technician_productivity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technician_productivity` (
  `prod_id` int unsigned NOT NULL AUTO_INCREMENT,
  `technician_id` int unsigned NOT NULL,
  `month_year` varchar(10) NOT NULL,
  `total_jobs` int DEFAULT '0',
  `total_hours` decimal(8,2) DEFAULT '0.00',
  `total_revenue` decimal(10,2) DEFAULT '0.00',
  `efficiency_score` decimal(5,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`prod_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_productivity`
--

LOCK TABLES `technician_productivity` WRITE;
/*!40000 ALTER TABLE `technician_productivity` DISABLE KEYS */;
/*!40000 ALTER TABLE `technician_productivity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_access_master`
--

DROP TABLE IF EXISTS `user_access_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_access_master` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) DEFAULT NULL,
  `employee_id` int unsigned NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `user_role` varchar(30) NOT NULL,
  `access_level` varchar(20) DEFAULT 'read',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `mobile_no` varchar(10) NOT NULL DEFAULT '',
  `password_hash` varchar(255) DEFAULT NULL,
  `otp_hash` varchar(255) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_access_master`
--

LOCK TABLES `user_access_master` WRITE;
/*!40000 ALTER TABLE `user_access_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_access_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(100) NOT NULL DEFAULT 'reception',
  `employee_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `password_plain` varchar(255) DEFAULT NULL,
  `date_of_joining` varchar(50) DEFAULT NULL,
  `dob` varchar(50) DEFAULT NULL,
  `qualification` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `grade` varchar(50) DEFAULT NULL,
  `floor_team` varchar(100) DEFAULT NULL,
  `clerical_team` varchar(100) DEFAULT NULL,
  `emp_id` varchar(50) DEFAULT NULL,
  `aadhaar_no` varchar(20) DEFAULT NULL,
  `mobile_no` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_handoff_sla`
--
-- NOTE: Added to this baseline because it is a pre-existing production table
-- that migration v8 (008_billing_tables) ALTERs (adds eod_deadline /
-- target_sla_minutes). The original Railway dump this file was generated from
-- did not include it, so a fresh wms_test DB had no table for v8 to ALTER.
-- Column set sourced verbatim from live Cloud SQL prod (railway.tbl_handoff_sla).
--

DROP TABLE IF EXISTS `tbl_handoff_sla`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_handoff_sla` (
  `sla_id` int NOT NULL AUTO_INCREMENT,
  `entity_id` varchar(100) DEFAULT NULL,
  `stage_name` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `eod_deadline` datetime DEFAULT NULL,
  `target_sla_minutes` int DEFAULT NULL,
  `escalation_level` int DEFAULT '0',
  `escalated_at` timestamp NULL DEFAULT NULL,
  `handoff_id` varchar(50) DEFAULT NULL,
  `owner_role` varchar(50) DEFAULT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `sla_due_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sla_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dealer_configurations`
--
-- NOTE: Pre-existing prod key/value config table. Migration v8 reads
-- `workdayEnd` from it (SELECT ... WHERE config_key='workdayEnd') before the
-- harness's post-migration table-creation runs, so it must exist in the
-- baseline. Structure sourced verbatim from live Cloud SQL prod
-- (railway.dealer_configurations): config_value is TEXT, not VARCHAR.
--

DROP TABLE IF EXISTS `dealer_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dealer_configurations` (
  `config_key` varchar(100) NOT NULL,
  `config_value` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vw_bay_queue_display`
--

DROP TABLE IF EXISTS `vw_bay_queue_display`;
/*!50001 DROP VIEW IF EXISTS `vw_bay_queue_display`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_bay_queue_display` AS SELECT 
 1 AS `queue_id`,
 1 AS `bay_id`,
 1 AS `job_card_id`,
 1 AS `queue_position`,
 1 AS `queue_status`,
 1 AS `assigned_at`,
 1 AS `created_by`,
 1 AS `job_card_no`,
 1 AS `vehicle_reg`,
 1 AS `customer_name`,
 1 AS `service_type`,
 1 AS `etd`,
 1 AS `bay_name`,
 1 AS `bay_type`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_revenue_report`
--

DROP TABLE IF EXISTS `vw_revenue_report`;
/*!50001 DROP VIEW IF EXISTS `vw_revenue_report`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_revenue_report` AS SELECT 
 1 AS `split_id`,
 1 AS `job_card_no`,
 1 AS `invoice_no`,
 1 AS `invoice_date`,
 1 AS `vehicle_reg`,
 1 AS `service_type`,
 1 AS `final_labour`,
 1 AS `final_spare`,
 1 AS `total_revenue`,
 1 AS `customer_name`,
 1 AS `job_status`,
 1 AS `technician_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_technician_jobs`
--

DROP TABLE IF EXISTS `vw_technician_jobs`;
/*!50001 DROP VIEW IF EXISTS `vw_technician_jobs`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_technician_jobs` AS SELECT 
 1 AS `jct_id`,
 1 AS `job_card_id`,
 1 AS `job_card_no`,
 1 AS `technician_id`,
 1 AS `technician_name`,
 1 AS `technician_role`,
 1 AS `vehicle_reg`,
 1 AS `customer_name`,
 1 AS `service_type`,
 1 AS `job_status`,
 1 AS `role_type`,
 1 AS `time_in`,
 1 AS `time_out`,
 1 AS `bay_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Current Database: `railway`
--


--
-- Final view structure for view `vw_bay_queue_display`
--

/*!50001 DROP VIEW IF EXISTS `vw_bay_queue_display`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_bay_queue_display` AS select `bq`.`queue_id` AS `queue_id`,`bq`.`bay_id` AS `bay_id`,`bq`.`job_card_id` AS `job_card_id`,`bq`.`queue_position` AS `queue_position`,`bq`.`queue_status` AS `queue_status`,`bq`.`assigned_at` AS `assigned_at`,`bq`.`created_by` AS `created_by`,`jc`.`job_card_no` AS `job_card_no`,`jc`.`vehicle_reg` AS `vehicle_reg`,`jc`.`customer_name` AS `customer_name`,`jc`.`service_type` AS `service_type`,`jc`.`etd` AS `etd`,`bm`.`bay_name` AS `bay_name`,`bm`.`bay_type` AS `bay_type` from ((`bay_queue` `bq` left join `job_card_master` `jc` on((`bq`.`job_card_id` = `jc`.`job_card_id`))) left join `bay_master` `bm` on((`bq`.`bay_id` = `bm`.`bay_id`))) where (`bq`.`queue_status` = 'In Progress') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_revenue_report`
--

/*!50001 DROP VIEW IF EXISTS `vw_revenue_report`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_revenue_report` AS select `rsl`.`split_id` AS `split_id`,`rsl`.`job_card_no` AS `job_card_no`,`rsl`.`invoice_no` AS `invoice_no`,`rsl`.`invoice_date` AS `invoice_date`,`rsl`.`vehicle_reg` AS `vehicle_reg`,`rsl`.`service_type` AS `service_type`,`rsl`.`final_labour` AS `final_labour`,`rsl`.`final_spare` AS `final_spare`,(`rsl`.`final_labour` + `rsl`.`final_spare`) AS `total_revenue`,`jc`.`customer_name` AS `customer_name`,`jc`.`job_status` AS `job_status`,`em`.`full_name` AS `technician_name` from (((`revenue_split_log` `rsl` left join `job_card_master` `jc` on((`rsl`.`job_card_no` = `jc`.`job_card_no`))) left join `job_card_technician` `jt` on((`jc`.`job_card_id` = `jt`.`job_card_id`))) left join `employee_master` `em` on((`jt`.`technician_id` = `em`.`employee_id`))) order by `rsl`.`invoice_date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_technician_jobs`
--

/*!50001 DROP VIEW IF EXISTS `vw_technician_jobs`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_technician_jobs` AS select `jt`.`jct_id` AS `jct_id`,`jt`.`job_card_id` AS `job_card_id`,`jt`.`job_card_no` AS `job_card_no`,`jt`.`technician_id` AS `technician_id`,`em`.`full_name` AS `technician_name`,`em`.`role` AS `technician_role`,`jc`.`vehicle_reg` AS `vehicle_reg`,`jc`.`customer_name` AS `customer_name`,`jc`.`service_type` AS `service_type`,`jc`.`job_status` AS `job_status`,`jt`.`role_type` AS `role_type`,`jt`.`time_in` AS `time_in`,`jt`.`time_out` AS `time_out`,`bm`.`bay_name` AS `bay_name` from ((((`job_card_technician` `jt` left join `employee_master` `em` on((`jt`.`technician_id` = `em`.`employee_id`))) left join `job_card_master` `jc` on((`jt`.`job_card_id` = `jc`.`job_card_id`))) left join `bay_queue` `bq` on((`jt`.`job_card_id` = `bq`.`job_card_id`))) left join `bay_master` `bm` on((`bq`.`bay_id` = `bm`.`bay_id`))) where (`jc`.`job_status` = 'In Progress') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-07 11:55:41
