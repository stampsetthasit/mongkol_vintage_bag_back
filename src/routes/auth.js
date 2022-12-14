const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController.js');
const { userCreds } = require('../controllers/AuthController');

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/logout', userCreds, AuthController.logout);

router.post('/forgotpassword', AuthController.resetPassword);

module.exports = router;