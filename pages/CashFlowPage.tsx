import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    BarChart3,
    CalendarRange,
    Clock3,
    TrendingUp
} from 'lucide-react';
import { API_URL } from '../src/config';
import { useCompany } from '../components/CompanyContext';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

interface CashFlowInvoice {
    date: string | null;
    dueDate: string | null;
    totalAmount: number;
    currency: string;
    exchangeRate: number;
}

interface CashFlowData {
    currentBalanceCLP: number;
    accountsPayable: CashFlowInvoice[];
    accountsReceivable: CashFlowInvoice[];
}

interface ForecastEntry {
    amountCLP: number;
    kind: 'INGRESO' | 'EGRESO';
    referenceDate: Date;
}

interface ForecastBucket {
    label: string;
    sortKey: string;
    ingresos: number;
    egresos: number;
    neto: number;
    acumulado: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function CashFlowPage() {
    const { activeCompany } = useCompany();
    const [data, setData] = useState<CashFlowData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeCompany) {
            fetchCashFlow();
        }
    }, [activeCompany]);

    const fetchCashFlow = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/cash-flow`, {
                headers: { 'x-company-id': activeCompany?.id || '' }
            });

            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error("Error fetching cash flow", error);
        } finally {
            setLoading(false);
        }
    };

    const today = useMemo(() => {
        const base = new Date();
        return new Date(base.getFullYear(), base.getMonth(), base.getDate());
    }, []);

    const forecastEntries = useMemo<ForecastEntry[]>(() => {
        if (!data) return [];

        const normalize = (
            invoices: CashFlowInvoice[],
            kind: 'INGRESO' | 'EGRESO'
        ) => invoices
            .map((invoice) => {
                const rawDate = invoice.dueDate || invoice.date;
                if (!rawDate) return null;

                const referenceDate = new Date(rawDate);
                if (Number.isNaN(referenceDate.getTime())) return null;

                return {
                    kind,
                    referenceDate,
                    amountCLP: (invoice.totalAmount || 0) * (invoice.exchangeRate || 1)
                } satisfies ForecastEntry;
            })
            .filter((entry): entry is ForecastEntry => !!entry);

        return [
            ...normalize(data.accountsReceivable, 'INGRESO'),
            ...normalize(data.accountsPayable, 'EGRESO')
        ]
            .filter((entry) => entry.referenceDate >= today)
            .sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime());
    }, [data, today]);

    const forecastBuckets = useMemo<ForecastBucket[]>(() => {
        const monthMap: Record<string, ForecastBucket> = {};
        let accumulated = 0;

        forecastEntries.forEach((entry) => {
            const date = entry.referenceDate;
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleString('es-CL', { month: 'short', year: '2-digit' });

            if (!monthMap[sortKey]) {
                monthMap[sortKey] = {
                    label,
                    sortKey,
                    ingresos: 0,
                    egresos: 0,
                    neto: 0,
                    acumulado: 0
                };
            }

            if (entry.kind === 'INGRESO') {
                monthMap[sortKey].ingresos += entry.amountCLP;
            } else {
                monthMap[sortKey].egresos += entry.amountCLP;
            }
        });

        return Object.values(monthMap)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map((bucket) => {
                const neto = bucket.ingresos - bucket.egresos;
                accumulated += neto;

                return {
                    ...bucket,
                    neto,
                    acumulado: accumulated
                };
            });
    }, [forecastEntries]);

    const forecastSummary = useMemo(() => {
        const sumUntilDays = (days: number, kind?: 'INGRESO' | 'EGRESO') => {
            const end = today.getTime() + (days * MS_PER_DAY);

            return forecastEntries.reduce((sum, entry) => {
                if (entry.referenceDate.getTime() > end) return sum;
                if (kind && entry.kind !== kind) return sum;
                return sum + entry.amountCLP;
            }, 0);
        };

        const ingresos30 = sumUntilDays(30, 'INGRESO');
        const egresos30 = sumUntilDays(30, 'EGRESO');
        const neto30 = ingresos30 - egresos30;

        const ingresos60 = sumUntilDays(60, 'INGRESO');
        const egresos60 = sumUntilDays(60, 'EGRESO');
        const neto60 = ingresos60 - egresos60;

        const ingresos90 = sumUntilDays(90, 'INGRESO');
        const egresos90 = sumUntilDays(90, 'EGRESO');
        const neto90 = ingresos90 - egresos90;

        const totalIngresos = forecastEntries
            .filter((entry) => entry.kind === 'INGRESO')
            .reduce((sum, entry) => sum + entry.amountCLP, 0);

        const totalEgresos = forecastEntries
            .filter((entry) => entry.kind === 'EGRESO')
            .reduce((sum, entry) => sum + entry.amountCLP, 0);

        const totalNeto = totalIngresos - totalEgresos;

        const worstMonth = forecastBuckets.reduce<ForecastBucket | null>((worst, bucket) => {
            if (!worst || bucket.neto < worst.neto) return bucket;
            return worst;
        }, null);

        const bestMonth = forecastBuckets.reduce<ForecastBucket | null>((best, bucket) => {
            if (!best || bucket.neto > best.neto) return bucket;
            return best;
        }, null);

        const riskyMonths = forecastBuckets.filter((bucket) => bucket.neto < 0);
        const nearEvents = forecastEntries.slice(0, 5);

        return {
            ingresos30,
            egresos30,
            neto30,
            ingresos60,
            egresos60,
            neto60,
            ingresos90,
            egresos90,
            neto90,
            totalIngresos,
            totalEgresos,
            totalNeto,
            worstMonth,
            bestMonth,
            riskyMonths,
            nearEvents
        };
    }, [forecastBuckets, forecastEntries, today]);

    const formatCLP = (amount: number) => new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
    }).format(amount);

    const formatDate = (date: Date) => date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const summaryCards = [
        {
            title: 'Ingresos proyectados',
            value: formatCLP(forecastSummary.totalIngresos),
            icon: <ArrowUpRight size={16} className="text-emerald-500" />,
            tone: 'text-emerald-600'
        },
        {
            title: 'Egresos proyectados',
            value: formatCLP(forecastSummary.totalEgresos),
            icon: <ArrowDownLeft size={16} className="text-red-500" />,
            tone: 'text-red-600'
        },
        {
            title: 'Neto forecast',
            value: formatCLP(forecastSummary.totalNeto),
            icon: <TrendingUp size={16} className="text-blue-500" />,
            tone: forecastSummary.totalNeto >= 0 ? 'text-blue-700' : 'text-amber-700'
        },
        {
            title: 'Ventana 30 dias',
            value: formatCLP(forecastSummary.neto30),
            icon: <Clock3 size={16} className="text-slate-500" />,
            tone: forecastSummary.neto30 >= 0 ? 'text-slate-900' : 'text-red-700'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center space-x-3">
                    <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Forecast de Flujo de Caja</h1>
                        <p className="text-sm text-slate-500">
                            Proyeccion por vencimientos futuros, sin considerar saldo inicial.
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div>Cargando forecast...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {summaryCards.map((card) => (
                            <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-500">{card.title}</div>
                                    {card.icon}
                                </div>
                                <div className={`mt-3 text-2xl font-bold ${card.tone}`}>{card.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                            <h2 className="mb-4 flex items-center space-x-2 font-bold text-slate-800">
                                <BarChart3 size={18} className="text-slate-400" />
                                <span>Forecast mensual</span>
                            </h2>

                            {forecastBuckets.length === 0 ? (
                                <div className="flex h-80 items-center justify-center text-slate-500">
                                    No hay vencimientos futuros para proyectar.
                                </div>
                            ) : (
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={forecastBuckets} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="label" stroke="#64748b" />
                                            <YAxis stroke="#64748b" tickFormatter={(value) => `$${Math.round(Number(value) / 1000000)}M`} />
                                            <Tooltip formatter={(value) => formatCLP(Number(value))} />
                                            <Legend />
                                            <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                            <Line type="monotone" dataKey="neto" name="Neto" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                                            <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#2563eb" strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 flex items-center space-x-2 font-bold text-slate-800">
                                <CalendarRange size={18} className="text-slate-400" />
                                <span>Resumen ejecutivo</span>
                            </h2>

                            <div className="space-y-4 text-sm">
                                <div className="rounded-lg bg-slate-50 p-4">
                                    <div className="text-slate-500">Neto 30 dias</div>
                                    <div className={`mt-1 text-lg font-bold ${forecastSummary.neto30 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCLP(forecastSummary.neto30)}
                                    </div>
                                </div>

                                <div className="rounded-lg bg-slate-50 p-4">
                                    <div className="text-slate-500">Neto 60 dias</div>
                                    <div className={`mt-1 text-lg font-bold ${forecastSummary.neto60 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCLP(forecastSummary.neto60)}
                                    </div>
                                </div>

                                <div className="rounded-lg bg-slate-50 p-4">
                                    <div className="text-slate-500">Neto 90 dias</div>
                                    <div className={`mt-1 text-lg font-bold ${forecastSummary.neto90 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCLP(forecastSummary.neto90)}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Mes mas exigente</div>
                                    <div className="mt-1 font-bold text-slate-800">
                                        {forecastSummary.worstMonth ? forecastSummary.worstMonth.label : 'Sin datos'}
                                    </div>
                                    <div className="text-sm text-amber-800">
                                        {forecastSummary.worstMonth ? formatCLP(forecastSummary.worstMonth.neto) : 'No aplica'}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mejor mes proyectado</div>
                                    <div className="mt-1 font-bold text-slate-800">
                                        {forecastSummary.bestMonth ? forecastSummary.bestMonth.label : 'Sin datos'}
                                    </div>
                                    <div className="text-sm text-emerald-800">
                                        {forecastSummary.bestMonth ? formatCLP(forecastSummary.bestMonth.neto) : 'No aplica'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 flex items-center space-x-2 font-bold text-slate-800">
                                <AlertTriangle size={18} className="text-slate-400" />
                                <span>Alertas de tension</span>
                            </h2>

                            {forecastSummary.riskyMonths.length === 0 ? (
                                <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
                                    No se detectan meses con neto negativo en el forecast actual.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {forecastSummary.riskyMonths.map((month) => (
                                        <div key={month.sortKey} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-4">
                                            <div>
                                                <div className="font-semibold text-slate-800">{month.label}</div>
                                                <div className="text-sm text-slate-500">
                                                    Ingresos {formatCLP(month.ingresos)} | Egresos {formatCLP(month.egresos)}
                                                </div>
                                            </div>
                                            <div className="text-right font-bold text-red-600">{formatCLP(month.neto)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 flex items-center space-x-2 font-bold text-slate-800">
                                <Clock3 size={18} className="text-slate-400" />
                                <span>Proximos eventos</span>
                            </h2>

                            {forecastSummary.nearEvents.length === 0 ? (
                                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                                    No hay movimientos futuros pendientes.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {forecastSummary.nearEvents.map((entry, index) => (
                                        <div key={`${entry.kind}-${entry.referenceDate.toISOString()}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                                            <div>
                                                <div className="font-semibold text-slate-800">
                                                    {entry.kind === 'INGRESO' ? 'Cobro esperado' : 'Pago esperado'}
                                                </div>
                                                <div className="text-sm text-slate-500">{formatDate(entry.referenceDate)}</div>
                                            </div>
                                            <div className={`font-bold ${entry.kind === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {entry.kind === 'INGRESO' ? '+' : '-'}{formatCLP(entry.amountCLP)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 font-bold text-slate-800">Tabla mensual de forecast</h2>

                        {forecastBuckets.length === 0 ? (
                            <div className="text-sm text-slate-500">No hay meses futuros para mostrar.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-left text-slate-500">
                                            <th className="pb-3 pr-4 font-medium">Mes</th>
                                            <th className="pb-3 pr-4 font-medium">Ingresos</th>
                                            <th className="pb-3 pr-4 font-medium">Egresos</th>
                                            <th className="pb-3 pr-4 font-medium">Neto</th>
                                            <th className="pb-3 font-medium">Acumulado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forecastBuckets.map((bucket) => (
                                            <tr key={bucket.sortKey} className="border-b border-slate-100">
                                                <td className="py-3 pr-4 font-semibold text-slate-800">{bucket.label}</td>
                                                <td className="py-3 pr-4 text-emerald-600">{formatCLP(bucket.ingresos)}</td>
                                                <td className="py-3 pr-4 text-red-600">{formatCLP(bucket.egresos)}</td>
                                                <td className={`py-3 pr-4 font-semibold ${bucket.neto >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                                    {formatCLP(bucket.neto)}
                                                </td>
                                                <td className={`py-3 font-semibold ${bucket.acumulado >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                                                    {formatCLP(bucket.acumulado)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
