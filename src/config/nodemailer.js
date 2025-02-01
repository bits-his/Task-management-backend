const nodemailer = require("nodemailer");

// const transport = nodemailer.createTransport({
//   host: "mail.kirmas.kn.gov.ng",
//   port: 465,
//   secure: true, // secure:true for port 465, secure:false for port 587
//   auth: {
//     user: "notifications@kirmas.kn.gov.ng",
//     pass: "kirmas_123",
//   },
//   tls: {
//     rejectUnauthorized: false,
//   },
// });

const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: '10b0a43d894b8b',
    pass: 'f96b90d054a19a'  
  }
});

module.exports = transporter;
