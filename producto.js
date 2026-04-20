import { supabase } from './supabase-client.js'
import { addToCart, initCart, toggleCart, initSlideButton, formatPrice } from './cart.js'

window.toggleCart = toggleCart

let product = null
let selectedMaterial = null
let currentImageIndex = 0

function getPrice(p, material) {
  if (material === 'plata' && p.price_plata) return p.price_plata
  return p.price_bronce || p.price_plata || 0
}

function renderProduct(p) {
  product = p
  document.title = `FINA - ${p.name}`

  document.getElementById('product-code').textContent = p.code || ''
  document.getElementById('product-title').textContent = p.name
  document.getElementById('product-description').textContent = p.description || ''
  document.getElementById('product-installments').textContent = p.installments || ''

  // Materials
  const materials = p.available_materials || ['bronce']
  const sel = document.getElementById('material-selector')
  sel.innerHTML = materials.map(m =>
    `<button class="material-btn${m === materials[0] ? ' active' : ''}" data-material="${m}" onclick="window.selectMaterial('${m}')">
      ${m.charAt(0).toUpperCase() + m.slice(1)}
    </button>`
  ).join('')
  selectedMaterial = materials[0]
  updatePrice()

  // Sizes
  const sizes = p.available_sizes || []
  const sizeSelect = document.getElementById('size-select')
  sizeSelect.innerHTML = '<option value="">Seleccionar talle</option>' +
    sizes.map(s => `<option value="${s}">${s}</option>`).join('')

  // Gallery
  renderGallery(p.images || [])
}

function updatePrice() {
  if (!product) return
  document.getElementById('product-price').textContent = formatPrice(getPrice(product, selectedMaterial))
}

function renderGallery(images) {
  const mainImg = document.getElementById('main-image')
  const thumbContainer = document.getElementById('thumbnails')

  if (!images.length) {
    mainImg.src = ''
    thumbContainer.innerHTML = ''
    return
  }

  currentImageIndex = 0
  mainImg.src = images[0]

  thumbContainer.innerHTML = images.map((img, i) =>
    `<img src="${img}" class="thumb${i === 0 ? ' active' : ''}" onclick="window.setImage(${i})" alt="Foto ${i + 1}">`
  ).join('')
}

window.setImage = (index) => {
  const images = product?.images || []
  if (index < 0 || index >= images.length) return
  currentImageIndex = index
  document.getElementById('main-image').src = images[index]
  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === index))
}

window.prevImage = () => window.setImage(currentImageIndex - 1)
window.nextImage = () => window.setImage(currentImageIndex + 1)

window.selectMaterial = (material) => {
  selectedMaterial = material
  document.querySelectorAll('.material-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.material === material)
  )
  updatePrice()
}

window.addToCartFromDetails = () => {
  if (!product) return
  const size = document.getElementById('size-select').value
  if (!size) {
    alert('Por favor seleccioná un talle')
    return
  }
  addToCart({
    id: product.id,
    name: product.name,
    price: getPrice(product, selectedMaterial),
    material: selectedMaterial,
    size,
    image: product.images?.[0] || ''
  })
  toggleCart()
}

window.openSizeGuide = () => {
  alert(
    'Guía de talles de anillos:\n\n' +
    'Medí la circunferencia de tu dedo con una cinta o hilo:\n\n' +
    'Talle 08 → 4.8 cm\nTalle 10 → 5.0 cm\nTalle 12 → 5.2 cm\n' +
    'Talle 14 → 5.4 cm\nTalle 16 → 5.6 cm\nTalle 18 → 5.8 cm\n' +
    'Talle 20 → 6.0 cm\nTalle 22 → 6.2 cm\nTalle 24 → 6.4 cm'
  )
}

async function handleSubscription(e) {
  e.preventDefault()
  const form = e.target
  const email = form.email.value
  const types = form['notification-types'].value.split(',')

  const { error } = await supabase.from('subscriptions').upsert(
    { email, notification_types: types },
    { onConflict: 'email' }
  )

  if (error) {
    alert('Hubo un error. Por favor intentá de nuevo.')
  } else {
    alert('¡Te suscribiste exitosamente! Te avisaremos cuando haya novedades.')
    form.reset()
  }
}

async function init() {
  initCart()
  initSlideButton()

  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  if (!id) { window.location.href = 'index.html'; return }

  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error || !data) { window.location.href = 'index.html'; return }

  renderProduct(data)
  document.getElementById('email-subscription-form').addEventListener('submit', handleSubscription)
}

init()
