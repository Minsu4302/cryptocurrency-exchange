// app/wallet/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

type Asset = {
    symbol: string;
    name: string;
    balance: string;
    percentage: string;
    krwValue: string;
    icon: string;
};

type Transaction = {
    id: string;
    type: "deposit" | "withdraw";
    asset: string;
    amount: string;
    status: "completed" | "pending" | "failed";
    date: string;
    time: string;
};

const mockAssets: Asset[] = [
    { symbol: "KRW", name: "원화", balance: "207,002", percentage: "0.00%", krwValue: "207,002 KRW", icon: "W" },
    { symbol: "BTC", name: "비트코인", balance: "0", percentage: "0.00%", krwValue: "0 KRW", icon: "₿" },
    { symbol: "ETH", name: "이더리움", balance: "1,003.52262330", percentage: "24.58%", krwValue: "3,743,159,384 KRW", icon: "Ξ" },
    { symbol: "SOL", name: "솔라나", balance: "50,001.43141124", percentage: "75.42%", krwValue: "11,485,328,795 KRW", icon: "S" },
    { symbol: "1INCH", name: "1인치네트워크", balance: "0", percentage: "0.00%", krwValue: "0 KRW", icon: "1" },
    { symbol: "USDS", name: "USDS", balance: "0", percentage: "0.00%", krwValue: "0 KRW", icon: "U" },
    { symbol: "GAS", name: "가스", balance: "0", percentage: "0.00%", krwValue: "0 KRW", icon: "G" }
];

const mockTransactions: Transaction[] = [
    { id: "1", type: "deposit", asset: "출금 완료", amount: "5,000 KRW", status: "completed", date: "2024.10.18", time: "19:50" },
    { id: "2", type: "withdraw", asset: "입금 완료", amount: "6,000 KRW", status: "completed", date: "2024.10.18", time: "19:40" }
];

export default function DepositWithdrawPage() {
    const { theme } = useTheme();
    const [bgColor, setBgColor] = useState<string>("");

    // 검색 상태
    const [searchTerm, setSearchTerm] = useState("");
    const filteredAssets = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return mockAssets;
        return mockAssets.filter(
            (a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)
        );
    }, [searchTerm]);

    // 탭
    const [activeTab, setActiveTab] = useState<"history" | "deposit" | "withdraw">("history");

    // 입금 상태
    const [depositAsset, setDepositAsset] = useState<string>("");
    const [depositAddress, setDepositAddress] = useState<string>("");

    // 출금 상태
    const [withdrawAsset, setWithdrawAsset] = useState<string>("");
    const [withdrawAddress, setWithdrawAddress] = useState<string>("");
    const [withdrawAmount, setWithdrawAmount] = useState<string>("");

    // 총 평가
    const totalKRWValue = 15_228_675_182;
    const totalBTCValue = 162.42326904;

    useEffect(() => {
        const isDark = theme !== "light-theme";
        const root = getComputedStyle(document.documentElement);
        const backgroundColor = root
            .getPropertyValue(isDark ? "--chart-dark-bg" : "--chart-light-bg")
            .trim();
        setBgColor(backgroundColor || "var(--background-color)");
    }, [theme]);

    function generateDepositAddress() {
        const map: Record<string, string> = {
            BTC: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            ETH: "0x742d35Cc6639C0532F0a2A2e9A5b3b5c9f6E8f1A",
            KRW: "110-000-000000",
            SOL: "sol1234567890abcdef1234567890abcdef123456"
        };
        if (depositAsset && map[depositAsset]) setDepositAddress(map[depositAsset]);
    }

    function copy(text: string) {
        navigator.clipboard.writeText(text);
    }

    function getAvailableBalance(sym: string) {
        const a = mockAssets.find((x) => x.symbol === sym);
        return a ? a.balance : "0";
    }

    function setMaxWithdraw() {
        setWithdrawAmount(getAvailableBalance(withdrawAsset).replace(/,/g, ""));
    }

    const parsedAmount = Number.isFinite(parseFloat(withdrawAmount)) ? parseFloat(withdrawAmount) : 0;
    const fee = withdrawAsset ? 0.0005 : 0;
    const net = Math.max(parsedAmount - fee, 0);

    return (
        <main className="page" style={{ backgroundColor: bgColor }}>
            <div className="container">
                <section className="grid">
                    {/* 왼쪽: 총 보유자산 */}
                    <div className="col">
                        <div className="card" role="region" aria-labelledby="asset-title">
                            <header className="cardHeader">
                                <h2 id="asset-title" className="cardTitle">총 보유자산 ⊙</h2>
                                <div className="assetTotal">
                                    <div className="assetKRW">{totalKRWValue.toLocaleString()} KRW</div>
                                    <div className="assetBTC" aria-label="BTC 환산">≈ {totalBTCValue} BTC</div>
                                </div>
                            </header>

                            <div className="searchWrap">
                                <input
                                    className="input searchInput"
                                    type="text"
                                    placeholder="코인명/심볼검색"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    aria-label="자산 검색"
                                />
                            </div>

                            <div className="assetHead">
                                <div>코인명</div>
                                <div className="textRight">보유수량 %</div>
                                <div className="textRight">보유수량(평가금액)</div>
                            </div>

                            <ul className="assetList" role="list">
                                {filteredAssets.map((asset) => (
                                    <li key={asset.symbol} className="assetRow">
                                        <div className="assetName">
                                            <div className="coinIcon" aria-hidden>{asset.icon}</div>
                                            <div>
                                                <div className="coinSymbol">{asset.symbol}</div>
                                                <div className="muted">{asset.name}</div>
                                            </div>
                                        </div>
                                        <div className="textRight">{asset.percentage}</div>
                                        <div className="textRight">
                                            <div className="strong">
                                                {asset.balance} {asset.symbol}
                                            </div>
                                            <div className="muted">{asset.krwValue}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* 오른쪽: KRW + 탭 */}
                    <div className="col">
                        {/* KRW 카드 */}
                        <div className="card" role="region" aria-labelledby="krw-title">
                            <header className="cardHeader rowBetween">
                                <h3 id="krw-title" className="subTitle">KRW</h3>
                                <button className="iconBtn" type="button" aria-label="새로고침">↻</button>
                            </header>
                            <div className="cardBody">
                                <div className="stack">
                                    <div>
                                        <div className="muted small">총 보유</div>
                                        <div className="strong">207,002 KRW</div>
                                    </div>
                                    <div>
                                        <div className="muted small">거래가능 수량</div>
                                        <div>0 KRW</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 입출금 탭 */}
                        <div className="card" role="region" aria-labelledby="tab-title">
                            <header className="tabs" id="tab-title" role="tablist" aria-label="입출금">
                                <button
                                    className={`tab ${activeTab === "history" ? "active" : ""}`}
                                    role="tab"
                                    aria-selected={activeTab === "history"}
                                    onClick={() => setActiveTab("history")}
                                    type="button"
                                >
                                    내역
                                </button>
                                <button
                                    className={`tab ${activeTab === "deposit" ? "active" : ""}`}
                                    role="tab"
                                    aria-selected={activeTab === "deposit"}
                                    onClick={() => setActiveTab("deposit")}
                                    type="button"
                                >
                                    입금
                                </button>
                                <button
                                    className={`tab ${activeTab === "withdraw" ? "active" : ""}`}
                                    role="tab"
                                    aria-selected={activeTab === "withdraw"}
                                    onClick={() => setActiveTab("withdraw")}
                                    type="button"
                                >
                                    출금
                                </button>
                            </header>

                            <div className="cardBody">
                                {/* 탭: 내역 */}
                                {activeTab === "history" && (
                                    <div>
                                        <div className="rowBetween small">
                                            <select className="select" defaultValue="all" aria-label="내역 필터">
                                                <option value="all">전체</option>
                                                <option value="deposit">입금</option>
                                                <option value="withdraw">출금</option>
                                            </select>
                                        </div>

                                        <ul className="historyList" role="list">
                                            {mockTransactions.map((tx) => (
                                                <li key={tx.id} className="historyItem">
                                                    <div className="rowBetween">
                                                        <div className="muted small">{tx.date}</div>
                                                    </div>
                                                    <div className="rowBetween">
                                                        <div>
                                                            <div className="strong small">{tx.asset}</div>
                                                            <div className="muted xsmall">{tx.time}</div>
                                                        </div>
                                                        <div className="textRight strong">{tx.amount}</div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="muted center small padY">
                                            최근 입출금 내역이 거래내역에 확인하실 수 있습니다.
                                        </div>
                                    </div>
                                )}

                                {/* 탭: 입금 */}
                                {activeTab === "deposit" && (
                                    <form className="form" noValidate>
                                        <label className="label">
                                            입금할 자산 선택
                                            <select
                                                className="select"
                                                value={depositAsset}
                                                onChange={(e) => {
                                                    setDepositAsset(e.target.value);
                                                    setDepositAddress("");
                                                }}
                                                aria-label="입금 자산 선택"
                                            >
                                                <option value="" disabled>
                                                    자산을 선택하세요
                                                </option>
                                                {mockAssets.slice(0, 4).map((a) => (
                                                    <option key={a.symbol} value={a.symbol}>
                                                        {a.symbol} - {a.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        {depositAsset && (
                                            <>
                                                <button
                                                    className="btn primary"
                                                    type="button"
                                                    onClick={generateDepositAddress}
                                                >
                                                    입금 주소 생성
                                                </button>

                                                {depositAddress && (
                                                    <div className="stack">
                                                        <label className="label">
                                                            입금 주소
                                                            <div className="row gap">
                                                                <input
                                                                    className="input"
                                                                    readOnly
                                                                    value={depositAddress}
                                                                    aria-readonly
                                                                />
                                                                <button
                                                                    className="btn"
                                                                    type="button"
                                                                    onClick={() => copy(depositAddress)}
                                                                    aria-label="주소 복사"
                                                                >
                                                                    복사
                                                                </button>
                                                            </div>
                                                        </label>

                                                        <div className="note">
                                                            <div className="noteRow">
                                                                <strong className="small">주의사항</strong>
                                                            </div>
                                                            <ul className="noteList">
                                                                <li>• 오직 {depositAsset} 네트워크로만 입금하세요</li>
                                                                <li>• 최소 입금 금액을 확인하세요</li>
                                                                <li>• 잘못된 주소로 전송 시 자산을 잃을 수 있습니다</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </form>
                                )}

                                {/* 탭: 출금 */}
                                {activeTab === "withdraw" && (
                                    <form className="form" noValidate>
                                        <label className="label">
                                            출금할 자산 선택
                                            <select
                                                className="select"
                                                value={withdrawAsset}
                                                onChange={(e) => {
                                                    setWithdrawAsset(e.target.value);
                                                    setWithdrawAddress("");
                                                    setWithdrawAmount("");
                                                }}
                                                aria-label="출금 자산 선택"
                                            >
                                                <option value="" disabled>
                                                    자산을 선택하세요
                                                </option>
                                                {mockAssets.slice(0, 4).map((a) => (
                                                    <option key={a.symbol} value={a.symbol}>
                                                        {a.symbol} - {a.name}（잔고: {a.balance}）
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        {withdrawAsset && (
                                            <>
                                                <label className="label">
                                                    출금 주소
                                                    <input
                                                        className="input"
                                                        value={withdrawAddress}
                                                        onChange={(e) => setWithdrawAddress(e.target.value)}
                                                        placeholder="출금할 주소를 입력하세요"
                                                        autoComplete="off"
                                                    />
                                                </label>

                                                <label className="label">
                                                    <div className="rowBetween">
                                                        <span>출금 수량</span>
                                                        <span className="muted small">
                                                            사용 가능: {getAvailableBalance(withdrawAsset)} {withdrawAsset}
                                                        </span>
                                                    </div>
                                                    <div className="row gap">
                                                        <input
                                                            className="input"
                                                            value={withdrawAmount}
                                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                                            placeholder="0.00"
                                                            inputMode="decimal"
                                                            aria-label="출금 수량"
                                                        />
                                                        <button className="btn" type="button" onClick={setMaxWithdraw}>
                                                            최대
                                                        </button>
                                                    </div>
                                                </label>

                                                <div className="note">
                                                    <div className="rowBetween small">
                                                        <span className="muted">출금 수수료:</span>
                                                        <span>{fee.toFixed(4)} {withdrawAsset}</span>
                                                    </div>
                                                    <div className="rowBetween small">
                                                        <span className="muted">실제 출금 금액:</span>
                                                        <span>{net.toFixed(8)} {withdrawAsset}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    className="btn primary full"
                                                    type="button"
                                                    disabled={
                                                        !withdrawAsset ||
                                                        !withdrawAddress.trim() ||
                                                        !withdrawAmount ||
                                                        parsedAmount <= 0
                                                    }
                                                    aria-disabled={
                                                        !withdrawAsset ||
                                                        !withdrawAddress.trim() ||
                                                        !withdrawAmount ||
                                                        parsedAmount <= 0
                                                    }
                                                >
                                                    출금 요청
                                                </button>
                                            </>
                                        )}
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <style jsx>{`
                .page {
                    min-height: 90svh;
                    display: grid;
                    place-items: start center;
                    padding: 28px;
                    background-color: var(--background-color);
                }
                .container {
                    width: 100%;
                    max-width: 1200px;
                }
                .grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
                @media (min-width: 1024px) {
                    .grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                .col {
                    display: grid;
                    gap: 16px;
                }
                .card {
                    width: 100%;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius, 10px);
                    color: var(--color-white);
                    padding: 22px;
                    background: var(--background-color-primary);
                }
                .cardHeader {
                    margin-bottom: 16px;
                }
                .rowBetween {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .cardTitle {
                    margin: 0 0 6px 0;
                    font-size: 20px;
                    letter-spacing: -0.01em;
                    color: var(--color-foreground, inherit);
                }
                .subTitle {
                    margin: 0;
                    font-size: 18px;
                    color: var(--color-foreground, inherit);
                }
                .assetTotal {
                    display: grid;
                    gap: 2px;
                }
                .assetKRW {
                    font-size: 22px;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                    color: var(--color-foreground, inherit);
                }
                .assetBTC {
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .searchWrap {
                    position: relative;
                    margin: 12px 0 8px 0;
                }
                .searchIcon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 14px;
                    color: var(--text-secondary);
                }
                .searchInput {
                    padding-left: 36px;
                }
                .tabsText {
                    opacity: 0.9;
                }
                .check {
                    display: inline-flex;
                    gap: 8px;
                    align-items: center;
                    font-size: 13px;
                    user-select: none;
                    color: var(--color-foreground, inherit);
                }
                .check input {
                    width: 16px;
                    height: 16px;
                    accent-color: var(--color-primary, #60a5fa);
                }
                .assetHead {
                    display: grid;
                    grid-template-columns: 3fr 3fr 6fr;
                    gap: 10px;
                    font-size: 12px;
                    color: var(--text-secondary);
                    padding: 6px 0;
                    border-bottom: 1px solid var(--border-color);
                }
                .assetList {
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }
                .assetRow {
                    display: grid;
                    grid-template-columns: 3fr 3fr 6fr;
                    gap: 10px;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--border-color);
                }
                .assetName {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .coinIcon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--background-color-secondary);
                    color: var(--color-foreground, #000);
                    display: grid;
                    place-items: center;
                    font-size: 12px;
                    font-weight: 700;
                    border: 1px solid var(--border-color);
                }
                .coinSymbol {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--color-foreground, inherit);
                }
                .muted {
                    color: var(--text-secondary);
                    font-size: 12px;
                }
                .xsmall {
                    font-size: 11px;
                }
                .small {
                    font-size: 13px;
                }
                .strong {
                    font-weight: 700;
                    color: var(--color-foreground, inherit);
                }
                .textRight {
                    text-align: right;
                }
                .center {
                    text-align: center;
                }
                .padY {
                    padding: 24px 0 4px 0;
                }
                .cardBody {
                    display: grid;
                    gap: 12px;
                }
                .stack {
                    display: grid;
                    gap: 12px;
                }
                .tabs {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    border-bottom: 1px solid var(--border-color);
                }
                .tab {
                    appearance: none;
                    border: none;
                    background: transparent;
                    color: var(--color-foreground, inherit);
                    padding: 12px 10px;
                    cursor: pointer;
                    font-weight: 600;
                    border-bottom: 2px solid transparent;
                }
                .tab.active {
                    border-color: var(--color-primary, #1565C0);
                    color: var(--color-primary, #1565C0);
                }
                .iconBtn {
                    appearance: none;
                    border: 1px solid var(--border-color);
                    background: var(--background-color-secondary);
                    color: var(--color-foreground, inherit);
                    border-radius: var(--radius, 10px);
                    padding: 6px 10px;
                    cursor: pointer;
                }
                .form {
                    display: grid;
                    gap: 12px;
                }
                .label {
                    margin-top: 15px;
                    display: grid;
                    gap: 8px;
                    font-size: 15px;
                    font-weight: bold;
                    color: var(--color-foreground, inherit);
                }
                .input,
                .select,
                .btn {
                    margin-top: 10px;
                    outline: none;
                    border-radius: var(--radius, 10px);
                    font-size: 14px;
                }
                .input,
                .select {
                    width: 100%;
                    border: 1px solid var(--border-color);
                    background: var(--card, var(--background-color-primary));
                    color: var(--color-white);
                    padding: 12px;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .input::placeholder {
                    color: var(--text-secondary);
                }
                .input:focus,
                .select:focus {
                    border-color: var(--color-primary, #1565C0);
                    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary, #1565C0) 25%, transparent);
                }
                .btn {
                    border: 1px solid var(--border-color);
                    background: var(--background-color-secondary);
                    color: var(--color-foreground, inherit);
                    padding: 10px 14px;
                    cursor: pointer;
                }
                .btn.primary {
                    border: none;
                    background: linear-gradient(180deg, var(--color-primary, #1565C0), color-mix(in oklab, var(--color-primary, #1565C0) 75%, #000 0%));
                    color: var(--primary-foreground, #fff);
                    font-weight: 800;
                }
                .btn.full {
                    width: 100%;
                }
                .row {
                    display: flex;
                    align-items: center;
                }
                .gap {
                    gap: 8px;
                }
                .note {
                    border: 1px solid var(--border-color);
                    background: var(--background-color-secondary);
                    border-radius: var(--radius, 10px);
                    padding: 12px;
                }
                .noteList {
                    margin: 6px 0 0 0;
                    padding-left: 0;
                    list-style: none;
                    color: var(--text-secondary);
                    font-size: 13px;
                }
                .historyList {
                    margin: 10px 0 0 0;
                    padding: 0;
                    list-style: none;
                    display: grid;
                    gap: 8px;
                }
                .historyItem {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius, 10px);
                    padding: 12px;
                    background: var(--card, var(--background-color-primary));
                }
                /* --- Select: 기본 모양 + 커스텀 화살표 --- */
                .select {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    position: relative;
                    border-radius: 12px;
                    padding-right: 42px; /* 화살표 공간 */
                    line-height: 1.25;
                    color: var(--color-white);
                    font-weight: 600;
                }

                /* --- Option: 폰트/색/선택 상태 --- */
                /* 옵션 목록의 기본 텍스트 톤 업 */
                .select option {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--color-white);
                    background: var(--background-color-primary);
                }
                /* 일부 브라우저에서만 동작: 선택된 옵션 배경 */
                .select option:checked {
                    background: color-mix(in oklab, var(--color-primary, #1565C0) 28%, var(--background-color-primary));
                    color: var(--primary-foreground, #fff);
                }
                /* 포커스된 옵션(지원 브라우저 한정) */
                .select option:focus {
                    background: color-mix(in oklab, var(--color-primary, #1565C0) 18%, var(--background-color-primary));
                }

                /* --- 드롭다운 열렸을 때의 컨테이너 느낌 (간접 효과) --- */
                /* 셀렉트가 포커스일 때 살짝 부풀어 보이게 */
                .select:focus {
                    transform: translateY(-0.5px);
                }

                /* 라벨과 셀렉트 간 여백/정렬 미세 조정 */
                .label .select {
                    margin-top: 6px;
                }
            `}</style>
        </main>
    );
}
