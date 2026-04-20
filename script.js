import { supabase } from './supabase-client.js'
import { initCart, toggleCart, initSlideButton, formatPrice } from './cart.js'

window.toggleCart = toggleCart

// ── Hero Slider ──
let currentSlide = 0
let slides = []
let dots = []
let autoSlideTimer = null

function initSlider(dbSlides) {
  const wrapper = document.querySelector('.slider-wrapper')
  const dotsContainer = document.querySelector('.slider-dots')
  if (!wrapper || !dotsContainer) return

  if (dbSlides && dbSlides.length > 0) {
    wrapper.innerHTML = dbSlides.map((s, i) =>
      `<img src="${s.image_url}" alt="${s.alt_text || 'FINA'}" class="slide${i === 0 ? ' active' : ''}">`
    ).join('')
    dotsContainer.innerHTML = dbSlides.map((_, i) =>
      `<span class="dot${i === 0 ? ' active' : ''}" onclick="window.goToSlide(${i})"></span>`
    ).join('')
  }

  slides = Array.from(document.querySelectorAll('.slide'))
  dots = Array.from(document.querySelectorAll('.dot'))
  currentSlide = 0

  if (slides.length > 1) {
    clearInterval(autoSlideTimer)
    autoSlideTimer = setInterval(() => goToSlide(currentSlide + 1), 5000)
  }
}

function goToSlide(n) {
  if (slides.length === 0) return
  slides[currentSlide]?.classList.remove('active')
  dots[currentSlide]?.classList.remove('active')
  currentSlide = ((n % slides.length) + slides.length) % slides.length
  slides[currentSlide]?.classList.add('active')
  dots[currentSlide]?.classList.add('active')
  clearInterval(autoSlideTimer)
  if (slides.length > 1) {
    autoSlideTimer = setInterval(() => goToSlide(currentSlide + 1), 5000)
  }
}

window.prevSlide = () => goToSlide(currentSlide - 1)
window.nextSlide = () => goToSlide(currentSlide + 1)
window.goToSlide = goToSlide

// ── Products ──
function getLowestPrice(p) {
  const prices = [p.price_bronce, p.price_plata].filter(Boolean)
  return prices.length ? Math.min(...prices) : null
}

function productCard(p, comingSoon = false) {
  const soldOut = p.status === 'sold_out'
  const price = getLowestPrice(p)
  const image = p.images?.[0] || ''
  const badge = comingSoon ? 'Próximamente' : (soldOut ? 'Agotado' : '')
  const clickable = !comingSoon && !soldOut
  const btnLabel = comingSoon ? 'Próximamente' : (soldOut ? 'Sin stock' : 'Ver detalles')

  return `
    <div class="product-card${comingSoon ? ' coming-soon' : ''}"
         ${clickable ? `onclick="window.location.href='producto.html?id=${p.id}'"` : ''}>
      <div class="product-card-image-wrapper">
        ${image
          ? `<img src="${image}" alt="${p.name}" loading="lazy">`
          : `<div style="width:100%;height:100%;background:#ede9e4;"></div>`}
        ${badge ? `<span class="product-card-badge">${badge}</span>` : ''}
      </div>
      <div class="product-card-info">
        ${p.code ? `<div class="product-card-code">${p.code}</div>` : ''}
        <div class="product-card-name">${p.name}</div>
        ${price ? `<div class="product-card-price">Desde ${formatPrice(price)}</div>` : ''}
        <button class="product-card-btn" ${!clickable ? 'disabled' : `onclick="event.stopPropagation();window.location.href='producto.html?id=${p.id}'"`}>
          ${btnLabel}
        </button>
      </div>
    </div>`
}

function renderProducts(products) {
  const available = products.filter(p => p.status !== 'coming_soon')
  const comingSoon = products.filter(p => p.status === 'coming_soon')

  const grid = document.getElementById('products-grid')
  grid.innerHTML = available.length
    ? available.map(p => productCard(p)).join('')
    : '<p class="loading">Próximamente...</p>'

  const csSection = document.getElementById('coming-soon-section')
  const csGrid = document.getElementById('coming-soon-grid')
  if (comingSoon.length > 0) {
    csSection.style.display = 'block'
    csGrid.innerHTML = comingSoon.map(p => productCard(p, true)).join('')
  }
}

async function loadSlides() {
  const { data } = await supabase.from('hero_slides').select('*').order('sort_order')
  return data || []
}

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order')
    .order('created_at')

  if (error) {
    console.error(error)
    document.getElementById('products-grid').innerHTML = '<p class="loading">Error al cargar productos</p>'
    return
  }
  renderProducts(data || [])
}

async function init() {
  initCart()
  initSlideButton()

  const [dbSlides] = await Promise.all([loadSlides(), loadProducts()])
  initSlider(dbSlides)
}

init()
