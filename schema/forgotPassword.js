const { string } = require("joi");
const mongoose = require("mongoose");

const forgotPassword = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    otp: {
        type: Number,
        required: true
    }
}, {timestamps: true});

const passwordResetCollection = mongoose.model('forgotPassword', forgotPassword);
module.exports = {passwordResetCollection};