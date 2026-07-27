const socket = io('http://localhost:3000');
const currentUser = localStorage.getItem('currentUser');
document.getElementById('userGreeting').innerText = `Hello, ${currentUser}!`;

let cart = [];
let products = [];
let currentCategory = 'All';
let discountApplied = 0;
let pointsDiscountApplied = 0;
let baseTotal = 0;
let userAvailablePoints = 0;

const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    themeToggle.innerText = isDark ? '☀️' : '🌙';
});
if (localStorage.getItem('darkMode') === 'enabled') themeToggle.innerText = '☀️';

socket.on('orderStatusUpdated', (order) => {
    if (order.customerDetails.name === currentUser) {
        const toast = document.getElementById('toast');
        toast.innerText = `🚚 Order #${order._id.slice(-5).toUpperCase()} is now ${order.status}!`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 5000);
    }
});

const categoryGrid = document.getElementById('categoryGrid');
const productGrid = document.getElementById('productGrid');
const cartItemsContainer = document.getElementById('cartItems');
const totalPriceEl = document.getElementById('totalPrice');

document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });

async function loadUserData() {
    const res = await fetch(`http://localhost:3000/api/user/${currentUser}`);
    const user = await res.json();
    userAvailablePoints = user.happyPoints || 0;
    document.getElementById('happyPointsDisplay').innerText = userAvailablePoints;
    document.getElementById('checkoutMaxPoints').innerText = userAvailablePoints;
    document.getElementById('profEmail').value = user.email || '';
    document.getElementById('profMobile').value = user.mobile || '';
    document.getElementById('profAddress').value = user.address || '';
    
    document.getElementById('custEmail').value = user.email || '';
    document.getElementById('custMobile').value = user.mobile || '';
    document.getElementById('custAddress').value = user.address || '';
}

document.getElementById('profileBtn').addEventListener('click', () => document.getElementById('profileModal').classList.remove('hidden'));
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const data = { email: document.getElementById('profEmail').value, mobile: document.getElementById('profMobile').value, address: document.getElementById('profAddress').value };
    await fetch(`http://localhost:3000/api/user/${currentUser}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    document.getElementById('profileModal').classList.add('hidden');
    loadUserData();
    alert("Profile Saved!");
});

function renderCategories() {
    const categoriesData = ["All", "Fruits & Vegetables", "Dairy, Bread & Eggs", "Snacks & Munchies", "Chicken, Meat & Fish", "Sweet Tooth", "Atta, Rice & Dal", "Cold Drinks & Juices"];
    categoriesData.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'category-item';
        const imgUrl = cat === "All" ? "https://placehold.co/80x80/DA291C/FFFFFF?text=All" : `https://placehold.co/80x80/EEF4FF/333333?text=${cat.split(' ')[0]}`;
        item.innerHTML = `<div class="category-image-box"><img src="${imgUrl}" alt="${cat}"></div><span>${cat}</span>`;
        item.addEventListener('click', () => { currentCategory = cat; applyFilters(); });
        categoryGrid.appendChild(item);
    });
}

async function fetchProducts() {
    const res = await fetch('http://localhost:3000/api/products');
    products = await res.json();
    applyFilters();
}

function applyFilters() {
    let filtered = products;
    const term = document.getElementById('searchBar').value.toLowerCase();
    const vegOnly = document.getElementById('vegFilter').checked;
    const sort = document.getElementById('sortDropdown').value;

    if (currentCategory !== 'All') filtered = filtered.filter(p => p.category === currentCategory);
    if (vegOnly) filtered = filtered.filter(p => p.isVeg);
    if (term) filtered = filtered.filter(p => p.name.toLowerCase().includes(term));

    if (sort === 'low') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'high') filtered.sort((a, b) => b.price - a.price);
    if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);

    renderProducts(filtered);
}

document.getElementById('searchBar').addEventListener('input', applyFilters);
document.getElementById('vegFilter').addEventListener('change', applyFilters);
document.getElementById('sortDropdown').addEventListener('change', applyFilters);

function renderProducts(items) {
    productGrid.innerHTML = '';
    items.forEach(product => {
        const dot = product.isVeg ? '🟩' : '🟥';
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `<img src="${product.image || 'https://placehold.co/150x150/eeeeee/333333?text=Item'}">
            <h3>${dot} ${product.name}</h3>
            <div style="color: #FFC72C; font-size: 14px; margin: 5px 0;">⭐ ${product.rating || 4.5} <span style="color:var(--text-color); font-size:12px;">(${product.reviews || 0})</span></div>
            <p>₹${product.price.toFixed(2)}</p>
            <button class="add-btn" onclick="addToCart('${product._id}', '${product.name}', ${product.price})">Add to Tray</button>`;
        productGrid.appendChild(card);
    });
}

function addToCart(id, name, price) {
    const existing = cart.find(i => i.id === id);
    if (existing) existing.quantity += 1; else cart.push({ id, name, price, quantity: 1 });
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cartBtn').innerText = `Tray (${cart.reduce((s, i) => s + i.quantity, 0)})`;
    cartItemsContainer.innerHTML = '';
    baseTotal = 0;
    cart.forEach(item => {
        baseTotal += item.price * item.quantity;
        cartItemsContainer.innerHTML += `<div class="cart-item"><span>${item.name} x${item.quantity}</span><span>₹${(item.price * item.quantity).toFixed(2)}</span></div>`;
    });
    totalPriceEl.innerText = baseTotal.toFixed(2);
}

document.getElementById('cartBtn').addEventListener('click', () => document.getElementById('cartSidebar').classList.toggle('hidden'));

document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (cart.length === 0) return;
    discountApplied = 0; pointsDiscountApplied = 0; 
    document.getElementById('usePointsBtn').innerText = "Redeem";
    document.getElementById('usePointsBtn').disabled = false;
    updateCheckoutSummary();
    document.getElementById('cartSidebar').classList.add('hidden');
    document.getElementById('checkoutModal').classList.remove('hidden');
});

document.getElementById('applyPromoBtn').addEventListener('click', async () => {
    const code = document.getElementById('promoInput').value.toUpperCase();
    const res = await fetch('http://localhost:3000/api/promo', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({code})});
    const result = await res.json();
    if(res.ok) { discountApplied = (baseTotal * result.discount) / 100; updateCheckoutSummary(); } 
    else alert(result.error);
});

document.getElementById('usePointsBtn').addEventListener('click', () => {
    if (userAvailablePoints >= 100) { 
        const maxUsable = Math.min(userAvailablePoints, Math.floor(baseTotal * 100)); 
        pointsDiscountApplied = maxUsable / 100;
        document.getElementById('usePointsBtn').innerText = "Applied!";
        document.getElementById('usePointsBtn').disabled = true;
        updateCheckoutSummary();
    } else { alert("You need at least 100 points to redeem!"); }
});

function updateCheckoutSummary() {
    let finalTotal = baseTotal - discountApplied - pointsDiscountApplied;
    document.getElementById('modalOrderSummary').innerHTML = `
        <p>Subtotal: ₹${baseTotal.toFixed(2)}</p>
        ${discountApplied > 0 ? `<p style="color:green;">Promo Discount: -₹${discountApplied.toFixed(2)}</p>` : ''}
        ${pointsDiscountApplied > 0 ? `<p style="color:#FFC72C;">Points Discount: -₹${pointsDiscountApplied.toFixed(2)}</p>` : ''}
        <h3 style="margin-top:10px;">Final Total: ₹${finalTotal.toFixed(2)}</h3>
        <p style="font-size:12px; color:gray; margin-top:5px;">You will earn ${Math.floor(finalTotal * 10)} points on this order!</p>
    `;
}

document.getElementById('proceedPaymentBtn').addEventListener('click', () => {
    const email = document.getElementById('custEmail').value;
    const mobile = document.getElementById('custMobile').value;
    const address = document.getElementById('custAddress').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (!email || !mobile || !address || !paymentMethod) return alert("Fill all details!");

    const finalTotal = baseTotal - discountApplied - pointsDiscountApplied;
    const orderData = {
        customerDetails: { name: currentUser, email, mobile, address },
        items: cart, subtotal: baseTotal, discount: (discountApplied + pointsDiscountApplied), totalAmount: finalTotal, paymentMethod, pointsUsed: (pointsDiscountApplied * 100), status: "Processing"
    };

    document.getElementById('checkoutModal').classList.add('hidden');
    if (paymentMethod === "Cash on Delivery") submitOrder(orderData);
    else {
        document.getElementById('paymentGateway').classList.remove('hidden');
        setTimeout(() => document.getElementById('gatewayStatus').innerText = "Payment Successful!", 3000);
        setTimeout(() => { document.getElementById('paymentGateway').classList.add('hidden'); submitOrder(orderData); }, 4000);
    }
});

function fireConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#DA291C', '#FFC72C', '#4CAF50', '#2196F3'];
    for(let i=0; i<100; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti-piece';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 3 + 2) + 's';
        conf.style.animationDelay = Math.random() * 2 + 's';
        container.appendChild(conf);
    }
    setTimeout(() => container.innerHTML = '', 6000);
}

async function submitOrder(orderData) {
    const res = await fetch('http://localhost:3000/api/orders', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(orderData) });
    const result = await res.json();
    fireConfetti(); 
    
    document.getElementById('checkoutModal').innerHTML = `<div class="modal-content" style="position:relative; z-index:9999;"><h2 style="color:green;">🎉 Order Placed Successfully!</h2><p>Order #${result.orderId.slice(-5).toUpperCase()}</p><button class="confirm-btn" onclick="location.reload()" style="width:100%; margin-top:15px;">Continue Shopping</button></div>`;
    document.getElementById('checkoutModal').classList.remove('hidden');
}

document.getElementById('myOrdersBtn').addEventListener('click', async () => {
    const res = await fetch(`http://localhost:3000/api/orders/user/${currentUser}`);
    const orders = await res.json();
    const list = document.getElementById('myOrdersList');
    list.innerHTML = orders.length === 0 ? "<p>No orders yet!</p>" : orders.map(o => `
        <div style="border:1px solid var(--border-color); padding:15px; margin-bottom:10px; border-radius:5px; text-align:left;">
            <div style="display:flex; justify-content:space-between;">
                <strong>Order #${o._id.slice(-5).toUpperCase()}</strong>
                <span style="background:${o.status === 'Delivered' ? 'green' : '#DA291C'}; color:white; padding:3px 8px; border-radius:5px;">${o.status}</span>
            </div>
            <p style="margin-top:5px; font-size:14px;">Total: ₹${o.totalAmount.toFixed(2)} | ${o.paymentMethod}</p>
        </div>`).join('');
    document.getElementById('myOrdersModal').classList.remove('hidden');
});

loadUserData(); renderCategories(); fetchProducts();