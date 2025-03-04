const loginForm = document.getElementById('loginForm');
const sellerLogin = document.getElementById('sellerLogin');
const sellerDashboard = document.getElementById('sellerDashboard');
const loginError = document.getElementById('loginError');
const tabContent = document.getElementById('tabContent');

document.getElementById('tabProduk').addEventListener('click', () => setActiveTab('produk'));
document.getElementById('tabPesanan').addEventListener('click', () => setActiveTab('pesanan'));
document.getElementById('tabPenghasilan').addEventListener('click', () => setActiveTab('penghasilan'));

// Handle login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  fetch('/api/seller/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      loginError.style.display = 'block';
    } else {
      sellerLogin.classList.add('hidden');
      sellerDashboard.classList.remove('hidden');
      loadProduk();
    }
  });
});

function setActiveTab(tabName) {
  document.querySelectorAll('.tab-menu button').forEach(btn => btn.classList.remove('active'));
  if (tabName === 'produk') {
    document.getElementById('tabProduk').classList.add('active');
    loadProduk();
  } else if (tabName === 'pesanan') {
    document.getElementById('tabPesanan').classList.add('active');
    loadPesanan();
  } else if (tabName === 'penghasilan') {
    document.getElementById('tabPenghasilan').classList.add('active');
    loadPenghasilan();
  }
}

// Load Produk
function loadProduk() {
  fetch('/api/seller/products')
    .then(res => res.json())
    .then(data => {
      let html = `<h2>Menu Produk</h2>
      <button onclick="showAddProductForm()">Tambah Produk</button>
      <ul>`;
      data.forEach(p => {
        html += `
          <li>
            <strong>${p.name}</strong> (Rp ${p.price}) - Stok: ${p.stock}
            <br><img src="${p.image}" alt="${p.name}" style="max-width:100px;"><br>
            <button onclick="showEditProductForm(${p.id})">Edit</button>
            <button onclick="deleteProduct(${p.id})">Hapus</button>
          </li>
        `;
      });
      html += `</ul>`;
      tabContent.innerHTML = html;
    });
}

// Form Tambah Produk
function showAddProductForm() {
  let html = `
    <h3>Tambah Produk Baru</h3>
    <form id="addProductForm" enctype="multipart/form-data">
      <input type="text" name="name" placeholder="Nama Produk" required><br>
      <input type="number" name="price" placeholder="Harga" required><br>
      <textarea name="description" placeholder="Deskripsi"></textarea><br>
      <input type="text" name="ingredients" placeholder="Bahan" required><br>
      <input type="number" name="stock" placeholder="Stok" required><br>
      <label>Gambar Produk:</label><br>
      <input type="file" name="image" accept="image/*"><br><br>
      <button type="submit">Simpan</button>
    </form>
  `;
  tabContent.innerHTML = html;

  document.getElementById('addProductForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    fetch('/api/seller/products', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadProduk();
    });
  });
}

// Form Edit Produk
function showEditProductForm(productId) {
  fetch('/api/seller/products')
    .then(res => res.json())
    .then(products => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      let html = `
        <h3>Edit Produk</h3>
        <form id="editProductForm" enctype="multipart/form-data">
          <input type="text" name="name" value="${product.name}" required><br>
          <input type="number" name="price" value="${product.price}" required><br>
          <textarea name="description">${product.description}</textarea><br>
          <input type="text" name="ingredients" value="${product.ingredients}" required><br>
          <input type="number" name="stock" value="${product.stock}" required><br>
          <label>Gambar Produk (kosongkan jika tidak ingin ganti):</label><br>
          <input type="file" name="image" accept="image/*"><br><br>
          <button type="submit">Update</button>
        </form>
      `;
      tabContent.innerHTML = html;

      document.getElementById('editProductForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        fetch(`/api/seller/products/${productId}`, {
          method: 'PUT',
          body: formData
        })
        .then(res => res.json())
        .then(data => {
          alert(data.message);
          loadProduk();
        });
      });
    });
}

// Hapus produk
function deleteProduct(productId) {
  if (!confirm("Yakin ingin menghapus produk ini?")) return;
  fetch(`/api/seller/products/${productId}`, {
    method: 'DELETE'
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message || data.error);
    loadProduk();
  });
}

// Load Pesanan
function loadPesanan() {
  fetch('/api/seller/orders')
    .then(res => res.json())
    .then(data => {
      let html = `<h2>Menu Pesanan</h2>`;
      if (!data.length) {
        html += `<p>Tidak ada pesanan.</p>`;
      } else {
        html += `<ul>`;
        data.forEach(order => {
          html += `
            <li>
              <strong>ID: ${order.id}</strong> - ${order.buyerName} - Status: ${order.status}
              <br>Jumlah Item: ${order.items.reduce((sum, i) => sum + i.quantity, 0)}
              <br>
              <button onclick="updateOrderStatus(${order.id}, 'rejected')">Tolak</button>
              <button onclick="updateOrderStatus(${order.id}, 'preparing')">Sedang Dibuat</button>
              <button onclick="updateOrderStatus(${order.id}, 'ready')">Siap Diambil</button>
            </li>
          `;
        });
        html += `</ul>`;
      }
      tabContent.innerHTML = html;
    });
}

function updateOrderStatus(orderId, status) {
  fetch(`/api/seller/orders/${orderId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    loadPesanan();
  });
}

/* ========== BAGIAN INCOME MENARIK ========== */
function loadPenghasilan() {
  fetch('/api/seller/income')
    .then(res => res.json())
    .then(data => {
      const { incomeData, totalIncome } = data;

      // Mulai membangun HTML tampilan
      let html = `
        <h2 style="text-align:center; margin-bottom:20px;">PEMASUKAN</h2>
        <div class="income-list">
      `;

      // incomeData misal:
      // {
      //   "Batagor": { sold: 10, income: 100000, price: 10000 },
      //   "Wajik": { sold: 5, income: 25000, price: 5000 }
      // }
      for (const [productName, detail] of Object.entries(incomeData)) {
        html += `
          <div class="income-item">
            <h3>${productName}</h3>
            <p>Produk terjual : ${detail.sold} pcs</p>
            <p>Harga/produk : Rp.${detail.price?.toLocaleString()}</p>
            <p>Total pemasukan : Rp.${detail.income?.toLocaleString()}</p>
          </div>
        `;
      }

      html += `
        </div>
        <h3 style="text-align:right; margin-top:20px;">
          TOTAL KESELURUHAN : Rp.${totalIncome?.toLocaleString()}
        </h3>
      `;

      tabContent.innerHTML = html;
    });
}