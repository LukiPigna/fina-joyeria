import { getCart, clearCart, formatPrice } from './cart.js'

// ⚠️ Reemplazá este número con el de WhatsApp de la dueña (código de país sin +)
const WHATSAPP_NUMBER = '5492241000000'

let selectedPayment = null
let selectedDelivery = null

const paymentLabels = {
  transferencia: 'Transferencia Bancaria (10% off)',
  efectivo: 'Efectivo'
}
const deliveryLabels = {
  envio: 'Envío a Domicilio',
  retiro: 'Retiro en Taller (Chascomús)',
  rapida: 'Entrega Rápida CABA (48-72hs)'
}

window.selectPayment = (type) => {
  selectedPayment = type
  document.querySelectorAll('.payment-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.payment === type)
  )
  renderTotal()
}

window.selectDelivery = (type) => {
  selectedDelivery = type
  document.querySelectorAll('.delivery-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.delivery === type)
  )
}

function getDiscount() {
  return selectedPayment === 'transferencia' ? 0.1 : 0
}

function renderTotal() {
  const cart = getCart()
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const total = subtotal * (1 - getDiscount())
  const el = document.getElementById('order-total')
  if (el) el.textContent = formatPrice(total) + (getDiscount() ? ' (10% desc.)' : '')
}

function renderOrderItems() {
  const cart = getCart()
  const container = document.getElementById('order-items')
  if (!container) return

  if (!cart.length) {
    container.innerHTML = '<p style="color:#888;font-size:14px;">Carrito vacío</p>'
    document.getElementById('order-total').textContent = '$0'
    return
  }

  container.innerHTML = cart.map(item => `
    <div class="order-item">
      <div class="order-item-info">
        <div class="order-item-name">${item.name}</div>
        <div class="order-item-details">
          ${item.material ? item.material.charAt(0).toUpperCase() + item.material.slice(1) : ''}
          ${item.size ? `· Talle ${item.size}` : ''}
          · x${item.quantity}
        </div>
      </div>
      <div class="order-item-price">${formatPrice(item.price * item.quantity)}</div>
    </div>
  `).join('')

  renderTotal()
}

window.confirmOrder = () => {
  if (!selectedPayment) { alert('Por favor seleccioná una forma de pago'); return }
  if (!selectedDelivery) { alert('Por favor seleccioná una forma de entrega'); return }

  const cart = getCart()
  if (!cart.length) { alert('Tu carrito está vacío'); return }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const total = subtotal * (1 - getDiscount())

  const itemsText = cart.map(i =>
    `• ${i.name} (${i.material || ''}, talle ${i.size || '-'}) x${i.quantity} = ${formatPrice(i.price * i.quantity)}`
  ).join('\n')

  const message = encodeURIComponent(
    `¡Hola FINA! Quiero hacer un pedido 🛍️\n\n` +
    `*Productos:*\n${itemsText}\n\n` +
    `*Total:* ${formatPrice(total)}${getDiscount() ? ' (con 10% de descuento)' : ''}\n` +
    `*Pago:* ${paymentLabels[selectedPayment]}\n` +
    `*Entrega:* ${deliveryLabels[selectedDelivery]}`
  )

  clearCart()
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
}

renderOrderItems()
