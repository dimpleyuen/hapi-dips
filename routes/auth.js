module.exports = {};

module.exports.authenticated = function(request, callback) {
  var session = request.session.get("dips_session");
  var db = request.server.plugins['hapi-mongodb'].db;
  
  //check if a cookie exists in the browser
  if (!session) {
    return callback({
      'message': 'Not Logged In',
      'authenticated': false
    });
  }

  //if cookie exists, check if there's a match in my sessions collection
  db.collection('sessions').findOne({'session_key':session.session_key}, function(err, result){
    if(result === null){
      return callback({
        'message':'Unauthenticated',
        'authenticated': false
      });
    } else {
      var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;
      
      db.collection('users').findOne({"_id" : ObjectId(session.user_id)}, function(err, user) {
        return callback({
          "message":"Authenticated",
          'authenticated': true,
          "user_id": session.user_id,
          "username": user.username
        });
      })
    }
  });

}