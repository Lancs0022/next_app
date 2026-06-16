import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      service: 'pejaa-next',
      status: 'ok',
      time: new Date().toISOString(),
    },
    { status: 200 }
  )
}
