import { NextResponse } from 'next/server'
import { getProductCatalog } from '@/lib/stripe-catalog'
import { PRODUCTS } from '@/lib/products'

export const revalidate = 300

export async function GET() {
  try {
    const catalog = await getProductCatalog()
    const products = PRODUCTS.map((product) => ({
      id: product.id,
      label: product.label,
      description: product.description,
      formats: catalog[product.id] ?? {},
    }))
    return NextResponse.json({ products })
  } catch (err) {
    console.error('Failed to load product catalog:', err)
    return NextResponse.json({ error: 'Catalog unavailable' }, { status: 503 })
  }
}
