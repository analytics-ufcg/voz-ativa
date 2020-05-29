const jwt = require("jsonwebtoken");
const keys = require("../config/keys");

const createToken = function(auth) {
  return jwt.sign(
    {
      id: auth.id,
      firstName: auth.firstName,
      photo: auth.photo,
      respostas: auth.respostas
    },
    keys.secretOrKey,
    {
      expiresIn: 60 * 43200 // 30 dias
    }
  );
};

module.exports = {
  generateToken: function(req, res, next) {
    req.token = createToken(req.auth);
    return next();
  },
  sendToken: function(req, res) {
    res.setHeader("authorization", req.token);
    return res.status(200).send(JSON.stringify(req.user));
  },
  createToken
};
