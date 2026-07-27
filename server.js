const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect('mongodb://127.0.0.1:27017/happycart')
    .then(() => console.log("Database Connected Successfully!"))
    .catch(err => console.error("Database Connection Failed:", err));

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    address: { type: String, default: '' },
    happyPoints: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    name: String, price: Number, category: String, image: String, isVeg: Boolean,
    rating: { type: Number, default: 4.5 },
    reviews: { type: Number, default: Math.floor(Math.random() * 500) + 10 }
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    customerDetails: Object, items: Array, subtotal: Number, discount: Number, totalAmount: Number, paymentMethod: String, status: String
});
const Order = mongoose.model('Order', orderSchema);

const PROMOS = { 'HAPPY10': 10, 'SUPER20': 20 };

io.on('connection', (socket) => console.log('Real-time server connected.'));

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (await User.findOne({ username })) return res.status(400).json({ error: 'Username already exists!' });
        const newUser = new User({ username, password, role, happyPoints: 50 });
        await newUser.save();
        res.json({ message: `${role} registered! You can now log in.` });
    } catch (error) { res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const user = await User.findOne({ username, password, role });
        if (!user) return res.status(400).json({ error: 'Invalid credentials!' });
        res.json({ message: 'Login successful!', username: user.username, role: user.role });
    } catch (error) { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/user/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    res.json(user);
});

app.patch('/api/user/:username', async (req, res) => {
    await User.findOneAndUpdate({ username: req.params.username }, req.body);
    res.json({ message: 'Profile updated!' });
});

app.post('/api/promo', (req, res) => {
    const { code } = req.body;
    if (PROMOS[code]) res.json({ discount: PROMOS[code] });
    else res.status(400).json({ error: 'Invalid Promo Code' });
});

app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.post('/api/products', async (req, res) => {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ message: 'Added!', product: newProduct });
});
app.delete('/api/products/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted!' });
});

app.get('/api/orders', async (req, res) => res.json(await Order.find().sort({ _id: -1 })));
app.get('/api/orders/user/:username', async (req, res) => res.json(await Order.find({ "customerDetails.name": req.params.username }).sort({ _id: -1 })));

app.post('/api/orders', async (req, res) => {
    const newOrder = new Order(req.body);
    await newOrder.save();

    const user = await User.findOne({ username: req.body.customerDetails.name });
    if (user) {
        if (req.body.pointsUsed) user.happyPoints -= req.body.pointsUsed;
        user.happyPoints += Math.floor(req.body.totalAmount * 10);
        await user.save();
    }

    io.emit('newOrderAdmin', newOrder);
    res.json({ message: 'Order Confirmed!', orderId: newOrder._id });
});

app.patch('/api/orders/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    io.emit('orderStatusUpdated', order);
    res.json({ message: 'Status updated' });
});

server.listen(3000, () => console.log('Server running on port 3000'));