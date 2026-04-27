/**
 * Database Seeding Script
 * Populates the database with sample data for development
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const Review = require('../models/Review.model');
const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const Payment = require('../models/Payment.model');
const Delivery = require('../models/Delivery.model');
const StudentVerification = require('../models/StudentVerification.model');

// Ghana Universities
const GHANA_UNIVERSITIES = [
  'University of Ghana (UG)',
  'Kwame Nkrumah University of Science and Technology (KNUST)',
  'University of Cape Coast (UCC)',
  'University of Professional Studies, Accra (UPSA)',
  'Ghana Institute of Management and Public Administration (GIMPA)',
  'Ashesi University',
  'University of Mines and Technology (UMaT)',
  'Central University',
  'Valley View University',
  'Kofi Annan University of IT',
];

// Sample Users
const SAMPLE_USERS = [
  {
    fullName: 'John Doe',
    email: 'john@student.ug.edu.gh',
    password: 'Student123!',
    phone: '+233501234567',
    university: 'University of Ghana (UG)',
    level: '300',
    hall: 'Legon Hall',
    role: 'seller',
    isVerified: true,
    rating: 4.5,
  },
  {
    fullName: 'Jane Smith',
    email: 'jane@student.knust.edu.gh',
    password: 'Student123!',
    phone: '+233502345678',
    university: 'Kwame Nkrumah University of Science and Technology (KNUST)',
    level: '200',
    hall: 'Queen Elizabeth II Hall',
    role: 'seller',
    isVerified: true,
    rating: 4.8,
  },
  {
    fullName: 'Mike Johnson',
    email: 'mike@student.ucc.edu.gh',
    password: 'Student123!',
    phone: '+233503456789',
    university: 'University of Cape Coast (UCC)',
    level: '400',
    hall: 'Casely Hayford Hall',
    role: 'seller',
    isVerified: false,
    rating: 3.5,
  },
  {
    fullName: 'Sarah Williams',
    email: 'sarah@student.upsa.edu.gh',
    password: 'Student123!',
    phone: '+233504567890',
    university: 'University of Professional Studies, Accra (UPSA)',
    level: '100',
    hall: 'N/A',
    role: 'buyer',
    isVerified: true,
    rating: 0,
  },
  {
    fullName: 'Admin User',
    email: 'admin@unihub.local',
    password: 'Admin123!',
    phone: '+233500000000',
    university: 'All Universities',
    level: 'postgrad',
    role: 'admin',
    isVerified: true,
    rating: 5.0,
  },
];

// Sample Products
const SAMPLE_PRODUCTS = [
  {
    title: 'MacBook Pro 2021 - 16 inch',
    description: 'Excellent condition MacBook Pro with M1 Pro chip. 16GB RAM, 512GB SSD. Comes with original charger and box. Selling because I upgraded to the M2 version.',
    price: 8500,
    category: 'electronics',
    condition: 'excellent',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=800',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800',
    ],
    deliveryModes: ['bolt', 'yango', 'inperson'],
    paymentModes: ['momo', 'bank', 'cash'],
    status: 'active',
  },
  {
    title: 'Samsung Galaxy S22 Ultra',
    description: 'Like new Samsung S22 Ultra. 128GB storage. Still under warranty. Comes with charger and case.',
    price: 4200,
    category: 'electronics',
    condition: 'excellent',
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
    ],
    deliveryModes: ['yango', 'inperson'],
    paymentModes: ['momo', 'cash'],
    status: 'active',
  },
  {
    title: 'Textbook: Principles of Economics (Gregory Mankiw)',
    description: 'Economics textbook used in ECON 101. 7th edition. Some highlights and notes but in good condition.',
    price: 150,
    category: 'textbooks',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
    ],
    deliveryModes: ['inperson'],
    paymentModes: ['cash', 'momo'],
    status: 'active',
  },
  {
    title: 'Electric Kettle - 1.7L',
    description: 'Fast boiling electric kettle. Used for 1 year but still works perfectly. Selling as I\'m moving out of hostel.',
    price: 120,
    category: 'appliances',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800',
    ],
    deliveryModes: ['bolt', 'inperson'],
    paymentModes: ['cash', 'momo'],
    status: 'active',
  },
  {
    title: 'Student Desk Lamp with USB Port',
    description: 'LED desk lamp with adjustable brightness. Has USB charging port. Perfect for hostel study sessions.',
    price: 80,
    category: 'hostel-items',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
    ],
    deliveryModes: ['inperson'],
    paymentModes: ['cash'],
    status: 'active',
  },
  {
    title: 'Mini Fridge - 50L',
    description: 'Hisense mini fridge perfect for hostel rooms. Energy efficient. Some scratches on outside but works great.',
    price: 650,
    category: 'appliances',
    condition: 'fair',
    images: [
      'https://images.unsplash.com/photo-1571175443880-49e1d58b2c63?w=800',
    ],
    deliveryModes: ['bolt', 'yango', 'inperson'],
    paymentModes: ['momo', 'cash'],
    status: 'active',
  },
  {
    title: 'Sony WH-1000XM4 Headphones',
    description: 'Premium noise cancelling headphones. Amazing for studying in noisy hostels. Original case included.',
    price: 1800,
    category: 'electronics',
    condition: 'excellent',
    images: [
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800',
    ],
    deliveryModes: ['bolt', 'yango', 'inperson'],
    paymentModes: ['momo', 'bank', 'cash'],
    status: 'active',
  },
  {
    title: 'Scientific Calculator - Casio FX-991ES',
    description: 'Essential for engineering and science courses. All functions working perfectly.',
    price: 180,
    category: 'textbooks',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1587145820266-a5951ee86f6e?w=800',
    ],
    deliveryModes: ['inperson'],
    paymentModes: ['cash'],
    status: 'active',
  },
  {
    title: 'Nike Air Force 1 - Size 42',
    description: 'White Air Force 1s. Worn a few times but cleaned and in great condition. Original box included.',
    price: 450,
    category: 'fashion',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d94d575f9?w=800',
    ],
    deliveryModes: ['bolt', 'inperson'],
    paymentModes: ['cash', 'momo'],
    status: 'active',
  },
  {
    title: 'Textbook: Introduction to Psychology',
    description: 'Psychology 101 textbook. 5th edition. Very minimal highlighting.',
    price: 120,
    category: 'textbooks',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800',
    ],
    deliveryModes: ['inperson'],
    paymentModes: ['cash'],
    status: 'active',
  },
  {
    title: 'iPad Air 4th Gen with Apple Pencil',
    description: '64GB iPad Air with Apple Pencil. Perfect for taking notes in class. Screen protector installed.',
    price: 3200,
    category: 'electronics',
    condition: 'excellent',
    images: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
    ],
    deliveryModes: ['bolt', 'yango', 'inperson'],
    paymentModes: ['momo', 'bank', 'cash'],
    status: 'active',
  },
  {
    title: 'Bedside Table / Nightstand',
    description: 'Wooden bedside table with drawer. Minor wear but sturdy. Must collect from Hall 2.',
    price: 90,
    category: 'hostel-items',
    condition: 'fair',
    images: [
      'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800',
    ],
    deliveryModes: ['inperson'],
    paymentModes: ['cash'],
    status: 'active',
  },
];

// Seed function
async function seedDatabase () {
  try {
    // Connect to database
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uni-hub');
    console.log('✅ Connected to MongoDB');

    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Cannot seed in production environment');
      process.exit(1);
    }

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await Payment.deleteMany({});
    await Delivery.deleteMany({});
    await StudentVerification.deleteMany({});
    console.log('✅ Data cleared');

    // Create users
    console.log('👤 Creating sample users...');
    const createdUsers = [];

    for (const userData of SAMPLE_USERS) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await User.create({
        ...userData,
        password: hashedPassword,
      });
      createdUsers.push(user);
      console.log(`   ✅ Created: ${user.fullName} (${user.role})`);
    }

    // Create products
    console.log('📦 Creating sample products...');
    const sellers = createdUsers.filter(u => u.role === 'seller');

    for (let i = 0; i < SAMPLE_PRODUCTS.length; i++) {
      const productData = SAMPLE_PRODUCTS[i];
      const seller = sellers[i % sellers.length]; // Rotate through sellers

      const product = await Product.create({
        ...productData,
        seller: seller._id,
        sellerName: seller.fullName,
        sellerRating: seller.rating,
        university: seller.university,
      });
      console.log(`   ✅ Created: ${product.title} (${product.price} GHS)`);
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('   Admin: admin@unihub.local / Admin123!');
    console.log('   Seller: john@student.ug.edu.gh / Student123!');
    console.log('   Buyer: sarah@student.upsa.edu.gh / Student123!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, SAMPLE_USERS, SAMPLE_PRODUCTS };
