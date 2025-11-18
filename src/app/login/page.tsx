// app/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '../../context/ThemeContext'

export default function LoginPage() {
    const { theme } = useTheme()
    const [bgColor, setBgColor] = useState<string>('')
    const [email, setEmail] = useState('')
    const [pw, setPw] = useState('')
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        const isDark = theme !== 'light-theme'
        const root = getComputedStyle(document.documentElement)
        const backgroundColor = root
            .getPropertyValue(isDark ? '--chart-dark-bg' : '--chart-light-bg')
            .trim()
        setBgColor(backgroundColor)
    }, [theme])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (loading) return

        setErr(null)
        setLoading(true)

        try {
            if (!email.includes('@') || pw.length < 6) {
                throw new Error('입력 정보를 다시 확인해 주세요.')
            }

            // 1) 실제 로그인 요청
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password: pw }),
            })

            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data?.message || data?.error || '로그인 실패')
            }

            // 2) 헤더 즉시 반영을 위해 로컬 저장
            const balanceFromLogin = typeof data?.data?.balance === 'number' ? data.data.balance : 0
            localStorage.setItem('AUTH', JSON.stringify({ email, balance: balanceFromLogin }))

            // 3) 세션 쿠키 확인용 /api/me 호출(선택)
            try {
                const meHeaders: Record<string, string> = {}
                if (data?.data?.token) {
                    meHeaders['Authorization'] = `Bearer ${data.data.token}`
                }
                const me = await fetch('/api/me', {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: meHeaders,
                })
                if (me.ok) {
                    const meData = await me.json()
                    const u = meData?.data?.user ?? meData?.user ?? meData
                    if (u?.email) {
                        localStorage.setItem(
                            'AUTH',
                            JSON.stringify({
                                email: u.email,
                                balance: typeof u.balance === 'number' ? u.balance : balanceFromLogin,
                            })
                        )
                    }
                }
            } catch {
                // /api/me 실패는 무시 (로그인 자체는 성공)
            }

            // 4) 이동
            window.location.assign('/')
        } catch (e) {
            const message = e instanceof Error ? e.message : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
            setErr(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="page" style={{ backgroundColor: bgColor }}>
            <div className="card" role="region" aria-labelledby="title">
                <header className="header">
                    <h1 id="title">로그인</h1>
                    <p className="subtitle">계정에 접속해 서비스를 이용하세요.</p>
                </header>

                {err && (
                    <div className="alert" role="alert" aria-live="polite">
                        {err}
                    </div>
                )}

                <form className="form" onSubmit={onSubmit} noValidate>
                    <label className="label">
                        이메일
                        <input
                            className="input"
                            type="email"
                            name="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            aria-invalid={!!err && !email}
                        />
                    </label>

                    <label className="label">
                        비밀번호
                        <div className="pwWrap">
                            <input
                                className="input pwInput"
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                placeholder="Password"
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </label>

                    <div className="row">
                        <label className="check">
                            <input type="checkbox" name="remember" />
                            <span>로그인 상태 유지</span>
                        </label>

                        <Link href="#" className="link">
                            비밀번호 찾기
                        </Link>
                    </div>

                    <button className="submit" type="submit" disabled={loading}>
                        {loading ? "로그인 중..." : "로그인"}
                    </button>
                </form>

                <footer className="footer">
                    <span>아직 계정이 없나요?</span>
                    <Link href="/register" className="link strong">
                        회원가입
                    </Link>
                </footer>
            </div>

            <style jsx>{`
                .page {
                    min-height: 90svh;
                    display: grid;
                    place-items: center;
                    padding: 28px;
                }
                .card {
                    width: 100%;
                    max-width: 600px;
                    border: 2px solid #1f2a44;
                    border-radius: 16px;
                    color: var(--color-white);
                    padding: 28px;
                }
                .header {
                    margin-bottom: 18px;
                }
                .header h1 {
                    margin: 0 0 6px 0;
                    font-size: 24px;
                    line-height: 1.25;
                    letter-spacing: -0.01em;
                }
                .subtitle {
                    margin: 0;
                    font-size: 14px;
                }
                .alert {
                    background: #3f1e26;
                    border: 1px solid #f87171;
                    color: #fecaca;
                    padding: 12px 14px;
                    border-radius: 10px;
                    margin-bottom: 16px;
                    font-size: 14px;
                }
                .form {
                    display: grid;
                    gap: 14px;
                }
                .label {
                    display: grid;
                    gap: 8px;
                    font-size: 14px;
                    color: var(--color-white);
                }
                .input {
                    width: 100%;
                    appearance: none;
                    outline: none;
                    border: 1px solid #243044;
                    background: #fff;
                    color: #000;
                    border-radius: 10px;
                    padding: 12px 12px;
                    font-size: 14px;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .input::placeholder {
                    color: var(--text-secondary);
                }
                .input:focus {
                    border-color: #60a5fa;
                    box-shadow: 0 0 0 3px #2563eb33;
                }
                .pwWrap {
                    position: relative;
                }
                .pwInput {
                    padding-right: 72px;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 2px;
                    margin-bottom: 6px;
                }
                .check {
                    display: inline-flex;
                    gap: 8px;
                    align-items: center;
                    font-size: 13px;
                    color: var(--color-white);
                    user-select: none;
                }
                .check input {
                    width: 16px;
                    height: 16px;
                    accent-color: #60a5fa;
                }
                .link {
                    text-decoration: none;
                    font-size: 13px;
                }
                .link:hover {
                    text-decoration: underline;
                }
                .link.strong {
                    font-weight: 600;
                }
                .submit {
                    width: 100%;
                    border: none;
                    border-radius: 10px;
                    padding: 12px 16px;
                    background: linear-gradient(180deg, #60a5fa, #3b82f6);
                    color: #081225;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    cursor: pointer;
                    transition: transform 0.06s ease, filter 0.15s ease;
                }
                .submit:disabled {
                    filter: grayscale(0.2) brightness(0.8);
                    cursor: not-allowed;
                }
                .submit:active:not(:disabled) {
                    transform: translateY(1px);
                }
                .footer {
                    border-radius: 10px;
                    margin-top: 14px;
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    color: var(--color-white);
                    font-size: 14px;
                }
                @media (max-width: 420px) {
                    .card {
                        padding: 22px;
                    }
                }
            `}</style>
        </main>
    );
}
