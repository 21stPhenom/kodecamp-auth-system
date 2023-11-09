const express = require("express")
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cryptoJS = require("cryptojs").Crypto;
const joi = require("joi");

// load environment variables
require('dotenv').config()

const {userCollection} = require("./../schema/users");
const {passwordResetCollection} = require("./../schema/forgotPassword");
const {sendMail, generateOtp} = require("./../utilities");

// registration route
router.post('/register', async (req, res) => {
    const registrationValidator = joi.object({
        // validate request data
        username: joi.string().required(),
        email: joi.string().email().required(),
        phoneNumber: joi.string().required(),
        password: joi.string().required()
    });
    const {error: registrationValidationError} = registrationValidator.validate(req.body);
    if (registrationValidationError) return res.status(400).send(registrationValidationError);

    // hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);

    // create user
    try {
        await userCollection.create({
            username: req.body.username,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            password: hashedPassword
        });
        res.status(201).send("created successfully");

    } catch (error) {
        console.log(error);
        res.status(error.status || 500).send("Internal server error");
    }
});

// login route
router.post('/login', async (req, res) => {
    // validate request data
    const loginValidator = joi.object({
        username: joi.string().required(),
        password: joi.string().required()
    });
    const {error: loginValidationError} = loginValidator.validate(req.body);
    if (loginValidationError) return res.status(400).send(loginValidationError);

    // get request data if there are no validation errors
    const {username, password} = req.body;

    // find user by username
    const userObject = await userCollection.findOne({username});
    if (!userObject) return res.status(404).send('user-not-found');
    
    // compare user password with request password
    const passwordsMatch = bcrypt.compareSync(password, userObject.password);
    if (!passwordsMatch) return res.status(400).send('invalid-credentials');

    // log user in
    const {_id, phoneNumber } = userObject;
    const token = jwt.sign({
        username: username,
        userId: _id,
        phoneNumber: phoneNumber,
        password: password
    }, process.env.secret);

   res.send({
    message: 'user logged in',
    token
   });
});

router.post('/forgot-password', async (req, res) => {
    try {
        // validate email
        const {username} = req.body;
        const user = await userCollection.findOne({username});
        if (!user) return res.status(404).send('user-not-found');

        // create token and otp for user
        // const uid = v4();
        const encryptedUserObject = cryptoJS.AES.encrypt(user._id, process.env.secret);
        const otp = `${generateOtp()}`;
        await passwordResetCollection.create({
            userId: user._id,
            token: encryptedUserObject,
            otp: otp
        });

        // send token to user
        await sendMail.sendMail({
           to: user.email,
           subject: 'Password Reset Email',
           html: `
                <div>
                    <h3>Password Reset Email</h3>
                    <div>Click <a href="http://127.0.0.1:4000/v1/auth/reset-password/">here</a> to reset your password</div>
                    <div>and use the following to reset your password.</div>
                    <ul>
                        <li>UID: <strong>${encryptedUserObject}</strong></li>
                        <li>OTP: ${otp}</li>
                    </ul>
                </div>
            ` 
        });

        res.send({
            message: "Email sent successfully"
        })

    } catch (error) {
        console.log(error);
        res.status(error.status || 500).send("Internal server error");
    }
});

// reset password route
router.post('/reset-password', async(req, res) => {
    try{
        // find user by token
        const {token, otp, newPassword} = req.body;
        const passwordResetObject = await passwordResetCollection.findOne({token, otp});
        if (!passwordResetObject) return res.status(400).send('invalid OTP or UID');

        // hash new password and update user
        const newHashedPassword = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
        await userCollection.findByIdAndUpdate(passwordResetObject.userId, {
            password: newHashedPassword
        });
        
        // delete token and OTP from database
        await passwordResetCollection.findOneAndDelete({token, otp});
        res.send({
            message: "Password has been reset"
        });
    } catch (error) {
        console.log(error);
        res.status(error.status || 500).send("Internal server error")
    }
});

module.exports = router;