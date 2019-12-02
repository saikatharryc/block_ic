module.exports = {
  clientConfig: {
    host: '',
    port: 8332,
    user: '',
    pass: 'c=',
    timeout: 30000
  },
  web3: {
    ws: 'wss://ropsten.infura.io/ws/',
    http: 'https://ropsten.infura.io/v3/e7aa4f5925bb4be99ae7b69d0b38ddfe'
  },
  gasLimit: 211000,
    net: 'TESTNET',
    current: 'test', //live
    insightProvider: {
      test: 'https://api.bitcore.io/api/BTC/testnet',
      live: 'https://api.bitcore.io/api/BTC/mainnet'
    },
    network: {
      BTC: {
        current: 'test',
        test: 'testnet',
        live: 'bitcoin',
        insightProvider: {
          test: 'https://api.bitcore.io/api/BTC/testnet',
          live: 'https://api.bitcore.io/api/BTC/mainnet'
        }
      }
    },
    DEPTH_INDEX:0,
    db:{
      MONGO_URL:'mongodb://'+process.env['DB_USERNAME']+':'+process.env['DB_PASS']+'@ds249008.mlab.com:49008/icc_block',
      options: {
      reconnectTries: Number.MAX_VALUE,
      reconnectInterval: 500, // Reconnect every 500ms
      keepAlive: 120,
      autoReconnect: true,
      poolSize: 20
    }
    },
    trx_status:{
      PENDING:10,
      CONFIRMED:20,
      CANCELLED:30,
      DEBIT:40,
      CREDIT:50
    }
  };
  