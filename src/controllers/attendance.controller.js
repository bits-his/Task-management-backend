const models = require('../models');
const { validateNetwork } = require('../utils/networkValidator');
import db from "../models";
const User = db.users;
const Attendance = db.attendances;
const SalaryDeduction = db.SalaryDeduction;

const moment = require('moment-timezone');

function getLocalTime(date, timeString, timezone = 'Africa/Lagos') {
  if (!timeString) {
    console.warn("Warning: timeString is undefined or invalid. Using default time of '09:00:00'");
    timeString = '09:00:00';
  }

  const fullDateTime = `${date}T${timeString}`;

  const localTime = moment.tz(fullDateTime, 'YYYY-MM-DDTHH:mm:ss', timezone);

  if (!localTime.isValid()) {
    console.error("Invalid Date:", fullDateTime); 
    throw new Error("Invalid sign-in time format");
  }

  return localTime.format('YYYY-MM-DD HH:mm:ss');
}

const signIn = async (req, res) => {
  try {
    const { user_id, timestamp, network_name, ip_address } = req.body;

    if (!validateNetwork(network_name, ip_address)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_NETWORK',
          message: 'You must be connected to the office network',
        },
      });
    }

    const formattedTimestamp = timestamp.replace(' ', 'T'); 
    if (isNaN(new Date(formattedTimestamp))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TIMESTAMP',
          message: 'The provided timestamp is invalid',
        },
      });
    }

    const date = new Date(formattedTimestamp).toISOString().split('T')[0];  

    const timePart = timestamp.split(' ')[1]+1 || '09:00:00'; 

    const timezone = 'Africa/Lagos';

    const expectedSignInTime = getLocalTime(date, process.env.EXPECTED_SIGN_IN_TIME || '09:30:00', timezone);

    const signInTime = getLocalTime(date, timePart, timezone);

    console.log("Expected sign-in time:", expectedSignInTime);  
    console.log("Actual sign-in time:", signInTime);  

    const expectedSignIn = moment.tz(expectedSignInTime, 'YYYY-MM-DD HH:mm:ss', timezone); 
    const actualSignIn = moment.tz(signInTime, 'YYYY-MM-DD HH:mm:ss', timezone); 

    console.log("Expected Date object:", expectedSignIn.format()); // Debug log
    console.log("Actual Date object:", actualSignIn.format()); // Debug log

    // Determine the status based on sign-in time (on time or late)
    const status = actualSignIn.isSameOrBefore(expectedSignIn) ? 'on_time' : 'late';

    // Handle attendance logic (same as before)
    let attendance = await Attendance.findOne({ where: { user_id, date } });

    if (attendance && attendance.sign_in_time) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_SIGNED_IN',
          message: 'Already signed in for today',
        },
      });
    }

    if (!attendance) {
      attendance = await Attendance.create({
        user_id,
        date,
        sign_in_time: signInTime,
        expected_sign_in_time: expectedSignInTime,
        expected_sign_out_time: process.env.EXPECTED_SIGN_OUT_TIME || '17:00:00',  // Default expected sign-out time
        status,
        ip_address,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      attendance = await attendance.update({
        sign_in_time: signInTime,
        expected_sign_in_time: expectedSignInTime,
        expected_sign_out_time: process.env.EXPECTED_SIGN_OUT_TIME || '17:00:00',
        status,
        ip_address,
      });
    }

    // Deduct salary if late
    if (status === 'late') {
      await SalaryDeduction.create({
        user_id,
        reason: 'Late Sign-In',
        amount_deducted: 100,
        date: date,
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
        message: status === 'on_time' ? 'Signed in successfully' : 'Signed in late',
      },
    });
  } catch (error) {
    console.error(error);
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
    const sign_out_time = getLocalTime(timestamp);
console.log(sign_out_time, expected_sign_out_time)
    // Update status if leaving early
    const sign_out_status = sign_out_time < expected_sign_out_time ? 'early_departure' : attendance.status;

    await attendance.update({
      sign_out_time: sign_out_time,
      sign_out_status,
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
        message: attendance.status === 'early_departure' ? 'Signed out early' : 'Signed out successfully',
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
    
      },
    })
    )
    );
  
};

const checkRouterConnection = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

  try {
    const response = await fetch("http://192.168.1.1", { signal: controller.signal });
    clearTimeout(timeout);
    setIsConnectedToRouter(response.ok);
  } catch (error) {
    clearTimeout(timeout);
    setIsConnectedToRouter(false);
  }
};



module.exports = {
  signIn,
  signOut,
  getTodayStatus,
  getAttendanceHistory,
  checkRouterConnection,
};
