import { NextResponse } from 'next/server'

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}
