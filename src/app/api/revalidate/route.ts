import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST() {
  try {
  // Revalidate the home, products and services pages so public views show latest data
  revalidatePath('/')
  revalidatePath('/products')
  revalidatePath('/services')
    return NextResponse.json({ revalidated: true })
  } catch (err) {
    console.error('Revalidate error', err)
    return NextResponse.json({ error: 'Revalidate failed' }, { status: 500 })
  }
}
