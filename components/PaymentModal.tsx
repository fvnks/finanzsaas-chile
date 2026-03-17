
import React, { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, Hash, FileText } from 'lucide-react';
import { Invoice, Payment } from '../types';
import { formatCLP } from '../constants';

interface PaymentModalProps {
    invoice: Invoice;
    isOpen: boolean;
    onClose: () => void;
    onPaymentRegistered: (payment: Payment) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ invoice, isOpen, onClose, onPaymentRegistered }) => {
    const [amount, setAmount] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<string>('TRANSFER');
    const [reference, setReference] = useState<string>('');
    const [comment, setComment] = useState<string>('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const remainingDebt = invoice.total - totalPaid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/invoices/${invoice.id}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    amount: Number(amount),
                    date,
                    method,
                    reference,
                    comment,
                    companyId: invoice.companyId
                })
            });

            if (!response.ok) throw new Error('Error al registrar pago');

            const newPayment = await response.json();
            onPaymentRegistered(newPayment);
            onClose();
            // Reset form
            setAmount('');
            setReference('');
            setComment('');
        } catch (error) {
            console.error(error);
            alert('Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-black text-lg flex items-center">
                            <DollarSign className="mr-2 text-green-400" size={20} /> Registrar Pago
                        </h3>
                        <p className="text-slate-400 text-xs font-medium">Factura N° {invoice.number} - {invoice.client?.razonSocial || 'Cliente'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Monto Pendiente</p>
                            <p className="text-xl font-black text-slate-800">{formatCLP(remainingDebt)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase text-right">Total Factura</p>
                            <p className="text-sm font-bold text-slate-500 text-right">{formatCLP(invoice.total)}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                                <DollarSign size={14} className="mr-1 text-slate-400" /> Monto a Pagar
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                placeholder="0"
                                max={remainingDebt} // Optional constraint
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                                    <Calendar size={14} className="mr-1 text-slate-400" /> Fecha Pago
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                                    <CreditCard size={14} className="mr-1 text-slate-400" /> Medio Pago
                                </label>
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                >
                                    <option value="TRANSFER">Transferencia</option>
                                    <option value="CHECK">Cheque</option>
                                    <option value="CASH">Efectivo</option>
                                    <option value="WEBPAY">Webpay/Tarjeta</option>
                                    <option value="FACTORING">Factoring</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                                <Hash size={14} className="mr-1 text-slate-400" /> Referencia / N° Operación
                            </label>
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                placeholder="Ej: 12345678"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                                <FileText size={14} className="mr-1 text-slate-400" /> Comentario
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                                placeholder="Opcional..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center shadow-lg shadow-blue-200"
                        >
                            {loading ? 'Registrando...' : 'Confirmar Pago'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
