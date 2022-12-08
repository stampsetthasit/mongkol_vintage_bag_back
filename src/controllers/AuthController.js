const firebase = require('../firebase');
const { registerValidation,  changePwdValidation} = require('../services/validation');
const Users = require('../models/user_schema');

exports.register = async (req, res) => {
  const { error } = registerValidation(req.body);
  if (error) return res.status(200).json({result: 'OK', message: error.details[0].message, data: {}});

  firebase
    .auth()
    .createUserWithEmailAndPassword(req.body.email, req.body.password)
    .then( async (userdata) => {

      const data = await Users.create(req.body)
      const userScheama = {
        email: data.email,
        firstname: data.firstname,
        lastname: data.lastname,
        dob: data.dob,
        gender: data.gender,
        address: data.address,
        wishlist: data.wishlist
      }

      console.log(`NewUser: ${data.email}, Time: ${Date.now()}`)

      return res.status(200).json({result: 'OK', message: 'Success create account', data: {userScheama}}), 
      userdata.user.updateProfile({displayName: req.body.firstname})
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      return res.status(500).json({result: 'Internal Server Error', message: errorMessage, errorCode: errorCode});
    });
};

exports.login = async (req, res) => {
  firebase
    .auth()
    .signInWithEmailAndPassword(req.body.email, req.body.password)
    .then( async (userdata) => {
      //fetch user data from mongo here using email
      //give both userdata from mongo and user creds (accessToken) from firebase
      const data = await Users.findOne({
        email: req.body.email
      })

      const accessToken = userdata.user.toJSON().stsTokenManager.accessToken

      console.log(`Logged in: ${data.email}, Time: ${Date.now()}`)

      return res.status(202).header('Authorization', `Bearer ${accessToken}`).json({result: 'Accepted', message: '', data: userdata});
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      return res.status(500).json({result: 'Internal Server Error', message: errorMessage, errorCode: errorCode});
    });
};

exports.logout = async (req, res) => {
  firebase.auth().signOut().then((user) => {
    const useremail = req.useremail
    console.log(`Logged out: ${useremail}, Time: ${Date.now()}`)
    res.status(200).json({result: 'OK', message: "Success logout", data: useremail})
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    return res.status(500).json({result: 'Internal Server Error', message: errorMessage, errorCode: errorCode});
  });
}

// exports.changePassword = async (req, res) => { //NOT DONE
//   const { error } = changePwdValidation(req.body);
//   if (error) return res.status(200).json({result: 'OK', message: error.details[0].message, data: {}});

//   const useremail = req.useremail

//   const password = req.body

//   // firebase.auth().currentUser.updatePassword(password).then(async (data) => {
//   //   console.log("UPDATED PASSWORD")
//   //   res.status(200).json({result: 'OK', message: "Success update password", data: data})
//   // })
//   // firebase.auth().onAuthStateChanged(async (user) => {
//   //   if (user) {
//   //     const uid = user.email
//   //     console.log(uid)
//   //     res.status(200).json({result: 'OK', message: "Success update password", data: uid})
//   //   }
//   // })
//   // .catch((error) => {
//   //   const errorCode = error.code;
//   //   const errorMessage = error.message;
//   //   return res.status(500).json({result: 'Internal Server Error', message: errorMessage, errorCode: errorCode});
//   // });
// }

exports.resetPassword = (req, res) => {
  firebase
    .auth()
    .sendPasswordResetEmail(req.body.email)
    .then(function (userdata) {
      console.log(`Password reset email sent to: ${req.body.email}, Time: ${Date.now()}`)
      return res.status(200).json({result: 'OK', message: "Password reset email sent!", data: {userdata}});
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      return res.status(500).json({result: 'Internal Server Error', message: errorMessage, errorCode: errorCode});
    });
};

exports.isAdmin = async (req, res, next) => {
  const idToken = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;

  mongkolGetAuth
  .verifyIdToken(idToken)
  .then( async (decodedToken) => {
    const user = decodedToken.email
    const data = await Users.findOne({'email': user});
    const roles = String(data.roles)
    if (roles != "admin") return res.status(401).json({result: 'Unauthorized', message: "You do not have the correct administrator privileges.", data: {}})
    req.useremail = user.email;
    req.adminemail = data.email
    
    next()
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    return res.status(500).json({result: 'Internal Server Error', message: errorMessage, errorCode: errorCode});
  })
}

exports.userCreds = async (req, res, next) => {
  const idToken = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
  if (!idToken) {
    return res.status(404).json({ result: 'Not found', message: 'No token provied.', data: {}})
  }

  mongkolGetAuth.verifyIdToken(idToken).then((userCredential) => {
    const user = userCredential
    req.useremail = user.email;
    next();
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    return res.status(500).json({result: 'Internal Server Error', message: errorMessage, errorCode: errorCode});
  });
}

// exports.getUserEmail = async (req, res) => {
//   const idToken = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
//   mongkolGetAuth.verifyIdToken(idToken).then((userCredential) => {
//     const user = userCredential
//     req.useremail = user.email;
//   })
//   .catch((error) => {
//     const errorCode = error.code;
//     const errorMessage = error.message;
//     return res.status(500).json({result: 'Internal Server Error', message: errorMessage, errorCode: errorCode});
//   });
// }
