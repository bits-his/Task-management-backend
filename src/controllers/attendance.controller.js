const models = require('../models');
const { validateNetwork } = require('../utils/networkValidator');
import db from "../models";
const { Attendance, Users } = models;

const getLocalTime = (date, time) => {
  
  const [hours, minutes] = time.split(':');
  const localDate = new Date(date);
  localDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return localDate;
};

const signIn = async (req, res) => {
  try {
    const { user_id, timestamp, network_name, ip_address } = req.body;

    // Validate network
    if (!validateNetwork(network_name, ip_address)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_NETWORK',
          message: 'You must be connected to the office network',
        },
      });
    }

    const date = new Date(timestamp).toISOString().split('T')[0];
    
    // Check if attendance record exists
    let attendance = await Attendance.findOne({
      where: { user_id, date },
    });

    if (attendance && attendance.sign_in_time) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_SIGNED_IN',
          message: 'Already signed in for today',
        },
      });
    }

    const expected_sign_in_time = getLocalTime(date, process.env.EXPECTED_SIGN_IN_TIME || '09:00:00');
    const sign_in_time = new Date(timestamp);
    
    // Determine status
    const status = sign_in_time <= expected_sign_in_time ? 'present' : 'late';
 console.log(attendance)
    if (!attendance) {
      attendance = await Attendance.create({
        user_id,
        date,
        sign_in_time: timestamp,
        network_name,
        ip_address,
        status,
      });
    } else {
      attendance = await attendance.update({
        sign_in_time: timestamp,
        network_name,
        ip_address,
        status,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: attendance.id,
        user_id: attendance.user_id,
        date: attendance.date,
        sign_in_time: attendance.sign_in_time,
        status: attendance.status,
        message: status === 'present' ? 'Signed in successfully' : 'Signed in late',
      },
    });
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while processing your request',
        details: error.message,
      },
    });
  }
};

const signOut = async (req, res) => {
  try {
    const { user_id, timestamp } = req.body;
    const date = new Date(timestamp).toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      where: { user_id, date },
    });

    if (!attendance || !attendance.sign_in_time) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_SIGNED_IN',
          message: 'No sign-in record found for today',
        },
      });
    }

    const expected_sign_out_time = getLocalTime(date, process.env.EXPECTED_SIGN_OUT_TIME || '17:00:00');
    const sign_out_time = new Date(timestamp);

    // Update status if leaving early
    const status = sign_out_time < expected_sign_out_time ? 'early_departure' : attendance.status;

    await attendance.update({
      sign_out_time: timestamp,
      status,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: attendance.id,
        user_id: attendance.user_id,
        date: attendance.date,
        sign_in_time: attendance.sign_in_time,
        sign_out_time: attendance.sign_out_time,
        status: attendance.status,
        message: status === 'early_departure' ? 'Signed out early' : 'Signed out successfully',
      },
    });
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while processing your request',
        details: error.message,
      },
    });
  }
};

const getTodayStatus = async (req, res) => {
  try {
    const { user_id } = req.query;
    const date = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      where: { user_id, date },
    });

    return res.status(200).json({
      success: true,
      data: {
        has_signed_in: attendance && attendance.sign_in_time ? true : false,
        has_signed_out: attendance && attendance.sign_out_time ? true : false,
        attendance_record: attendance ? {
          id: attendance.id,
          date: attendance.date,
          sign_in_time: attendance.sign_in_time,
          sign_out_time: attendance.sign_out_time,
          status: attendance.status,
        } : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while processing your request',
        details: error.message,
      },
    });
  }
};

const getAttendanceHistory = async (req, res) => {
  
    const { user_id, start_date, end_date, role="" } = req.query;

   
    if (!user_id || !start_date || !end_date ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required query parameters: user_id, start_date, end_date, role.',
        },
      });
    }

    // Call the stored procedure using raw query
   db.sequelize.query(
      `CALL GetAttendanceHistory(:user_id, :start_date, :end_date, :role)`,
      {
        replacements: { user_id, start_date, end_date, role },
      }
    ).then((resp)=>
      
  res.status(200).json({
      success: true,
      data: resp,
    }))
    .catch(
(err)=>(


     res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while processing your request',
        details: error.message,
      },
    })
    )
    );
  
};



module.exports = {
  signIn,
  signOut,
  getTodayStatus,
  getAttendanceHistory,
};
