import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { listAggregatedProduits } from '@/services/produits.service';
import { httpError } from '@/lib/errors';

// Removed next-auth module augmentation as it's not needed with custom auth

export const GET = withAuth(async (req: NextRequest) => {
  const tenantId = req.headers.get('x-tenant-id');

  try {
    const { data } = await listAggregatedProduits(Number(tenantId));
    return NextResponse.json({ data });
  } catch (error: any) {
    const { httpStatus, message } = httpError(error.httpStatus || 500, error.message);
    return new NextResponse(JSON.stringify({ message }), { status: httpStatus });
  }
});
