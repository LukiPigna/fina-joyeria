import { supabase } from './supabase-client.js'
import { addToCart, initCart, toggleCart, initSlideButton, formatPrice } from './cart.js'

window.toggleCart = toggleCart

const MATERIAL_LABEL = { bronce: 'Bronce', plata: 'Alpaca' }

let product = null
let selectedMaterial = null
let currentImageIndex = 0

function materialLabel(m) {
  return MATERIAL_LABEL[m] || (m.charAt(0).toUpperCase() + m.slice(1))
}

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
      ${materialLabel(m)}
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

  // Subscription toggles
  renderSubscriptionOptions(materials, sizes)
}

function renderSubscriptionOptions(materials, sizes) {
  const matContainer = document.getElementById('sub-materials')
  const sizeContainer = document.getElementById('sub-sizes')
  if (!matContainer || !sizeContainer) return

  matContainer.innerHTML = materials.map(m =>
    `<button type="button" class="sub-toggle" data-mat="${m}" onclick="window.toggleSubMat('${m}')">${materialLabel(m)}</button>`
  ).join('')

  sizeContainer.innerHTML = sizes.map(s =>
    `<button type="button" class="sub-toggle" data-size="${s}" onclick="window.toggleSubSize('${s}')">${s}</button>`
  ).join('')
}

window.toggleSubMat = (m) => {
  document.querySelector(`.sub-toggle[data-mat="${m}"]`)?.classList.toggle('active')
}
window.toggleSubSize = (s) => {
  document.querySelector(`.sub-toggle[data-size="${s}"]`)?.classList.toggle('active')
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
  if (!size) { alert('Por favor seleccioná un talle'); return }
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

// ── Subscription toggle ──
window.toggleSubForm = () => {
  const wrapper = document.getElementById('sub-form-wrapper')
  const arrow = document.getElementById('sub-arrow')
  const isOpen = wrapper.classList.toggle('open')
  arrow.style.transform = isOpen ? 'rotate(90deg)' : ''
}

// ── Size guide modal ──
window.openSizeGuide = () => {
  document.getElementById('size-guide-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}
window.closeSizeGuide = () => {
  document.getElementById('size-guide-overlay').classList.remove('open')
  document.body.style.overflow = ''
}

// Close with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.closeSizeGuide()
})

// ── Subscription ──
async function handleSubscription(e) {
  e.preventDefault()

  const email = document.getElementById('sub-email').value.trim()
  const selectedMats = Array.from(document.querySelectorAll('.sub-toggle[data-mat].active')).map(b => b.dataset.mat)
  const selectedSizes = Array.from(document.querySelectorAll('.sub-toggle[data-size].active')).map(b => b.dataset.size)

  if (!selectedMats.length && !selectedSizes.length) {
    alert('Seleccioná al menos un material o talle para recibir la notificación.')
    return
  }

  const btn = e.target.querySelector('button[type="submit"]')
  btn.disabled = true
  btn.textContent = 'Guardando...'

  const { error } = await supabase.from('subscriptions').upsert(
    {
      email,
      product_id: product.id,
      desired_materials: selectedMats,
      desired_sizes: selectedSizes,
      notification_types: ['stock_alert']
    },
    { onConflict: 'email,product_id' }
  )

  btn.disabled = false
  btn.textContent = 'Avisarme'

  if (error) {
    alert('Hubo un error. Por favor intentá de nuevo.')
  } else {
    alert('¡Listo! Te avisamos cuando esté disponible.')
    document.getElementById('sub-email').value = ''
    document.querySelectorAll('.sub-toggle.active').forEach(b => b.classList.remove('active'))
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
