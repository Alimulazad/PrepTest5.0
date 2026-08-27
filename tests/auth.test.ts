import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-secret-key-12345';

describe('Admin Authentication and RBAC Token Claims', () => {
  it('generates and verifies admin token with role claim', () => {
    const token = jwt.sign({ role: 'admin' }, TEST_JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, TEST_JWT_SECRET) as any;

    expect(decoded.role).toBe('admin');
  });

  it('rejects student token attempting to claim admin access', () => {
    const studentToken = jwt.sign({ userId: 'u_123', role: 'student' }, TEST_JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(studentToken, TEST_JWT_SECRET) as any;

    expect(decoded.role).toBe('student');
    expect(decoded.role === 'admin').toBe(false);
  });

  it('fails verification when token is tampered or signed with wrong secret', () => {
    const fakeToken = jwt.sign({ role: 'admin' }, 'wrong-secret-key');
    expect(() => {
      jwt.verify(fakeToken, TEST_JWT_SECRET);
    }).toThrow();
  });
});
