/**
* Database Seeding Script
* Populates the SQLite database with sample data for development
*/
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { connectDatabase, getDb } = require('../config/database');
const { generateId } = require('../utils/db');

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
'University for Development Studies (UDS)',
'University of Education, Winneba (UEW)',
'University of Energy and Natural Resources (UENR)',
'University of Health and Allied Sciences (UHAS)',
'Ghana Communication Technology University (GCTU)',
'Accra Technical University (ATU)',
'Koforidua Technical University (KTU)',
'Takoradi Technical University (TTU)',
'Sunyani Technical University (STU)',
'Bolgatanga Technical University (BTU)',
'Cape Coast Technical University (CCTU)',
];

const SAMPLE_USERS = [
{
fullName: 'John Doe',
email: 'john@student.ug.edu.gh',
password: 'Student123!',
phone: '+233501234567',
university: 'University of Ghana (UG)',
level: '300',
hall: 'Legon Hall',
role: 'buyer',
isVerified: 1,
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
role: 'buyer',
isVerified: 1,
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
role: 'buyer',
isVerified: 0,
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
isVerified: 1,
rating: 0,
},
{
fullName: 'Kwame Asante',
email: 'kwame@student.uenr.edu.gh',
password: 'Student123!',
phone: '+233505567890',
university: 'University of Energy and Natural Resources (UENR)',
level: '300',
hall: 'Sunyani Hall',
role: 'buyer',
isVerified: 1,
rating: 4.2,
},
{
fullName: 'Ama Mensah',
email: 'ama@student.uhas.edu.gh',
password: 'Student123!',
phone: '+233506678901',
university: 'University of Health and Allied Sciences (UHAS)',
level: '200',
hall: 'Ho Campus Hall',
role: 'buyer',
isVerified: 1,
rating: 4.0,
},
{
fullName: 'Emmanuel Boakye',
email: 'emmanuel@student.umat.edu.gh',
password: 'Student123!',
phone: '+233507789012',
university: 'University of Mines and Technology (UMaT)',
level: '400',
hall: 'Tarkwa Hall',
role: 'buyer',
isVerified: 0,
rating: 3.8,
},
{
fullName: 'Fatima Ibrahim',
email: 'fatima@student.uds.edu.gh',
password: 'Student123!',
phone: '+233508890123',
university: 'University for Development Studies (UDS)',
level: '300',
hall: 'Tamale Campus',
role: 'buyer',
isVerified: 1,
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
isVerified: 1,
rating: 5.0,
},
];

const SAMPLE_PRODUCTS = [
{
title: 'MacBook Pro 2021 - 16 inch',
description: 'Excellent condition MacBook Pro with M1 Pro chip. 16GB RAM, 512GB SSD. Comes with original charger and box. Selling because I upgraded to the M2 version.',
price: 8500,
category: 'electronics',
condition: 'excellent',
images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=800', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800'],
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
images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800'],
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
images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash', 'momo'],
status: 'active',
},
{
title: 'Electric Kettle - 1.7L',
description: "Fast boiling electric kettle. Used for 1 year but still works perfectly. Selling as I'm moving out of hostel.",
price: 120,
category: 'appliances',
condition: 'good',
images: ['https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800'],
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
images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800'],
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
images: ['https://images.unsplash.com/photo-1571175443880-49e1d58b2c63?w=800'],
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
images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800'],
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
images: ['https://images.unsplash.com/photo-1587145820266-a5951ee86f6e?w=800'],
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
images: ['https://images.unsplash.com/photo-1549298916-b41d94d575f9?w=800'],
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
images: ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800'],
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
images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'],
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
images: ['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash'],
status: 'active',
},
{
title: 'Textbook: Organic Chemistry (Clayden)',
description: 'The go-to organic chemistry textbook. 2nd edition. Few pencil notes in margins, otherwise great condition.',
price: 200,
category: 'textbooks',
condition: 'good',
images: ['https://images.unsplash.com/photo-1532012197267-84d572d396d3?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash', 'momo'],
status: 'active',
},
{
title: 'Portable Blender - USB Rechargeable',
description: 'Compact USB blender great for making smoothies and protein shakes in your hostel. 6-blade design.',
price: 65,
category: 'appliances',
condition: 'new',
images: ['https://images.unsplash.com/photo-1570222094114-d054c8c2534a?w=800'],
deliveryModes: ['bolt', 'inperson'],
paymentModes: ['momo', 'cash'],
status: 'active',
},
{
title: 'Textbook: Data Structures & Algorithms in Python',
description: 'Required for CS 201. No markings inside. Barely used this semester.',
price: 180,
category: 'textbooks',
condition: 'like-new',
images: ['https://images.unsplash.com/photo-1544716306-60d53367f5e0?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash', 'momo'],
status: 'active',
},
{
title: 'Iron Box - Philips 1000W',
description: 'Dry iron with adjustable temperature. Essential for looking sharp for presentations and interviews.',
price: 75,
category: 'appliances',
condition: 'good',
images: ['https://images.unsplash.com/photo-1585771724684-38269d663cd8?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash'],
status: 'active',
},
{
title: 'Adidas Slides - Size 43',
description: 'Comfortable Adidas shower slides. Perfect for hostel life. Worn a couple times.',
price: 120,
category: 'fashion',
condition: 'good',
images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d63?w=800'],
deliveryModes: ['bolt', 'inperson'],
paymentModes: ['cash', 'momo'],
status: 'active',
},
{
title: 'Extension Board - 6-Socket with Surge Protector',
description: '6-outlet power strip with surge protection and USB ports. Long 3m cable. Essential for hostel rooms.',
price: 55,
category: 'hostel-items',
condition: 'good',
images: ['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800'],
deliveryModes: ['bolt', 'inperson'],
paymentModes: ['cash', 'momo'],
status: 'active',
},
{
title: 'Textbook: Financial Accounting (IFRS edition)',
description: 'Required for Level 200 accounting students. IFRS-aligned 4th edition. Clean copy.',
price: 160,
category: 'textbooks',
condition: 'good',
images: ['https://images.unsplash.com/photo-1554224155-8d04cb21cd6e?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash'],
status: 'active',
},
{
title: 'JBL Go 3 Portable Speaker',
description: 'Waterproof Bluetooth speaker. Great sound for its size. Battery lasts about 5 hours.',
price: 250,
category: 'electronics',
condition: 'excellent',
images: ['https://images.unsplash.com/photo-1608043152269-423db454c56d?w=800'],
deliveryModes: ['bolt', 'yango', 'inperson'],
paymentModes: ['momo', 'cash'],
status: 'active',
},
{
title: 'Mattress Topper - Memory Foam 2 inch',
description: 'Makes any hostel mattress comfortable. Single size. Comes with removable washable cover.',
price: 180,
category: 'hostel-items',
condition: 'new',
images: ['https://images.unsplash.com/photo-1631048143973-a7b2875a6c90?w=800'],
deliveryModes: ['bolt', 'inperson'],
paymentModes: ['momo', 'cash'],
status: 'active',
},
{
title: 'Textbook: Introduction to Law in Ghana',
description: 'Core textbook for Law 101. 3rd edition. Light pencil underlining only.',
price: 140,
category: 'textbooks',
condition: 'good',
images: ['https://images.unsplash.com/photo-1589829085413-56dde8ae571b?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash'],
status: 'active',
},
{
title: 'Rice Cooker - 1.8L',
description: 'Perfect for cooking rice, stew, and one-pot meals in the hostel. Non-stick pot.',
price: 150,
category: 'appliances',
condition: 'good',
images: ['https://images.unsplash.com/photo-1585515320310-4e8c2b0e1b1c?w=800'],
deliveryModes: ['bolt', 'inperson'],
paymentModes: ['momo', 'cash'],
status: 'active',
},
{
title: 'Logitech M170 Wireless Mouse',
description: 'Reliable wireless mouse with USB receiver. Great for long study sessions on your laptop.',
price: 45,
category: 'electronics',
condition: 'new',
images: ['https://images.unsplash.com/photo-1527864550417-7fd6fc6a8c5e?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash', 'momo'],
status: 'active',
},
{
title: 'Clothes Drying Rack - Foldable',
description: 'Space-saving foldable drying rack. Holds a full load of laundry. Perfect for hostel rooms.',
price: 70,
category: 'hostel-items',
condition: 'good',
images: ['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800'],
deliveryModes: ['inperson'],
paymentModes: ['cash'],
status: 'active',
},
{
title: 'Backpack - Targus 15.6 inch Laptop Bag',
description: 'Padded laptop compartment fits up to 15.6 inches. Multiple pockets. Water-resistant material.',
price: 180,
category: 'fashion',
condition: 'like-new',
images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
deliveryModes: ['bolt', 'yango', 'inperson'],
paymentModes: ['momo', 'cash'],
status: 'active',
},
];

async function seedDatabase () {
try {
if (process.env.NODE_ENV === 'production') {
console.error('❌ Cannot seed in production environment');
process.exit(1);
}

console.log('🔗 Connecting to SQLite...');
await connectDatabase();
const database = getDb();
console.log('✅ Connected to SQLite');

console.log('🗑️ Clearing existing data...');
database.exec(`
DELETE FROM delivery_status_history;
DELETE FROM order_status_history;
DELETE FROM order_items;
DELETE FROM verification_documents;
DELETE FROM message_deleted_by;
DELETE FROM conversation_participants;
DELETE FROM search_history;
DELETE FROM activity_logs;
DELETE FROM wishlists;
DELETE FROM notifications;
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM deliveries;
DELETE FROM payments;
DELETE FROM reviews;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM student_verifications;
DELETE FROM users;
`);
console.log('✅ Data cleared');

console.log('👤 Creating sample users...');
const createdUsers = [];
const insertUser = database.prepare(`
INSERT INTO users (id, fullName, email, phone, university, level, hall, password, role, isVerified, rating, isActive, isSuspended)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
`);

for (const userData of SAMPLE_USERS) {
const hashedPassword = await bcrypt.hash(userData.password, 10);
const id = generateId();
insertUser.run(id, userData.fullName, userData.email, userData.phone, userData.university, userData.level, userData.hall, hashedPassword, userData.role, userData.isVerified, userData.rating);
createdUsers.push({ id, ...userData });
console.log(` ✅ Created: ${userData.fullName} (${userData.role})`);
}

console.log('📦 Creating sample products...');
const sellers = createdUsers.filter(u => u.role === 'buyer' && u.isVerified);
if (sellers.length === 0) {
console.log('⚠️ No verified buyer users found to assign as sellers, using all users');
sellers.push(...createdUsers);
}
const insertProduct = database.prepare(`
INSERT INTO products (id, title, description, price, currency, category, condition, images, seller, sellerName, sellerRating, university, deliveryModes, paymentModes, status)
VALUES (?, ?, ?, ?, 'GHS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < SAMPLE_PRODUCTS.length; i++) {
const productData = SAMPLE_PRODUCTS[i];
const seller = sellers[i % sellers.length];
const id = generateId();
insertProduct.run(
id, productData.title, productData.description, productData.price,
productData.category, productData.condition,
JSON.stringify(productData.images), seller.id, seller.fullName, seller.rating, seller.university,
JSON.stringify(productData.deliveryModes), JSON.stringify(productData.paymentModes), productData.status,
);
console.log(` ✅ Created: ${productData.title} (${productData.price} GHS)`);
}

console.log('\n🎉 Database seeded successfully!');
console.log('\n📋 Test Accounts:');
console.log(' Admin: admin@unihub.local / Admin123!');
console.log(' Seller: john@student.ug.edu.gh / Student123!');
console.log(' Buyer: sarah@student.upsa.edu.gh / Student123!');

} catch (error) {
console.error('❌ Seeding failed:', error);
process.exit(1);
}
}

if (require.main === module) {
seedDatabase();
}

module.exports = { seedDatabase, SAMPLE_USERS, SAMPLE_PRODUCTS };
