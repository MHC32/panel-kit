import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding playground database...')

  // Super admin
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where:  { email: 'admin@panel-kit.dev' },
    update: {},
    create: {
      email:        'admin@panel-kit.dev',
      passwordHash: hash,
      firstName:    'Super',
      lastName:     'Admin',
      role:         'SUPER_ADMIN',
    },
  })

  // Utilisateur normal
  const hash2 = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where:  { email: 'john@example.com' },
    update: {},
    create: {
      email:        'john@example.com',
      passwordHash: hash2,
      firstName:    'John',
      lastName:     'Doe',
      role:         'USER',
    },
  })

  // Catégories
  const electronics = await prisma.category.upsert({
    where:  { name: 'Électronique' },
    update: {},
    create: { name: 'Électronique' },
  })
  const food = await prisma.category.upsert({
    where:  { name: 'Alimentation' },
    update: {},
    create: { name: 'Alimentation' },
  })

  // Produits
  await prisma.product.createMany({
    data: [
      { name: 'iPhone 15',       price: 999.99, stock: 50,  categoryId: electronics.id },
      { name: 'MacBook Air M3',  price: 1299.0, stock: 20,  categoryId: electronics.id },
      { name: 'AirPods Pro',     price: 249.99, stock: 100, categoryId: electronics.id },
      { name: 'Café Premium 1kg',price: 24.90,  stock: 200, categoryId: food.id },
      { name: 'Chocolat noir',   price: 8.50,   stock: 500, categoryId: food.id },
    ],
  })

  console.log('✓ Seed terminé')
  console.log('  Admin : admin@panel-kit.dev / admin123')
  console.log('  User  : john@example.com / user123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
