const {start_exploring}=require('./block_explorer')
const {roll_over_wallets}= require('./wallet_watcher')
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
Promise.all([start_exploring(),roll_over_wallets()]).then(d=>{
    console.log(d)
}).catch(ex=>{
    console.log("[Error]:",ex)
})
