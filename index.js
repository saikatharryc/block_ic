var express = require('express'),
  app = express(),
  port = process.env.PORT || 3000,
  api = require('./src/api'),
  router = express.Router();
app.use(express.json());
// NEW ACCOUNT
app.get('/getmnemonic', api.getMnemonic);
app.post('/importaccount', api.importAccount);

//BALANCE
app.get('/balance', api.balance);

// GENERATE ADDRESSES
app.post('/generateAddress', api.generateAddress);

// SENDING
app.post('/sendtransaction/createTxn', api.createTxn);
app.post('/sendtransaction/signTxn', api.signTxn);

// TRANSACTION STATUS
app.get('/tx', api.tx);

app.listen(port);
console.info('[Server] txns server started on: ' + port);

