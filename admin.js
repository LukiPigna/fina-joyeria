import { supabase } from './supabase-client.js'

const BUCKET = 'product-images'
const ALL_SIZES = ['08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30']

// ── State ──
let editingProductId = null
let currentImages = []      // URLs already saved
let pendingFiles = []        // Files to upload on save
let pendingSlideFile = null
let pendingSlidePreviewUrl = null

// ── Auth ──
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) showDashboard()
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('login-btn')
  const errEl = document.getElementById('auth-error')
  btn.disabled = true
  btn.textContent = 'Ingresando...'
  errEl.style.display = 'none'

  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('login-email').value,
    password: document.getElementById('login-password').value
  })

  if (error) {
    errEl.textContent = 'Email o contraseña incorrectos'
    errEl.style.display = 'block'
    btn.disabled = false
    btn.textContent = 'Ingresar'
  } else {
    showDashboard()
  }
})

window.logout = async () => {
  await supabase.auth.signOut()
  document.getElementById('dashboard').style.display = 'none'
  document.getElementById('auth-screen').style.display = 'flex'
}

function showDashboard() {
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('dashboard').style.display = 'block'
  initSizeToggles()
  loadProducts()
  ensureBucket()
}

async function ensureBucket() {
  await supabase.storage.createBucket(BUCKET, { public: true })
}

// ── Toast ──
function toast(msg, isError = false) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = 'toast show' + (isError ? ' error' : '')
  setTimeout(() => { el.className = 'toast' }, 3000)
}

// ── Tabs ──
window.switchTab = (tab) => {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'))
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  document.getElementById(`tab-${tab}`).classList.add('active')
  document.querySelectorAll('.tab-btn')[['products','slides','subscriptions'].indexOf(tab)].classList.add('active')

  if (tab === 'products') loadProducts()
  if (tab === 'slides') loadSlides()
  if (tab === 'subscriptions') loadSubscriptions()
}

// ── Size Toggles ──
function initSizeToggles() {
  const container = document.getElementById('size-toggles')
  container.innerHTML = ALL_SIZES.map(s =>
    `<button type="button" class="size-toggle" data-size="${s}" onclick="toggleSize('${s}')">${s}</button>`
  ).join('')
}

window.toggleSize = (size) => {
  const btn = document.querySelector(`.size-toggle[data-size="${size}"]`)
  btn?.classList.toggle('active')
}

function getSelectedSizes() {
  return Array.from(document.querySelectorAll('.size-toggle.active')).map(b => b.dataset.size)
}

function setSelectedSizes(sizes) {
  document.querySelectorAll('.size-toggle').forEach(btn => {
    btn.classList.toggle('active', sizes.includes(btn.dataset.size))
  })
}

// ── Products CRUD ──
async function loadProducts() {
  document.getElementById('products-loading').style.display = 'block'
  document.getElementById('products-table').style.display = 'none'

  const { data, error } = await supabase.from('products').select('*').order('sort_order').order('created_at')
  document.getElementById('products-loading').style.display = 'none'

  if (error) { toast('Error al cargar productos', true); return }

  const tbody = document.getElementById('products-tbody')
  const table = document.getElementById('products-table')

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:32px;">Sin productos. Agregá el primero.</td></tr>'
  } else {
    tbody.innerHTML = data.map(p => `
      <tr>
        <td>${p.images?.[0] ? `<img src="${p.images[0]}" class="product-thumb">` : '<div class="no-img">Sin foto</div>'}</td>
        <td><strong>${p.name}</strong></td>
        <td style="color:#888">${p.code || '—'}</td>
        <td>${p.price_bronce ? '$' + Number(p.price_bronce).toLocaleString('es-AR') : '—'}</td>
        <td>${p.price_plata ? '$' + Number(p.price_plata).toLocaleString('es-AR') : '—'}</td>
        <td><span class="status-badge status-${p.status}">${statusLabel(p.status)}</span></td>
        <td>${p.sort_order}</td>
        <td>
          <div class="actions">
            <button class="btn-edit" onclick="editProduct('${p.id}')">Editar</button>
            <button class="btn-danger" onclick="deleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('')
  }

  table.style.display = 'table'
}

function statusLabel(s) {
  return { available: 'Disponible', coming_soon: 'Próximamente', sold_out: 'Sin stock' }[s] || s
}

window.openProductModal = () => {
  editingProductId = null
  currentImages = []
  pendingFiles = []
  document.getElementById('modal-title').textContent = 'Agregar producto'
  document.getElementById('product-form').reset()
  document.getElementById('image-previews').innerHTML = ''
  document.getElementById('upload-progress').style.display = 'none'
  document.getElementById('m-bronce').checked = true
  document.getElementById('m-plata').checked = false
  setSelectedSizes(['08','09','10','11','12','13','14','15','16','17','18','19','20'])
  document.getElementById('product-modal').classList.add('open')
}

window.closeProductModal = () => {
  document.getElementById('product-modal').classList.remove('open')
}

window.editProduct = async (id) => {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error || !data) { toast('Error al cargar producto', true); return }

  editingProductId = id
  currentImages = data.images || []
  pendingFiles = []

  document.getElementById('modal-title').textContent = 'Editar producto'
  document.getElementById('f-name').value = data.name || ''
  document.getElementById('f-code').value = data.code || ''
  document.getElementById('f-description').value = data.description || ''
  document.getElementById('f-price-bronce').value = data.price_bronce || ''
  document.getElementById('f-price-plata').value = data.price_plata || ''
  document.getElementById('f-installments').value = data.installments || ''
  document.getElementById('f-status').value = data.status || 'available'
  document.getElementById('f-sort-order').value = data.sort_order || 0

  const mats = data.available_materials || ['bronce']
  document.getElementById('m-bronce').checked = mats.includes('bronce')
  document.getElementById('m-plata').checked = mats.includes('plata')

  setSelectedSizes(data.available_sizes || [])
  renderCurrentImages()

  document.getElementById('product-modal').classList.add('open')
}

function renderCurrentImages() {
  const container = document.getElementById('image-previews')
  container.innerHTML = currentImages.map((url, i) => `
    <div class="image-preview-item">
      <img src="${url}" alt="Foto ${i+1}">
      <button class="image-preview-remove" type="button" onclick="removeCurrentImage(${i})">×</button>
    </div>
  `).join('')
}

window.removeCurrentImage = (index) => {
  currentImages.splice(index, 1)
  renderCurrentImages()
}

window.handleImageSelect = (e) => {
  const files = Array.from(e.target.files)
  pendingFiles.push(...files)

  const container = document.getElementById('image-previews')
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const item = document.createElement('div')
      item.className = 'image-preview-item pending'
      item.innerHTML = `<img src="${ev.target.result}" alt="Preview"><span style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);color:#fff;font-size:9px;text-align:center;padding:2px;">Pendiente</span>`
      container.appendChild(item)
    }
    reader.readAsDataURL(file)
  })

  e.target.value = ''
}

async function uploadPendingFiles(productId) {
  if (!pendingFiles.length) return []
  const prog = document.getElementById('upload-progress')
  prog.style.display = 'block'
  prog.textContent = `Subiendo ${pendingFiles.length} foto(s)...`

  const urls = []
  for (const file of pendingFiles) {
    const ext = file.name.split('.').pop()
    const path = `${productId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      urls.push(data.publicUrl)
    }
  }

  prog.style.display = 'none'
  return urls
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('save-btn')
  btn.disabled = true
  btn.textContent = 'Guardando...'

  const materials = []
  if (document.getElementById('m-bronce').checked) materials.push('bronce')
  if (document.getElementById('m-plata').checked) materials.push('plata')

  const productId = editingProductId || crypto.randomUUID()
  const newUrls = await uploadPendingFiles(productId)
  const allImages = [...currentImages, ...newUrls]

  const payload = {
    name: document.getElementById('f-name').value.trim(),
    code: document.getElementById('f-code').value.trim() || null,
    description: document.getElementById('f-description').value.trim() || null,
    price_bronce: document.getElementById('f-price-bronce').value ? Number(document.getElementById('f-price-bronce').value) : null,
    price_plata: document.getElementById('f-price-plata').value ? Number(document.getElementById('f-price-plata').value) : null,
    installments: document.getElementById('f-installments').value.trim() || null,
    available_materials: materials,
    available_sizes: getSelectedSizes(),
    status: document.getElementById('f-status').value,
    sort_order: Number(document.getElementById('f-sort-order').value) || 0,
    images: allImages
  }

  let error
  if (editingProductId) {
    ;({ error } = await supabase.from('products').update(payload).eq('id', editingProductId))
  } else {
    ;({ error } = await supabase.from('products').insert({ id: productId, ...payload }))
  }

  btn.disabled = false
  btn.textContent = 'Guardar'

  if (error) { toast('Error al guardar: ' + error.message, true); return }

  toast(editingProductId ? 'Producto actualizado' : 'Producto creado')
  closeProductModal()
  loadProducts()
})

window.deleteProduct = async (id, name) => {
  if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) { toast('Error al eliminar', true); return }
  toast('Producto eliminado')
  loadProducts()
}

// ── Slides ──
async function loadSlides() {
  document.getElementById('slides-loading').style.display = 'block'
  const { data } = await supabase.from('hero_slides').select('*').order('sort_order')
  document.getElementById('slides-loading').style.display = 'none'

  const grid = document.getElementById('slides-grid')
  if (!data?.length) {
    grid.innerHTML = '<p class="empty-state">Sin slides. Agregá imágenes para el inicio.</p>'
    return
  }

  grid.innerHTML = data.map(s => `
    <div class="slide-card">
      <img src="${s.image_url}" alt="${s.alt_text || ''}">
      <div class="slide-card-footer">
        <span class="slide-alt">${s.alt_text || 'Sin texto'} · #${s.sort_order}</span>
        <button class="btn-danger" onclick="deleteSlide('${s.id}')">×</button>
      </div>
    </div>
  `).join('')
}

window.openSlideModal = () => {
  pendingSlideFile = null
  pendingSlidePreviewUrl = null
  document.getElementById('slide-alt').value = ''
  document.getElementById('slide-order').value = '0'
  document.getElementById('slide-preview').innerHTML = ''
  document.getElementById('slide-modal').classList.add('open')
}

window.closeSlideModal = () => {
  document.getElementById('slide-modal').classList.remove('open')
}

window.handleSlideImageSelect = (e) => {
  pendingSlideFile = e.target.files[0]
  if (!pendingSlideFile) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    document.getElementById('slide-preview').innerHTML =
      `<img src="${ev.target.result}" style="width:100%;max-height:200px;object-fit:cover;">`
  }
  reader.readAsDataURL(pendingSlideFile)
  e.target.value = ''
}

window.saveSlide = async () => {
  if (!pendingSlideFile) { toast('Seleccioná una imagen', true); return }
  const btn = document.getElementById('save-slide-btn')
  btn.disabled = true
  btn.textContent = 'Guardando...'

  const ext = pendingSlideFile.name.split('.').pop()
  const path = `slides/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, pendingSlideFile, { upsert: true })

  if (upErr) { toast('Error al subir imagen', true); btn.disabled = false; btn.textContent = 'Guardar'; return }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { error } = await supabase.from('hero_slides').insert({
    image_url: urlData.publicUrl,
    alt_text: document.getElementById('slide-alt').value.trim() || null,
    sort_order: Number(document.getElementById('slide-order').value) || 0
  })

  btn.disabled = false
  btn.textContent = 'Guardar'

  if (error) { toast('Error al guardar slide', true); return }
  toast('Slide agregado')
  closeSlideModal()
  loadSlides()
}

window.deleteSlide = async (id) => {
  if (!confirm('¿Eliminar este slide?')) return
  const { error } = await supabase.from('hero_slides').delete().eq('id', id)
  if (error) { toast('Error al eliminar', true); return }
  toast('Slide eliminado')
  loadSlides()
}

// ── Subscriptions ──
async function loadSubscriptions() {
  document.getElementById('subs-loading').style.display = 'block'
  document.getElementById('subs-table').style.display = 'none'

  const { data } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
  document.getElementById('subs-loading').style.display = 'none'

  if (!data?.length) {
    document.getElementById('subs-tbody').innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;padding:32px;">Sin suscripciones todavía.</td></tr>'
    document.getElementById('subs-count').textContent = ''
  } else {
    document.getElementById('subs-count').textContent = `${data.length} suscripto${data.length !== 1 ? 's' : ''}`
    document.getElementById('subs-tbody').innerHTML = data.map(s => `
      <tr>
        <td>${s.email}</td>
        <td style="color:#888;font-size:12px;">${(s.notification_types || []).join(', ')}</td>
        <td style="color:#888;font-size:12px;">${new Date(s.created_at).toLocaleDateString('es-AR')}</td>
      </tr>
    `).join('')
  }

  document.getElementById('subs-table').style.display = 'table'
}

// ── Init ──
checkAuth()
