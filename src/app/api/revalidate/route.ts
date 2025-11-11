import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST() {
  try {
    // Revalidate the home and products pages so ProductGallery shows latest data
    revalidatePath('/')
    revalidatePath('/products')
    return NextResponse.json({ revalidated: true })
  } catch (err) {
    console.error('Revalidate error', err)
    return NextResponse.json({ error: 'Revalidate failed' }, { status: 500 })
  }
}
