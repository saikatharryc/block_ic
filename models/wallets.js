const mongoose = require("mongoose");

var WalletSchema = mongoose.Schema(
  {
    wallet_index: {
      type: Number,
      default: 0
    },
    wallet_name: {
      type: String,
      default: "Unknown"
    },
    wallet_address: {
      type: String,
      required: true
    },
    wallet_private_key: {
      type: String
    },
    balance_in_satoshi:{
      type:Number,
      default:0
    },
  },
  { timestamps: true }
);
const Wallets = mongoose.model("Wallets", WalletSchema);

module.exports = Wallets;
