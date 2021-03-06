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
            db.collection('logs').find( {"user_id" : ObjectId(result.user_id)} ).sort( {"date" : 1} ).toArray(function(err, logs) {
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
      path: '/logs/search/{searchQuery}',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var username = encodeURIComponent(request.params.username);
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
        var searchQuery = encodeURIComponent(request.params.searchQuery);

        db.collection('logs').createIndex( { location: "text" } );
        db.collection('logs').createIndex( { keywords: "text" } );
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

    { // GET REQUEST || GET LOG BY ID
      method: 'GET',
      path: '/logs/{id}',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
        var id = encodeURIComponent(request.params.id);

        Auth.authenticated(request, function(result) {
          if (result.authenticated === false) {
            return reply('Please Login First');
          }
          if (result.authenticated) {
            db.collection('logs').findOne({ $and: [ {"user_id" : ObjectId(result.user_id)}, {"_id" : ObjectId(id) } ] }, function(err, logs) {
              if (err) {
                return reply("Internal MongoDB Error", err);
              }
              if (logs === null) {
                return reply({"message" : "Tweet Does Not Exist/Not Authorized"});
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
                // var diveNum = db.collection('logs').count({"user_id" : ObjectId(result.user_id)});
                
                log = {
                  "user_id" : ObjectId(user._id),
                  "username": user.username,
                  // "diveNum" : (diveNum+1),
                  "date" : new Date(request.payload.log.date),
                  "location" : request.payload.log.location,
                  "surfaceInt" : request.payload.log.surfaceInt,
                  "startingPG" : request.payload.log.startingPG,
                  "depth" : request.payload.log.depth,
                  "bottomTime" : request.payload.log.bottomTime,
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
              // diveNum: Joi.number().required(),
              location: Joi.string().required(),
              surfaceInt: Joi.string().allow(''),
              startingPG: Joi.string().allow(''),
              depth: Joi.string().allow(''),
              bottomTime: Joi.string().required(),
              safetyStop: Joi.string().allow(''),
              endingPG: Joi.string().allow(''),
              bottomTimeToDate: Joi.string().required(),
              cumulativeTime: Joi.string().required(),
              visibility: Joi.string().allow(''),
              buddyName: Joi.string().allow(''),
              buddyTitle: Joi.string().allow(''),
              buddyCert: Joi.string().allow(''),
              diveCenter: Joi.string().allow(''),
              description: Joi.string().max(1000).allow(''),
              keywords: Joi.string().allow(''),
              image: Joi.string().allow('')
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
            db.collection('logs').findOne( {"_id": ObjectId(id), function(err, logResult){
              if (err) {
                return reply('Internal MongDB Error', err);
              }
              if (logResult === null) {
                return reply("Log Does Not Exist/Not Authorized To Delete");
              }
              if (logResult) {
                log = {
                  "date" : new Date(request.payload.log.date),
                  "location" : request.payload.log.location,
                  "surfaceInt" : request.payload.log.surfaceInt,
                  "startingPG" : request.payload.log.startingPG,
                  "depth" : request.payload.log.depth,
                  "bottomTime" : request.payload.log.bottomTime,
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

                db.collection('logs').update({_id: ObjectId(logResult._id)}, {$set: log}, function(err, writeResult) {
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
              surfaceInt: Joi.string().allow(''),
              startingPG: Joi.string().allow(''),
              depth: Joi.string().allow(''),
              bottomTime: Joi.string().required(),
              safetyStop: Joi.string().allow(''),
              endingPG: Joi.string().allow(''),
              bottomTimeToDate: Joi.string().required(),
              cumulativeTime: Joi.string().required(),
              visibility: Joi.string().allow(''),
              buddyName: Joi.string().allow(''),
              buddyTitle: Joi.string().allow(''),
              buddyCert: Joi.string().allow(''),
              diveCenter: Joi.string().allow(''),
              description: Joi.string().max(750).allow(''),
              keywords: Joi.string().allow(''),
              image: Joi.string().allow('')
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