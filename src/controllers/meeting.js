import db from "../models";

const meetingSchedule = (req, res) => {
  const {
    query_type = "insert",
    meeting_title = "",
    meeting_date = "",
    meeting_duration = "",
    meeting_location = "",
    LeadID = "",
    meeting_agenda = "",
    priority_level = "",
    reminders_and_notifications = "",
    notes = ""
  } = req.body;
  let images = [];
  if (req.files) {
    images = req.files.map((image) => image.path);
  }
  db.sequelize
    .query(
      `CALL scheduleMeetings(
        :query_type, 
        :meeting_title, 
        :meeting_date, 
        :meeting_duration, 
        :meeting_location, 
        :LeadID, 
        :meeting_agenda,
        :priority_level,
        :reminder_type,
        :notes,
        :image_url
       )`,
      {
        replacements: {
          query_type,
          meeting_title,
          meeting_date,
          meeting_duration,
          meeting_location,
          LeadID,
          meeting_agenda,
          priority_level,
          reminder_type: reminders_and_notifications,
          image_url: `${images.splice(0, 5)}`,
          notes
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

const get_meetingSchedule = (req, res) => {
  const {
    query_type = "select",
    meeting_title = "",
    meeting_date = "",
    meeting_duration = "",
    meeting_location = "",
    LeadID = "",
    meeting_agenda = "",
    priority_level = "",
    reminders_and_notifications = "",
    notes = ""
  } = req.body;
  let images = [];
  if (req.files) {
    images = req.files.map((image) => image.path);
  }
  db.sequelize
    .query(
      `CALL scheduleMeetings(
            :query_type, 
            :meeting_title, 
            :meeting_date, 
            :meeting_duration, 
            :meeting_location, 
            :LeadID, 
            :meeting_agenda,
            :priority_level,
            :reminder_type,
            :notes,
            :image_url
           )`,
      {
        replacements: {
          query_type,
          meeting_title,
          meeting_date,
          meeting_duration,
          meeting_location,
          LeadID,
          meeting_agenda,
          priority_level,
          reminder_type: reminders_and_notifications,
          notes,
          image_url: `${images.splice(0, 5)}`,
        },
      }
    )
    .then((data) => res.json({ success: true, data }))
    .catch((err) => {
      console.error("Error managing contacts:", err);
      res.status(500).json({ success: false, error: err.message });
    });
};

export { meetingSchedule, get_meetingSchedule };
