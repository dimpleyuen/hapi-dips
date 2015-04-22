var Bcrypt = require('bcrypt');
var Joi = require('joi');

exports.register = function(server, options, next) {

  server.route([
    { //POST REQUEST || CREATE NEW USER
      method: 'POST',
      path: '/users',
      config: {
        handler: function(request, reply) {
          var db = request.server.plugins['hapi-mongodb'].db;
          var user = request.payload.user;

          //encrypt password with bcrypt
          Bcrypt.genSalt(10, function(err, salt){
            Bcrypt.hash(user.password, salt, function(err, hash){
              user.password = hash;

            //ensure username and email does not exist
            var uniqueUserQuery = { 
              $or: [
               {username: user.username},
               {email: user.email }
              ]
            };

            db.collection('users').count(uniqueUserQuery, function(err, userExist) {
                if (userExist) {
                  return reply({"message" : "User Already Exists"});
                }
                db.collection('users').insert(user, function(err, writeResult) {
                  if (err) {
                    return reply('Internal MongoDB Error', err);
                  }
                  reply(writeResult);
                })
              })
            })
          });
        },
        validate: {
          payload: {
            user: {
              username: Joi.string().min(3).max(20).required(),
              email: Joi.string().email().max(50).required(),
              password: Joi.string().min(5).max(20).required()
            }
          }
        }
      }
    }

  ])

  next();
};


// give this file some attributes
exports.register.attributes = {
  name: 'users-route',
  version: '0.0.1'
}