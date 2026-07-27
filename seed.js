const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/happycart')
    .then(() => console.log("Database Connected Successfully!"))
    .catch(err => console.error("Database Connection Failed:", err));

const productSchema = new mongoose.Schema({ name: String, price: Number, category: String, image: String, isVeg: Boolean, rating: Number, reviews: Number });
const Product = mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({ username: String, password: String, role: String, email: String, mobile: String, address: String, happyPoints: Number });
const User = mongoose.model('User', userSchema);

const seedProducts = [
    { name: "Fresh Bananas (1 Dozen)", price: 120, category: "Fruits & Vegetables", isVeg: true, rating: 4.8, reviews: 342, image: "images/banana.png" },
    { name: "Spinach Bunch", price: 50, category: "Fruits & Vegetables", isVeg: true, rating: 4.5, reviews: 120, image: "images/spinach.jpg" },
    { name: "Red Tomatoes (1 kg)", price: 210, category: "Fruits & Vegetables", isVeg: true, rating: 4.2, reviews: 89, image: "images/tomatoes.jpg" },
    { name: "Harvest Gold Bread", price: 50, category: "Dairy, Bread & Eggs", isVeg: true, rating: 4.6, reviews: 450, image: "images/bread.jpg" },
    { name: "Amul Full Cream Milk", price: 33, category: "Dairy, Bread & Eggs", isVeg: true, rating: 4.9, reviews: 900, image: "images/milk.webp" },
    { name: "Farm Fresh Eggs (30 Pack)", price: 180, category: "Dairy, Bread & Eggs", isVeg: false, rating: 4.7, reviews: 210, image: "images/eggs.webp" },
    { name: "Magic Masala", price: 10, category: "Snacks & Munchies", isVeg: true, rating: 4.9, reviews: 1200, image: "images/masala.jpg" },
    { name: "Fresh Chicken Breast", price: 300, category: "Chicken, Meat & Fish", isVeg: false, rating: 4.4, reviews: 76, image: "images/chicken.webp" },
    { name: "Cadbury Dairy Milk", price: 75, category: "Sweet Tooth", isVeg: true, rating: 4.8, reviews: 654, image: "images/chocolate.jpg" },
    { name: "Coca-Cola (1.5L)", price: 45, category: "Cold Drinks & Juices", isVeg: true, rating: 4.5, reviews: 432, image: "images/cola.jpeg" }
];

const seedUsers = [
    { username: "admin", password: "123", role: "admin", happyPoints: 0 },
    { username: "Arif", password: "123", role: "customer", email: "arif@test.com", mobile: "1234567890", address: "NC-04 Chandigarh University", happyPoints: 200 }
];

async function seedDB() {
    await Product.deleteMany({}); await Product.insertMany(seedProducts);
    await User.deleteMany({}); await User.insertMany(seedUsers);
    console.log("Database Seeded with Local Images! Close this script.");
    mongoose.connection.close();
}
seedDB();