import db from "../models/index.js";

const runMeeting = async ({
  query_type = "insert",
  meeting_title = "",
  meeting_date = "",
  meeting_duration = "",
  meeting_location = "",
  LeadID = "",
  meeting_agenda = "",
  priority_level = "",
  reminder_type = "",
  notes = "",
  image_url = "",
}) => {
  if (query_type === "insert" || query_type === "create") {
    const row = await db.meetings.create({
      meeting_title,
      meeting_date,
      meeting_duration,
      meeting_location,
      LeadID,
      meeting_agenda,
      priority_level,
      reminder_type,
      notes,
      image_url,
    });
    return [row.get({ plain: true })];
  }
  if (query_type === "select") {
    return db.meetings.findAll({ raw: true });
  }
  return [];
};

const meetingSchedule = async (req, res) => {
  try {
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
      notes = "",
    } = req.body;
    let images = [];
    if (req.files) {
      images = req.files.map((image) => image.path);
    }
    const data = await runMeeting({
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
      image_url: images.slice(0, 5).join(","),
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const get_meetingSchedule = async (req, res) => {
  try {
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
      notes = "",
    } = req.body;
    let images = [];
    if (req.files) {
      images = req.files.map((image) => image.path);
    }
    const data = await runMeeting({
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
      image_url: images.slice(0, 5).join(","),
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error managing contacts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export { meetingSchedule, get_meetingSchedule };
