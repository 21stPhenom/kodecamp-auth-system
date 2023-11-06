const mailer  = require('nodemailer');
require('dotenv').config();

const options = {
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.emailUser,
        pass: process.env.emailPassword
    }
};

const sendMail = mailer.createTransport(options);

function generateOtp() {
    return Math.floor(Math.random() * 1000000);
}

module.exports = {sendMail, generateOtp};