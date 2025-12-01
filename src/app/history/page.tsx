"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowUpDown,
    TrendingUp,
    TrendingDown,
    Building,
    Wallet,
    Users,
    ChevronLeft,
    ChevronRight,
    Calendar,
    ChevronDown,
    Check,
} from "lucide-react";

/* ----------------------------------------------------------------
   경량 UI 컴포넌트 (페이지 스코프 전용)
-----------------------------------------------------------------*/
type CSS = React.CSSProperties;

const Card: React.FC<React.PropsWithChildren<{ style?: CSS }>> = ({ children, style }) => (
    <div className="c-card" style={style}>
        {children}
        <style jsx>{`
            .c-card {
                width: 100%;
                border: 1px solid var(--border-color, #D4D4D4);
                border-radius: 16px;
                background: var(--background-color-primary, #fff);
            }
        `}</style>
    </div>
);

const CardHeader: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div className="c-card-hd">
        {children}
        <style jsx>{`
            .c-card-hd {
                padding: 16px 18px 8px 18px;
                border-bottom: 1px solid var(--border-color, #D4D4D4);
            }
        `}</style>
    </div>
);

const CardTitle: React.FC<React.PropsWithChildren> = ({ children }) => (
    <h2 className="c-card-ttl">
        {children}
        <style jsx>{`
            .c-card-ttl {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--color-white, #000);
                letter-spacing: -0.01em;
            }
        `}</style>
    </h2>
);

const CardContent: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div className="c-card-ct">
        {children}
        <style jsx>{`
            .c-card-ct {
                padding: 16px 18px 18px 18px;
            }
        `}</style>
    </div>
);

type ButtonProps = {
    onClick?: () => void;
    disabled?: boolean;
    variant?: "default" | "outline";
    size?: "sm" | "md";
    style?: CSS;
    type?: "button" | "submit";
    className?: string;
};
const Button: React.FC<React.PropsWithChildren<ButtonProps>> = ({
    children,
    onClick,
    disabled,
    variant = "default",
    size = "md",
    style,
    type = "button",
    className = "",
}) => {
    const cls =
        "c-btn " +
        (variant === "outline" ? "c-btn-outline " : "c-btn-default ") +
        (size === "sm" ? "c-btn-sm " : "c-btn-md ") +
        className;

    return (
        <>
            <button className={cls} onClick={onClick} disabled={disabled} style={style} type={type}>
                {children}
            </button>
            <style jsx>{`
                .c-btn {
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: transform 0.06s ease, filter 0.15s ease, box-shadow 0.2s ease;
                }
                .c-btn-md { padding: 10px 14px; font-size: 14px; }
                .c-btn-sm { padding: 8px 10px; font-size: 13px; }
                .c-btn-default {
                    border: none;
                    color: var(--color-black, #fff);
                    background: linear-gradient(180deg, #60a5fa, #3b82f6);
                    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25);
                }
                .c-btn-default:hover { filter: brightness(1.02); }
                .c-btn-outline {
                    border: 1px solid var(--border-color, #D4D4D4);
                    background: var(--background-color, #fff);
                    color: var(--color-white, #000);
                }
                .c-btn-outline:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
                .c-btn:disabled { filter: grayscale(0.2) brightness(0.9); cursor: not-allowed; }
                .c-btn:active:not(:disabled) { transform: translateY(1px); }
            `}</style>
        </>
    );
};

type InputProps = {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
    style?: CSS;
};
const Input: React.FC<InputProps> = ({ value, onChange, placeholder, className = "", style }) => (
    <>
        <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`c-input ${className}`}
            style={style}
        />
        <style jsx>{`
            .c-input {
                width: 100%;
                outline: none;
                border: 1px solid var(--border-color, #D4D4D4);
                background: var(--background-color-secondary);
                color: var(--color-white, #000);
                border-radius: 12px;
                padding: 10px 12px;
                font-size: 14px;
                transition: box-shadow .2s ease, border-color .2s ease, background .2s ease;
            }
            .c-input::placeholder { color: var(--text-secondary, #55626F); }
            .c-input:focus {
                border-color: var(--ring, #b4b4b4);
                box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18);
                background: var(--background-color-primary, #fff);
            }
        `}</style>
    </>
);

/* --------------------------- 커스텀 Select --------------------------- */

type SelectOption = { value: string; label: string };

type FancySelectProps = {
    value: string;
    onChange: (v: string) => void;
    options: SelectOption[];
    className?: string;
    style?: CSS;
    iconLeft?: React.ReactNode;
    placeholder?: string;
};

const FancySelect: React.FC<FancySelectProps> = ({ value, onChange, options, className = "", style, iconLeft, placeholder }) => {
        const [open, setOpen] = useState(false);
        const [highlight, setHighlight] = useState<string>(value);
        const rootRef = useRef<HTMLDivElement>(null);

        const selected = options.find(o => o.value === value);

        useEffect(() => {
            const onDocClick = (e: MouseEvent) => {
                if (!rootRef.current) return;
                if (!rootRef.current.contains(e.target as Node)) setOpen(false);
            };
            const onKey = (e: KeyboardEvent) => {
                if (!open) return;
                const idx = options.findIndex(o => o.value === highlight);
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (highlight) {
                        onChange(highlight);
                        setOpen(false);
                    }
                }
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const next = options[Math.min(idx + 1, options.length - 1)];
                    if (next) setHighlight(next.value);
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const prev = options[Math.max(idx - 1, 0)];
                    if (prev) setHighlight(prev.value);
                }
            };
            document.addEventListener("click", onDocClick);
            document.addEventListener("keydown", onKey);
            return () => {
                document.removeEventListener("click", onDocClick);
                document.removeEventListener("keydown", onKey);
            };
        }, [open, highlight, options, onChange]);

        useEffect(() => {
            setHighlight(value);
        }, [value]);

        return (
            <div ref={rootRef} className={`f-sel ${className}`} style={style}>
                {iconLeft && <span className="f-sel-icon">{iconLeft}</span>}
                <button
                    type="button"
                    className="f-sel-btn"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    onClick={() => setOpen(o => !o)}
                >
                    <span className={`f-sel-label ${selected ? "" : "placeholder"}`}>
                        {selected?.label ?? placeholder ?? "선택"}
                    </span>
                    <ChevronDown className={`chev ${open ? "rot" : ""}`} />
                </button>

                {open && (
                    <div className="f-sel-pop" role="listbox" aria-activedescendant={highlight}>
                        {options.map(opt => {
                            const active = opt.value === highlight;
                            const checked = opt.value === value;
                            return (
                                <div
                                    id={opt.value}
                                    key={opt.value}
                                    role="option"
                                    aria-selected={checked}
                                    className={`f-sel-opt ${active ? "active" : ""} ${checked ? "checked" : ""}`}
                                    onMouseEnter={() => setHighlight(opt.value)}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                >
                                    <span className="opt-label">{opt.label}</span>
                                    {checked && <Check className="i16" />}
                                </div>
                            );
                        })}
                    </div>
                )}

                <style jsx>{`
                    .f-sel {
                        position: relative;
                        width: 100%;
                        font-size: 14px;
                    }
                    .f-sel-icon :global(svg) {
                        position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
                        opacity: .9; pointer-events: none;
                    }

                    /* 컨트롤: 배경 고정(secondary), 세로 여백 축소, hover 제거 */
                    .f-sel-btn {
                        width: 100%;
                        text-align: left;
                        background: var(--background-color-secondary);
                        color: var(--color-white, #000);
                        border: 1px solid var(--border-color, #D4D4D4);
                        border-radius: 12px;
                        padding: 10px 36px;  /* ← 세로 여백 줄임 */
                        outline: none;
                        display: flex; align-items: center; justify-content: space-between; gap: 8px;
                        transition: box-shadow .2s ease, border-color .2s ease;
                    }
                    /* hover 비활성화: 스타일 변화 없음 */
                    .f-sel-btn:hover { background: var(--background-color-secondary); }

                    .f-sel-btn:focus-visible {
                        border-color: var(--ring, #b4b4b4);
                        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18);
                    }
                    .f-sel-label.placeholder { color: var(--text-secondary, #55626F); }

                    .chev { width: 16px; height: 16px; opacity: .9; transition: transform .18s ease; }
                    .chev.rot { transform: rotate(180deg); }

                    .f-sel-pop {
                        position: absolute; z-index: 30; inset: auto 0 0 0; transform: translateY(calc(100% + 8px));
                        background: var(--background-color-primary, #fff);
                        color: var(--color-white, #000);
                        border: 1px solid var(--border-color, #D4D4D4);
                        border-radius: 12px;
                        box-shadow: 0 10px 28px rgba(0,0,0,0.12);
                        overflow: hidden;
                        max-height: 280px;
                        display: grid;
                    }

                    /* 옵션: 세로 여백 축소, hover 제거(키보드 active만 강조) */
                    .f-sel-opt {
                        display: flex; align-items: center; justify-content: space-between;
                        padding: 8px 10px;  /* ← 세로 여백 줄임 */
                        cursor: pointer;
                        transition: background .15s ease, color .15s ease;
                        font-size: 13px;
                    }
                    .f-sel-opt .opt-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                    /* hover 제거했으므로 active만 유지 */
                    .f-sel-opt.active {
                        background: color-mix(in oklab, var(--links-color, #1565C0) 12%, transparent);
                    }
                    .f-sel-opt.checked {
                        font-weight: 700;
                    }
                    .i16 { width: 16px; height: 16px; }
                `}</style>
            </div>
        );
    };

/* --------------------------- Badge --------------------------- */
type BadgeProps = {
    children: React.ReactNode;
    variant?: "default" | "secondary" | "destructive";
};
const Badge: React.FC<BadgeProps> = ({ children, variant = "default" }) => {
    const cls = "c-badge " + variant;
    return (
        <>
            <span className={cls}>{children}</span>
            <style jsx>{`
                .c-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 2px 8px;
                    font-size: 12px;
                    border-radius: 999px;
                    border: 1px solid transparent;
                }
                .c-badge.default {
                    background: #16a34a22;
                    color: #1a7f38;
                    border-color: #22c55e55;
                }
                .c-badge.secondary {
                    background: var(--muted, #ececf0);
                    color: var(--muted-foreground, #717182);
                    border-color: var(--border-color, #D4D4D4);
                }
                .c-badge.destructive {
                    background: #d4183d22;
                    color: var(--destructive, #d4183d);
                    border-color: #d4183d55;
                }
            `}</style>
        </>
    );
};

/* ----------------------------------------------------------------
   타입 & 실제 데이터 연동
-----------------------------------------------------------------*/
export interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    category: "매수" | "매도" | "입금" | "출금";
    method: "wallet" | "exchange" | "p2p";
    status: "completed" | "pending" | "cancelled";
    quantity?: number;
    orderTime?: string;
    coin?: string;
    coinName?: string;
    price?: number;
    total?: number;
    fee?: number;
    note?: string;
}

type ApiTrade = {
    id: number;
    userId: number;
    assetId: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT";
    quantity: string;
    price: string;
    fee: string;
    feeCurrency: string;
    executedAt: string;
    priceSource: string;
    priceAsOf: string;
    orderId?: string | null;
    externalRef?: string | null;
    asset: { symbol: string; name: string };
};

const transform = (t: ApiTrade): Transaction => {
    const qty = parseFloat(t.quantity);
    const price = parseFloat(t.price);
    const krw = qty * price;
    const isBuy = t.side === "BUY";
    const category: Transaction["category"] = isBuy ? "매수" : "매도";
    const d = new Date(t.executedAt);
    const date = d.toISOString().split("T")[0];
    const orderTime = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    return {
        id: String(t.id),
        date,
        description: `${t.asset.symbol} ${category}`,
        amount: krw,
        type: isBuy ? "income" : "expense",
        category,
        method: "exchange",
        status: "completed",
        quantity: qty,
        orderTime,
        coin: t.asset.symbol,
    };
};

/* ----------------------------------------------------------------
   페이지
-----------------------------------------------------------------*/
export default function HistoryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType] = useState<"all" | "income" | "expense">("all");
    const [filterCategory, setFilterCategory] = useState("all");
    const [periodFilter, setPeriodFilter] = useState<"1month" | "3months" | "1year" | "all">("1month");
    const [sortBy] = useState<"date" | "amount">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const itemsPerPage = 10;

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                setErr(null);
                
                // 1) 로그인한 사용자 정보 가져오기
                let userId: number | null = null;
                let token: string | null = null;
                
                // localStorage에서 토큰 추출
                try {
                    const authCandidates = [
                        localStorage.getItem('AUTH'),
                        localStorage.getItem('auth'),
                        localStorage.getItem('SESSION'),
                        localStorage.getItem('session'),
                        localStorage.getItem('USER'),
                        localStorage.getItem('user'),
                    ]
                    for (const raw of authCandidates) {
                        if (!raw) continue
                        try {
                            const p = JSON.parse(raw)
                            const possible = [p?.token, p?.accessToken, p?.access_token, p?.idToken, p?.id_token]
                            const found = possible.find((t) => typeof t === 'string' && String(t).length > 0)
                            if (found) { token = String(found); break }
                        } catch {}
                    }
                } catch {}

                // 2) /api/me로 userId 가져오기
                if (token) {
                    try {
                        const meRes = await fetch('/api/me', {
                            method: 'GET',
                            headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json' 
                            },
                            credentials: 'include',
                            cache: 'no-store',
                        });
                        
                        if (meRes.ok) {
                            const meData = await meRes.json();
                            const userData = meData?.data?.user ?? meData?.user;
                            if (userData?.id) {
                                userId = Number(userData.id);
                            }
                        }
                    } catch {}
                }

                if (!userId) {
                    setErr('로그인이 필요합니다. 로그인 후 다시 시도하세요.');
                    setLoading(false);
                    return;
                }

                // 3) 거래 내역과 입출금 내역 병렬로 가져오기
                const take = 200;
                const [tradesRes, transfersRes] = await Promise.all([
                    fetch(`/api/trades/list?userId=${userId}&take=${take}`, {
                        method: "GET",
                        headers: { 
                            'Authorization': token ? `Bearer ${token}` : '',
                            'Content-Type': 'application/json' 
                        },
                        credentials: 'include',
                        cache: "no-store",
                    }),
                    fetch(`/api/transfers/list?userId=${userId}`, {
                        method: "GET",
                        headers: { 
                            'Authorization': token ? `Bearer ${token}` : '',
                            'Content-Type': 'application/json' 
                        },
                        credentials: 'include',
                        cache: "no-store",
                    })
                ]);

                if (!tradesRes.ok) throw new Error(await tradesRes.text());

                const tradesData: { data?: { items: ApiTrade[]; nextCursor: number | null }; items?: ApiTrade[] } = await tradesRes.json();
                if (!mounted) return;

                const tradeItems = tradesData?.data?.items ?? tradesData?.items ?? [];
                const tradeList = tradeItems.map(transform);

                // 입출금 내역 처리
                const transferList: Transaction[] = [];
                if (transfersRes.ok) {
                    const transfersData = await transfersRes.json();
                    const transferItems = transfersData?.data?.items ?? transfersData?.items ?? [];
                    
                    transferItems.forEach((item: {
                        id: number;
                        type: string;
                        status: string;
                        amount: number;
                        address: string | null;
                        requestedAt: string;
                        asset: { symbol: string; name: string };
                    }) => {
                        const date = new Date(item.requestedAt);
                        const isDeposit = item.type === 'DEPOSIT';
                        const counterparty = item.address ? ` (${item.address})` : '';
                        const category = isDeposit ? '입금' : '출금';
                        
                        transferList.push({
                            id: `transfer-${item.id}`,
                            date: date.toISOString(),
                            description: `${category}${counterparty}`,
                            amount: Number(item.amount),
                            type: isDeposit ? 'income' : 'expense',
                            category: category as '입금' | '출금',
                            method: 'wallet',
                            status: item.status === 'SUCCESS' ? 'completed' : item.status === 'PENDING' ? 'pending' : 'cancelled',
                            coin: item.asset.symbol.toUpperCase(),
                            coinName: item.asset.name,
                            quantity: Number(item.amount),
                            price: 0,
                            total: 0,
                            fee: 0,
                            note: counterparty
                        });
                    });
                }

                // 거래 내역과 입출금 내역 합치고 정렬
                const allTransactions = [...tradeList, ...transferList];
                allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setTransactions(allTransactions);
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : "데이터 로드 중 오류");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const getStartDate = (period: string) => {
        const now = new Date();
        const s = new Date(now);
        if (period === "1month") s.setMonth(now.getMonth() - 1);
        else if (period === "3months") s.setMonth(now.getMonth() - 3);
        else if (period === "1year") s.setFullYear(now.getFullYear() - 1);
        else return null;
        return s;
    };

    const filtered = useMemo(() => {
        const start = getStartDate(periodFilter);
        const arr = transactions.filter((t) => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === "all" || t.type === filterType;
            const matchesCat = filterCategory === "all" || t.category === filterCategory;
            const matchesPeriod = !start || new Date(t.date) >= start;
            return matchesSearch && matchesType && matchesCat && matchesPeriod;
        });
        arr.sort((a, b) => {
            const cmp = sortBy === "date"
                ? new Date(a.date).getTime() - new Date(b.date).getTime()
                : Math.abs(a.amount) - Math.abs(b.amount);
            return sortOrder === "asc" ? cmp : -cmp;
        });
        return arr;
    }, [transactions, searchTerm, filterType, filterCategory, periodFilter, sortBy, sortOrder]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, filterCategory, periodFilter]);

    const fmtAmt = (amount: number) =>
        new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(Math.abs(amount));
    const fmtDate = (d: string) =>
        new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(d));

    const methodIcon = (m: Transaction["method"]) =>
        m === "wallet" ? <Wallet className="i16" /> : m === "exchange" ? <Building className="i16" /> : <Users className="i16" />;

    const badgeVariant = (s: Transaction["status"]): "default" | "secondary" | "destructive" =>
        s === "completed" ? "default" : s === "pending" ? "secondary" : "destructive";

    const totalIncome = transactions.filter(t => t.type === "income" && t.status === "completed").reduce((a, b) => a + b.amount, 0);
    const totalExpense = transactions.filter(t => t.type === "expense" && t.status === "completed").reduce((a, b) => a + Math.abs(b.amount), 0);

    const isLoading = loading;

    return (
        <main className="history-scope">
            {/* KPI */}
            <div className="grid3">
                <Card>
                    <CardHeader>
                        <div className="row between">
                            <CardTitle>총 매수액</CardTitle>
                            <TrendingUp className="i16 link" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="kpi up">{fmtAmt(totalIncome)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="row between">
                            <CardTitle>총 매도액</CardTitle>
                            <TrendingDown className="i16 danger" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="kpi down">{fmtAmt(totalExpense)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="row between">
                            <CardTitle>순 손익</CardTitle>
                            <ArrowUpDown className="i16" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`kpi ${totalIncome - totalExpense >= 0 ? "up" : "down"}`}>
                            {fmtAmt(totalIncome - totalExpense)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 리스트 */}
            <Card>
                <CardHeader>
                    <CardTitle>거래 내역</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* 필터 */}
                    <div className="filters">
                        <div className="search">
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="거래 내역 검색..."
                                className="pl42"
                            />
                        </div>

                        <FancySelect
                            value={filterCategory}
                            onChange={setFilterCategory}
                            options={[
                                { value: "all", label: "전체 카테고리" },
                                { value: "매수", label: "매수" },
                                { value: "매도", label: "매도" },
                                { value: "입금", label: "입금" },
                                { value: "출금", label: "출금" },
                            ]}
                        />

                        <FancySelect
                            value={periodFilter}
                            onChange={(v) => setPeriodFilter(v as typeof periodFilter)}
                            options={[
                                { value: "1month", label: "1개월" },
                                { value: "3months", label: "3개월" },
                                { value: "1year", label: "1년" },
                                { value: "all", label: "전체" },
                            ]}
                            iconLeft={<Calendar className="i16" />}
                        />

                        <Button variant="outline" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                            <ArrowUpDown className="i16" />
                            {sortBy === "date" ? "날짜" : "금액"} {sortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                    </div>

                    {/* 항목 */}
                    <div className="list">
                        {pageItems.map((t) => (
                            <div key={t.id} className="item">
                                <div className="left">
                                    <div className={`bullet ${t.type === "income" ? "bg-up" : "bg-down"}`}>
                                        {t.type === "income" ? <TrendingUp className="i16 up-c" /> : <TrendingDown className="i16 dn-c" />}
                                    </div>

                                    <div className="meta">
                                        <div className="row gap8">
                                            <h3 className="ttl">{t.description}</h3>
                                            <Badge variant={badgeVariant(t.status)}>
                                                {t.status === "completed" ? "완료" : t.status === "pending" ? "대기" : "취소"}
                                            </Badge>
                                        </div>
                                        <div className="row wrap gap8 muted">
                                            <span>{fmtDate(t.date)}</span>
                                            {t.orderTime && <span>({t.orderTime})</span>}
                                            <span>•</span>
                                            <span>{t.category}</span>
                                            {typeof t.quantity === "number" && t.coin && (
                                                <>
                                                    <span>•</span>
                                                    <span>{Number(t.quantity).toFixed(4)} {t.coin}</span>
                                                </>
                                            )}
                                            <span className="row gap6">
                                                {methodIcon(t.method)}
                                                <span>{t.method === "wallet" ? "지갑" : t.method === "exchange" ? "거래소" : "P2P"}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="right">
                                    {(t.category !== "입금" && t.category !== "출금") && (
                                        <p className={`amt ${t.type === "income" ? "up-c" : "dn-c"}`}>
                                            {t.type === "income" ? "+" : "-"}{fmtAmt(Math.abs(t.amount))}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {isLoading && <div className="empty">데이터를 불러오는 중...</div>}
                    {!isLoading && err && <div className="empty">오류: {err}</div>}
                    {!isLoading && !err && pageItems.length === 0 && <div className="empty">검색 조건에 맞는 거래 내역이 없습니다.</div>}

                    {/* 페이지네이션 */}
                    {!isLoading && !err && totalPages > 1 && (
                        <div className="pager">
                            <div className="muted small">
                                총 {filtered.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)}개 표시
                            </div>
                            <div className="row gap8">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="i16" />
                                    이전
                                </Button>
                                <div className="row gap4">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let n: number;
                                        if (totalPages <= 5) n = i + 1;
                                        else if (currentPage <= 3) n = i + 1;
                                        else if (currentPage >= totalPages - 2) n = totalPages - 4 + i;
                                        else n = currentPage - 2 + i;
                                        return (
                                            <Button key={n} variant={currentPage === n ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(n)}>
                                                {n}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    다음
                                    <ChevronRight className="i16" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 페이지 스코프 스타일만 정의 (전역/레이아웃 영향 없음) */}
            <style jsx>{`
                .history-scope {
                    min-height: 90svh;
                    max-width: 1120px;
                    margin: 0 auto;
                    padding: 24px;
                    display: grid;
                    gap: 18px;
                    color: var(--color-white, #000);
                    background: var(--background-color, #fff);
                }
                .grid3 { display: grid; grid-template-columns: 1fr; gap: 12px; }
                @media (min-width: 880px) { .grid3 { grid-template-columns: repeat(3, 1fr); } }

                .row { display: inline-flex; align-items: center; }
                .row.between { width: 100%; justify-content: space-between; }
                .row.gap8 { gap: 8px; }
                .row.gap6 { gap: 6px; }
                .row.gap4 { gap: 4px; }
                .row.wrap { flex-wrap: wrap; }

                .kpi { font-size: 22px; font-weight: 800; }
                .kpi.up { color: #1a7f38; }
                .kpi.down { color: #d4183d; }

                .i16 { width: 16px; height: 16px; }
                .link { color: var(--links-color, #1565C0); }
                .danger { color: var(--destructive, #d4183d); }

                .filters {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 10px;
                    margin-bottom: 14px;
                }
                @media (min-width: 900px) {
                    .filters { grid-template-columns: 1fr 200px 200px auto; }
                }

                .search { position: relative; width: 100%; display: flex; align-items: center; }
                .pl42 { padding-left: 42px !important; }

                .list { display: grid; gap: 10px; }
                .item {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 14px;
                    align-items: center;
                    padding: 14px;
                    border: 1px solid var(--border-color, #D4D4D4);
                    border-radius: 12px;
                    background: var(--background-color-secondary, #EFF2F5);
                    transition: box-shadow 0.15s ease, background .15s ease;
                }
                .item:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
                .left { display: flex; align-items: center; gap: 12px; min-width: 0; }
                .bullet { width: 36px; height: 36px; border-radius: 999px; display: grid; place-items: center; }
                .bg-up { background: #e7f6ec; }
                .bg-down { background: #fde7ed; }
                .up-c { color: #1a7f38; }
                .dn-c { color: #d4183d; }

                .meta { display: grid; gap: 4px; min-width: 0; }
                .ttl { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: -0.01em; color: var(--color-white, #000); }
                .muted { color: var(--text-secondary, #55626F); }

                .right { text-align: right; }
                .amt { margin: 0; font-weight: 700; }

                .empty { text-align: center; padding: 36px 0 22px 0; color: var(--text-secondary, #55626F); }
                .pager { margin-top: 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
                .small { font-size: 13px; }
            `}</style>
        </main>
    );
}
