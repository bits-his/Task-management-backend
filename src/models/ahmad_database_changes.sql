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