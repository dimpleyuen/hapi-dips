var Joi = require('joi');
var Auth = require('./auth');

exports.register = function(server, options, next) {

  server.route([
    { // GET REQUEST || GET LOGS BY ONE USER (REQ. AUTH)
      method: 'GET',
      path: '/users/{username}/logs',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var username = encodeURIComponent(request.params.username);

        Auth.authenticated(request, function(result) {
          if (result.authenticated === false) {
            return reply('Please Login First');
          }

          //see if user exists in the collection
          db.collection('users').findOne({"username": username}, function(err, user) {
            if (err) {
              return reply('Internal MongoDB Error', err);
            }
            if (user === null) {
              return reply('User Does Not Exist');
            }
            if (user) {
              //see if there's a match in sessions
              db.collection('sessions').findOne( {"user_id" : user._id}, function(err, result) {
                if (err) {
                  return reply('Internal MongoDB Error', err);
                }
                //if there's no match, not authorized to view
                if (result === null) {
                  return reply({'authorized' : false})
                }
                //if there's a match, list all the logs
                if (result) {
                  db.collection('logs').find( {username: username} ).toArray(function(err, logs) {
                    if (err) {
                      return reply('Internal MongoDB error', err);
                    }
                    reply(logs);
                  })
                }
              })
            }
          })
        })
      }
    },

    { //GET REQUEST || (BY LOCATION) GET LOGS BY ONE USER (REQ. AUTH)
      method: 'GET',
      path: '/users/{username}/logs/{searchQuery}',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var username = encodeURIComponent(request.params.username);
        var searchQuery = encodeURIComponent(request.params.searchQuery);

        // db.collection('logs').createIndex( { location: "text" } );
        db.collection('logs').createIndex( {
          location: 'text',
          date: 'text',
          keywords: 'text',
        });

        // var query = { $or: [{location: searchQuery}, {date: searchQuery}] };
        var query = { $text: { $search: searchQuery } };

        Auth.authenticated(request, function(result) {
          if (result.authenticated === false) {
            return reply('Please Login First');
          }
          //see if the user exists
          db.collection('users').findOne({"username": username}, function(err, user) {
            if (err) {
              return reply('Internal MongoDB Error', err);
            }
            if (user === null) {
              return reply('User Does Not Exist');
            }
            if (user) {
              //see if there's a match in sessions
              db.collection('sessions').findOne( {"user_id" : user._id}, function(err, result) {
                if (err) {
                  return reply('Internal MongoDB Error', err);
                }
                //if there's no match, not authorized to view
                if (result === null) {
                  return reply({'authorized' : false})
                }
                //if there's a match, list all the logs by location
                if (result) {
                  db.collection('logs').find(query).toArray(function(err, logs) {
                    if (err) {
                      return reply('Internal MongoDB error', err);
                    }
                    reply(logs);
                  })
                }
              })
            }
          })
        })
      }
    },

    { //POST REQUEST || POST A NEW LOG (REQ. AUTH)
      method: 'POST',
      path: '/logs',
      config: {
        handler: function(request, reply) {
          var db = request.server.plugins['hapi-mongodb'].db;
          var session = request.session.get("dips_session");
          var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;

          Auth.authenticated(request, function(result) {
            if (result.authenticated === false) {
               return reply('Please Login First');
            }

            var log = {};
            //go to users collection and find the user_id (to be used later)
            db.collection('users').findOne( {"_id": ObjectId(session.user_id)}, function(err, result){
              if (err) {
                return reply('Internal MongDB Error', err);
              }
              // create a new log
              if (result) {
                log = {
                  "user_id" : ObjectId(session.user_id),
                  "username": result.username,
                  "diveNum" : request.payload.log.diveNum,
                  "date" : request.payload.log.date,
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
              diveNum: Joi.string().required(),
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
              buddyName: Joi.string().required(),
              buddyTitle: Joi.string().required(),
              buddyCert: Joi.string(),
              diveCenter: Joi.string(),
              description: Joi.string().max(750),
              keywords: Joi.string()
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
          var session = request.session.get("dips_session");
          var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
          var id = encodeURIComponent(request.params.id);

          Auth.authenticated(request, function(result) {
            if (result.authenticated === false) {
               return reply('Please Login First');
            }

            var log = {};

            db.collection('logs').findOne( {"_id": ObjectId(id)}, function(err, result){
              if (err) {
                return reply('Internal MongDB Error', err);
              }
              if (result === null) {
                return reply("Log Does Not Exist");
              }
              if (result) {
                log = {
                  "user_id" : ObjectId(session.user_id),
                  "username": result.username,
                  "diveNum" : request.payload.log.diveNum,
                  "date" : request.payload.log.date,
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
                }
                
                db.collection('logs').update({ "_id" : result._id }, log, function(err, writeResult) {
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
              diveNum: Joi.string().required(),
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
              buddyName: Joi.string().required(),
              buddyTitle: Joi.string().required(),
              buddyCert: Joi.string(),
              diveCenter: Joi.string(),
              description: Joi.string().max(750),
              keywords: Joi.string()
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
        var session = request.session.get("hapi_twitter_session");
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
        var id = encodeURIComponent(request.params.id);

        Auth.authenticated(request, function(result) {
          if (result.authenticated === false) {
            return reply('Please Login First');
          }
          //see if log exists
          db.collection('logs').findOne({"_id": ObjectId(id)}, function(err, log) {
            if (err) {
              return reply('Internal MongoDB Error', err);
            }
            if (log === null) {
              return reply('Log Does Not Exist');
            }
            if (log) {
              //see if person is authorized
              db.collection('sessions').findOne( {"user_id" : ObjectId(log.user_id)}, function(err, result) {
                if (err) {
                  return reply('Internal MongoDB Error', err);
                }
                //if there's no match, not authorized
                if (result === null) {
                  return reply({'authorized' : false})
                }
                //if there's a match, delete it
                if (result) {
                  db.collection('logs').remove({"_id": ObjectId(id)}, function(err, writeResult) {
                    if (err) {
                      return reply('Internal MongoDB Error', err);
                    }
                    reply(writeResult);
                  })
                }
              })
            }
          })
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