CREATE TABLE `Partnerships` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `LeadID` int(11) NOT NULL,
  `status` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `terms` text DEFAULT NULL,
  `files` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci


CREATE TABLE `Outreach` (
  `OutreachID` int(11) NOT NULL AUTO_INCREMENT,
  `LeadID` int(11) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Date` date DEFAULT NULL,
  `Outcome` varchar(100) DEFAULT NULL,
  `Notes` text DEFAULT NULL,
  `FollowUpDate` date DEFAULT NULL,
  `CreatedBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`OutreachID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci


CREATE DEFINER=`root`@`localhost` PROCEDURE `outreach`(IN `in_query_type` VARCHAR(20), IN `in_LeadID` VARCHAR(40), IN `in_Type` VARCHAR(50), IN `in_Date` VARCHAR(10), IN `in_Outcome` VARCHAR(100), IN `in_Notes` VARCHAR(500), IN `in_FollowUpDate` VARCHAR(10))
BEGIN 
	IF in_query_type = 'create' THEN
    	INSERT INTO Outreach (
            LeadID,
            Type,
            Date,
            Outcome,
            Notes,
            FollowUpDate
        ) VALUES (
            in_LeadID,
            in_Type,
            in_Date,
            in_Outcome,
            in_Notes,
            in_FollowUpDate
        );
	ELSEIF in_query_type = 'select' THEN
        SELECT b.name AS client, a.LeadID, a.Type, a.Date, a.Outcome, a.Notes, a.FollowUpDate FROM `Outreach` AS a JOIN clients AS b ON a.LeadID WHERE a.LeadID = b.id;
	END IF;
END


CREATE DEFINER=`root`@`localhost` PROCEDURE `partnership`(IN `p_query_type` VARCHAR(20), IN `p_LeadID` VARCHAR(10), IN `p_status` VARCHAR(50), IN `p_start_date` VARCHAR(10), IN `p_end_date` VARCHAR(10), IN `p_terms` TEXT, IN `p_files` TEXT)
BEGIN
	IF p_query_type = "create" THEN
    	INSERT INTO Partnerships (LeadID, status, start_date, end_date, terms, files)
    	VALUES (p_LeadID, p_status, p_start_date, p_end_date, p_terms, p_files);
	ELSEIF p_query_type = "select" THEN
        SELECT b.name, a.leadID, a.status, a.start_date, a.end_date, a.files, a.terms FROM Partnerships AS a JOIN clients AS b ON LeadID  WHERE a.LeadID =b.id;
    END IF;
END





CREATE TABLE meetings ( 
  id INT AUTO_INCREMENT PRIMARY KEY, 
  meeting_title VARCHAR(255) NOT NULL, 
  meeting_date DATETIME NOT NULL, 
  meeting_duration TIME NOT NULL, 
  meeting_location VARCHAR(255) NOT NULL, 
  LeadID INT NOT NULL, -- Foreign key (Client ID) 
  meeting_agenda VARCHAR(100) NOT NULL, 
  priority_level VARCHAR(100) NOT NULL, 
  reminder_type VARCHAR(300) NOT NULL, 
  notes TEXT DEFAULT NULL, 
  image_url LONGTEXT DEFAULT NULL, -- Stores the image as an HTTPS link 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
);


DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `scheduleMeetings`(IN `p_query_type` VARCHAR(100), IN `p_meeting_title` VARCHAR(255), IN `p_meeting_date` VARCHAR(255), IN `p_meeting_duration` VARCHAR(255), IN `p_meeting_location` VARCHAR(255), IN `p_LeadID` INT, IN `p_meeting_agenda` VARCHAR(100), IN `p_priority_level` VARCHAR(100), IN `p_reminder_type` VARCHAR(100), IN `p_notes` TEXT, IN `p_image_url` LONGTEXT)
BEGIN
    -- Insert into meetings table
    IF p_query_type = "insert" THEN
        INSERT INTO meetings (
            meeting_title, 
            meeting_date, 
            meeting_duration, 
            meeting_location, 
            LeadID, 
            meeting_agenda, 
            priority_level, 
            reminder_type, 
            notes, 
            image_url
        ) VALUES (
            p_meeting_title, 
            p_meeting_date, 
            p_meeting_duration, 
            p_meeting_location, 
            p_LeadID, 
            p_meeting_agenda, 
            p_priority_level, 
            p_reminder_type, 
            p_notes, 
            p_image_url
        );
	ELSEIF p_query_type ="select" THEN
    	SELECT * FROM meetings;
    END IF;
END$$
DELIMITER ;




-- new changes on database client, outreach and deals table and procedure 
-- made by ahmad on 21/05/2023 

-- new changes on database client procedure
DROP PROCEDURE `clients`;
CREATE DEFINER=`root`@`localhost` PROCEDURE `clients`(IN `query_type` VARCHAR(20), IN `contact_id` INT, IN `contact_name` VARCHAR(255), IN `contact_email` VARCHAR(255), IN `contact_phone` VARCHAR(20), IN `contact_company` VARCHAR(255), IN `contact_job_title` VARCHAR(100), IN `contact_status` ENUM('Active','Inactive','Lead','Prospect','Closed'), IN `startup_id` VARCHAR(50)) NOT DETERMINISTIC CONTAINS SQL SQL SECURITY DEFINER BEGIN
    IF query_type = 'create' THEN
        INSERT INTO clients (startup_id,name, email, phone, company, job_title, status)
        VALUES (startup_id,contact_name, contact_email, contact_phone, contact_company,contact_job_title, contact_status);
    
    ELSEIF query_type = 'update' THEN
        UPDATE contacts 
        SET name = contact_name, 
            email = contact_email, 
            phone = contact_phone, 
            company = contact_company, 
            job_title = contact_job_title,
            status = contact_status
        WHERE id = contact_id;
    
    ELSEIF query_type = 'delete' THEN
        DELETE FROM clients WHERE id = contact_id;
    
    ELSEIF query_type = 'select' THEN
        SELECT * FROM clients WHERE id = contact_id OR contact_id IS NULL AND startup_id = startup_id GROUP BY startup_id;
    
    END IF;
END

-- new changes on database outreach procedure

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `outreach`(IN `in_query_type` VARCHAR(20), IN `in_LeadID` VARCHAR(40), IN `in_Type` VARCHAR(50), IN `in_Date` VARCHAR(10), IN `in_Outcome` VARCHAR(100), IN `in_Notes` VARCHAR(500), IN `in_FollowUpDate` VARCHAR(10), IN `startup_id` VARCHAR(100))
BEGIN 
	IF in_query_type = 'create' THEN
    	INSERT INTO Outreach (
            LeadID,
            Type,
            Date,
            Outcome,
            Notes,
            FollowUpDate,
            startup_id
        ) VALUES (
            in_LeadID,
            in_Type,
            in_Date,
            in_Outcome,
            in_Notes,
            in_FollowUpDate,
            startup_id
        );
	ELSEIF in_query_type = 'select' THEN
        SELECT b.name AS client, a.LeadID, a.Type, a.Date, a.Outcome, a.Notes, a.FollowUpDate FROM `Outreach` AS a JOIN clients AS b ON a.LeadID WHERE a.LeadID = b.id AND startup_id = startup_id GROUP BY startup_id;
	END IF;
END$$
DELIMITER ;

-- new changes on database deals procedure

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deals`(IN `query_type` VARCHAR(20), IN `deal_id` INT, IN `deal_name` VARCHAR(255), IN `deal_value` DECIMAL(10,2), IN `expected_revenue` DECIMAL(10,2), IN `expected_close_date` DATE, IN `priority` ENUM('Low','Medium','High','Critical'), IN `stage` ENUM('Prospecting','Negotiation','Closed','Lost','Contract Signed','Proposal Sent'), IN `payment_status` ENUM('Pending','Partial','Completed'), IN `final_remarks` TEXT, IN `client` VARCHAR(255), IN `assigned_to` TEXT, IN `contract_files` TEXT, IN `updated_by` VARCHAR(50), IN `startup_id` VARCHAR(50))
BEGIN
    IF query_type = 'create' THEN
        INSERT INTO deals (deal_name, deal_value, expected_revenue, expected_close_date, priority, stage, payment_status, final_remarks, client, assigned_to, contract_files,updated_by, startup_id)
        VALUES (deal_name, deal_value, expected_revenue, expected_close_date, priority, stage, payment_status, final_remarks, client, assigned_to, contract_files,updated_by, startup_id);
    
    ELSEIF query_type = 'update' THEN
        UPDATE deals 
        SET deal_name = deal_name,
            deal_value = deal_value,
            expected_revenue = expected_revenue,
            expected_close_date = expected_close_date,
            priority = priority,
            stage = stage,
            payment_status = payment_status,
            final_remarks = final_remarks,
            client = client,
            assigned_to = assigned_to,
            contract_files = contract_files
        WHERE id = deal_id;
        
        ELSEIF query_type = "update_deal_stage" THEN
        update deals SET stage = stage WHERE id = deal_id;
        INSERT INTO `deal_history`(`deal_id`, `stages`, `updated_by`) VALUES (deal_id,stage,updated_by);
    
    ELSEIF query_type = 'delete' THEN
        DELETE FROM deals WHERE id = deal_id;
    
    ELSEIF query_type = 'select' THEN
        SELECT * FROM deals WHERE id = deal_id OR deal_id IS NULL AND startup_id = startup_id GROUP BY startup_id;
    
    END IF;
END$$
DELIMITER ;

-- new changes on database deals table

CREATE TABLE `deals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `startup_id` varchar(50) NOT NULL,
  `deal_name` varchar(255) NOT NULL,
  `deal_value` decimal(10,2) NOT NULL,
  `expected_revenue` decimal(10,2) NOT NULL,
  `expected_close_date` date NOT NULL,
  `priority` enum('Low','Medium','High','Critical') DEFAULT 'Medium',
  `stage` enum('Prospecting','Negotiation','Closed','Lost','Proposal Sent','Contract Signed') DEFAULT 'Prospecting',
  `payment_status` enum('Pending','Partial','Completed') DEFAULT 'Pending',
  `final_remarks` text DEFAULT NULL,
  `client` varchar(255) NOT NULL,
  `assigned_to` text DEFAULT NULL,
  `contract_files` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci


-- new changes on database OUTREACH table

CREATE TABLE `outreach` (
  `OutreachID` int(11) NOT NULL AUTO_INCREMENT,
  `startup_id` varchar(100) NOT NULL,
  `LeadID` int(11) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Date` date DEFAULT NULL,
  `Outcome` varchar(100) DEFAULT NULL,
  `Notes` text DEFAULT NULL,
  `FollowUpDate` date DEFAULT NULL,
  `CreatedBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`OutreachID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

-- new changes on database client table

CREATE TABLE `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `startup_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `company` varchar(255) NOT NULL,
  `status` enum('Active','Inactive','Lead','Prospect','Closed') DEFAULT 'Active',
  `job_title` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci