const express = require("express");
const router = express.Router();
const { generateToken, sendToken } = require("../../utils/token.utils");
const request = require("request");

const passport = require("passport");
const expressJwt = require("express-jwt");

const keys = require("../../config/keys");

const graph = require("fbgraph");

require("../../config/passport")();

const Usuario = models.usuario;

const BAD_REQUEST = 400;
const SUCCESS = 200;

const authenticate = expressJwt({
  secret: keys.secretOrKey,
  requestProperty: "auth",
  getToken: function(req) {
    if (req.headers["authorization"]) {
      return req.headers["authorization"];
    }
    return null;
  }
});

// @route   POST api/auth/facebook
// @desc    Login com facebook
// @access  Public
router.post(
  "/facebook",
  (req, res, next) => {
    passport.authenticate("facebook-token", { session: false })(req, res, next);
  },
  (req, res, next) => {
    if (!req.user) {
      return res.send(401, "User Not Authenticated");
    }
    req.auth = {
      id: req.user.provider_id,
      firstName: req.user.first_name,
      photo: req.user.photo,
      respostas: req.user.respostas
    };
    next();
  },
  generateToken,
  sendToken
);

// @route   POST api/auth/google
// @desc    Login com google
// @access  Public
router.post(
  "/google",
  (req, res, next) => {
    passport.authenticate("google-token", { session: false })(req, res, next);
  },
  (req, res, next) => {
    if (!req.user) {
      return res.send(401, "User Not Authenticated");
    }
    req.auth = {
      id: req.user.provider_id,
      firstName: req.user.first_name,
      photo: req.user.photo,
      respostas: req.user.respostas
    };

    next();
  },
  generateToken,
  sendToken
);

router.get("/test", authenticate, (req, res) => {
  res.json({ msg: "Tudo certo" });
});

router.get("/usingFacebookCode", (req, res) => {
  graph.authorize(
    {
      client_id: keys.facebookAppID,      
      redirect_uri: keys.facebookRedirectURI,
      client_secret: keys.facebookAppSecret,
      code: req.query.code
    },
    function(err, facebookRes) {
      if (err) res.status(BAD_REQUEST).json(err);
      res.status(SUCCESS).json(facebookRes);
    }
  );
});

router.post("/googleCode", (req, res, next) => {  
  
  const accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';  

  const params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: keys.googleAppSecret,
    redirect_uri: 'http://localhost:8080',
    grant_type: 'authorization_code'
  };
  
  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { json: true, form: params }, (err, response, token) => {
    const accessToken = token.access_token;    

    const peopleApiUrl = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken;    

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, json: true }, (err, response, profile) => {
      if (profile.error) {
        return res.status(500).send({message: profile.error.message});
      }
      
      Usuario.findOne({
        where: {
          provider: "google",
          provider_id: profile.id
        }
      }).then((user, err) => {
        if (!user){
          const newUser = new Usuario({
            first_name: profile.given_name,
            full_name: profile.name,
            email: profile.email,
            photo: profile.picture,
            provider: "google",
            provider_id: profile.id,
            token: accessToken
          });

          newUser.save().then((savedUser, error) => {            
            savedUser = savedUser.get({ plain: true });
            let user = {
              id: savedUser.provider_id,
              firstName: savedUser.first_name,
              photo: savedUser.photo
            }

            req.user = user;
            next();
          });
        } else {
          let user = {
            id: user.provider_id,
            firstName: user.first_name,
            photo: user.photo
          }          
          req.user = user;
          next();          
        }

      });      
    });
  });
},
  generateToken,
  sendToken
);

router.get("/teste", authenticate, (req, res) => {
  console.log(req.auth);
  Usuario.findOne({ where: { provider_id: req.auth.id } })
    .then(usuario => {
      res.status(SUCCESS).json(usuario);
    })
    .catch(err => {
      console.log(err.status)
      res.status(BAD_REQUEST).json({error: err.message})
    });
});

module.exports = router;
