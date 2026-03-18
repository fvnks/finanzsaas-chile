import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, DollarSign } from 'lucide-react';
import { BankAccount, BankTransaction } from '../types';
import { API_URL } from '../src/config';
import { useCompany } from '../components/CompanyContext';

export default function BankAccountsPage() {
    const { activeCompany } = useCompany();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showTxForm, setShowTxForm] = useState(false);
    const [selectedAccountForTx, setSelectedAccountForTx] = useState<string | null>(null);

    // Form inputs for Account
    const [accountData, setAccountData] = useState({
        name: '',
        number: '',
        currency: 'CLP',
        balance: '0'
    });

    // Form inputs for Transaction
    const [txData, setTxData] = useState({
        type: 'IN', // IN, OUT
        amount: '',
        description: '',
        reference: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (activeCompany) {
            fetchAccounts();
            fetchTransactions();
        }
    }, [activeCompany]);

    const fetchAccounts = async () => {
        try {
            const res = await fetch(`${API_URL}/bank-accounts`, {
                headers: { 'x-company-id': activeCompany?.id || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error("Error fetching accounts", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await fetch(`${API_URL}/bank-transactions`, {
                headers: { 'x-company-id': activeCompany?.id || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error("Error fetching transactions", error);
        }
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/bank-accounts`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-company-id': activeCompany?.id || ''
                },
                body: JSON.stringify(accountData)
            });

            if (res.ok) {
                fetchAccounts();
                setShowAccountForm(false);
                setAccountData({ name: '', number: '', currency: 'CLP', balance: '0' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccountForTx) return;

        try {
            const res = await fetch(`${API_URL}/bank-transactions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-company-id': activeCompany?.id || ''
                },
                body: JSON.stringify({
                    bankAccountId: selectedAccountForTx,
                    ...txData
                })
            });

            if (res.ok) {
                fetchAccounts(); // Update balance
                fetchTransactions(); // Update history
                setShowTxForm(false);
                setTxData({ type: 'IN', amount: '', description: '', reference: '', category: '', date: new Date().toISOString().split('T')[0] });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-CL', { 
            style: 'currency', 
            currency: currency === 'UF' ? 'CLP' : currency, // UF is indexed
            maximumFractionDigits: currency === 'CLP' ? 0 : 2
        }).format(amount) + (currency === 'UF' ? ' UF' : '');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <CreditCard size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Cuentas Bancarias</h1>
                </div>
                <button
                    onClick={() => setShowAccountForm(true)}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    <span>Agregar Cuenta</span>
                </button>
            </div>

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading ? (
                    <div>Cargando cuentas...</div>
                ) : accounts.length === 0 ? (
                    <div className="col-span-3 text-center text-slate-500 py-12 bg-white rounded-xl border border-slate-200">
                        No hay cuentas registradas. Agrega una para comenzar.
                    </div>
                ) : (
                    accounts.map(account => (
                        <div key={account.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex justify-between items-start">
                                    <div className="font-semibold text-lg text-slate-800">{account.name}</div>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${account.currency === 'CLP' ? 'bg-blue-100 text-blue-800' : account.currency === 'UF' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {account.currency}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 font-mono mt-1">{account.number || 'Sin número'}</div>
                            </div>
                            
                            <div className="mt-6">
                                <div className="text-xs text-slate-400">Saldo Actual</div>
                                <div className="text-2xl font-bold text-slate-900">
                                    {formatCurrency(account.balance, account.currency)}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => { setSelectedAccountForTx(account.id); setShowTxForm(true); }}
                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                                >
                                    <Plus size={14} />
                                    <span>Transacción</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center space-x-2">
                        <RefreshCw size={18} className="text-slate-400" />
                        <span>Movimientos Recientes</span>
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="p-4 font-semibold">Fecha</th>
                                <th className="p-4 font-semibold">Cuenta</th>
                                <th className="p-4 font-semibold">Descripción</th>
                                <th className="p-4 font-semibold">Categoría</th>
                                <th className="p-4 font-semibold text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-500">No hay movimientos registrados.</td>
                                </tr>
                            ) : (
                                transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-600 text-sm">{new Date(tx.date).toLocaleDateString()}</td>
                                        <td className="p-4 text-slate-700 font-medium">{tx.bankAccount?.name}</td>
                                        <td className="p-4">
                                            <div className="text-slate-800">{tx.description || '-'}</div>
                                            {tx.reference && <div className="text-xs text-slate-400">Ref: {tx.reference}</div>}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">{tx.category || '-'}</td>
                                        <td className={`p-4 text-right font-bold flex items-center justify-end space-x-1 ${tx.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {tx.type === 'IN' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} /> }
                                            <span>{formatCurrency(tx.amount, tx.bankAccount?.currency || 'CLP')}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Nueva Cuenta */}
            {showAccountForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">Nueva Cuenta Bancaria</h2>
                            <button onClick={() => setShowAccountForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Nombre de la Cuenta *</label>
                                <input required type="text" value={accountData.name} onChange={e => setAccountData({...accountData, name: e.target.value})} placeholder="Ej: Banco Chile Corriente" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Número de Cuenta</label>
                                <input type="text" value={accountData.number} onChange={e => setAccountData({...accountData, number: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Moneda</label>
                                    <select value={accountData.currency} onChange={e => setAccountData({...accountData, currency: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                        <option value="CLP">CLP</option>
                                        <option value="UF">UF</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Saldo Inicial</label>
                                    <input type="number" step="0.01" value={accountData.balance} onChange={e => setAccountData({...accountData, balance: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowAccountForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Nueva Transacción */}
            {showTxForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">Registrar Movimiento</h2>
                            <button onClick={() => setShowTxForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Tipo</label>
                                    <select value={txData.type} onChange={e => setTxData({...txData, type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                        <option value="IN">Ingreso (+)</option>
                                        <option value="OUT">Egreso (-)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Monto</label>
                                    <input required type="number" step="0.01" value={txData.amount} onChange={e => setTxData({...txData, amount: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Descripción *</label>
                                <input required type="text" value={txData.description} onChange={e => setFormData => setTxData({...txData, description: e.target.value})} placeholder="Concepto del movimiento" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Categoría</label>
                                    <input type="text" value={txData.category} onChange={e => setTxData({...txData, category: e.target.value})} placeholder="Ej: Pago Proveedor" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Referencia</label>
                                    <input type="text" value={txData.reference} onChange={e => setTxData({...txData, reference: e.target.value})} placeholder="# Transf / Cheque" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Fecha</label>
                                <input type="date" value={txData.date} onChange={e => setTxData({...txData, date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowTxForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm">Registrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
