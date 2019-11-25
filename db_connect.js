var mongoose = require('mongoose');
const config = require("./config");
var connection = mongoose.connection;

connection
  .on('error', function (err) {
    // Do nothing for now
    // Log this errror as MongoDB Connection Error.
    console.log("Error in MongoDB Connection");
    console.error(err);
  })
  .on('disconnected', reConnect)
  .once('open', listen);

connection.on('reconnected', function () {
  console.log('MongoDB reconnected!');
});

function listen() {
  console.log("Data Base Connected");
  //console.log(connection.readyState);
}

function connect() {
  /* All the availaible Options 
  **  [ poolSize,ssl,sslValidate,sslCA,sslCert,sslKey,sslPass,sslCRL,autoReconnect,noDelay,keepAlive,connectTimeoutMS,socketTimeoutMS,reconnectTries,reconnectInterval,ha,haInterval,replicaSet,
        secondaryAcceptableLatencyMS,acceptableLatencyMS,connectWithNoPrimary,authSource,w,wtimeout,j,forceServerObjectId,serializeFunctions,ignoreUndefined,raw,promoteLongs,bufferMaxEntries,readPreference,pkFactory,promiseLibrary,readConcern,maxStalenessSeconds,
        loggerLevel,logger,promoteValues,promoteBuffers,promoteLongs,domainsEnabled,keepAliveInitialDelay,checkServerIdentity,validateOptions
      ]
  ** 
  */
  const connection = mongoose.connect(config.db.MONGO_URL, config.db.options,(err)=>{
        reConnect();
      });
  return connection;
}

function reConnect() {
  if (mongoose.connection.readyState == 0) {
    console.log(mongoose.connection.readyState);
    // connect();
  }
  else {
    // DO nothing. 
    //console.log("I am already Connected");
  }
}
connect();
module.exports = exports = mongoose;