/**
 * ============================================
 * Seed Database Script
 * Populate database with initial data
 * ============================================
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const { connectDatabase } = require(path.join(__dirname, '..', 'config', 'database'));
const User = require(path.join(__dirname, '..', 'models', 'User.model'));
const Product = require(path.join(__dirname, '..', 'models', 'Product.model'));
const StudentVerification = require(path.join(__dirname, '..', 'models', 'StudentVerification.model'));

const seedData = async () => {
  try {
    await connectDatabase();

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await StudentVerification.deleteMany({});

    console.log('✅ Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 10);
    const admin = await User.create({
      fullName: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@unihub.local',
      phone: '+233500000000',
      password: adminPassword,
      university: 'all',
      role: 'admin',
      isVerified: true,
      rating: 5.0,
    });

    console.log('✅ Created admin user');

    // Create sample users
    const users = await User.create([
      {
        fullName: 'Kwame Mensah',
        email: 'kwame.mensah@ug.edu.gh',
        phone: '+233501234567',
        password: await bcrypt.hash('password123', 10),
        university: 'ug',
        level: '300',
        hall: 'Commonwealth Hall',
        role: 'buyer',
        isVerified: true,
        rating: 4.5,
        totalOrders: 12,
      },
      {
        fullName: 'Ama Osei',
        email: 'ama.osei@knust.edu.gh',
        phone: '+233249876543',
        password: await bcrypt.hash('password123', 10),
        university: 'knust',
        level: '400',
        hall: 'Queen Elizabeth II Hall',
        role: 'seller',
        isVerified: true,
        rating: 4.8,
        totalSales: 45,
      },
      {
        fullName: 'Kofi Asante',
        email: 'kofi.asante@ucc.edu.gh',
        phone: '+233543217654',
        password: await bcrypt.hash('password123', 10),
        university: 'ucc',
        level: '200',
        role: 'buyer',
        isVerified: true,
        rating: 4.2,
        totalOrders: 8,
      },
      {
        fullName: 'Abena Darko',
        email: 'abena.darko@uew.edu.gh',
        phone: '+233205551234',
        password: await bcrypt.hash('password123', 10),
        university: 'uew',
        level: 'postgrad',
        role: 'seller',
        isVerified: true,
        rating: 4.9,
        totalSales: 67,
      },
    ]);

    console.log('✅ Created sample users');

    // Create sample products
    const products = await Product.create([
      {
        title: 'NASCO 1.5HP Split Air Conditioner',
        description: 'Slightly used NASCO air conditioner in good working condition. Very efficient cooling. Original remote included.',
        price: 1200,
        category: 'appliances',
        condition: 'good',
        images: ['https://via.placeholder.com/400x300?text=Air+Conditioner'],
        seller: users[1]._id,
        sellerName: 'Ama Osei',
        sellerRating: 4.8,
        university: 'ug',
        deliveryModes: ['bolt', 'yango', 'inperson'],
        paymentModes: ['momo', 'telecel', 'bank'],
        status: 'active',
      },
      {
        title: 'Single Bed with Mattress',
        description: 'Metal frame single bed with fairly new mattress. Suitable for hostel. Very sturdy.',
        price: 450,
        category: 'hostel-items',
        condition: 'good',
        images: ['https://via.placeholder.com/400x300?text=Bed'],
        seller: users[0]._id,
        sellerName: 'Kwame Mensah',
        sellerRating: 4.5,
        university: 'ug',
        deliveryModes: ['bolt', 'inperson'],
        paymentModes: ['momo', 'cash'],
        status: 'active',
      },
      {
        title: 'Samsung Galaxy A13 - Black',
        description: 'Excellent condition Samsung Galaxy A13. Screen protector and case included. One year old, no scratches.',
        price: 850,
        category: 'electronics',
        condition: 'excellent',
        images: ['https://via.placeholder.com/400x300?text=Samsung+Phone'],
        seller: users[1]._id,
        sellerName: 'Ama Osei',
        sellerRating: 4.8,
        university: 'knust',
        deliveryModes: ['bolt', 'yango', 'inperson'],
        paymentModes: ['momo', 'bank'],
        status: 'active',
      },
      {
        title: 'Introductory Economics Textbook',
        description: 'Samuelson\'s Economics textbook (10th edition). Lightly used, all pages intact. Perfect for ECON 101.',
        price: 85,
        category: 'textbooks',
        condition: 'good',
        images: ['https://via.placeholder.com/400x300?text=Textbook'],
        seller: users[0]._id,
        sellerName: 'Kwame Mensah',
        sellerRating: 4.5,
        university: 'ug',
        deliveryModes: ['inperson'],
        paymentModes: ['momo', 'cash'],
        status: 'active',
      },
      {
        title: 'Dell Laptop Backpack',
        description: 'Durable Dell laptop backpack with multiple compartments. Fits up to 17-inch laptop. Fair condition, still very usable.',
        price: 120,
        category: 'accessories',
        condition: 'fair',
        images: ['https://via.placeholder.com/400x300?text=Backpack'],
        seller: users[2]._id,
        sellerName: 'Kofi Asante',
        sellerRating: 4.2,
        university: 'ucc',
        deliveryModes: ['bolt', 'yango', 'inperson'],
        paymentModes: ['momo', 'telecel'],
        status: 'active',
      },
      {
        title: 'HP ProBook 450 Laptop',
        description: 'Intel i5 processor, 8GB RAM, 256GB SSD. Battery life 5-6 hours. Minor scratches on screen bezel. Runs Windows 11.',
        price: 2100,
        category: 'electronics',
        condition: 'good',
        images: ['https://via.placeholder.com/400x300?text=Laptop'],
        seller: users[0]._id,
        sellerName: 'Kwame Mensah',
        sellerRating: 4.5,
        university: 'ug',
        deliveryModes: ['inperson'],
        paymentModes: ['bank', 'momo'],
        status: 'active',
      },
      {
        title: 'Used Chemistry Lab Coat',
        description: 'White chemistry lab coat, size M. Clean and ready to use. Slight staining on sleeve.',
        price: 45,
        category: 'fashion',
        condition: 'fair',
        images: ['https://via.placeholder.com/400x300?text=Lab+Coat'],
        seller: users[1]._id,
        sellerName: 'Ama Osei',
        sellerRating: 4.8,
        university: 'knust',
        deliveryModes: ['yango', 'inperson'],
        paymentModes: ['momo', 'cash'],
        status: 'active',
      },
      {
        title: 'Study Table with Drawer',
        description: 'Wooden study table with one drawer and shelf. Good for assignments. Fair condition.',
        price: 280,
        category: 'hostel-items',
        condition: 'fair',
        images: ['https://via.placeholder.com/400x300?text=Study+Table'],
        seller: users[0]._id,
        sellerName: 'Kwame Mensah',
        sellerRating: 4.5,
        university: 'ug',
        deliveryModes: ['bolt', 'inperson'],
        paymentModes: ['momo', 'telecel', 'cash'],
        status: 'active',
      },
    ]);

    console.log('✅ Created sample products');

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   🎉 Database seeded successfully!                        ║');
    console.log('║                                                           ║');
    console.log('║   Admin Login:                                            ║');
    console.log(`║   Email: ${process.env.ADMIN_EMAIL || 'admin@unihub.local'}                    ║`);
    console.log(`║   Password: ${process.env.ADMIN_PASSWORD || 'Admin123!'}                         ║`);
    console.log('║                                                           ║');
    console.log('║   Sample User Login:                                      ║');
    console.log('║   Email: kwame.mensah@ug.edu.gh                           ║');
    console.log('║   Password: password123                                   ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();
