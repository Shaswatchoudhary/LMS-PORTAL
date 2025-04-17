// helpers/paypal.js
const paypal = require('paypal-rest-sdk');

paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox', // sandbox or live
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_SECRET_ID
});

module.exports = paypal;