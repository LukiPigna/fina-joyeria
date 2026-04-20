export function getCart() {
  return JSON.parse(localStorage.getItem('fina_cart') || '[]')
}

export function saveCart(cart) {
  localStorage.setItem('fina_cart', JSON.stringify(cart))
  updateCartCount()
}

export function addToCart(item) {
  const cart = getCart()
  const idx = cart.findIndex(
    i => i.id === item.id && i.material === item.material && i.size === item.size
  )
  if (idx >= 0) {
    cart[idx].quantity += 1
  } else {
    cart.push({ ...item, quantity: 1 })
  }
  saveCart(cart)
}

export function removeFromCart(index) {
  const cart = getCart()
  cart.splice(index, 1)
  saveCart(cart)
}

export function clearCart() {
  localStorage.removeItem('fina_cart')
  updateCartCount()
}

export function updateCartCount() {
  const cart = getCart()
  const total = cart.reduce((sum, i) => sum + i.quantity, 0)
  const el = document.getElementById('cart-count')
  if (el) el.textContent = total
}

export function formatPrice(n) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export function renderCartItems() {
  const cart = getCart()
  const container = document.getElementById('cart-items')
  const totalEl = document.getElementById('cart-total')
  if (!container) return

  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">Tu carrito está vacío</p>'
    if (totalEl) totalEl.textContent = '$0'
    return
  }

  container.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <img src="${item.image || ''}" alt="${item.name}" onerror="this.style.display='none'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-details">${capitalize(item.material)} · Talle ${item.size || '-'} · x${item.quantity}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
      </div>
      <button class="cart-item-remove" onclick="window._removeFromCart(${i})">×</button>
    </div>
  `).join('')

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  if (totalEl) totalEl.textContent = formatPrice(total)
}

const MATERIAL_LABEL = { bronce: 'Bronce', plata: 'Alpaca' }

function capitalize(str) {
  if (!str) return ''
  return MATERIAL_LABEL[str] || (str.charAt(0).toUpperCase() + str.slice(1))
}

export function initCart() {
  updateCartCount()
  renderCartItems()
  window._removeFromCart = (index) => {
    removeFromCart(index)
    renderCartItems()
  }
}

export function toggleCart() {
  const sidebar = document.getElementById('cart-sidebar')
  const overlay = document.getElementById('cart-overlay')
  if (!sidebar) return
  const isOpen = sidebar.classList.toggle('open')
  overlay.classList.toggle('open')
  if (isOpen) renderCartItems()
}

export function initSlideButton() {
  const btn = document.getElementById('slide-button')
  if (!btn) return
  const wrapper = btn.closest('.slide-button-wrapper')
  const bg = wrapper?.querySelector('.slide-button-bg')
  if (!wrapper || !bg) return

  let startX = 0
  let currentX = 0
  let isDragging = false

  function maxSlide() {
    return wrapper.offsetWidth - btn.offsetWidth
  }

  function onStart(e) {
    isDragging = true
    startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
    btn.style.transition = 'none'
    bg.style.transition = 'none'
  }

  function onMove(e) {
    if (!isDragging) return
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
    currentX = Math.max(0, Math.min(clientX - startX, maxSlide()))
    btn.style.transform = `translateX(${currentX}px)`
    bg.style.width = (56 + currentX) + 'px'
  }

  function onEnd() {
    if (!isDragging) return
    isDragging = false
    if (currentX >= maxSlide() * 0.85) {
      btn.style.transform = `translateX(${maxSlide()}px)`
      bg.style.width = '100%'
      setTimeout(() => { window.location.href = 'pago.html' }, 300)
    } else {
      btn.style.transition = 'transform 0.3s'
      bg.style.transition = 'width 0.3s'
      btn.style.transform = 'translateX(0)'
      bg.style.width = '56px'
      currentX = 0
    }
  }

  btn.addEventListener('mousedown', onStart)
  btn.addEventListener('touchstart', onStart, { passive: true })
  document.addEventListener('mousemove', onMove)
  document.addEventListener('touchmove', onMove, { passive: true })
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchend', onEnd)
}
