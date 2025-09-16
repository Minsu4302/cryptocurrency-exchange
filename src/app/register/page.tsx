// app/register/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "../../context/ThemeContext";

export default function RegisterPage() {
    const { theme } = useTheme(); // "light-theme" | "dark-theme"
    const [bgColor, setBgColor] = useState<string>("");

    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    // 테마에 따라 페이지 배경색 적용
    useEffect(() => {
        const isDark = theme !== "light-theme";
        const root = getComputedStyle(document.documentElement);

        const backgroundColor = root
            .getPropertyValue(isDark ? "--chart-dark-bg" : "--chart-light-bg")
            .trim();

        setBgColor(backgroundColor);
    }, [theme]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return;

        setErr(null);
        setOk(null);

        // 클라이언트 측 간단 검증
        if (!email || !pw) {
            setErr("이메일과 비밀번호를 모두 입력해 주세요.");
            return;
        }
        if (pw.length < 6) {
            setErr("비밀번호는 6자 이상이어야 합니다.");
            return;
        }
        if (pw !== pw2) {
            setErr("비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: pw }),
                cache: "no-store",
            });

            // API 표준 응답 처리
            const data = await res.json().catch(() => ({}));

            if (res.status === 201) {
                setOk("회원가입 성공! 잠시 후 로그인 페이지로 이동합니다.");
                setTimeout(() => {
                    window.location.assign("/login");
                }, 700);
                return;
            }

            // 400/409/500 등
            setErr(data?.message ?? `요청 실패 (status ${res.status})`);
        } catch {
            setErr("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="page" style={{ backgroundColor: bgColor }}>
            <div className="card" role="region" aria-labelledby="title">
                <header className="header">
                    <h1 id="title">회원가입</h1>
                    <p className="subtitle">이메일과 비밀번호만으로 빠르게 시작하세요.</p>
                </header>

                {err && (
                    <div className="alert error" role="alert" aria-live="polite">
                        {err}
                    </div>
                )}
                {ok && (
                    <div className="alert success" role="status" aria-live="polite">
                        {ok}
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
                        />
                    </label>

                    <label className="label">
                        비밀번호
                        <input
                            className="input"
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            placeholder="Password"
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                            required
                            minLength={6}
                        />
                    </label>

                    <label className="label">
                        비밀번호 확인
                        <input
                            className="input"
                            type="password"
                            name="passwordConfirm"
                            autoComplete="new-password"
                            placeholder="Password"
                            value={pw2}
                            onChange={(e) => setPw2(e.target.value)}
                            required
                            minLength={6}
                        />
                    </label>

                    <button className="submit" type="submit" disabled={loading}>
                        {loading ? "가입 중..." : "가입하기"}
                    </button>
                </form>

                <footer className="footer">
                    <span>이미 계정이 있나요?</span>
                    <Link href="/login" className="link strong">
                        로그인
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
                    background: transparent;
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
                    padding: 12px 14px;
                    border-radius: 10px;
                    margin-bottom: 16px;
                    font-size: 14px;
                }
                .alert.error {
                    background: #3f1e26;
                    border: 1px solid #f87171;
                    color: #fecaca;
                }
                .alert.success {
                    background: #10351f;
                    border: 1px solid #34d399;
                    color: #bbf7d0;
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
