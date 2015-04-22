var Bcrypt = require('bcrypt');
var Auth = require('./auth');

exports.register = function(server, options, next) {
  
  server.route([
    { //POST REQUEST || CREATE SESSION (LOGIN)
      method: 'POST',
      path: '/sessions',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var user = request.payload.user;

        //find if the username exists
        db.collection('users').findOne( {"username" : user.username}, function (err, userMongo) {
          if (err) {
            return reply('Internal MongoDB error', err);
          }

          if (userMongo === null) {
            return reply({"message": "User Does Not Exist"});
          }

          //if it exists check if password is correct
          Bcrypt.compare(user.password, userMongo.password, function(err, match) {
            if (match) {
              
              //generate a randomkey (this is the cookie)
              function randomKeyGenerator() { return (((1+Math.random())*0x10000)|0).toString(16).substring(1); }
              var randomKey = (randomKeyGenerator() + randomKeyGenerator() + "-" + randomKeyGenerator() + "-4" + randomKeyGenerator().substr(0,3) + "-" + randomKeyGenerator() + "-" + randomKeyGenerator() + randomKeyGenerator() + randomKeyGenerator()).toLowerCase();

              //create a new session with cookie and user info
              var newSession = {
                "session_key" : randomKey,
                "user_id": userMongo._id
              }

              //insert the new session into the sessions collection
              db.collection('sessions').insert(newSession, function(err, writeResult) {
                if (err) {
                  return reply('Internal MongoDB error', err);
                }

                //store new session info into the browser cookie via yar
                request.session.set('dips_session', newSession);
                reply({"status": true});
              });

            //if password is incorrect
            } else {
              reply({"message": "Password Incorrect"});
            }
          })
        })
      }
    },
    
    { //GET REQUEST || CHECK IF LOGGED IN
      method: "GET",
      path: "/authenticated",
      handler: function(request,reply){
        Auth.authenticated(request, function(result) {
          //replies either not logged in(no cookie in browser), unauthenticated(has cookie in browser but no session in collections) or authenticated
          reply(result);
        })
      }
    },

    { //DELETE REQUEST || DELETE SESSION (LOGOUT)
      method: 'DELETE',
      path: '/sessions',
      handler: function(request, reply) {
        var session = request.session.get('dips_session');
        var db = request.server.plugins['hapi-mongodb'].db;

        if (!session) {
          return reply({ "message": "Already Logged Out"});
        }
        db.collection('sessions').remove({ "session_key": session.session_key }, function(err, writeResult) {
          if (err) {
            return reply('Internal MongoDB Error', err);
          }
          return reply({"status": true});
        })
      }
    }

  ])

  next();
};

// give this file some attributes
exports.register.attributes = {
  name: 'sessions-route',
  version: '0.0.1'
}