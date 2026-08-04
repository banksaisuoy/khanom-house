import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const categories = [
  { name: 'ขนมสด', nameEn: 'Fresh Desserts', slug: 'fresh', icon: '🍰', sortOrder: 1 },
  { name: 'ขนมแห้ง', nameEn: 'Dry Desserts', slug: 'dry', icon: '🍪', sortOrder: 2 },
  { name: 'เครื่องดื่ม', nameEn: 'Beverages', slug: 'drinks', icon: '🥤', sortOrder: 3 },
  { name: 'ชุดของขวัญ', nameEn: 'Gift Sets', slug: 'gift', icon: '🎁', sortOrder: 4 },
  { name: 'ชุดจัดเบรค', nameEn: 'Break Sets', slug: 'break', icon: '🍱', sortOrder: 5 },
  { name: 'ชุดงานมงคล', nameEn: 'Ceremony Sets', slug: 'ceremony', icon: '🎊', sortOrder: 6 },
]

const products = [
  // ขนมสด
  { name: 'ขนมถ้วยฟู', nameEn: 'Steamed Coconut Cup', slug: 'khanom-tuai-fu', sku: 'KF-001', cat: 'fresh', type: 'FRESH', price: 25, cost: 12, best: true, featured: true, shelf: 12, desc: 'ขนมถ้วยฟูสีชมพูนุ่มหนึบ กะทิหอม ขนมโบราณยอดนิยม', tags: ['ขนมไทย','สด','ยอดนิยม'], sold: 3420 },
  { name: 'ทองหยิบ', nameEn: 'Gold Egg Yolk Drops', slug: 'thong-yip', sku: 'KF-002', cat: 'fresh', type: 'FRESH', price: 30, cost: 15, best: true, featured: true, shelf: 24, desc: 'ทองหยิบทอดสีทองรูปดอก หวานมัน เสริมความเป็นมงคล', tags: ['ขนมไทย','งานมงคล'], sold: 2890 },
  { name: 'ทองหยอด', nameEn: 'Gold Egg Yolk Balls', slug: 'thong-yot', sku: 'KF-003', cat: 'fresh', type: 'FRESH', price: 30, cost: 14, best: false, featured: false, shelf: 24, desc: 'ทองหยอดกลมเล็กสีทอง นุ่มหวานมันด้วยไข่แดง', tags: ['ขนมไทย','งานมงคล'], sold: 1850 },
  { name: 'ฝอยทอง', nameEn: 'Golden Threads', slug: 'foi-thong', sku: 'KF-004', cat: 'fresh', type: 'FRESH', price: 35, cost: 17, best: false, featured: true, shelf: 24, desc: 'ฝอยทองเส้นบางเหนียวหวาน สัญลักษณ์แห่งความมั่งคั่ง', tags: ['ขนมไทย','งานมงคล'], sold: 1620 },
  { name: 'ขนมชั้น', nameEn: 'Layered Dessert', slug: 'khanom-chan', sku: 'KF-005', cat: 'fresh', type: 'FRESH', price: 30, cost: 13, best: true, featured: false, shelf: 24, desc: 'ขนมชั้น 9 ชั้นสีเขียวมรกต นุ่มหนึบ หอมกะทิ', tags: ['ขนมไทย','สด'], sold: 2540 },
  { name: 'ลูกชุบ', nameEn: 'Coconut Coated Dumplings', slug: 'look-chub', sku: 'KF-006', cat: 'fresh', type: 'FRESH', price: 35, cost: 16, best: false, featured: false, shelf: 12, desc: 'ลูกชุบรูปผลไม้สีสันสดใส มะม่วง ส้ม ฝรั่ง ชุบมะพร้าว', tags: ['ขนมไทย','สด','ประณีต'], sold: 1980 },
  { name: 'สังขยาในกะละมัง', nameEn: 'Custard in Pandan Cup', slug: 'sangkhaya', sku: 'KF-007', cat: 'fresh', type: 'FRESH', price: 40, cost: 18, best: false, featured: true, shelf: 12, desc: 'สังขยาหอมใบเตย นุ่มละมุน กลิ่นหอมเย้ายวน', tags: ['ขนมไทย','สด'], sold: 1340 },
  { name: 'ขนมเปียก', nameEn: 'Coconut Milk Soaked Dessert', slug: 'khanom-piak', sku: 'KF-008', cat: 'fresh', type: 'FRESH', price: 25, cost: 11, best: false, featured: false, shelf: 12, desc: 'ขนมเปียกกะทิรสชาติกลมกล่อม นุ่มละมุน', tags: ['ขนมไทย','สด'], sold: 980 },

  // ขนมแห้ง
  { name: 'ขนมฝักบัว', nameEn: 'Lotus Pod Crispy', slug: 'fak-bua', sku: 'KD-001', cat: 'dry', type: 'DRY', price: 20, cost: 8, best: true, featured: false, shelf: null, desc: 'ขนมฝักบัวกรอบ หวานหอม ขนมยอดนิยมตลอดกาล', tags: ['ขนมไทย','กรอบ'], sold: 3120 },
  { name: 'ขนมเครื่องแกง', nameEn: 'Spicy Crispy Snack', slug: 'khrueang-gaeng', sku: 'KD-002', cat: 'dry', type: 'DRY', price: 25, cost: 10, best: false, featured: false, shelf: null, desc: 'ขนมเครื่องแกงกรอบหอมเครื่องแกง รสเผ็ดหวาน', tags: ['ขนมไทย','กรอบ','เผ็ด'], sold: 1450 },
  { name: 'ขนมครก', nameEn: 'Mortar Crispy', slug: 'khrok', sku: 'KD-003', cat: 'dry', type: 'DRY', price: 20, cost: 7, best: false, featured: true, shelf: null, desc: 'ขนมครกกรอบๆ โรยงา หวานหอม', tags: ['ขนมไทย','กรอบ'], sold: 1180 },
  { name: 'ขนมเดือยไก่', nameEn: 'Rooster Spur Crispy', slug: 'duey-kai', sku: 'KD-004', cat: 'dry', type: 'DRY', price: 20, cost: 7, best: false, featured: false, shelf: null, desc: 'ขนมเดือยไก่ทอดกรอบ หวานมัน', tags: ['ขนมไทย','กรอบ'], sold: 990 },

  // เครื่องดื่ม
  { name: 'น้ำเต้าหู้สด', nameEn: 'Fresh Soy Milk', slug: 'tao-hu', sku: 'KB-001', cat: 'drinks', type: 'DRINK', price: 20, cost: 7, best: true, featured: false, shelf: 24, desc: 'น้ำเต้าหู้สดหอมร้อน/เย็น ทำสดทุกวัน', tags: ['เครื่องดื่ม','สด'], sold: 4210 },
  { name: 'ชาเย็นไทย', nameEn: 'Thai Iced Tea', slug: 'cha-yen', sku: 'KB-002', cat: 'drinks', type: 'DRINK', price: 30, cost: 10, best: true, featured: true, shelf: null, desc: 'ชาเย็นไทยสีส้ม หวานมัน คลายร้อน', tags: ['เครื่องดื่ม','เย็น'], sold: 3890 },
  { name: 'กาแฟโบราณ', nameEn: 'Traditional Coffee', slug: 'gafae', sku: 'KB-003', cat: 'drinks', type: 'DRINK', price: 35, cost: 12, best: false, featured: false, shelf: null, desc: 'กาแฟโบราณรสเข้มข้น หอมกระแจะ', tags: ['เครื่องดื่ม','ร้อน'], sold: 1670 },

  // ชุดของขวัญ
  { name: 'ชุดของขวัญ 4 รสมงคล', nameEn: 'Auspicious Gift Set 4', slug: 'gift-4', sku: 'KG-001', cat: 'gift', type: 'GIFT_SET', price: 350, cost: 180, best: false, featured: true, shelf: 24, desc: 'ชุดทองหยิบ ทองหยอด ฝอยทอง เม็ดขนุน เหมาะเป็นของขวัญมงคล', tags: ['ชุด','ของขวัญ','งานมงคล'], sold: 540 },
  { name: 'ชุดขนมไทย 9 อย่าง', nameEn: 'Thai Dessert Set 9', slug: 'gift-9', sku: 'KG-002', cat: 'gift', type: 'GIFT_SET', price: 650, cost: 320, best: true, featured: true, shelf: 12, desc: 'ชุดขนมไทย 9 อย่างคัดสรร กล่องสวยพร้อมมอบให้', tags: ['ชุด','ของขวัญ'], sold: 320 },

  // ชุดจัดเบรค
  { name: 'ชุดจัดเบรคประชุม 10 ท่าน', nameEn: 'Seminar Break Set 10pax', slug: 'break-10', sku: 'KC-001', cat: 'break', type: 'CATERING_SET', price: 1200, cost: 650, best: false, featured: true, shelf: 6, desc: 'ชุดจัดเบรคประชุม ขนมไทย 5 ชนิด + เครื่องดื่ม 10 ท่าน', tags: ['จัดเบรค','catering','ประชุม'], sold: 180 },
  { name: 'ชุดจัดเบรค 20 ท่าน', nameEn: 'Seminar Break Set 20pax', slug: 'break-20', sku: 'KC-002', cat: 'break', type: 'CATERING_SET', price: 2200, cost: 1180, best: false, featured: false, shelf: 6, desc: 'ชุดจัดเบรคประชุม ขนมไทย 6 ชนิด + เครื่องดื่ม 20 ท่าน', tags: ['จัดเบรค','catering'], sold: 95 },

  // ชุดงานมงคล
  { name: 'ชุดขนมหมั้น 4 สูง', nameEn: 'Engagement Dessert Set', slug: 'ceremony-4', sku: 'KM-001', cat: 'ceremony', type: 'CATERING_SET', price: 2500, cost: 1350, best: false, featured: true, shelf: 12, desc: 'ชุดขนมมงคล 4 สูง ทองหยิบ ทองหยอด ฝอยทอง เม็ดขนุน พร้อมจัดพาน', tags: ['งานมงคล','หมั้น','แต่งงาน'], sold: 72 },
]

async function main() {
  console.log('🌱 Seeding Khanom House...')

  // Branch
  const branch = await db.branch.create({
    data: { name: 'สาขาหลัก สีลม', code: 'SIL-01', address: 'ถนนสีลม กรุงเทพฯ', phone: '02-123-4567', isMain: true }
  })

  // Users
  const pwd = await bcrypt.hash(process.env.SEED_PASSWORD || 'changeme123', 10)
  const superAdmin = await db.user.create({ data: { email: 'admin@khanomhouse.th', name: 'ผู้ดูแลระบบ', passwordHash: pwd, role: 'SUPER_ADMIN', branchId: branch.id } })
  await db.user.create({ data: { email: 'manager@khanomhouse.th', name: 'ผู้จัดการสาขา', passwordHash: pwd, role: 'BRANCH_MANAGER', branchId: branch.id } })
  await db.user.create({ data: { email: 'kitchen@khanomhouse.th', name: 'หัวหน้าครัว', passwordHash: pwd, role: 'KITCHEN', branchId: branch.id } })
  await db.user.create({ data: { email: 'cashier@khanomhouse.th', name: 'พนักงานคิดเงิน', passwordHash: pwd, role: 'CASHIER', branchId: branch.id } })
  await db.user.create({ data: { email: 'rider@khanomhouse.th', name: 'พนักงานส่ง', passwordHash: pwd, role: 'RIDER', branchId: branch.id } })
  await db.user.create({ data: { email: 'account@khanomhouse.th', name: 'นักบัญชี', passwordHash: pwd, role: 'ACCOUNTANT', branchId: branch.id } })

  // Categories
  const catMap: Record<string, string> = {}
  for (const c of categories) {
    const cat = await db.category.create({ data: c })
    catMap[c.slug] = cat.id
  }

  // Products + Inventory
  for (const p of products) {
    const isFlash = p.best && Math.random() > 0.6
    const product = await db.product.create({
      data: {
        name: p.name,
        nameEn: p.nameEn,
        slug: p.slug,
        sku: p.sku,
        barcode: '885' + Math.floor(1000000000 + Math.random() * 8999999999),
        description: p.desc,
        categoryId: catMap[p.cat],
        type: p.type,
        price: p.price,
        memberPrice: Math.round(p.price * 0.9),
        wholesalePrice: Math.round(p.price * 0.8),
        costPrice: p.cost,
        unit: p.type === 'DRINK' ? 'แก้ว' : (p.type === 'CATERING_SET' ? 'ชุด' : 'ชิ้น'),
        tags: JSON.stringify(p.tags),
        isBestSeller: p.best,
        isFeatured: p.featured,
        isFlashSale: isFlash,
        flashSalePrice: isFlash ? Math.round(p.price * 0.85) : null,
        flashSaleEndAt: isFlash ? new Date(Date.now() + 1000 * 60 * 60 * 18) : null,
        flashSaleStock: isFlash ? 50 : null,
        shelfLifeHours: p.shelf,
        needsRefrigeration: p.type === 'FRESH' && Math.random() > 0.5,
        soldCount: p.sold,
        rating: 4.3 + Math.random() * 0.7,
        reviewCount: Math.floor(Math.random() * 200) + 20,
      }
    })

    const stock = Math.floor(Math.random() * 200) + (isFlash ? 50 : 30)
    await db.inventory.create({
      data: {
        productId: product.id,
        branchId: branch.id,
        type: 'FINISHED',
        quantity: stock,
        unit: product.unit,
        reorderPoint: 20,
        safetyStock: 10,
        expiryAt: p.shelf ? new Date(Date.now() + p.shelf * 3600 * 1000) : null,
      }
    })

    // Recipe for fresh products
    if (p.type === 'FRESH') {
      const recipe = await db.recipe.create({
        data: {
          productId: product.id,
          yieldQty: 10,
          yieldUnit: 'ชิ้น',
          prepTimeMin: 20,
          cookTimeMin: 45,
          instructions: 'ผสมแป้งกับน้ำ นึ่งในไฟปานกลาง 15 นาที ราดกะทิ',
        }
      })
      await db.recipeItem.createMany({
        data: [
          { recipeId: recipe.id, ingredientName: 'แป้งข้าวจ้าว', quantity: 200, unit: 'g', costPerUnit: 0.04 },
          { recipeId: recipe.id, ingredientName: 'กะทิ', quantity: 300, unit: 'ml', costPerUnit: 0.08 },
          { recipeId: recipe.id, ingredientName: 'น้ำตาลปี๊บ', quantity: 120, unit: 'g', costPerUnit: 0.05 },
          { recipeId: recipe.id, ingredientName: 'ไข่เป็ด', quantity: 5, unit: 'ฟอง', costPerUnit: 3.5 },
        ]
      })
    }
  }

  // Customers
  const customers = [
    { name: 'คุณสมหญิง', phone: '081-111-1111', tier: 'VIP', points: 1850, totalSpent: 28500, visitCount: 42 },
    { name: 'คุณวิชัย', phone: '082-222-2222', tier: 'GOLD', points: 920, totalSpent: 12400, visitCount: 28 },
    { name: 'คุณมานี', phone: '083-333-3333', tier: 'SILVER', points: 340, totalSpent: 4600, visitCount: 12 },
    { name: 'คุณปิติ', phone: '084-444-4444', tier: 'BRONZE', points: 85, totalSpent: 1200, visitCount: 4 },
    { name: 'คุณรัตนา', phone: '085-555-5555', tier: 'GOLD', points: 760, totalSpent: 9800, visitCount: 22 },
    { name: 'คุณธีรพงษ์', phone: '086-666-6666', tier: 'VIP', points: 2400, totalSpent: 35200, visitCount: 55 },
    { name: 'คุณนภา', phone: '087-777-7777', tier: 'SILVER', points: 410, totalSpent: 5400, visitCount: 15 },
  ]
  for (const c of customers) {
    await db.customer.create({ data: { ...c, birthday: new Date(Date.now() - Math.random() * 365 * 24 * 3600 * 1000 * 30) } })
  }

  // Sample orders
  const allProducts = await db.product.findMany()
  const channels = ['WEBSITE', 'POS', 'LINE', 'GRAB', 'PHONE']
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'DELIVERED', 'PAID', 'PREPARING']
  for (let i = 0; i < 40; i++) {
    const items: { productId: string; name: string; price: number; quantity: number; total: number }[] = []
    let subtotal = 0
    const itemCount = Math.floor(Math.random() * 4) + 1
    for (let j = 0; j < itemCount; j++) {
      const prod = allProducts[Math.floor(Math.random() * allProducts.length)]
      const qty = Math.floor(Math.random() * 3) + 1
      const total = prod.price * qty
      subtotal += total
      items.push({ productId: prod.id, name: prod.name, price: prod.price, quantity: qty, total })
    }
    const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1) : 0
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const channel = channels[Math.floor(Math.random() * channels.length)]
    const dayOffset = Math.floor(Math.random() * 30)
    const created = new Date(Date.now() - dayOffset * 86400000 - Math.random() * 86400000)
    const order = await db.order.create({
      data: {
        orderNo: `KH${String(20241000 + i).padStart(8, '0')}`,
        channel,
        customerName: customers[Math.floor(Math.random() * customers.length)].name,
        customerPhone: customers[Math.floor(Math.random() * customers.length)].phone,
        type: channel === 'POS' ? 'WALK_IN' : 'DELIVERY',
        status,
        paymentStatus: status === 'COMPLETED' || status === 'DELIVERED' ? 'PAID' : 'UNPAID',
        paymentMethod: ['CASH', 'PROMPTPAY', 'CARD', 'EWALLET'][Math.floor(Math.random() * 4)],
        subtotal,
        discount,
        shipping: channel === 'POS' ? 0 : 40,
        tax: Math.round((subtotal - discount) * 0.07),
        total: subtotal - discount + (channel === 'POS' ? 0 : 40),
        branchId: branch.id,
        createdAt: created,
        items: { create: items }
      }
    })
  }

  // Production batches
  const freshProducts = allProducts.filter(p => p.type === 'FRESH')
  const batchStatuses = ['COMPLETED', 'COMPLETED', 'COOKING', 'QC', 'QUEUED']
  for (let i = 0; i < 12; i++) {
    const prod = freshProducts[Math.floor(Math.random() * freshProducts.length)]
    const status = batchStatuses[Math.floor(Math.random() * batchStatuses.length)]
    const planned = (Math.floor(Math.random() * 5) + 1) * 10
    await db.productionBatch.create({
      data: {
        batchNo: `BATCH-${String(24001 + i).padStart(6, '0')}`,
        productId: prod.id,
        userId: superAdmin.id,
        plannedQty: planned,
        producedQty: status === 'COMPLETED' ? planned : status === 'COOKING' || status === 'QC' ? Math.floor(planned * 0.7) : 0,
        wastedQty: status === 'COMPLETED' ? Math.floor(planned * 0.05) : 0,
        status,
        priority: Math.floor(Math.random() * 3),
        startedAt: status !== 'QUEUED' ? new Date(Date.now() - Math.random() * 3600000 * 3) : null,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        qcStatus: status === 'QC' || status === 'COMPLETED' ? (status === 'COMPLETED' ? 'PASS' : 'PENDING') : null,
        createdAt: new Date(Date.now() - Math.random() * 86400000)
      }
    })
  }

  // Waste logs
  const wasteSources = ['PRODUCTION', 'EXPIRED', 'DAMAGED', 'RETURNED', 'TRANSPORT']
  for (let i = 0; i < 15; i++) {
    const prod = allProducts[Math.floor(Math.random() * allProducts.length)]
    const qty = Math.floor(Math.random() * 8) + 1
    await db.wasteLog.create({
      data: {
        productName: prod.name,
        userId: superAdmin.id,
        source: wasteSources[Math.floor(Math.random() * wasteSources.length)],
        quantity: qty,
        unit: prod.unit,
        value: qty * prod.costPrice,
        reason: ['นึ่งไม่สุก', 'หมดอายุ', 'หกตอนขนส่ง', 'ลูกค้าคืน', 'รูปทรงผิด'][Math.floor(Math.random() * 5)],
        createdAt: new Date(Date.now() - Math.random() * 7 * 86400000)
      }
    })
  }

  // Catering events
  const eventTypes = ['BREAK', 'SEMINAR', 'WEDDING', 'MERIT', 'CORPORATE', 'PARTY']
  const eventStatuses = ['CONFIRMED', 'PREPARING', 'QUOTED', 'COMPLETED', 'CONFIRMED']
  for (let i = 0; i < 8; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const guests = [10, 20, 30, 50, 100, 200][Math.floor(Math.random() * 6)]
    const quote = guests * (80 + Math.random() * 40)
    await db.cateringEvent.create({
      data: {
        eventNo: `EVT-${String(24001 + i).padStart(5, '0')}`,
        title: `${type === 'BREAK' ? 'จัดเบรค' : type === 'WEDDING' ? 'งานแต่ง' : type === 'MERIT' ? 'งานบุญ' : type === 'SEMINAR' ? 'งานสัมมนา' : 'งานองค์กร'} ${customers[i % customers.length].name}`,
        type,
        customerName: customers[i % customers.length].name,
        customerPhone: customers[i % customers.length].phone,
        guestCount: guests,
        eventDate: new Date(Date.now() + (Math.random() * 14 - 2) * 86400000),
        setupTime: new Date(Date.now() + (Math.random() * 14 - 2) * 86400000),
        location: ['โรงแรมแกรนด์ สีลม', 'อาคารสาทร', 'วัดราชบพิตร', 'ออฟฟิศ อโศก', 'หาดบางสระ'][Math.floor(Math.random() * 5)],
        theme: ['ไทยประยุกต์', 'มงคลคลาสสิก', 'โมเดิร์น', 'พื้นบ้าน'][Math.floor(Math.random() * 4)],
        packagingType: ['กล่องแต่ง', 'ถาดเซรามิก', 'จานใบตอง', 'กล่อง Kraft'][Math.floor(Math.random() * 4)],
        budget: quote * 0.8,
        totalQuote: quote,
        deposit: Math.random() > 0.5 ? quote * 0.5 : 0,
        status: eventStatuses[Math.floor(Math.random() * eventStatuses.length)],
        assignedUserId: superAdmin.id,
        vehicle: ['รถตู้', 'รถกระบะ', 'มอเตอร์ไซค์'][Math.floor(Math.random() * 3)],
        items: JSON.stringify(allProducts.slice(0, 5).map(p => ({ productId: p.id, name: p.name, qty: Math.floor(Math.random() * 20) + 5, price: p.price }))),
        checklist: JSON.stringify(['สั่งวัตถุดิบ', 'ทำขนม', 'แพ็คกล่อง', 'ตรวจ QC', 'จัดส่ง']),
        createdAt: new Date(Date.now() - Math.random() * 10 * 86400000)
      }
    })
  }

  // POS Shift + bills
  const cashier = await db.user.findFirst({ where: { role: 'CASHIER' } })
  const shift = await db.shift.create({
    data: {
      shiftNo: 'SH-24001',
      branchId: branch.id,
      userId: cashier!.id,
      openingCash: 2000,
      expectedCash: 2000,
      cashIn: 500,
      status: 'CLOSED',
      closedAt: new Date(Date.now() - 3600000),
      totalSales: 4850,
      cashSales: 2400,
      cardSales: 1450,
      qrSales: 1000,
      countedCash: 2880,
      difference: -20,
    }
  })
  for (let i = 0; i < 25; i++) {
    const items: { productId: string; name: string; price: number; quantity: number; total: number }[] = []
    let subtotal = 0
    for (let j = 0; j < Math.floor(Math.random() * 3) + 1; j++) {
      const prod = allProducts[Math.floor(Math.random() * allProducts.length)]
      const qty = Math.floor(Math.random() * 2) + 1
      subtotal += prod.price * qty
      items.push({ productId: prod.id, name: prod.name, price: prod.price, quantity: qty, total: prod.price * qty })
    }
    await db.posBill.create({
      data: {
        billNo: `POS${String(240001 + i).padStart(7, '0')}`,
        shiftId: shift.id,
        userId: cashier!.id,
        subtotal,
        discount: 0,
        total: subtotal,
        paymentMethod: ['CASH', 'PROMPTPAY', 'CARD'][Math.floor(Math.random() * 3)],
        receivedAmount: subtotal,
        change: 0,
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - Math.random() * 86400000),
        items: { create: items }
      }
    })
  }

  // Notifications
  const notifs = [
    { type: 'ORDER', title: 'ออเดอร์ใหม่', message: 'ออเดอร์ KH20241039 รอยืนยัน', severity: 'info' },
    { type: 'STOCK', title: 'สต็อกต่ำ', message: 'ขนมถ้วยฟู เหลือ 8 ชิ้น', severity: 'warning' },
    { type: 'EXPIRY', title: 'ขนมใกล้หมดอายุ', message: 'ลูกชุบ จะหมดอายุใน 2 ชม.', severity: 'critical' },
    { type: 'WASTE', title: 'บันทึกของเสีย', message: 'ทองหยิบเสีย 3 ชิ้น ระหว่างผลิต', severity: 'warning' },
    { type: 'DELIVERY', title: 'พนักงานส่งช้า', message: 'ออเดอร์ KH20241025 เกินเวลา 15 นาที', severity: 'warning' },
    { type: 'COMPLAINT', title: 'ลูกค้าร้องเรียน', message: 'ลูกค้ารายงาน ขนมชั้นแข็ง', severity: 'critical' },
    { type: 'PRODUCTION', title: 'การผลิตล่าช้า', message: 'Batch ขนมชั้น เกินเวลา 20 นาที', severity: 'warning' },
  ]
  for (const n of notifs) {
    await db.notification.create({ data: { ...n, isRead: Math.random() > 0.6 } })
  }

  // Audit logs
  for (let i = 0; i < 20; i++) {
    await db.auditLog.create({
      data: {
        userId: superAdmin.id,
        action: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'][Math.floor(Math.random() * 4)],
        entity: ['Product', 'Order', 'Inventory', 'User'][Math.floor(Math.random() * 4)],
        entityId: allProducts[Math.floor(Math.random() * allProducts.length)].id,
        ip: '103.58.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
        userAgent: 'Mozilla/5.0 Chrome',
        createdAt: new Date(Date.now() - Math.random() * 7 * 86400000)
      }
    })
  }

  console.log('✅ Seed complete!')
  console.log('   - 1 branch, 6 users')
  console.log('   - 6 categories, ' + products.length + ' products')
  console.log('   - 7 customers, 40 orders')
  console.log('   - 12 production batches, 15 waste logs')
  console.log('   - 8 catering events, 1 shift + 25 pos bills')
  console.log('   - Login: admin@khanomhouse.th / (set via SEED_PASSWORD env)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
