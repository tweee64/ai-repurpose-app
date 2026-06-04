import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/app/generated/prisma/client';

const SALT_ROUNDS = 12;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  const { email, password } = body as { email?: unknown; password?: unknown };

  if (typeof email !== 'string' || !isValidEmail(email.trim())) {
    return NextResponse.json(
      { error: 'A valid email address is required', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  let user: { id: string };
  try {
    user = await prisma.user.create({
      data: { email: normalizedEmail, password: hashedPassword },
      select: { id: true },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An account with this email already exists', code: 'EMAIL_TAKEN' },
        { status: 409 },
      );
    }
    console.error('[api/auth/register] DB error:', err);
    return NextResponse.json(
      { error: 'Registration failed', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json({ userId: user.id }, { status: 201 });
}
