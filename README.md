# block_ic
To deploy, look at the `MONGO_URL` in `config.js` and change it accordingly.

*  `cron.js` takes care of moving the Balance of child wallets (as of not BTC) to Ht wallet. & along with that it also checks for incoming transactions.

*  To Run cron `node cron.js` [with current testnet insight it will fails, as rate limiter present in testnet, we need to use our own deployed bitcore testnet instead to make this work.]
*  To run the main app: `node index.js`
*  
