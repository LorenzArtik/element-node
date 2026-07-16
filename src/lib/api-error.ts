import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Error response standardizzato.
 * Struttura: { error: { code, message, details? } }
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toResponse() {
    return NextResponse.json(
      { error: { code: this.code, message: this.message, details: this.details } },
      { status: this.status },
    );
  }
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) return err.toResponse();
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'Validazione fallita', details: err.flatten() } },
      { status: 400 },
    );
  }
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: { code: 'server_error', message: err.message } },
      { status },
    );
  }
  return NextResponse.json(
    { error: { code: 'unknown_error', message: 'Errore sconosciuto' } },
    { status: 500 },
  );
}
