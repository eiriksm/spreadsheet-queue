'use strict';

module.exports = {
  index: require('./indexHandler'),
  logout: require('./logoutHandler'),
  messagePost: require('./messagePostHandler'),
  user: require('./userHandler'),
  userDoc: require('./userDocHandler'),
  userDocNew: require('./userDocNewHandler'),
  userDocPost: require('./userDocPostHandler'),
  userDocUpdate: require('./userDocUpdateHandler'),
  userDocTest: require('./userDocTestHandler'),
  userDocTestPost: require('./userDocTestPostHandler.js'),
  userDocDelete: require('./userDocDeleteHandler'),
  userDocDeletePost: require('./userDocDeletePostHandler'),
  userLogin: require('./userLoginHandler'),
  userLoginPost: require('./userLoginPostHandler'),
  userPayment: require('./userPaymentHandler'),
  userPaymentPost: require('./userPaymentPostHandler'),
  userPaymentCancelPost: require('./userPaymentCancelPostHandler'),
  userPost: require('./userPostHandler'),
  userUpdate: require('./userUpdateHandler'),
  userValidate: require('./userValidateHandler')
};
