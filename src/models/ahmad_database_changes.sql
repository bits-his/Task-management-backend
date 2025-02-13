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