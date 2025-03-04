let products = [];
let cart = [];
let lastOrderId = null;

// "Akun" pembeli sementara (deviceId) disimpan di localStorage
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
  deviceId = 'dev-' + Date.now() + '-' + Math.floor(Math.random()*1000);
  localStorage.setItem('deviceId', deviceId);
}

function fetchProducts() {
  fetch('/api/products')
    .then(res => res.json())
    .then(data => {
      products = data;
      renderProducts();
    });
}

function renderProducts() {
  const list = document.getElementById('product-list');
  list.innerHTML = '';
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="info">
        <h3>${product.name}</h3>
        <p>Harga: Rp ${product.price}</p>
        <p>${product.description}</p>
        <p>Stok: ${product.stock}</p>
      </div>
    `;
    const btn = document.createElement('button');
    if (product.stock > 0) {
      btn.textContent = 'Add to Cart';
      btn.onclick = () => addToCart(product.id, false);
    } else {
      btn.textContent = 'Pre-order';
      btn.onclick = () => addToCart(product.id, true);
    }
    card.querySelector('.info').appendChild(btn);
    list.appendChild(card);
  });
}

function addToCart(productId, preOrder) {
  const item = cart.find(i => i.productId === productId && i.preOrder === preOrder);
  if (item) {
    item.quantity++;
  } else {
    cart.push({ productId, quantity: 1, preOrder });
  }
  renderCart();
}

function renderCart() {
  const cartList = document.getElementById('cart-items');
  cartList.innerHTML = '';
  cart.forEach((item, idx) => {
    const product = products.find(p => p.id === item.productId);
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${product.name}</strong> - Rp ${product.price} 
      ${item.preOrder ? '(Pre-order)' : ''}
      <div class="quantity-controls">
        <button onclick="decrementQuantity(${idx})">-</button>
        <span>${item.quantity}</span>
        <button onclick="incrementQuantity(${idx})">+</button>
      </div>
    `;
    cartList.appendChild(li);
  });
}

function incrementQuantity(idx) {
  cart[idx].quantity++;
  renderCart();
}
function decrementQuantity(idx) {
  if (cart[idx].quantity > 1) {
    cart[idx].quantity--;
  } else {
    cart.splice(idx, 1);
  }
  renderCart();
}

// Checkout
document.getElementById('checkout-button').addEventListener('click', () => {
  if (cart.length === 0) {
    alert("Keranjang kosong!");
    return;
  }
  const buyerName = prompt("Masukkan nama Anda:");
  if (!buyerName) return;

  fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerName,
      deviceId,
      items: cart
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert(data.error);
    } else {
      alert(data.message);
      lastOrderId = data.order.id;
      cart = [];
      renderCart();
      fetchProducts();
      fetchMyOrders();
    }
  });
});

// Batalkan pesanan
document.getElementById('cancel-order-button').addEventListener('click', () => {
  if (!lastOrderId) {
    alert("Tidak ada pesanan untuk dibatalkan.");
    return;
  }
  fetch('/api/cancel-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: lastOrderId, deviceId })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message || data.error);
    if (!data.error) {
      lastOrderId = null;
      fetchProducts();
      fetchMyOrders();
    }
  });
});

// Cek status pesanan
function fetchMyOrders() {
  fetch(`/api/my-orders?deviceId=${deviceId}`)
    .then(res => res.json())
    .then(orders => {
      const myOrdersList = document.getElementById('my-orders');
      myOrdersList.innerHTML = '';
      if (!orders.length) {
        myOrdersList.innerHTML = '<li>Tidak ada pesanan.</li>';
        return;
      }
      orders.forEach(o => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>Order ID: ${o.id}</strong><br>
          Atas Nama: ${o.buyerName}<br>
          Status: ${o.status}<br>
          Jumlah Item: ${o.items.reduce((sum, i) => sum + i.quantity, 0)}
        `;
        myOrdersList.appendChild(li);
      });
    });
}
document.getElementById('refresh-status-button').addEventListener('click', () => {
  fetchMyOrders();
});

// Inisialisasi
fetchProducts();
fetchMyOrders();