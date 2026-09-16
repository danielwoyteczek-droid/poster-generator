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
      formats: catalog.products[product.id] ?? {},
    }))
    return NextResponse.json({
      products,
      frameMarkup: catalog.frameMarkup,
      // PROJ-55: Preise je DTF-Bogenformat. Leer, solange die Price-IDs in
      // products.ts fehlen — der Editor blendet dann den Kaufknopf aus.
      dtfSheets: catalog.dtfSheets,
    })
  } catch (err) {
    console.error('Failed to load product catalog:', err)
    return NextResponse.json({ error: 'Catalog unavailable' }, { status: 503 })
  }
}
