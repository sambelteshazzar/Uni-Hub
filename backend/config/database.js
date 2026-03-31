/**
 * ============================================
 * Database Configuration
 * MongoDB Connection Setup
 * ============================================
 */

const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 6+ no longer requires these options, but included for clarity
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    // If in development and MongoDB is not running, provide helpful message
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure MongoDB is running:');
      console.log('   - Local: mongod or docker run mongodb\n');
    }
    
    process.exit(1);
  }
};

module.exports = { connectDatabase };
