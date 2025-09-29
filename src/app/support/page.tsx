// app/support/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "../../context/ThemeContext";
import {
    MessageCircle,
    FileText,
    Bell,
    HelpCircle,
    ChevronDown,
    ChevronRight,
} from "lucide-react";

type TabKey = "faq" | "inquiry" | "history" | "notice";

interface InquiryData {
    id: string;
    title: string;
    category: string;
    status: "답변대기" | "답변완료" | "처리중";
    date: string;
}

export default function SupportPage() {
    const { theme } = useTheme();
    const [bgColor, setBgColor] = useState<string>("");
    const [activeTab, setActiveTab] = useState<TabKey>("faq");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);

    const [inquiryForm, setInquiryForm] = useState({
        category: "",
        title: "",
        content: "",
        email: "",
    });

    const [inquiries, setInquiries] = useState<InquiryData[]>([
        {
            id: "1",
            title: "출금 관련 문의",
            category: "출금/입금",
            status: "답변완료",
            date: "2024-01-15",
        },
        {
            id: "2",
            title: "거래 수수료 확인",
            category: "거래",
            status: "답변대기",
            date: "2024-01-20",
        },
        {
            id: "3",
            title: "계정 보안 설정",
            category: "보안",
            status: "처리중",
            date: "2024-01-22",
        },
    ]);

    useEffect(() => {
        const isDark = theme !== "light-theme";
        const root = getComputedStyle(document.documentElement);
        const backgroundColor = root
            .getPropertyValue(isDark ? "--chart-dark-bg" : "--chart-light-bg")
            .trim();
        setBgColor(backgroundColor);
    }, [theme]);

    const statusClass = useMemo(
        () =>
            ({
                답변완료: "badge success",
                답변대기: "badge warning",
                처리중: "badge info",
            } as const),
        []
    );

    function toggleAccordion(id: string) {
        setExpanded((prev) => (prev === id ? null : id));
    }

    async function handleInquirySubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return;

        setErr(null);
        setOk(null);
        setLoading(true);

        try {
            if (!inquiryForm.category || !inquiryForm.title || !inquiryForm.content) {
                throw new Error("모든 필드를 입력해 주세요.");
            }
            if (!inquiryForm.email.includes("@")) {
                throw new Error("유효한 이메일을 입력해 주세요.");
            }

            // 실제 API 연동 자리 (/api/support/inquiries 가정)
            // const res = await fetch("/api/support/inquiries", {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     credentials: "include",
            //     body: JSON.stringify(inquiryForm),
            // });
            // if (!res.ok) {
            //     const data = await res.json().catch(() => ({} as any));
            //     throw new Error(data?.message || "문의 접수에 실패했습니다.");
            // }

            // 데모: 로컬 목록에 즉시 반영
            const newItem: InquiryData = {
                id: String(inquiries.length + 1),
                title: inquiryForm.title,
                category: mapCategoryLabel(inquiryForm.category),
                status: "답변대기",
                date: new Date().toISOString().slice(0, 10),
            };
            setInquiries((list) => [newItem, ...list]);
            setInquiryForm({ category: "", title: "", content: "", email: "" });
            setOk("문의가 접수되었습니다. 이메일로 답변을 보내드리겠습니다.");
            setActiveTab("history");
        } catch (e: any) {
            setErr(e.message ?? "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setLoading(false);
        }
    }

    function mapCategoryLabel(value: string) {
        switch (value) {
            case "trading":
                return "거래";
            case "deposit":
                return "입출금";
            case "security":
                return "보안";
            case "account":
                return "계정";
            case "technical":
                return "기술";
            default:
                return "기타";
        }
    }

    return (
        <main className="page" style={{ backgroundColor: bgColor }}>
            <div className="container" role="region" aria-labelledby="title">
                <header className="header">
                    <h1 id="title">고객지원</h1>
                    <p className="subtitle">
                        문의사항이 있으시면 언제든지 연락해 주세요. 최대한 빠르게 도움을 드리겠습니다.
                    </p>
                </header>

                {/* 탭 네비게이션 */}
                <nav className="tabs" role="tablist" aria-label="Support Tabs">
                    <button
                        role="tab"
                        aria-selected={activeTab === "faq"}
                        className={`tab ${activeTab === "faq" ? "active" : ""}`}
                        onClick={() => setActiveTab("faq")}
                    >
                        <HelpCircle size={16} />
                        <span>자주 묻는 질문</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "inquiry"}
                        className={`tab ${activeTab === "inquiry" ? "active" : ""}`}
                        onClick={() => setActiveTab("inquiry")}
                    >
                        <MessageCircle size={16} />
                        <span>1:1 문의하기</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "history"}
                        className={`tab ${activeTab === "history" ? "active" : ""}`}
                        onClick={() => setActiveTab("history")}
                    >
                        <FileText size={16} />
                        <span>문의내역</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "notice"}
                        className={`tab ${activeTab === "notice" ? "active" : ""}`}
                        onClick={() => setActiveTab("notice")}
                    >
                        <Bell size={16} />
                        <span>공지사항</span>
                    </button>
                </nav>

                {/* 알림/에러 메시지 */}
                {err && (
                    <div className="alert error" role="alert" aria-live="polite">
                        {err}
                    </div>
                )}
                {ok && (
                    <div className="alert ok" role="status" aria-live="polite">
                        {ok}
                    </div>
                )}

                {/* FAQ */}
                {activeTab === "faq" && (
                    <section className="card" aria-labelledby="faq-title">
                        <h2 id="faq-title" className="section-title">
                            자주 묻는 질문 (FAQ)
                        </h2>
                        <p className="section-desc">
                            고객님들이 자주 문의하시는 내용들을 정리했습니다.
                        </p>

                        <div className="accordion" role="list">
                            <div className="accordion-item" role="listitem">
                                <button
                                    className="accordion-trigger"
                                    aria-expanded={expanded === "item-1"}
                                    onClick={() => toggleAccordion("item-1")}
                                >
                                    <span>거래수수료는 얼마인가요?</span>
                                    {expanded === "item-1" ? (
                                        <ChevronDown size={20} aria-hidden />
                                    ) : (
                                        <ChevronRight size={20} aria-hidden />
                                    )}
                                </button>
                                {expanded === "item-1" && (
                                    <div className="accordion-panel">
                                        <p>현재 거래수수료는 다음과 같습니다:</p>
                                        <ul>
                                            <li>일반 거래: Maker 0.1%, Taker 0.1%</li>
                                            <li>VIP 회원: 거래량에 따라 최대 50% 할인</li>
                                            <li>코인별 출금 수수료: 각 코인마다 상이</li>
                                        </ul>
                                        <p className="muted">
                                            자세한 수수료 정보는 거래소 수수료 안내 페이지에서 확인하실 수
                                            있습니다.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="accordion-item" role="listitem">
                                <button
                                    className="accordion-trigger"
                                    aria-expanded={expanded === "item-2"}
                                    onClick={() => toggleAccordion("item-2")}
                                >
                                    <span>최소 주문가능 금액은 얼마인가요?</span>
                                    {expanded === "item-2" ? (
                                        <ChevronDown size={20} aria-hidden />
                                    ) : (
                                        <ChevronRight size={20} aria-hidden />
                                    )}
                                </button>
                                {expanded === "item-2" && (
                                    <div className="accordion-panel">
                                        <p>최소 주문가능 금액은 거래쌍에 따라 다릅니다:</p>
                                        <ul>
                                            <li>BTC 거래쌍: 0.001 BTC 또는 10,000원 상당</li>
                                            <li>ETH 거래쌍: 0.01 ETH 또는 10,000원 상당</li>
                                            <li>기타 알트코인: 10,000원 상당</li>
                                        </ul>
                                        <p className="muted">
                                            정확한 최소 주문금액은 거래 화면에서 실시간으로 확인하실 수
                                            있습니다.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="accordion-item" role="listitem">
                                <button
                                    className="accordion-trigger"
                                    aria-expanded={expanded === "item-3"}
                                    onClick={() => toggleAccordion("item-3")}
                                >
                                    <span>입출금은 어떻게 하나요?</span>
                                    {expanded === "item-3" ? (
                                        <ChevronDown size={20} aria-hidden />
                                    ) : (
                                        <ChevronRight size={20} aria-hidden />
                                    )}
                                </button>
                                {expanded === "item-3" && (
                                    <div className="accordion-panel">
                                        <p>
                                            <strong>원화 입금:</strong>
                                        </p>
                                        <ul>
                                            <li>실시간 계좌이체 (24시간 가능)</li>
                                            <li>가상계좌 입금 (은행 영업시간 내)</li>
                                        </ul>
                                        <p>
                                            <strong>암호화폐 입출금:</strong>
                                        </p>
                                        <ul>
                                            <li>지갑 주소를 통한 입출금</li>
                                            <li>네트워크 수수료 별도 부과</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* 1:1 문의 */}
                {activeTab === "inquiry" && (
                    <section className="card" aria-labelledby="inq-title">
                        <h2 id="inq-title" className="section-title">
                            1:1 문의하기
                        </h2>
                        <p className="section-desc">
                            궁금한 사항이나 문제가 있으시면 언제든지 문의해 주세요.
                        </p>

                        <form className="form" onSubmit={handleInquirySubmit} noValidate>
                            <div className="grid">
                                <label className="label">
                                    문의 유형
                                    <select
                                        className="input"
                                        value={inquiryForm.category}
                                        onChange={(e) =>
                                            setInquiryForm((f) => ({ ...f, category: e.target.value }))
                                        }
                                        required
                                    >
                                        <option value="">문의 유형을 선택해주세요</option>
                                        <option value="trading">거래 관련</option>
                                        <option value="deposit">입출금 관련</option>
                                        <option value="security">보안 관련</option>
                                        <option value="account">계정 관련</option>
                                        <option value="technical">기술적 문제</option>
                                        <option value="other">기타</option>
                                    </select>
                                </label>

                                <label className="label">
                                    이메일
                                    <input
                                        type="email"
                                        className="input"
                                        placeholder="답변받을 이메일 주소"
                                        value={inquiryForm.email}
                                        onChange={(e) =>
                                            setInquiryForm((f) => ({ ...f, email: e.target.value }))
                                        }
                                        autoComplete="email"
                                        required
                                    />
                                </label>
                            </div>

                            <label className="label">
                                제목
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="문의 제목을 입력해주세요"
                                    value={inquiryForm.title}
                                    onChange={(e) =>
                                        setInquiryForm((f) => ({ ...f, title: e.target.value }))
                                    }
                                    required
                                />
                            </label>

                            <label className="label">
                                문의 내용
                                <textarea
                                    className="textarea"
                                    placeholder="문의하실 내용을 자세히 입력해주세요"
                                    rows={6}
                                    value={inquiryForm.content}
                                    onChange={(e) =>
                                        setInquiryForm((f) => ({ ...f, content: e.target.value }))
                                    }
                                    required
                                />
                            </label>

                            <button className="submit" type="submit" disabled={loading}>
                                {loading ? "제출 중..." : "문의하기"}
                            </button>
                        </form>
                    </section>
                )}

                {/* 문의 내역 */}
                {activeTab === "history" && (
                    <section className="card" aria-labelledby="hist-title">
                        <h2 id="hist-title" className="section-title">
                            문의내역
                        </h2>
                        <p className="section-desc">
                            제출하신 문의사항들의 처리 현황을 확인하실 수 있습니다.
                        </p>

                        {inquiries.length > 0 ? (
                            <div className="table-wrap" role="region" aria-label="문의 내역 표">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>문의번호</th>
                                            <th>제목</th>
                                            <th>카테고리</th>
                                            <th>상태</th>
                                            <th>문의일</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inquiries.map((q) => (
                                            <tr key={q.id}>
                                                <td>{q.id}</td>
                                                <td>{q.title}</td>
                                                <td>{q.category}</td>
                                                <td>
                                                    <span className={statusClass[q.status]}>{q.status}</span>
                                                </td>
                                                <td>{q.date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty">문의 내역이 없습니다.</div>
                        )}
                    </section>
                )}

                {/* 공지사항 */}
                {activeTab === "notice" && (
                    <section className="card center" aria-labelledby="notice-title">
                        <h2 id="notice-title" className="section-title">
                            공지사항
                        </h2>
                        <p className="section-desc">거래소의 중요한 공지사항들을 확인하실 수 있습니다.</p>

                        <div className="placeholder">
                            <Bell size={48} aria-hidden />
                            <h3>준비 중입니다</h3>
                            <p className="muted">공지사항 기능을 준비 중입니다. 곧 서비스를 제공할 예정입니다.</p>
                            <Link className="link" href="/">
                                홈으로 이동
                            </Link>
                        </div>
                    </section>
                )}
            </div>

            <style jsx>{`
                .page {
                    min-height: 90svh;
                    display: grid;
                    place-items: start center;
                    padding: 28px;
                }
                .container {
                    width: 100%;
                    max-width: 1200px;
                }
                .header {
                    margin-bottom: 20px;
                    color: var(--color-white);
                }
                .header h1 {
                    margin: 0 0 6px 0;
                    font-size: 28px;
                    line-height: 1.25;
                    letter-spacing: -0.01em;
                }
                .subtitle {
                    margin: 0;
                    font-size: 14px;
                    color: var(--color-white);
                    opacity: 0.9;
                }

                /* Tabs */
                .tabs {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    background: var(--background-color);
                    border-radius: 10px;
                    padding: 6px;
                    gap: 6px;
                    margin: 18px 0;
                }
                .tab {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 12px;
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--color-white);
                }
                .tab.active {
                    background: var(--background-color-secondary);
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
                }

                /* Alerts */
                .alert {
                    border-radius: 10px;
                    padding: 12px 14px;
                    margin: 8px 0 16px;
                    font-size: 14px;
                }
                .alert.error {
                    background: #3f1e26;
                    border: 1px solid #f87171;
                    color: #fecaca;
                }
                .alert.ok {
                    background: #1e3f26;
                    border: 1px solid #34d399;
                    color: #bbf7d0;
                }

                /* Card */
                .card {
                    width: 100%;
                    background: transparent;
                    border: 2px solid #1f2a44;
                    border-radius: 16px;
                    padding: 24px;
                    color: var(--color-white);
                    margin-bottom: 16px;
                }
                .card.center {
                    text-align: center;
                }
                .section-title {
                    margin: 0 0 6px;
                    font-size: 22px;
                    align-items: left;
                }
                .section-desc {
                    margin: 0 0 18px;
                    font-size: 14px;
                    color: var(--color-white);
                    opacity: 0.9;
                }

                /* Accordion */
                .accordion {
                    display: grid;
                    gap: 10px;
                }
                .accordion-item {
                    border: 1px solid #243044;
                    border-radius: 10px;
                    background: var(--background-color-secondary);
                }
                .accordion-trigger {
                    width: 100%;
                    padding: 14px 16px;
                    background: transparent;
                    border: none;
                    text-align: left;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    color: var(--color-white);
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .accordion-panel {
                    padding: 0 16px 14px 16px;
                }
                .accordion-panel ul {
                    list-style: disc;
                    padding-left: 20px;
                    margin: 8px 0;
                    display: grid;
                    gap: 4px;
                }
                .muted {
                    color: #9aa8b4;
                }

                /* Form */
                .form {
                    display: grid;
                    gap: 14px;
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 14px;
                }
                .label {
                    display: grid;
                    gap: 8px;
                    font-size: 14px;
                    color: var(--color-white);
                }
                .input,
                .textarea {
                    width: 100%;
                    appearance: none;
                    outline: none;
                    border: 1px solid #243044;
                    background: var(--background-color);
                    color: var(--color-white);
                    border-radius: 10px;
                    padding: 12px 12px;
                    font-size: 14px;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .input:focus,
                .textarea:focus {
                    border-color: #60a5fa;
                    box-shadow: 0 0 0 3px #2563eb33;
                }

                .submit {
                    width: 100%;
                    border: none;
                    border-radius: 10px;
                    padding: 12px 16px;
                    background: linear-gradient(180deg, #60a5fa, #3b82f6);
                    color: var(--color-white);
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

                /* Table */
                .table-wrap {
                    overflow-x: auto;
                    border-radius: 10px;
                    border: 1px solid transparent;
                    background: transparent;
                }
                .table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 680px;
                }
                .table th,
                .table td {
                    border-bottom: 1px solid var(--chart-light-border);
                    padding: 12px;
                    text-align: left;
                    color: var(--color-white);
                    font-weight: 500;
                }
                .table th {
                    color: var(--text-secondary);
                    font-weight: 600;
                }
                .empty {
                    text-align: center;
                    padding: 32px 0;
                    color: #9aa8b4;
                }

                /* Badges */
                .badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .badge.success {
                    background: #dcfce7;
                    color: #166534;
                }
                .badge.warning {
                    background: #fef3c7;
                    color: #92400e;
                }
                .badge.info {
                    background: #dbeafe;
                    color: #1e40af;
                }

                .placeholder {
                    display: grid;
                    place-items: center;
                    gap: 8px;
                    padding: 40px 0 8px;
                }
                .link {
                    color: #93c5fd;
                    text-decoration: none;
                }
                .link:hover {
                    text-decoration: underline;
                }

                @media (max-width: 480px) {
                    .card {
                        padding: 20px;
                    }
                    .tabs {
                        grid-template-columns: 1fr 1fr;
                    }
                }
            `}</style>
        </main>
    );
}
