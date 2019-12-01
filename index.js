var express = require('express'),
  app = express(),
  port = process.env.PORT || 3000,
  api = require('./src/api'),
  exchange= require('./src/exchange')
  router = express.Router();
app.use(express.json());
require('./db_connect');
const offlineTool = require('./utils/offLineOperations')
// NEW ACCOUNT
offlineTool.importMnemonic(
	process.env['MNEMONIC']||"sign attitude tobacco salad tag shiver unique account future trumpet canyon order",
	"BTC"
).then(d=>{
    // console.log(d)
    if(d && d.message){
    process.env['XPRIV']=d.message.accountXpriv
    process.env['XPUB']=d.message.accountXpub
    process.env['DXPUB']=d.message.addressDerivationXpub
    process.env['ADDR_INDEX']=d.message.addresses.index
    process.env['XADDR']=d.message.addresses.publicAddress
    process.env['WIFKEY']=d.message.WIFKEY
    }else{
        console.warn('No Root keys populated')
    }

}).catch(ex=>{
    console.warn('No Root keys populated',ex)
})


app.get('/getmnemonic', api.getMnemonic);
app.post('/importaccount', api.importAccount);

//BALANCE
app.get('/raw/balance', api.balance);

// GENERATE ADDRESSES
app.post('/generateAddress', api.generateAddress);

// SENDING RAW
app.post('/sendtransaction/raw/createTxn', api.createTxn);
app.post('/sendtransaction/raw/signTxn', api.signTxn);
app.post('/raw/broadcastTransaction',api.broadcastTransaction);

app.get('/balance',exchange.getBalance);
app.post('/send',exchange.createTrx);
app.get('/trx',exchange.getTrxByAddress);


// TRANSACTION STATUS
app.get('/tx', api.tx);

app.listen(port);
console.info('[Server] txns server started on: ' + port);

