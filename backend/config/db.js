const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    // console.error is intentional — DB connection failure is fatal and
    // must be visible in production logs regardless of NODE_ENV
    console.error(`DB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
