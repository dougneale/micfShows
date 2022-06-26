// mongodb scheme and model for a show
// show includes show name, artist, and venue, and type

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const showSchema = new Schema({
  name: String,
  artist: String,
  venue: String,
  type: String,
});

//export model
module.exports = mongoose.model("Show", showSchema);
