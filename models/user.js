// mongoose model for a user that contains a name, unique email and list of shows watched
// reference show from the show model and schema at ./models/show.js
// shows user has been must be unique
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  shows: [{ type: Schema.Types.ObjectId, ref: "Show" }],
});

module.exports = mongoose.model("User", userSchema);
