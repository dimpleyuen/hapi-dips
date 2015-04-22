var Joi = require('joi');
var Auth = require('./auth');

exports.register = function(server, options, next) {

  server.route([
    { // GET REQUEST || GET LOGS BY ONE USER (REQ. AUTH)
      method: 'GET',
      path: '/logs',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;

        Auth.authenticated(request, function(result) {
          if (result.authenticated === false) {
            return reply('Please Login First');
          }
          if (result.authenticated) {
            db.collection('logs').find( {"user_id" : ObjectId(result.user_id)} ).toArray(function(err, logs) {
              if (err) {
                return reply('Internal MongoDB Error', err);
              }
              reply(logs);
            })
          }
        })
      }
    },

    { //GET REQUEST || (BY LOCATION) GET LOGS BY ONE USER (REQ. AUTH)
      // request -> "http://locahost:3000/logs?username=harry&searchQuery=hongkong"
      // path: '/logs',
      method: 'GET',
      path: '/logs/{searchQuery}',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var username = encodeURIComponent(request.params.username);
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
        var searchQuery = encodeURIComponent(request.params.searchQuery);

        db.collection('logs').createIndex( { location: "text" } ); //only do location now:: to-do --> by year and keywords
        var query = {$text: { $search: searchQuery } };

        Auth.authenticated(request, function(result) {
          if (result.authenticated === false) {
            return reply('Please Login First');
          }
          if (result.authenticated) {
            db.collection('logs').find({ $and: [ {"user_id" : ObjectId(result.user_id)}, query ] }).toArray(function(err, logs) {
              if (err) {
                return reply("Internal MongoDB Error", err);
              }
              return reply(logs);
            })
          }
        })
      }
    },

    { //POST REQUEST || POST A NEW LOG (REQ. AUTH)
      method: 'POST',
      path: '/logs',
      config: {
        handler: function(request, reply) {
          var db = request.server.plugins['hapi-mongodb'].db;
          var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;

          Auth.authenticated(request, function(result) {
            if (result.authenticated === false) {
               return reply('Please Login First');
            }

            var log = {};
            //go to users collection and find the user_id
            db.collection('users').findOne( {"_id": ObjectId(result.user_id)}, function(err, user){
              if (err) {
                return reply('Internal MongDB Error', err);
              }
              // create a new log
              if (user) {
                log = {
                  "user_id" : ObjectId(user._id),
                  "username": user.username,
                  "date" : new Date(request.payload.log.date),
                  "location" : request.payload.log.location,
                  "surfaceInt" : request.payload.log.surfaceInt,
                  "startingPG" : request.payload.log.startingPG,
                  "depth" : request.payload.log.depth,
                  "bottomTime" : request.payload.log.bottomTime,
                  "safetyStop" : request.payload.log.safetyStop,
                  "endingPG" : request.payload.log.endingPG,
                  "bottomTimeToDate" : request.payload.log.bottomTimeToDate,
                  "cumulativeTime" : request.payload.log.cumulativeTime,
                  "visibility" : request.payload.log.visibility,
                  "buddyName" : request.payload.log.buddyName,
                  "buddyTitle" : request.payload.log.buddyTitle,
                  "buddyCert" : request.payload.log.buddyCert,
                  "diveCenter" : request.payload.log.diveCenter,
                  "description" : request.payload.log.description,
                  "keywords" : request.payload.log.keywords,
                  "image" : request.payload.log.image
                }
                
                db.collection('logs').insert(log, function(err, writeResult) {
                  if (err) {
                    return reply('Internal MongoDB Error', err);
                  }
                  reply(writeResult);
                })
              }
            })
          })
        },
        validate: {
          payload: {
            log: {
              date: Joi.string().required(),
              location: Joi.string().required(),
              surfaceInt: Joi.string(),
              startingPG: Joi.string(),
              depth: Joi.string(),
              bottomTime: Joi.string().required(),
              safetyStop: Joi.string(),
              endingPG: Joi.string(),
              bottomTimeToDate: Joi.string().required(),
              cumulativeTime: Joi.string().required(),
              visibility: Joi.string(),
              buddyName: Joi.string(),
              buddyTitle: Joi.string(),
              buddyCert: Joi.string(),
              diveCenter: Joi.string(),
              description: Joi.string().max(750),
              keywords: Joi.string(),
              image: Joi.string()
            }
          }
        }
      }
    },

    { //PUT REQUEST || UPDATE A SPECIFIC LOG (REQ. AUTH)
      method: 'PUT',
      path: '/logs/{id}',
      config: {
        handler: function(request, reply) {
          var db = request.server.plugins['hapi-mongodb'].db;
          var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
          var id = encodeURIComponent(request.params.id);

          Auth.authenticated(request, function(result) {
            if (result.authenticated === false) {
               return reply('Please Login First');
            }

            var log = {};
            //see if log exists
            db.collection('logs').findOne( {"_id": ObjectId(id), "user_id": ObjectId(result.user_id)}, function(err, logResult){
              if (err) {
                return reply('Internal MongDB Error', err);
              }
              if (logResult === null) {
                return reply("Log Does Not Exist/Not Authorized To Delete");
              }
              if (logResult) {
                log = {
                  "user_id" : ObjectId(result.user_id),
                  "username": logResult.username,
                  "date" : new Date(request.payload.log.date),
                  "location" : request.payload.log.location,
                  "surfaceInt" : request.payload.log.surfaceInt,
                  "startingPG" : request.payload.log.startingPG,
                  "depth" : request.payload.log.depth,
                  "bottomTime" : request.payload.log.bottomTime,
                  "safetyStop" : request.payload.log.safetyStop,
                  "endingPG" : request.payload.log.endingPG,
                  "bottomTimeToDate" : request.payload.log.bottomTimeToDate,
                  "cumulativeTime" : request.payload.log.cumulativeTime,
                  "visibility" : request.payload.log.visibility,
                  "buddyName" : request.payload.log.buddyName,
                  "buddyTitle" : request.payload.log.buddyTitle,
                  "buddyCert" : request.payload.log.buddyCert,
                  "diveCenter" : request.payload.log.diveCenter,
                  "description" : request.payload.log.description,
                  "keywords" : request.payload.log.keywords,
                  "image" : request.payload.log.image
                }

                db.collection('logs').update(logResult, log, function(err, writeResult) {
                  if (err) {
                    return reply('Internal MongoDB Error', err);
                  }
                  reply(writeResult);
                })         
              }
            })
          })
        },
        validate: {
          payload: {
            log: {
              date: Joi.string().required(),
              location: Joi.string().required(),
              surfaceInt: Joi.string(),
              startingPG: Joi.string(),
              depth: Joi.string(),
              bottomTime: Joi.string().required(),
              safetyStop: Joi.string(),
              endingPG: Joi.string(),
              bottomTimeToDate: Joi.string().required(),
              cumulativeTime: Joi.string().required(),
              visibility: Joi.string(),
              buddyName: Joi.string(),
              buddyTitle: Joi.string(),
              buddyCert: Joi.string(),
              diveCenter: Joi.string(),
              description: Joi.string().max(750),
              keywords: Joi.string(),
              image: Joi.string()
            }
          }
        }
      }
    },

    { //DELETE REQUEST || DELETE A SPECIFIC LOG (REQ. AUTH)
      method: 'DELETE',
      path: '/logs/{id}',
      handler: function (request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
        var id = encodeURIComponent(request.params.id);

        Auth.authenticated(request, function(result) {
          if (result.authenticated === false) {
            return reply('Please Login First');
          }
          if (result.authenticated) {
            db.collection('logs').findOne( {"_id" : ObjectId(id), "user_id" : ObjectId(result.user_id)}, function(err, log) {
              if (err) {
                return reply('Internal MongoDB Error', err);
              }
              if (log === null) {
                return reply('Not Authorized');
              }
              db.collection('logs').remove(log, function(err, result) {
                return reply(result);
              });
            })
          }
        })
      }
    }
  
  ])

  next();
};

exports.register.attributes = {
  name: 'tweets-route',
  version: '0.0.1'
};