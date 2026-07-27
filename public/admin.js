const socket = io('http://localhost:3000');
const currentAdmin = localStorage.getItem('currentUser');
document.getElementById('adminGreeting').innerText = `Manager: ${currentAdmin}`;
let revChartInstance = null;

const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    themeToggle.innerText = isDark ? '☀️' : '🌙';
});
if (localStorage.getItem('darkMode') === 'enabled') themeToggle.innerText = '☀️';

document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });

socket.on('newOrderAdmin', (order) => {
    const toast = document.getElementById('toast');
    toast.innerText = `🔔 New Order Placed: #${order._id.slice(-5).toUpperCase()}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 5000);
    fetchOrders();
});

async function fetchInventory() {
    const res = await fetch('http://localhost:3000/api/products');
    const items = await res.json();
    const list = document.getElementById('inventoryList');
    list.innerHTML = items.map(item => `
        <div class="inventory-item">
            <div><strong>${item.isVeg ? '🟩' : '🟥'} ${item.name}</strong> - ₹${item.price.toFixed(2)}<br><small>${item.category}</small></div>
            <button class="delete-btn" onclick="deleteProduct('${item._id}')">Delete</button>
        </div>`).join('');
}

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newProduct = {
        name: document.getElementById('prodName').value, price: parseFloat(document.getElementById('prodPrice').value),
        category: document.getElementById('prodCategory').value, image: document.getElementById('prodImage').value,
        isVeg: document.getElementById('prodIsVeg').checked, rating: 5.0, reviews: 0
    };
    await fetch('http://localhost:3000/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProduct) });
    document.getElementById('addProductForm').reset();
    fetchInventory();
});

async function deleteProduct(id) {
    if (confirm('Remove this item?')) { await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' }); fetchInventory(); }
}

async function fetchOrders() {
    const res = await fetch('http://localhost:3000/api/orders');
    const orders = await res.json();

    let rev = 0, pending = 0, delivered = 0;
    orders.forEach(o => { rev += o.totalAmount; if (o.status === 'Delivered') delivered++; else pending++; });

    document.getElementById('statRev').innerText = `₹${rev.toFixed(2)}`;
    document.getElementById('statOrders').innerText = orders.length;
    document.getElementById('statPending').innerText = pending;
    document.getElementById('statDelivered').innerText = delivered;

    updateChart(orders);

    const orderList = document.getElementById('orderList');
    orderList.innerHTML = orders.map(order => {
        const isDelivered = order.status === 'Delivered';
        const topColor = isDelivered ? '#4CAF50' : '#FFC72C';
        let itemsHTML = order.items.map(item => `<div style="display:flex; justify-content:space-between; border-bottom:1px dashed var(--border-color);"><span>${item.quantity}x ${item.name}</span><span>₹${(item.price * item.quantity).toFixed(2)}</span></div>`).join('');

        return `<div style="background:var(--card-bg); border-top:5px solid ${topColor}; padding:15px; box-shadow:0 2px 4px rgba(0,0,0,0.1); opacity:${isDelivered ? '0.6' : '1'}; border-radius:5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h3 style="color:${isDelivered ? '#4CAF50' : '#DA291C'}; margin:0;">#${order._id.slice(-5).toUpperCase()}</h3>
                <span style="background:${isDelivered ? '#4CAF50' : '#e0e0e0'}; color:${isDelivered ? 'white' : 'black'}; padding:3px 8px; border-radius:10px; font-size:12px;">${order.status}</span>
            </div>
            <div style="background:var(--bg-color); padding:10px; border-radius:5px; font-size:14px; color:var(--text-color);">
                <p><strong>Name:</strong> ${order.customerDetails.name}</p>
                <p><strong>Mobile:</strong> ${order.customerDetails.mobile}</p>
                <p><strong>Address:</strong> ${order.customerDetails.address}</p>
                <p style="color:#DA291C;">Method: ${order.paymentMethod}</p>
            </div>
            <div style="margin: 15px 0; color:var(--text-color);">${itemsHTML}</div>
            ${order.discount > 0 ? `<p style="color:green; text-align:right;">Discount: -₹${order.discount.toFixed(2)}</p>` : ''}
            <h3 style="text-align:right; color:var(--text-color);">Total: ₹${order.totalAmount.toFixed(2)}</h3>
            ${!isDelivered ? `<button onclick="updateOrderStatus('${order._id}', 'Delivered')" style="width:100%; margin-top:15px; padding:12px; background:#4CAF50; color:white; border:none; border-radius:5px; cursor:pointer;">Mark Delivered</button>` : ''}
        </div>`;
    }).join('');
}

function updateChart(orders) {
    const recentOrders = orders.slice(0, 10).reverse();
    const labels = recentOrders.map(o => `#${o._id.slice(-4).toUpperCase()}`);
    const data = recentOrders.map(o => o.totalAmount);

    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revChartInstance) revChartInstance.destroy();
    revChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Revenue (₹)', data: data, backgroundColor: '#DA291C', borderRadius: 5 }] },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

async function updateOrderStatus(id, status) {
    await fetch(`http://localhost:3000/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    fetchOrders();
}

fetchInventory(); fetchOrders();